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

    // 3. Extract and validate cartId
    const rawCartId = body.cartId ?? body.cart_id ?? body.cartIds ?? body.cart_ids;

    if (rawCartId === undefined || rawCartId === null) {
      return NextResponse.json(
        {
          success: false,
          message: 'cartId is required to create an order.',
        },
        { status: 400 }
      );
    }

    let cartIdList: number[] = [];
    if (Array.isArray(rawCartId)) {
      cartIdList = rawCartId.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
    } else if (typeof rawCartId === 'string' && rawCartId.includes(',')) {
      cartIdList = rawCartId
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((id) => Number.isInteger(id) && id > 0);
    } else {
      const parsedId = Number(rawCartId);
      if (Number.isInteger(parsedId) && parsedId > 0) {
        cartIdList = [parsedId];
      }
    }

    if (cartIdList.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid cartId. Must be a positive integer or array of integers.',
        },
        { status: 400 }
      );
    }

    // 4. Retrieve wanted data from cart table for the authenticated user
    const placeholders = cartIdList.map(() => '?').join(',');
    const cartRows = await query<any[]>(
      `SELECT id, user_id, subcategory_id, quantity 
       FROM cart 
       WHERE id IN (${placeholders}) AND user_id = ?`,
      [...cartIdList, userId]
    );

    if (!cartRows || cartRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Selected cart item(s) not found or do not belong to the user.',
        },
        { status: 404 }
      );
    }

    if (cartRows.length < cartIdList.length) {
      const foundIds = new Set(cartRows.map((r) => Number(r.id)));
      const missingIds = cartIdList.filter((id) => !foundIds.has(id));
      return NextResponse.json(
        {
          success: false,
          message: `Cart item(s) with ID(s) ${missingIds.join(', ')} not found or do not belong to the user.`,
        },
        { status: 404 }
      );
    }

    // 5. Map cart data into OrderItemInput
    const validatedItems: OrderItemInput[] = cartRows.map((row) => ({
      subcategoryId: Number(row.subcategory_id),
      quantity: Number(row.quantity),
    }));

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

    // 6. Create order with server-calculated values, atomic stock reduction, and cart cleanup
    const orderData = await createOrderFromCart(userId, validatedItems, {
      addressId: Number.isFinite(addressId) ? addressId : undefined,
      paymentMethodId: Number.isFinite(paymentMethodId) ? paymentMethodId : undefined,
      cartIds: cartIdList,
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

