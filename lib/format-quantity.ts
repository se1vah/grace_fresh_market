/**
 * Format quantity helpers for Grace Fresh Market order items.
 *
 * Rules:
 * 1. For `subCategoryType === "quantity"`:
 *    - 1 -> "1 QTY"
 *    - 2 -> "2 QTY"
 *    - 10 -> "10 QTY"
 *
 * 2. For `subCategoryType === "gram"`:
 *    - Stored quantity is in KG.
 *    - When value < 1: Convert KG to grams (val * 1000):
 *      - 0.10 -> "100g"
 *      - 0.25 -> "250g"
 *      - 0.50 -> "500g"
 *      - 0.75 -> "750g"
 *    - When value >= 1: Display in KG:
 *      - 1 -> "1 KG"
 *      - 1.5 -> "1.5 KG"
 *      - 2 -> "2 KG"
 *
 * 3. Rate format:
 *    - "<formattedQuantity> × ₹<unitPrice>"
 *    - Example: "250g × ₹50.00", "1 KG × ₹50.00", "2 QTY × ₹55.00"
 */

export function normalizeSubCategoryType(type?: string | null): 'gram' | 'quantity' {
  const t = String(type || '').toLowerCase().trim();
  if (t === 'quantity' || t === 'qty') {
    return 'quantity';
  }
  return 'gram';
}

/**
 * Returns formatted quantity string with appropriate unit ("QTY", "g", or "KG").
 */
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

  // subCategoryType === 'gram' (stored in KG)
  if (num > 0 && num < 1) {
    const grams = Math.round(num * 1000);
    return `${grams}g`;
  }

  const formattedKg = Number.isInteger(num) ? num.toString() : parseFloat(num.toFixed(2)).toString();
  return `${formattedKg} KG`;
}

/**
 * Formats quantity and unit price in standard display format:
 * "<formattedQuantity> × ₹<unitPrice>"
 *
 * Examples:
 * - 250g × ₹50.00
 * - 500g × ₹50.00
 * - 1 KG × ₹50.00
 * - 1 QTY × ₹50.00
 * - 2 QTY × ₹55.00
 */
export function formatOrderItemRate(
  quantity: number | string | null | undefined,
  unitPrice: number | string | null | undefined,
  subCategoryType?: string | null
): string {
  const formattedQty = formatOrderQuantity(quantity, subCategoryType);
  const price = typeof unitPrice === 'number' ? unitPrice : Number(unitPrice) || 0;
  return `${formattedQty} × ₹${price.toFixed(2)}`;
}

/**
 * Formats a clean aggregate quantity summary for an order's item list.
 * Supports orders with single or mixed item types:
 * - Only gram items: "750g" or "1.5 KG"
 * - Only quantity items: "3 QTY"
 * - Mixed items: "2 QTY, 750g"
 */
export function formatOrderItemsSummary(
  items?: Array<{
    quantity?: number | string | null;
    subCategoryType?: string | null;
    subcategory?: { subCategoryType?: string | null } | null;
  }> | null,
  fallbackTotal?: number | string | null
): string {
  if (!items || items.length === 0) {
    if (fallbackTotal !== undefined && fallbackTotal !== null) {
      const fb = Number(fallbackTotal) || 0;
      return fb > 0 ? `${fb} total` : '0 items';
    }
    return '0 items';
  }

  let totalQty = 0;
  let totalKg = 0;
  let hasQty = false;
  let hasGram = false;

  for (const item of items) {
    const q = Number(item.quantity) || 0;
    const type = normalizeSubCategoryType(
      item.subCategoryType || item.subcategory?.subCategoryType
    );

    if (type === 'quantity') {
      totalQty += q;
      hasQty = true;
    } else {
      totalKg += q;
      hasGram = true;
    }
  }

  const parts: string[] = [];
  if (hasQty && totalQty > 0) {
    const formattedQty = Number.isInteger(totalQty)
      ? totalQty.toString()
      : parseFloat(totalQty.toFixed(2)).toString();
    parts.push(`${formattedQty} QTY`);
  }

  if (hasGram && totalKg > 0) {
    if (totalKg < 1) {
      parts.push(`${Math.round(totalKg * 1000)}g`);
    } else {
      const formattedKg = Number.isInteger(totalKg)
        ? totalKg.toString()
        : parseFloat(totalKg.toFixed(2)).toString();
      parts.push(`${formattedKg} KG`);
    }
  }

  if (parts.length === 0) {
    if (fallbackTotal) {
      return `${fallbackTotal} total`;
    }
    return '0';
  }

  return parts.join(', ');
}
