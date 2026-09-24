import { NextRequest } from 'next/server';
import {
  GET as handleGet,
  DELETE as handleDelete,
} from '../../users/notifications/route';

/**
 * /api/user/notifications (Alias for /api/users/notifications)
 */
export async function GET(request: NextRequest) {
  return handleGet(request);
}

export async function DELETE(request: NextRequest) {
  return handleDelete(request);
}
