import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth/user-jwt';
import { getNotificationsByUserId } from '@/lib/services/notification';

/**
 * GET /api/users/notifications
 * Retrieves notifications for the authenticated or specified user.
 * Optional query parameters:
 *  - userId / user_id: Targeted user ID
 *  - type: Filter by notification type (e.g. 'ordered', 'delivered', 'packed', etc.)
 *  - limit: Maximum number of records to return (default: 50, max: 100)
 *  - offset: Number of records to skip (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const rawUserId = searchParams.get('userId') || searchParams.get('user_id');
    const type = searchParams.get('type') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined;

    if (rawUserId !== null && rawUserId !== '') {
      const parsed = Number(rawUserId);
      if (isNaN(parsed) || parsed < 1) {
        return NextResponse.json(
          { success: false, error: 'Invalid userId parameter provided.' },
          { status: 400 }
        );
      }
    }

    const jwtUserId = await getUserIdFromRequest(request);
    if (jwtUserId && rawUserId) {
      const requestedUserId = Number(rawUserId);
      if (!isNaN(requestedUserId) && requestedUserId > 0 && requestedUserId !== jwtUserId) {
        return NextResponse.json(
          { success: false, error: 'You are not authorized to view notifications for another user account.' },
          { status: 403 }
        );
      }
    }

    const userId = await getUserIdFromRequest(request, rawUserId);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please log in or provide a valid user ID.' },
        { status: 401 }
      );
    }

    const userRows = await query<{ id: number }[]>(
      'SELECT id FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User profile not found.' },
        { status: 404 }
      );
    }

    const notifications = await getNotificationsByUserId(userId, {
      limit,
      offset,
      type,
    });

    return NextResponse.json({
      success: true,
      message: 'Notifications retrieved successfully.',
      total: notifications.length,
      data: notifications,
    });
  } catch (error: unknown) {
    console.error('[GET /api/users/notifications] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while retrieving notifications.' },
      { status: 500 }
    );
  }
}
