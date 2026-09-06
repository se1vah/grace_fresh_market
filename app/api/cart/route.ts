import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth/user-jwt';

async function fetchDeliveryFee(): Promise<number | null> {
  const settingsRows = await query<{ delivery_fee: unknown }[]>(
    'SELECT delivery_fee FROM app_settings ORDER BY id DESC LIMIT 1',
  );
  const storedFee = settingsRows[0]?.delivery_fee;
  if (storedFee === null || storedFee === undefined) {
    return null;
  }

  const fee = Number(storedFee);

  return Number.isFinite(fee) ? Number(fee.toFixed(2)) : null;
}

// Helper to fetch complete cart items & summary for a user
async function fetchUserCart(userId: number) {
  const deliveryFee = await fetchDeliveryFee();

  // Fetch cart items joined with subcategories and categories
  const cartRows = await query<any[]>(
    `SELECT 
        c.id as cart_id,
        c.user_id,
        c.subcategory_id,
        c.quantity,
        c.created_at as cart_created_at,
        c.updated_at as cart_updated_at,
        s.subcategory_name,
        s.status as subcategory_status,
        s.amount,
        s.stock,
        s.category_id,
        cat.category_name,
        cat.category_type,
        cat.status as category_status
     FROM cart c
     JOIN subcategories s ON c.subcategory_id = s.id
     JOIN categories cat ON s.category_id = cat.id
     WHERE c.user_id = ?
     ORDER BY c.updated_at DESC`,
    [userId]
  );

  if (!cartRows || cartRows.length === 0) {
    return {
      cartItems: [],
      cartSummary: {
        totalItems: 0,
        itemCount: 0,
        totalAmount: 0,
        deliveryFee,
      },
    };
  }

  // Fetch images for all subcategories in the cart
  const subcategoryIds = [...new Set(cartRows.map((row) => row.subcategory_id))];
  const imagesMap: Record<number, string[]> = {};

  if (subcategoryIds.length > 0) {
    const imgRows = await query<any[]>(
      `SELECT subcategory_id, image_url 
       FROM subcategory_images 
       WHERE subcategory_id IN (${subcategoryIds.map(() => '?').join(',')}) 
       ORDER BY is_primary DESC, id ASC`,
      subcategoryIds
    );

    imgRows.forEach((imgRow) => {
      if (!imagesMap[imgRow.subcategory_id]) {
        imagesMap[imgRow.subcategory_id] = [];
      }
      imagesMap[imgRow.subcategory_id].push(imgRow.image_url);
    });
  }

  let totalItems = 0;
  let totalAmount = 0;

  const formattedItems = cartRows.map((row) => {
    const unitPrice = Number(row.amount) || 0;
    const qty = Number(row.quantity) || 0;
    const itemTotal = unitPrice * qty;

    totalItems += qty;
    totalAmount += itemTotal;

    const itemImages = imagesMap[row.subcategory_id] || [];

    return {
      id: row.cart_id,
      cartId: row.cart_id,
      userId: row.user_id,
      subcategoryId: row.subcategory_id,
      quantity: qty,
      itemTotal: Number(itemTotal.toFixed(2)),
      subcategory: {
        id: row.subcategory_id,
        subcategoryName: row.subcategory_name,
        amount: unitPrice,
        stock: row.stock !== null && row.stock !== undefined ? Number(row.stock) : null,
        status: row.subcategory_status,
        images: itemImages,
        primaryImage: itemImages[0] || '',
        category: {
          id: row.category_id,
          categoryName: row.category_name,
          categoryType: row.category_type,
          status: row.category_status,
        },
      },
      createdAt: row.cart_created_at,
      updatedAt: row.cart_updated_at,
    };
  });

  return {
    cartItems: formattedItems,
    cartSummary: {
      totalItems,
      itemCount: formattedItems.length,
      totalAmount: Number(totalAmount.toFixed(2)),
      deliveryFee,
    },
  };
}

/**
 * GET /api/cart (getAllCart)
 * Retrieves all items in the user's cart.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const rawUserId = searchParams.get('userId') || searchParams.get('user_id');

    const userId = await getUserIdFromRequest(request, rawUserId);

    if (!userId) {
      return NextResponse.json(
        { error: 'User identification required. Please log in or provide a valid user ID.' },
        { status: 401 }
      );
    }

    const { cartItems, cartSummary } = await fetchUserCart(userId);

    return NextResponse.json({
      success: true,
      message: 'Cart retrieved successfully',
      data: cartItems,
      cartSummary,
    });
  } catch (error: any) {
    console.error('Error fetching cart:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve cart items' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cart (addCart)
 * Adds an item to the cart or increments/updates its quantity.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawUserId = body.user_id || body.userId;
    const rawSubCategoryId = body.subcategory_id || body.subcategoryId || body.product_id || body.productId;
    const rawQuantity = body.quantity;
    const action = body.action || 'add'; // 'add' (increment) or 'set' (overwrite)

    const userId = await getUserIdFromRequest(request, rawUserId);

    if (!userId) {
      return NextResponse.json(
        { error: 'User identification required. Please log in or provide a valid user ID.' },
        { status: 401 }
      );
    }

    if (!rawSubCategoryId) {
      return NextResponse.json(
        { error: 'subcategory_id is required.' },
        { status: 400 }
      );
    }

    const subcategoryId = parseInt(rawSubCategoryId, 10);
    if (isNaN(subcategoryId) || subcategoryId < 1) {
      return NextResponse.json(
        { error: 'Invalid subcategory_id.' },
        { status: 400 }
      );
    }

    let quantity = rawQuantity !== undefined && rawQuantity !== null ? parseFloat(rawQuantity) : 1;
    if (isNaN(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be a positive number (greater than 0).' },
        { status: 400 }
      );
    }

    // 1. Check if the subcategory item exists and is active
    const subCheck = await query<any[]>(
      `SELECT s.id, s.subcategory_name, s.amount, s.stock, s.status, c.status as category_status 
       FROM subcategories s 
       JOIN categories c ON s.category_id = c.id 
       WHERE s.id = ?`,
      [subcategoryId]
    );

    if (!subCheck || subCheck.length === 0) {
      return NextResponse.json(
        { error: 'Selected item/subcategory does not exist.' },
        { status: 404 }
      );
    }

    const item = subCheck[0];
    if (item.status !== 'active' || item.category_status !== 'active') {
      return NextResponse.json(
        { error: `Item "${item.subcategory_name}" is currently unavailable.` },
        { status: 400 }
      );
    }

    // Check existing cart row for this user & subcategory
    const existingCartRows = await query<any[]>(
      'SELECT id, quantity FROM cart WHERE user_id = ? AND subcategory_id = ?',
      [userId, subcategoryId]
    );

    let finalQuantity = quantity;
    if (existingCartRows && existingCartRows.length > 0) {
      if (action === 'set') {
        finalQuantity = quantity;
      } else {
        finalQuantity = Number(existingCartRows[0].quantity) + quantity;
      }
    }

    // Stock check if stock control is configured on the item
    if (item.stock !== null && item.stock !== undefined) {
      if (finalQuantity > Number(item.stock)) {
        return NextResponse.json(
          {
            error: `Requested quantity (${finalQuantity}) exceeds available stock (${item.stock}) for "${item.subcategory_name}".`,
            availableStock: Number(item.stock),
          },
          { status: 400 }
        );
      }
    }

    // 2. Insert or Update cart table
    if (existingCartRows && existingCartRows.length > 0) {
      await query(
        'UPDATE cart SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [finalQuantity, existingCartRows[0].id]
      );
    } else {
      await query(
        'INSERT INTO cart (user_id, subcategory_id, quantity) VALUES (?, ?, ?)',
        [userId, subcategoryId, finalQuantity]
      );
    }

    // 3. Return refreshed user cart
    const { cartItems, cartSummary } = await fetchUserCart(userId);

    return NextResponse.json(
      {
        success: true,
        message: 'Item added to cart successfully',
        data: cartItems,
        cartSummary,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error adding to cart:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add item to cart' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cart
 * Updates quantity of an existing cart item or item in cart.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawUserId = body.user_id || body.userId;
    const rawCartId = body.cart_id || body.cartId || body.id;
    const rawSubCategoryId = body.subcategory_id || body.subcategoryId;
    const rawQuantity = body.quantity;

    const userId = await getUserIdFromRequest(request, rawUserId);
    if (!userId) {
      return NextResponse.json(
        { error: 'User identification required.' },
        { status: 401 }
      );
    }

    if (rawQuantity === undefined || rawQuantity === null) {
      return NextResponse.json(
        { error: 'quantity is required.' },
        { status: 400 }
      );
    }

    const quantity = parseFloat(rawQuantity);
    if (isNaN(quantity) || quantity < 0) {
      return NextResponse.json(
        { error: 'Quantity must be a non-negative number.' },
        { status: 400 }
      );
    }

    // If quantity is 0, delete the item from cart
    if (quantity === 0) {
      if (rawCartId) {
        await query('DELETE FROM cart WHERE id = ? AND user_id = ?', [rawCartId, userId]);
      } else if (rawSubCategoryId) {
        await query('DELETE FROM cart WHERE subcategory_id = ? AND user_id = ?', [rawSubCategoryId, userId]);
      }
    } else {
      let targetRow: any = null;
      if (rawCartId) {
        const rows = await query<any[]>('SELECT * FROM cart WHERE id = ? AND user_id = ?', [rawCartId, userId]);
        targetRow = rows[0];
      } else if (rawSubCategoryId) {
        const rows = await query<any[]>('SELECT * FROM cart WHERE subcategory_id = ? AND user_id = ?', [rawSubCategoryId, userId]);
        targetRow = rows[0];
      }

      if (!targetRow) {
        return NextResponse.json(
          { error: 'Cart item not found.' },
          { status: 404 }
        );
      }

      // Check stock
      const subCheck = await query<any[]>('SELECT stock, subcategory_name FROM subcategories WHERE id = ?', [targetRow.subcategory_id]);
      if (subCheck && subCheck[0] && subCheck[0].stock !== null && subCheck[0].stock !== undefined) {
        if (quantity > Number(subCheck[0].stock)) {
          return NextResponse.json(
            { error: `Requested quantity (${quantity}) exceeds available stock (${subCheck[0].stock}) for "${subCheck[0].subcategory_name}".` },
            { status: 400 }
          );
        }
      }

      await query('UPDATE cart SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [quantity, targetRow.id]);
    }

    const { cartItems, cartSummary } = await fetchUserCart(userId);

    return NextResponse.json({
      success: true,
      message: 'Cart updated successfully',
      data: cartItems,
      cartSummary,
    });
  } catch (error: any) {
    console.error('Error updating cart:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update cart item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cart
 * Deletes a single item or clears the entire cart for the user.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const rawUserId = searchParams.get('userId') || searchParams.get('user_id');
    const rawCartId = searchParams.get('cartId') || searchParams.get('cart_id') || searchParams.get('id');
    const rawSubCategoryId = searchParams.get('subcategoryId') || searchParams.get('subcategory_id');
    const clearAll = searchParams.get('clearAll') === 'true' || searchParams.get('clear_all') === 'true';

    const userId = await getUserIdFromRequest(request, rawUserId);
    if (!userId) {
      return NextResponse.json(
        { error: 'User identification required.' },
        { status: 401 }
      );
    }

    if (clearAll) {
      await query('DELETE FROM cart WHERE user_id = ?', [userId]);
    } else if (rawCartId) {
      await query('DELETE FROM cart WHERE id = ? AND user_id = ?', [rawCartId, userId]);
    } else if (rawSubCategoryId) {
      await query('DELETE FROM cart WHERE subcategory_id = ? AND user_id = ?', [rawSubCategoryId, userId]);
    } else {
      return NextResponse.json(
        { error: 'Please specify cart_id, subcategory_id, or clearAll=true.' },
        { status: 400 }
      );
    }

    const { cartItems, cartSummary } = await fetchUserCart(userId);

    return NextResponse.json({
      success: true,
      message: clearAll ? 'Cart cleared successfully' : 'Item removed from cart successfully',
      data: cartItems,
      cartSummary,
    });
  } catch (error: any) {
    console.error('Error removing cart item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove cart item' },
      { status: 500 }
    );
  }
}
