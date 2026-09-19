import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { signUserToken, USER_COOKIE_NAME, getUserCookieOptions } from '@/lib/auth/user-jwt';
import { ResultSetHeader } from 'mysql2';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;
    const rawFcmToken = body.fcmToken || body.fcm_token;
    const fcmToken = typeof rawFcmToken === 'string' && rawFcmToken.trim() ? rawFcmToken.trim() : null;

    // 1. Basic validation
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
      return NextResponse.json(
        { error: 'Password is required.' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 2. Fetch user from `users` table
    const users = await query<any[]>(
      'SELECT id, fullName, email, phoneNumber, password FROM users WHERE email = ?',
      [trimmedEmail]
    ).catch(async () => {
      // Fallback in case table still has column named phone
      return await query<any[]>(
        'SELECT id, fullName, email, phone AS phoneNumber, password FROM users WHERE email = ?',
        [trimmedEmail]
      );
    });

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const user = users[0];

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // 4. Generate JWT token
    const userPhone = user.phoneNumber || user.phone || '';
    const token = await signUserToken({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: userPhone,
    });

    // 5. Store JWT token and fcmToken in `userLogin` table
    await query<ResultSetHeader>(
      'INSERT INTO userLogin (user_id, token, fcmToken) VALUES (?, ?, ?)',
      [user.id, token, fcmToken]
    );

    // 6. Return response with token and cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: userPhone,
      },
      token,
    });

    const cookieOptions = getUserCookieOptions();
    response.cookies.set(USER_COOKIE_NAME, token, cookieOptions);

    return response;
  } catch (error) {
    console.error('Error during user login:', error);
    return NextResponse.json(
      { error: 'An unexpected authentication error occurred.' },
      { status: 500 }
    );
  }
}
