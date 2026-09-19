'use client';

import { getMessaging, getToken, onMessage, isSupported, MessagePayload, Messaging } from 'firebase/messaging';
import { getFirebaseApp, VAPID_KEY, firebaseConfig } from './config';

const SHOP_FCM_STORAGE_KEY = 'shop_fcm_token';

let messagingInstance: Messaging | null = null;

/**
 * Checks if Web Push Notifications and Firebase Messaging are supported in current browser
 */
export async function isPushSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  if (!('PushManager' in window)) return false;
  if (!('Notification' in window)) return false;

  try {
    return await isSupported();
  } catch (err) {
    console.warn('Firebase Messaging isSupported check failed:', err);
    return false;
  }
}

/**
 * Gets or initializes the Firebase Messaging instance
 */
async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;

  const supported = await isPushSupported();
  if (!supported) return null;

  if (!messagingInstance) {
    const app = getFirebaseApp();
    messagingInstance = getMessaging(app);
  }

  return messagingInstance;
}

/**
 * Requests browser notification permission and retrieves device FCM token for shop user
 */
export async function requestShopFcmToken(): Promise<{
  token: string | null;
  permission: NotificationPermission;
  error?: string;
}> {
  if (typeof window === 'undefined') {
    return { token: null, permission: 'default', error: 'Window not available' };
  }

  const supported = await isPushSupported();
  if (!supported) {
    return {
      token: null,
      permission: 'denied',
      error: 'Web Push Notifications are not supported in this browser.',
    };
  }

  try {
    // 1. Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        token: null,
        permission,
        error: permission === 'denied' ? 'Notification permission was denied by user.' : 'Notification permission dismissed.',
      };
    }

    // 2. Register Firebase Messaging Service Worker with environment config
    const swParams = new URLSearchParams({
      apiKey: firebaseConfig.apiKey || '',
      authDomain: firebaseConfig.authDomain || '',
      projectId: firebaseConfig.projectId || '',
      storageBucket: firebaseConfig.storageBucket || '',
      messagingSenderId: firebaseConfig.messagingSenderId || '',
      appId: firebaseConfig.appId || '',
    }).toString();

    const registration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${swParams}`,
      {
        scope: '/',
      }
    );
    await navigator.serviceWorker.ready;

    if (registration.active) {
      registration.active.postMessage({
        type: 'SET_FIREBASE_CONFIG',
        config: firebaseConfig,
      });
    }

    // 3. Obtain Messaging instance and generate device token
    const messaging = await getMessagingInstance();
    if (!messaging) {
      return { token: null, permission, error: 'Failed to initialize Firebase Messaging' };
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      localStorage.setItem(SHOP_FCM_STORAGE_KEY, token);
    }

    return { token, permission };
  } catch (error: any) {
    console.error('Error getting shop FCM token:', error);
    return {
      token: null,
      permission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
      error: error?.message || 'Failed to retrieve FCM token.',
    };
  }
}

/**
 * Returns the cached FCM token from localStorage if available
 */
export function getCachedShopFcmToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SHOP_FCM_STORAGE_KEY);
}

/**
 * Syncs the FCM token with the backend shop user profile
 */
export async function syncShopFcmToken(token: string): Promise<boolean> {
  try {
    const res = await fetch('/api/shop/fcm-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fcmToken: token }),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to sync shop FCM token:', err);
    return false;
  }
}

/**
 * Listens for push notifications received while the shop dashboard is in the foreground
 */
export async function onForegroundShopMessage(
  callback: (payload: MessagePayload) => void
): Promise<(() => void) | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  return onMessage(messaging, (payload) => {
    callback(payload);
  });
}
