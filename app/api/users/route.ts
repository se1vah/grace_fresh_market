import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { signUserToken, USER_COOKIE_NAME, getUserCookieOptions } from '@/lib/auth/user-jwt';
import { ResultSetHeader } from 'mysql2';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { fullName, email, password } = body;
    const rawPhone = body.phoneNumber || body.phone;
    const rawFcmToken = body.fcmToken || body.fcm_token;
    const fcmToken = typeof rawFcmToken === 'string' && rawFcmToken.trim() ? rawFcmToken.trim() : null;

    // 1. Basic validation
    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return NextResponse.json(
        { error: 'fullName is required.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'email is required.' },
        { status: 400 }
      );
    }

    if (!rawPhone || typeof rawPhone !== 'string' || !rawPhone.trim()) {
      return NextResponse.json(
        { error: 'phoneNumber is required.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
      return NextResponse.json(
        { error: 'password is required.' },
        { status: 400 }
      );
    }

    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = rawPhone.trim();

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address format.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // 2. Check if user already exists
    const existingUsers = await query<any[]>(
      'SELECT id FROM users WHERE email = ?',
      [trimmedEmail]
    );

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists.' },
        { status: 400 }
      );
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Insert user into `users` table
    const insertUserResult = await query<ResultSetHeader>(
      'INSERT INTO users (fullName, email, phoneNumber, password) VALUES (?, ?, ?, ?)',
      [trimmedFullName, trimmedEmail, trimmedPhone, hashedPassword]
    );

    const userId = insertUserResult.insertId;

    // 5. Generate JWT token
    const token = await signUserToken({
      id: userId,
      fullName: trimmedFullName,
      email: trimmedEmail,
      phoneNumber: trimmedPhone,
    });

    // 6. Store JWT token and fcmToken in `UserLogin` table
    await query<ResultSetHeader>(
      'INSERT INTO userLogin (user_id, token, fcmToken) VALUES (?, ?, ?)',
      [userId, token, fcmToken]
    );

    // 7. Prepare response with token and cookie
    const response = NextResponse.json(
      {
        success: true,
        message: 'User created successfully',
        user: {
          id: userId,
          fullName: trimmedFullName,
          email: trimmedEmail,
          phoneNumber: trimmedPhone,
        },
        token,
      },
      { status: 201 }
    );

    const cookieOptions = getUserCookieOptions();
    response.cookies.set(USER_COOKIE_NAME, token, cookieOptions);

    return response;
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating user.' },
      { status: 500 }
    );
  }
}

// GET /api/users - Get all user details
export { GET } from './get-all/route';

// PUT /api/users - Update user details / profile
export { PUT } from './profile/route';
