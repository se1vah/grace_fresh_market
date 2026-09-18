import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { signShopToken, SHOP_COOKIE_NAME, getShopCookieOptions } from '@/lib/auth/shop-jwt';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;
    const rawFcmToken = body.fcmToken || body.fcm_token;
    const fcmToken = typeof rawFcmToken === 'string' && rawFcmToken.trim() ? rawFcmToken.trim() : null;

    // 1. Basic validation
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 2. Find user by email in shop_user table
    const users = await query<any[]>(
      'SELECT id, email, password, isSuperAdmin FROM shop_user WHERE email = ?',
      [trimmedEmail]
    );

    if (!users || users.length === 0) {
      // Generic auth error to prevent email enumeration
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = users[0];

    // 3. Compare bcrypt password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 4. Store fcmToken in shop_user table if provided
    if (fcmToken) {
      await query(
        'UPDATE shop_user SET fcmToken = ? WHERE id = ?',
        [fcmToken, user.id]
      );
    }

    // 5. Convert isSuperAdmin column (tinyint/boolean) to boolean
    const isSuperAdmin = Boolean(user.isSuperAdmin);

    // 6. Generate JWT token
    const token = await signShopToken({
      id: user.id,
      email: user.email,
      isSuperAdmin,
    });

    // 6. Return response with HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        isSuperAdmin,
      },
    });

    const cookieOptions = getShopCookieOptions();
    response.cookies.set(SHOP_COOKIE_NAME, token, cookieOptions);

    return response;
  } catch (error) {
    console.error('Error during shop login:', error);
    return NextResponse.json(
      { error: 'An unexpected authentication error occurred' },
      { status: 500 }
    );
  }
}
