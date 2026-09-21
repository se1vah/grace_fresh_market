import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { USER_COOKIE_NAME } from '@/lib/auth/user-jwt';
import { getUserIdFromRequest } from '@/lib/auth/user-jwt';

export async function POST(request: NextRequest) {
  try {
    // 1. Get token from cookie or Authorization header
    let token = request.cookies.get(USER_COOKIE_NAME)?.value;
    const authenticatedUserId = await getUserIdFromRequest(request);

    if (authenticatedUserId) {
      await query(
        'UPDATE userLogin SET fcmToken = "expired" WHERE user_id = ?',
        [authenticatedUserId]
      );
    }

    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    // 2. If token exists, remove it from `userLogin` table
    if (token) {
      await query(
        'DELETE FROM userLogin WHERE token = ?',
        [token]
      );
    }

    // 3. Clear `user_token` cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    response.cookies.set(USER_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error('Error during user logout:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during logout.' },
      { status: 500 }
    );
  }
}
