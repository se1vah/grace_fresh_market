'use client';

import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { ShopNotificationProvider } from '@/components/shop/notifications/ShopNotificationManager';

interface ShopAdminLayoutProps {
  user: {
    id: string;
    email: string;
    isSuperAdmin: boolean;
  };
  children: React.ReactNode;
}

export default function ShopAdminLayout({ user, children }: ShopAdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ShopNotificationProvider>
      <div className="min-h-screen bg-[#F9FBF9] text-[#1E2922] font-nunito flex">
        {/* Admin Sidebar */}
        <AdminSidebar 
          user={user} 
          mobileOpen={mobileOpen} 
          setMobileOpen={setMobileOpen} 
        />

        {/* Main Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
          {/* Top Header */}
          <AdminHeader 
            user={user} 
            setMobileOpen={setMobileOpen} 
          />

          {/* Content Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ShopNotificationProvider>
  );
}
