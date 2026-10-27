import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyShopToken, SHOP_COOKIE_NAME } from '@/lib/auth/shop-jwt';
import { getOrderById } from '@/lib/services/get-all-orders';
import { parseOrderId } from '@/lib/order-status';
import { generateInvoicePdf, type ShopInvoiceContactInfo } from '@/lib/invoice/generate-invoice-pdf';
import { query } from '@/lib/db';

async function authenticateShop(request: NextRequest) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(SHOP_COOKIE_NAME)?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) return null;
  return verifyShopToken(token);
}

/**
 * GET /api/shop/orders/[id]
 * Retrieves full order details for shop admin management.
 * If query param `format=pdf` is provided or `Accept: application/pdf` header is present,
 * streams the generated PDF invoice directly.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const shopUser = await authenticateShop(request);
    if (!shopUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Shop login required.' },
        { status: 401 }
      );
    }

    const { id: rawParamId } = await params;
    const orderId = parseOrderId(rawParamId);

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid order ID. Must be a positive integer or formatted as #GFM-123.',
        },
        { status: 400 }
      );
    }

    const order = await getOrderById(orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, error: `Order #${orderId} not found.` },
        { status: 404 }
      );
    }

    // Check if client requested PDF invoice download
    const format = request.nextUrl.searchParams.get('format');
    const isPdf =
      format === 'pdf' ||
      request.nextUrl.searchParams.get('download') === 'pdf' ||
      request.headers.get('accept')?.includes('application/pdf');

    if (isPdf) {
      let shopContact: ShopInvoiceContactInfo | undefined;
      try {
        const settings = await query<any[]>(
          'SELECT email, phone_number FROM app_settings ORDER BY id DESC LIMIT 1'
        );
        if (settings && settings.length > 0) {
          shopContact = {
            email: settings[0].email || undefined,
            phoneNumber: settings[0].phone_number || undefined,
          };
        }
      } catch (settingsError) {
        console.warn(
          '[GET /api/shop/orders/[id]] Failed to fetch app settings for invoice:',
          settingsError
        );
      }

      const pdfBuffer = await generateInvoicePdf(order, shopContact);

      return new Response(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Invoice-GFM-${order.id}.pdf"`,
          'Content-Length': String(pdfBuffer.length),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Order retrieved successfully',
      data: order,
    });
  } catch (error: unknown) {
    console.error('[GET /api/shop/orders/[id]] Error fetching order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve order' },
      { status: 500 }
    );
  }
}
