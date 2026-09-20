'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/components/providers/SocketProvider';
import type { UserOrder } from '@/lib/services/get-all-orders';

interface ShopOrdersContextType {
  orders: UserOrder[];
  orderedCount: number;
  loading: boolean;
  error: string | null;
  refetchOrders: () => Promise<void>;
  refreshCount: () => Promise<void>;
  updateOrderStatus: (orderId: number, status: string) => Promise<{ success: boolean; error?: string }>;
}

const ShopOrdersContext = createContext<ShopOrdersContextType | null>(null);

export function ShopOrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [orderedCount, setOrderedCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { subscribe } = useSocket();

  // Fetch pending count for the sideMenu badge
  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch('/api/shop/orders/count');
      if (res.ok) {
        const data = await res.json();
        if (typeof data.orderCount === 'number') {
          setOrderedCount(data.orderCount);
        }
      }
    } catch (err) {
      console.warn('[ShopOrdersContext] Error refreshing order count:', err);
    }
  }, []);

  // Fetch full orders list
  const refetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/shop/orders');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to fetch orders');
        return;
      }

      setOrders(data.data || []);
      if (typeof data.pendingCount === 'number') {
        setOrderedCount(data.pendingCount);
      }
    } catch (err: any) {
      console.error('[ShopOrdersContext] Error loading orders:', err);
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    refreshCount();
    refetchOrders();
  }, [refreshCount, refetchOrders]);

  // Subscribe to socket event 'new-order-to-shop'
  useEffect(() => {
    const unsubscribe = subscribe('new-order-to-shop', (payload: any) => {
      // Update sideMenu count immediately
      if (payload && typeof payload.orderCount === 'number') {
        setOrderedCount(payload.orderCount);
      } else {
        refreshCount();
      }

      // Refetch full orders query so the orders management table updates in real time
      refetchOrders();
    });

    return unsubscribe;
  }, [subscribe, refreshCount, refetchOrders]);

  // Update order status mutation
  const updateOrderStatus = useCallback(
    async (orderId: number, status: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/shop/orders', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orderId, status }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to update order status');
          return { success: false, error: data.error || 'Failed to update status' };
        }

        if (typeof data.orderCount === 'number') {
          setOrderedCount(data.orderCount);
        }

        // Optimistically update local order in state
        setOrders((prev) =>
          prev.map((order) => {
            if (order.id === orderId) {
              const updatedStatusObj = {
                id: Date.now(),
                orderId,
                status,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              return {
                ...order,
                orderStatus: updatedStatusObj,
                statusHistory: [...(order.statusHistory || []), updatedStatusObj],
              };
            }
            return order;
          })
        );

        return { success: true };
      } catch (err: any) {
        console.error('[ShopOrdersContext] Error in updateOrderStatus:', err);
        return { success: false, error: err.message || 'Failed to update status' };
      }
    },
    []
  );

  return (
    <ShopOrdersContext.Provider
      value={{
        orders,
        orderedCount,
        loading,
        error,
        refetchOrders,
        refreshCount,
        updateOrderStatus,
      }}
    >
      {children}
    </ShopOrdersContext.Provider>
  );
}

export function useShopOrders() {
  const context = useContext(ShopOrdersContext);
  if (!context) {
    throw new Error('useShopOrders must be used within a ShopOrdersProvider.');
  }
  return context;
}
