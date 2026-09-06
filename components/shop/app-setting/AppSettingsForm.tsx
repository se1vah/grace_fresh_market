'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Mail,
  Phone,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  IndianRupee,
} from 'lucide-react';

interface AppSettingsData {
  id: number;
  email: string;
  phone_number: string;
  phoneNumber?: string;
  delivery_fee?: number | string | null;
  deliveryFee?: number | string | null;
  updated_at?: string;
}

export default function AppSettingsForm() {
  const [initialData, setInitialData] = useState<AppSettingsData | null>(null);
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [deliveryFeeError, setDeliveryFeeError] = useState<string | null>(null);

  const [serverError, setServerError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch settings from API
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setServerError(null);
    try {
      const res = await fetch('/api/shop/app-setting');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load app settings');
      }

      if (data.success && data.data) {
        const fetchedEmail = data.data.email || '';
        const fetchedPhone = data.data.phone_number || data.data.phoneNumber || '';
        const fetchedDeliveryFee = data.data.delivery_fee ?? data.data.deliveryFee;

        setInitialData(data.data);
        setEmail(fetchedEmail);
        setPhoneNumber(fetchedPhone);
        setDeliveryFee(
          fetchedDeliveryFee === null || fetchedDeliveryFee === undefined
            ? ''
            : String(fetchedDeliveryFee),
        );
      }
    } catch (err: any) {
      console.error('Error fetching app settings:', err);
      setServerError(err.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const getDeliveryFeeValidationError = (value: string): string | null => {
    const cleanValue = value.trim();
    if (!cleanValue) {
      return null;
    }

    if (!/^\d+(?:\.\d{1,2})?$/.test(cleanValue)) {
      return 'Use only digits and an optional decimal point (up to two decimal places).';
    }

    const feeAmount = Number(cleanValue);
    if (!Number.isFinite(feeAmount) || feeAmount > 100000) {
      return 'Enter an amount from ₹0 to ₹100,000.';
    }

    return null;
  };

  // Client-side validation
  const validateForm = (): boolean => {
    let isValid = true;
    setEmailError(null);
    setPhoneError(null);
    setDeliveryFeeError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim();
    const cleanPhone = phoneNumber.trim();
    const cleanDeliveryFee = deliveryFee.trim();

    if (!cleanEmail) {
      setEmailError('Email address is required.');
      isValid = false;
    } else if (!emailRegex.test(cleanEmail)) {
      setEmailError('Please enter a valid email address.');
      isValid = false;
    }

    if (!cleanPhone) {
      setPhoneError('Phone number is required.');
      isValid = false;
    }

    const feeValidationError = getDeliveryFeeValidationError(cleanDeliveryFee);
    if (feeValidationError) {
      setDeliveryFeeError(feeValidationError);
      isValid = false;
    }

    return isValid;
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage(null);
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/shop/app-setting', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          phone_number: phoneNumber.trim(),
          delivery_fee: deliveryFee.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setToastMessage(data.message || 'App settings updated successfully!');
      if (data.data) {
        setInitialData(data.data);
        setEmail(data.data.email);
        setPhoneNumber(data.data.phone_number || data.data.phoneNumber || '');
        const savedDeliveryFee = data.data.delivery_fee ?? data.data.deliveryFee;
        setDeliveryFee(
          savedDeliveryFee === null || savedDeliveryFee === undefined
            ? ''
            : String(savedDeliveryFee),
        );
      }

      // Auto dismiss toast message after 4 seconds
      setTimeout(() => {
        setToastMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error('Error saving app settings:', err);
      setServerError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  // Reset form to last loaded initial values
  const handleReset = () => {
    if (initialData) {
      setEmail(initialData.email || '');
      setPhoneNumber(initialData.phone_number || initialData.phoneNumber || '');
      const initialDeliveryFee = initialData.delivery_fee ?? initialData.deliveryFee;
      setDeliveryFee(
        initialDeliveryFee === null || initialDeliveryFee === undefined
          ? ''
          : String(initialDeliveryFee),
      );
      setEmailError(null);
      setPhoneError(null);
      setDeliveryFeeError(null);
      setServerError(null);
      setToastMessage(null);
    }
  };

  const isFormDirty = initialData
    ? email.trim() !== (initialData.email || '') ||
    phoneNumber.trim() !== (initialData.phone_number || initialData.phoneNumber || '') ||
    deliveryFee.trim() !== String(initialData.delivery_fee ?? initialData.deliveryFee ?? '')
    : false;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 bg-[#2D5A27] text-white font-quicksand font-bold text-xs sm:text-sm rounded-xl shadow-xl animate-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-5 h-5 text-[#80C34A]" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 text-white/70 hover:text-white transition cursor-pointer ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-[#EAF2EA] text-[#2D5A27]">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-quicksand text-gray-900 tracking-tight">
                App Setting
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Configure primary contact details and store support information.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Skeleton Card */}
      {loading ? (
        <div className="bg-white p-8 rounded-2xl border border-[#E2EAE1] shadow-xs space-y-6">
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-gray-200"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-100 rounded-xl animate-pulse"></div>
            <div className="h-10 bg-gray-100 rounded-xl animate-pulse"></div>
          </div>
        </div>
      ) : (
        /* Settings Main Form Card */
        <div className="bg-white rounded-2xl border border-[#E2EAE1] shadow-xs overflow-hidden">
          {/* Card Header Banner */}
          <div className="px-6 py-4 border-b border-[#E2EAE1] bg-[#F9FBF9] flex items-center justify-between">
            <h2 className="font-quicksand font-bold text-base text-gray-800 flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#2D5A27]" />
              Store Contact Configuration
            </h2>
          </div>

          <form noValidate onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Global Server Error Banner */}
            {serverError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="font-quicksand font-semibold">{serverError}</div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Field 1: Get Email */}
              <div className="space-y-2">
                <label
                  htmlFor="app-email"
                  className="block font-quicksand font-bold text-sm text-gray-700"
                >
                  Contact Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="app-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    placeholder="e.g. support@gracefreshmarket.com"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition font-sans focus:outline-none focus:ring-2 ${emailError
                      ? 'border-red-400 focus:ring-red-100 bg-red-50/20'
                      : 'border-[#E2EAE1] focus:border-[#2D5A27] focus:ring-[#2D5A27]/10 bg-white'
                      }`}
                  />
                </div>
                {emailError ? (
                  <p className="text-xs text-red-600 font-semibold flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {emailError}
                  </p>
                ) : (
                  <p className="text-[12px] text-gray-500">
                    Used for user support notifications and app customer care inquiries.
                  </p>
                )}
              </div>

              {/* Field 2: Get Phone Number */}
              <div className="space-y-2">
                <label
                  htmlFor="app-phone"
                  className="block font-quicksand font-bold text-sm text-gray-700"
                >
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="app-phone"
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (phoneError) setPhoneError(null);
                    }}
                    placeholder="e.g. +1 (800) 555-0199"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition font-sans focus:outline-none focus:ring-2 ${phoneError
                      ? 'border-red-400 focus:ring-red-100 bg-red-50/20'
                      : 'border-[#E2EAE1] focus:border-[#2D5A27] focus:ring-[#2D5A27]/10 bg-white'
                      }`}
                  />
                </div>
                {phoneError ? (
                  <p className="text-xs text-red-600 font-semibold flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {phoneError}
                  </p>
                ) : (
                  <p className="text-[12px] text-gray-500">
                    Primary helpline number displayed in the mobile application.
                  </p>
                )}
              </div>

              {/* Field 3: Optional Delivery Fee */}
              <div className="space-y-2">
                <label
                  htmlFor="delivery-fee"
                  className="block font-quicksand font-bold text-sm text-gray-700"
                >
                  Delivery Fee <span className="text-gray-400 font-medium">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <input
                    id="delivery-fee"
                    type="text"
                    inputMode="decimal"
                    value={deliveryFee}
                    aria-invalid={Boolean(deliveryFeeError)}
                    aria-describedby={deliveryFeeError ? 'delivery-fee-error' : 'delivery-fee-help'}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setDeliveryFee(nextValue);
                      setDeliveryFeeError(getDeliveryFeeValidationError(nextValue));
                    }}
                    placeholder="e.g. 40.00"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition font-sans focus:outline-none focus:ring-2 ${deliveryFeeError
                      ? 'border-red-400 focus:ring-red-100 bg-red-50/20'
                      : 'border-[#E2EAE1] focus:border-[#2D5A27] focus:ring-[#2D5A27]/10 bg-white'
                      }`}
                  />
                </div>
                {deliveryFeeError ? (
                  <div
                    id="delivery-fee-error"
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 animate-in fade-in slide-in-from-top-1 duration-200"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{deliveryFeeError}</span>
                  </div>
                ) : (
                  <p id="delivery-fee-help" className="text-[12px] text-gray-500">
                    Leave empty when no delivery fee is configured. Maximum ₹100,000.
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-[#E2EAE1] flex items-center justify-between gap-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-[#2D5A27] hover:bg-[#21431d] disabled:bg-[#2D5A27]/60 text-white font-quicksand font-bold text-xs sm:text-sm rounded-xl inline-flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
