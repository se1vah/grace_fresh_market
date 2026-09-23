import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth/user-jwt';
import { verifyShopToken, SHOP_COOKIE_NAME } from '@/lib/auth/shop-jwt';
import { getOrderById } from '@/lib/services/get-all-orders';

/**
 * Parses numeric ID or formatted ID like #GFM-123 / GFM-123
 */
export function parseOrderId(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/^#?GFM-/i, '').trim();
  const parsed = Number(cleaned);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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
 * GET /api/users/orders/[id] (and /api/user/orders/[id])
 * Retrieves a single order by ID with all line items, status history,
 * delivery address snapshot, and payment method details.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // 1. Check if requester is authenticated as a shop admin
    const shopUser = await authenticateShop(request);
    const isShopAdmin = !!shopUser;

    // 2. If not shop admin, enforce user authentication & identity checks
    let userId: number | null = null;
    if (!isShopAdmin) {
      const { searchParams } = request.nextUrl;
      const rawUserId = searchParams.get('userId') || searchParams.get('user_id');

      if (rawUserId !== null && rawUserId !== '') {
        const parsed = Number(rawUserId);
        if (isNaN(parsed) || parsed < 1) {
          return NextResponse.json({ success: false, error: 'Invalid userId.' }, { status: 400 });
        }
      }

      const jwtUserId = await getUserIdFromRequest(request);
      if (jwtUserId && rawUserId) {
        const requestedUserId = Number(rawUserId);
        if (!isNaN(requestedUserId) && requestedUserId > 0 && requestedUserId !== jwtUserId) {
          return NextResponse.json(
            { success: false, error: "You are not authorized to access another user's orders." },
            { status: 403 }
          );
        }
      }

      userId = await getUserIdFromRequest(request, rawUserId);

      if (!userId) {
        return NextResponse.json(
          {
            success: false,
            error: 'User identification required. Please log in or provide a valid user ID.',
          },
          { status: 401 }
        );
      }

      // Verify user exists in database
      const userRows = await query<{ id: number }[]>(
        'SELECT id FROM users WHERE id = ?',
        [userId]
      );

      if (!userRows || userRows.length === 0) {
        return NextResponse.json({ success: false, error: 'User profile not found.' }, { status: 404 });
      }
    }

    // 3. Fetch full order by ID
    const order = await getOrderById(orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, error: `Order #${orderId} not found.` },
        { status: 404 }
      );
    }

    // 4. Verify order ownership for user requests
    if (!isShopAdmin && userId && order.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to access this order.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order retrieved successfully',
      data: order,
    });
  } catch (error: unknown) {
    console.error('[GET /api/users/orders/[id]] Error fetching order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve order' },
      { status: 500 }
    );
  }
}
