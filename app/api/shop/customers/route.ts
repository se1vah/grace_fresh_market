import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifyShopToken, SHOP_COOKIE_NAME } from '@/lib/auth/shop-jwt';

async function authenticateShop(request: NextRequest) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(SHOP_COOKIE_NAME)?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) return null;
  return verifyShopToken(token);
}

export interface CustomerSummary {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  profileImage: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string | Date | null;
  lastOrderStatus: string | null;
  cartItemCount: number;
  addressCount: number;
  defaultAddress: {
    id: number;
    buildingName: string;
    streetName: string;
    city: string;
    state: string;
    pincode: string;
    addressType: string;
    isDefault: boolean;
  } | null;
  addresses: Array<{
    id: number;
    buildingName: string;
    streetName: string;
    city: string;
    state: string;
    pincode: string;
    addressType: string;
    isDefault: boolean;
  }>;
  recentOrders?: Array<{
    id: number;
    total: number;
    totalItems: number;
    status: string;
    createdAt: string | Date;
  }>;
}

/**
 * GET /api/shop/customers
 * Returns all customers with aggregated order statistics, addresses, and cart items.
 */
export async function GET(request: NextRequest) {
  try {
    const shopUser = await authenticateShop(request);
    if (!shopUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Shop login required.' },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim().toLowerCase();
    const filter = (searchParams.get('filter') || 'all').toLowerCase();
    const customerId = searchParams.get('customerId') ? Number(searchParams.get('customerId')) : null;

    // 1. Fetch Users
    let usersQuery = 'SELECT id, fullName, email, phoneNumber, profileImage, created_at, updated_at FROM users';
    const queryParams: any[] = [];

    if (customerId) {
      usersQuery += ' WHERE id = ?';
      queryParams.push(customerId);
    }

    usersQuery += ' ORDER BY created_at DESC, id DESC';
    const userRows = await query<any[]>(usersQuery, queryParams);

    if (!userRows || userRows.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        stats: {
          totalCustomers: 0,
          activeShoppers: 0,
          newCustomersThisMonth: 0,
          totalLifetimeSpent: 0,
        },
      });
    }

    const userIds = userRows.map((u) => Number(u.id));
    const placeholders = userIds.map(() => '?').join(',');

    // 2. Fetch Addresses for these users
    const addressRows = await query<any[]>(
      `SELECT id, user_id, building_name, street_name, city, state, pincode, address_type, is_default, created_at 
       FROM user_addresses 
       WHERE user_id IN (${placeholders}) 
       ORDER BY is_default DESC, id DESC`,
      userIds
    );

    const addressesMap: Record<number, any[]> = {};
    userIds.forEach((id) => {
      addressesMap[id] = [];
    });

    (addressRows || []).forEach((row) => {
      const uId = Number(row.user_id);
      if (!addressesMap[uId]) addressesMap[uId] = [];
      addressesMap[uId].push({
        id: row.id,
        buildingName: row.building_name || '',
        streetName: row.street_name || '',
        city: row.city || '',
        state: row.state || '',
        pincode: row.pincode || '',
        addressType: (row.address_type || 'Home').toString(),
        isDefault: Boolean(row.is_default),
      });
    });

    // 3. Fetch Cart counts
    let cartCountsMap: Record<number, number> = {};
    try {
      const cartRows = await query<any[]>(
        `SELECT user_id, SUM(quantity) as total_cart_items 
         FROM cart 
         WHERE user_id IN (${placeholders}) 
         GROUP BY user_id`,
        userIds
      );
      (cartRows || []).forEach((row) => {
        cartCountsMap[Number(row.user_id)] = Number(row.total_cart_items || 0);
      });
    } catch (err) {
      console.warn('Could not fetch cart items:', err);
    }

    // 4. Fetch Orders with latest status for these users
    const ordersMap: Record<number, any[]> = {};
    userIds.forEach((id) => {
      ordersMap[id] = [];
    });

    try {
      const orderRows = await query<any[]>(
        `SELECT 
           o.id,
           o.userId,
           o.subTotal,
           o.totalItems,
           o.total,
           o.createdAt,
           os.status
         FROM \`Order\` o
         LEFT JOIN (
           SELECT os1.orderId, os1.status
           FROM OrderStatus os1
           INNER JOIN (
             SELECT orderId, MAX(id) AS maxId
             FROM OrderStatus
             GROUP BY orderId
           ) os2 ON os1.id = os2.maxId
         ) os ON os.orderId = o.id
         WHERE o.userId IN (${placeholders})
         ORDER BY o.createdAt DESC, o.id DESC`,
        userIds
      );

      (orderRows || []).forEach((row) => {
        const uId = Number(row.userId);
        if (!ordersMap[uId]) ordersMap[uId] = [];
        ordersMap[uId].push({
          id: row.id,
          total: Number(row.total || 0),
          totalItems: Number(row.totalItems || 0),
          status: row.status || 'ordered',
          createdAt: row.createdAt,
        });
      });
    } catch (err) {
      console.warn('Could not fetch orders:', err);
    }

    // 5. Combine user details and compute metrics
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let allCustomerSummaries: CustomerSummary[] = userRows.map((user) => {
      const uId = Number(user.id);
      const userOrders = ordersMap[uId] || [];
      const userAddresses = addressesMap[uId] || [];
      const defaultAddr = userAddresses.find((a) => a.isDefault) || userAddresses[0] || null;

      const totalOrders = userOrders.length;
      const totalSpent = userOrders
        .filter((ord) => {
          const s = (ord.status || '').toLowerCase().trim();
          return s !== 'cancelled' && s !== 'canceled';
        })
        .reduce((sum, ord) => sum + (Number(ord.total) || 0), 0);
      const lastOrder = userOrders[0] || null;

      return {
        id: uId,
        fullName: user.fullName || 'Customer',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        profileImage: user.profileImage || null,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        totalOrders,
        totalSpent,
        lastOrderDate: lastOrder ? lastOrder.createdAt : null,
        lastOrderStatus: lastOrder ? lastOrder.status : null,
        cartItemCount: cartCountsMap[uId] || 0,
        addressCount: userAddresses.length,
        defaultAddress: defaultAddr,
        addresses: userAddresses,
        recentOrders: userOrders,
      };
    });

    // 6. Overall Stats Calculation (prior to search filtering)
    const totalCustomers = allCustomerSummaries.length;
    const activeShoppers = allCustomerSummaries.filter((c) => c.totalOrders > 0).length;
    const totalLifetimeSpent = allCustomerSummaries.reduce((acc, c) => acc + c.totalSpent, 0);
    const newCustomersThisMonth = allCustomerSummaries.filter((c) => {
      if (!c.createdAt) return false;
      const d = new Date(c.createdAt);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;

    // 7. Apply Filter
    if (filter === 'with-orders' || filter === 'active') {
      allCustomerSummaries = allCustomerSummaries.filter((c) => c.totalOrders > 0);
    } else if (filter === 'no-orders' || filter === 'new') {
      allCustomerSummaries = allCustomerSummaries.filter((c) => c.totalOrders === 0);
    }

    // 8. Apply Search
    if (search) {
      allCustomerSummaries = allCustomerSummaries.filter((c) => {
        const idStr = String(c.id);
        const name = (c.fullName || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const phone = (c.phoneNumber || '').toLowerCase();
        const city = (c.defaultAddress?.city || '').toLowerCase();
        const street = (c.defaultAddress?.streetName || '').toLowerCase();

        return (
          idStr.includes(search) ||
          `cust-${idStr}`.includes(search) ||
          name.includes(search) ||
          email.includes(search) ||
          phone.includes(search) ||
          city.includes(search) ||
          street.includes(search)
        );
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Customers retrieved successfully',
      data: allCustomerSummaries,
      stats: {
        totalCustomers,
        activeShoppers,
        newCustomersThisMonth,
        totalLifetimeSpent,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/shop/customers] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve customers' },
      { status: 500 }
    );
  }
}
