'use client';

import React from 'react';
import {
  ShoppingBag,
  Package,
  CreditCard,
  MapPin,
  X,
  CheckCircle2,
  Truck,
  Clock,
  Ban,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import Modal from '@/components/common/Modal';
import type { UserOrder, OrderItem } from '@/lib/services/get-all-orders';
import { formatOrderItemRate, formatOrderItemsSummary } from '@/lib/format-quantity';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: UserOrder | null;
}

export default function OrderDetailsModal({ isOpen, onClose, order }: OrderDetailsModalProps) {
  if (!order) return null;

  const formatDate = (dateValue?: string | Date) => {
    if (!dateValue) return 'N/A';
    try {
      return new Date(dateValue).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateValue);
    }
  };

  const getStatusBadge = (status?: string | null) => {
    const s = String(status || '').toLowerCase().trim();
    switch (s) {
      case 'ordered':
      case 'orderd':
        return {
          label: 'Ordered',
          icon: Clock,
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'packed':
        return {
          label: 'Packed',
          icon: Package,
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'out for delivery':
        return {
          label: 'Out for Delivery',
          icon: Truck,
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'delivered':
      case 'deliverd':
        return {
          label: 'Delivered',
          icon: CheckCircle2,
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          icon: Ban,
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      default:
        return {
          label: status || 'Pending',
          icon: Clock,
          bg: 'bg-gray-50 text-gray-700 border-gray-200',
        };
    }
  };

  const statusInfo = getStatusBadge(order.orderStatus?.status);
  const StatusIcon = statusInfo.icon;

  const getItemImage = (item: OrderItem) => {
    if (item.subcategory?.images && item.subcategory.images.length > 0) {
      return item.subcategory.images[0];
    }
    return '/logo.png';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-2xl">
      <div className="bg-white rounded-2xl overflow-hidden font-nunito flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-[#1E3F1B] via-[#2D5A27] to-[#3a7333] px-6 py-5 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-quicksand font-bold text-xl sm:text-2xl text-white tracking-tight">
                  Order #GFM-{order.id}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-quicksand border ${statusInfo.bg}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  <span>{statusInfo.label}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#D1E6CE] mt-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Placed on {formatDate(order.createdAt)}</span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs uppercase tracking-wider text-[#D1E6CE] font-semibold">Total Amount</div>
              <div className="text-xl sm:text-2xl font-black font-quicksand text-white">
                ₹{order.total.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Order Items Table / List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-quicksand flex items-center gap-2">
                <Package className="w-4 h-4 text-[#2D5A27]" />
                <span>Order Items ({order.items.length})</span>
              </h4>
              <span className="text-xs text-gray-500 font-medium">
                Total Quantity: {formatOrderItemsSummary(order.items, order.totalItems)}
              </span>
            </div>

            <div className="divide-y divide-[#E2EAE1] border border-[#E2EAE1] rounded-2xl overflow-hidden bg-white shadow-2xs">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, index) => {
                  const imgUrl = getItemImage(item);
                  const subcategoryName =
                    item.subcategory?.subcategoryName || `Item #${item.subcategoryId}`;
                  const categoryName = item.subcategory?.category?.categoryName || 'Produce';
                  const subCategoryType = item.subcategory?.subCategoryType || (item as any).subCategoryType;

                  const unitPrice = item.subcategory?.amount ?? (item.quantity > 0 ? item.itemTotal / item.quantity : 0);

                  return (
                    <div
                      key={item.id || index}
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-[#F9FBF9] transition"
                    >
                      {/* Left: Product Image & Details */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-14 h-14 rounded-xl border border-[#E2EAE1] overflow-hidden bg-[#F2F7F2] shrink-0 p-1 flex items-center justify-center">
                          <img
                            src={imgUrl}
                            alt={subcategoryName}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/logo.png';
                            }}
                          />
                        </div>

                        <div className="min-w-0">
                          <h5 className="text-sm font-bold text-gray-900 truncate font-quicksand">
                            {subcategoryName}
                          </h5>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                            <span className="inline-block px-2 py-0.2 rounded-md bg-[#EAF2EA] text-[#2D5A27] font-semibold text-[11px]">
                              {categoryName}
                              {subCategoryType ? ` (${subCategoryType})` : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quantity, Rate, Item Total */}
                      <div className="text-right shrink-0">
                        <div className="text-xs text-gray-600 font-semibold font-quicksand">
                          {formatOrderItemRate(item.quantity, unitPrice, subCategoryType)}
                        </div>
                        <div className="text-sm font-bold text-gray-900 font-quicksand mt-0.5">
                          ₹{item.itemTotal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No line items found for this order.
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary & Order Logistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Payment & Logistics info */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-quicksand">
                Payment & Shipping Info
              </h4>

              <div className="p-4 rounded-xl bg-[#F9FBF9] border border-[#E2EAE1] space-y-3">
                {/* Payment Method */}
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#EAF2EA] text-[#2D5A27] shrink-0 mt-0.5">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-gray-400 uppercase">Payment Method</div>
                    <div className="text-xs font-bold text-gray-900 mt-0.5">
                      {order.paymentMethod?.paymentType || 'Cash on Delivery (COD)'}
                    </div>
                    {order.paymentMethod?.description && (
                      <div className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">
                        {order.paymentMethod.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Destination */}
                <div className="flex items-start gap-2.5 pt-2 border-t border-[#E2EAE1]">
                  <div className="p-1.5 rounded-lg bg-[#EAF2EA] text-[#2D5A27] shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-gray-400 uppercase">Delivery Address</div>
                    {order.address ? (
                      <div className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                        <span className="font-semibold text-gray-900 block">
                          {order.address.building_name}
                        </span>
                        <span>{order.address.street_name}, {order.address.city}</span>
                        {order.address.pincode && <span> - {order.address.pincode}</span>}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">Address not specified</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-quicksand">
                Payment Summary
              </h4>

              <div className="p-4 rounded-xl bg-[#F9FBF9] border border-[#E2EAE1] space-y-2.5">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Items Subtotal:</span>
                  <span className="font-bold text-gray-800">₹{order.subTotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-xs text-gray-600">
                  <span>Delivery Fee:</span>
                  <span className="font-bold text-gray-800">
                    {order.deliveryFee > 0 ? `₹${order.deliveryFee.toFixed(2)}` : 'FREE'}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-gray-600">
                  <span>Total Quantity:</span>
                  <span className="font-bold text-gray-800">
                    {formatOrderItemsSummary(order.items, order.totalItems)}
                  </span>
                </div>

                <div className="pt-2.5 border-t border-[#E2EAE1] flex justify-between items-center">
                  <span className="font-bold font-quicksand text-sm text-gray-900">Final Total:</span>
                  <span className="font-black font-quicksand text-lg text-[#2D5A27]">
                    ₹{order.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-[#E2EAE1] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#2D5A27] hover:bg-[#21431d] text-white font-quicksand font-bold text-sm shadow-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
