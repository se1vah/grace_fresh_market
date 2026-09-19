import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifyShopToken, SHOP_COOKIE_NAME } from '@/lib/auth/shop-jwt';
import { getActiveOrderForCategory } from '@/lib/services/order-status-check';
import path from 'path';
import fs from 'fs/promises';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function sanitizeSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'category';
}

async function safeRemoveImageFile(imagePath: string) {
  if (imagePath && imagePath.startsWith('/images/category/')) {
    const filename = imagePath.replace('/images/category/', '');
    const absolutePath = path.join(process.cwd(), 'public', 'images', 'category', filename);
    try {
      await fs.unlink(absolutePath);
    } catch (err) {
      // Ignore if file doesn't exist or already removed
    }
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SHOP_COOKIE_NAME)?.value;
    const user = token ? await verifyShopToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const categoryId = parseInt(id, 10);

    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }

    const existingRows = await query<any[]>('SELECT * FROM categories WHERE id = ?', [categoryId]);
    if (!existingRows.length) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const existingCategory = existingRows[0];
    const formData = await request.formData();
    const categoryName = (formData.get('category_name') as string || existingCategory.category_name).trim();
    const categoryType = (formData.get('category_type') as string || existingCategory.category_type || 'gram').toLowerCase();
    const status = (formData.get('status') as string || existingCategory.status).toLowerCase();
    const imageFile = formData.get('image') as File | string | null;

    if (!categoryName) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    if (!['gram', 'quantity'].includes(categoryType)) {
      return NextResponse.json({ error: 'Category type must be gram or quantity' }, { status: 400 });
    }

    if (!['active', 'inactive'].includes(status)) {
      return NextResponse.json({ error: 'Status must be active or inactive' }, { status: 400 });
    }

    // Check if category is being marked inactive while subcategories exist
    if (existingCategory.status === 'active' && status === 'inactive') {
      const subCatCount = await query<any[]>(
        'SELECT COUNT(*) as total FROM subcategories WHERE category_id = ?',
        [categoryId]
      );
      const subCatTotal = subCatCount[0]?.total ? Number(subCatCount[0].total) : 0;
      if (subCatTotal > 0) {
        return NextResponse.json(
          { error: 'Cannot make this category inactive because it has item assigned to it.' },
          { status: 400 }
        );
      }
    }

    // Check if category has any active orders (status not in 'delivered', 'cancelled')
    if (status === 'inactive') {
      const orderCheck = await getActiveOrderForCategory(categoryId);
      if (orderCheck.hasActiveOrders) {
        return NextResponse.json(
          {
            error: `Cannot make this category inactive because order #${orderCheck.orderId} is currently in '${orderCheck.status}' status. All orders must be delivered or cancelled first.`,
            message: `Cannot make this category inactive because order #${orderCheck.orderId} is currently in '${orderCheck.status}' status. All orders must be delivered or cancelled first.`,
          },
          { status: 400 }
        );
      }
    }

    let finalImagePath = existingCategory.image;

    // Check if user uploaded a new image file
    if (imageFile && typeof imageFile === 'object' && imageFile instanceof File && imageFile.size > 0) {
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

      let ext = 'jpg';
      if (imageFile.type.includes('png')) ext = 'png';
      else if (imageFile.type.includes('webp')) ext = 'webp';
      else if (imageFile.type.includes('jpeg') || imageFile.type.includes('jpg')) ext = 'jpg';

      const slug = sanitizeSlug(categoryName);
      const filename = `${slug}-${Date.now()}.${ext}`;

      const uploadDir = path.join(process.cwd(), 'public', 'images', 'category');
      await fs.mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, filename);
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      finalImagePath = `/images/category/${filename}`;

      // Clean up previous image file if it exists and changed
      if (existingCategory.image !== finalImagePath) {
        await safeRemoveImageFile(existingCategory.image);
      }
    }

    await query(
      'UPDATE categories SET category_name = ?, image = ?, category_type = ?, status = ? WHERE id = ?',
      [categoryName, finalImagePath, categoryType, status, categoryId]
    );

    return NextResponse.json({
      success: true,
      message: 'Category updated successfully',
      data: {
        id: categoryId,
        category_name: categoryName,
        image: finalImagePath,
        category_type: categoryType,
        status,
      },
    });
  } catch (error: any) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SHOP_COOKIE_NAME)?.value;
    const user = token ? await verifyShopToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const categoryId = parseInt(id, 10);

    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }

    const existingRows = await query<any[]>('SELECT * FROM categories WHERE id = ?', [categoryId]);
    if (!existingRows.length) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const existingCategory = existingRows[0];

    // Check if category has any subcategories assigned
    const subCatCount = await query<any[]>(
      'SELECT COUNT(*) as total FROM subcategories WHERE category_id = ?',
      [categoryId]
    );
    const subCatTotal = subCatCount[0]?.total ? Number(subCatCount[0].total) : 0;
    if (subCatTotal > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete this category because it has item assigned to it. Please remove or reassign the item first.',
        },
        { status: 400 }
      );
    }

    // Check if category has any active orders (status not in 'delivered', 'cancelled')
    const orderCheck = await getActiveOrderForCategory(categoryId);
    if (orderCheck.hasActiveOrders) {
      return NextResponse.json(
        {
          error: `Cannot delete this category because order #${orderCheck.orderId} is currently in '${orderCheck.status}' status. All orders must be delivered or cancelled first.`,
          message: `Cannot delete this category because order #${orderCheck.orderId} is currently in '${orderCheck.status}' status. All orders must be delivered or cancelled first.`,
        },
        { status: 400 }
      );
    }

    // Delete record from DB
    await query('DELETE FROM categories WHERE id = ?', [categoryId]);

    // Clean up image file from filesystem
    await safeRemoveImageFile(existingCategory.image);

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete category' },
      { status: 500 }
    );
  }
}
