import { query } from '@/lib/db';
import { getAdminApp } from '@/lib/notifications/shopPush';
import { getMessaging, MulticastMessage, SendResponse } from 'firebase-admin/messaging';

export interface UserPushNotificationPayload {
  userId: number | string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, string>;
}

export interface UserPushNotificationResult {
  success: boolean;
  totalTokens: number;
  successCount: number;
  failureCount: number;
  error?: string;
  cleanedTokensCount?: number;
}

/**
 * Helper function to retrieve the last/most recent active FCM token for a user from userLogin table.
 */
export async function getLastUserFcmToken(userId: number | string): Promise<string | null> {
  const parsedUserId = Number(userId);
  if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) return null;

  try {
    const rows = await query<any[]>(
      'SELECT fcmToken FROM userLogin WHERE user_id = ? AND fcmToken IS NOT NULL AND TRIM(fcmToken) != "" ORDER BY id DESC LIMIT 1',
      [parsedUserId]
    );
    if (!rows || rows.length === 0 || !rows[0].fcmToken) return null;
    return String(rows[0].fcmToken).trim() || null;
  } catch (err) {
    console.error(`Error fetching last FCM token for user ${parsedUserId}:`, err);
    return null;
  }
}

/**
 * Backend Helper Function: Sends push notifications to a user via Firebase Cloud Messaging (FCM).
 * Retrieves the last/most recent active FCM token for the given userId from the `userLogin` table.
 *
 * @param userId - ID of the target customer/user (or a UserPushNotificationPayload object)
 * @param title - Notification title string
 * @param body - Notification body string
 * @param options - Optional icon, url, and data payload
 *
 * @example
 * await userPushNotification({
 *   userId: 42,
 *   title: 'Order Delivered! 🎉',
 *   body: 'Your fresh produce order #GFM-102 has been delivered.',
 *   url: '/orders',
 * });
 *
 * // Or with positional arguments:
 * await userPushNotification(42, 'Order Delivered! 🎉', 'Your order has arrived.');
 */
export async function userPushNotification(
  userIdOrPayload: number | string | UserPushNotificationPayload,
  titleParam?: string,
  bodyParam?: string,
  optionsParam?: { icon?: string; url?: string; data?: Record<string, string> }
): Promise<UserPushNotificationResult> {
  // Normalize arguments
  let userId: number | string;
  let title: string;
  let body: string;
  let icon: string;
  let url: string;
  let data: Record<string, string>;

  if (typeof userIdOrPayload === 'object' && userIdOrPayload !== null) {
    userId = userIdOrPayload.userId;
    title = userIdOrPayload.title || '';
    body = userIdOrPayload.body || '';
    icon = userIdOrPayload.icon || '/logo.png';
    url = userIdOrPayload.url || '/orders';
    data = userIdOrPayload.data || {};
  } else {
    userId = userIdOrPayload;
    title = titleParam || '';
    body = bodyParam || '';
    icon = optionsParam?.icon || '/logo.png';
    url = optionsParam?.url || '/orders';
    data = optionsParam?.data || {};
  }

  const parsedUserId = Number(userId);
  if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
    return {
      success: false,
      totalTokens: 0,
      successCount: 0,
      failureCount: 0,
      error: `Invalid userId provided: ${userId}`,
    };
  }

  try {
    // 1. Fetch the last/most recent active FCM token from userLogin table for this user
    const userLogins = await query<any[]>(
      'SELECT id, fcmToken FROM userLogin WHERE user_id = ? AND fcmToken IS NOT NULL AND TRIM(fcmToken) != "" ORDER BY id DESC LIMIT 1',
      [parsedUserId]
    );
    if (!userLogins || userLogins.length === 0) {
      return {
        success: false,
        totalTokens: 0,
        successCount: 0,
        failureCount: 0,
        error: `No active FCM tokens found in userLogin table for user ID ${parsedUserId}.`,
      };
    }

    // Extract the last non-empty token
    const lastToken = String(userLogins[0].fcmToken || '').trim();
    if (!lastToken) {
      return {
        success: false,
        totalTokens: 0,
        successCount: 0,
        failureCount: 0,
        error: `No valid FCM tokens found for user ID ${parsedUserId}.`,
      };
    }

    const tokens = [lastToken];

    // 2. Obtain Firebase Admin SDK App
    const app = getAdminApp();
    if (!app) {
      return {
        success: false,
        totalTokens: tokens.length,
        successCount: 0,
        failureCount: tokens.length,
        error:
          'Firebase Admin SDK is not configured. Please add FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY to your .env file.',
      };
    }

    const messaging = getMessaging(app);

    // 3. Construct FCM Multicast payload
    const multicastMessage: MulticastMessage = {
      tokens,
      notification: {
        title,
        body,
      },
      data: {
        title,
        body,
        icon,
        url,
        userId: String(parsedUserId),
        ...data,
      },
      android: {
        priority: 'high',
        notification: {
          title,
          body,
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
          channelId: 'grace_fresh_market_orders',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            sound: 'default',
            badge: 1,
            contentAvailable: true,
          },
        },
      },
      webpush: {
        headers: {
          Urgency: 'high',
        },
        fcmOptions: {
          link: url,
        },
        notification: {
          title,
          body,
          icon,
          badge: '/logo.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
        },
      },
    };

    // 4. Send notifications via Firebase Admin
    const response = await messaging.sendEachForMulticast(multicastMessage);

    let cleanedTokensCount = 0;

    // 5. Clean up stale/unregistered tokens in userLogin
    if (response.failureCount > 0) {
      const tokensToRemove: string[] = [];

      response.responses.forEach((resp: SendResponse, idx: number) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token'
          ) {
            tokensToRemove.push(tokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        for (const badToken of tokensToRemove) {
          try {
            await query(
              'UPDATE userLogin SET fcmToken = NULL WHERE fcmToken = ?',
              [badToken]
            );
            cleanedTokensCount++;
          } catch (cleanErr) {
            console.error('Error nullifying stale user fcmToken in userLogin:', cleanErr);
          }
        }
      }
    }

    return {
      success: response.successCount > 0,
      totalTokens: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
      cleanedTokensCount,
    };
  } catch (error: any) {
    console.error(`Error sending push notification to user ${parsedUserId}:`, error);
    return {
      success: false,
      totalTokens: 0,
      successCount: 0,
      failureCount: 0,
      error: error?.message || 'Unexpected error occurred while dispatching user push notification.',
    };
  }
}

export default userPushNotification;
