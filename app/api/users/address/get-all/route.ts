import { NextRequest, NextResponse } from 'next/server';
import { GET as handleGet } from '../route';

/**
 * GET /api/users/address/get-all
 * Retrieves all user addresses.
 */
export async function GET(request: NextRequest) {
  try {
    return await handleGet(request);
  } catch (error: any) {
    console.error('[GET /api/users/address/get-all] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to retrieve addresses',
      },
      { status: 500 }
    );
  }
}
