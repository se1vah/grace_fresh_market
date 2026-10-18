import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { emitSocketEvent } from '@/lib/socket';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DELIVERY_FEE_REGEX = /^\d+(?:\.\d{1,2})?$/;
const MAX_DELIVERY_FEE = 100_000;

function toDeliveryFee(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const fee = Number(value);
  return Number.isFinite(fee) ? fee : null;
}

function validateDeliveryFee(value: unknown): { value: number | null; error?: string } {
  if (value === null || value === undefined) {
    return { value: null };
  }

  const input = typeof value === 'number' ? String(value) : value;
  if (typeof input !== 'string') {
    return { value: null, error: 'Delivery fee must be a valid amount.' };
  }

  const cleanInput = input.trim();
  if (!cleanInput) {
    return { value: null };
  }

  if (!DELIVERY_FEE_REGEX.test(cleanInput)) {
    return {
      value: null,
      error: 'Delivery fee must be a non-negative amount with up to two decimal places.',
    };
  }

  const fee = Number(cleanInput);
  if (!Number.isFinite(fee) || fee > MAX_DELIVERY_FEE) {
    return {
      value: null,
      error: `Delivery fee must be between ₹0 and ₹${MAX_DELIVERY_FEE.toLocaleString('en-IN')}.`,
    };
  }

  return { value: fee };
}

// GET /api/shop/app-setting
export async function GET() {
  try {
    const rows = await query<any[]>(
      'SELECT id, email, phone_number, delivery_fee, maintenance_notification_title, maintenance_notification_description, created_at, updated_at FROM app_settings ORDER BY id DESC LIMIT 1'
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          id: 0,
          email: '',
          phoneNumber: '',
          deliveryFee: null,
          maintenanceNotificationTitle: '',
          maintenanceNotificationDescription: '',
        },
      });
    }

    const setting = rows[0];
    return NextResponse.json({
      success: true,
      data: {
        id: setting.id,
        email: setting.email || '',
        phoneNumber: setting.phone_number || '',
        deliveryFee: toDeliveryFee(setting.delivery_fee),
        maintenanceNotificationTitle: setting.maintenance_notification_title || '',
        maintenanceNotificationDescription: setting.maintenance_notification_description || '',
        created_at: setting.created_at,
        updated_at: setting.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error fetching app settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch app settings' },
      { status: 500 }
    );
  }
}

// Helper to process setting update logic
async function handleUpdateSetting(request: NextRequest) {
  try {
    const body = await request.json();
    const emailInput = body?.email;
    const phoneInput = body?.phone_number ?? body?.phoneNumber;
    const deliveryFeeInput = body?.delivery_fee ?? body?.deliveryFee;
    const maintenanceTitleInput =
      body?.maintenance_notification_title ??
      body?.maintenanceNotificationTitle ??
      body?.maintaince_notification_title ??
      body?.maintainceNotificationTitle ??
      body?.notification_title ??
      body?.notificationTitle;
    const maintenanceDescriptionInput =
      body?.maintenance_notification_description ??
      body?.maintenanceNotificationDescription ??
      body?.maintaince_notification_description ??
      body?.maintainceNotificationDescription ??
      body?.notification_description ??
      body?.notificationDescription;

    // Validation
    if (!emailInput || typeof emailInput !== 'string' || !emailInput.trim()) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    const cleanEmail = emailInput.trim();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (!phoneInput || typeof phoneInput !== 'string' || !phoneInput.trim()) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const cleanPhone = phoneInput.trim();
    const deliveryFeeResult = validateDeliveryFee(deliveryFeeInput);
    if (deliveryFeeResult.error) {
      return NextResponse.json({ error: deliveryFeeResult.error }, { status: 400 });
    }
    const deliveryFee = deliveryFeeResult.value;

    const maintenanceNotificationTitle =
      maintenanceTitleInput === null || maintenanceTitleInput === undefined
        ? null
        : String(maintenanceTitleInput).trim();

    const maintenanceNotificationDescription =
      maintenanceDescriptionInput === null || maintenanceDescriptionInput === undefined
        ? null
        : String(maintenanceDescriptionInput).trim();

    // Check if an app_setting row exists
    const existing = await query<any[]>(
      'SELECT id FROM app_settings ORDER BY id DESC LIMIT 1'
    );

    let settingId: number;

    if (existing && existing.length > 0) {
      settingId = Number(existing[0].id);
      await query(
        'UPDATE app_settings SET email = ?, phone_number = ?, delivery_fee = ?, maintenance_notification_title = ?, maintenance_notification_description = ? WHERE id = ?',
        [cleanEmail, cleanPhone, deliveryFee, maintenanceNotificationTitle, maintenanceNotificationDescription, settingId]
      );
    } else {
      const result = await query<any>(
        'INSERT INTO app_settings (email, phone_number, delivery_fee, maintenance_notification_title, maintenance_notification_description) VALUES (?, ?, ?, ?, ?)',
        [cleanEmail, cleanPhone, deliveryFee, maintenanceNotificationTitle, maintenanceNotificationDescription]
      );
      settingId = Number(result.insertId);
    }

    // Fetch updated row
    const updatedRows = await query<any[]>(
      'SELECT id, email, phone_number, delivery_fee, maintenance_notification_title, maintenance_notification_description, created_at, updated_at FROM app_settings WHERE id = ?',
      [settingId]
    );

    const updatedSetting = updatedRows[0] || {
      id: settingId,
      email: cleanEmail,
      phone_number: cleanPhone,
      delivery_fee: deliveryFee,
      maintenance_notification_title: maintenanceNotificationTitle,
      maintenance_notification_description: maintenanceNotificationDescription,
    };

    // Emit socket event if title and description are not null
    const title = updatedSetting.maintenance_notification_title;
    const description = updatedSetting.maintenance_notification_description;

    if (
      title !== null &&
      title !== undefined &&
      title.trim() !== '' &&
      description !== null &&
      description !== undefined &&
      description.trim() !== ''
    ) {
      try {
        await emitSocketEvent('maintenance-notification', {
          maintenanceNotificationTitle: title.trim(),
          maintenanceNotificationDescription: description.trim(),
        });
      } catch (socketError) {
        console.warn('[app-setting] Failed to emit maintenance-notification socket event (non-critical):', socketError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'App settings updated successfully',
      data: {
        id: updatedSetting.id,
        email: updatedSetting.email,
        phoneNumber: updatedSetting.phone_number,
        deliveryFee: toDeliveryFee(updatedSetting.delivery_fee),
        maintenanceNotificationTitle: updatedSetting.maintenance_notification_title || '',
        maintenanceNotificationDescription: updatedSetting.maintenance_notification_description || '',
        updated_at: updatedSetting.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error updating app settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update app settings' },
      { status: 500 }
    );
  }
}

// PUT /api/shop/app-setting
export async function PUT(request: NextRequest) {
  try {
    return await handleUpdateSetting(request);
  } catch (error: any) {
    console.error('Error updating app settings (PUT):', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update app settings' },
      { status: 500 }
    );
  }
}

// POST /api/shop/app-setting (Support both PUT and POST methods)
export async function POST(request: NextRequest) {
  try {
    return await handleUpdateSetting(request);
  } catch (error: any) {
    console.error('Error updating app settings (POST):', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update app settings' },
      { status: 500 }
    );
  }
}
