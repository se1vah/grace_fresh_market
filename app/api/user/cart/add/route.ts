import { NextRequest, NextResponse } from 'next/server';
import { POST as handleAddCart } from '../route';

/**
 * POST /api/user/cart/add
 * Alias endpoint for addCart API under /api/user/cart.
 */
export async function POST(request: NextRequest) {
  try {
    return await handleAddCart(request);
  } catch (error: any) {
    console.error('[POST /api/user/cart/add] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to add item to cart',
      },
      { status: 500 }
    );
  }
}
