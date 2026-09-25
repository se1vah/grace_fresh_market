import { NextRequest, NextResponse } from 'next/server';
import { GET as handleGetOrderByIdQuery } from '@/app/api/users/orders/get-by-id/route';

/**
 * GET /api/user/orders/get-by-id
 * Alias endpoint for getOrderById query API.
 */
export async function GET(request: NextRequest) {
  try {
    return await handleGetOrderByIdQuery(request);
  } catch (error: any) {
    console.error('[GET /api/user/orders/get-by-id] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to retrieve order',
      },
      { status: 500 }
    );
  }
}
