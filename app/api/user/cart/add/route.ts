import { NextRequest } from 'next/server';
import { POST as handleAddCart } from '../route';

/**
 * POST /api/user/cart/add
 * Alias endpoint for addCart API under /api/user/cart.
 */
export async function POST(request: NextRequest) {
  return handleAddCart(request);
}
