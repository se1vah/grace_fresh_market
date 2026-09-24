import mysql from 'mysql2/promise';
import { getPool, initShopDb, query } from '@/lib/db';
import { emitSocketEvent } from '@/lib/socket';
import { sendShopPushNotification } from '@/lib/notifications/shopPush';
import { userPushNotification } from '@/lib/notifications/userPushNotification';
export {
  getActiveOrderForSubcategory,
  getActiveOrderForCategory,
  type ActiveOrderCheckResult,
} from '@/lib/services/order-status-check';

export class OrderError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'ORDER_ERROR') {
    super(message);
    this.name = 'OrderError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface OrderItemInput {
  subcategoryId: number;
  quantity: number;
}

export interface OrderItemResponse {
  subcategoryId: number;
  subcategoryName: string;
  subcategoryImage: string[];
  quantity: number;
  price: number;
  itemTotal: number;
  categoryId: number;
  categoryName: string;
  categoryType: string;
  total: number;
  subcategory: {
    id: number;
    subcategoryName: string;
    amount: number;
    image: string[];
    stock: number | null;
  };
  category: {
    id: number;
    categoryName: string;
    categoryType: string;
    categoryImage: string;
  };
}

export type OrderStatusType =
  | 'ordered'
  | 'orderd'
  | 'packed'
  | 'out for delivery'
  | 'delivered'
  | 'deliverd'
  | 'cancelled';

export interface OrderAddressDetails {
  id: number;
  userId?: number;
  fullName?: string;
  phoneNumber?: string;
  buildingName: string;
  streetName: string;
  addressLine1?: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  postalCode?: string;
  addressType: string;
  isDefault?: boolean;
}

export interface PaymentMethodDetails {
  id: number;
  paymentType: string;
  description: string;
}

export interface OrderSummaryResponse {
  id: number;
  orderId: string;
  userId: number;
  subTotal: number;
  totalItems: number;
  deliveryFee: number;
  total: number;
  paymentMethodId?: number | null;
  paymentMethod?: PaymentMethodDetails | null;
  addressId?: number | null;
  address?: OrderAddressDetails | null;
  defaultAddress?: OrderAddressDetails | null;
  status?: OrderStatusType;
}

export interface CreateOrderOptions {
  addressId?: number;
  paymentMethodId?: number;
  cartIds?: number[];
}

export interface CreateOrderResult {
  order: OrderSummaryResponse;
  items: OrderItemResponse[];
  defaultAddress?: OrderAddressDetails | null;
  address?: OrderAddressDetails | null;
  paymentMethod?: PaymentMethodDetails | null;
}

interface DeliveryFeeRow extends mysql.RowDataPacket {
  delivery_fee: unknown;
}

interface OrderCountRow extends mysql.RowDataPacket {
  orderCount: number | string;
}

interface SubcategoryWithCategoryRow extends mysql.RowDataPacket {
  subcategory_id: number;
  subcategory_name: string;
  amount: number | string;
  stock: number | string | null;
  subcategory_status: string;
  category_id: number | null;
  category_name: string | null;
  category_type: string | null;
  category_image: string | null;
  category_status: string | null;
}

interface SubcategoryImageRow extends mysql.RowDataPacket {
  subcategory_id: number;
  image_url: string;
}

/**
 * Fetches the delivery fee from the app_settings table.
 * Defaults to 0.00 if unconfigured or null.
 */
export async function fetchDeliveryFee(
  connection?: mysql.PoolConnection
): Promise<number> {
  if (connection) {
    const [rows] = await connection.query<DeliveryFeeRow[]>(
      'SELECT delivery_fee FROM app_settings ORDER BY id DESC LIMIT 1'
    );
    const storedFee = Array.isArray(rows) && rows[0]?.delivery_fee;
    if (storedFee === null || storedFee === undefined) {
      return 0;
    }
    const fee = Number(storedFee);
    return Number.isFinite(fee) && fee >= 0 ? Number(fee.toFixed(2)) : 0;
  }

  const rows = await query<DeliveryFeeRow[]>(
    'SELECT delivery_fee FROM app_settings ORDER BY id DESC LIMIT 1'
  );
  const storedFee = Array.isArray(rows) && rows[0]?.delivery_fee;
  if (storedFee === null || storedFee === undefined) {
    return 0;
  }
  const fee = Number(storedFee);
  return Number.isFinite(fee) && fee >= 0 ? Number(fee.toFixed(2)) : 0;
}

/**
 * Gets the current count of pending orders for shop notification.
 */
export async function getShopPendingOrderCount(): Promise<number> {
  const rows = await query<OrderCountRow[]>(
    `SELECT COUNT(DISTINCT o.id) as orderCount
     FROM \`Order\` o
     LEFT JOIN (
         SELECT os1.orderId, os1.status
         FROM OrderStatus os1
         INNER JOIN (
             SELECT orderId, MAX(id) AS max_id
             FROM OrderStatus
             GROUP BY orderId
         ) os2 ON os1.id = os2.max_id
     ) latest_status ON o.id = latest_status.orderId
     WHERE LOWER(TRIM(COALESCE(latest_status.status, 'ordered'))) IN ('ordered', 'orderd')`
  );
  return Number(rows[0]?.orderCount || 0);
}

export function formatOrderAddress(row: mysql.RowDataPacket): OrderAddressDetails {
  const rawType = (row.address_type || row.addressType || 'Home').toString();
  const bName = (row.building_name || row.buildingName || '').toString();
  const sName = (row.street_name || row.streetName || '').toString();
  const pin = (row.pincode || row.postalCode || row.zipcode || '').toString();

  return {
    id: Number(row.id) || 0,
    userId: Number(row.user_id || row.userId || 0),
    fullName: (row.fullName || row.full_name || '').toString(),
    phoneNumber: (row.phoneNumber || row.phone_number || '').toString(),
    buildingName: bName,
    streetName: sName,
    addressLine1: bName,
    addressLine2: sName,
    city: (row.city || '').toString(),
    state: (row.state || '').toString(),
    pincode: pin,
    postalCode: pin,
    addressType: rawType.toLowerCase(),
    isDefault: Boolean(row.is_default),
  };
}

/**
 * Securely creates an order from validated cart items in a single MySQL transaction.
 * Uses row-level locking (FOR UPDATE) to prevent race conditions and overselling.
 */
export async function createOrderFromCart(
  userId: number,
  items: OrderItemInput[],
  options?: CreateOrderOptions
): Promise<CreateOrderResult> {
  await initShopDb();
  const pool = getPool();
  const connection = await pool.getConnection();

  let orderId: number | null = null;
  let orderSummary: OrderSummaryResponse | null = null;
  const calculatedItemsMap = new Map<
    number,
    {
      subcategoryId: number;
      subcategoryName: string;
      price: number;
      itemTotal: number;
      currentStock: number | null;
      newStock: number | null;
      categoryId: number;
      categoryName: string;
      categoryType: string;
      categoryImage: string;
    }
  >();

  try {
    await connection.beginTransaction();

    // 1. Sort IDs ascending to enforce consistent locking order across transactions and avoid deadlocks
    const requestedIds = items.map((i) => i.subcategoryId);
    const sortedIds = [...requestedIds].sort((a, b) => a - b);

    // 2. Fetch subcategories and parent categories with row-level locking (FOR UPDATE)
    const placeholders = sortedIds.map(() => '?').join(',');
    const [subRows] = await connection.query<SubcategoryWithCategoryRow[]>(
      `SELECT
          s.id AS subcategory_id,
          s.subcategory_name,
          s.amount,
          s.stock,
          s.status AS subcategory_status,
          c.id AS category_id,
          c.category_name,
          c.category_type,
          c.image AS category_image,
          c.status AS category_status
       FROM subcategories s
       LEFT JOIN categories c ON c.id = s.category_id
       WHERE s.id IN (${placeholders})
       FOR UPDATE`,
      sortedIds
    );

    const dbSubcategoryMap = new Map<number, SubcategoryWithCategoryRow>();
    if (Array.isArray(subRows)) {
      for (const row of subRows) {
        dbSubcategoryMap.set(Number(row.subcategory_id), row);
      }
    }

    // 3. Verify every requested subcategory exists
    for (const item of items) {
      if (!dbSubcategoryMap.has(item.subcategoryId)) {
        throw new OrderError(
          `Subcategory not found. (ID: ${item.subcategoryId})`,
          404,
          'SUBCATEGORY_NOT_FOUND'
        );
      }
    }

    // 4. Validate stock for every item (if stock column is configured / not null)
    for (const item of items) {
      const dbRow = dbSubcategoryMap.get(item.subcategoryId)!;
      const subcategoryName = dbRow.subcategory_name || `Subcategory #${item.subcategoryId}`;
      const hasStockLimit = dbRow.stock !== null && dbRow.stock !== undefined;
      const currentStock = hasStockLimit ? Number(dbRow.stock) : null;

      if (hasStockLimit && currentStock !== null && item.quantity > currentStock) {
        throw new OrderError(
          `Insufficient stock for ${subcategoryName}. Available stock: ${currentStock}, requested quantity: ${item.quantity}.`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }

      const unitPrice = Number(dbRow.amount) || 0;
      const itemTotal = Number((unitPrice * item.quantity).toFixed(2));
      const newStock = hasStockLimit && currentStock !== null ? currentStock - item.quantity : null;

      calculatedItemsMap.set(item.subcategoryId, {
        subcategoryId: item.subcategoryId,
        subcategoryName,
        price: unitPrice,
        itemTotal,
        currentStock,
        newStock,
        categoryId: dbRow.category_id ? Number(dbRow.category_id) : 0,
        categoryName: dbRow.category_name || '',
        categoryType: dbRow.category_type || 'gram',
        categoryImage: dbRow.category_image || '',
      });
    }

    // 5. Calculate Order Totals server-side
    let totalItems = 0;
    let subTotal = 0;

    for (const item of items) {
      const calc = calculatedItemsMap.get(item.subcategoryId)!;
      totalItems += item.quantity;
      subTotal += calc.itemTotal;
    }

    subTotal = Number(subTotal.toFixed(2));

    // Fetch delivery fee from DB inside the connection (free delivery if total amount > 400)
    const baseDeliveryFee = await fetchDeliveryFee(connection);
    const deliveryFee = subTotal > 400 ? 0 : baseDeliveryFee;
    const total = Number((subTotal + deliveryFee).toFixed(2));

    // Resolve address snapshot
    let addressid: number | null = options?.addressId ? Number(options.addressId) : null;
    let paymentMethodId: number | null = options?.paymentMethodId ? Number(options.paymentMethodId) : null;
    let selectedAddressRow: mysql.RowDataPacket | null = null;
    let defaultAddressRow: mysql.RowDataPacket | null = null;

    // 1. Fetch user's default address
    const [defaultAddrRows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT ua.*, u.fullName, u.phoneNumber
       FROM user_addresses ua
       LEFT JOIN users u ON u.id = ua.user_id
       WHERE ua.user_id = ? AND ua.is_default = 1
       LIMIT 1`,
      [userId]
    );
    if (Array.isArray(defaultAddrRows) && defaultAddrRows.length > 0) {
      defaultAddressRow = defaultAddrRows[0];
    }

    // 2. Fetch delivery address for order
    if (addressid) {
      const [addrRows] = await connection.query<mysql.RowDataPacket[]>(
        `SELECT ua.*, u.fullName, u.phoneNumber
         FROM user_addresses ua
         LEFT JOIN users u ON u.id = ua.user_id
         WHERE ua.id = ? AND ua.user_id = ?
         LIMIT 1`,
        [addressid, userId]
      );
      if (Array.isArray(addrRows) && addrRows.length > 0) {
        selectedAddressRow = addrRows[0];
      } else {
        throw new OrderError(
          'Selected delivery address not found. Please select a valid address.',
          404,
          'ADDRESS_NOT_FOUND'
        );
      }
    } else {
      if (defaultAddressRow) {
        selectedAddressRow = defaultAddressRow;
        addressid = Number(defaultAddressRow.id);
      } else {
        // Fallback to any saved address for the user
        const [anyAddrRows] = await connection.query<mysql.RowDataPacket[]>(
          `SELECT ua.*, u.fullName, u.phoneNumber
           FROM user_addresses ua
           LEFT JOIN users u ON u.id = ua.user_id
           WHERE ua.user_id = ?
           ORDER BY ua.id DESC
           LIMIT 1`,
          [userId]
        );
        if (Array.isArray(anyAddrRows) && anyAddrRows.length > 0) {
          selectedAddressRow = anyAddrRows[0];
          addressid = Number(anyAddrRows[0].id);
        }
      }
    }

    if (!selectedAddressRow || !addressid) {
      throw new OrderError(
        'Delivery address not found. Please add a delivery address before placing an order.',
        400,
        'ADDRESS_REQUIRED'
      );
    }

    if (!defaultAddressRow) {
      defaultAddressRow = selectedAddressRow;
    }

    const buildingName = selectedAddressRow.building_name || selectedAddressRow.buildingName || '';
    const streetName = selectedAddressRow.street_name || selectedAddressRow.streetName || '';
    const city = selectedAddressRow.city || '';
    const state = selectedAddressRow.state || '';
    const pincode = selectedAddressRow.pincode || selectedAddressRow.postalCode || selectedAddressRow.zipcode || '';
    const addressType = selectedAddressRow.address_type || selectedAddressRow.addressType || 'Home';

    // 3. Resolve payment method
    let selectedPaymentMethod: PaymentMethodDetails | null = null;
    if (paymentMethodId) {
      const [pmRows] = await connection.query<mysql.RowDataPacket[]>(
        'SELECT id, paymentType, description FROM PaymentMethod WHERE id = ? LIMIT 1',
        [paymentMethodId]
      );
      if (Array.isArray(pmRows) && pmRows.length > 0) {
        selectedPaymentMethod = {
          id: Number(pmRows[0].id),
          paymentType: pmRows[0].paymentType,
          description: pmRows[0].description,
        };
      } else {
        throw new OrderError(
          'Selected payment method not found.',
          404,
          'PAYMENT_METHOD_NOT_FOUND'
        );
      }
    } else {
      const [pmRows] = await connection.query<mysql.RowDataPacket[]>(
        'SELECT id, paymentType, description FROM PaymentMethod ORDER BY id ASC LIMIT 1'
      );
      if (Array.isArray(pmRows) && pmRows.length > 0) {
        paymentMethodId = Number(pmRows[0].id);
        selectedPaymentMethod = {
          id: Number(pmRows[0].id),
          paymentType: pmRows[0].paymentType,
          description: pmRows[0].description,
        };
      }
    }

    const formattedDeliveryAddress = formatOrderAddress(selectedAddressRow);

    // 6. Create Order record in `Order` table (quoted reserved MySQL keyword)
    const [orderInsertResult] = await connection.query<mysql.ResultSetHeader>(
      `INSERT INTO \`Order\` (
         userId,
         subTotal,
         totalItems,
         deliveryFee,
         total,
         paymentMethodId,
         addressid,
         building_name,
         street_name,
         city,
         state,
         pincode,
         address_type
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        subTotal,
        totalItems,
        deliveryFee,
        total,
        paymentMethodId,
        addressid,
        buildingName,
        streetName,
        city,
        state,
        pincode,
        addressType,
      ]
    );

    orderId = Number(orderInsertResult.insertId);

    // Insert initial status into OrderStatus table
    await connection.query(
      `INSERT INTO OrderStatus (orderId, status) VALUES (?, 'ordered')`,
      [orderId]
    );

    orderSummary = {
      id: orderId,
      orderId: `#GFM-${orderId}`,
      userId,
      subTotal,
      totalItems,
      deliveryFee,
      total,
      paymentMethod: selectedPaymentMethod,
      address: formattedDeliveryAddress,
      status: 'ordered',
    };

    // 7. Create Order Items records in OrderItems table
    for (const item of items) {
      const calc = calculatedItemsMap.get(item.subcategoryId)!;
      await connection.query(
        `INSERT INTO OrderItems (
           orderId,
           subcategoryId,
           categoryId,
           subcategoryName,
           price,
           categoryName,
           categoryType,
           quantity,
           itemTotal
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.subcategoryId,
          calc.categoryId,
          calc.subcategoryName,
          calc.price,
          calc.categoryName,
          calc.categoryType,
          item.quantity,
          calc.itemTotal,
        ]
      );
    }

    // 8. Safely reduce stock in subcategories (only if stock is configured / not null)
    for (const item of items) {
      const calc = calculatedItemsMap.get(item.subcategoryId)!;
      if (calc.currentStock !== null) {
        const [updateResult] = await connection.query<mysql.ResultSetHeader>(
          'UPDATE subcategories SET stock = stock - ? WHERE id = ? AND stock >= ?',
          [item.quantity, item.subcategoryId, item.quantity]
        );

        if (updateResult.affectedRows === 0) {
          throw new OrderError(
            `Insufficient stock for ${calc.subcategoryName}. Available stock could not fulfill requested quantity of ${item.quantity}.`,
            400,
            'INSUFFICIENT_STOCK'
          );
        }
      }
    }

    // 9. Clean up ordered items from user's cart table
    if (options?.cartIds && options.cartIds.length > 0) {
      const cartPlaceholders = options.cartIds.map(() => '?').join(',');
      await connection.query(
        `DELETE FROM cart WHERE user_id = ? AND id IN (${cartPlaceholders})`,
        [userId, ...options.cartIds]
      );
    } else {
      await connection.query(
        `DELETE FROM cart WHERE user_id = ? AND subcategory_id IN (${placeholders})`,
        [userId, ...sortedIds]
      );
    }

    // 10. Commit the transaction
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  // 11. Post-commit Socket Notification
  try {
    const currentOrderCount = await getShopPendingOrderCount();
    await emitSocketEvent('notify-order-to-shop', {
      orderCount: currentOrderCount,
    });
  } catch (socketError) {
    console.error('[order] Warning: Failed to emit notify-order-to-shop socket event:', socketError);
  }

  // 12 push notification for shop
  try {
    await sendShopPushNotification({
      title: 'New Order Received! 🛒',
      body: `Order #GFM-${orderId} was placed just now.`,
      url: '/shop',
    });
  } catch (pushErr) {
    console.error('[order] Warning: Failed to send shop push notification:', pushErr);
  }

  // 12.1 Push notification for user (type: 'ordered') & store in Notification table
  try {
    await userPushNotification({
      userId,
      title: 'Order Confirmed! 🛒',
      body: `Your order #GFM-${orderId} has been received and is being processed.`,
      url: '/orders',
      orderId,
      type: 'ordered',
      data: {
        orderId: String(orderId),
        status: 'ordered',
        type: 'ordered',
      },
    });
  } catch (userPushErr) {
    console.error('[order] Warning: Failed to send user push notification:', userPushErr);
  }

  // 13. Fetch final images for response
  const subcategoryIds = items.map((i) => i.subcategoryId);
  const imagesMap: Record<number, string[]> = {};

  if (subcategoryIds.length > 0) {
    const [imgRows] = await pool.query<SubcategoryImageRow[]>(
      `SELECT subcategory_id, image_url
       FROM subcategory_images
       WHERE subcategory_id IN (${subcategoryIds.map(() => '?').join(',')})
       ORDER BY is_primary DESC, id ASC`,
      subcategoryIds
    );

    if (Array.isArray(imgRows)) {
      for (const imgRow of imgRows) {
        const subId = Number(imgRow.subcategory_id);
        if (!imagesMap[subId]) {
          imagesMap[subId] = [];
        }
        imagesMap[subId].push(imgRow.image_url);
      }
    }
  }

  // 13. Assemble and return formatted response data
  const formattedItems: OrderItemResponse[] = items.map((item) => {
    const calc = calculatedItemsMap.get(item.subcategoryId)!;
    const images = imagesMap[item.subcategoryId] || [];

    return {
      subcategoryId: item.subcategoryId,
      subcategoryName: calc.subcategoryName,
      subcategoryImage: images,
      quantity: item.quantity,
      price: calc.price,
      itemTotal: calc.itemTotal,
      categoryId: calc.categoryId,
      categoryName: calc.categoryName,
      categoryType: calc.categoryType,
      total: calc.price * calc.itemTotal,
      subcategory: {
        id: item.subcategoryId,
        subcategoryName: calc.subcategoryName,
        amount: calc.price,
        image: images,
        stock: calc.newStock,
      },
      category: {
        id: calc.categoryId,
        categoryName: calc.categoryName,
        categoryType: calc.categoryType,
        categoryImage: calc.categoryImage,
      },
    };
  });

  return {
    order: orderSummary!,
    items: formattedItems,
  };
}
