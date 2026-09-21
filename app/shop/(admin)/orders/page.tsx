'use client';

import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Clock,
  Package,
  Truck,
  CheckCircle2,
  Ban,
  TrendingUp,
  RefreshCw,
  Sparkles,
  Layers
} from 'lucide-react';
import SearchInput from '@/components/common/SearchInput';
import { useShopOrders } from '@/components/shop/orders/ShopOrdersContext';
import OrdersTable from '@/components/shop/orders/OrdersTable';

export default function OrdersManagementPage() {
  const { orders, orderedCount, loading, error, refetchOrders, updateOrderStatus } = useShopOrders();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Compute status counts for KPI badges and filter tabs
  const stats = useMemo(() => {
    let ordered = 0;
    let packed = 0;
    let outForDelivery = 0;
    let delivered = 0;
    let cancelled = 0;
    let totalRevenue = 0;

    for (const order of orders) {
      const s = (order.orderStatus?.status || 'ordered').toLowerCase().trim();
      const isCancelled = s === 'cancelled' || s === 'canceled';

      if (!isCancelled) {
        totalRevenue += Number(order.total || 0);
      }

      if (s === 'ordered' || s === 'orderd') ordered++;
      else if (s === 'packed') packed++;
      else if (s === 'out for delivery') outForDelivery++;
      else if (s === 'delivered' || s === 'deliverd') delivered++;
      else if (isCancelled) cancelled++;
    }

    return {
      total: orders.length,
      ordered,
      packed,
      outForDelivery,
      delivered,
      cancelled,
      totalRevenue,
    };
  }, [orders]);

  const filterTabs = [
    { id: 'all', label: 'All Orders', count: stats.total },
    { id: 'ordered', label: 'Ordered', count: stats.ordered, badgeClass: 'bg-amber-100 text-amber-800' },
    { id: 'packed', label: 'Packed', count: stats.packed, badgeClass: 'bg-blue-100 text-blue-800' },
    { id: 'out for delivery', label: 'Out for Delivery', count: stats.outForDelivery, badgeClass: 'bg-purple-100 text-purple-800' },
    { id: 'delivered', label: 'Delivered', count: stats.delivered, badgeClass: 'bg-emerald-100 text-emerald-800' },
    { id: 'cancelled', label: 'Cancelled', count: stats.cancelled, badgeClass: 'bg-rose-100 text-rose-800' },
  ];

  return (
    <div className="space-y-6 font-nunito pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#EAF2EA] text-[#2D5A27]">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-quicksand text-gray-900 tracking-tight">
              Orders Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Real-time customer orders pipeline, status transitions, and delivery fulfillment.
          </p>
        </div>

        {/* Real-time Order Count & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EAF2EA] border border-[#C5DDC4] text-xs font-bold text-[#2D5A27] font-quicksand">
            <span className="w-2 h-2 rounded-full bg-[#80C34A] animate-ping" />
            <span>{orderedCount} Pending Orders</span>
          </div>

          <button
            onClick={() => refetchOrders()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#E2EAE1] bg-white hover:bg-[#F2F7F2] hover:text-[#2D5A27] text-gray-600 transition shadow-2xs cursor-pointer"
            title="Refresh orders list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Orders */}
        <div className="p-4 rounded-2xl bg-white border border-[#E2EAE1] shadow-2xs space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-quicksand">
            Total Orders
          </div>
          <div className="text-xl sm:text-2xl font-black font-quicksand text-gray-900">
            {stats.total}
          </div>
          <div className="text-[11px] text-gray-500 font-medium">All recorded</div>
        </div>

        {/* Ordered (Pending) */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 font-quicksand">
              Ordered
            </span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-quicksand text-amber-900">
            {stats.ordered}
          </div>
          <div className="text-[11px] text-amber-700 font-medium">Awaiting pack</div>
        </div>

        {/* Packed */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 font-quicksand">
              Packed
            </span>
            <Package className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-quicksand text-blue-900">
            {stats.packed}
          </div>
          <div className="text-[11px] text-blue-700 font-medium">Ready to ship</div>
        </div>

        {/* Out for Delivery */}
        <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 font-quicksand">
              Out for Delivery
            </span>
            <Truck className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-quicksand text-purple-900">
            {stats.outForDelivery}
          </div>
          <div className="text-[11px] text-purple-700 font-medium">With driver</div>
        </div>

        {/* Delivered */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 font-quicksand">
              Delivered
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-quicksand text-emerald-900">
            {stats.delivered}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">Completed</div>
        </div>

        {/* Total Revenue */}
        <div className="p-4 rounded-2xl bg-white border border-[#E2EAE1] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-quicksand">
              Revenue
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-[#2D5A27]" />
          </div>
          <div className="text-lg sm:text-xl font-black font-quicksand text-[#2D5A27] truncate">
            ₹{stats.totalRevenue.toFixed(0)}
          </div>
          <div className="text-[11px] text-gray-500 font-medium">Excl. cancelled</div>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filterTabs.map((tab) => {
          const isActive = selectedStatus === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-quicksand whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${isActive
                ? 'bg-[#2D5A27] text-white shadow-xs shadow-[#2D5A27]/20'
                : 'bg-white border border-[#E2EAE1] text-gray-600 hover:bg-[#F2F7F2] hover:text-[#2D5A27]'
                }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${isActive
                  ? 'bg-white/20 text-white'
                  : tab.badgeClass || 'bg-gray-100 text-gray-600'
                  }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-[#E2EAE1] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <SearchInput
          value={search}
          placeholder="Search by order ID, customer name, phone, email, or city..."
          onSearch={(val) => setSearch(val)}
          className="max-w-xl"
        />
      </div>

      {/* Orders Table & Modals */}
      <OrdersTable
        orders={orders}
        loading={loading}
        error={error}
        searchQuery={search}
        selectedStatusFilter={selectedStatus}
        onUpdateStatus={updateOrderStatus}
        onRetry={refetchOrders}
      />
    </div>
  );
}
