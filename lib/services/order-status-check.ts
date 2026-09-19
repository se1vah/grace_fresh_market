import { query } from '@/lib/db';

export interface ActiveOrderCheckResult {
  hasActiveOrders: boolean;
  orderId?: number;
  status?: string;
}

/**
 * Checks if there are any active orders (whose latest status is not 'delivered' or 'cancelled')
 * containing items from the specified subcategory.
 */
export async function getActiveOrderForSubcategory(
  subcategoryId: number
): Promise<ActiveOrderCheckResult> {
  const rows = await query<any[]>(
    `SELECT oi.orderId, COALESCE(latest_status.status, 'ordered') AS current_status
     FROM OrderItems oi
     LEFT JOIN (
         SELECT os1.orderId, os1.status
         FROM OrderStatus os1
         INNER JOIN (
             SELECT orderId, MAX(id) AS max_id
             FROM OrderStatus
             GROUP BY orderId
         ) os2 ON os1.id = os2.max_id
     ) latest_status ON oi.orderId = latest_status.orderId
     WHERE oi.subcategoryId = ?
       AND LOWER(TRIM(COALESCE(latest_status.status, 'ordered'))) NOT IN ('delivered', 'cancelled')
     LIMIT 1`,
    [subcategoryId]
  );

  if (rows.length > 0) {
    return {
      hasActiveOrders: true,
      orderId: Number(rows[0].orderId),
      status: String(rows[0].current_status),
    };
  }

  return { hasActiveOrders: false };
}

/**
 * Checks if there are any active orders (whose latest status is not 'delivered' or 'cancelled')
 * containing items from the specified category (either directly or via its subcategories).
 */
export async function getActiveOrderForCategory(
  categoryId: number
): Promise<ActiveOrderCheckResult> {
  const rows = await query<any[]>(
    `SELECT oi.orderId, COALESCE(latest_status.status, 'ordered') AS current_status
     FROM OrderItems oi
     LEFT JOIN (
         SELECT os1.orderId, os1.status
         FROM OrderStatus os1
         INNER JOIN (
             SELECT orderId, MAX(id) AS max_id
             FROM OrderStatus
             GROUP BY orderId
         ) os2 ON os1.id = os2.max_id
     ) latest_status ON oi.orderId = latest_status.orderId
     WHERE (oi.categoryId = ? OR oi.subcategoryId IN (SELECT id FROM subcategories WHERE category_id = ?))
       AND LOWER(TRIM(COALESCE(latest_status.status, 'ordered'))) NOT IN ('delivered', 'cancelled')
     LIMIT 1`,
    [categoryId, categoryId]
  );

  if (rows.length > 0) {
    return {
      hasActiveOrders: true,
      orderId: Number(rows[0].orderId),
      status: String(rows[0].current_status),
    };
  }

  return { hasActiveOrders: false };
}
