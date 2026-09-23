import { NextRequest, NextResponse } from 'next/server';
import { GET as handleGetOrderById } from '../[id]/route';

/**
 * GET /api/users/orders/get-by-id
 * Query-parameter alternative to GET /api/users/orders/[id].
 * Accepts orderId or id via URL search params (e.g. ?orderId=123 or ?id=123).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const rawOrderId =
    searchParams.get('orderId') ||
    searchParams.get('order_id') ||
    searchParams.get('id');

  if (!rawOrderId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Order ID is required as a query parameter (e.g., ?orderId=123 or ?id=123).',
      },
      { status: 400 }
    );
  }

  return handleGetOrderById(request, {
    params: Promise.resolve({ id: rawOrderId }),
  });
}
