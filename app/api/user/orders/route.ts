import { NextRequest, NextResponse } from 'next/server';
import {
  GET as handleGetAllOrders,
  POST as handleCreateOrder,
} from '../../users/orders/route';

/**
 * GET /api/user/orders
 * Alias endpoint for getAllOrders API.
 */
export async function GET(request: NextRequest) {
  try {
    return await handleGetAllOrders(request);
  } catch (error: any) {
    console.error('[GET /api/user/orders] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to retrieve orders',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/orders
 * Alias endpoint for createOrder API.
 */
export async function POST(request: NextRequest) {
  try {
    return await handleCreateOrder(request);
  } catch (error: any) {
    console.error('[POST /api/user/orders] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to create order',
      },
      { status: 500 }
    );
  }
}

