import { NextRequest } from 'next/server';
import { POST as handleBulkCart } from '../bulk/route';

/**
 * POST /api/user/cart/create-bulk
 * Alias endpoint for bulk cart API under /api/user/cart.
 */
export async function POST(request: NextRequest) {
  return handleBulkCart(request);
}
