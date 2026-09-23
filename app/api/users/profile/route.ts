import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth/user-jwt';
import { uploadFile, deleteFile } from '@/lib/blob';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Helper to format user profile response object
function formatUserProfile(row: any) {
  return {
    id: row.id,
    fullName: row.fullName || '',
    email: row.email || '',
    phoneNumber: row.phoneNumber || '',
    profileImage: row.profileImage || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/users/profile (or /api/user/profile)
 * Retrieves user profile details.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const rawUserId = searchParams.get('userId') || searchParams.get('user_id') || searchParams.get('id');

    const userId = await getUserIdFromRequest(request, rawUserId);

    if (!userId) {
      return NextResponse.json(
        { error: 'User identification required. Please log in or provide a valid user ID.' },
        { status: 401 }
      );
    }

    const rows = await query<any[]>(
      'SELECT id, fullName, email, phoneNumber, profileImage, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'User profile not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User profile retrieved successfully',
      user: formatUserProfile(rows[0]),
    });
  } catch (error: any) {
    console.error('Error retrieving user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve user profile' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/profile (or /api/user/profile or /api/user/profile/upload)
 * Uploads user profile photo and updates profile information.
 * Automatically deletes the old profile photo from server disk if updated.
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let bodyData: any = {};
    let imageFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      bodyData = {
        userId: formData.get('userId') || formData.get('user_id'),
        fullName: formData.get('fullName') || formData.get('full_name'),
        phoneNumber: formData.get('phoneNumber') || formData.get('phone_number'),
        email: formData.get('email'),
      };

      const fileInput = formData.get('profileImage') || formData.get('profile_image') || formData.get('image') || formData.get('photo') || formData.get('file');
      if (fileInput && fileInput instanceof File) {
        imageFile = fileInput;
      }
    } else {
      bodyData = await request.json().catch(() => ({}));
    }

    const rawUserId = bodyData.userId || bodyData.user_id;
    const userId = await getUserIdFromRequest(request, rawUserId);

    if (!userId) {
      return NextResponse.json(
        { error: 'User identification required. Please log in or provide a valid user ID.' },
        { status: 401 }
      );
    }

    // Verify existing user
    const existingRows = await query<any[]>(
      'SELECT id, fullName, email, phoneNumber, profileImage FROM users WHERE id = ?',
      [userId]
    );

    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { error: 'User record not found.' },
        { status: 404 }
      );
    }

    const existingUser = existingRows[0];

    // Determine updated field values
    const fullName = bodyData.fullName !== undefined && bodyData.fullName !== null
      ? bodyData.fullName.toString().trim()
      : existingUser.fullName;

    const phoneNumber = bodyData.phoneNumber !== undefined && bodyData.phoneNumber !== null
      ? bodyData.phoneNumber.toString().trim()
      : existingUser.phoneNumber;

    let newPublicImagePath = existingUser.profileImage || '';

    // Handle Profile Photo Upload if a new file was provided
    if (imageFile) {
      if (!ALLOWED_MIME_TYPES.includes(imageFile.type)) {
        return NextResponse.json(
          { error: 'Invalid image format. Allowed formats: JPG, JPEG, PNG, WEBP' },
          { status: 400 }
        );
      }

      if (imageFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'Image size exceeds 5MB limit' },
          { status: 400 }
        );
      }

      // Determine file extension
      let ext = 'jpg';
      if (imageFile.type.includes('png')) ext = 'png';
      else if (imageFile.type.includes('webp')) ext = 'webp';
      else if (imageFile.type.includes('jpeg') || imageFile.type.includes('jpg')) ext = 'jpg';

      const filename = `user-${userId}-${Date.now()}.${ext}`;

      // Upload to Vercel Blob inside "profile" folder
      const blob = await uploadFile(imageFile, filename, { folder: 'profile' });
      newPublicImagePath = blob.url;

      // Delete old profile photo if it exists (handles Vercel Blob and legacy local files)
      const oldProfileImage = existingUser.profileImage;
      if (oldProfileImage && oldProfileImage !== newPublicImagePath) {
        await deleteFile(oldProfileImage);
      }
    }

    // Update database record
    await query(
      'UPDATE users SET fullName = ?, phoneNumber = ?, profileImage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [fullName, phoneNumber, newPublicImagePath, userId]
    );

    // Retrieve updated user profile
    const updatedRows = await query<any[]>(
      'SELECT id, fullName, email, phoneNumber, profileImage, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    return NextResponse.json({
      success: true,
      message: 'User profile updated successfully',
      user: formatUserProfile(updatedRows[0]),
    });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user profile' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/profile (or /api/user/profile or /api/user/update)
 * Updates user profile details (fullName, email, phoneNumber, password).
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawUserId = body.userId || body.user_id || body.id;

    const userId = await getUserIdFromRequest(request, rawUserId);

    if (!userId) {
      return NextResponse.json(
        { error: 'User identification required. Please log in or provide a valid user ID.' },
        { status: 401 }
      );
    }

    // 1. Fetch existing user record from database
    const existingRows = await query<any[]>(
      'SELECT id, fullName, email, phoneNumber, password, profileImage, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { error: 'User record not found.' },
        { status: 404 }
      );
    }

    const existingUser = existingRows[0];

    const updates: string[] = [];
    const queryParams: any[] = [];

    // 2. Validate & process fullName
    if (body.fullName !== undefined || body.full_name !== undefined) {
      const nameVal = body.fullName !== undefined ? body.fullName : body.full_name;
      if (typeof nameVal !== 'string' || !nameVal.trim()) {
        return NextResponse.json(
          { error: 'fullName cannot be empty.' },
          { status: 400 }
        );
      }
      updates.push('fullName = ?');
      queryParams.push(nameVal.trim());
    }

    // 3. Validate & process email
    if (body.email !== undefined) {
      if (typeof body.email !== 'string' || !body.email.trim()) {
        return NextResponse.json(
          { error: 'email cannot be empty.' },
          { status: 400 }
        );
      }

      const trimmedEmail = body.email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return NextResponse.json(
          { error: 'Invalid email address format.' },
          { status: 400 }
        );
      }

      // Ensure email is not already taken by another user
      if (trimmedEmail !== existingUser.email.toLowerCase()) {
        const existingEmailRows = await query<any[]>(
          'SELECT id FROM users WHERE LOWER(email) = ? AND id != ?',
          [trimmedEmail, userId]
        );

        if (existingEmailRows && existingEmailRows.length > 0) {
          return NextResponse.json(
            { error: 'Email address is already in use by another user.' },
            { status: 400 }
          );
        }
      }

      updates.push('email = ?');
      queryParams.push(trimmedEmail);
    }

    // 4. Validate & process phoneNumber
    if (body.phoneNumber !== undefined || body.phone_number !== undefined || body.phone !== undefined) {
      const phoneVal = body.phoneNumber !== undefined
        ? body.phoneNumber
        : (body.phone_number !== undefined ? body.phone_number : body.phone);

      if (typeof phoneVal !== 'string' || !phoneVal.trim()) {
        return NextResponse.json(
          { error: 'phoneNumber cannot be empty.' },
          { status: 400 }
        );
      }

      const trimmedPhone = phoneVal.trim();

      // Ensure phoneNumber is not already taken by another user
      if (trimmedPhone !== (existingUser.phoneNumber || '')) {
        const existingPhoneRows = await query<any[]>(
          'SELECT id FROM users WHERE phoneNumber = ? AND id != ?',
          [trimmedPhone, userId]
        );

        if (existingPhoneRows && existingPhoneRows.length > 0) {
          return NextResponse.json(
            { error: 'Phone number is already in use by another user.' },
            { status: 400 }
          );
        }
      }

      updates.push('phoneNumber = ?');
      queryParams.push(trimmedPhone);
    }

    // 5. Password Update Validation & Hashing
    const isPasswordSpecified =
      body.currentPassword !== undefined ||
      body.current_password !== undefined ||
      body.newPassword !== undefined ||
      body.new_password !== undefined ||
      body.confirmNewPassword !== undefined ||
      body.confirm_new_password !== undefined ||
      body.confirmPassword !== undefined ||
      body.confirm_password !== undefined;

    if (isPasswordSpecified) {
      const currentPassword = (body.currentPassword || body.current_password || '').toString();
      const newPassword = (body.newPassword || body.new_password || '').toString();
      const confirmNewPassword = (body.confirmNewPassword || body.confirm_new_password || body.confirmPassword || body.confirm_password || '').toString();

      // Check all three password fields are provided
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'currentPassword is required when changing password.' },
          { status: 400 }
        );
      }

      if (!newPassword) {
        return NextResponse.json(
          { error: 'newPassword is required when changing password.' },
          { status: 400 }
        );
      }

      if (!confirmNewPassword) {
        return NextResponse.json(
          { error: 'confirmNewPassword is required when changing password.' },
          { status: 400 }
        );
      }

      // Verify currentPassword matches database password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, existingUser.password);
      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { error: 'Incorrect current password.' },
          { status: 400 }
        );
      }

      // Verify newPassword is not identical to existing current password
      const isSameAsCurrentPassword = await bcrypt.compare(newPassword, existingUser.password);
      if (isSameAsCurrentPassword) {
        return NextResponse.json(
          { error: 'New password cannot be the same as your current password.' },
          { status: 400 }
        );
      }

      // Verify newPassword and confirmNewPassword match
      if (newPassword !== confirmNewPassword) {
        return NextResponse.json(
          { error: 'newPassword and confirmNewPassword do not match.' },
          { status: 400 }
        );
      }

      // Verify password complexity requirements (minimum 6 chars)
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters long.' },
          { status: 400 }
        );
      }

      // Hash new password using bcrypt
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      updates.push('password = ?');
      queryParams.push(hashedNewPassword);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided to update.' },
        { status: 400 }
      );
    }

    // Add updated_at timestamp and execute UPDATE query
    updates.push('updated_at = CURRENT_TIMESTAMP');
    queryParams.push(userId);

    const updateSql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await query(updateSql, queryParams);

    // Fetch refreshed user record
    const updatedRows = await query<any[]>(
      'SELECT id, fullName, email, phoneNumber, profileImage, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    return NextResponse.json({
      success: true,
      message: 'User details updated successfully',
      user: formatUserProfile(updatedRows[0]),
    });
  } catch (error: any) {
    console.error('Error updating user details:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user details' },
      { status: 500 }
    );
  }
}
