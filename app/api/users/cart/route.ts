import { NextRequest, NextResponse } from 'next/server';
import {
  GET as handleGet,
  POST as handlePost,
  PUT as handlePut,
  DELETE as handleDelete,
} from '../../user/cart/route';

/**
 * /api/users/cart (Plural alias for /api/user/cart)
 */
export async function GET(request: NextRequest) {
  try {
    return await handleGet(request);
  } catch (error: any) {
    console.error('[GET /api/users/cart] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to retrieve cart',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handlePost(request);
  } catch (error: any) {
    console.error('[POST /api/users/cart] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to add item to cart',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await handlePut(request);
  } catch (error: any) {
    console.error('[PUT /api/users/cart] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to update cart',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await handleDelete(request);
  } catch (error: any) {
    console.error('[DELETE /api/users/cart] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to remove item from cart',
      },
      { status: 500 }
    );
  }
}
