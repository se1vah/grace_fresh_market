import { NextRequest } from 'next/server';
import { GET as handleGetOrderByIdQuery } from '@/app/api/users/orders/get-by-id/route';

/**
 * GET /api/user/orders/get-by-id
 * Alias endpoint for getOrderById query API.
 */
export async function GET(request: NextRequest) {
  return handleGetOrderByIdQuery(request);
}
