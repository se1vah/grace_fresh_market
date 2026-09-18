'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, LogOut, Loader2 } from 'lucide-react';
import { ShopNotificationBell } from '@/components/shop/notifications/ShopNotificationManager';

interface AdminHeaderProps {
  user: {
    email: string;
    isSuperAdmin: boolean;
  };
  setMobileOpen: (open: boolean) => void;
}

export default function AdminHeader({ user, setMobileOpen }: AdminHeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/shop/logout', {
        method: 'POST',
      });
      router.push('/shop/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E2EAE1] h-16 flex items-center px-4 sm:px-6 lg:px-8 shadow-xs">
      <div className="flex-1 flex items-center justify-between">
        {/* Left Side: Mobile Menu Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-[#F2F7F2] hover:text-[#2D5A27] transition"
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="hidden sm:block font-quicksand font-bold text-[#2D5A27] text-lg">
            Shop Management Center
          </div>
        </div>

        {/* Right Side: Actions & User Info */}
        <div className="flex items-center gap-3">
          {/* Web Push Notification Bell Toggle */}
          <ShopNotificationBell />

          {/* User Badge */}
          <div className="hidden md:flex items-center gap-2.5 bg-[#F2F7F2] border border-[#E2EAE1] px-3 py-1.5 rounded-xl">
            <div className="w-7 h-7 rounded-full bg-[#2D5A27] text-white flex items-center justify-center text-xs font-bold">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="text-left leading-none">
              <div className="text-xs font-bold text-gray-800">{user.email}</div>
              <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                {user.isSuperAdmin ? 'Super Admin' : 'Shop Staff'}
              </div>
            </div>
            {user.isSuperAdmin && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                Admin
              </span>
            )}
          </div>
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-quicksand font-bold text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            <span className="hidden xs:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
