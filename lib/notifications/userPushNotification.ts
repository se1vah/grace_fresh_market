import { query } from '@/lib/db';
import { getAdminApp } from '@/lib/notifications/shopPush';
import { getMessaging, MulticastMessage, SendResponse } from 'firebase-admin/messaging';
import { insertNotification } from '@/lib/services/notification';

export interface UserPushNotificationPayload {
  userId: number | string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  type?: string;
  orderId?: number | string | null;
  data?: Record<string, string>;
}

export interface UserPushNotificationResult {
  success: boolean;
  totalTokens: number;
  successCount: number;
  failureCount: number;
  error?: string;
  cleanedTokensCount?: number;
  notificationId?: number;
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
  optionsParam?:
    | string
    | {
        icon?: string;
        url?: string;
        type?: string;
        orderId?: number | string | null;
        data?: Record<string, string>;
      }
): Promise<UserPushNotificationResult> {
  // Normalize arguments
  let userId: number | string;
  let title: string;
  let body: string;
  let icon: string;
  let url: string;
  let data: Record<string, string>;
  let type: string | undefined;
  let orderId: number | string | null | undefined;

  if (typeof userIdOrPayload === 'object' && userIdOrPayload !== null) {
    userId = userIdOrPayload.userId;
    title = userIdOrPayload.title || '';
    body = userIdOrPayload.body || '';
    icon = userIdOrPayload.icon || '/logo.png';
    url = userIdOrPayload.url || '/orders';
    data = userIdOrPayload.data || {};
    type = userIdOrPayload.type;
    orderId = userIdOrPayload.orderId;
  } else {
    userId = userIdOrPayload;
    title = titleParam || '';
    body = bodyParam || '';
    if (typeof optionsParam === 'string') {
      type = optionsParam;
      icon = '/logo.png';
      url = '/orders';
      data = {};
      orderId = null;
    } else {
      icon = optionsParam?.icon || '/logo.png';
      url = optionsParam?.url || '/orders';
      data = optionsParam?.data || {};
      type = optionsParam?.type;
      orderId = optionsParam?.orderId;
    }
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

  // Determine notification type (e.g. "ordered", "delivered", "packed", "out for delivery", "cancelled")
  const resolvedType = (
    type ||
    data?.status ||
    (data?.type && data.type !== 'order_status_update' ? data.type : null) ||
    data?.status ||
    'order'
  ).toString().trim().toLowerCase();

  // Determine associated orderId
  const rawOrderId = orderId ?? data?.orderId ?? data?.order_id;
  const parsedOrderId = rawOrderId !== undefined && rawOrderId !== null && rawOrderId !== ''
    ? Number(rawOrderId)
    : null;
  const resolvedOrderId = Number.isInteger(parsedOrderId) && parsedOrderId! > 0 ? parsedOrderId : null;

  // Insert record into Notification table when push notification is triggered
  let notificationId: number | undefined;
  if (parsedUserId > 0 && title.trim() && body.trim()) {
    try {
      const savedNotif = await insertNotification({
        userId: parsedUserId,
        orderId: resolvedOrderId,
        title: title.trim(),
        content: body.trim(),
        type: resolvedType,
      });
      notificationId = savedNotif.id;
    } catch (dbErr) {
      console.error(`[userPushNotification] Error recording notification in database for user ${parsedUserId}:`, dbErr);
    }
  }

  try {
    // 1. Fetch the last/most recent active FCM token from userLogin table for this user
    const userLogins = await query<any[]>(
      'SELECT id, fcmToken FROM userLogin WHERE user_id = ? AND fcmToken IS NOT NULL AND TRIM(fcmToken) != "expired" ORDER BY id DESC LIMIT 1',
      [parsedUserId]
    );
    if (!userLogins || userLogins.length === 0) {
      return {
        success: false,
        totalTokens: 0,
        successCount: 0,
        failureCount: 0,
        error: `No active FCM tokens found in userLogin table for user ID ${parsedUserId}.`,
        notificationId,
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
        notificationId,
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
        notificationId,
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
        type: resolvedType,
        ...(resolvedOrderId ? { orderId: String(resolvedOrderId) } : {}),
        ...(notificationId ? { notificationId: String(notificationId) } : {}),
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
      notificationId,
    };
  } catch (error: any) {
    console.error(`Error sending push notification to user ${parsedUserId}:`, error);
    return {
      success: false,
      totalTokens: 0,
      successCount: 0,
      failureCount: 0,
      error: error?.message || 'Unexpected error occurred while dispatching user push notification.',
      notificationId,
    };
  }
}

export default userPushNotification;
