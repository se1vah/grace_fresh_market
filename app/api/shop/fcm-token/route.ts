import { NextResponse, NextRequest } from 'next/server';
import { SHOP_COOKIE_NAME, verifyShopToken } from '@/lib/auth/shop-jwt';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate shop user from cookie or Authorization header
    let token = request.cookies.get(SHOP_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized. Shop user session required.' },
        { status: 401 }
      );
    }

    const payload = await verifyShopToken(token);
    if (!payload?.id) {
      return NextResponse.json(
        { error: 'Invalid or expired session token.' },
        { status: 401 }
      );
    }

    // 2. Read fcmToken from body
    const body = await request.json().catch(() => ({}));
    const rawFcmToken = body.fcmToken || body.fcm_token;
    const fcmToken = typeof rawFcmToken === 'string' && rawFcmToken.trim() ? rawFcmToken.trim() : null;

    if (!fcmToken) {
      return NextResponse.json(
        { error: 'fcmToken is required.' },
        { status: 400 }
      );
    }

    // 3. Update shop_user table
    await query(
      'UPDATE shop_user SET fcmToken = ? WHERE id = ?',
      [fcmToken, payload.id]
    );

    return NextResponse.json({
      success: true,
      message: 'FCM token updated successfully for shop user',
    });
  } catch (error) {
    console.error('Error updating shop FCM token:', error);
    return NextResponse.json(
      { error: 'Failed to update FCM token' },
      { status: 500 }
    );
  }
}
