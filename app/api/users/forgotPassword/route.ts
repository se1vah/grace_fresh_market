import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { sendEmail } from '@/lib/email/email';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    // 1. Validate email input
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        {
          status: false,
          success: false,
          error: 'Email is required.',
          message: 'Email is required.',
        },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        {
          status: false,
          success: false,
          error: 'Invalid email address format.',
          message: 'Invalid email address format.',
        },
        { status: 400 }
      );
    }

    // 2. Find user by email
    const users = await query<any[]>(
      'SELECT id, fullName, email FROM users WHERE LOWER(email) = ?',
      [trimmedEmail]
    );

    if (!users || users.length === 0) {
      return NextResponse.json(
        {
          status: false,
          success: false,
          error: 'User with this email does not exist.',
          message: 'User with this email does not exist.',
        },
        { status: 404 }
      );
    }

    const user = users[0];

    // 3. Generate random 4-digit numeric confirmation code
    const confirmationCode = crypto.randomInt(1000, 10000).toString();

    // 4. Store generated confirmation code in users table
    await query(
      'UPDATE users SET confirmationCode = ? WHERE id = ?',
      [confirmationCode, user.id]
    );

    // 5. Send confirmation email using existing sendEmail service
    try {
      await sendEmail({
        to: trimmedEmail,
        type: 'forgotPassword',
        content: {
          confirmationCode,
          otp: confirmationCode,
          fullName: user.fullName || 'Valued Customer',
        },
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      return NextResponse.json(
        {
          status: false,
          success: false,
          error: 'Failed to send confirmation email. Please try again later.',
          message: 'Failed to send confirmation email. Please try again later.',
        },
        { status: 500 }
      );
    }

    // 6. Return generic success response without exposing confirmation code
    return NextResponse.json(
      {
        status: true,
        success: true,
        message: 'Confirmation code sent to your email successfully.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in forgotPassword API:', error);
    return NextResponse.json(
      {
        status: false,
        success: false,
        error: 'An unexpected error occurred while processing forgot password request.',
        message: 'An unexpected error occurred while processing forgot password request.',
      },
      { status: 500 }
    );
  }
}
