import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyShopToken, SHOP_COOKIE_NAME } from '@/lib/auth/shop-jwt';
import { getOrderById } from '@/lib/services/get-all-orders';
import { parseOrderId } from '@/app/api/users/orders/[id]/route';

async function authenticateShop(request: NextRequest) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(SHOP_COOKIE_NAME)?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) return null;
  return verifyShopToken(token);
}

/**
 * GET /api/shop/orders/[id]
 * Retrieves full order details for shop admin management.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const shopUser = await authenticateShop(request);
    if (!shopUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Shop login required.' },
        { status: 401 }
      );
    }

    const { id: rawParamId } = await params;
    const orderId = parseOrderId(rawParamId);

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid order ID. Must be a positive integer or formatted as #GFM-123.',
        },
        { status: 400 }
      );
    }

    const { searchParams } = request.nextUrl;
    const rawNotificationId =
      searchParams.get('notificationId') ||
      searchParams.get('notification_id');

    const order = await getOrderById(orderId, {
      notificationId: rawNotificationId,
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: `Order #${orderId} not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order retrieved successfully',
      data: order,
    });
  } catch (error: unknown) {
    console.error('[GET /api/shop/orders/[id]] Error fetching order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve order' },
      { status: 500 }
    );
  }
}
