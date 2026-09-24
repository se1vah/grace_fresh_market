import mysql from 'mysql2/promise';
import { query, initShopDb } from '@/lib/db';

export interface CreateNotificationInput {
  userId?: number | string | null;
  orderId?: number | string | null;
  title: string;
  content: string;
  type?: string;
}

export interface NotificationRecord {
  id: number;
  userId: number | null;
  orderId: number | null;
  title: string;
  content: string;
  type: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface GetNotificationsOptions {
  limit?: number;
  offset?: number;
  type?: string;
}

/**
 * Validates and parses a numeric ID (userId, orderId), returning null if empty or invalid.
 */
function parseNullableId(value?: number | string | null): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Inserts a new notification record into the Notification table.
 * 
 * Supports both direct execution and transactional execution by passing an optional PoolConnection.
 * 
 * @param input - The notification details { userId, orderId, title, content, type }
 * @param connection - Optional MySQL transaction/pool connection
 * @returns The newly created NotificationRecord
 * 
 * @example
 * const notification = await insertNotification({
 *   userId: 12,
 *   orderId: 105,
 *   title: 'Order Packed! 📦',
 *   content: 'Your fresh produce for order #GFM-105 is packed and ready for delivery.',
 *   type: 'order'
 * });
 */
export async function insertNotification(
  input: CreateNotificationInput,
  connection?: mysql.PoolConnection
): Promise<NotificationRecord> {
  const cleanTitle = (input.title || '').trim();
  const cleanContent = (input.content || '').trim();

  if (!cleanTitle) {
    throw new Error('Notification title is required.');
  }

  if (!cleanContent) {
    throw new Error('Notification content is required.');
  }

  const userId = parseNullableId(input.userId);
  const orderId = parseNullableId(input.orderId);
  const type = (input.type || 'general').trim().toLowerCase() || 'general';

  const insertSql = `
    INSERT INTO \`Notification\` (userId, orderId, title, content, type)
    VALUES (?, ?, ?, ?, ?)
  `;
  const insertParams = [userId, orderId, cleanTitle, cleanContent, type];

  let insertId: number;

  if (connection) {
    const [result] = await connection.query<mysql.ResultSetHeader>(insertSql, insertParams);
    insertId = result.insertId;

    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT id, userId, orderId, title, content, type, createdAt, updatedAt FROM `Notification` WHERE id = ? LIMIT 1',
      [insertId]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      const row = rows[0];
      return {
        id: Number(row.id),
        userId: row.userId !== null && row.userId !== undefined ? Number(row.userId) : null,
        orderId: row.orderId !== null && row.orderId !== undefined ? Number(row.orderId) : null,
        title: String(row.title),
        content: String(row.content),
        type: String(row.type),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }
  } else {
    await initShopDb();
    const result = await query<mysql.ResultSetHeader>(insertSql, insertParams);
    insertId = result.insertId;

    const rows = await query<any[]>(
      'SELECT id, userId, orderId, title, content, type, createdAt, updatedAt FROM `Notification` WHERE id = ? LIMIT 1',
      [insertId]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      const row = rows[0];
      return {
        id: Number(row.id),
        userId: row.userId !== null && row.userId !== undefined ? Number(row.userId) : null,
        orderId: row.orderId !== null && row.orderId !== undefined ? Number(row.orderId) : null,
        title: String(row.title),
        content: String(row.content),
        type: String(row.type),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }
  }

  // Fallback return
  const now = new Date();
  return {
    id: insertId,
    userId,
    orderId,
    title: cleanTitle,
    content: cleanContent,
    type,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Alias for insertNotification
 */
export const createNotification = insertNotification;

/**
 * Retrieves notifications for a given user, ordered newest first.
 */
export async function getNotificationsByUserId(
  userId: number | string,
  options?: GetNotificationsOptions
): Promise<NotificationRecord[]> {
  const parsedUserId = parseNullableId(userId);
  if (!parsedUserId) return [];

  const limit = options?.limit && options.limit > 0 ? Math.min(options.limit, 100) : 50;
  const offset = options?.offset && options.offset >= 0 ? options.offset : 0;
  const filterType = options?.type ? options.type.trim().toLowerCase() : null;

  let sql = 'SELECT id, userId, orderId, title, content, type, createdAt, updatedAt FROM `Notification` WHERE userId = ?';
  const params: any[] = [parsedUserId];

  if (filterType) {
    sql += ' AND type = ?';
    params.push(filterType);
  }

  sql += ' ORDER BY createdAt DESC, id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = await query<any[]>(sql, params);

  if (!Array.isArray(rows)) return [];

  return rows.map((row) => ({
    id: Number(row.id),
    userId: row.userId !== null && row.userId !== undefined ? Number(row.userId) : null,
    orderId: row.orderId !== null && row.orderId !== undefined ? Number(row.orderId) : null,
    title: String(row.title),
    content: String(row.content),
    type: String(row.type),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

/**
 * Retrieves a single notification by ID.
 */
export async function getNotificationById(
  id: number | string
): Promise<NotificationRecord | null> {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) return null;

  const rows = await query<any[]>(
    'SELECT id, userId, orderId, title, content, type, createdAt, updatedAt FROM `Notification` WHERE id = ? LIMIT 1',
    [parsedId]
  );

  if (!Array.isArray(rows) || rows.length === 0) return null;

  const row = rows[0];
  return {
    id: Number(row.id),
    userId: row.userId !== null && row.userId !== undefined ? Number(row.userId) : null,
    orderId: row.orderId !== null && row.orderId !== undefined ? Number(row.orderId) : null,
    title: String(row.title),
    content: String(row.content),
    type: String(row.type),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Deletes a notification by ID (with optional userId ownership verification).
 */
export async function deleteNotificationById(
  id: number | string,
  userId?: number | string
): Promise<boolean> {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) return false;

  const parsedUserId = parseNullableId(userId);

  let sql = 'DELETE FROM `Notification` WHERE id = ?';
  const params: any[] = [parsedId];

  if (parsedUserId) {
    sql += ' AND userId = ?';
    params.push(parsedUserId);
  }

  const result = await query<mysql.ResultSetHeader>(sql, params);
  return result.affectedRows > 0;
}

export default insertNotification;
