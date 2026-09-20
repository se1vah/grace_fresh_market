'use client';

import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  User,
  ExternalLink,
  Calendar,
  Layers,
  CreditCard,
  AlertCircle,
  Package,
  Search,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import type { UserOrder } from '@/lib/services/get-all-orders';
import OrderStatusDropdown from './OrderStatusDropdown';
import UserDetailsModal from './UserDetailsModal';
import OrderDetailsModal from './OrderDetailsModal';

interface OrdersTableProps {
  orders: UserOrder[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedStatusFilter: string;
  onUpdateStatus: (orderId: number, newStatus: string) => Promise<{ success: boolean; error?: string }>;
  onRetry: () => void;
}

export default function OrdersTable({
  orders,
  loading,
  error,
  searchQuery,
  selectedStatusFilter,
  onUpdateStatus,
  onRetry,
}: OrdersTableProps) {
  // Modal selection states
  const [selectedUserOrder, setSelectedUserOrder] = useState<UserOrder | null>(null);
  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState<UserOrder | null>(null);

  // Filter orders by search and status tab
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Status Filter
      if (selectedStatusFilter !== 'all') {
        const currentStatus = (order.orderStatus?.status || 'ordered').toLowerCase().trim();
        if (selectedStatusFilter === 'ordered' && currentStatus !== 'ordered' && currentStatus !== 'orderd') {
          return false;
        } else if (selectedStatusFilter === 'delivered' && currentStatus !== 'delivered' && currentStatus !== 'deliverd') {
          return false;
        } else if (
          selectedStatusFilter !== 'ordered' &&
          selectedStatusFilter !== 'delivered' &&
          currentStatus !== selectedStatusFilter
        ) {
          return false;
        }
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const orderIdStr = String(order.id);
        const customerName = (order.user?.fullName || '').toLowerCase();
        const customerEmail = (order.user?.email || '').toLowerCase();
        const customerPhone = (order.user?.phoneNumber || '').toLowerCase();
        const city = (order.address?.city || '').toLowerCase();

        return (
          orderIdStr.includes(q) ||
          `#gfm-${orderIdStr}`.includes(q) ||
          customerName.includes(q) ||
          customerEmail.includes(q) ||
          customerPhone.includes(q) ||
          city.includes(q)
        );
      }

      return true;
    });
  }, [orders, searchQuery, selectedStatusFilter]);

  const formatDate = (dateValue?: string | Date) => {
    if (!dateValue) return 'N/A';
    try {
      return new Date(dateValue).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateValue);
    }
  };

  // 1. Loading State Skeleton
  if (loading && orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2EAE1] overflow-hidden shadow-xs">
        <div className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EAF2EA] text-[#2D5A27] flex items-center justify-center mx-auto animate-pulse">
            <ShoppingBag className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-2 max-w-sm mx-auto">
            <div className="h-4 bg-gray-200 rounded-full w-3/4 mx-auto animate-pulse" />
            <div className="h-3 bg-gray-100 rounded-full w-1/2 mx-auto animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="font-quicksand font-bold text-lg text-gray-900">Failed to Load Orders</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">{error}</p>
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-[#2D5A27] hover:bg-[#21431d] text-white font-quicksand font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-xs transition"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Now</span>
        </button>
      </div>
    );
  }

  // 3. Empty State
  if (filteredOrders.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2EAE1] p-12 text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-[#F2F7F2] text-[#2D5A27] flex items-center justify-center mx-auto mb-4 border border-[#E2EAE1]">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <h3 className="font-quicksand font-bold text-lg text-gray-900">No Orders Found</h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-sm mx-auto">
          {searchQuery || selectedStatusFilter !== 'all'
            ? 'No orders match your current filter and search criteria.'
            : 'There are currently no customer orders placed in the system.'}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-2xl border border-[#E2EAE1] overflow-hidden shadow-xs font-nunito">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2EAE1] bg-[#F9FBF9] text-[11px] font-bold uppercase tracking-wider text-gray-400 font-quicksand">
                <th className="py-3.5 px-6">Order ID</th>
                <th className="py-3.5 px-6">Customer Details</th>
                <th className="py-3.5 px-6">Order Details</th>
                <th className="py-3.5 px-6">Total Amount</th>
                <th className="py-3.5 px-6 text-right">Order Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2EAE1] text-sm">
              {filteredOrders.map((order) => {
                const currentStatus = order.orderStatus?.status || 'ordered';
                const user = order.user;
                const itemsCount = order.items?.length || 0;

                return (
                  <tr key={order.id} className="hover:bg-[#F9FBF9] transition duration-150">
                    {/* 1. Order ID Column */}
                    <td className="py-4 px-6 align-top">
                      <div className="space-y-1">
                        <span className="font-mono font-bold text-[#2D5A27] bg-[#EAF2EA] px-2.5 py-1 rounded-lg text-xs tracking-tight inline-block">
                          #GFM-{order.id}
                        </span>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{formatDate(order.createdAt)}</span>
                        </div>
                      </div>
                    </td>

                    {/* 2. User Details (Link to open User Modal) */}
                    <td className="py-4 px-6 align-top">
                      <button
                        type="button"
                        onClick={() => setSelectedUserOrder(order)}
                        className="group flex items-start gap-3 text-left cursor-pointer focus:outline-none"
                        title="View Customer Profile"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#F2F7F2] border border-[#E2EAE1] overflow-hidden shrink-0 flex items-center justify-center text-[#2D5A27] font-bold group-hover:border-[#2D5A27] transition">
                          {user?.profileImage ? (
                            <img
                              src={user.profileImage}
                              alt={user.fullName || 'User'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span>{(user?.fullName || 'U').charAt(0).toUpperCase()}</span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-bold text-gray-900 group-hover:text-[#2D5A27] flex items-center gap-1 transition">
                            <span className="truncate max-w-[150px]">
                              {user?.fullName || 'Customer Profile'}
                            </span>
                            <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-[#2D5A27] shrink-0" />
                          </div>
                          <div className="text-[11px] text-gray-500 truncate max-w-[160px]">
                            {user?.email || `User #${order.userId}`}
                          </div>
                          {user?.phoneNumber && (
                            <div className="text-[11px] text-gray-400">
                              {user.phoneNumber}
                            </div>
                          )}
                        </div>
                      </button>
                    </td>

                    {/* 3. Order Details (Link to open Order Items Modal) */}
                    <td className="py-4 px-6 align-top">
                      <button
                        type="button"
                        onClick={() => setSelectedDetailsOrder(order)}
                        className="group inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-[#EAF2EA] border border-[#E2EAE1] hover:border-[#80C34A] text-left transition cursor-pointer"
                        title="Click to view order items and financial summary"
                      >
                        <div className="w-7 h-7 rounded-lg bg-white border border-[#E2EAE1] flex items-center justify-center text-[#2D5A27] shrink-0 shadow-2xs">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 group-hover:text-[#2D5A27] flex items-center gap-1 transition">
                            <span>{itemsCount} {itemsCount === 1 ? 'Item' : 'Items'}</span>
                            <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-[#2D5A27]" />
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {order.totalItems} total quantity
                          </div>
                        </div>
                      </button>
                    </td>

                    {/* 4. Total Amount */}
                    <td className="py-4 px-6 align-top">
                      <div>
                        <div className="font-quicksand font-bold text-base text-gray-900">
                          ₹{order.total.toFixed(2)}
                        </div>
                        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 mt-0.5">
                          <CreditCard className="w-3 h-3 text-gray-400" />
                          <span>{order.paymentMethod?.paymentType || 'COD'}</span>
                        </div>
                      </div>
                    </td>

                    {/* 5. Order Status Dropdown */}
                    <td className="py-4 px-6 align-top text-right">
                      <OrderStatusDropdown
                        orderId={order.id}
                        currentStatus={currentStatus}
                        onUpdateStatus={onUpdateStatus}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile / Tablet Card View (Separated Individual Cards with Split Details) */}
      <div className="lg:hidden space-y-4">
        {filteredOrders.map((order) => {
          const currentStatus = order.orderStatus?.status || 'ordered';
          const user = order.user;
          const itemsCount = order.items?.length || 0;

          return (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-[#E2EAE1] p-4 sm:p-5 space-y-3.5 shadow-xs hover:border-[#2D5A27]/40 transition font-nunito"
            >
              {/* Header Row: Order ID + Date + Payment Method on left, Status Dropdown on right */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E2EAE1]">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-[#2D5A27] bg-[#EAF2EA] px-2.5 py-1 rounded-lg text-xs tracking-tight">
                      #GFM-{order.id}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                      <CreditCard className="w-3 h-3 text-gray-400" />
                      <span>{order.paymentMethod?.paymentType || 'COD'}</span>
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                </div>

                <div className="shrink-0">
                  <OrderStatusDropdown
                    orderId={order.id}
                    currentStatus={currentStatus}
                    onUpdateStatus={onUpdateStatus}
                  />
                </div>
              </div>

              {/* Split Content: Customer Details & Order Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Customer Details Sub-Card */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-quicksand flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#2D5A27]" />
                    <span>Customer Details</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUserOrder(order)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#F9FBF9] border border-[#E2EAE1] hover:border-[#2D5A27] hover:bg-[#F2F7F2] text-left transition cursor-pointer group"
                    title="Click to view customer profile"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-white border border-[#E2EAE1] overflow-hidden shrink-0 flex items-center justify-center text-[#2D5A27] font-bold shadow-2xs group-hover:border-[#2D5A27] transition">
                        {user?.profileImage ? (
                          <img
                            src={user.profileImage}
                            alt={user.fullName || 'User'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{(user?.fullName || 'U').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-gray-900 truncate group-hover:text-[#2D5A27] transition">
                          {user?.fullName || 'Customer Profile'}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">
                          {user?.email || `User #${order.userId}`}
                        </div>
                        {user?.phoneNumber && (
                          <div className="text-[10px] text-gray-400 truncate">
                            {user.phoneNumber}
                          </div>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#2D5A27] shrink-0 ml-2 transition" />
                  </button>
                </div>

                {/* 2. Order Details Sub-Card */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-quicksand flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-[#2D5A27]" />
                    <span>Order Details</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDetailsOrder(order)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-[#EAF2EA] border border-[#E2EAE1] hover:border-[#80C34A] text-left transition cursor-pointer group"
                    title="Click to view items and financial summary"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-white border border-[#E2EAE1] flex items-center justify-center text-[#2D5A27] shrink-0 shadow-2xs group-hover:border-[#2D5A27] transition">
                        <Package className="w-4 h-4 text-[#2D5A27]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-gray-900 group-hover:text-[#2D5A27] flex items-center gap-1 transition">
                          <span>{itemsCount} {itemsCount === 1 ? 'Item' : 'Items'}</span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {order.totalItems} total quantity
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#2D5A27] shrink-0 ml-2 transition" />
                  </button>
                </div>
              </div>

              {/* 3. Footer: Total Amount Bar */}
              <div className="pt-3 border-t border-[#E2EAE1] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Layers className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-semibold">Total Amount</span>
                </div>
                <div className="font-quicksand font-extrabold text-base sm:text-lg text-gray-900 leading-tight">
                  ₹{order.total.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={Boolean(selectedUserOrder)}
        onClose={() => setSelectedUserOrder(null)}
        order={selectedUserOrder}
      />

      {/* Order Items & Summary Details Modal */}
      <OrderDetailsModal
        isOpen={Boolean(selectedDetailsOrder)}
        onClose={() => setSelectedDetailsOrder(null)}
        order={selectedDetailsOrder}
      />
    </>
  );
}
