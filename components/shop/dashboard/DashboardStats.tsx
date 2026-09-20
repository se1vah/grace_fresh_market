'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
  PieChart,
  ShoppingBag,
  Clock,
  Package,
  Truck,
  Ban,
  Wallet,
  BarChart3,
  Calendar,
  ExternalLink,
  ChevronDown,
  Activity,
  Users,
  UserCheck,
  UserPlus,
  UserX
} from 'lucide-react';

interface CustomerMetrics {
  total: number;
  activeShoppers: number;
  newThisMonth: number;
  noOrdersCount: number;
}

interface OrderMetrics {
  total: number;
  ordered: number;
  packed: number;
  outForDelivery: number;
  delivered: number;
  cancelled: number;
  activeOrders: number;
}

interface EarningsMetrics {
  totalRevenue: number;
  deliveredRevenue: number;
  pendingRevenue: number;
  averageOrderValue: number;
}

interface MonthDayStat {
  day: number;
  date: string;
  dayName: string;
  revenue: number;
  ordersCount: number;
}

interface StatsData {
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  totalSubCategories: number;
  activeSubCategories: number;
  inactiveSubCategories: number;
  orders?: OrderMetrics;
  earnings?: EarningsMetrics;
  customers?: CustomerMetrics;
  selectedYear?: number;
  selectedMonth?: number;
  monthRevenue?: number;
  monthOrdersCount?: number;
  monthDays?: MonthDayStat[];
}

const MONTH_NAMES = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function DashboardStats() {
  const currentNow = new Date();
  const currentYear = Math.max(2026, currentNow.getFullYear());
  const currentMonth = currentNow.getMonth() + 1;

  // Year choices start from 2026 to current year
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let y = 2026; y <= currentYear; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [hoveredDay, setHoveredDay] = useState<MonthDayStat | null>(null);

  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (year = selectedYear, month = selectedMonth) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shop/stats?year=${year}&month=${month}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to fetch statistics');
        return;
      }
      setStats({
        totalCategories: data.totalCategories || 0,
        activeCategories: data.activeCategories || 0,
        inactiveCategories: data.inactiveCategories || 0,
        totalSubCategories: data.totalSubCategories || 0,
        activeSubCategories: data.activeSubCategories || 0,
        inactiveSubCategories: data.inactiveSubCategories || 0,
        orders: data.orders,
        earnings: data.earnings,
        customers: data.customers,
        selectedYear: data.selectedYear,
        selectedMonth: data.selectedMonth,
        monthRevenue: data.monthRevenue,
        monthOrdersCount: data.monthOrdersCount,
        monthDays: data.monthDays,
      });
    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
      setError(err.message || 'Error connecting to database');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchStats(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, fetchStats]);

  // Calculate percentages for category progress indicators
  const categoryActivePercent = stats?.totalCategories
    ? Math.round((stats.activeCategories / stats.totalCategories) * 100)
    : 0;

  const subCategoryActivePercent = stats?.totalSubCategories
    ? Math.round((stats.activeSubCategories / stats.totalSubCategories) * 100)
    : 0;

  const totalOrders = stats?.orders?.total || 0;
  const deliveredPercent = totalOrders > 0
    ? Math.round(((stats?.orders?.delivered || 0) / totalOrders) * 100)
    : 0;
  const orderedPercent = totalOrders > 0
    ? Math.round(((stats?.orders?.ordered || 0) / totalOrders) * 100)
    : 0;
  const packedPercent = totalOrders > 0
    ? Math.round(((stats?.orders?.packed || 0) / totalOrders) * 100)
    : 0;
  const outForDeliveryPercent = totalOrders > 0
    ? Math.round(((stats?.orders?.outForDelivery || 0) / totalOrders) * 100)
    : 0;
  const cancelledPercent = totalOrders > 0
    ? Math.round(((stats?.orders?.cancelled || 0) / totalOrders) * 100)
    : 0;

  const totalCustomersCount = stats?.customers?.total || 0;
  const activeCustomersCount = stats?.customers?.activeShoppers || 0;
  const activeCustomerRatio = totalCustomersCount > 0
    ? Math.round((activeCustomersCount / totalCustomersCount) * 100)
    : 0;
  const selectedMonthName = MONTH_NAMES.find((m) => m.value === selectedMonth)?.label || 'Month';

  // Monthly days calculations for zigzag / ziksok chart
  const monthDays = stats?.monthDays || [];
  const maxDayRevenue = useMemo(() => {
    const revs = monthDays.map((d) => d.revenue);
    const maxVal = Math.max(...revs, 0);
    return maxVal > 0 ? maxVal : 100;
  }, [monthDays]);

  const peakDayInfo = useMemo(() => {
    if (!monthDays || monthDays.length === 0) return null;
    let peak = monthDays[0];
    for (const d of monthDays) {
      if (d.revenue > peak.revenue) peak = d;
    }
    return peak.revenue > 0 ? peak : null;
  }, [monthDays]);

  // Generate SVG zigzag (ziksok) line path coordinates
  const svgPathData = useMemo(() => {
    if (!monthDays || monthDays.length === 0) return { path: '', area: '', points: [] };
    const chartHeight = 180;
    const count = monthDays.length;

    const points = monthDays.map((d, index) => {
      const x = ((index + 0.5) / count) * 1000;
      // Invert Y coordinate (0 at top, chartHeight at bottom)
      const ratio = d.revenue / maxDayRevenue;
      const y = chartHeight - (ratio * (chartHeight - 30) + 15);
      return { x, y, day: d.day, revenue: d.revenue, ordersCount: d.ordersCount, date: d.date };
    });

    if (points.length === 0) return { path: '', area: '', points: [] };

    // Build zigzag line path
    const pathStr = points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
    }, '');

    // Build area fill path closing down to bottom
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const areaStr = `${pathStr} L ${lastX},${chartHeight} L ${firstX},${chartHeight} Z`;

    return { path: pathStr, area: areaStr, points };
  }, [monthDays, maxDayRevenue]);

  return (
    <div className="space-y-8 pb-12 font-nunito">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#1E3F1B] via-[#2D5A27] to-[#122A10] text-white p-6 sm:p-10 overflow-hidden shadow-xl border border-emerald-900/40">
        <div className="absolute -right-10 -top-10 w-72 h-72 rounded-full bg-gradient-to-br from-[#80C34A]/30 to-emerald-400/20 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-20 w-80 h-80 rounded-full bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#80C34A] text-xs font-bold font-quicksand backdrop-blur-md border border-white/10 mb-4 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Store Operations & Financial Analytics</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold font-quicksand tracking-tight text-white leading-tight">
            Shop Performance & Orders Dashboard
          </h1>
          <p className="mt-2.5 text-xs sm:text-base text-[#D1E6CE] leading-relaxed max-w-2xl font-nunito">
            Monitor real-time customer orders, sales revenue earnings, fulfillment pipeline, and live produce catalog distribution.
          </p>
        </div>
      </div>

      {/* Control Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#2D5A27] to-[#80C34A] text-white shadow-md shadow-[#2D5A27]/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold font-quicksand text-gray-900 tracking-tight">
              Executive Business Overview
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-nunito">
            Live order fulfillment statistics, revenue earnings, and monthly day-by-day zigzag performance.
          </p>
        </div>

        <button
          onClick={() => fetchStats(selectedYear, selectedMonth)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E2EAE1] hover:bg-[#F2F7F2] hover:border-[#2D5A27] text-xs font-bold font-quicksand text-gray-700 hover:text-[#2D5A27] transition shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error && (
        <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between shadow-xs">
          <span>{error}</span>
          <button
            onClick={() => fetchStats(selectedYear, selectedMonth)}
            className="px-4 py-2 bg-red-600 text-white text-xs rounded-xl font-bold font-quicksand hover:bg-red-700 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* SECTION 1: FINANCIAL & EARNINGS OVERVIEW */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 shadow-xs" />
            <h3 className="text-sm sm:text-base font-extrabold font-quicksand text-gray-800 uppercase tracking-wider">
              Revenue & Earnings Metrics
            </h3>
          </div>
          <Link
            href="/shop/orders"
            className="text-xs font-bold font-quicksand text-[#2D5A27] hover:underline flex items-center gap-1"
          >
            <span>Orders Management</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Gross Revenue */}
          <div className="relative bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/30 p-6 rounded-3xl border border-emerald-200 shadow-xs hover:shadow-xl hover:border-emerald-300 transition-all duration-300 group overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 font-quicksand">
                Total Gross Revenue
              </span>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#2D5A27] to-[#80C34A] text-white shadow-lg shadow-[#2D5A27]/25 group-hover:scale-105 transition-transform">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5">
              {loading ? (
                <div className="flex items-center gap-2 text-gray-400 py-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2D5A27]" />
                  <span className="text-sm font-semibold">Calculating...</span>
                </div>
              ) : (
                <div className="text-3xl sm:text-4xl font-black font-quicksand text-emerald-950 tracking-tight">
                  ₹{(stats?.earnings?.totalRevenue ?? 0).toFixed(2)}
                </div>
              )}
              <div className="mt-2 text-xs text-emerald-700 font-medium">
                Combined volume of active and delivered orders
              </div>
            </div>
          </div>

          {/* Card 2: Delivered / Realized Earnings */}
          <div className="relative bg-gradient-to-br from-teal-50/80 via-white to-emerald-50/30 p-6 rounded-3xl border border-teal-200 shadow-xs hover:shadow-xl hover:border-teal-300 transition-all duration-300 group overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-teal-800 font-quicksand">
                Delivered Earnings
              </span>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-lg shadow-teal-600/25 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5">
              {loading ? (
                <div className="flex items-center gap-2 text-gray-400 py-2">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                  <span className="text-sm font-semibold">Calculating...</span>
                </div>
              ) : (
                <div className="text-3xl sm:text-4xl font-black font-quicksand text-teal-950 tracking-tight">
                  ₹{(stats?.earnings?.deliveredRevenue ?? 0).toFixed(2)}
                </div>
              )}
              <div className="mt-2 text-xs text-teal-700 font-medium flex items-center justify-between">
                <span>Completed Orders:</span>
                <span className="font-bold">{stats?.orders?.delivered ?? 0} fulfilled</span>
              </div>
            </div>
          </div>

          {/* Card 3: In-Flight / Pipeline Revenue */}
          <div className="relative bg-gradient-to-br from-amber-50/80 via-white to-orange-50/30 p-6 rounded-3xl border border-amber-200 shadow-xs hover:shadow-xl hover:border-amber-300 transition-all duration-300 group overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 font-quicksand">
                In-Flight Pipeline
              </span>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform">
                <Truck className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5">
              {loading ? (
                <div className="flex items-center gap-2 text-gray-400 py-2">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  <span className="text-sm font-semibold">Calculating...</span>
                </div>
              ) : (
                <div className="text-3xl sm:text-4xl font-black font-quicksand text-amber-950 tracking-tight">
                  ₹{(stats?.earnings?.pendingRevenue ?? 0).toFixed(2)}
                </div>
              )}
              <div className="mt-2 text-xs text-amber-700 font-medium flex items-center justify-between">
                <span>Active Pipeline:</span>
                <span className="font-bold">{stats?.orders?.activeOrders ?? 0} in progress</span>
              </div>
            </div>
          </div>

          {/* Card 4: Average Order Value (AOV) */}
          <div className="relative bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/30 p-6 rounded-3xl border border-indigo-200 shadow-xs hover:shadow-xl hover:border-indigo-300 transition-all duration-300 group overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-800 font-quicksand">
                Average Order Value
              </span>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-lg shadow-indigo-600/25 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5">
              {loading ? (
                <div className="flex items-center gap-2 text-gray-400 py-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-sm font-semibold">Calculating...</span>
                </div>
              ) : (
                <div className="text-3xl sm:text-4xl font-black font-quicksand text-indigo-950 tracking-tight">
                  ₹{(stats?.earnings?.averageOrderValue ?? 0).toFixed(2)}
                </div>
              )}
              <div className="mt-2 text-xs text-indigo-700 font-medium">
                Average spend per completed order
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: MONTHLY ZIKSOK (ZIGZAG) REVENUE & DAYS CHART */}
      <div className="bg-white rounded-3xl border border-[#E2EAE1] p-6 shadow-xs space-y-6">
        {/* Chart Header with Year and Month Dropdowns */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2EAE1] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#EAF2EA] text-[#2D5A27]">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-quicksand font-bold text-lg text-gray-900">
                Monthly Days Performance (Zigzag Bar Chart)
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Select year and month to inspect daily fluctuating sales trajectory and order trends.
            </p>
          </div>

          {/* Year & Month Dropdown Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Year Dropdown (starts from 2026 to current year) */}
            <div className="flex items-center gap-2 bg-[#F9FBF9] border border-[#E2EAE1] rounded-2xl px-3 py-1.5 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-quicksand">
                Year:
              </span>
              <div className="relative inline-block">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="appearance-none bg-transparent pr-6 text-xs font-bold font-quicksand text-[#2D5A27] focus:outline-none cursor-pointer"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#2D5A27] absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Month Dropdown */}
            <div className="flex items-center gap-2 bg-[#F9FBF9] border border-[#E2EAE1] rounded-2xl px-3 py-1.5 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-quicksand">
                Month:
              </span>
              <div className="relative inline-block">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="appearance-none bg-transparent pr-6 text-xs font-bold font-quicksand text-[#2D5A27] focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#2D5A27] absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Monthly Aggregate Badges */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-[#EAF2EA] text-[#2D5A27] text-xs font-bold font-quicksand border border-[#C5DDC4]">
                Month: ₹{(stats?.monthRevenue ?? 0).toFixed(2)}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold font-quicksand">
                {stats?.monthOrdersCount ?? 0} Orders
              </span>
            </div>
          </div>
        </div>

        {/* Peak & Hover Details Tooltip Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-2xl bg-[#F9FBF9] border border-[#E2EAE1] text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#80C34A] animate-pulse" />
            <span className="font-semibold text-gray-700">
              {hoveredDay ? (
                <span>
                  Inspection: <strong className="text-gray-900">{hoveredDay.date} ({hoveredDay.dayName})</strong>
                  {' — '}
                  <span className="text-[#2D5A27] font-bold">₹{hoveredDay.revenue.toFixed(2)}</span> ({hoveredDay.ordersCount} orders)
                </span>
              ) : (
                <span>Hover over any day bar or zigzag point to inspect daily revenue and order counts.</span>
              )}
            </span>
          </div>

          {peakDayInfo && (
            <div className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-lg self-start sm:self-auto">
              Peak: Day {peakDayInfo.day} (₹{peakDayInfo.revenue.toFixed(2)})
            </div>
          )}
        </div>

        {/* Zigzag (Ziksok) Graph & Bars Canvas */}
        <div className="overflow-x-auto pb-3 pt-2 scrollbar-thin">
          <div className="min-w-[720px] relative">
            {/* SVG Zigzag (Ziksok) Line & Gradient Area Overlay */}
            <div className="absolute inset-x-0 top-0 h-48 pointer-events-none z-10">
              <svg
                viewBox="0 0 1000 180"
                preserveAspectRatio="none"
                className="w-full h-full overflow-visible"
              >
                <defs>
                  <linearGradient id="ziksokAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#80C34A" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#2D5A27" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="ziksokLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2D5A27" />
                    <stop offset="50%" stopColor="#80C34A" />
                    <stop offset="100%" stopColor="#2D5A27" />
                  </linearGradient>
                </defs>

                {/* Shaded Area Under Zigzag Line */}
                {svgPathData.area && (
                  <path d={svgPathData.area} fill="url(#ziksokAreaGradient)" />
                )}

                {/* Zigzag Polyline Path */}
                {svgPathData.path && (
                  <path
                    d={svgPathData.path}
                    fill="none"
                    stroke="url(#ziksokLineGradient)"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}

                {/* Zigzag Points / Circles on Peaks & Valleys */}
                {svgPathData.points.map((pt) => {
                  const isHovered = hoveredDay?.day === pt.day;
                  return (
                    <circle
                      key={pt.day}
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : pt.revenue > 0 ? 4 : 2.5}
                      className={`transition-all duration-150 ${isHovered
                        ? 'fill-[#80C34A] stroke-[#1E3F1B] stroke-2'
                        : pt.revenue > 0
                          ? 'fill-[#2D5A27] stroke-white stroke-1'
                          : 'fill-gray-300'
                        }`}
                    />
                  );
                })}
              </svg>
            </div>

            {/* Bars for Each Day of the Month */}
            <div className="h-48 flex items-end justify-between gap-1 sm:gap-1.5 px-1 relative z-20 pt-4">
              {monthDays.map((d) => {
                const heightPercent = maxDayRevenue > 0
                  ? Math.max(Math.round((d.revenue / maxDayRevenue) * 100), d.revenue > 0 ? 10 : 4)
                  : 4;
                const isHovered = hoveredDay?.day === d.day;

                return (
                  <div
                    key={d.day}
                    onMouseEnter={() => setHoveredDay(d)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  >
                    {/* Individual Day Bar */}
                    <div className="w-full max-w-[28px] h-full flex items-end justify-center">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-lg transition-all duration-300 ${isHovered
                          ? 'bg-[#80C34A] shadow-md shadow-[#80C34A]/30 scale-105'
                          : d.revenue > 0
                            ? 'bg-gradient-to-t from-[#2D5A27] to-[#518b48] opacity-80 group-hover:opacity-100'
                            : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-Axis Day Numbers & Day Names */}
            <div className="flex justify-between items-center gap-1 sm:gap-1.5 px-1 pt-3 border-t border-gray-100 text-[10px] font-bold font-quicksand text-gray-400">
              {monthDays.map((d) => (
                <div
                  key={d.day}
                  className={`flex-1 text-center truncate ${hoveredDay?.day === d.day ? 'text-[#2D5A27] font-black' : ''
                    }`}
                >
                  <div>{d.day}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend Indicator */}
        <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#2D5A27]" />
              <span>Daily Earnings Bar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-[#80C34A] rounded-full" />
              <span>Zigzag (Ziksok) Trajectory Line</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#80C34A]" />
              <span>Peak Day Node</span>
            </div>
          </div>

          <div className="font-semibold text-gray-600">
            Showing all {monthDays.length} days of {MONTH_NAMES.find((m) => m.value === selectedMonth)?.label} {selectedYear}
          </div>
        </div>
      </div>

      {/* SECTION 3: ORDER STATUS BREAKDOWN & DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Progress Bar */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#E2EAE1] p-6 shadow-xs space-y-6">
          <div className="border-b border-[#E2EAE1] pb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              <h3 className="font-quicksand font-bold text-base text-gray-900">
                Order Lifecycle Distribution
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Proportionate breakdown of orders currently in each fulfillment stage.
            </p>
          </div>

          {/* Multi-Segment Status Progress Bar */}
          <div className="space-y-2">
            <div className="h-5 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
              {totalOrders > 0 ? (
                <>
                  <div
                    style={{ width: `${orderedPercent}%` }}
                    className="bg-amber-400 transition-all duration-500"
                    title={`Ordered: ${stats?.orders?.ordered || 0} (${orderedPercent}%)`}
                  />
                  <div
                    style={{ width: `${packedPercent}%` }}
                    className="bg-blue-500 transition-all duration-500"
                    title={`Packed: ${stats?.orders?.packed || 0} (${packedPercent}%)`}
                  />
                  <div
                    style={{ width: `${outForDeliveryPercent}%` }}
                    className="bg-purple-500 transition-all duration-500"
                    title={`Out for Delivery: ${stats?.orders?.outForDelivery || 0} (${outForDeliveryPercent}%)`}
                  />
                  <div
                    style={{ width: `${deliveredPercent}%` }}
                    className="bg-emerald-500 transition-all duration-500"
                    title={`Delivered: ${stats?.orders?.delivered || 0} (${deliveredPercent}%)`}
                  />
                  <div
                    style={{ width: `${cancelledPercent}%` }}
                    className="bg-rose-400 transition-all duration-500"
                    title={`Cancelled: ${stats?.orders?.cancelled || 0} (${cancelledPercent}%)`}
                  />
                </>
              ) : (
                <div className="w-full bg-gray-200" />
              )}
            </div>
            <div className="text-[11px] text-gray-400 text-right font-semibold">
              {totalOrders} Total Orders Tracked
            </div>
          </div>

          {/* Status Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-center">
              <div className="text-[11px] font-bold text-amber-800 font-quicksand uppercase">Ordered</div>
              <div className="text-lg font-black text-amber-900 font-quicksand mt-0.5">{stats?.orders?.ordered ?? 0}</div>
              <div className="text-[10px] text-amber-700">{orderedPercent}%</div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-center">
              <div className="text-[11px] font-bold text-blue-800 font-quicksand uppercase">Packed</div>
              <div className="text-lg font-black text-blue-900 font-quicksand mt-0.5">{stats?.orders?.packed ?? 0}</div>
              <div className="text-[10px] text-blue-700">{packedPercent}%</div>
            </div>

            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-center">
              <div className="text-[11px] font-bold text-purple-800 font-quicksand uppercase">In Transit</div>
              <div className="text-lg font-black text-purple-900 font-quicksand mt-0.5">{stats?.orders?.outForDelivery ?? 0}</div>
              <div className="text-[10px] text-purple-700">{outForDeliveryPercent}%</div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
              <div className="text-[11px] font-bold text-emerald-800 font-quicksand uppercase">Delivered</div>
              <div className="text-lg font-black text-emerald-900 font-quicksand mt-0.5">{stats?.orders?.delivered ?? 0}</div>
              <div className="text-[10px] text-emerald-700">{deliveredPercent}%</div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-center">
              <div className="text-[11px] font-bold text-rose-800 font-quicksand uppercase">Cancelled</div>
              <div className="text-lg font-black text-rose-900 font-quicksand mt-0.5">{stats?.orders?.cancelled ?? 0}</div>
              <div className="text-[10px] text-rose-700">{cancelledPercent}%</div>
            </div>
          </div>
        </div>

        {/* Quick Link Card to Orders Management */}
        <div className="bg-gradient-to-br from-[#1E3F1B] to-[#2D5A27] text-white rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#80C34A] text-xs font-bold font-quicksand backdrop-blur-md border border-white/10 mb-3">
              <Clock className="w-3.5 h-3.5" />
              <span>Real-Time Processing</span>
            </div>
            <h4 className="text-xl font-bold font-quicksand text-white">
              Orders Management Desk
            </h4>
            <p className="text-xs text-[#D1E6CE] mt-2 leading-relaxed">
              Open the full management pipeline to update fulfillment statuses, review customer addresses, or inspect individual line items.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-between text-xs">
              <span>Pending Orders Waiting:</span>
              <strong className="text-sm text-[#80C34A] font-bold">{stats?.orders?.ordered ?? 0}</strong>
            </div>

            <Link
              href="/shop/orders"
              className="w-full py-3 rounded-xl bg-white hover:bg-[#F2F7F2] text-[#2D5A27] font-bold font-quicksand text-xs flex items-center justify-center gap-2 transition shadow-md"
            >
              <span>Manage Orders Now</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION 4: CUSTOMER BASE & ENGAGEMENT STATS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-gradient-to-r from-[#2D5A27] to-[#80C34A] shadow-xs" />
            <h3 className="text-sm sm:text-base font-extrabold font-quicksand text-gray-800 uppercase tracking-wider">
              Customer Base & Retention
            </h3>
          </div>
          <Link
            href="/shop/customers"
            className="text-xs font-bold font-quicksand text-[#2D5A27] hover:underline flex items-center gap-1"
          >
            <span>Customer Management</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Registered Customers */}
          <div className="relative bg-gradient-to-br from-emerald-50/80 via-white to-[#F2F7F2] p-6 rounded-3xl border border-emerald-200 shadow-xs hover:shadow-xl hover:border-emerald-300 transition-all duration-300 group overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#2D5A27] font-quicksand">
                Total Customers
              </span>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#2D5A27] to-[#80C34A] text-white shadow-lg shadow-[#2D5A27]/25 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5">
              <div className="text-4xl font-black font-quicksand text-gray-900 tracking-tight">
                {totalCustomersCount}
              </div>
              <div className="mt-4 w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#2D5A27] to-[#80C34A] h-full rounded-full transition-all duration-700"
                  style={{ width: `${activeCustomerRatio}%` }}
                />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-[#2D5A27] font-bold font-quicksand pt-3 border-t border-emerald-100">
                <span>All Registered Accounts</span>
                <Link href="/shop/customers" className="flex items-center gap-1 hover:underline">
                  <span>Directory</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Active Customers */}
          <div className="relative bg-gradient-to-br from-teal-50/90 via-white to-emerald-50/40 p-6 rounded-3xl border border-teal-200 shadow-xs hover:shadow-xl hover:border-teal-300 transition-all duration-300 group overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-teal-800 font-quicksand">
                Active Customers
              </span>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-lg shadow-teal-500/25 group-hover:scale-105 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5">
              <div className="text-4xl font-black font-quicksand text-teal-900 tracking-tight">
                {activeCustomersCount}
              </div>
              <div className="mt-4 text-xs text-teal-800 font-semibold pt-3 border-t border-teal-100 flex items-center justify-between font-quicksand">
                <span>Placed 1+ Orders</span>
                <span className="font-extrabold text-teal-700">{activeCustomerRatio}% Conversion</span>
              </div>
            </div>
          </div>

          {/* New This Month */}
          <div className="relative bg-gradient-to-br from-blue-50/80 via-white to-sky-50/40 p-6 rounded-3xl border border-blue-200 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all duration-300 group overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800 font-quicksand">
                New This Month
              </span>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-700 text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5">
              <div className="text-4xl font-black font-quicksand text-blue-900 tracking-tight">
                {stats?.customers?.newThisMonth ?? 0}
              </div>
              <div className="mt-4 text-xs text-blue-800 font-semibold pt-3 border-t border-blue-100 flex items-center justify-between font-quicksand">
                <span>Joined in {selectedMonthName}</span>
                <span className="font-bold text-blue-600">Fresh Acquisition</span>
              </div>
            </div>
          </div>

          {/* Unconverted Leads / No Orders */}
          <div className="relative bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 p-6 rounded-3xl border border-amber-200 shadow-xs hover:shadow-xl hover:border-amber-300 transition-all duration-300 group overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 font-quicksand">
                Awaiting First Order
              </span>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform">
                <UserX className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5">
              <div className="text-4xl font-black font-quicksand text-amber-900 tracking-tight">
                {stats?.customers?.noOrdersCount ?? 0}
              </div>
              <div className="mt-4 text-xs text-amber-800 font-semibold pt-3 border-t border-amber-100 flex items-center justify-between font-quicksand">
                <span>No orders placed yet</span>
                <span className="font-bold text-amber-700">Re-engage</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: CATEGORY CATALOG STATS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-xs" />
            <h3 className="text-sm sm:text-base font-extrabold font-quicksand text-gray-800 uppercase tracking-wider">
              Produce Category Catalog
            </h3>
          </div>
          <span className="text-xs font-extrabold font-quicksand text-indigo-700 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-200/80 shadow-2xs">
            {categoryActivePercent}% Active Ratio
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Total Categories Card */}
          <div className="relative bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 p-6 rounded-3xl border border-indigo-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 transition-all duration-300 group overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 font-quicksand">
                Total Categories
              </span>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5">
              <div className="text-4xl font-black font-quicksand text-indigo-950 tracking-tight">
                {stats?.totalCategories ?? 0}
              </div>
              <div className="mt-4 w-full bg-indigo-100/80 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-600 to-purple-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${categoryActivePercent}%` }}
                />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-indigo-700 font-bold font-quicksand pt-3 border-t border-indigo-100">
                <span>Main Product Groups</span>
                <Link href="/shop/category" className="flex items-center gap-1 hover:underline">
                  <span>Manage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Active Categories Card */}
          <div className="relative bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50 p-6 rounded-3xl border border-emerald-200/90 shadow-xs hover:shadow-xl hover:border-emerald-300 transition-all duration-300 group overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 font-quicksand">
                Active Categories
              </span>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5">
              <div className="text-4xl font-black font-quicksand text-emerald-800 tracking-tight">
                {stats?.activeCategories ?? 0}
              </div>
              <div className="mt-4 text-xs text-emerald-800 font-semibold pt-3 border-t border-emerald-100 flex items-center justify-between font-quicksand">
                <span>Published on Storefront</span>
                <span className="font-extrabold text-emerald-700">{categoryActivePercent}% Live</span>
              </div>
            </div>
          </div>

          {/* Inactive Categories Card */}
          <div className="relative bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 p-6 rounded-3xl border border-amber-200/90 shadow-xs hover:shadow-xl hover:border-amber-300 transition-all duration-300 group overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 font-quicksand">
                Inactive Categories
              </span>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform">
                <XCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5">
              <div className="text-4xl font-black font-quicksand text-amber-900 tracking-tight">
                {stats?.inactiveCategories ?? 0}
              </div>
              <div className="mt-4 text-xs text-amber-800 font-semibold pt-3 border-t border-amber-100 flex items-center justify-between font-quicksand">
                <span>Hidden from Catalog</span>
                <span className="font-bold text-amber-700">Archived</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: SUBCATEGORY (ITEMS) STATS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xs" />
            <h3 className="text-sm sm:text-base font-extrabold font-quicksand text-gray-800 uppercase tracking-wider">
              Subcategory (Product Items)
            </h3>
          </div>
          <span className="text-xs font-extrabold font-quicksand text-emerald-800 bg-emerald-100/70 px-3.5 py-1 rounded-full border border-emerald-300/80 shadow-2xs">
            {subCategoryActivePercent}% Active Ratio
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Total Subcategories Card */}
          <div className="relative bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 p-6 rounded-3xl border border-emerald-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 transition-all duration-300 group overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 font-quicksand">
                Total Products
              </span>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                <FolderTree className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5">
              <div className="text-4xl font-black font-quicksand text-emerald-950 tracking-tight">
                {stats?.totalSubCategories ?? 0}
              </div>
              <div className="mt-4 w-full bg-emerald-100/80 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${subCategoryActivePercent}%` }}
                />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-emerald-800 font-bold font-quicksand pt-3 border-t border-emerald-100">
                <span>SKU Offerings</span>
                <Link href="/shop/sub-category" className="flex items-center gap-1 hover:underline">
                  <span>Manage Items</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Active Subcategories Card */}
          <div className="relative bg-gradient-to-br from-teal-50/90 via-white to-emerald-50/50 p-6 rounded-3xl border border-teal-200/90 shadow-xs hover:shadow-xl hover:border-teal-300 transition-all duration-300 group overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-teal-800 font-quicksand">
                Active Items
              </span>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-700 text-white shadow-lg shadow-teal-500/25 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5">
              <div className="text-4xl font-black font-quicksand text-teal-900 tracking-tight">
                {stats?.activeSubCategories ?? 0}
              </div>
              <div className="mt-4 text-xs text-teal-800 font-semibold pt-3 border-t border-teal-100 flex items-center justify-between font-quicksand">
                <span>Available for Ordering</span>
                <span className="font-extrabold text-teal-700">{subCategoryActivePercent}% In Stock</span>
              </div>
            </div>
          </div>

          {/* Inactive Subcategories Card */}
          <div className="relative bg-gradient-to-br from-rose-50/80 via-white to-pink-50/40 p-6 rounded-3xl border border-rose-200/90 shadow-xs hover:shadow-xl hover:border-rose-300 transition-all duration-300 group overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-rose-800 font-quicksand">
                Inactive Items
              </span>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 text-white shadow-lg shadow-rose-500/25 group-hover:scale-105 transition-transform">
                <XCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5">
              <div className="text-4xl font-black font-quicksand text-rose-900 tracking-tight">
                {stats?.inactiveSubCategories ?? 0}
              </div>
              <div className="mt-4 text-xs text-rose-800 font-semibold pt-3 border-t border-rose-100 flex items-center justify-between font-quicksand">
                <span>Disabled from Checkout</span>
                <span className="font-bold text-rose-700">Paused</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
