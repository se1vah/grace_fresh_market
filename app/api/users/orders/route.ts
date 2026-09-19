import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth/user-jwt';
import { getAllOrdersForUser } from '@/lib/services/get-all-orders';
import { createOrderFromCart, OrderError, OrderItemInput } from '@/lib/services/order';

/**
 * GET /api/users/orders (getAllOrders)
 * Returns all orders for the authenticated (or explicitly identified) user.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const rawUserId = searchParams.get('userId') || searchParams.get('user_id');

    if (rawUserId !== null && rawUserId !== '') {
      const parsed = Number(rawUserId);
      if (isNaN(parsed) || parsed < 1) {
        return NextResponse.json({ error: 'Invalid userId.' }, { status: 400 });
      }
    }

    const jwtUserId = await getUserIdFromRequest(request);
    if (jwtUserId && rawUserId) {
      const requestedUserId = Number(rawUserId);
      if (!isNaN(requestedUserId) && requestedUserId > 0 && requestedUserId !== jwtUserId) {
        return NextResponse.json(
          { error: 'You are not authorized to access another user\'s orders.' },
          { status: 403 }
        );
      }
    }

    const userId = await getUserIdFromRequest(request, rawUserId);

    if (!userId) {
      return NextResponse.json(
        { error: 'User identification required. Please log in or provide a valid user ID.' },
        { status: 401 }
      );
    }

    const userRows = await query<{ id: number }[]>(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    const orders = await getAllOrdersForUser(userId);

    return NextResponse.json({
      success: true,
      message: 'Orders retrieved successfully',
      data: orders,
    });
  } catch (error: unknown) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to retrieve orders' }, { status: 500 });
  }
}

/**
 * POST /api/users/orders
 * Creates an order securely from the user's cart items.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized.',
        },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request body. JSON payload expected.',
        },
        { status: 400 }
      );
    }

    // 3. Validate cartSummary existence
    if (!body.cartSummary || typeof body.cartSummary !== 'object') {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing or invalid cartSummary.',
        },
        { status: 400 }
      );
    }

    // 4. Validate items array
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid order items. items must be a non-empty array.',
        },
        { status: 400 }
      );
    }

    // 5. Validate each item and check for duplicates
    const validatedItems: OrderItemInput[] = [];
    const seenSubcategoryIds = new Set<number>();

    for (let index = 0; index < body.items.length; index++) {
      const item = body.items[index];

      if (!item || typeof item !== 'object') {
        return NextResponse.json(
          {
            success: false,
            message: `Item at index ${index} is invalid.`,
          },
          { status: 400 }
        );
      }

      // Check subcategoryId
      if (item.subcategoryId === undefined || item.subcategoryId === null) {
        return NextResponse.json(
          {
            success: false,
            message: `Item at index ${index} is missing subcategoryId.`,
          },
          { status: 400 }
        );
      }

      const subcategoryId = Number(item.subcategoryId);
      if (!Number.isInteger(subcategoryId) || subcategoryId <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid subcategoryId for item at index ${index}. Must be a positive integer.`,
          },
          { status: 400 }
        );
      }

      // Check quantity
      const quantity = item.quantity;
      if (
        typeof quantity !== 'number' ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid quantity for item at index ${index}. Must be a positive integer.`,
          },
          { status: 400 }
        );
      }

      // Prevent duplicate subcategoryId
      if (seenSubcategoryIds.has(subcategoryId)) {
        return NextResponse.json(
          {
            success: false,
            message: `Duplicate subcategoryId ${subcategoryId} detected in order items.`,
          },
          { status: 400 }
        );
      }

      seenSubcategoryIds.add(subcategoryId);
      validatedItems.push({
        subcategoryId,
        quantity,
      });
    }

    // Extract optional addressId / paymentMethodId
    const rawAddressId =
      body.addressId ??
      body.addressid ??
      body.address_id ??
      body.deliveryAddress?.id ??
      body.defaultAddress?.id;
    const addressId = rawAddressId !== undefined && rawAddressId !== null ? Number(rawAddressId) : undefined;

    const rawPaymentMethodId =
      body.paymentMethodId ??
      body.paymentmethodid ??
      body.payment_method_id ??
      body.paymentMethod?.id;
    const paymentMethodId = rawPaymentMethodId !== undefined && rawPaymentMethodId !== null ? Number(rawPaymentMethodId) : undefined;

    // 6. Create order with server-calculated values and atomic stock reduction
    const orderData = await createOrderFromCart(userId, validatedItems, {
      addressId: Number.isFinite(addressId) ? addressId : undefined,
      paymentMethodId: Number.isFinite(paymentMethodId) ? paymentMethodId : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Order created successfully',
        data: orderData,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof OrderError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    console.error('[POST /api/users/orders] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create order. Please try again later.',
      },
      { status: 500 }
    );
  }
}

