import { getPool, initShopDb, query } from '@/lib/db';
import { deleteFile } from '@/lib/blob';
import { getActiveOrdersForUser, UserActiveOrderCheckResult } from '@/lib/services/order-status-check';

export class UserDeleteError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode = 400, code = 'USER_DELETE_ERROR', details?: any) {
    super(message);
    this.name = 'UserDeleteError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export interface HardDeleteUserResult {
  success: boolean;
  message: string;
  deletedUser: {
    id: number;
    fullName: string;
    email: string;
    phoneNumber?: string;
  };
  deletedCounts: {
    user: number;
    orders: number;
    orderItems: number;
    orderStatuses: number;
    notifications: number;
    cartItems: number;
    addresses: number;
    sessions: number;
  };
}

/**
 * Hard deletes a user and all their associated data from the database and storage.
 * 
 * Pre-condition check:
 * Validates that the user does not have any active orders (i.e. orders whose current
 * status is not 'delivered' or 'cancelled'). If active orders exist, rejects with UserDeleteError.
 */
export async function hardDeleteUser(userId: number): Promise<HardDeleteUserResult> {
  await initShopDb();

  // 1. Verify user exists
  const existingUsers = await query<any[]>(
    'SELECT id, fullName, email, phoneNumber, profileImage FROM users WHERE id = ? LIMIT 1',
    [userId]
  );

  if (!existingUsers || existingUsers.length === 0) {
    throw new UserDeleteError('User not found.', 404, 'USER_NOT_FOUND');
  }

  const user = existingUsers[0];

  // 2. Pre-condition Check: Active Orders
  const orderCheck: UserActiveOrderCheckResult = await getActiveOrdersForUser(userId);
  if (orderCheck.hasActiveOrders && orderCheck.activeOrders.length > 0) {
    const primaryOrder = orderCheck.activeOrders[0];
    throw new UserDeleteError(
      `Cannot delete user because order #${primaryOrder.orderId} is currently in '${primaryOrder.status}' status. All orders must be delivered or cancelled first.`,
      400,
      'USER_HAS_ACTIVE_ORDERS',
      {
        hasActiveOrders: true,
        activeOrdersCount: orderCheck.activeOrders.length,
        activeOrders: orderCheck.activeOrders,
      }
    );
  }

  // 3. Perform atomic hard delete inside a transaction
  const pool = getPool();
  const connection = await pool.getConnection();

  let deletedOrdersCount = 0;
  let deletedOrderItemsCount = 0;
  let deletedOrderStatusCount = 0;
  let deletedNotificationsCount = 0;
  let deletedCartItemsCount = 0;
  let deletedAddressesCount = 0;
  let deletedSessionsCount = 0;
  let deletedUserCount = 0;

  try {
    await connection.beginTransaction();

    // A. Retrieve all orders belonging to this user
    const [orderRows] = await connection.query<any[]>(
      'SELECT id FROM `Order` WHERE userId = ?',
      [userId]
    );
    const orderIds = (orderRows || []).map((r) => Number(r.id));
    deletedOrdersCount = orderIds.length;

    // B. If user has past orders (delivered/cancelled), clean up order items, status history, and order notifications
    if (orderIds.length > 0) {
      const orderPlaceholders = orderIds.map(() => '?').join(',');

      // Delete notifications referencing user's orders
      const [orderNotifRes] = await connection.query<any>(
        `DELETE FROM Notification WHERE orderId IN (${orderPlaceholders})`,
        orderIds
      );
      deletedNotificationsCount += Number(orderNotifRes?.affectedRows || 0);

      // Delete OrderStatus history
      const [statusRes] = await connection.query<any>(
        `DELETE FROM OrderStatus WHERE orderId IN (${orderPlaceholders})`,
        orderIds
      );
      deletedOrderStatusCount += Number(statusRes?.affectedRows || 0);

      // Delete OrderItems line items
      const [itemsRes] = await connection.query<any>(
        `DELETE FROM OrderItems WHERE orderId IN (${orderPlaceholders})`,
        orderIds
      );
      deletedOrderItemsCount += Number(itemsRes?.affectedRows || 0);

      // Delete Order records
      await connection.query(
        `DELETE FROM \`Order\` WHERE id IN (${orderPlaceholders})`,
        orderIds
      );
    }

    // C. Delete all remaining user notifications
    const [userNotifRes] = await connection.query<any>(
      'DELETE FROM Notification WHERE userId = ?',
      [userId]
    );
    deletedNotificationsCount += Number(userNotifRes?.affectedRows || 0);

    // D. Delete cart items
    const [cartRes] = await connection.query<any>(
      'DELETE FROM cart WHERE user_id = ?',
      [userId]
    );
    deletedCartItemsCount = Number(cartRes?.affectedRows || 0);

    // E. Delete user addresses
    const [addressRes] = await connection.query<any>(
      'DELETE FROM user_addresses WHERE user_id = ?',
      [userId]
    );
    deletedAddressesCount = Number(addressRes?.affectedRows || 0);

    // F. Delete user login sessions
    const [loginRes] = await connection.query<any>(
      'DELETE FROM userLogin WHERE user_id = ?',
      [userId]
    );
    deletedSessionsCount = Number(loginRes?.affectedRows || 0);

    // G. Delete user record from `users`
    const [userRes] = await connection.query<any>(
      'DELETE FROM users WHERE id = ?',
      [userId]
    );
    deletedUserCount = Number(userRes?.affectedRows || 0);

    await connection.commit();
  } catch (dbError) {
    await connection.rollback();
    throw dbError;
  } finally {
    connection.release();
  }

  // 4. Clean up user profile photo from Vercel Blob / local storage
  if (user.profileImage && typeof user.profileImage === 'string' && user.profileImage.trim()) {
    try {
      await deleteFile(user.profileImage);
    } catch (blobErr) {
      console.warn(`[DeleteUser] Non-fatal error cleaning up avatar ${user.profileImage}:`, blobErr);
    }
  }

  return {
    success: true,
    message: 'User and all associated data permanently deleted successfully.',
    deletedUser: {
      id: Number(user.id),
      fullName: user.fullName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
    },
    deletedCounts: {
      user: deletedUserCount,
      orders: deletedOrdersCount,
      orderItems: deletedOrderItemsCount,
      orderStatuses: deletedOrderStatusCount,
      notifications: deletedNotificationsCount,
      cartItems: deletedCartItemsCount,
      addresses: deletedAddressesCount,
      sessions: deletedSessionsCount,
    },
  };
}
