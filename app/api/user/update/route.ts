import { NextRequest, NextResponse } from 'next/server';
import { PUT as handlePut } from '../profile/route';

/**
 * PUT /api/user/update
 * Alias endpoint for updating user profile details and password.
 */
export async function PUT(request: NextRequest) {
  try {
    return await handlePut(request);
  } catch (error: any) {
    console.error('[PUT /api/user/update] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to update user profile',
      },
      { status: 500 }
    );
  }
}
