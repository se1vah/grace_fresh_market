import { query } from '@/lib/db';
import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getMessaging, MulticastMessage, SendResponse } from 'firebase-admin/messaging';

let adminApp: App | null = null;

/**
 * Initializes the Firebase Admin SDK if not already initialized
 */
export function getAdminApp(): App | null {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'grash-fresh-market';

  let clientEmail =
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    process.env.FIREBASE_CLIENT_EMAIL ||
    '';

  clientEmail = clientEmail.trim();
  if (clientEmail.endsWith('.co')) {
    clientEmail += 'm';
  }

  let privateKey =
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
    process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Handle escaped newlines in environment variable
    privateKey = privateKey.replace(/\\n/g, '\n').trim();
  }

  if (clientEmail && privateKey) {
    try {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      return adminApp;
    } catch (err) {
      console.error('[FirebaseAdmin] Failed to initialize with cert credentials:', err);
      return null;
    }
  }

  // Fallback: If application default credentials or local project ID is configured
  try {
    adminApp = initializeApp({
      projectId,
    });
    return adminApp;
  } catch (err) {
    console.warn(
      '[FirebaseAdmin] Initialized without credentials. Server-side push delivery requires FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY in .env.'
    );
    return null;
  }
}

export interface ShopPushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, string>;
  shopUserId?: string; // Optional: Send to specific shop user. If omitted, sends to all shop users with active FCM token.
}

export interface ShopPushNotificationResult {
  success: boolean;
  totalTokens: number;
  successCount: number;
  failureCount: number;
  error?: string;
  cleanedTokensCount?: number;
}

/**
 * Backend Helper Function: Triggers web push notifications to Shop User(s)
 *
 * @param payload - Notification content and target configuration
 * @returns Result summary with successCount, failureCount, etc.
 *
 * @example
 * // Trigger when a new order is received
 * await sendShopPushNotification({
 *   title: 'New Order Received! 🛒',
 *   body: 'Order #1042 was placed just now.',
 *   url: '/shop',
 * });
 */
export async function sendShopPushNotification(
  payload: ShopPushNotificationPayload
): Promise<ShopPushNotificationResult> {
  const { title, body, icon = '/logo.png', url = '/shop', data = {}, shopUserId } = payload;

  try {
    // 1. Fetch active FCM tokens from shop_user table
    let shopUsers: Array<{ id: string; email: string; fcmToken: string }>;

    if (shopUserId) {
      shopUsers = await query<any[]>(
        'SELECT id, email, fcmToken FROM shop_user WHERE id = ? AND fcmToken IS NOT NULL AND TRIM(fcmToken) != ""',
        [shopUserId]
      );
    } else {
      shopUsers = await query<any[]>(
        'SELECT id, email, fcmToken FROM shop_user WHERE fcmToken IS NOT NULL AND TRIM(fcmToken) != ""'
      );
    }

    if (!shopUsers || shopUsers.length === 0) {
      return {
        success: false,
        totalTokens: 0,
        successCount: 0,
        failureCount: 0,
        error: shopUserId
          ? `Shop user ${shopUserId} does not have an active Web Push FCM token.`
          : 'No active Shop User FCM tokens found in shop_user table.',
      };
    }

    const tokens = Array.from(
      new Set(shopUsers.map((u) => u.fcmToken.trim()).filter(Boolean))
    );

    if (tokens.length === 0) {
      return {
        success: false,
        totalTokens: 0,
        successCount: 0,
        failureCount: 0,
        error: 'No valid FCM tokens found for shop user(s).',
      };
    }

    // 2. Initialize Firebase Admin SDK
    const app = getAdminApp();

    if (!app) {
      return {
        success: false,
        totalTokens: tokens.length,
        successCount: 0,
        failureCount: tokens.length,
        error:
          'Firebase Admin SDK is not configured. Please add FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY to your .env file to enable backend push notification dispatching.',
      };
    }

    const messaging = getMessaging(app);

    // 3. Construct FCM multicast payload
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
        ...data,
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

    // 4. Send messages via Firebase Admin
    const response = await messaging.sendEachForMulticast(multicastMessage);

    let cleanedTokensCount = 0;

    // 5. Clean up stale/unregistered tokens
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
              'UPDATE shop_user SET fcmToken = NULL WHERE fcmToken = ?',
              [badToken]
            );
            cleanedTokensCount++;
          } catch (cleanErr) {
            console.error('Error nullifying stale fcmToken:', cleanErr);
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
    console.error('Error sending shop push notification:', error);
    return {
      success: false,
      totalTokens: 0,
      successCount: 0,
      failureCount: 0,
      error: error?.message || 'Unexpected error occurred while dispatching push notification.',
    };
  }
}
