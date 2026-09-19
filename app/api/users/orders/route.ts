import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth/user-jwt';
import { getAllOrdersForUser } from '@/lib/services/get-all-orders';

/**
 * GET /api/users/orders (getAllOrders)
 * Returns all orders for the authenticated (or explicitly identified) user.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const rawUserId = searchParams.get('userId') || searchParams.get('user_id');

    if (rawUserId !== null && rawUserId !== '') {
      const parsed = Number(rawUserId);
      if (isNaN(parsed) || parsed < 1) {
        return NextResponse.json({ error: 'Invalid userId.' }, { status: 400 });
      }
    }

    const jwtUserId = await getUserIdFromRequest(request);
    if (jwtUserId && rawUserId) {
      const requestedUserId = Number(rawUserId);
      if (!isNaN(requestedUserId) && requestedUserId > 0 && requestedUserId !== jwtUserId) {
        return NextResponse.json(
          { error: 'You are not authorized to access another user\'s orders.' },
          { status: 403 }
        );
      }
    }

    const userId = await getUserIdFromRequest(request, rawUserId);

    if (!userId) {
      return NextResponse.json(
        { error: 'User identification required. Please log in or provide a valid user ID.' },
        { status: 401 }
      );
    }

    const userRows = await query<{ id: number }[]>(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    const orders = await getAllOrdersForUser(userId);

    return NextResponse.json({
      success: true,
      message: 'Orders retrieved successfully',
      data: orders,
    });
  } catch (error: unknown) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to retrieve orders' }, { status: 500 });
  }
}
