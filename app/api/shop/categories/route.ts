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
    .replace(/^-+|-+$/g, '') || 'category';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    let page = parseInt(searchParams.get('page') || '1', 10);
    let limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = (searchParams.get('search') || '').trim();

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    const searchPattern = `%${search}%`;

    // Fetch total count for pagination metadata
    const countSql = search
      ? 'SELECT COUNT(*) as total FROM categories WHERE category_name LIKE ?'
      : 'SELECT COUNT(*) as total FROM categories';
    const countParams = search ? [searchPattern] : [];
    const countResult = await query<any[]>(countSql, countParams);
    const total = countResult[0]?.total ? Number(countResult[0].total) : 0;

    const totalPages = Math.ceil(total / limit) || 1;

    // Adjust page if out of bounds (when items deleted or search changes)
    if (page > totalPages && totalPages > 0) {
      page = totalPages;
    }

    const offset = (page - 1) * limit;

    // Fetch category items
    const rawRows = await query<any[]>(
      search
        ? `SELECT id, category_name, image, status, created_at, updated_at FROM categories WHERE category_name LIKE ? ORDER BY id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`
        : `SELECT id, category_name, image, status, created_at, updated_at FROM categories ORDER BY id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      search ? [searchPattern] : []
    );

    return NextResponse.json({
      success: true,
      data: rawRows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SHOP_COOKIE_NAME)?.value;
    const user = token ? await verifyShopToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const categoryName = (formData.get('category_name') as string || '').trim();
    const status = (formData.get('status') as string || 'active').toLowerCase();
    const imageFile = formData.get('image') as File | null;

    if (!categoryName) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    if (!['active', 'inactive'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be active or inactive' },
        { status: 400 }
      );
    }

    if (!imageFile || !(imageFile instanceof File)) {
      return NextResponse.json(
        { error: 'Category image is required' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(imageFile.type)) {
      return NextResponse.json(
        { error: 'Invalid image format. Allowed formats: JPG, JPEG, PNG, WEBP' },
        { status: 400 }
      );
    }

    if (imageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Image size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Determine extension
    let ext = 'jpg';
    if (imageFile.type.includes('png')) ext = 'png';
    else if (imageFile.type.includes('webp')) ext = 'webp';
    else if (imageFile.type.includes('jpeg') || imageFile.type.includes('jpg')) ext = 'jpg';

    const slug = sanitizeSlug(categoryName);
    const filename = `${slug}-${Date.now()}.${ext}`;

    // Upload to Vercel Blob in 'category' folder
    const blob = await uploadFile(imageFile, filename, { folder: 'category' });
    const publicImagePath = blob.url;

    const insertResult = await query<any>(
      'INSERT INTO categories (category_name, image, status) VALUES (?, ?, ?)',
      [categoryName, publicImagePath, status]
    );

    return NextResponse.json({
      success: true,
      message: 'Category created successfully',
      data: {
        id: insertResult.insertId,
        category_name: categoryName,
        image: publicImagePath,
        status,
      },
    });
  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create category' },
      { status: 500 }
    );
  }
}
