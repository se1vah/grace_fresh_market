'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  FolderTree,
  FileText,
  Settings,
  X,
  Leaf,
  ChevronRight,
  ShieldCheck,
  ShoppingBag,
  Users
} from 'lucide-react';
import { useShopOrders } from '@/components/shop/orders/ShopOrdersContext';

interface AdminSidebarProps {
  user: {
    email: string;
    isSuperAdmin: boolean;
  };
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function AdminSidebar({ user, mobileOpen, setMobileOpen }: AdminSidebarProps) {
  const pathname = usePathname();
  const { orderedCount } = useShopOrders();

  const navItems = [
    {
      name: 'Dashboard',
      href: '/shop',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: 'Orders Management',
      href: '/shop/orders',
      icon: ShoppingBag,
      exact: false,
      badge: orderedCount,
    },
    {
      name: 'Customer Management',
      href: '/shop/customers',
      icon: Users,
      exact: false,
    },
    {
      name: 'Category',
      href: '/shop/category',
      icon: Layers,
      exact: false,
    },
    {
      name: 'Items',
      href: '/shop/sub-category',
      icon: FolderTree,
      exact: false,
    },
    {
      name: 'CMS',
      href: '/shop/cms',
      icon: FileText,
      exact: false,
    },
    {
      name: 'App Setting',
      href: '/shop/app-setting',
      icon: Settings,
      exact: false,
    },
  ];

  const isLinkActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-[#E2EAE1] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#E2EAE1]">
          <Link
            href="/shop"
            className="flex items-center gap-3 group"
            onClick={() => setMobileOpen(false)}
          >
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-[#E2EAE1] shadow-xs group-hover:scale-105 transition-transform overflow-hidden p-0.5">
              <img src="/logo.png" alt="Grace Fresh Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-quicksand font-bold text-lg text-[#2D5A27] leading-tight">
                Grace Fresh
              </div>
              <div className="text-[11px] font-semibold text-[#668E61] uppercase tracking-wider">
                Shop Admin
              </div>
            </div>
          </Link>

          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-[#F2F7F2] hover:text-[#2D5A27] transition"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 px-4 py-6 overflow-y-auto space-y-1">
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Navigation Menu
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-quicksand font-bold text-sm transition-all duration-200 ${active
                  ? 'bg-[#2D5A27] text-white shadow-sm shadow-[#2D5A27]/20 translate-x-1'
                  : 'text-gray-600 hover:bg-[#F2F7F2] hover:text-[#2D5A27]'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${active ? 'text-[#80C34A]' : 'text-gray-400 group-hover:text-[#2D5A27]'}`} />
                  <span>{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-extrabold shadow-2xs ${
                        active
                          ? 'bg-[#80C34A] text-[#1E3F1B]'
                          : 'bg-amber-500 text-white animate-pulse'
                      }`}
                      title={`${item.badge} pending ordered items`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {active && <ChevronRight className="w-4 h-4 text-[#80C34A]" />}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-4 border-t border-[#E2EAE1] bg-[#F9FBF9]">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-[#E2EAE1] shadow-xs">
            <div className="w-9 h-9 rounded-full bg-[#2D5A27] text-white font-bold flex items-center justify-center text-sm shrink-0">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-gray-800 truncate leading-tight">
                {user.email}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 mt-0.5">
                {user.isSuperAdmin ? (
                  <span className="text-amber-700 font-bold flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3 text-amber-600 inline" /> Super Admin
                  </span>
                ) : (
                  <span>Shop Staff</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
