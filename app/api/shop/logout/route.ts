import { NextResponse, NextRequest } from 'next/server';
import { SHOP_COOKIE_NAME, verifyShopToken } from '@/lib/auth/shop-jwt';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // 1. Get token from cookie or Authorization header
    let token = request.cookies.get(SHOP_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    // 2. If token exists, verify and reset fcmToken to NULL for this shop user
    if (token) {
      try {
        const payload = await verifyShopToken(token);
        if (payload?.id) {
          await query(
            'UPDATE shop_user SET fcmToken = NULL WHERE id = ?',
            [payload.id]
          );
        }
      } catch (err) {
        console.error('Error resetting fcmToken on logout:', err);
      }
    }

    // Also check if body passed fcmToken to nullify specifically
    try {
      const body = await request.json().catch(() => null);
      if (body?.fcmToken) {
        await query(
          'UPDATE shop_user SET fcmToken = NULL WHERE fcmToken = ?',
          [body.fcmToken]
        );
      }
    } catch {
      // Ignore body parsing error if empty
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear shop_token cookie by setting maxAge: 0 and expires: past date
    response.cookies.set(SHOP_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error('Error during shop logout:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
