import { query } from '@/lib/db';

export interface DeliveryAddress {
  id: number;
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface PaymentMethod {
  id: number;
  paymentType: string;
  description: string;
}

export interface CheckoutDetails {
  deliveryAddress: DeliveryAddress;
  paymentMethods: PaymentMethod[];
}

interface DefaultAddressRow {
  id: number;
  full_name: string;
  phone_number: string;
  building_name: string;
  street_name: string;
  city: string;
  state: string | null;
  pincode: string;
}

interface PaymentMethodRow {
  id: number;
  paymentType: string;
  description: string;
}

export async function getCheckoutDetails(userId: number): Promise<CheckoutDetails | null> {
  const addressRows = await query<DefaultAddressRow[]>(
    `SELECT
        ua.id,
        u.fullName AS full_name,
        u.phoneNumber AS phone_number,
        ua.building_name,
        ua.street_name,
        ua.city,
        ua.state,
        ua.pincode
     FROM user_addresses ua
     INNER JOIN users u ON u.id = ua.user_id
     WHERE ua.user_id = ? AND ua.is_default = 1
     ORDER BY ua.id DESC
     LIMIT 1`,
    [userId]
  );

  const defaultAddress = addressRows[0];
  if (!defaultAddress) {
    return null;
  }

  const paymentMethodRows = await query<PaymentMethodRow[]>(
    'SELECT id, paymentType, description FROM PaymentMethod ORDER BY id ASC'
  );

  return {
    deliveryAddress: {
      id: defaultAddress.id,
      fullName: defaultAddress.full_name || '',
      phoneNumber: defaultAddress.phone_number || '',
      addressLine1: defaultAddress.building_name || '',
      addressLine2: defaultAddress.street_name || '',
      city: defaultAddress.city || '',
      state: defaultAddress.state || '',
      postalCode: defaultAddress.pincode || '',
    },
    paymentMethods: paymentMethodRows.map((method) => ({
      id: method.id,
      paymentType: method.paymentType,
      description: method.description,
    })),
  };
}
