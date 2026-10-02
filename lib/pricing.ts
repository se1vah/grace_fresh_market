/**
 * Shared Pricing Utility for Grace Fresh Market.
 *
 * Offer Rules:
 * 1. The `offer` value is a percentage discount (0 to 100).
 * 2. discountAmount = (amount * offer) / 100
 * 3. finalAmount = amount - discountAmount
 * 4. If offer is 0, NULL, or missing: finalAmount = amount, discountAmount = 0.
 * 5. Unit discount is applied first, then multiplied by requested quantity:
 *    itemTotal = finalAmount * quantity
 * 6. Decimal offers such as 2.5% and decimal quantities such as 0.25 (KG) are safely supported.
 * 7. All monetary calculations use 2 decimal places.
 */

export interface PricingDetails {
  amount: number;         // Original / base price
  offer: number;          // Discount percentage (0 - 100)
  discountAmount: number; // Discount per unit: (amount * offer) / 100
  finalAmount: number;    // Customer selling price per unit: amount - discountAmount
}

export interface ItemPricingDetails extends PricingDetails {
  quantity: number;
  unitDiscountAmount: number; // Discount for a single unit: (amount * offer) / 100
  discountAmount: number;     // Total discount for this item based on total quantity
  itemTotal: number;          // finalAmount * quantity
}

export interface OfferValidationResult {
  isValid: boolean;
  value: number;
  error?: string;
}

/**
 * Validates and normalizes an offer percentage value for create/update APIs.
 * Valid range: 0 <= offer <= 100.
 */
export function validateOffer(offerRaw: unknown): OfferValidationResult {
  if (offerRaw === null || offerRaw === undefined) {
    return { isValid: true, value: 0 };
  }

  const str = String(offerRaw).trim();
  if (str === '') {
    return { isValid: true, value: 0 };
  }

  const parsed = Number(str);
  if (isNaN(parsed) || !Number.isFinite(parsed)) {
    return { isValid: false, value: 0, error: 'Offer percentage must be a valid number between 0 and 100.' };
  }

  if (parsed < 0 || parsed > 100) {
    return { isValid: false, value: parsed, error: 'Offer percentage must be between 0 and 100.' };
  }

  const normalized = Number(parsed.toFixed(2));
  return { isValid: true, value: normalized };
}

/**
 * Normalizes an offer percentage safely for read and calculation flows.
 * Returns 0 if null, undefined, NaN, or non-positive. Clamps at 100.
 */
export function normalizeOffer(offerRaw: unknown): number {
  if (offerRaw === null || offerRaw === undefined) {
    return 0;
  }
  const parsed = Number(offerRaw);
  if (isNaN(parsed) || !Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  if (parsed > 100) {
    return 100;
  }
  return Number(parsed.toFixed(2));
}

/**
 * Normalizes monetary amount safely to 2 decimal places.
 */
export function normalizeAmount(amountRaw: unknown): number {
  if (amountRaw === null || amountRaw === undefined) {
    return 0;
  }
  const parsed = Number(amountRaw);
  if (isNaN(parsed) || !Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Number(parsed.toFixed(2));
}

/**
 * Normalizes quantity safely. Supports decimal quantities (e.g. 0.25, 0.50).
 */
export function normalizeQuantity(quantityRaw: unknown): number {
  if (quantityRaw === null || quantityRaw === undefined) {
    return 0;
  }
  const parsed = Number(quantityRaw);
  if (isNaN(parsed) || !Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Number(parsed.toFixed(4));
}

/**
 * Calculates discountAmount and finalAmount from base amount and offer percentage.
 *
 * Formula:
 * discountAmount = (amount * offer) / 100
 * finalAmount = amount - discountAmount
 *
 * If offer is 0, NULL, or missing, finalAmount = amount and discountAmount = 0.
 */
export function calculatePricing(
  amountRaw: unknown,
  offerRaw: unknown
): PricingDetails {
  const amount = normalizeAmount(amountRaw);
  const offer = normalizeOffer(offerRaw);

  if (offer <= 0 || amount <= 0) {
    return {
      amount,
      offer: 0,
      discountAmount: 0,
      finalAmount: amount,
    };
  }

  const discountAmount = Number(((amount * offer) / 100).toFixed(2));
  const finalAmount = Number(Math.max(0, amount - discountAmount).toFixed(2));

  return {
    amount,
    offer,
    discountAmount,
    finalAmount,
  };
}

/**
 * Calculates itemTotal and total discount for a given amount, offer, and quantity.
 * Discount per unit is calculated first, and then multiplied by quantity to get total discountAmount.
 *
 * Example:
 * amount = ₹100, offer = 5%, quantity = 2
 * unitDiscountAmount = ₹5.00
 * discountAmount = ₹5.00 * 2 = ₹10.00
 * finalAmount = ₹95.00
 * itemTotal = ₹95.00 * 2 = ₹190.00
 *
 * Example fractional quantity:
 * 1 KG = ₹100, offer = 5%, quantity = 0.25 KG
 * unitDiscountAmount = ₹5.00
 * discountAmount = 5 * 0.25 = ₹1.25
 * finalAmount = ₹95.00
 * itemTotal = 95 * 0.25 = ₹23.75
 */
export function calculateItemTotal(
  amountRaw: unknown,
  offerRaw: unknown,
  quantityRaw: unknown
): ItemPricingDetails {
  const pricing = calculatePricing(amountRaw, offerRaw);
  const quantity = normalizeQuantity(quantityRaw);
  const unitDiscountAmount = pricing.discountAmount;
  const discountAmount = Number((unitDiscountAmount * quantity).toFixed(2));
  const itemTotal = Number((pricing.finalAmount * quantity).toFixed(2));

  return {
    ...pricing,
    quantity,
    unitDiscountAmount,
    discountAmount,
    itemTotal,
  };
}
