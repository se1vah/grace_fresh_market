import { NextRequest, NextResponse } from 'next/server';
import { POST as handleBulkCart } from '../bulk/route';

/**
 * POST /api/user/cart/create-bulk
 * Alias endpoint for bulk cart API under /api/user/cart.
 */
export async function POST(request: NextRequest) {
  try {
    return await handleBulkCart(request);
  } catch (error: any) {
    console.error('[POST /api/user/cart/create-bulk] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to perform bulk cart operation',
      },
      { status: 500 }
    );
  }
}
