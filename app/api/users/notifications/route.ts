import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth/user-jwt';
import {
  getNotificationsByUserId,
  deleteNotificationById,
} from '@/lib/services/notification';

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

/**
 * DELETE /api/users/notifications
 * Deletes a notification by ID for the authenticated or specified user.
 * Accepts notification `id` via query parameter or JSON body.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    let id: number | null = null;
    let rawUserId = searchParams.get('userId') || searchParams.get('user_id');

    const queryId = searchParams.get('id');
    if (queryId) {
      id = Number(queryId);
    } else {
      const body = await request.json().catch(() => ({}));
      if (body?.id) id = Number(body.id);
      if (!rawUserId && (body?.userId || body?.user_id)) {
        rawUserId = String(body.userId || body.user_id);
      }
    }

    if (!id || isNaN(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: 'A valid notification ID is required.' },
        { status: 400 }
      );
    }

    const userId = await getUserIdFromRequest(request, rawUserId);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please log in or provide a valid user ID.' },
        { status: 401 }
      );
    }

    const deleted = await deleteNotificationById(id, userId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Notification not found or access denied.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification removed successfully.',
    });
  } catch (error: unknown) {
    console.error('[DELETE /api/users/notifications] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while removing the notification.' },
      { status: 500 }
    );
  }
}
