import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifyShopToken, SHOP_COOKIE_NAME } from '@/lib/auth/shop-jwt';
import { getActiveOrderForSubcategory } from '@/lib/services/order-status-check';
import { uploadFile, deleteFile } from '@/lib/blob';

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

// GET /api/shop/sub-categories/:id - Public access (unauthenticated)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subCategoryId = parseInt(id, 10);

    if (isNaN(subCategoryId)) {
      return NextResponse.json({ error: 'Invalid subcategory ID' }, { status: 400 });
    }

    const rows = await query<any[]>(
      `SELECT 
        s.id, s.category_id, s.subcategory_name, s.sub_category_type, s.status, s.amount, s.stock, s.offer, s.created_at, s.updated_at,
        c.category_name, c.image as category_image, c.status as category_status, c.created_at as category_created_at, c.updated_at as category_updated_at
       FROM subcategories s
       JOIN categories c ON s.category_id = c.id
       WHERE s.id = ?`,
      [subCategoryId]
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'SubCategory not found' }, { status: 404 });
    }

    const imgRows = await query<any[]>(
      `SELECT image_url FROM subcategory_images WHERE subcategory_id = ? ORDER BY is_primary DESC, id ASC`,
      [subCategoryId]
    );

    const imagesList = imgRows.map((r) => r.image_url);

    return NextResponse.json({
      success: true,
      data: formatSubCategoryRow(rows[0], imagesList),
    });
  } catch (error: any) {
    console.error('Error fetching subcategory by id:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subcategory' },
      { status: 500 }
    );
  }
}

// PUT /api/shop/sub-categories/:id - Admin Auth Required
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
    const subCategoryId = parseInt(id, 10);

    if (isNaN(subCategoryId)) {
      return NextResponse.json({ error: 'Invalid subcategory ID' }, { status: 400 });
    }

    const existingRows = await query<any[]>('SELECT * FROM subcategories WHERE id = ?', [subCategoryId]);
    if (!existingRows.length) {
      return NextResponse.json({ error: 'SubCategory not found' }, { status: 404 });
    }

    const existingSubCategory = existingRows[0];
    const formData = await request.formData();

    const categoryIdRaw = formData.get('category_id') as string;
    const subcategoryName = (formData.get('subcategory_name') as string || existingSubCategory.subcategory_name).trim();
    const subCategoryTypeRaw = formData.get('subCategoryType') || formData.get('sub_category_type');
    const subCategoryType = (subCategoryTypeRaw ? subCategoryTypeRaw.toString() : (existingSubCategory.sub_category_type || 'gram')).toLowerCase();
    const status = (formData.get('status') as string || existingSubCategory.status).toLowerCase();
    const amountRaw = formData.get('amount') as string;
    const stockRaw = formData.get('stock') as string | null;
    const offerRaw = formData.get('offer') as string | null;

    if (!['gram', 'quantity'].includes(subCategoryType)) {
      return NextResponse.json(
        { error: 'subCategoryType must be "gram" or "quantity"' },
        { status: 400 }
      );
    }

    // Validate Category
    let categoryId = existingSubCategory.category_id;
    if (categoryIdRaw && categoryIdRaw !== 'select' && !isNaN(parseInt(categoryIdRaw, 10))) {
      categoryId = parseInt(categoryIdRaw, 10);
    }
    const catRows = await query<any[]>('SELECT * FROM categories WHERE id = ?', [categoryId]);
    if (!catRows.length) {
      return NextResponse.json({ error: 'Selected category does not exist' }, { status: 400 });
    }

    if (catRows[0].status !== 'active') {
      return NextResponse.json(
        { error: 'Selected category must be in active state' },
        { status: 400 }
      );
    }

    // Validate SubCategory Name
    if (!subcategoryName) {
      return NextResponse.json({ error: 'SubCategory name is required' }, { status: 400 });
    }

    // Validate Status
    if (!['active', 'inactive'].includes(status)) {
      return NextResponse.json({ error: 'Status must be active or inactive' }, { status: 400 });
    }

    // Check if subcategory has any active orders (status not in 'delivered', 'cancelled')
    if (status === 'inactive') {
      const orderCheck = await getActiveOrderForSubcategory(subCategoryId);
      if (orderCheck.hasActiveOrders) {
        return NextResponse.json(
          {
            error: `Cannot make this subcategory inactive because order #${orderCheck.orderId} is currently in '${orderCheck.status}' status. All orders must be delivered or cancelled first.`,
            message: `Cannot make this subcategory inactive because order #${orderCheck.orderId} is currently in '${orderCheck.status}' status. All orders must be delivered or cancelled first.`,
          },
          { status: 400 }
        );
      }
    }

    // Validate Amount
    let amount = existingSubCategory.amount;
    if (amountRaw !== null && amountRaw !== undefined && amountRaw.trim() !== '') {
      const parsedAmount = parseFloat(amountRaw);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        return NextResponse.json(
          { error: 'Amount must be a valid non-negative number' },
          { status: 400 }
        );
      }
      amount = parsedAmount;
    }

    // Validate Stock
    let stock = existingSubCategory.stock !== null && existingSubCategory.stock !== undefined ? Number(existingSubCategory.stock) : null;
    if (stockRaw !== null && stockRaw !== undefined) {
      const trimmedStock = stockRaw.trim();
      if (trimmedStock === '') {
        stock = null;
      } else {
        const parsedStock = parseInt(trimmedStock, 10);
        if (isNaN(parsedStock) || parsedStock < 0) {
          return NextResponse.json(
            { error: 'Stock must be a non-negative whole number' },
            { status: 400 }
          );
        }
        stock = parsedStock;
      }
    }

    // Validate Offer percentage
    let offer = existingSubCategory.offer !== null && existingSubCategory.offer !== undefined ? Number(existingSubCategory.offer) : 0;
    if (offerRaw !== null && offerRaw !== undefined) {
      const trimmedOffer = offerRaw.trim();
      if (trimmedOffer === '') {
        offer = 0;
      } else {
        const parsedOffer = parseFloat(trimmedOffer);
        if (isNaN(parsedOffer) || parsedOffer < 0 || parsedOffer > 100) {
          return NextResponse.json(
            { error: 'Offer percentage must be a valid number between 0 and 100' },
            { status: 400 }
          );
        }
        offer = parsedOffer;
      }
    }

    // Fetch existing images from subcategory_images table
    const dbImgRows = await query<any[]>(
      'SELECT image_url FROM subcategory_images WHERE subcategory_id = ? ORDER BY is_primary DESC, id ASC',
      [subCategoryId]
    );
    const currentDbImages = dbImgRows.map((r) => r.image_url);

    // Multi-Image Handling from Form Data
    let existingImagesList: string[] = [];
    const rawExistingImages = [
      ...formData.getAll('existing_images'),
      ...formData.getAll('existingImages'),
    ];

    if (rawExistingImages.length > 0) {
      existingImagesList = rawExistingImages.map((img) => img.toString()).filter(Boolean);
    } else {
      const newFilesPresent = formData.getAll('images').length > 0 || formData.getAll('image').length > 0;
      if (!newFilesPresent && !formData.has('existing_images') && !formData.has('existingImages')) {
        existingImagesList = currentDbImages;
      }
    }

    // Identify images removed by user
    const removedImages = currentDbImages.filter((img) => !existingImagesList.includes(img));
    if (removedImages.length > 0) {
      await deleteFile(removedImages);
      for (const removedImg of removedImages) {
        await query(
          'DELETE FROM subcategory_images WHERE subcategory_id = ? AND image_url = ?',
          [subCategoryId, removedImg]
        );
      }
    }

    // Save new files uploaded
    const newFiles = [
      ...formData.getAll('images'),
      ...formData.getAll('image'),
    ].filter(
      (item) => item && typeof item === 'object' && item instanceof File && item.size > 0
    ) as File[];

    const savedNewImages: string[] = [];

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid image format for file "${file.name}". Allowed formats: JPG, JPEG, PNG, WEBP` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Image "${file.name}" exceeds maximum limit of 5MB` },
          { status: 400 }
        );
      }

      let ext = '.jpg';
      if (file.type.includes('png')) ext = '.png';
      else if (file.type.includes('webp')) ext = '.webp';
      else if (file.type.includes('jpeg') || file.type.includes('jpg')) ext = '.jpg';
      else if (file.name && file.name.includes('.')) ext = '.' + file.name.split('.').pop();

      const slug = sanitizeSlug(subcategoryName);
      const filename = `${slug}-${Date.now()}-${i + 1}${ext}`;

      // Upload to Vercel Blob in 'subcategory' folder
      const blob = await uploadFile(file, filename, { folder: 'subcategory' });

      savedNewImages.push(blob.url);

      // Insert new image into subcategory_images
      await query(
        'INSERT INTO subcategory_images (subcategory_id, image_url, is_primary) VALUES (?, ?, ?)',
        [subCategoryId, blob.url, 0]
      );
    }

    const finalImagesArray = [...existingImagesList, ...savedNewImages];
    const finalPrimaryImage = finalImagesArray[0] || '';

    // Update primary flag in subcategory_images
    await query('UPDATE subcategory_images SET is_primary = 0 WHERE subcategory_id = ?', [subCategoryId]);
    if (finalPrimaryImage) {
      await query(
        'UPDATE subcategory_images SET is_primary = 1 WHERE subcategory_id = ? AND image_url = ? LIMIT 1',
        [subCategoryId, finalPrimaryImage]
      );
    }

    await query(
      'UPDATE subcategories SET category_id = ?, subcategory_name = ?, sub_category_type = ?, status = ?, amount = ?, stock = ?, offer = ? WHERE id = ?',
      [categoryId, subcategoryName, subCategoryType, status, amount, stock, offer, subCategoryId]
    );

    // Fetch updated row with category info
    const fetchedRows = await query<any[]>(
      `SELECT 
        s.id, s.category_id, s.subcategory_name, s.sub_category_type, s.status, s.amount, s.stock, s.offer, s.created_at, s.updated_at,
        c.category_name, c.image as category_image, c.status as category_status, c.created_at as category_created_at, c.updated_at as category_updated_at
       FROM subcategories s
       JOIN categories c ON s.category_id = c.id
       WHERE s.id = ?`,
      [subCategoryId]
    );

    const formattedData = fetchedRows.length ? formatSubCategoryRow(fetchedRows[0], finalImagesArray) : null;

    return NextResponse.json({
      success: true,
      message: 'SubCategory updated successfully',
      data: formattedData,
    });
  } catch (error: any) {
    console.error('Error updating subcategory:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update subcategory' },
      { status: 500 }
    );
  }
}

// DELETE /api/shop/sub-categories/:id - Admin Auth Required
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
    const subCategoryId = parseInt(id, 10);

    if (isNaN(subCategoryId)) {
      return NextResponse.json({ error: 'Invalid subcategory ID' }, { status: 400 });
    }

    const existingRows = await query<any[]>('SELECT * FROM subcategories WHERE id = ?', [subCategoryId]);
    if (!existingRows.length) {
      return NextResponse.json({ error: 'SubCategory not found' }, { status: 404 });
    }

    const existingSubCategory = existingRows[0];

    // Check if subcategory has any active orders (status not in 'delivered', 'cancelled')
    const orderCheck = await getActiveOrderForSubcategory(subCategoryId);
    if (orderCheck.hasActiveOrders) {
      return NextResponse.json(
        {
          error: `Cannot delete this subcategory because order #${orderCheck.orderId} is currently in '${orderCheck.status}' status. All orders must be delivered or cancelled first.`,
          message: `Cannot delete this subcategory because order #${orderCheck.orderId} is currently in '${orderCheck.status}' status. All orders must be delivered or cancelled first.`,
        },
        { status: 400 }
      );
    }

    // Fetch images to delete from disk
    const imgRows = await query<any[]>(
      'SELECT image_url FROM subcategory_images WHERE subcategory_id = ?',
      [subCategoryId]
    );
    const imagesToDelete = imgRows.map((r) => r.image_url);

    // Clean up all image files (Vercel Blob & legacy local files)
    if (imagesToDelete.length > 0) {
      await deleteFile(imagesToDelete);
    }

    // Delete record from subcategories DB (ON DELETE CASCADE handles subcategory_images)
    await query('DELETE FROM subcategories WHERE id = ?', [subCategoryId]);

    return NextResponse.json({
      success: true,
      message: 'SubCategory deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting subcategory:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete subcategory' },
      { status: 500 }
    );
  }
}
