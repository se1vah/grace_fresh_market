'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  CheckCircle2, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { 
  ORDER_STATUSES, 
  OrderStatusType, 
  STATUS_UI_CONFIG, 
  normalizeOrderStatus, 
  validateStatusTransition,
  isTerminalStatus
} from '@/lib/order-status';
import CancelOrderModal from './CancelOrderModal';

export interface OrderStatusDropdownProps {
  orderId: number;
  currentStatus: string;
  onUpdateStatus: (orderId: number, newStatus: string) => Promise<{ success: boolean; error?: string }>;
}

export default function OrderStatusDropdown({
  orderId,
  currentStatus,
  onUpdateStatus,
}: OrderStatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelModalError, setCancelModalError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Canonical normalized current status
  const normalizedKey = normalizeOrderStatus(currentStatus);
  const activeConfig = STATUS_UI_CONFIG[normalizedKey] || STATUS_UI_CONFIG.ordered;
  const isTerminal = isTerminalStatus(normalizedKey);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto-clear error message after 4 seconds
  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => {
      setErrorMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  const handleSelectStatus = async (targetKey: OrderStatusType) => {
    if (isUpdating) return;

    // Validate transition using single source of truth
    const validation = validateStatusTransition(normalizedKey, targetKey, orderId);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Invalid status transition');
      return;
    }

    // Intercept cancellation to display modern custom confirmation modal
    if (targetKey === 'cancelled') {
      setIsOpen(false);
      setCancelModalError(null);
      setIsCancelModalOpen(true);
      return;
    }

    setIsUpdating(true);
    setIsOpen(false);
    setErrorMessage(null);

    try {
      const res = await onUpdateStatus(orderId, targetKey);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update order status');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error updating order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    setCancelModalError(null);

    try {
      const res = await onUpdateStatus(orderId, 'cancelled');
      if (!res.success) {
        setCancelModalError(res.error || 'Failed to cancel order');
      } else {
        setIsCancelModalOpen(false);
      }
    } catch (err: any) {
      setCancelModalError(err?.message || 'Network error cancelling order');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseCancelModal = () => {
    if (isUpdating) return;
    setIsCancelModalOpen(false);
    setCancelModalError(null);
  };

  return (
    <>
      <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => !isUpdating && setIsOpen((prev) => !prev)}
        disabled={isUpdating}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-quicksand border transition-all cursor-pointer shadow-2xs select-none ${
          activeConfig.badgeClass
        } ${isUpdating ? 'opacity-75 cursor-not-allowed' : ''}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Order #${orderId} status: ${activeConfig.label}. Click to manage status.`}
      >
        {isUpdating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
        ) : (
          <span className={`w-2 h-2 rounded-full ${activeConfig.dotClass}`} />
        )}
        <span>{activeConfig.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Inline Error Toast */}
      {errorMessage && (
        <div className="absolute right-0 mt-1 z-40 max-w-xs bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold rounded-xl p-2.5 shadow-lg flex items-start gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 leading-tight">{errorMessage}</div>
        </div>
      )}

      {/* Dropdown Menu showing ALL statuses */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-1.5 w-52 rounded-2xl bg-white border border-[#E2EAE1] shadow-xl z-30 py-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-150 font-nunito"
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header */}
          <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-quicksand">
              Order Status
            </div>
            {isTerminal && (
              <span className="text-[9px] font-bold uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                Final
              </span>
            )}
          </div>

          <div className="py-1">
            {ORDER_STATUSES.map((key) => {
              const config = STATUS_UI_CONFIG[key];
              const isCurrent = key === normalizedKey;

              // Check transition rules
              const validation = validateStatusTransition(normalizedKey, key, orderId);
              const isAllowed = validation.isValid;
              const isCancelOption = key === 'cancelled';
              const isDisabled = !isAllowed || isCurrent || isUpdating;

              // Divider before 'cancelled' for clean visual grouping
              const isDividerBefore = key === 'cancelled';

              return (
                <React.Fragment key={key}>
                  {isDividerBefore && (
                    <div className="my-1 border-t border-gray-100" />
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={isDisabled}
                    onClick={() => handleSelectStatus(key)}
                    title={
                      isCurrent
                        ? `Order is currently ${config.label}`
                        : isAllowed
                        ? `Update order to ${config.label}`
                        : validation.error || `Transition to ${config.label} is locked`
                    }
                    className={`w-full text-left px-3.5 py-2 text-xs font-quicksand flex items-center justify-between transition-colors ${
                      isCurrent
                        ? 'bg-[#F2F7F2] text-[#2D5A27] font-bold cursor-default'
                        : isAllowed
                        ? isCancelOption
                          ? 'text-rose-600 font-bold hover:bg-rose-50 hover:text-rose-700 cursor-pointer'
                          : 'text-gray-800 font-semibold hover:bg-gray-50 hover:text-gray-900 cursor-pointer'
                        : 'text-gray-400 bg-transparent opacity-40 cursor-not-allowed select-none'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isDisabled && !isCurrent ? 'bg-gray-300' : config.dotClass
                        }`}
                      />
                      <span className="truncate">{config.label}</span>
                    </div>

                    {isCurrent && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" />
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>

    {/* Modern Custom Confirmation Modal for Cancellation */}
    <CancelOrderModal
      isOpen={isCancelModalOpen}
      orderId={orderId}
      currentStatus={currentStatus}
      isCancelling={isUpdating}
      errorMessage={cancelModalError}
      onClose={handleCloseCancelModal}
      onConfirm={handleConfirmCancel}
    />
  </>
  );
}

// Re-export constants for backwards compatibility with any other callers
export { STATUS_UI_CONFIG as STATUS_CONFIG };
