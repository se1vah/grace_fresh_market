import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifyShopToken, SHOP_COOKIE_NAME } from '@/lib/auth/shop-jwt';
import { getAllOrders } from '@/lib/services/get-all-orders';
import { getShopPendingOrderCount } from '@/lib/services/order';
import { emitSocketEvent } from '@/lib/socket';
import { userPushNotification } from '@/lib/notifications/userPushNotification';

const VALID_STATUSES = ['ordered', 'packed', 'out for delivery', 'delivered', 'cancelled'] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

function getOrderStatusNotification(orderId: number, status: ValidStatus) {
  switch (status) {
    case 'ordered':
      return {
        title: 'Order Confirmed! 🛒',
        body: `Your order #GFM-${orderId} has been received and is being processed.`,
      };
    case 'packed':
      return {
        title: 'Order Packed! 📦',
        body: `Great news! Your fresh produce for order #GFM-${orderId} is packed and ready for delivery.`,
      };
    case 'out for delivery':
      return {
        title: 'Out for Delivery! 🚚',
        body: `Your order #GFM-${orderId} is on its way with our driver!`,
      };
    case 'delivered':
      return {
        title: 'Order Delivered! 🎉',
        body: `Your order #GFM-${orderId} has been successfully delivered. Enjoy your fresh produce!`,
      };
    case 'cancelled':
      return {
        title: 'Order Cancelled ⚠️',
        body: `Your order #GFM-${orderId} has been cancelled. Please contact support if you need assistance.`,
      };
    default:
      return {
        title: 'Order Status Update 📋',
        body: `Your order #GFM-${orderId} status has been updated to "${status}".`,
      };
  }
}

async function authenticateShop(request: NextRequest) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(SHOP_COOKIE_NAME)?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) return null;
  return verifyShopToken(token);
}

/**
 * GET /api/shop/orders
 * Returns all orders in the system for shop management.
 */
export async function GET(request: NextRequest) {
  try {
    const shopUser = await authenticateShop(request);
    if (!shopUser) {
      return NextResponse.json({ error: 'Unauthorized. Shop login required.' }, { status: 401 });
    }

    const orders = await getAllOrders();
    const pendingCount = await getShopPendingOrderCount();

    return NextResponse.json({
      success: true,
      message: 'Orders retrieved successfully',
      data: orders,
      pendingCount,
    });
  } catch (error: unknown) {
    console.error('[GET /api/shop/orders] Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to retrieve orders' }, { status: 500 });
  }
}

/**
 * PATCH /api/shop/orders
 * Updates an order's status, appends to OrderStatus history,
 * and emits the 'notify-order-to-shop' socket event with updated count.
 */
export async function PATCH(request: NextRequest) {
  try {
    const shopUser = await authenticateShop(request);
    if (!shopUser) {
      return NextResponse.json({ error: 'Unauthorized. Shop login required.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body provided.' }, { status: 400 });
    }

    const { orderId, status } = body;
    const parsedOrderId = Number(orderId);

    if (!Number.isInteger(parsedOrderId) || parsedOrderId <= 0) {
      return NextResponse.json({ error: 'A valid positive integer orderId is required.' }, { status: 400 });
    }

    const normalizedStatus = String(status || '').trim().toLowerCase() as ValidStatus;
    if (!VALID_STATUSES.includes(normalizedStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Verify order exists and retrieve userId
    const existingOrders = await query<any[]>('SELECT id, userId FROM `Order` WHERE id = ? LIMIT 1', [parsedOrderId]);
    if (!existingOrders || existingOrders.length === 0) {
      return NextResponse.json({ error: `Order #${parsedOrderId} not found.` }, { status: 404 });
    }

    const targetUserId = existingOrders[0]?.userId;

    // Check latest status of this order to prevent reverting backwards
    const latestStatusRows = await query<any[]>(
      'SELECT status FROM OrderStatus WHERE orderId = ? ORDER BY id DESC LIMIT 1',
      [parsedOrderId]
    );
    const currentStatus = (latestStatusRows?.[0]?.status || 'ordered').toLowerCase().trim();

    if (currentStatus === 'delivered' || currentStatus === 'deliverd' || currentStatus === 'cancelled') {
      return NextResponse.json(
        { error: `Order #${parsedOrderId} is already ${currentStatus} and cannot be modified.` },
        { status: 400 }
      );
    }

    const STATUS_ORDER: Record<string, number> = {
      ordered: 0,
      orderd: 0,
      packed: 1,
      'out for delivery': 2,
      delivered: 3,
      deliverd: 3,
      delivery: 3,
    };

    const currentStep = STATUS_ORDER[currentStatus] ?? -1;
    const targetStep = STATUS_ORDER[normalizedStatus] ?? -1;

    if (currentStep !== -1 && targetStep !== -1 && targetStep < currentStep) {
      return NextResponse.json(
        {
          error: `Cannot revert order #${parsedOrderId} from "${currentStatus}" to previous status "${normalizedStatus}".`,
        },
        { status: 400 }
      );
    }

    // Insert new status entry into OrderStatus table
    await query(
      'INSERT INTO OrderStatus (orderId, status) VALUES (?, ?)',
      [parsedOrderId, normalizedStatus]
    );

    // Compute updated pending orders count
    const updatedCount = await getShopPendingOrderCount();

    // Emit real-time socket event so all open shop admin panels stay synchronized
    try {
      await emitSocketEvent('notify-order-to-shop', {
        orderId: parsedOrderId,
        status: normalizedStatus,
        orderCount: updatedCount,
      });
    } catch (socketErr) {
      console.warn('[PATCH /api/shop/orders] Socket notification warning:', socketErr);
    }

    // Dispatch Web Push Notification to user's registered device(s)
    if (targetUserId) {
      const notif = getOrderStatusNotification(parsedOrderId, normalizedStatus);
      try {
        await userPushNotification({
          userId: targetUserId,
          title: notif.title,
          body: notif.body,
          url: '/orders',
          data: {
            orderId: String(parsedOrderId),
            status: normalizedStatus,
            type: 'order_status_update',
          },
        });
      } catch (pushErr) {
        console.warn('[PATCH /api/shop/orders] User push notification dispatch warning:', pushErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Order #${parsedOrderId} status updated to "${normalizedStatus}".`,
      orderId: parsedOrderId,
      status: normalizedStatus,
      orderCount: updatedCount,
    });
  } catch (error: unknown) {
    console.error('[PATCH /api/shop/orders] Error updating order status:', error);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
