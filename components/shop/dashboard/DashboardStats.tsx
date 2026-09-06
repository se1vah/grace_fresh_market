'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  RefreshCw,
  FolderTree,
  TrendingUp,
  Sparkles,
  PieChart
} from 'lucide-react';

interface StatsData {
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  totalSubCategories: number;
  activeSubCategories: number;
  inactiveSubCategories: number;
}

export default function DashboardStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/shop/stats');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch statistics');
      }
      setStats({
        totalCategories: data.totalCategories || 0,
        activeCategories: data.activeCategories || 0,
        inactiveCategories: data.inactiveCategories || 0,
        totalSubCategories: data.totalSubCategories || 0,
        activeSubCategories: data.activeSubCategories || 0,
        inactiveSubCategories: data.inactiveSubCategories || 0,
      });
    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
      setError(err.message || 'Error connecting to database');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, []);

  // Calculate percentages for progress indicators
  const categoryActivePercent = stats?.totalCategories
    ? Math.round((stats.activeCategories / stats.totalCategories) * 100)
    : 0;

  const subCategoryActivePercent = stats?.totalSubCategories
    ? Math.round((stats.activeSubCategories / stats.totalSubCategories) * 100)
    : 0;

  return (
    <div className="space-y-8 pb-12 font-nunito">
      {/* Premium Multi-Color Hero Welcome Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#1E3F1B] via-[#2D5A27] to-[#122A10] text-white p-6 sm:p-10 overflow-hidden shadow-xl border border-emerald-900/40">
        {/* Colorful Floating Glows */}
        <div className="absolute -right-10 -top-10 w-72 h-72 rounded-full bg-gradient-to-br from-[#80C34A]/30 to-emerald-400/20 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-20 w-80 h-80 rounded-full bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#80C34A] text-xs font-bold font-quicksand backdrop-blur-md border border-white/10 mb-4 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Organic Produce Catalog Analytics</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold font-quicksand tracking-tight text-white leading-tight">
            Shop Catalog Analytics & Control
          </h1>
          <p className="mt-2.5 text-xs sm:text-base text-[#D1E6CE] leading-relaxed max-w-2xl font-nunito">
            Monitor real-time product hierarchy, active category distributions, and sub-level catalog organizational metrics.
          </p>
        </div>
      </div>

      {/* Control Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
              <PieChart className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold font-quicksand text-gray-900 tracking-tight">
              Catalog Performance Dashboard
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-nunito">
            Live counts and store operational status breakdown with vibrant metric insights
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E2EAE1] hover:bg-[#F2F7F2] hover:border-[#2D5A27] text-xs font-bold font-quicksand text-gray-700 hover:text-[#2D5A27] transition shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error ? (
        <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between shadow-xs">
          <span>{error}</span>
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-red-600 text-white text-xs rounded-xl font-bold font-quicksand hover:bg-red-700 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {/* CATEGORY STATS SECTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-xs" />
                <h3 className="text-sm sm:text-base font-extrabold font-quicksand text-gray-800 uppercase tracking-wider">
                  Category Statistics
                </h3>
              </div>
              <span className="text-xs font-extrabold font-quicksand text-indigo-700 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-200/80 shadow-2xs">
                {categoryActivePercent}% Active Ratio
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 1. Total Categories Card (Indigo / Violet Theme) */}
              <div className="relative bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 p-6 rounded-3xl border border-indigo-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 transition-all duration-300 group overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 font-quicksand">
                    Total Categories
                  </span>
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-5">
                  {loading ? (
                    <div className="flex items-center gap-2 text-gray-400 py-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                      <span className="text-sm font-semibold">Loading...</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between">
                      <div className="text-4xl font-black font-quicksand text-indigo-950 tracking-tight">
                        {stats?.totalCategories ?? 0}
                      </div>
                      <span className="text-xs font-bold text-indigo-600 font-quicksand bg-indigo-100/70 px-2.5 py-0.5 rounded-md">
                        Main Entities
                      </span>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-4 w-full bg-indigo-100/80 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-600 to-purple-500 h-full rounded-full transition-all duration-700"
                      style={{ width: `${categoryActivePercent}%` }}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-indigo-700 font-bold font-quicksand pt-3 border-t border-indigo-100">
                    <span>Hierarchy Level 1</span>
                    <Link href="/shop/category" className="flex items-center gap-1 hover:underline group-hover:translate-x-0.5 transition-transform">
                      <span>Manage List</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* 2. Active Categories Card (Emerald / Teal Theme) */}
              <div className="relative bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50 p-6 rounded-3xl border border-emerald-200/90 shadow-xs hover:shadow-xl hover:border-emerald-300 transition-all duration-300 group overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 font-quicksand">
                      Active Categories
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-5">
                  {loading ? (
                    <div className="flex items-center gap-2 text-gray-400 py-2">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                      <span className="text-sm font-semibold">Loading...</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between">
                      <div className="text-4xl font-black font-quicksand text-emerald-800 tracking-tight">
                        {stats?.activeCategories ?? 0}
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-300/80 shadow-2xs">
                        <TrendingUp className="w-3 h-3" />
                        {categoryActivePercent}% Live
                      </span>
                    </div>
                  )}

                  <div className="mt-7 text-xs text-emerald-800 font-semibold pt-3 border-t border-emerald-100 flex items-center justify-between font-quicksand">
                    <span>Published to Storefront</span>
                    <span className="font-extrabold text-emerald-700">Live Status</span>
                  </div>
                </div>
              </div>

              {/* 3. Inactive Categories Card (Warm Amber / Coral Theme) */}
              <div className="relative bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 p-6 rounded-3xl border border-amber-200/90 shadow-xs hover:shadow-xl hover:border-amber-300 transition-all duration-300 group overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 font-quicksand">
                    Inactive Categories
                  </span>
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform">
                    <XCircle className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-5">
                  {loading ? (
                    <div className="flex items-center gap-2 text-gray-400 py-2">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                      <span className="text-sm font-semibold">Loading...</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between">
                      <div className="text-4xl font-black font-quicksand text-amber-900 tracking-tight">
                        {stats?.inactiveCategories ?? 0}
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300/80 shadow-2xs">
                        Draft/Hidden
                      </span>
                    </div>
                  )}

                  <div className="mt-7 text-xs text-amber-800 font-semibold pt-3 border-t border-amber-100 flex items-center justify-between font-quicksand">
                    <span>Hidden from Storefront</span>
                    <span className="font-extrabold text-amber-700">Unpublished</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SUBCATEGORY STATS SECTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 shadow-xs" />
                <h3 className="text-sm sm:text-base font-extrabold font-quicksand text-gray-800 uppercase tracking-wider">
                  Items Statistics
                </h3>
              </div>
              <span className="text-xs font-extrabold font-quicksand text-sky-700 bg-sky-50 px-3.5 py-1 rounded-full border border-sky-200/80 shadow-2xs">
                {subCategoryActivePercent}% Active Ratio
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 4. Total SubCategories Card (Ocean Sky Blue Theme) */}
              <div className="relative bg-gradient-to-br from-sky-50/80 via-white to-blue-50/40 p-6 rounded-3xl border border-sky-200/80 shadow-xs hover:shadow-xl hover:border-sky-300 transition-all duration-300 group overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-sky-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-sky-700 font-quicksand">
                    Total Items
                  </span>
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white shadow-lg shadow-sky-500/25 group-hover:scale-105 transition-transform">
                    <FolderTree className="w-5 h-5 text-sky-200" />
                  </div>
                </div>

                <div className="mt-5">
                  {loading ? (
                    <div className="flex items-center gap-2 text-gray-400 py-2">
                      <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                      <span className="text-sm font-semibold">Loading...</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between">
                      <div className="text-4xl font-black font-quicksand text-sky-950 tracking-tight">
                        {stats?.totalSubCategories ?? 0}
                      </div>
                      <span className="text-xs font-bold text-sky-600 font-quicksand bg-sky-100/70 px-2.5 py-0.5 rounded-md">
                        Sub-Level Items
                      </span>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-4 w-full bg-sky-100/80 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-sky-500 to-blue-600 h-full rounded-full transition-all duration-700"
                      style={{ width: `${subCategoryActivePercent}%` }}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-sky-700 font-bold font-quicksand pt-3 border-t border-sky-100">
                    <span>Active Categories Scope</span>
                    <Link href="/shop/sub-category" className="flex items-center gap-1 hover:underline group-hover:translate-x-0.5 transition-transform">
                      <span>Manage List</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* 5. Active SubCategories Card (Vibrant Lime / Fresh Organic Green Theme) */}
              <div className="relative bg-gradient-to-br from-lime-50/90 via-white to-emerald-50/40 p-6 rounded-3xl border border-lime-200/90 shadow-xs hover:shadow-xl hover:border-lime-300 transition-all duration-300 group overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-lime-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-lime-500" />
                    </span>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-lime-900 font-quicksand">
                      Active Items
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#80C34A] via-[#6EB039] to-[#2D5A27] text-white shadow-lg shadow-[#80C34A]/30 group-hover:scale-105 transition-transform">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-5">
                  {loading ? (
                    <div className="flex items-center gap-2 text-gray-400 py-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#2D5A27]" />
                      <span className="text-sm font-semibold">Loading...</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between">
                      <div className="text-4xl font-black font-quicksand text-[#1E3F1B] tracking-tight">
                        {stats?.activeSubCategories ?? 0}
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-lime-100 text-lime-900 border border-lime-300/80 shadow-2xs">
                        <TrendingUp className="w-3 h-3" />
                        {subCategoryActivePercent}% Live
                      </span>
                    </div>
                  )}

                  <div className="mt-7 text-xs text-[#2D5A27] font-semibold pt-3 border-t border-lime-100 flex items-center justify-between font-quicksand">
                    <span>Ready for Products</span>
                    <span className="font-extrabold text-[#2D5A27]">Active Scope</span>
                  </div>
                </div>
              </div>

              {/* 6. Inactive SubCategories Card (Rose / Crimson Pink Theme) */}
              <div className="relative bg-gradient-to-br from-rose-50/80 via-white to-pink-50/40 p-6 rounded-3xl border border-rose-200/90 shadow-xs hover:shadow-xl hover:border-rose-300 transition-all duration-300 group overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-800 font-quicksand">
                    Inactive Items
                  </span>
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-600 to-red-600 text-white shadow-lg shadow-rose-500/25 group-hover:scale-105 transition-transform">
                    <XCircle className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-5">
                  {loading ? (
                    <div className="flex items-center gap-2 text-gray-400 py-2">
                      <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                      <span className="text-sm font-semibold">Loading...</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between">
                      <div className="text-4xl font-black font-quicksand text-rose-950 tracking-tight">
                        {stats?.inactiveSubCategories ?? 0}
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300/80 shadow-2xs">
                        Draft/Hidden
                      </span>
                    </div>
                  )}

                  <div className="mt-7 text-xs text-rose-800 font-semibold pt-3 border-t border-rose-100 flex items-center justify-between font-quicksand">
                    <span>Disabled Sub-Items</span>
                    <span className="font-extrabold text-rose-700">Unpublished</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
