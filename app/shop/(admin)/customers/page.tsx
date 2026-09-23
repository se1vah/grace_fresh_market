'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  TrendingUp,
  RefreshCw,
  Download,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import SearchInput from '@/components/common/SearchInput';
import CustomersTable from '@/components/shop/customers/CustomersTable';
import type { CustomerSummary } from '@/app/api/shop/customers/route';

interface CustomerStats {
  totalCustomers: number;
  activeShoppers: number;
  newCustomersThisMonth: number;
  totalLifetimeSpent: number;
}

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    activeShoppers: 0,
    newCustomersThisMonth: 0,
    totalLifetimeSpent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'with-orders' | 'no-orders'>('all');

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/shop/customers', { cache: 'no-store' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || `HTTP error ${res.status}`);
        return;
      }
      const data = await res.json();
      setCustomers(data.data || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError(err?.message || 'Failed to fetch customer data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Export to CSV feature
  const handleExportCSV = () => {
    if (customers.length === 0) return;

    const headers = [
      'Customer ID',
      'Full Name',
      'Email',
      'Phone Number',
      'Registered Date',
      'Total Orders',
      'Total Spent (INR)',
      'Last Order Date',
      'Default Address',
      'City',
      'Pincode',
    ];

    const rows = customers.map((c) => [
      `"${c.id}"`,
      `"${(c.fullName || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.phoneNumber || '').replace(/"/g, '""')}"`,
      `"${c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US') : ''}"`,
      c.totalOrders,
      c.totalSpent.toFixed(2),
      `"${c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('en-US') : 'N/A'}"`,
      `"${c.defaultAddress ? `${c.defaultAddress.buildingName || ''} ${c.defaultAddress.streetName || ''}`.trim().replace(/"/g, '""') : ''}"`,
      `"${(c.defaultAddress?.city || '').replace(/"/g, '""')}"`,
      `"${(c.defaultAddress?.pincode || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Grace_Fresh_Market_Customers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filterTabs = [
    { id: 'all', label: 'All Customers', count: stats.totalCustomers },
    {
      id: 'with-orders',
      label: 'Active Customers',
      count: stats.activeShoppers,
      badgeClass: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'no-orders',
      label: 'No Orders Yet',
      count: stats.totalCustomers - stats.activeShoppers,
      badgeClass: 'bg-amber-100 text-amber-800',
    },
  ];

  return (
    <div className="space-y-6 font-nunito pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#EAF2EA] text-[#2D5A27]">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-quicksand text-gray-900 tracking-tight">
              Customer Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Directory of registered shoppers, address books, lifetime purchase metrics, and profile details.
          </p>
        </div>

        {/* Actions: Live Count, Export CSV & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EAF2EA] border border-[#C5DDC4] text-xs font-bold text-[#2D5A27] font-quicksand">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#80C34A]" />
            <span>{stats.totalCustomers} Registered Customers</span>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={customers.length === 0}
            className="px-3 py-2 rounded-xl border border-[#E2EAE1] bg-white hover:bg-[#F2F7F2] hover:text-[#2D5A27] text-gray-700 text-xs font-bold font-quicksand flex items-center gap-1.5 transition shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export customer list to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Export CSV</span>
          </button>

          <button
            onClick={() => fetchCustomers()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#E2EAE1] bg-white hover:bg-[#F2F7F2] hover:text-[#2D5A27] text-gray-600 transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh customer list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2EAE1] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-quicksand">
              Total Customers
            </span>
            <div className="p-2 rounded-xl bg-[#F2F7F2] text-[#2D5A27]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-quicksand text-gray-900">
            {stats.totalCustomers}
          </div>
          <div className="text-xs text-gray-500 font-medium">All registered accounts</div>
        </div>

        {/* Active Customers */}
        <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 font-quicksand">
              Active Customers
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-quicksand text-emerald-900">
            {stats.activeShoppers}
          </div>
          <div className="text-xs text-emerald-700 font-medium">Have placed 1+ orders</div>
        </div>

        {/* New Customers This Month */}
        <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 font-quicksand">
              New This Month
            </span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-quicksand text-blue-900">
            {stats.newCustomersThisMonth}
          </div>
          <div className="text-xs text-blue-700 font-medium">Joined in current month</div>
        </div>

        {/* Lifetime Revenue from Customers */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2EAE1] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-quicksand">
              Lifetime Value
            </span>
            <div className="p-2 rounded-xl bg-[#EAF2EA] text-[#2D5A27]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-quicksand text-[#2D5A27] truncate">
            ₹{stats.totalLifetimeSpent.toFixed(0)}
          </div>
          <div className="text-xs text-gray-500 font-medium">Excl. cancelled orders</div>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filterTabs.map((tab) => {
          const isActive = selectedFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-quicksand whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${isActive
                ? 'bg-[#2D5A27] text-white shadow-xs shadow-[#2D5A27]/20'
                : 'bg-white border border-[#E2EAE1] text-gray-600 hover:bg-[#F2F7F2] hover:text-[#2D5A27]'
                }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${isActive
                  ? 'bg-white/20 text-white'
                  : tab.badgeClass || 'bg-gray-100 text-gray-600'
                  }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-[#E2EAE1] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <SearchInput
          value={search}
          placeholder="Search by customer name, email, phone, city, or street..."
          onSearch={handleSearchChange}
          className="max-w-xl"
        />

        <div className="text-xs font-semibold text-gray-400 px-2 sm:px-0 self-end sm:self-auto">
          Showing {customers.length} total customer records
        </div>
      </div>

      {/* Customers Table Component */}
      <CustomersTable
        customers={customers}
        loading={loading}
        error={error}
        searchQuery={search}
        selectedFilter={selectedFilter}
        onRetry={fetchCustomers}
      />
    </div>
  );
}
