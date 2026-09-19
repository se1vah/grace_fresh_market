import { NextResponse, NextRequest } from 'next/server';
import { SHOP_COOKIE_NAME, verifyShopToken } from '@/lib/auth/shop-jwt';
import { sendShopPushNotification } from '@/lib/notifications/shopPush';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate shop user
    let token = request.cookies.get(SHOP_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized. Shop session required.' },
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

    // 2. Parse payload
    const body = await request.json().catch(() => ({}));
    const { title, body: notificationBody, icon, url, shopUserId } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Notification title is required.' },
        { status: 400 }
      );
    }

    if (!notificationBody || typeof notificationBody !== 'string' || !notificationBody.trim()) {
      return NextResponse.json(
        { error: 'Notification body is required.' },
        { status: 400 }
      );
    }

    // 3. Call backend helper function
    const result = await sendShopPushNotification({
      title: title.trim(),
      body: notificationBody.trim(),
      icon: icon || '/logo.png',
      url: url || '/shop',
      shopUserId: shopUserId || undefined,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error('Error in send notification API:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to dispatch push notification.' },
      { status: 500 }
    );
  }
}
