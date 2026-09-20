import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyShopToken, SHOP_COOKIE_NAME } from '@/lib/auth/shop-jwt';
import { getShopPendingOrderCount } from '@/lib/services/order';

async function authenticateShop(request: NextRequest) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(SHOP_COOKIE_NAME)?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) return null;
  return verifyShopToken(token);
}

/**
 * GET /api/shop/orders/count
 * Returns the current pending orders count (status: 'ordered') for the shop sideMenu badge.
 */
export async function GET(request: NextRequest) {
  try {
    const shopUser = await authenticateShop(request);
    if (!shopUser) {
      return NextResponse.json({ error: 'Unauthorized. Shop login required.' }, { status: 401 });
    }

    const orderCount = await getShopPendingOrderCount();

    return NextResponse.json({
      success: true,
      orderCount,
    });
  } catch (error: unknown) {
    console.error('[GET /api/shop/orders/count] Error fetching order count:', error);
    return NextResponse.json({ error: 'Failed to fetch pending order count' }, { status: 500 });
  }
}
