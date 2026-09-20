import { NextRequest } from 'next/server';
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
  return handleGet(request);
}

export async function POST(request: NextRequest) {
  return handlePost(request);
}

export async function PUT(request: NextRequest) {
  return handlePut(request);
}

export async function DELETE(request: NextRequest) {
  return handleDelete(request);
}
