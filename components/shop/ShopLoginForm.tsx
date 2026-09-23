'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf, Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { requestShopFcmToken, getCachedShopFcmToken } from '@/lib/firebase/messaging';

export default function ShopLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      // Attempt to retrieve or prompt for FCM Web Push Token
      let fcmToken = getCachedShopFcmToken();
      try {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted' || Notification.permission === 'default') {
            const { token } = await requestShopFcmToken();
            if (token) fcmToken = token;
          }
        }
      } catch (fcmErr) {
        console.warn('FCM Token generation error during login:', fcmErr);
      }

      const res = await fetch('/api/shop/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, fcmToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Invalid email or password');
        return;
      }

      // Success -> Redirect to /shop
      router.push('/shop');
      router.refresh();
    } catch (err) {
      setErrorMessage('An unexpected network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-gradient-to-b from-[#F2F7F2] via-[#F9FBF9] to-[#EAF2EA]">
      {/* Container Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E2EAE1] overflow-hidden transition-all duration-300">

        {/* Header Branding */}
        <div className="bg-gradient-to-r from-[#2D5A27] to-[#1E3F1B] px-8 py-8 text-center text-white relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#80C34A]/20 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-[#80C34A]/20 rounded-full blur-xl pointer-events-none" />

          <div className="inline-flex items-center justify-center p-2.5 bg-white rounded-2xl mb-3 shadow-md border border-white/20 w-16 h-16 overflow-hidden">
            <img src="/logo.png" alt="Grace Fresh Logo" className="w-full h-full object-contain" />
          </div>

          <h1 className="text-2xl font-bold font-quicksand tracking-tight text-white">
            Grace Fresh Shop
          </h1>
          <p className="text-sm font-nunito text-[#D1E6CE] mt-1">
            Sign in to continue to your shop management
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm animate-shake"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="font-nunito font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div>
              <label
                htmlFor="shop-email"
                className="block text-xs font-bold uppercase tracking-wider text-[#2D5A27] mb-2 font-nunito"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="shop-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  placeholder="name@gracefresh.com"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#80C34A] focus:border-[#2D5A27] transition duration-200 font-nunito bg-gray-50/50 focus:bg-white disabled:opacity-60"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="shop-password"
                className="block text-xs font-bold uppercase tracking-wider text-[#2D5A27] mb-2 font-nunito"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="shop-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-11 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#80C34A] focus:border-[#2D5A27] transition duration-200 font-nunito bg-gray-50/50 focus:bg-white disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus:text-[#2D5A27] transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#2D5A27] to-[#80C34A] hover:from-[#21431d] hover:to-[#6ea93e] text-white font-bold font-quicksand text-base shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#80C34A] transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>Sign In to Shop</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-500 font-nunito">
          Grace Fresh Market &copy; {new Date().getFullYear()} &bull; Secure Shop Portal
        </div>
      </div>
    </div>
  );
}
