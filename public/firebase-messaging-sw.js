// Service Worker for Firebase Cloud Messaging Web Push Notifications
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Parse Firebase configuration dynamically from URL query parameters, with safe fallback
const params = new URL(location.href).searchParams;

const fallbackConfig = {
  apiKey: "AIzaSyDnTMAVE0zxBzEhy8ScaWFqkKmAoTob2LA",
  authDomain: "grash-fresh-market.firebaseapp.com",
  projectId: "grash-fresh-market",
  storageBucket: "grash-fresh-market.firebasestorage.app",
  messagingSenderId: "65763469344",
  appId: "1:65763469344:web:a754af832b5e28a7e2b445",
};

const firebaseConfig = {
  apiKey: params.get('apiKey') || fallbackConfig.apiKey,
  authDomain: params.get('authDomain') || fallbackConfig.authDomain,
  projectId: params.get('projectId') || fallbackConfig.projectId,
  storageBucket: params.get('storageBucket') || fallbackConfig.storageBucket,
  messagingSenderId: params.get('messagingSenderId') || fallbackConfig.messagingSenderId,
  appId: params.get('appId') || fallbackConfig.appId,
};

// Initialize Firebase in Service Worker
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

// Handle Background Push Notifications via Firebase
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const title = payload.notification?.title || payload.data?.title || 'Grace Fresh Shop Alert';
  const options = {
    body: payload.notification?.body || payload.data?.body || 'You have a new shop notification.',
    icon: payload.notification?.icon || payload.data?.icon || '/logo.png',
    badge: '/logo.png',
    tag: payload.data?.tag || 'shop-notification',
    requireInteraction: true,
    data: {
      url: payload.data?.url || payload.fcmOptions?.link || '/shop',
      ...payload.data
    },
    vibrate: [200, 100, 200]
  };

  return self.registration.showNotification(title, options);
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/shop';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a shop tab is already open, focus it
      for (const client of windowClients) {
        if (client.url.includes('/shop') && 'focus' in client) {
          if ('navigate' in client && targetUrl !== '/shop') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
