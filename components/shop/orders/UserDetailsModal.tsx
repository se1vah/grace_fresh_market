'use client';

import React from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  X, 
  Shield, 
  ExternalLink,
  ShoppingBag
} from 'lucide-react';
import Modal from '@/components/common/Modal';
import type { UserOrder } from '@/lib/services/get-all-orders';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: UserOrder | null;
}

export default function UserDetailsModal({ isOpen, onClose, order }: UserDetailsModalProps) {
  if (!order) return null;

  const user = order.user;
  const address = order.address;

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-xl">
      <div className="bg-white rounded-2xl overflow-hidden font-nunito">
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-[#1E3F1B] via-[#2D5A27] to-[#3a7333] px-6 py-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            {/* User Profile Photo */}
            <div className="relative shrink-0">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.fullName || 'User profile'}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-white/80 shadow-md bg-white"
                  onError={(e) => {
                    // Fallback to stylized initials if image fails to load
                    (e.target as HTMLElement).style.display = 'none';
                    const fallback = (e.target as HTMLElement).nextElementSibling;
                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                  }}
                />
              ) : null}

              <div
                className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-[#80C34A] to-emerald-600 text-white flex items-center justify-center text-2xl font-bold font-quicksand border-2 border-white/80 shadow-md ${
                  user?.profileImage ? 'hidden' : 'flex'
                }`}
              >
                {getInitials(user?.fullName)}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 text-[#80C34A] text-xs font-bold font-quicksand backdrop-blur-md mb-1 border border-white/10">
                <Shield className="w-3 h-3" />
                <span>Customer #{order.userId}</span>
              </div>
              <h3 className="text-xl font-bold font-quicksand text-white truncate leading-tight">
                {user?.fullName || 'Registered Customer'}
              </h3>
              <p className="text-xs text-[#D1E6CE] mt-0.5 truncate">
                {user?.email || 'No email provided'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Customer Details Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-quicksand mb-3">
              Customer Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Full Name */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F9FBF9] border border-[#E2EAE1]">
                <div className="p-2 rounded-lg bg-[#EAF2EA] text-[#2D5A27] shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase">Full Name</div>
                  <div className="text-sm font-bold text-gray-900 truncate">
                    {user?.fullName || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F9FBF9] border border-[#E2EAE1]">
                <div className="p-2 rounded-lg bg-[#EAF2EA] text-[#2D5A27] shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase">Email Address</div>
                  {user?.email ? (
                    <a
                      href={`mailto:${user.email}`}
                      className="text-sm font-bold text-[#2D5A27] hover:underline truncate block"
                    >
                      {user.email}
                    </a>
                  ) : (
                    <div className="text-sm font-bold text-gray-500">N/A</div>
                  )}
                </div>
              </div>

              {/* Phone Number */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F9FBF9] border border-[#E2EAE1]">
                <div className="p-2 rounded-lg bg-[#EAF2EA] text-[#2D5A27] shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase">Phone Number</div>
                  {user?.phoneNumber ? (
                    <a
                      href={`tel:${user.phoneNumber}`}
                      className="text-sm font-bold text-[#2D5A27] hover:underline truncate block"
                    >
                      {user.phoneNumber}
                    </a>
                  ) : (
                    <div className="text-sm font-bold text-gray-500">Not provided</div>
                  )}
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F9FBF9] border border-[#E2EAE1]">
                <div className="p-2 rounded-lg bg-[#EAF2EA] text-[#2D5A27] shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase">Registered Date</div>
                  <div className="text-sm font-bold text-gray-900 truncate">
                    {formatDate(user?.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Address Section */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-quicksand mb-3">
              Delivery Address (Order #{order.id})
            </h4>

            {address ? (
              <div className="p-4 rounded-xl bg-[#F9FBF9] border border-[#E2EAE1] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#2D5A27]">
                    <MapPin className="w-4 h-4" />
                    <span>Destination Location</span>
                  </div>
                  {address.address_type && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-[#EAF2EA] text-[#2D5A27] border border-[#C5DDC4]">
                      {address.address_type}
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-700 leading-relaxed pt-1">
                  <p className="font-semibold text-gray-900">
                    {address.building_name || 'Building / House name not specified'}
                  </p>
                  <p className="text-gray-600">
                    {address.street_name || ''}
                  </p>
                  <p className="text-gray-600">
                    {[address.city, address.state].filter(Boolean).join(', ')}{' '}
                    {address.pincode ? `- ${address.pincode}` : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500 text-center">
                No delivery address associated with this order.
              </div>
            )}
          </div>

          {/* Associated Order Snapshot */}
          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-emerald-950 font-medium">
              <ShoppingBag className="w-4 h-4 text-[#2D5A27]" />
              <span>Current Order Total:</span>
              <strong className="text-sm font-bold text-[#2D5A27]">₹{order.total.toFixed(2)}</strong>
            </div>
            <div className="text-xs font-bold text-gray-500">
              {order.items.length} items
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-[#E2EAE1] flex justify-end">
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
