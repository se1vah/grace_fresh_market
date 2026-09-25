import { 
  Clock, 
  Package, 
  Truck,
  CheckCircle2, 
  Ban,
  LucideIcon 
} from 'lucide-react';

/**
 * Standard Order Statuses in Grace Fresh Market
 */
export const ORDER_STATUSES = [
  'ordered',
  'packed',
  'out for delivery',
  'delivered',
  'cancelled',
] as const;

export type OrderStatusType = (typeof ORDER_STATUSES)[number];

/**
 * Normal Sequential Flow:
 * ordered -> packed -> out for delivery -> delivered
 */
export const NORMAL_STATUS_FLOW: readonly OrderStatusType[] = [
  'ordered',
  'packed',
  'out for delivery',
  'delivered',
] as const;

/**
 * Strict Allowed Transitions Map:
 * - ordered: packed, cancelled
 * - packed: out for delivery, cancelled
 * - out for delivery: delivered, cancelled
 * - delivered: none (terminal)
 * - cancelled: none (terminal)
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatusType, readonly OrderStatusType[]> = {
  ordered: ['packed', 'cancelled'],
  packed: ['out for delivery', 'cancelled'],
  'out for delivery': ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

/**
 * Normalizes any raw status string (including legacy variants, underscores, or typos)
 * into a canonical OrderStatusType.
 */
export function normalizeOrderStatus(rawStatus?: string | null): OrderStatusType {
  const s = String(rawStatus || '').toLowerCase().trim();
  if (s === 'orderd') return 'ordered';
  if (s === 'out_for_delivery') return 'out for delivery';
  if (s === 'deliverd' || s === 'delivery') return 'delivered';
  if (s === 'canceled') return 'cancelled';

  if (ORDER_STATUSES.includes(s as OrderStatusType)) {
    return s as OrderStatusType;
  }

  return 'ordered';
}

/**
 * Returns the immediate next normal workflow status, or null if terminal.
 */
export function getNextNormalStatus(current: OrderStatusType): OrderStatusType | null {
  const index = NORMAL_STATUS_FLOW.indexOf(current);
  if (index !== -1 && index < NORMAL_STATUS_FLOW.length - 1) {
    return NORMAL_STATUS_FLOW[index + 1];
  }
  return null;
}

/**
 * Checks whether a given status is terminal (no further transitions permitted).
 */
export function isTerminalStatus(status: string | null | undefined): boolean {
  const normalized = normalizeOrderStatus(status);
  return normalized === 'delivered' || normalized === 'cancelled';
}

/**
 * Checks if transitioning from current to target is allowed.
 */
export function isTransitionAllowed(
  current: string | null | undefined,
  target: string | null | undefined
): boolean {
  const normCurrent = normalizeOrderStatus(current);
  const normTarget = normalizeOrderStatus(target);
  const allowed = ALLOWED_STATUS_TRANSITIONS[normCurrent] || [];
  return allowed.includes(normTarget);
}

export interface StatusTransitionValidation {
  isValid: boolean;
  error?: string;
  currentStatus: OrderStatusType;
  targetStatus: OrderStatusType;
  nextAllowedStatus: OrderStatusType | null;
  allowedTransitions: readonly OrderStatusType[];
}

/**
 * Validates an order status transition server-side and client-side.
 * Enforces:
 * 1. Step-by-step sequential progression: ordered -> packed -> out for delivery -> delivered
 * 2. No skipping statuses (e.g. ordered -> out for delivery is rejected)
 * 3. No reverting to previous statuses (e.g. packed -> ordered is rejected)
 * 4. cancelled allowed from any non-final normal status (ordered, packed, out for delivery)
 * 5. delivered and cancelled orders are final and cannot be modified.
 */
export function validateStatusTransition(
  rawCurrent: string | null | undefined,
  rawTarget: string | null | undefined,
  orderId?: number | string
): StatusTransitionValidation {
  const current = normalizeOrderStatus(rawCurrent);
  const target = normalizeOrderStatus(rawTarget);
  const orderPrefix = orderId ? `Order #${orderId}` : 'Order';
  const allowed = ALLOWED_STATUS_TRANSITIONS[current] || [];
  const nextNormal = getNextNormalStatus(current);

  // Terminal check 1: Delivered
  if (current === 'delivered') {
    return {
      isValid: false,
      error: `${orderPrefix} is already delivered and cannot be modified.`,
      currentStatus: current,
      targetStatus: target,
      nextAllowedStatus: null,
      allowedTransitions: allowed,
    };
  }

  // Terminal check 2: Cancelled
  if (current === 'cancelled') {
    return {
      isValid: false,
      error: `${orderPrefix} has been cancelled and cannot be modified.`,
      currentStatus: current,
      targetStatus: target,
      nextAllowedStatus: null,
      allowedTransitions: allowed,
    };
  }

  // No-op check: Target is current status
  if (target === current) {
    return {
      isValid: false,
      error: `${orderPrefix} is already in "${STATUS_UI_CONFIG[current].label}" status.`,
      currentStatus: current,
      targetStatus: target,
      nextAllowedStatus: nextNormal,
      allowedTransitions: allowed,
    };
  }

  // Cancellation transition from valid non-terminal status
  if (target === 'cancelled') {
    return {
      isValid: true,
      currentStatus: current,
      targetStatus: target,
      nextAllowedStatus: nextNormal,
      allowedTransitions: allowed,
    };
  }

  // Check valid forward step
  if (allowed.includes(target)) {
    return {
      isValid: true,
      currentStatus: current,
      targetStatus: target,
      nextAllowedStatus: nextNormal,
      allowedTransitions: allowed,
    };
  }

  // Generate clear descriptive rejection messages
  const currentIndex = NORMAL_STATUS_FLOW.indexOf(current);
  const targetIndex = NORMAL_STATUS_FLOW.indexOf(target);

  if (currentIndex !== -1 && targetIndex !== -1) {
    if (targetIndex < currentIndex) {
      return {
        isValid: false,
        error: `Cannot revert ${orderPrefix.toLowerCase()} from "${STATUS_UI_CONFIG[current].label}" to previous status "${STATUS_UI_CONFIG[target].label}". Order progression must be sequential.`,
        currentStatus: current,
        targetStatus: target,
        nextAllowedStatus: nextNormal,
        allowedTransitions: allowed,
      };
    }

    if (targetIndex > currentIndex + 1) {
      const expectedLabel = nextNormal ? STATUS_UI_CONFIG[nextNormal].label : 'None';
      return {
        isValid: false,
        error: `Cannot skip status from "${STATUS_UI_CONFIG[current].label}" to "${STATUS_UI_CONFIG[target].label}". Next valid status must be "${expectedLabel}".`,
        currentStatus: current,
        targetStatus: target,
        nextAllowedStatus: nextNormal,
        allowedTransitions: allowed,
      };
    }
  }

  return {
    isValid: false,
    error: `Invalid status transition from "${STATUS_UI_CONFIG[current].label}" to "${STATUS_UI_CONFIG[target].label}".`,
    currentStatus: current,
    targetStatus: target,
    nextAllowedStatus: nextNormal,
    allowedTransitions: allowed,
  };
}

export interface StatusUIConfig {
  key: OrderStatusType;
  label: string;
  icon: LucideIcon;
  badgeClass: string;
  dotClass: string;
  pillBg: string;
  pillText: string;
  borderClass: string;
  description: string;
}

export const STATUS_UI_CONFIG: Record<OrderStatusType, StatusUIConfig> = {
  ordered: {
    key: 'ordered',
    label: 'Ordered',
    icon: Clock,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100',
    dotClass: 'bg-amber-500',
    pillBg: 'bg-amber-100',
    pillText: 'text-amber-800',
    borderClass: 'border-amber-200',
    description: 'New order received from customer',
  },
  packed: {
    key: 'packed',
    label: 'Packed',
    icon: Package,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100',
    dotClass: 'bg-blue-500',
    pillBg: 'bg-blue-100',
    pillText: 'text-blue-800',
    borderClass: 'border-blue-200',
    description: 'Items packed and prepared for delivery',
  },
  'out for delivery': {
    key: 'out for delivery',
    label: 'Out for Delivery',
    icon: Truck,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100',
    dotClass: 'bg-purple-500',
    pillBg: 'bg-purple-100',
    pillText: 'text-purple-800',
    borderClass: 'border-purple-200',
    description: 'Order en route with delivery partner',
  },
  delivered: {
    key: 'delivered',
    label: 'Delivered',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100',
    dotClass: 'bg-emerald-500',
    pillBg: 'bg-emerald-100',
    pillText: 'text-emerald-800',
    borderClass: 'border-emerald-200',
    description: 'Order successfully delivered to customer',
  },
  cancelled: {
    key: 'cancelled',
    label: 'Cancelled',
    icon: Ban,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100',
    dotClass: 'bg-rose-500',
    pillBg: 'bg-rose-100',
    pillText: 'text-rose-800',
    borderClass: 'border-rose-200',
    description: 'Order cancelled',
  },
};
