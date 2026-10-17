import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth/user-jwt';

/**
 * Helper function to fetch user addresses for a list of user IDs
 */
async function fetchUserAddressesMap(userIds: number[]): Promise<Record<number, any[]>> {
  if (!userIds || userIds.length === 0) return {};

  const placeholders = userIds.map(() => '?').join(',');
  const rows = await query<any[]>(
    `SELECT * FROM user_addresses WHERE user_id IN (${placeholders}) ORDER BY is_default DESC, id DESC`,
    userIds
  );

  const map: Record<number, any[]> = {};
  userIds.forEach((id) => {
    map[id] = [];
  });

  (rows || []).forEach((row) => {
    if (!map[row.user_id]) {
      map[row.user_id] = [];
    }
    const rawType = (row.address_type || 'Home').toString();
    map[row.user_id].push({
      id: row.id,
      userId: row.user_id,
      buildingName: row.building_name,
      streetName: row.street_name,
      city: row.city,
      state: row.state || '',
      pincode: row.pincode,
      phoneNumber: row.phone_number || '',
      addressType: rawType.toLowerCase(),
      isDefault: Boolean(row.is_default),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  });

  return map;
}

/**
 * Helper function to fetch cart counts for a list of user IDs
 */
async function fetchUserCartCountsMap(userIds: number[]): Promise<Record<number, number>> {
  if (!userIds || userIds.length === 0) return {};

  const placeholders = userIds.map(() => '?').join(',');
  const rows = await query<any[]>(
    `SELECT user_id, SUM(quantity) as total_cart_items FROM cart WHERE user_id IN (${placeholders}) GROUP BY user_id`,
    userIds
  );

  const map: Record<number, number> = {};
  userIds.forEach((id) => {
    map[id] = 0;
  });

  (rows || []).forEach((row) => {
    map[row.user_id] = Number(row.total_cart_items || 0);
  });

  return map;
}

/**
 * GET /api/users/get-all (or /api/user/get-all, /api/users)
 *
 * Behavior:
 * 1. If authenticated via Cookie (user_token), Bearer header, or query param (id/userId),
 *    returns that specific user's complete profile, addressCount, cartItemCount, and saved addresses.
 * 2. If no cookie/token/id is present or if `all=true` parameter is passed,
 *    returns all registered users (paginated).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const rawId = searchParams.get('id') || searchParams.get('userId') || searchParams.get('user_id');
    const fetchAllExplicit = searchParams.get('all') === 'true' || searchParams.get('fetch_all') === 'true';
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim();
    const pageRaw = parseInt(searchParams.get('page') || '1', 10);
    const limitRaw = parseInt(searchParams.get('limit') || '50', 10);
    const includeAddressesParam = searchParams.get('includeAddresses') || searchParams.get('include_addresses');
    const includeAddresses = includeAddressesParam === null ? true : includeAddressesParam !== 'false';

    const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
    const limit = isNaN(limitRaw) || limitRaw < 1 ? 50 : Math.min(limitRaw, 100);
    const offset = (page - 1) * limit;

    // Check if request has an authenticated user (via Cookie, Bearer token, or explicit userId param)
    const authenticatedUserId = await getUserIdFromRequest(request, rawId);

    // Single User details flow (if cookie/token/id is present and all=true is not explicitly requested)
    if (authenticatedUserId && !fetchAllExplicit) {
      const userRows = await query<any[]>(
        'SELECT id, fullName, email, phoneNumber, profileImage, created_at, updated_at FROM users WHERE id = ?',
        [authenticatedUserId]
      );

      if (!userRows || userRows.length === 0) {
        return NextResponse.json(
          { error: 'User profile not found.' },
          { status: 404 }
        );
      }

      const user = userRows[0];
      const addressesMap = includeAddresses ? await fetchUserAddressesMap([authenticatedUserId]) : {};
      const cartCountsMap = await fetchUserCartCountsMap([authenticatedUserId]);

      const addresses = addressesMap[authenticatedUserId] || [];

      const userDetails = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber || '',
        profileImage: user.profileImage || '',
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        addressCount: addresses.length,
        cartItemCount: cartCountsMap[authenticatedUserId] || 0,
        addresses,
      };

      return NextResponse.json({
        success: true,
        message: 'User details retrieved successfully',
        data: userDetails,
      });
    }

    // List all users flow
    let countSql = 'SELECT COUNT(*) as total FROM users';
    let sql = 'SELECT id, fullName, email, phoneNumber, profileImage, created_at, updated_at FROM users';
    const queryParams: any[] = [];
    const countParams: any[] = [];

    if (search) {
      const searchPattern = `%${search}%`;
      const whereClause = ' WHERE fullName LIKE ? OR email LIKE ? OR phoneNumber LIKE ?';
      countSql += whereClause;
      sql += whereClause;

      countParams.push(searchPattern, searchPattern, searchPattern);
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    sql += ` ORDER BY created_at DESC, id DESC LIMIT ${limit} OFFSET ${offset}`;

    const countResult = await query<any[]>(countSql, countParams);
    const totalUsers = countResult[0]?.total || 0;

    const userRows = await query<any[]>(sql, queryParams);

    const userIds = userRows.map((u) => u.id);
    const addressesMap = includeAddresses ? await fetchUserAddressesMap(userIds) : {};
    const cartCountsMap = await fetchUserCartCountsMap(userIds);

    const formattedUsers = userRows.map((user) => {
      const userAddresses = addressesMap[user.id] || [];
      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber || '',
        profileImage: user.profileImage || '',
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        addressCount: userAddresses.length,
        cartItemCount: cartCountsMap[user.id] || 0,
        addresses: userAddresses,
      };
    });

    const totalPages = Math.ceil(totalUsers / limit) || 1;

    return NextResponse.json({
      success: true,
      message: 'All user details retrieved successfully',
      data: formattedUsers,
      pagination: {
        totalUsers,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    console.error('Error retrieving user details:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve user details' },
      { status: 500 }
    );
  }
}
