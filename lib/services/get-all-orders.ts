import fs from 'fs';
import path from 'path';
import { query } from '@/lib/db';
import { markNotificationAsRead } from '@/lib/services/notification';

export const DEFAULT_SUBCATEGORY_IMAGE = '/app-images/subCategoryDefault.png';

export interface OrderStatus {
  id: number;
  orderId: number;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface PaymentMethod {
  id: number;
  paymentType: string;
  description: string;
}

export interface OrderAddress {
  id: number | null;
  building_name: string;
  street_name: string;
  city: string;
  state: string;
  pincode: string;
  address_type: string;
  buildingName?: string;
  streetName?: string;
  addressType?: string;
}

export interface OrderCategory {
  id: number;
  categoryName: string;
  categoryType: string;
  status?: string;
}

export interface OrderSubcategory {
  id: number;
  subcategoryName: string;
  amount: number;
  images: string[];
  category: OrderCategory;
}

export interface OrderItem {
  id: number;
  categoryId: number;
  subcategoryId: number;
  quantity: number;
  itemTotal: number;
  subcategory: OrderSubcategory;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CartSummary {
  totalItems: number;
  itemCount: number;
  totalAmount: number;
  deliveryFee: number;
  total: number;
}

export interface OrderUserInfo {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  profileImage: string | null;
  createdAt?: string | Date;
}

export interface UserOrder {
  id: number;
  userId: number;
  user?: OrderUserInfo | null;
  subTotal: number;
  totalItems: number;
  deliveryFee: number;
  total: number;
  paymentMethodId: number | null;
  paymentMethod: PaymentMethod | null;
  address: OrderAddress | null;
  orderStatus: OrderStatus | null;
  statusHistory: OrderStatus[];
  items: OrderItem[];
  cartSummary: CartSummary;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface OrderRow {
  id: number;
  userId: number;
  subTotal: unknown;
  totalItems: unknown;
  deliveryFee: unknown;
  total: unknown;
  paymentMethodId: number | null;
  addressid: number | null;
  building_name: string | null;
  street_name: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  address_type: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface OrderStatusRow {
  id: number;
  orderId: number;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface OrderItemRow {
  id: number;
  orderId: number;
  categoryId: number;
  subcategoryId: number;
  subcategoryName: string;
  price: unknown;
  itemTotal?: unknown;
  categoryName: string;
  categoryType: string;
  quantity: unknown;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface PaymentMethodRow {
  id: number;
  paymentType: string;
  description: string;
}

interface AddressRow {
  id: number;
  building_name: string | null;
  street_name: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  address_type: string | null;
}

interface CategoryRow {
  id: number;
  category_name: string;
  category_type: string;
  status: string;
}

interface SubcategoryRow {
  id: number;
  subcategory_name: string;
  amount: unknown;
  category_id: number;
  status: string;
}

interface ImageRow {
  subcategory_id: number;
  image_url: string | null;
}

function inPlaceholders(ids: number[]): string {
  return ids.map(() => '?').join(',');
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value: unknown): number {
  return Number(toNumber(value).toFixed(2));
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

function publicFileExists(imageUrl: string): boolean {
  const trimmed = imageUrl.trim();
  if (!trimmed) {
    return false;
  }

  // Remote URLs (e.g. Vercel Blob) are considered valid directly
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return true;
  }

  if (trimmed.includes('..')) {
    return false;
  }

  const relative = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  const absolutePath = path.join(process.cwd(), 'public', relative);
  return fs.existsSync(absolutePath);
}

function resolveSubcategoryImages(urls: string[]): string[] {
  const valid = urls.filter((url) => isNonEmptyString(url) && publicFileExists(url));
  if (valid.length > 0) {
    return valid;
  }
  return [DEFAULT_SUBCATEGORY_IMAGE];
}

function formatLiveAddress(row: AddressRow): OrderAddress {
  const building_name = row.building_name || '';
  const street_name = row.street_name || '';
  const city = row.city || '';
  const state = row.state || '';
  const pincode = row.pincode || '';
  const address_type = row.address_type || '';

  return {
    id: row.id,
    building_name,
    street_name,
    city,
    state,
    pincode,
    address_type,
    buildingName: building_name,
    streetName: street_name,
    addressType: address_type,
  };
}

function formatSnapshotAddress(order: OrderRow): OrderAddress | null {
  const snapshotFields = [
    order.building_name,
    order.street_name,
    order.city,
    order.state,
    order.pincode,
    order.address_type,
  ];

  const hasSnapshot = snapshotFields.some((field) => isNonEmptyString(field));
  if (!hasSnapshot) {
    return null;
  }

  const building_name = order.building_name || '';
  const street_name = order.street_name || '';
  const city = order.city || '';
  const state = order.state || '';
  const pincode = order.pincode || '';
  const address_type = order.address_type || '';

  return {
    id: order.addressid ?? null,
    building_name,
    street_name,
    city,
    state,
    pincode,
    address_type,
    buildingName: building_name,
    streetName: street_name,
    addressType: address_type,
  };
}

function resolveCategory(
  categoryId: number,
  historicalName: string,
  historicalType: string,
  categoryMap: Record<number, CategoryRow>
): OrderCategory {
  const live = categoryMap[categoryId];
  if (live && live.status === 'active') {
    return {
      id: live.id,
      categoryName: live.category_name,
      categoryType: live.category_type,
      status: live.status,
    };
  }

  return {
    id: categoryId,
    categoryName: historicalName || live?.category_name || '',
    categoryType: historicalType || live?.category_type || '',
    ...(live ? { status: live.status } : {}),
  };
}

export interface GetAllOrdersOptions {
  userId?: number;
  orderId?: number;
}

export async function getAllOrders(options?: GetAllOrdersOptions): Promise<UserOrder[]> {
  const userId = options?.userId;
  const orderId = options?.orderId;
  const conditions: string[] = [];
  const params: (number | string)[] = [];

  if (userId !== undefined) {
    conditions.push('userId = ?');
    params.push(userId);
  }

  if (orderId !== undefined) {
    conditions.push('id = ?');
    params.push(orderId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const orders = await query<OrderRow[]>(
    `SELECT
        id,
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
        address_type,
        createdAt,
        updatedAt
     FROM \`Order\`
     ${whereClause}
     ORDER BY id DESC`,
    params
  );

  if (!orders || orders.length === 0) {
    return [];
  }

  const orderIds = orders.map((order) => order.id);
  const userIds = [
    ...new Set(
      orders
        .map((order) => order.userId)
        .filter((id): id is number => id !== null && id !== undefined && Number(id) > 0)
    ),
  ];
  const paymentMethodIds = [
    ...new Set(
      orders
        .map((order) => order.paymentMethodId)
        .filter((id): id is number => id !== null && id !== undefined && Number(id) > 0)
    ),
  ];
  const addressIds = [
    ...new Set(
      orders
        .map((order) => order.addressid)
        .filter((id): id is number => id !== null && id !== undefined && Number(id) > 0)
    ),
  ];

  const statusRows =
    orderIds.length > 0
      ? await query<OrderStatusRow[]>(
        `SELECT id, orderId, status, createdAt, updatedAt
           FROM OrderStatus
           WHERE orderId IN (${inPlaceholders(orderIds)})
           ORDER BY id ASC`,
        orderIds
      )
      : [];

  const itemRows =
    orderIds.length > 0
      ? await query<OrderItemRow[]>(
        `SELECT
              id,
              orderId,
              categoryId,
              subcategoryId,
              subcategoryName,
              price,
              itemTotal,
              categoryName,
              categoryType,
              quantity,
              createdAt,
              updatedAt
           FROM OrderItems
           WHERE orderId IN (${inPlaceholders(orderIds)})
           ORDER BY id ASC`,
        orderIds
      )
      : [];

  const paymentRows =
    paymentMethodIds.length > 0
      ? await query<PaymentMethodRow[]>(
        `SELECT id, paymentType, description
           FROM PaymentMethod
           WHERE id IN (${inPlaceholders(paymentMethodIds)})`,
        paymentMethodIds
      )
      : [];

  const addressRows =
    addressIds.length > 0
      ? await query<AddressRow[]>(
        `SELECT id, building_name, street_name, city, state, pincode, address_type
           FROM user_addresses
           WHERE id IN (${inPlaceholders(addressIds)})`,
        addressIds
      )
      : [];

  const categoryIds = [
    ...new Set(
      itemRows
        .map((item) => item.categoryId)
        .filter((id): id is number => id !== null && id !== undefined && Number(id) > 0)
    ),
  ];
  const subcategoryIds = [
    ...new Set(
      itemRows
        .map((item) => item.subcategoryId)
        .filter((id): id is number => id !== null && id !== undefined && Number(id) > 0)
    ),
  ];

  const categoryRows =
    categoryIds.length > 0
      ? await query<CategoryRow[]>(
        `SELECT id, category_name, category_type, status
           FROM categories
           WHERE id IN (${inPlaceholders(categoryIds)})`,
        categoryIds
      )
      : [];

  const subcategoryRows =
    subcategoryIds.length > 0
      ? await query<SubcategoryRow[]>(
        `SELECT id, subcategory_name, amount, category_id, status
           FROM subcategories
           WHERE id IN (${inPlaceholders(subcategoryIds)})`,
        subcategoryIds
      )
      : [];

  const imageRows =
    subcategoryIds.length > 0
      ? await query<ImageRow[]>(
        `SELECT subcategory_id, image_url
           FROM subcategory_images
           WHERE subcategory_id IN (${inPlaceholders(subcategoryIds)})
           ORDER BY is_primary DESC, id ASC`,
        subcategoryIds
      )
      : [];

  const statusesByOrder: Record<number, OrderStatus[]> = {};
  for (const row of statusRows || []) {
    if (!statusesByOrder[row.orderId]) {
      statusesByOrder[row.orderId] = [];
    }
    statusesByOrder[row.orderId].push({
      id: row.id,
      orderId: row.orderId,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  const itemsByOrder: Record<number, OrderItemRow[]> = {};
  for (const row of itemRows || []) {
    if (!itemsByOrder[row.orderId]) {
      itemsByOrder[row.orderId] = [];
    }
    itemsByOrder[row.orderId].push(row);
  }

  const paymentMap: Record<number, PaymentMethod> = {};
  for (const row of paymentRows || []) {
    paymentMap[row.id] = {
      id: row.id,
      paymentType: row.paymentType,
      description: row.description,
    };
  }

  const addressMap: Record<number, AddressRow> = {};
  for (const row of addressRows || []) {
    addressMap[row.id] = row;
  }

  const categoryMap: Record<number, CategoryRow> = {};
  for (const row of categoryRows || []) {
    categoryMap[row.id] = row;
  }

  const subcategoryMap: Record<number, SubcategoryRow> = {};
  for (const row of subcategoryRows || []) {
    subcategoryMap[row.id] = row;
  }

  const imagesMap: Record<number, string[]> = {};
  for (const row of imageRows || []) {
    if (!imagesMap[row.subcategory_id]) {
      imagesMap[row.subcategory_id] = [];
    }
    if (row.image_url) {
      imagesMap[row.subcategory_id].push(row.image_url);
    }
  }

  interface UserQueryRow {
    id: number;
    fullName: string | null;
    email: string | null;
    phoneNumber: string | null;
    profileImage: string | null;
    created_at: string | Date;
  }

  const userRows =
    userIds.length > 0
      ? await query<UserQueryRow[]>(
        `SELECT id, fullName, email, phoneNumber, profileImage, created_at
           FROM users
           WHERE id IN (${inPlaceholders(userIds)})`,
        userIds
      )
      : [];

  const userMap: Record<number, OrderUserInfo> = {};
  for (const row of userRows || []) {
    userMap[row.id] = {
      id: row.id,
      fullName: row.fullName || 'Customer',
      email: row.email || '',
      phoneNumber: row.phoneNumber || '',
      profileImage: row.profileImage || null,
      createdAt: row.created_at,
    };
  }

  return orders.map((order) => {
    const statusHistory = statusesByOrder[order.id] || [];
    const orderStatus = statusHistory.length > 0 ? statusHistory[statusHistory.length - 1] : null;
    const paymentMethod =
      order.paymentMethodId != null ? paymentMap[order.paymentMethodId] || null : null;

    let address: OrderAddress | null = null;
    if (order.addressid != null && addressMap[order.addressid]) {
      address = formatLiveAddress(addressMap[order.addressid]);
    } else {
      address = formatSnapshotAddress(order);
    }

    const rawItems = itemsByOrder[order.id] || [];
    const items: OrderItem[] = rawItems.map((item) => {
      const historicalAmount = money(item.price);
      const quantity = toNumber(item.quantity);
      const itemTotal = item.itemTotal != null && !isNaN(Number(item.itemTotal))
        ? money(item.itemTotal)
        : money(historicalAmount * quantity);

      const liveSub = subcategoryMap[item.subcategoryId];
      const useLiveSub = liveSub && liveSub.status === 'active';

      const category = resolveCategory(
        useLiveSub ? liveSub.category_id : item.categoryId,
        item.categoryName,
        item.categoryType,
        categoryMap
      );
      const subcategory: OrderSubcategory = useLiveSub
        ? {
          id: liveSub.id,
          subcategoryName: liveSub.subcategory_name,
          amount: money(liveSub.amount),
          images: resolveSubcategoryImages(imagesMap[liveSub.id] || []),
          category,
        }
        : {
          id: item.subcategoryId,
          subcategoryName: item.subcategoryName || liveSub?.subcategory_name || '',
          amount: historicalAmount,
          images: resolveSubcategoryImages(imagesMap[item.subcategoryId] || []),
          category,
        };

      return {
        id: item.id,
        categoryId: item.categoryId,
        subcategoryId: item.subcategoryId,
        quantity,
        itemTotal,
        subcategory,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    const subTotal = money(order.subTotal);
    const deliveryFee = money(order.deliveryFee);
    const totalItems = toNumber(order.totalItems);

    return {
      id: order.id,
      userId: order.userId,
      user: userMap[order.userId] || null,
      subTotal,
      totalItems,
      deliveryFee,
      total: money(order.total),
      paymentMethodId: order.paymentMethodId ?? null,
      paymentMethod,
      address,
      orderStatus,
      statusHistory,
      items,
      cartSummary: {
        totalItems,
        itemCount: items.length,
        totalAmount: subTotal,
        deliveryFee,
        total: money(order.total),
      },
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  });
}

export async function getAllOrdersForUser(userId: number): Promise<UserOrder[]> {
  return getAllOrders({ userId });
}

export interface GetOrderByIdOptions {
  userId?: number;
  notificationId?: number | string | null;
}

export async function getOrderById(
  orderId: number,
  optionsOrNotificationId?: GetOrderByIdOptions | number | string | null,
  notificationIdArg?: number | string | null
): Promise<UserOrder | null> {
  let userId: number | undefined;
  let notificationId: number | string | null = null;
  if (typeof optionsOrNotificationId === 'object' && optionsOrNotificationId !== null) {
    userId = optionsOrNotificationId.userId;
    notificationId = optionsOrNotificationId.notificationId ?? null;
  } else if (
    typeof optionsOrNotificationId === 'number' ||
    typeof optionsOrNotificationId === 'string'
  ) {
    notificationId = optionsOrNotificationId;
  }

  if (notificationIdArg !== undefined && notificationIdArg !== null) {
    notificationId = notificationIdArg;
  }
  if (notificationId !== null && notificationId !== undefined && notificationId !== '') {
    const parsedNotificationId = Number(notificationId);
    if (Number.isInteger(parsedNotificationId) && parsedNotificationId > 0) {
      try {
        await markNotificationAsRead(parsedNotificationId, true, userId);
      } catch (err) {
        console.error(`[getOrderById] Error marking notification #${notificationId} as read:`, err);
      }
    }
  }

  const orders = await getAllOrders({ orderId, userId });
  return orders.length > 0 ? orders[0] : null;
}
