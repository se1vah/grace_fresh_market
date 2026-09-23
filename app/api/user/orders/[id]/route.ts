import { NextRequest } from 'next/server';
import { GET as handleGetOrderById } from '@/app/api/users/orders/[id]/route';

/**
 * GET /api/user/orders/[id]
 * Alias endpoint for getOrderById API.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleGetOrderById(request, context);
}
