'use client';

import React from 'react';
import { 
  AlertTriangle, 
  Loader2, 
  X, 
  Ban, 
  ArrowRight, 
  BellRing,
  AlertOctagon
} from 'lucide-react';
import Modal from '@/components/common/Modal';
import { 
  STATUS_UI_CONFIG, 
  normalizeOrderStatus 
} from '@/lib/order-status';

export interface CancelOrderModalProps {
  isOpen: boolean;
  orderId: number;
  currentStatus: string;
  isCancelling: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CancelOrderModal({
  isOpen,
  orderId,
  currentStatus,
  isCancelling,
  errorMessage,
  onClose,
  onConfirm,
}: CancelOrderModalProps) {
  if (!isOpen) return null;

  const normalized = normalizeOrderStatus(currentStatus);
  const currentConfig = STATUS_UI_CONFIG[normalized] || STATUS_UI_CONFIG.ordered;
  const cancelConfig = STATUS_UI_CONFIG.cancelled;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={isCancelling ? () => {} : onClose} 
      maxWidthClass="max-w-md"
    >
      <div className="p-6 font-nunito">
        {/* Top Header Row with Warning Icon and Close Button */}
        <div className="flex items-start justify-between">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shadow-sm">
              <Ban className="w-6 h-6 stroke-[2.25]" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border-2 border-white"></span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer disabled:opacity-40"
            aria-label="Close cancel confirmation modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Title & Confirmation Heading */}
        <div className="mt-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-quicksand bg-rose-50 text-rose-700 border border-rose-200/60 mb-1.5">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            <span>Order Cancellation</span>
          </div>

          <h3 className="text-xl font-bold font-quicksand text-gray-900 leading-snug">
            Are you sure you want to CANCEL Order{' '}
            <span className="text-rose-600 font-extrabold tracking-tight">#GFM-{orderId}</span>?
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
            This action cannot be undone. The order will be immediately terminated and marked as cancelled.
          </p>
        </div>

        {/* Transition Summary Card */}
        <div className="mt-4 p-3.5 rounded-2xl bg-gray-50/90 border border-[#E2EAE1] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-semibold font-quicksand">Status Change:</span>
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-quicksand ${currentConfig.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${currentConfig.dotClass}`} />
                {currentConfig.label}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-quicksand ${cancelConfig.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cancelConfig.dotClass}`} />
                {cancelConfig.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-200/70 text-[11px] text-gray-600">
            <BellRing className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>The customer will automatically receive an order cancellation notification.</span>
          </div>
        </div>

        {/* Irreversible Caution Note */}
        <div className="mt-3 flex items-start gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-800 leading-tight">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Once cancelled, this order enters a terminal state and cannot be reopened or transitioned to any other status.
          </span>
        </div>

        {/* Error Alert Display */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-tight">{errorMessage}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-quicksand font-bold text-xs sm:text-sm transition disabled:opacity-50 cursor-pointer"
          >
            Keep Order
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isCancelling}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-quicksand font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm hover:shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cancelling Order...</span>
              </>
            ) : (
              <>
                <Ban className="w-4 h-4" />
                <span>Yes, Cancel Order</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
