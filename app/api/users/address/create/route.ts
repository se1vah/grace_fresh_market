import { NextRequest, NextResponse } from 'next/server';
import { POST as handlePost } from '../route';

/**
 * POST /api/users/address/create
 * Alias endpoint to create a user address.
 */
export async function POST(request: NextRequest) {
  try {
    return await handlePost(request);
  } catch (error: any) {
    console.error('[POST /api/users/address/create] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to add address',
      },
      { status: 500 }
    );
  }
}
