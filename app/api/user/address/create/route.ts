import { NextRequest, NextResponse } from 'next/server';
import { POST as handlePost } from '../route';

/**
 * POST /api/user/address/create
 * Creates a new user address.
 * Data: address(id, userId, addressType("home", "office", "other"), street, buildingName, city, state, zipcode, isDefault)
 */
export async function POST(request: NextRequest) {
  try {
    return await handlePost(request);
  } catch (error: any) {
    console.error('[POST /api/user/address/create] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to add address',
      },
      { status: 500 }
    );
  }
}
