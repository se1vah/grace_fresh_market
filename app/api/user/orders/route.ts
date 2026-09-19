import { NextRequest } from 'next/server';
import {
  GET as handleGetAllOrders,
  POST as handleCreateOrder,
} from '../../users/orders/route';

/**
 * GET /api/user/orders
 * Alias endpoint for getAllOrders API.
 */
export async function GET(request: NextRequest) {
  return handleGetAllOrders(request);
}

/**
 * POST /api/user/orders
 * Alias endpoint for createOrder API.
 */
export async function POST(request: NextRequest) {
  return handleCreateOrder(request);
}

