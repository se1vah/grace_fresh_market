import { NextRequest } from 'next/server';
import { POST as handleCreateOrder } from '../route';

/**
 * POST /api/user/orders/create
 * Alias endpoint for createOrder API.
 */
export async function POST(request: NextRequest) {
  return handleCreateOrder(request);
}
