import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawCode =
      body.confirmationCode !== undefined
        ? body.confirmationCode
        : body.code !== undefined
        ? body.code
        : body.otp;

    const { newPassword, confirmPassword, email } = body;

    // 1. Validate confirmation code exists
    if (rawCode === undefined || rawCode === null || String(rawCode).trim() === '') {
      return NextResponse.json(
        {
          status: false,
          success: false,
          error: 'Confirmation code is required.',
          message: 'Confirmation code is required.',
        },
        { status: 400 }
      );
    }

    // 2. Validate confirmation code contains exactly 4 digits
    const confirmationCode = String(rawCode).trim();
    if (!/^\d{4}$/.test(confirmationCode)) {
      return NextResponse.json(
        {
          status: false,
          success: false,
          error: 'Confirmation code must contain exactly 4 digits.',
          message: 'Confirmation code must contain exactly 4 digits.',
        },
        { status: 400 }
      );
    }

    // Determine mode: Mode 1 (Validation only) vs Mode 2 (Confirm code + Reset password)
    const isResetMode = newPassword !== undefined || confirmPassword !== undefined;

    // In Mode 2, validate newPassword and confirmPassword
    if (isResetMode) {
      if (
        newPassword === undefined ||
        newPassword === null ||
        typeof newPassword !== 'string' ||
        !newPassword.trim()
      ) {
        return NextResponse.json(
          {
            status: false,
            success: false,
            error: 'newPassword is required.',
            message: 'newPassword is required.',
          },
          { status: 400 }
        );
      }

      if (
        confirmPassword === undefined ||
        confirmPassword === null ||
        typeof confirmPassword !== 'string' ||
        !confirmPassword.trim()
      ) {
        return NextResponse.json(
          {
            status: false,
            success: false,
            error: 'confirmPassword is required.',
            message: 'confirmPassword is required.',
          },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          {
            status: false,
            success: false,
            error: 'Password must be at least 6 characters long.',
            message: 'Password must be at least 6 characters long.',
          },
          { status: 400 }
        );
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          {
            status: false,
            success: false,
            error: 'newPassword and confirmPassword must match.',
            message: 'newPassword and confirmPassword must match.',
          },
          { status: 400 }
        );
      }
    }

    // 3. User lookup by confirmationCode (and optional email)
    const queryParams: any[] = [confirmationCode];
    let sql =
      'SELECT id, fullName, email, confirmationCode FROM users WHERE confirmationCode = ? AND confirmationCode IS NOT NULL';

    if (email && typeof email === 'string' && email.trim()) {
      sql += ' AND LOWER(email) = ?';
      queryParams.push(email.trim().toLowerCase());
    }

    const users = await query<any[]>(sql, queryParams);

    if (!users || users.length === 0) {
      return NextResponse.json(
        {
          status: false,
          success: false,
          error: 'Invalid or expired confirmation code.',
          message: 'Invalid or expired confirmation code.',
        },
        { status: 400 }
      );
    }

    const user = users[0];

    // MODE 1: Confirmation Code Validation Only
    if (!isResetMode) {
      return NextResponse.json(
        {
          status: true,
          success: true,
          message: 'Confirmation code verified successfully',
        },
        { status: 200 }
      );
    }

    // MODE 2: Confirm Code + Reset Password
    // Hash new password using bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and set confirmationCode = NULL
    await query(
      'UPDATE users SET password = ?, confirmationCode = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    return NextResponse.json(
      {
        status: true,
        success: true,
        message: 'Password reset successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in confirmForgotPassword API:', error);
    return NextResponse.json(
      {
        status: false,
        success: false,
        error: 'An unexpected error occurred while confirming forgot password.',
        message: 'An unexpected error occurred while confirming forgot password.',
      },
      { status: 500 }
    );
  }
}
