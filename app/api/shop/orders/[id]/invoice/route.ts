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
 * GET /api/shop/orders/[id]/invoice
 * Generates and downloads the PDF invoice for a given order.
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
        '[GET /api/shop/orders/[id]/invoice] Failed to fetch app settings for invoice:',
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
  } catch (error: unknown) {
    console.error('[GET /api/shop/orders/[id]/invoice] Error generating invoice:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
