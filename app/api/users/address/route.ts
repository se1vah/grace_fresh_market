import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth/user-jwt';
import { ResultSetHeader } from 'mysql2';

// Valid enum values for address_type
const ALLOWED_ADDRESS_TYPES = ['Home', 'Work', 'Other'];

// Helper to format database row object for API response
function formatAddressRow(row: any) {
  const rawType = (row.address_type || 'Home').toString();
  return {
    id: row.id,
    userId: row.user_id,
    addressType: rawType.toLowerCase(),
    streetName: row.street_name || '',
    buildingName: row.building_name || '',
    city: row.city || '',
    state: row.state || '',
    pincode: row.pincode || '',
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/users/address (or /api/user/address)
 * Retrieves user addresses.
 * Query Parameters:
 * - userId / user_id (optional if authenticated via JWT)
 * - id / addressId (optional, to fetch a single address)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const rawUserId = searchParams.get('userId') || searchParams.get('user_id');
    const rawAddressId = searchParams.get('id') || searchParams.get('addressId') || searchParams.get('address_id');

    const userId = await getUserIdFromRequest(request, rawUserId);

    if (!userId) {
      return NextResponse.json(
        { error: 'User identification required. Please log in or provide a valid user ID.' },
        { status: 401 }
      );
    }

    if (rawAddressId) {
      const addressId = parseInt(rawAddressId, 10);
      if (isNaN(addressId) || addressId < 1) {
        return NextResponse.json(
          { error: 'Invalid address ID.' },
          { status: 400 }
        );
      }

      const rows = await query<any[]>(
        'SELECT * FROM user_addresses WHERE id = ? AND user_id = ?',
        [addressId, userId]
      );

      if (!rows || rows.length === 0) {
        return NextResponse.json(
          { error: 'Address not found or does not belong to user.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Address retrieved successfully',
        data: formatAddressRow(rows[0]),
      });
    }

    // Fetch all user addresses
    const rows = await query<any[]>(
      'SELECT * FROM user_addresses WHERE user_id = ?',
      [userId]
    );

    const formattedAddresses = (rows || []).map(formatAddressRow);

    return NextResponse.json({
      success: true,
      message: 'User addresses retrieved successfully',
      count: formattedAddresses.length,
      data: formattedAddresses,
    });
  } catch (error: any) {
    console.error('Error retrieving user address:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve user addresses' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/address (or /api/user/address or /api/user/address/create)
 * Adds a new user address.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawUserId = body.userId || body.user_id;

    const userId = await getUserIdFromRequest(request, rawUserId);

    if (!userId) {
      return NextResponse.json(
        { error: 'User identification required. Please log in or provide a valid user ID.' },
        { status: 401 }
      );
    }

    // Check user exists
    const userCheck = await query<any[]>('SELECT id FROM users WHERE id = ?', [userId]);
    if (!userCheck || userCheck.length === 0) {
      return NextResponse.json(
        { error: 'User record not found.' },
        { status: 404 }
      );
    }

    const buildingName = (body.buildingName || body.building_name || '').toString().trim();
    const street = (body.street || body.streetName || body.street_name || '').toString().trim();
    const landmark = (body.landmark || '').toString().trim();
    const city = (body.city || '').toString().trim();
    const state = (body.state || '').toString().trim();
    const zipcode = (body.zipcode || body.pincode || body.zip_code || '').toString().trim();
    const rawAddressType = (body.addressType || body.address_type || 'home').toString().trim();
    let isDefaultInput = body.isDefault !== undefined ? Boolean(body.isDefault) : (body.is_default !== undefined ? Boolean(body.is_default) : false);

    // Validation
    if (!buildingName) {
      return NextResponse.json(
        { error: 'buildingName is required.' },
        { status: 400 }
      );
    }

    if (!street) {
      return NextResponse.json(
        { error: 'street is required.' },
        { status: 400 }
      );
    }

    if (!city) {
      return NextResponse.json(
        { error: 'city is required.' },
        { status: 400 }
      );
    }

    if (!zipcode) {
      return NextResponse.json(
        { error: 'zipcode (or pincode) is required.' },
        { status: 400 }
      );
    }

    // Match address_type case-insensitively
    const matchedType = ALLOWED_ADDRESS_TYPES.find(
      (t) => t.toLowerCase() === rawAddressType.toLowerCase()
    );

    if (!matchedType) {
      return NextResponse.json(
        { error: `Invalid addressType. Allowed values: ${ALLOWED_ADDRESS_TYPES.join(', ')}.` },
        { status: 400 }
      );
    }

    // Check existing address count for this user
    const countRows = await query<any[]>(
      'SELECT COUNT(*) as count FROM user_addresses WHERE user_id = ?',
      [userId]
    );
    const existingCount = countRows[0]?.count || 0;

    // If it's the first address created for the user, make it default automatically
    if (existingCount === 0) {
      isDefaultInput = true;
    }

    // If setting as default, unset previous default addresses for this user
    if (isDefaultInput) {
      await query(
        'UPDATE user_addresses SET is_default = 0 WHERE user_id = ?',
        [userId]
      );
    }

    const result = await query<ResultSetHeader>(
      `INSERT INTO user_addresses (user_id, building_name, street_name, city, state, pincode, address_type, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, buildingName, street, city, state, zipcode, matchedType, isDefaultInput ? 1 : 0]
    );

    const newAddressId = result.insertId;

    const newAddressRows = await query<any[]>(
      'SELECT * FROM user_addresses WHERE id = ?',
      [newAddressId]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'User address added successfully',
        data: formatAddressRow(newAddressRows[0]),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error adding user address:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add user address' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/address
 * Updates an existing user address.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawUserId = body.userId || body.user_id;
    const rawAddressId = body.id || body.addressId || body.address_id;

    const userId = await getUserIdFromRequest(request, rawUserId);

    if (!userId) {
      return NextResponse.json(
        { error: 'User identification required. Please log in or provide a valid user ID.' },
        { status: 401 }
      );
    }

    if (!rawAddressId) {
      return NextResponse.json(
        { error: 'address id is required for update.' },
        { status: 400 }
      );
    }

    const addressId = parseInt(rawAddressId, 10);
    if (isNaN(addressId) || addressId < 1) {
      return NextResponse.json(
        { error: 'Invalid address ID.' },
        { status: 400 }
      );
    }

    // Verify address exists and belongs to user
    const existingRows = await query<any[]>(
      'SELECT * FROM user_addresses WHERE id = ? AND user_id = ?',
      [addressId, userId]
    );

    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { error: 'Address record not found or does not belong to user.' },
        { status: 404 }
      );
    }

    const existing = existingRows[0];

    const buildingName = body.buildingName !== undefined || body.building_name !== undefined
      ? (body.buildingName || body.building_name || '').toString().trim()
      : existing.building_name;

    const street = body.street !== undefined || body.streetName !== undefined || body.street_name !== undefined
      ? (body.street || body.streetName || body.street_name || '').toString().trim()
      : existing.street_name;

    const landmark = body.landmark !== undefined
      ? body.landmark.toString().trim()
      : existing.landmark;

    const city = body.city !== undefined
      ? body.city.toString().trim()
      : existing.city;

    const state = body.state !== undefined
      ? body.state.toString().trim()
      : (existing.state || '');

    const zipcode = body.zipcode !== undefined || body.pincode !== undefined || body.zip_code !== undefined
      ? (body.zipcode || body.pincode || body.zip_code || '').toString().trim()
      : existing.pincode;

    let matchedType = existing.address_type;
    if (body.addressType !== undefined || body.address_type !== undefined) {
      const rawType = (body.addressType || body.address_type || '').toString().trim();
      const found = ALLOWED_ADDRESS_TYPES.find(
        (t) => t.toLowerCase() === rawType.toLowerCase()
      );

      if (!found) {
        return NextResponse.json(
          { error: `Invalid addressType. Allowed values: ${ALLOWED_ADDRESS_TYPES.join(', ')}.` },
          { status: 400 }
        );
      }
      matchedType = found;
    }

    let isDefaultInput = existing.is_default === 1;
    if (body.isDefault !== undefined || body.is_default !== undefined) {
      isDefaultInput = body.isDefault !== undefined ? Boolean(body.isDefault) : Boolean(body.is_default);
    }

    // Validation checks for mandatory fields
    if (!buildingName) {
      return NextResponse.json(
        { error: 'buildingName cannot be empty.' },
        { status: 400 }
      );
    }

    if (!street) {
      return NextResponse.json(
        { error: 'street cannot be empty.' },
        { status: 400 }
      );
    }

    if (!city) {
      return NextResponse.json(
        { error: 'city cannot be empty.' },
        { status: 400 }
      );
    }

    if (!zipcode) {
      return NextResponse.json(
        { error: 'zipcode cannot be empty.' },
        { status: 400 }
      );
    }

    // If updating to default, unset default on other user addresses
    if (isDefaultInput && existing.is_default === 0) {
      await query(
        'UPDATE user_addresses SET is_default = 0 WHERE user_id = ?',
        [userId]
      );
    }

    await query(
      `UPDATE user_addresses 
       SET building_name = ?, street_name = ?, city = ?, state = ?, pincode = ?, address_type = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [buildingName, street, city, state, zipcode, matchedType, isDefaultInput ? 1 : 0, addressId, userId]
    );

    const updatedRows = await query<any[]>(
      'SELECT * FROM user_addresses WHERE id = ?',
      [addressId]
    );

    return NextResponse.json({
      success: true,
      message: 'User address updated successfully',
      data: formatAddressRow(updatedRows[0]),
    });
  } catch (error: any) {
    console.error('Error updating user address:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user address' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/address
 * Deletes a user address.
 * Query Parameters or Body:
 * - id / addressId / address_id (required)
 * - userId / user_id (optional if authenticated)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const body = await request.json().catch(() => ({}));

    const rawUserId = searchParams.get('userId') || searchParams.get('user_id') || body.user_id || body.userId;
    const rawAddressId = searchParams.get('id') || searchParams.get('addressId') || searchParams.get('address_id') || body.id || body.addressId || body.address_id;

    const userId = await getUserIdFromRequest(request, rawUserId);

    if (!userId) {
      return NextResponse.json(
        { error: 'User identification required. Please log in or provide a valid user ID.' },
        { status: 401 }
      );
    }

    if (!rawAddressId) {
      return NextResponse.json(
        { error: 'address id is required for deletion.' },
        { status: 400 }
      );
    }

    const addressId = parseInt(rawAddressId, 10);
    if (isNaN(addressId) || addressId < 1) {
      return NextResponse.json(
        { error: 'Invalid address ID.' },
        { status: 400 }
      );
    }

    // Verify address exists
    const existingRows = await query<any[]>(
      'SELECT id, is_default FROM user_addresses WHERE id = ? AND user_id = ?',
      [addressId, userId]
    );

    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { error: 'Address record not found or does not belong to user.' },
        { status: 404 }
      );
    }

    const wasDefault = existingRows[0].is_default === 1;

    // Delete address
    await query('DELETE FROM user_addresses WHERE id = ? AND user_id = ?', [addressId, userId]);

    // If deleted address was default, set the latest remaining address as default
    if (wasDefault) {
      const remainingRows = await query<any[]>(
        'SELECT id FROM user_addresses WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        [userId]
      );
      if (remainingRows && remainingRows.length > 0) {
        await query('UPDATE user_addresses SET is_default = 1 WHERE id = ?', [remainingRows[0].id]);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Address deleted successfully',
      deletedAddressId: addressId,
    });
  } catch (error: any) {
    console.error('Error deleting user address:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user address' },
      { status: 500 }
    );
  }
}
