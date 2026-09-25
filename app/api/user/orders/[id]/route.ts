import { NextRequest, NextResponse } from 'next/server';
import { GET as handleGetOrderById } from '@/app/api/users/orders/[id]/route';

/**
 * GET /api/user/orders/[id]
 * Alias endpoint for getOrderById API.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    return await handleGetOrderById(request, context);
  } catch (error: any) {
    console.error('[GET /api/user/orders/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to retrieve order',
      },
      { status: 500 }
    );
  }
}
