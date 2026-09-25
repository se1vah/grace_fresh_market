import { NextRequest, NextResponse } from 'next/server';
import { GET as handleGet } from '../../users/notifications/route';

/**
 * /api/user/notifications (Alias for /api/users/notifications)
 */
export async function GET(request: NextRequest) {
  try {
    return await handleGet(request);
  } catch (error: any) {
    console.error('[GET /api/user/notifications] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to retrieve notifications',
      },
      { status: 500 }
    );
  }
}
