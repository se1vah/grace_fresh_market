'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  Clock, 
  Package, 
  Truck, 
  CheckCircle2, 
  Ban, 
  Loader2 
} from 'lucide-react';

export const STATUS_CONFIG = {
  ordered: {
    label: 'Ordered',
    icon: Clock,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100',
    dotClass: 'bg-amber-500',
  },
  packed: {
    label: 'Packed',
    icon: Package,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100',
    dotClass: 'bg-blue-500',
  },
  'out for delivery': {
    label: 'Out for Delivery',
    icon: Truck,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100',
    dotClass: 'bg-purple-500',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100',
    dotClass: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelled',
    icon: Ban,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100',
    dotClass: 'bg-rose-500',
  },
} as const;

export const STATUS_ORDER: Record<string, number> = {
  ordered: 0,
  orderd: 0,
  packed: 1,
  'out for delivery': 2,
  delivered: 3,
  deliverd: 3,
  delivery: 3,
};

type StatusKey = keyof typeof STATUS_CONFIG;

interface OrderStatusDropdownProps {
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize current status
  const normalizedKey = (currentStatus?.toLowerCase().trim() || 'ordered') as StatusKey;
  const activeConfig = STATUS_CONFIG[normalizedKey] || STATUS_CONFIG.ordered;
  const ActiveIcon = activeConfig.icon;

  // Close dropdown on outside click
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

  const handleSelectStatus = async (statusKey: StatusKey) => {
    const currentStep = STATUS_ORDER[normalizedKey] ?? -1;
    const targetStep = STATUS_ORDER[statusKey] ?? -1;
    const isPrevious = targetStep !== -1 && currentStep !== -1 && targetStep < currentStep;

    if (statusKey === normalizedKey || isPrevious || isUpdating) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    setIsOpen(false);
    try {
      await onUpdateStatus(orderId, statusKey);
    } finally {
      setIsUpdating(false);
    }
  };

  const isTerminalStatus =
    normalizedKey === 'delivered' ||
    (normalizedKey as string) === 'deliverd' ||
    (normalizedKey as string) === 'delivery' ||
    normalizedKey === 'cancelled';

  // If status is delivered or cancelled, hide the dropdown and just show the status in a badge
  if (isTerminalStatus) {
    const isDelivered =
      normalizedKey === 'delivered' ||
      (normalizedKey as string) === 'deliverd' ||
      (normalizedKey as string) === 'delivery';

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-quicksand border shadow-2xs select-none ${
          isDelivered
            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
            : 'bg-rose-50 text-rose-700 border-rose-300'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${activeConfig.dotClass}`} />
        <span>{activeConfig.label}</span>
      </span>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => !isUpdating && setIsOpen((prev) => !prev)}
        disabled={isUpdating}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-quicksand border transition-all cursor-pointer shadow-2xs ${
          activeConfig.badgeClass
        } ${isUpdating ? 'opacity-75 cursor-not-allowed' : ''}`}
        aria-label={`Change status for order #${orderId}. Current status: ${activeConfig.label}`}
      >
        {isUpdating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
        ) : (
          <span className={`w-2 h-2 rounded-full ${activeConfig.dotClass}`} />
        )}
        <span>{activeConfig.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu Options */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 rounded-2xl bg-white border border-[#E2EAE1] shadow-xl z-30 py-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-quicksand border-b border-gray-100 mb-1">
            Update Status
          </div>

          {(Object.keys(STATUS_CONFIG) as StatusKey[]).map((key) => {
            const itemConfig = STATUS_CONFIG[key];
            const isCurrent = key === normalizedKey;
            const currentStep = STATUS_ORDER[normalizedKey] ?? -1;
            const targetStep = STATUS_ORDER[key] ?? -1;
            const isPrevious = targetStep !== -1 && currentStep !== -1 && targetStep < currentStep;
            const isDisabled = isPrevious || isCurrent || isUpdating;

            return (
              <button
                key={key}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelectStatus(key)}
                title={
                  isPrevious
                    ? `Previous status: cannot revert to ${itemConfig.label}`
                    : isCurrent
                    ? `Current status: ${itemConfig.label}`
                    : undefined
                }
                className={`w-full text-left px-3 py-2 text-xs font-bold font-quicksand flex items-center justify-between transition-colors ${
                  isCurrent
                    ? 'bg-[#F2F7F2] text-[#2D5A27] cursor-default'
                    : isPrevious
                    ? 'opacity-40 text-gray-400 bg-gray-50/50 cursor-not-allowed select-none'
                    : 'text-gray-700 hover:bg-[#F9FBF9] hover:text-[#2D5A27] cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isPrevious ? 'bg-gray-300' : itemConfig.dotClass
                    }`}
                  />
                  <span>{itemConfig.label}</span>
                </div>
                {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A27]" />}
                {isPrevious && (
                  <span className="text-[10px] font-semibold text-gray-400 px-1.5 py-0.5 rounded bg-gray-100">
                    Past
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
