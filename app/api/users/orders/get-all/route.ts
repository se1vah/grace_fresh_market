import { NextRequest, NextResponse } from 'next/server';
import { GET as handleGetAllOrders } from '../route';

/**
 * GET /api/users/orders/get-all
 * Alias endpoint for getAllOrders API.
 */
export async function GET(request: NextRequest) {
  try {
    return await handleGetAllOrders(request);
  } catch (error: any) {
    console.error('[GET /api/users/orders/get-all] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to retrieve orders',
      },
      { status: 500 }
    );
  }
}
