import { NextRequest } from 'next/server';
import { GET as handleGet } from '../../users/notifications/route';

/**
 * /api/user/notifications (Alias for /api/users/notifications)
 */
export async function GET(request: NextRequest) {
  return handleGet(request);
}
