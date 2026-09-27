'use client';

import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  X,
  Mail,
  Phone,
  ShoppingBag,
  ShoppingCart
} from 'lucide-react';
import Modal from '@/components/common/Modal';
import type { CustomerSummary } from '@/app/api/shop/customers/route';

interface ActiveOrderInfo {
  orderId: number;
  status: string;
  createdAt?: string | Date;
}

interface DeleteCustomerModalProps {
  isOpen: boolean;
  customer: CustomerSummary | null;
  onClose: () => void;
  onSuccess: (deletedCustomer: CustomerSummary) => void;
}

export default function DeleteCustomerModal({
  isOpen,
  customer,
  onClose,
  onSuccess,
}: DeleteCustomerModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeOrders, setActiveOrders] = useState<ActiveOrderInfo[] | null>(null);

  // Reset errors when modal opens or target customer changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setActiveOrders(null);
      setIsDeleting(false);
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const getInitials = (name?: string | null) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    setActiveOrders(null);

    try {
      // Using existing API: DELETE /api/user/delete/:userId
      const res = await fetch(`/api/user/delete/${customer.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.hasActiveOrders && Array.isArray(data.activeOrders)) {
          setActiveOrders(data.activeOrders);
        }
        setError(data.error || data.message || 'Failed to delete customer.');
        return;
      }

      onSuccess(customer);
      onClose();
    } catch (err: any) {
      console.error('Error deleting customer:', err);
      setError(err?.message || 'An unexpected network error occurred while deleting.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !isDeleting && onClose()} maxWidthClass="max-w-lg">
      <div className="p-6 space-y-5 font-nunito">
        {/* Top Header: Warning Icon & Close Button */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200/80 flex items-center justify-center text-red-600 shrink-0 shadow-xs">
            <Trash2 className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition cursor-pointer disabled:opacity-50"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Title & Warning Explanation */}
        <div>
          <h3 className="text-xl font-bold font-quicksand text-gray-900 tracking-tight">
            Delete Customer Account?
          </h3>
          <p className="mt-1.5 text-xs sm:text-sm text-gray-600 leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <span className="font-bold text-gray-900">
              "{customer.fullName || 'Registered User'}"
            </span>
            ? This action cannot be undone.
          </p>
        </div>

        {/* Customer Snapshot Card */}
        <div className="p-4 rounded-2xl bg-[#F9FBF9] border border-[#E2EAE1] space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#EAF2EA] border border-[#C5DDC4] overflow-hidden shrink-0 flex items-center justify-center text-[#2D5A27] font-bold text-base">
              {customer.profileImage ? (
                <img
                  src={customer.profileImage}
                  alt={customer.fullName || 'Customer'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span>{getInitials(customer.fullName)}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-quicksand font-bold text-sm text-gray-900 truncate">
                {customer.fullName || 'Customer'}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs font-bold text-[#2D5A27] bg-[#EAF2EA] px-1.5 py-0.2 rounded">
                  #CUST-{customer.id}
                </span>
                <span className="text-xs text-gray-500 truncate">{customer.email}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-2 border-t border-[#E2EAE1] flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-gray-400" />
              <span>
                <strong className="text-gray-900">{customer.totalOrders}</strong>{' '}
                {customer.totalOrders === 1 ? 'order' : 'orders'} (₹
                {customer.totalSpent.toFixed(0)})
              </span>
            </div>

            {customer.cartItemCount > 0 && (
              <div className="flex items-center gap-1 text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <ShoppingCart className="w-3 h-3" />
                <span>{customer.cartItemCount} cart items</span>
              </div>
            )}
          </div>
        </div>

        {/* Warning Note */}
        <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-100 text-xs text-red-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-red-950 font-quicksand">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Permanent Hard Deletion</span>
          </div>
          <p className="text-[11px] text-red-700 leading-relaxed">
            All user data will be completely wiped: profile details, delivery addresses, shopping
            cart items, active sessions, and past orders.
          </p>
        </div>

        {/* Active Orders Error Notice */}
        {activeOrders && activeOrders.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-2.5">
            <div className="flex items-center gap-2 font-bold font-quicksand text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Cannot Delete: Active Orders in Progress</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              This customer currently has ongoing order(s). Before deleting this customer, all
              orders must either be <strong>delivered</strong> or <strong>cancelled</strong>.
            </p>
            <div className="space-y-1.5 pt-1">
              {activeOrders.map((ord) => (
                <div
                  key={ord.orderId}
                  className="flex items-center justify-between p-2 rounded-xl bg-white border border-amber-200 shadow-2xs"
                >
                  <span className="font-mono font-bold text-xs text-gray-900">
                    #GFM-{ord.orderId}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                    {ord.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* General Error Banner (if not active orders) */}
        {error && (!activeOrders || activeOrders.length === 0) && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-[#E2EAE1] bg-white hover:bg-gray-50 text-gray-700 font-quicksand font-bold text-xs sm:text-sm transition disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-quicksand font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting Data...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
