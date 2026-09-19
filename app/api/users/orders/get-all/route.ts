import { NextRequest } from 'next/server';
import { GET as handleGetAllOrders } from '../route';

/**
 * GET /api/users/orders/get-all
 * Alias endpoint for getAllOrders API.
 */
export async function GET(request: NextRequest) {
  return handleGetAllOrders(request);
}
