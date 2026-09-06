import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth/user-jwt';
import { getCheckoutDetails } from '@/lib/services/checkout-details';

const DEFAULT_ADDRESS_NOT_FOUND_MESSAGE =
  'Default delivery address not found. Please add or select a default address before proceeding with checkout.';

/**
 * GET /api/cart/get-check-out-details (getCheckOutDetails)
 * Returns the authenticated user's default delivery address and payment methods.
 */
export async function GET(request: NextRequest) {
  try {
    // Deliberately omit an explicit user ID: this endpoint requires a valid JWT.
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'User identification required. Please log in.' },
        { status: 401 }
      );
    }

    const checkoutDetails = await getCheckoutDetails(userId);

    if (!checkoutDetails) {
      return NextResponse.json(
        {
          success: false,
          message: DEFAULT_ADDRESS_NOT_FOUND_MESSAGE,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Checkout details fetched successfully',
      data: checkoutDetails,
    });
  } catch (error: unknown) {
    console.error('Error fetching checkout details:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch checkout details',
      },
      { status: 500 }
    );
  }
}
