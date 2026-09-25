import { NextRequest, NextResponse } from 'next/server';
import { POST as handlePost } from '../route';

/**
 * POST /api/user/profile/upload
 * Alias endpoint for uploading user profile photo and updating profile information.
 */
export async function POST(request: NextRequest) {
  try {
    return await handlePost(request);
  } catch (error: any) {
    console.error('[POST /api/user/profile/upload] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to upload profile photo',
      },
      { status: 500 }
    );
  }
}
