import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDnTMAVE0zxBzEhy8ScaWFqkKmAoTob2LA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "grash-fresh-market.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "grash-fresh-market",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "grash-fresh-market.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "65763469344",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:65763469344:web:a754af832b5e28a7e2b445",
};

export const VAPID_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
  "BJzui4UZxv4WboS5Oa7DaHj7vU8sxl1wYixvFAenuLlBhBNgZaSqyshTLU90wOl2BYOCX56YtPjrZzHOCKCu1Hs";

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}
