import { NextRequest, NextResponse } from 'next/server';
import { GET as handleGetAllCart } from '../route';

/**
 * GET /api/user/cart/get-all
 * Alias endpoint for getAllCart API under /api/user/cart.
 */
export async function GET(request: NextRequest) {
  try {
    return await handleGetAllCart(request);
  } catch (error: any) {
    console.error('[GET /api/user/cart/get-all] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to retrieve cart items',
      },
      { status: 500 }
    );
  }
}
