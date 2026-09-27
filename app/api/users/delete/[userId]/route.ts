import { NextRequest } from 'next/server';
import { DELETE as handleDelete, POST as handlePost } from '@/app/api/user/delete/[userId]/route';

/**
 * DELETE /api/users/delete/:userId
 * Alias endpoint for delete user API.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  return handleDelete(request, context);
}

/**
 * POST /api/users/delete/:userId
 * Alias endpoint for delete user API.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  return handlePost(request, context);
}
