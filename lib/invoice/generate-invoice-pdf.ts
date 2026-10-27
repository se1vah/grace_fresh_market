import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import type { UserOrder, OrderItem } from '../services/get-all-orders';

export interface ShopInvoiceContactInfo {
  email?: string;
  phoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
}

export const DEFAULT_SHOP_CONTACT: ShopInvoiceContactInfo = {
  email: 'gracefreshmarket@gmail.com',
  phoneNumber: '8015413414',
  addressLine1: 'Nearby Yagappa Stop, Thangachimadam,',
  addressLine2: 'Rameswaram, Tamilnadu - 623529',
};

// Colors matching the Grace Fresh Market invoice design
const COLORS = {
  primaryGreen: '#1B5E20',       // Dark Theme Green
  headerGreen: '#114D25',        // Accent Deep Green
  textDark: '#111827',           // Slate / Gray 900
  textMuted: '#4B5563',          // Gray 600
  textLight: '#6B7280',          // Gray 500
  borderColor: '#D1D5DB',        // Gray 300
  rowDivider: '#E5E7EB',         // Gray 200
  pillBg: '#EEF3EE',             // Soft Mint
  pillBorder: '#C8E6C9',         // Mint Border
  savingsGreen: '#166534',       // Green for discount
  white: '#FFFFFF',
};

export function normalizeSubCategoryType(type?: string | null): 'gram' | 'quantity' {
  const t = String(type || '').toLowerCase().trim();
  if (t === 'quantity' || t === 'qty') {
    return 'quantity';
  }
  return 'gram';
}

export function formatOrderQuantity(
  rawQuantity: number | string | null | undefined,
  subCategoryType?: string | null
): string {
  const num = typeof rawQuantity === 'number' ? rawQuantity : Number(rawQuantity) || 0;
  const type = normalizeSubCategoryType(subCategoryType);

  if (type === 'quantity') {
    const formattedNum = Number.isInteger(num) ? num.toString() : parseFloat(num.toFixed(2)).toString();
    return `${formattedNum} QTY`;
  }

  if (num > 0 && num < 1) {
    const grams = Math.round(num * 1000);
    return `${grams}g`;
  }

  const formattedKg = Number.isInteger(num) ? num.toString() : parseFloat(num.toFixed(2)).toString();
  return `${formattedKg} KG`;
}

/**
 * Safely fetches remote image or returns fallback buffer/path.
 */
async function resolveImageBuffer(imgUrl?: string): Promise<Buffer | string | null> {
  const fallbackItem = path.join(process.cwd(), 'public/images/invoice-sample-item.jpg');
  const defaultLocal = path.join(process.cwd(), 'public/logo.png');

  if (!imgUrl) {
    if (fs.existsSync(fallbackItem)) return fallbackItem;
    if (fs.existsSync(defaultLocal)) return defaultLocal;
    return null;
  }

  const trimmed = imgUrl.trim();

  // If local path
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    const relative = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
    const localAbs = path.join(process.cwd(), 'public', relative);
    if (fs.existsSync(localAbs)) {
      return localAbs;
    }
    if (fs.existsSync(fallbackItem)) return fallbackItem;
    return defaultLocal;
  }

  // Remote URL (e.g. Vercel Blob)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const resp = await fetch(trimmed, { signal: controller.signal });
    clearTimeout(timeout);
    if (resp.ok) {
      const arrayBuf = await resp.arrayBuffer();
      return Buffer.from(arrayBuf);
    }
  } catch {
    // remote fetch timeout or network error, fallback gracefully
  }

  if (fs.existsSync(fallbackItem)) return fallbackItem;
  if (fs.existsSync(defaultLocal)) return defaultLocal;
  return null;
}

/**
 * Format date string to DD/MM/YYYY in Indian Standard Time (Asia/Kolkata)
 */
function formatOrderDate(dateValue?: string | Date): string {
  if (!dateValue) return 'N/A';
  try {
    const d = new Date(dateValue);
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return formatter.format(d);
  } catch {
    return String(dateValue);
  }
}

/**
 * Format time string to HH:mm:ss in Indian Standard Time (Asia/Kolkata)
 */
function formatOrderTime(dateValue?: string | Date): string {
  if (!dateValue) return 'N/A';
  try {
    const d = new Date(dateValue);
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return formatter.format(d);
  } catch {
    return '00:00:00';
  }
}

/**
 * Generates pixel-perfect PDF matching the Grace Fresh Market uploaded invoice template.
 */
export async function generateInvoicePdf(
  order: UserOrder,
  shopContact?: ShopInvoiceContactInfo
): Promise<Buffer> {
  const contact = { ...DEFAULT_SHOP_CONTACT, ...shopContact };

  const regularFont = path.join(process.cwd(), 'lib/fonts/Roboto-Regular.ttf');
  const boldFont = path.join(process.cwd(), 'lib/fonts/Roboto-Bold.ttf');
  const mediumFont = path.join(process.cwd(), 'lib/fonts/Roboto-Medium.ttf');

  const logoPath = path.join(process.cwd(), 'public/images/invoice-logo.png');
  const bannerPath = path.join(process.cwd(), 'public/images/invoice-banner.png');

  // Pre-load item images in parallel
  const itemImagePromises = (order.items || []).map(async (item) => {
    let imgUri = item.subcategory?.images && item.subcategory.images.length > 0
      ? item.subcategory.images[0]
      : undefined;
    return resolveImageBuffer(imgUri);
  });
  const itemImageBuffers = await Promise.all(itemImagePromises);

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4', // 595.28 x 841.89 points
      margins: { top: 24, bottom: 24, left: 24, right: 24 },
      autoFirstPage: true,
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

    // Register UTF-8 Fonts supporting Indian Rupee ₹ symbol
    if (fs.existsSync(regularFont)) doc.registerFont('AppFont', regularFont);
    if (fs.existsSync(boldFont)) doc.registerFont('AppFont-Bold', boldFont);
    if (fs.existsSync(mediumFont)) doc.registerFont('AppFont-Medium', mediumFont);

    const fontRegular = fs.existsSync(regularFont) ? 'AppFont' : 'Helvetica';
    const fontBold = fs.existsSync(boldFont) ? 'AppFont-Bold' : 'Helvetica-Bold';
    const fontMedium = fs.existsSync(mediumFont) ? 'AppFont-Medium' : 'Helvetica';

    const pageWidth = doc.page.width; // 595.28
    const margin = 24;
    const contentWidth = pageWidth - margin * 2; // 547.28

    let currentY = 24;

    /* ==========================================================================
       1. HEADER SECTION
       ========================================================================== */
    // Left: Logo
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, margin, currentY, { width: 195, height: 43 });
    }

    // Right: Fresh Vegetables "INVOICE" Banner
    const bannerWidth = 232;
    const bannerHeight = 60;
    const bannerX = margin + contentWidth - bannerWidth;
    if (fs.existsSync(bannerPath)) {
      doc.image(bannerPath, bannerX, currentY, { width: bannerWidth, height: bannerHeight });
    }

    // Shop Contact details below Logo: 3 bullet points matching uploaded invoice
    // 1: Address (lines 1 & 2)
    // 2: Phone number
    // 3: Email
    let contactY = currentY + 54;
    const bulletRadius = 2.5;

    // Bullet 1: Address
    doc.circle(margin + 4, contactY + 4.5, bulletRadius).fillColor(COLORS.primaryGreen).fill();
    const addr1 = contact.addressLine1 || DEFAULT_SHOP_CONTACT.addressLine1!;
    const addr2 = contact.addressLine2 || DEFAULT_SHOP_CONTACT.addressLine2!;
    doc
      .font(fontRegular)
      .fontSize(8.5)
      .fillColor(COLORS.textDark)
      .text(`${addr1}\n${addr2}`, margin + 14, contactY, { width: 280, lineGap: 2 });
    contactY += 26;

    // Bullet 2: Phone
    const phoneVal = contact.phoneNumber || DEFAULT_SHOP_CONTACT.phoneNumber!;
    doc.circle(margin + 4, contactY + 4.5, bulletRadius).fillColor(COLORS.primaryGreen).fill();
    doc
      .font(fontRegular)
      .fontSize(8.5)
      .fillColor(COLORS.textDark)
      .text(phoneVal, margin + 14, contactY, { width: 280 });
    contactY += 13.5;

    // Bullet 3: Email
    const emailVal = contact.email || DEFAULT_SHOP_CONTACT.email!;
    doc.circle(margin + 4, contactY + 4.5, bulletRadius).fillColor(COLORS.primaryGreen).fill();
    doc
      .font(fontRegular)
      .fontSize(8.5)
      .fillColor(COLORS.textDark)
      .text(emailVal, margin + 14, contactY, { width: 280 });
    contactY += 14;

    // Right: Metadata Box below Banner
    const metaBoxY = currentY + bannerHeight + 6;
    const metaBoxWidth = bannerWidth;
    const metaBoxHeight = 72;

    doc
      .roundedRect(bannerX, metaBoxY, metaBoxWidth, metaBoxHeight, 6)
      .lineWidth(0.8)
      .strokeColor(COLORS.borderColor)
      .fillColor(COLORS.white)
      .fillAndStroke();

    const metaItems = [
      { label: 'Invoice No', value: `#GFM-${order.id}` },
      { label: 'Order Date', value: formatOrderDate(order.createdAt) },
      { label: 'Order Time', value: formatOrderTime(order.createdAt) },
      {
        label: 'Payment',
        value: order.paymentMethod?.paymentType || 'Cash on Delivery',
      },
    ];

    let metaRowY = metaBoxY + 8;
    for (const item of metaItems) {
      // Small green bullet
      doc.circle(bannerX + 12, metaRowY + 4, bulletRadius).fillColor(COLORS.primaryGreen).fill();

      // Label
      doc
        .font(fontRegular)
        .fontSize(8.5)
        .fillColor(COLORS.textMuted)
        .text(item.label, bannerX + 22, metaRowY);

      // Colon
      doc
        .font(fontRegular)
        .fontSize(8.5)
        .fillColor(COLORS.textMuted)
        .text(':', bannerX + 80, metaRowY);

      // Value
      doc
        .font(fontBold)
        .fontSize(8.5)
        .fillColor(COLORS.textDark)
        .text(item.value, bannerX + 90, metaRowY, { width: metaBoxWidth - 95, lineBreak: false });

      metaRowY += 14.5;
    }

    currentY = Math.max(contactY + 8, metaBoxY + metaBoxHeight + 12);

    // Subtle horizontal divider line
    doc
      .moveTo(margin, currentY)
      .lineTo(margin + contentWidth, currentY)
      .lineWidth(1)
      .strokeColor(COLORS.borderColor)
      .stroke();

    currentY += 12;

    /* ==========================================================================
       2. BILL TO / DELIVERY ADDRESS SECTION
       ========================================================================== */
    const sectionBarHeight = 22;
    doc
      .roundedRect(margin, currentY, contentWidth, sectionBarHeight, 4)
      .fillColor(COLORS.headerGreen)
      .fill();

    doc.circle(margin + 12, currentY + sectionBarHeight / 2, 2.5).fillColor(COLORS.white).fill();
    doc
      .font(fontBold)
      .fontSize(9.5)
      .fillColor(COLORS.white)
      .text('BILL TO / DELIVERY ADDRESS', margin + 22, currentY + 6);

    currentY += sectionBarHeight + 10;

    const customerName =
      order.user?.fullName ||
      (order.address?.building_name ? 'Customer' : 'Valued Customer');
    const contactPhone =
      order.address?.phoneNumber ||
      order.address?.phone_number ||
      order.user?.phoneNumber ||
      '';

    doc
      .font(fontBold)
      .fontSize(10.5)
      .fillColor(COLORS.textDark)
      .text(customerName, margin + 4, currentY);

    currentY += 14;

    if (order.address?.building_name) {
      doc
        .font(fontRegular)
        .fontSize(9)
        .fillColor(COLORS.textMuted)
        .text(order.address.building_name, margin + 4, currentY);
      currentY += 12.5;
    }

    // Street, City, State - Pincode
    const street = (order.address?.street_name || '').trim();
    const city = (order.address?.city || '').trim();
    const state = (order.address?.state || '').trim();
    const pincode = (order.address?.pincode || '').trim();

    let locLine = '';
    if (street) locLine += street;
    if (city && !street.toLowerCase().includes(city.toLowerCase())) {
      locLine += (locLine ? ', ' : '') + city;
    }
    if (state) {
      locLine += (locLine ? ', ' : '') + state;
    }
    if (pincode) {
      locLine += (locLine ? ' - ' : '') + pincode;
    }

    if (locLine) {
      doc
        .font(fontRegular)
        .fontSize(9)
        .fillColor(COLORS.textMuted)
        .text(locLine, margin + 4, currentY);
      currentY += 12.5;
    }

    if (contactPhone) {
      doc
        .font(fontRegular)
        .fontSize(9)
        .fillColor(COLORS.textMuted)
        .text(`Phone: ${contactPhone}`, margin + 4, currentY);
      currentY += 14;
    } else {
      currentY += 4;
    }

    currentY += 4;

    /* ==========================================================================
       3. ORDER ITEMS TABLE
       ========================================================================== */
    const colHash = margin + 12;
    const colItem = margin + 48;
    const colQty = margin + 285;
    const colPrice = margin + 370;
    const colAmountEnd = margin + contentWidth - 12; // right-aligned

    const tableHeaderHeight = 22;
    doc
      .roundedRect(margin, currentY, contentWidth, tableHeaderHeight, 4)
      .fillColor(COLORS.headerGreen)
      .fill();

    doc.font(fontBold).fontSize(9.5).fillColor(COLORS.white);
    doc.text('#', colHash, currentY + 6);
    doc.text('Item', colItem, currentY + 6);
    doc.text('Qty', colQty, currentY + 6);
    doc.text('Unit Price', colPrice, currentY + 6);
    doc.text('Amount', colAmountEnd - 60, currentY + 6, { width: 60, align: 'right' });

    currentY += tableHeaderHeight;

    const items = order.items || [];
    const rowHeight = 48;

    items.forEach((item, index) => {
      const rowY = currentY;
      const subcategoryName = item.subcategory?.subcategoryName || `Item #${item.subcategoryId}`;
      const subCategoryType = item.subcategory?.subCategoryType || (item as any).subCategoryType;
      const typeNorm = normalizeSubCategoryType(subCategoryType);

      const unitFinalPrice =
        (item as any).finalAmount ??
        (item as any).price ??
        item.subcategory?.finalAmount ??
        item.subcategory?.amount ??
        (item.quantity > 0 ? item.itemTotal / item.quantity : 0);

      const unitOriginalPrice =
        item.amount ??
        (item as any).subcategory?.amount ??
        unitFinalPrice;

      const itemDiscount =
        item.discountAmount !== undefined && item.discountAmount !== null && Number(item.discountAmount) > 0
          ? Number(item.discountAmount)
          : (unitOriginalPrice > unitFinalPrice
              ? Number(((unitOriginalPrice - unitFinalPrice) * item.quantity).toFixed(2))
              : 0);

      const originalItemTotal = Number((unitOriginalPrice * item.quantity).toFixed(2));
      const hasDiscount = itemDiscount > 0;

      // 1. # Index
      doc
        .font(fontBold)
        .fontSize(9.5)
        .fillColor(COLORS.textDark)
        .text(String(index + 1), colHash, rowY + 14);

      // 2. Product Thumbnail (36x36 with light border)
      const imgBuffer = itemImageBuffers[index];
      const thumbX = colItem;
      const thumbY = rowY + 6;
      const thumbSize = 34;

      if (imgBuffer) {
        try {
          doc.save();
          doc
            .roundedRect(thumbX, thumbY, thumbSize, thumbSize, 4)
            .clip();
          doc.image(imgBuffer, thumbX, thumbY, {
            width: thumbSize,
            height: thumbSize,
            fit: [thumbSize, thumbSize],
            align: 'center',
            valign: 'center',
          });
          doc.restore();
          // Draw subtle outline
          doc
            .roundedRect(thumbX, thumbY, thumbSize, thumbSize, 4)
            .lineWidth(0.5)
            .strokeColor(COLORS.borderColor)
            .stroke();
        } catch {
          // ignore image render failure
        }
      }

      // 3. Product Title & Discount Subtext
      const textX = thumbX + thumbSize + 8;
      doc
        .font(fontBold)
        .fontSize(9.5)
        .fillColor(COLORS.textDark)
        .text(subcategoryName, textX, rowY + (hasDiscount ? 10 : 14), { width: 190 });

      if (hasDiscount) {
        const discountText = `Original: ₹${originalItemTotal.toFixed(2)} | Savings: ₹${itemDiscount.toFixed(2)}`;
        doc
          .font(fontRegular)
          .fontSize(7.5)
          .fillColor(COLORS.textLight)
          .text(discountText, textX, rowY + 23);
      }

      // 4. Quantity (e.g. "50 KG", "2 QTY", "250g")
      const qtyText = formatOrderQuantity(item.quantity, subCategoryType);
      doc
        .font(fontRegular)
        .fontSize(9.5)
        .fillColor(COLORS.textDark)
        .text(qtyText, colQty, rowY + 14);

      // 5. Unit Price (e.g. "₹340.00 / KG" or "₹50.00 / QTY")
      const unitLabel = typeNorm === 'quantity' ? 'QTY' : 'KG';
      const unitPriceText = `₹${unitOriginalPrice.toFixed(2)} / ${unitLabel}`;
      doc
        .font(fontRegular)
        .fontSize(9.5)
        .fillColor(COLORS.textDark)
        .text(unitPriceText, colPrice, rowY + 14);

      // 6. Total Amount for item
      doc
        .font(fontBold)
        .fontSize(9.5)
        .fillColor(COLORS.textDark)
        .text(`₹${item.itemTotal.toFixed(2)}`, colAmountEnd - 80, rowY + 14, {
          width: 80,
          align: 'right',
        });

      // Bottom Row Border
      currentY += rowHeight;
      doc
        .moveTo(margin, currentY)
        .lineTo(margin + contentWidth, currentY)
        .lineWidth(0.5)
        .strokeColor(COLORS.rowDivider)
        .stroke();
    });

    currentY += 8;

    /* ==========================================================================
       4. FINANCIAL SUMMARY BREAKDOWN
       ========================================================================== */
    const totalDiscountAmount =
      order.items?.reduce((sum, item) => sum + (Number(item.discountAmount) || 0), 0) || 0;
    const originalSubtotal =
      order.items?.reduce((sum, item) => {
        const origUnit =
          Number(item.amount) ||
          Number((item as any).subcategory?.amount) ||
          Number(item.finalAmount) ||
          0;
        const qty = Number(item.quantity) || 1;
        return sum + origUnit * qty;
      }, 0) || (order.subTotal + totalDiscountAmount);

    const summaryRow = (
      label: string,
      val: string,
      options?: { isBold?: boolean; valColor?: string; isMuted?: boolean }
    ) => {
      const h = 20;
      doc
        .font(options?.isBold ? fontBold : fontRegular)
        .fontSize(9.5)
        .fillColor(options?.isMuted ? COLORS.textMuted : COLORS.textDark)
        .text(label, margin + 12, currentY + 3);

      doc
        .font(options?.isBold ? fontBold : fontRegular)
        .fontSize(9.5)
        .fillColor(options?.valColor || (options?.isBold ? COLORS.textDark : COLORS.textDark))
        .text(val, colAmountEnd - 100, currentY + 3, { width: 100, align: 'right' });

      currentY += h;
      doc
        .moveTo(margin, currentY)
        .lineTo(margin + contentWidth, currentY)
        .lineWidth(0.5)
        .strokeColor(COLORS.rowDivider)
        .stroke();
    };

    // Original Subtotal
    summaryRow('Original Subtotal', `₹${originalSubtotal.toFixed(2)}`, { isMuted: true });

    // Offer Savings
    if (totalDiscountAmount > 0) {
      summaryRow('Offer Savings', `-₹${totalDiscountAmount.toFixed(2)}`, {
        isBold: true,
        valColor: COLORS.savingsGreen,
      });
    }

    // Subtotal (items count)
    summaryRow(`Subtotal (${items.length} items)`, `₹${order.subTotal.toFixed(2)}`, {
      isBold: true,
    });

    // Delivery Fee
    const deliveryFeeText = order.deliveryFee > 0 ? `₹${order.deliveryFee.toFixed(2)}` : 'FREE';
    summaryRow('Delivery Fee', deliveryFeeText, {
      isBold: true,
      valColor: order.deliveryFee > 0 ? COLORS.textDark : COLORS.savingsGreen,
    });

    currentY += 8;

    /* ==========================================================================
       5. TOTAL PAYABLE BANNER
       ========================================================================== */
    const totalBannerHeight = 32;
    doc
      .roundedRect(margin, currentY, contentWidth, totalBannerHeight, 4)
      .fillColor(COLORS.headerGreen)
      .fill();

    doc
      .font(fontBold)
      .fontSize(12)
      .fillColor(COLORS.white)
      .text('TOTAL PAYABLE', margin + 16, currentY + 9);

    doc
      .font(fontBold)
      .fontSize(14)
      .fillColor(COLORS.white)
      .text(`₹${order.total.toFixed(2)}`, colAmountEnd - 150, currentY + 8, {
        width: 150,
        align: 'right',
      });

    currentY += totalBannerHeight + 12;

    /* ==========================================================================
       6. PAYMENT METHOD FOOTER PILL
       ========================================================================== */
    const pillHeight = 26;
    doc
      .roundedRect(margin, currentY, contentWidth, pillHeight, 4)
      .fillColor(COLORS.pillBg)
      .strokeColor(COLORS.pillBorder)
      .lineWidth(0.8)
      .fillAndStroke();

    // Checkbox icon representation
    const cbX = margin + 12;
    const cbY = currentY + 7;
    doc
      .roundedRect(cbX, cbY, 11, 11, 2)
      .lineWidth(1)
      .strokeColor(COLORS.primaryGreen)
      .stroke();

    const paymentLabel =
      order.paymentMethod?.paymentType || 'Cash on Delivery (COD)';
    doc
      .font(fontMedium)
      .fontSize(9)
      .fillColor(COLORS.textDark)
      .text(`Payment Method: ${paymentLabel}`, cbX + 18, currentY + 7.5);

    doc.end();
  });
}

