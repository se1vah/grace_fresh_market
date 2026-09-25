import { NextRequest, NextResponse } from 'next/server';
import { GET as handleGet, POST as handlePost, PUT as handlePut } from '../../users/profile/route';

/**
 * /api/user/profile (Alias for /api/users/profile)
 * Handles GET (view profile), POST (upload photo), and PUT (update details/password).
 */
export async function GET(request: NextRequest) {
  try {
    return await handleGet(request);
  } catch (error: any) {
    console.error('[GET /api/user/profile] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to retrieve profile',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handlePost(request);
  } catch (error: any) {
    console.error('[POST /api/user/profile] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to process profile photo',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await handlePut(request);
  } catch (error: any) {
    console.error('[PUT /api/user/profile] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to update profile',
      },
      { status: 500 }
    );
  }
}
