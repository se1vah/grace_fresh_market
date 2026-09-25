'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  CreditCard,
  Package,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Building,
  Navigation,
  MessageSquare
} from 'lucide-react';
import Modal from '@/components/common/Modal';
import type { CustomerSummary } from '@/app/api/shop/customers/route';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerSummary | null;
}

export default function CustomerDetailsModal({
  isOpen,
  onClose,
  customer,
}: CustomerDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'addresses'>('profile');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!customer) return null;

  const getInitials = (name?: string | null) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatDate = (dateValue?: string | Date | null) => {
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

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase().trim();
    if (s === 'delivered' || s === 'deliverd') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Delivered
        </span>
      );
    } else if (s === 'out for delivery') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
          <Clock className="w-3 h-3" /> Out for Delivery
        </span>
      );
    } else if (s === 'packed') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
          <Package className="w-3 h-3" /> Packed
        </span>
      );
    } else if (s === 'cancelled') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
          Cancelled
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
        <Clock className="w-3 h-3" /> Ordered
      </span>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-2xl">
      <div className="bg-white rounded-2xl overflow-hidden font-nunito flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-[#1E3F1B] via-[#2D5A27] to-[#3B7733] px-6 py-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            {/* Customer Avatar */}
            <div className="relative shrink-0">
              {customer.profileImage ? (
                <img
                  src={customer.profileImage}
                  alt={customer.fullName || 'Customer'}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/80 shadow-md bg-white"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    const fallback = (e.target as HTMLElement).nextElementSibling;
                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                  }}
                />
              ) : null}

              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#80C34A] to-emerald-600 text-white flex items-center justify-center text-xl sm:text-2xl font-bold font-quicksand border-2 border-white/80 shadow-md ${customer.profileImage ? 'hidden' : 'flex'
                  }`}
              >
                {getInitials(customer.fullName)}
              </div>
            </div>

            {/* Customer Info */}
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 text-[#80C34A] text-xs font-bold font-quicksand backdrop-blur-md mb-1 border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Customer ID #{customer.id}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold font-quicksand text-white truncate leading-tight">
                {customer.fullName}
              </h3>
              <div className="text-xs sm:text-sm text-[#D1E6CE] flex items-center gap-2 mt-1">
                <Calendar className="w-3.5 h-3.5 opacity-80" />
                <span>Member since {formatDate(customer.createdAt).split(',')[0]}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-4 bg-[#F2F7F2] border-b border-[#E2EAE1] p-3 text-center shrink-0">
          <div className="border-r border-[#E2EAE1]/70 px-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-quicksand">
              Orders
            </div>
            <div className="text-base sm:text-lg font-black font-quicksand text-[#2D5A27]">
              {customer.totalOrders}
            </div>
          </div>
          <div className="border-r border-[#E2EAE1]/70 px-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-quicksand">
              Total Spent
            </div>
            <div className="text-base sm:text-lg font-black font-quicksand text-gray-900">
              ₹{customer.totalSpent.toFixed(0)}
            </div>
          </div>
          <div className="border-r border-[#E2EAE1]/70 px-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-quicksand">
              Addresses
            </div>
            <div className="text-base sm:text-lg font-black font-quicksand text-gray-900">
              {customer.addresses?.length || 0}
            </div>
          </div>
          <div className="px-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-quicksand">
              Cart Items
            </div>
            <div className="text-base sm:text-lg font-black font-quicksand text-[#80C34A]">
              {customer.cartItemCount}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E2EAE1] px-6 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold font-quicksand border-b-2 transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'profile'
                ? 'border-[#2D5A27] text-[#2D5A27]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
          >
            <User className="w-4 h-4" />
            <span>Profile & Contacts</span>
          </button>
          <button
            onClick={() => setActiveTab('addresses')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold font-quicksand border-b-2 transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'addresses'
                ? 'border-[#2D5A27] text-[#2D5A27]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Saved Addresses ({customer.addresses?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold font-quicksand border-b-2 transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'orders'
                ? 'border-[#2D5A27] text-[#2D5A27]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Order History ({customer.recentOrders?.length || 0})</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: Profile & Contacts */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Contact Information Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email Card */}
                <div className="p-4 rounded-2xl bg-[#F9FBF9] border border-[#E2EAE1] flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-quicksand flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#2D5A27]" />
                      <span>Email Address</span>
                    </div>
                    <div className="text-sm font-bold text-gray-900 mt-1 break-all">
                      {customer.email || 'No email registered'}
                    </div>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E2EAE1]/70">
                      <a
                        href={`mailto:${customer.email}`}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E2EAE1] hover:border-[#2D5A27] text-xs font-bold text-[#2D5A27] inline-flex items-center gap-1 transition shadow-2xs"
                      >
                        <ExternalLink className="w-3 h-3" /> Mail
                      </a>
                      <button
                        onClick={() => copyToClipboard(customer.email, 'email')}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E2EAE1] hover:border-[#2D5A27] text-xs font-medium text-gray-600 inline-flex items-center gap-1 transition shadow-2xs cursor-pointer"
                      >
                        {copiedField === 'email' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-gray-400" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Phone Number Card */}
                <div className="p-4 rounded-2xl bg-[#F9FBF9] border border-[#E2EAE1] flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-quicksand flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#2D5A27]" />
                      <span>Phone Number</span>
                    </div>
                    <div className="text-sm font-bold text-gray-900 mt-1">
                      {customer.phoneNumber || 'No phone number provided'}
                    </div>
                  </div>
                  {customer.phoneNumber && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E2EAE1]/70">
                      <a
                        href={`tel:${customer.phoneNumber}`}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E2EAE1] hover:border-[#2D5A27] text-xs font-bold text-[#2D5A27] inline-flex items-center gap-1 transition shadow-2xs"
                      >
                        <Phone className="w-3 h-3" /> Call
                      </a>
                      <a
                        href={`https://wa.me/${customer.phoneNumber.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold text-emerald-800 inline-flex items-center gap-1 transition shadow-2xs"
                      >
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </a>
                      <button
                        onClick={() => copyToClipboard(customer.phoneNumber, 'phone')}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E2EAE1] hover:border-[#2D5A27] text-xs font-medium text-gray-600 inline-flex items-center gap-1 transition shadow-2xs cursor-pointer"
                      >
                        {copiedField === 'phone' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-gray-400" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Timestamps */}
              <div className="p-4 rounded-2xl bg-white border border-[#E2EAE1] text-xs text-gray-600 space-y-2">
                <div className="font-bold text-gray-800 font-quicksand text-sm">
                  Account Activity Details
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-gray-500">Registered On:</span>
                  <span className="font-semibold text-gray-800">{formatDate(customer.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="font-semibold text-gray-800">{formatDate(customer.updatedAt)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-500">Last Order Placed:</span>
                  <span className="font-semibold text-gray-800">
                    {customer.lastOrderDate ? formatDate(customer.lastOrderDate) : 'No orders placed yet'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Addresses */}
          {activeTab === 'addresses' && (
            <div className="space-y-3">
              {(!customer.addresses || customer.addresses.length === 0) ? (
                <div className="text-center py-8 bg-[#F9FBF9] rounded-2xl border border-[#E2EAE1] p-6">
                  <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <div className="font-quicksand font-bold text-gray-800">No Addresses Saved</div>
                  <div className="text-xs text-gray-500 mt-1">This customer has not added any delivery addresses yet.</div>
                </div>
              ) : (
                customer.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-4 rounded-2xl border transition ${addr.isDefault
                        ? 'bg-[#F2F7F2] border-[#80C34A]'
                        : 'bg-white border-[#E2EAE1]'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">
                          {addr.addressType || 'Home'}
                        </span>
                        {addr.isDefault && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#2D5A27] text-white">
                            Default Address
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">#{addr.id}</div>
                    </div>

                    <div className="text-sm font-semibold text-gray-800 space-y-0.5">
                      {addr.buildingName && <div>{addr.buildingName}</div>}
                      {addr.streetName && <div>{addr.streetName}</div>}
                      <div>
                        {addr.city}
                        {addr.state ? `, ${addr.state}` : ''}
                        {addr.pincode ? ` - ${addr.pincode}` : ''}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: Order History */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              {(!customer.recentOrders || customer.recentOrders.length === 0) ? (
                <div className="text-center py-8 bg-[#F9FBF9] rounded-2xl border border-[#E2EAE1] p-6">
                  <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <div className="font-quicksand font-bold text-gray-800">No Orders Placed</div>
                  <div className="text-xs text-gray-500 mt-1">Customer has registered but not placed any orders yet.</div>
                </div>
              ) : (
                customer.recentOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 rounded-2xl bg-white border border-[#E2EAE1] hover:border-[#80C34A] transition shadow-2xs flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#2D5A27] text-xs bg-[#EAF2EA] px-2 py-0.5 rounded-lg">
                          #GFM-{ord.id}
                        </span>
                        {getStatusBadge(ord.status)}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formatDate(ord.createdAt)}</span>
                        <span>•</span>
                        <span>{ord.totalItems} items</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-quicksand font-black text-base text-gray-900">
                        ₹{ord.total.toFixed(2)}
                      </div>
                      <Link
                        href="/shop/orders"
                        onClick={onClose}
                        className="text-[11px] font-bold text-[#2D5A27] hover:underline inline-flex items-center gap-0.5 mt-0.5"
                      >
                        Manage in Orders <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F9FBF9] border-t border-[#E2EAE1] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-quicksand font-bold text-xs sm:text-sm transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
