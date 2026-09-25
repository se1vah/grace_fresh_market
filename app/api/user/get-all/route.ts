import { NextRequest, NextResponse } from 'next/server';
import { GET as handleGetAllUsers } from '../../users/get-all/route';

/**
 * GET /api/user/get-all
 * Alias endpoint for get all user details API.
 */
export async function GET(request: NextRequest) {
  try {
    return await handleGetAllUsers(request);
  } catch (error: any) {
    console.error('[GET /api/user/get-all] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to retrieve users',
      },
      { status: 500 }
    );
  }
}
