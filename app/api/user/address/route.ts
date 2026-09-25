import { NextRequest, NextResponse } from 'next/server';
import {
  GET as handleGet,
  POST as handlePost,
  PUT as handlePut,
  DELETE as handleDelete,
} from '../../users/address/route';

/**
 * /api/user/address (Alias for /api/users/address)
 */
export async function GET(request: NextRequest) {
  try {
    return await handleGet(request);
  } catch (error: any) {
    console.error('[GET /api/user/address] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to retrieve addresses',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handlePost(request);
  } catch (error: any) {
    console.error('[POST /api/user/address] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to add address',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await handlePut(request);
  } catch (error: any) {
    console.error('[PUT /api/user/address] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to update address',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await handleDelete(request);
  } catch (error: any) {
    console.error('[DELETE /api/user/address] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to delete address',
      },
      { status: 500 }
    );
  }
}
