import { NextRequest, NextResponse } from 'next/server';
import { GET as handleGet } from '../route';

/**
 * GET /api/user/address/get-all
 * Retrieves all user addresses for the authenticated user or specified userId parameter.
 */
export async function GET(request: NextRequest) {
  try {
    return await handleGet(request);
  } catch (error: any) {
    console.error('[GET /api/user/address/get-all] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to retrieve addresses',
      },
      { status: 500 }
    );
  }
}
