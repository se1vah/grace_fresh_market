'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, CheckCircle2, AlertCircle, X, ExternalLink } from 'lucide-react';
import {
  isPushSupported,
  requestShopFcmToken,
  syncShopFcmToken,
  onForegroundShopMessage,
  getCachedShopFcmToken,
} from '@/lib/firebase/messaging';

interface NotificationToast {
  id: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

interface ShopNotificationContextType {
  isSupported: boolean;
  permission: NotificationPermission;
  fcmToken: string | null;
  isLoading: boolean;
  requestPermission: () => Promise<void>;
}

const ShopNotificationContext = createContext<ShopNotificationContextType>({
  isSupported: false,
  permission: 'default',
  fcmToken: null,
  isLoading: false,
  requestPermission: async () => {},
});

export const useShopNotifications = () => useContext(ShopNotificationContext);

export function ShopNotificationProvider({ children }: { children: React.ReactNode }) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<NotificationToast[]>([]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function init() {
      const isSupp = await isPushSupported();
      setSupported(isSupp);

      if (typeof window !== 'undefined' && 'Notification' in window) {
        const currentPermission = Notification.permission;
        setPermission(currentPermission);

        const cached = getCachedShopFcmToken();
        if (cached) {
          setFcmToken(cached);
        }

        // If permission is already granted, ensure token is synced with shop_user
        if (currentPermission === 'granted') {
          const { token } = await requestShopFcmToken();
          if (token) {
            setFcmToken(token);
            await syncShopFcmToken(token);
          }
        } else if (currentPermission === 'default') {
          // Trigger native browser notification permission prompt directly
          setTimeout(() => {
            requestShopFcmToken().then((res) => {
              setPermission(res.permission);
              if (res.token) {
                setFcmToken(res.token);
                syncShopFcmToken(res.token);
              }
            }).catch(() => {});
          }, 600);
        }
      }

      // Attach foreground message listener
      const unsub = await onForegroundShopMessage((payload) => {
        console.log('[ShopNotificationManager] Foreground message:', payload);
        const title = payload.notification?.title || payload.data?.title || 'Grace Fresh Shop Alert';
        const body = payload.notification?.body || payload.data?.body || 'New shop notification received.';
        const url = payload.data?.url || '/shop';
        const icon = payload.notification?.icon || payload.data?.icon || '/logo.png';

        const newToast: NotificationToast = {
          id: `${Date.now()}-${Math.random()}`,
          title,
          body,
          url,
          icon,
        };

        setToasts((prev) => [newToast, ...prev.slice(0, 4)]);

        // Display native system desktop notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification(title, {
                  body,
                  icon,
                  badge: '/logo.png',
                  requireInteraction: true,
                  data: { url },
                } as any);
              }).catch(() => {
                new Notification(title, { body, icon });
              });
            } else {
              new Notification(title, { body, icon });
            }
          } catch (notifErr) {
            console.warn('[ShopNotificationManager] Native notification display error:', notifErr);
          }
        }

        // Try playing subtle alert beep if audio supported
        try {
          const audio = new Audio('/notification-sound.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch {}
      });

      if (unsub) {
        unsubscribe = unsub;
      }
    }

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const requestPermission = async () => {
    setIsLoading(true);
    try {
      const res = await requestShopFcmToken();
      setPermission(res.permission);
      if (res.token) {
        setFcmToken(res.token);
        await syncShopFcmToken(res.token);
      }
    } catch (err) {
      console.error('Failed to request notification permission:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ShopNotificationContext.Provider
      value={{
        isSupported: supported,
        permission,
        fcmToken,
        isLoading,
        requestPermission,
      }}
    >
      {children}

      {/* Floating Foreground Push Notification Toasts */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white rounded-2xl shadow-xl border border-[#2D5A27]/20 p-4 transition-all duration-300 animate-slide-in flex items-start gap-3 relative overflow-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F2F7F2] border border-[#E2EAE1] flex items-center justify-center shrink-0 p-1.5 overflow-hidden">
              <img src={toast.icon || '/logo.png'} alt="Alert" className="w-full h-full object-contain" />
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <h4 className="text-sm font-bold font-quicksand text-[#1E2922] truncate">
                {toast.title}
              </h4>
              <p className="text-xs font-nunito text-gray-600 mt-0.5 line-clamp-2">
                {toast.body}
              </p>
              {toast.url && (
                <a
                  href={toast.url}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2D5A27] hover:underline mt-1.5"
                >
                  <span>View Details</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ShopNotificationContext.Provider>
  );
}

/**
 * Header Bell Toggle Component to show and toggle Web Push Notification status
 */
export function ShopNotificationBell() {
  const { isSupported, permission, fcmToken, isLoading, requestPermission } = useShopNotifications();

  if (!isSupported) return null;

  const isGranted = permission === 'granted' && !!fcmToken;

  return (
    <button
      onClick={requestPermission}
      disabled={isLoading || isGranted}
      title={
        isGranted
          ? 'Push Notifications Active on this device'
          : permission === 'denied'
          ? 'Notifications blocked in browser settings'
          : 'Click to enable Web Push Notifications'
      }
      className={`relative p-2 rounded-xl border transition-all flex items-center gap-1.5 ${
        isGranted
          ? 'bg-[#EBF7E9] border-[#B9E5B5] text-[#2D5A27]'
          : permission === 'denied'
          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-white border-[#E2EAE1] text-gray-600 hover:bg-[#F2F7F2] hover:text-[#2D5A27] animate-pulse'
      }`}
    >
      {isGranted ? (
        <>
          <BellRing className="w-4 h-4 text-[#2D5A27]" />
          <span className="hidden sm:inline text-xs font-bold text-[#2D5A27]">
            Push Active
          </span>
          <span className="w-2 h-2 rounded-full bg-[#80C34A] absolute top-1.5 right-1.5 ring-2 ring-white" />
        </>
      ) : (
        <>
          <Bell className="w-4 h-4" />
          <span className="hidden sm:inline text-xs font-medium">
            {permission === 'denied' ? 'Notifications Blocked' : 'Enable Push'}
          </span>
        </>
      )}
    </button>
  );
}
