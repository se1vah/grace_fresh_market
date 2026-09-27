import { NextRequest } from 'next/server';
import { DELETE as handleDelete, POST as handlePost } from '@/app/api/user/delete/route';

/**
 * DELETE /api/users/delete
 * Alias endpoint for /api/user/delete.
 */
export async function DELETE(request: NextRequest) {
  return handleDelete(request);
}

/**
 * POST /api/users/delete
 * Alias endpoint for /api/user/delete.
 */
export async function POST(request: NextRequest) {
  return handlePost(request);
}
