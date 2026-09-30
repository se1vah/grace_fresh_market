import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { hardDeleteUser, UserDeleteError } from '@/lib/services/delete-user';
import { verifyShopToken, SHOP_COOKIE_NAME } from '@/lib/auth/shop-jwt';
import { getUserIdFromRequest, USER_COOKIE_NAME } from '@/lib/auth/user-jwt';
import { emitSocketEvent } from '@/lib/socket';

async function authenticateShop(request: NextRequest) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(SHOP_COOKIE_NAME)?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) return null;
  return verifyShopToken(token);
}

/**
 * DELETE /api/user/delete/:userId
 *
 * Permanently deletes a user and all associated records (historical orders, order items,
 * order statuses, notifications, cart, addresses, login sessions, profile images).
 *
 * Pre-condition: Checks if the user has any active orders (ordered, packed, out for delivery).
 * If active orders exist, rejects with HTTP 400 Bad Request.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: rawUserId } = await context.params;
    const parsedUserId = parseInt(rawUserId, 10);

    if (isNaN(parsedUserId) || parsedUserId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid userId. A valid positive integer is required.',
        },
        { status: 400 }
      );
    }

    // Authorization:
    // 1. If shop admin is authenticated, deletion is permitted.
    const shopAdmin = await authenticateShop(request);

    // 2. If not a shop admin, check if caller is authenticated as a customer
    if (!shopAdmin) {
      const jwtUserId = await getUserIdFromRequest(request);
      // If a customer JWT is provided and doesn't match target userId, reject
      if (jwtUserId && jwtUserId !== parsedUserId) {
        return NextResponse.json(
          {
            success: false,
            error: "You are not authorized to delete another user's account.",
          },
          { status: 403 }
        );
      }
    }

    // Execute atomic hard deletion (with active order pre-check)
    const result = await hardDeleteUser(parsedUserId);

    const response = NextResponse.json(result, { status: 200 });

    // If caller deleted their own account, clear user authentication cookie
    const currentLoggedUserId = await getUserIdFromRequest(request);
    if (currentLoggedUserId === parsedUserId) {
      response.cookies.set(USER_COOKIE_NAME, '', {
        path: '/',
        maxAge: 0,
        httpOnly: true,
      });
    }

    if (shopAdmin) {
      emitSocketEvent(`shop-delete-user`, { userId: parsedUserId });
    }

    return response;
  } catch (error: any) {
    if (error instanceof UserDeleteError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          message: error.message,
          code: error.code,
          ...(error.details || {}),
        },
        { status: error.statusCode }
      );
    }

    console.error('[DELETE /api/user/delete/:userId] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to delete user.',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/delete/:userId
 * Alias for clients and forms that cannot issue HTTP DELETE requests.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  return DELETE(request, context);
}
