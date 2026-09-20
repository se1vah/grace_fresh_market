import { NextRequest } from 'next/server';
import { GET as handleGetAllCart } from '../route';

/**
 * GET /api/user/cart/get-all
 * Alias endpoint for getAllCart API under /api/user/cart.
 */
export async function GET(request: NextRequest) {
  return handleGetAllCart(request);
}
