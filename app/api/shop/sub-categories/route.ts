import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifyShopToken, SHOP_COOKIE_NAME } from '@/lib/auth/shop-jwt';
import { uploadFile } from '@/lib/blob';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function sanitizeSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'subcategory';
}

function formatSubCategoryRow(row: any, imagesList: string[] = []) {
  const subCategoryType = row.sub_category_type || row.subCategoryType || 'gram';
  return {
    id: row.id,
    subcategoryName: row.subcategory_name,
    subcategory_name: row.subcategory_name,
    subCategoryType,
    sub_category_type: subCategoryType,
    images: imagesList,
    status: row.status,
    amount: Number(row.amount),
    stock: row.stock !== null && row.stock !== undefined ? Number(row.stock) : null,
    offer: Number(row.offer || 0),
    categoryId: row.category_id,
    category_id: row.category_id,
    category: {
      id: row.category_id,
      categoryName: row.category_name,
      category_name: row.category_name,
      image: row.category_image,
      status: row.category_status,
      createdAt: row.category_created_at,
      updatedAt: row.category_updated_at,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/shop/sub-categories - Public access (unauthenticated)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    let page = parseInt(searchParams.get('page') || '1', 10);
    let limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = (searchParams.get('search') || '').trim();
    const categoryId = (searchParams.get('categoryId') || searchParams.get('category_id') || '').trim();

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    // Build dynamic WHERE clause
    const whereConditions: string[] = ["c.status = 'active'"];
    const queryParams: any[] = [];

    // Filter by specific Category ID if specified and not 'all'
    if (categoryId && categoryId !== 'all') {
      const parsedCatId = parseInt(categoryId, 10);
      if (!isNaN(parsedCatId)) {
        whereConditions.push('s.category_id = ?');
        queryParams.push(parsedCatId);
      }
    }

    // Filter by Search pattern
    if (search) {
      const searchPattern = `%${search}%`;
      whereConditions.push('(s.subcategory_name LIKE ?)');
      queryParams.push(searchPattern);
    }

    const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count query - Only include subcategories belonging to active categories
    const countSql = `SELECT COUNT(*) as total 
       FROM subcategories s 
       JOIN categories c ON s.category_id = c.id 
       ${whereSql}`;

    const countResult = await query<any[]>(countSql, queryParams);
    const total = countResult[0]?.total ? Number(countResult[0].total) : 0;

    const totalPages = Math.ceil(total / limit) || 1;

    if (page > totalPages && totalPages > 0) {
      page = totalPages;
    }

    const offset = (page - 1) * limit;

    const selectFields = `
      s.id,
      s.category_id,
      s.subcategory_name,
      s.sub_category_type,
      s.status,
      s.amount,
      s.stock,
      s.offer,
      s.created_at,
      s.updated_at,
      c.category_name,
      c.image as category_image,
      c.status as category_status,
      c.created_at as category_created_at,
      c.updated_at as category_updated_at
    `;

    const listSql = `SELECT ${selectFields}
       FROM subcategories s
       JOIN categories c ON s.category_id = c.id
       ${whereSql}
       ORDER BY s.id DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

    const rawRows = await query<any[]>(listSql, queryParams);

    // Fetch images from subcategory_images table for the retrieved subcategories
    const subCategoryIds = rawRows.map((r) => r.id);
    const imagesMap: Record<number, string[]> = {};

    if (subCategoryIds.length > 0) {
      const imgRows = await query<any[]>(
        `SELECT subcategory_id, image_url 
         FROM subcategory_images 
         WHERE subcategory_id IN (${subCategoryIds.map(() => '?').join(',')}) 
         ORDER BY is_primary DESC, id ASC`,
        subCategoryIds
      );

      imgRows.forEach((imgRow) => {
        if (!imagesMap[imgRow.subcategory_id]) {
          imagesMap[imgRow.subcategory_id] = [];
        }
        imagesMap[imgRow.subcategory_id].push(imgRow.image_url);
      });
    }

    const formattedData = rawRows.map((row) =>
      formatSubCategoryRow(row, imagesMap[row.id] || [])
    );

    return NextResponse.json({
      success: true,
      data: formattedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching subcategories:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subcategories' },
      { status: 500 }
    );
  }
}

// POST /api/shop/sub-categories - Protected access (requires admin JWT token)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SHOP_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in.' },
        { status: 401 }
      );
    }

    const user = await verifyShopToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired session. Please log in again.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const categoryIdRaw = formData.get('category_id') || formData.get('categoryId');
    const subcategoryName = (formData.get('subcategory_name') || formData.get('subcategoryName') || '').toString().trim();
    const subCategoryType = (formData.get('subCategoryType') || formData.get('sub_category_type') || 'gram').toString().toLowerCase();
    const status = (formData.get('status') || 'active').toString().trim();
    const amountRaw = formData.get('amount');
    const stockRaw = formData.get('stock');
    const offerRaw = formData.get('offer');

    if (!categoryIdRaw) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    if (!['gram', 'quantity'].includes(subCategoryType)) {
      return NextResponse.json(
        { error: 'subCategoryType must be "gram" or "quantity"' },
        { status: 400 }
      );
    }

    const categoryId = parseInt(categoryIdRaw.toString(), 10);
    if (isNaN(categoryId) || categoryId < 1) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }

    // Verify parent category exists and is ACTIVE
    const catCheck = await query<any[]>(
      'SELECT id, status, category_name FROM categories WHERE id = ?',
      [categoryId]
    );

    if (!catCheck || catCheck.length === 0) {
      return NextResponse.json(
        { error: 'Selected parent category does not exist' },
        { status: 400 }
      );
    }

    if (catCheck[0].status !== 'active') {
      return NextResponse.json(
        { error: `Cannot add subcategory under inactive category "${catCheck[0].category_name}"` },
        { status: 400 }
      );
    }

    if (!subcategoryName) {
      return NextResponse.json(
        { error: 'SubCategory name is required' },
        { status: 400 }
      );
    }

    const amount = parseFloat(amountRaw ? amountRaw.toString() : '0');
    if (isNaN(amount) || amount < 0) {
      return NextResponse.json(
        { error: 'Amount must be a non-negative number' },
        { status: 400 }
      );
    }

    // Optional stock validation
    let stock: number | null = null;
    if (stockRaw !== null && stockRaw !== undefined && stockRaw.toString().trim() !== '') {
      const parsedStock = parseInt(stockRaw.toString().trim(), 10);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return NextResponse.json(
          { error: 'Stock must be a non-negative whole number' },
          { status: 400 }
        );
      }
      stock = parsedStock;
    }

    // Optional offer percentage validation
    let offer = 0;
    if (offerRaw !== null && offerRaw !== undefined && offerRaw.toString().trim() !== '') {
      const parsedOffer = parseFloat(offerRaw.toString().trim());
      if (isNaN(parsedOffer) || parsedOffer < 0 || parsedOffer > 100) {
        return NextResponse.json(
          { error: 'Offer percentage must be a valid number between 0 and 100' },
          { status: 400 }
        );
      }
      offer = parsedOffer;
    }

    // Collect all uploaded image files
    const rawFiles = [
      ...formData.getAll('images'),
      ...formData.getAll('image'),
    ].filter(
      (item) => item && typeof item === 'object' && item instanceof File && item.size > 0
    ) as File[];

    const savedImagePaths: string[] = [];

    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid image format for file "${file.name}". Allowed formats: JPEG, JPG, PNG, WEBP.` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Image "${file.name}" exceeds maximum limit of 5MB.` },
          { status: 400 }
        );
      }

      let ext = '.jpg';
      if (file.type.includes('png')) ext = '.png';
      else if (file.type.includes('webp')) ext = '.webp';
      else if (file.type.includes('jpeg') || file.type.includes('jpg')) ext = '.jpg';
      else if (file.name && file.name.includes('.')) ext = '.' + file.name.split('.').pop();

      const cleanSlug = sanitizeSlug(subcategoryName);
      const filename = `${cleanSlug}-${Date.now()}-${i + 1}${ext}`;

      // Upload to Vercel Blob in 'subcategory' folder
      const blob = await uploadFile(file, filename, { folder: 'subcategory' });
      savedImagePaths.push(blob.url);
    }

    const primaryImage = savedImagePaths[0] || '';
    const imagesJson = JSON.stringify(savedImagePaths);

    const insertResult = await query<any>(
      `INSERT INTO subcategories (category_id, subcategory_name, sub_category_type, status, amount, stock, offer) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [categoryId, subcategoryName, subCategoryType, status, amount, stock, offer]
    );

    const newSubCategoryId = insertResult.insertId;

    // Insert individual rows into subcategory_images table
    for (let i = 0; i < savedImagePaths.length; i++) {
      await query(
        `INSERT INTO subcategory_images (subcategory_id, image_url, is_primary) VALUES (?, ?, ?)`,
        [newSubCategoryId, savedImagePaths[i], i === 0 ? 1 : 0]
      );
    }

    const rawNewRow = await query<any[]>(
      `SELECT s.*, c.category_name, c.image as category_image, c.status as category_status
       FROM subcategories s
       JOIN categories c ON s.category_id = c.id
       WHERE s.id = ?`,
      [newSubCategoryId]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'SubCategory created successfully',
        data: formatSubCategoryRow(rawNewRow[0], savedImagePaths),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating subcategory:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subcategory' },
      { status: 500 }
    );
  }
}
