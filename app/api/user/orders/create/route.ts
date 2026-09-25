import { NextRequest, NextResponse } from 'next/server';
import { POST as handleCreateOrder } from '../route';

/**
 * POST /api/user/orders/create
 * Alias endpoint for createOrder API.
 */
export async function POST(request: NextRequest) {
  try {
    return await handleCreateOrder(request);
  } catch (error: any) {
    console.error('[POST /api/user/orders/create] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to create order',
      },
      { status: 500 }
    );
  }
}
