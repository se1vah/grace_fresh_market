import { NextRequest } from 'next/server';
import { GET as handleGetAllOrders } from '../../users/orders/route';

/**
 * GET /api/user/orders
 * Alias endpoint for getAllOrders API.
 */
export async function GET(request: NextRequest) {
  return handleGetAllOrders(request);
}
