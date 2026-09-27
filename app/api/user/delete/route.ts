import { NextRequest, NextResponse } from 'next/server';
import { DELETE as handleDeleteWithParams } from './[userId]/route';

/**
 * DELETE /api/user/delete
 * Supports deleting a user via query parameter (?userId=...) or JSON request body ({ userId: ... }).
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  let rawUserId = searchParams.get('userId') || searchParams.get('user_id') || searchParams.get('id');

  if (!rawUserId) {
    const body = await request.json().catch(() => ({}));
    rawUserId = body.userId || body.user_id || body.id;
  }

  if (!rawUserId) {
    return NextResponse.json(
      {
        success: false,
        error: 'userId is required either in the URL path (/api/user/delete/:userId), query params, or JSON body.',
      },
      { status: 400 }
    );
  }

  return handleDeleteWithParams(request, {
    params: Promise.resolve({ userId: String(rawUserId) }),
  });
}

/**
 * POST /api/user/delete
 * Alias endpoint for delete user via POST method.
 */
export async function POST(request: NextRequest) {
  return DELETE(request);
}
