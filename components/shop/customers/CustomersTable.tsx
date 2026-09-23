'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  Package,
  ShoppingCart,
  Eye,
  MessageSquare
} from 'lucide-react';
import type { CustomerSummary } from '@/app/api/shop/customers/route';
import CustomerDetailsModal from './CustomerDetailsModal';
import Pagination from '@/components/common/Pagination';

interface CustomersTableProps {
  customers: CustomerSummary[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedFilter: string;
  onRetry: () => void;
}

export default function CustomersTable({
  customers,
  loading,
  error,
  searchQuery,
  selectedFilter,
  onRetry,
}: CustomersTableProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filter customers by search and filter tab
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      // 1. Status / Order filter
      if (selectedFilter === 'with-orders' && customer.totalOrders === 0) {
        return false;
      }
      if (selectedFilter === 'no-orders' && customer.totalOrders > 0) {
        return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idStr = String(customer.id);
        const name = (customer.fullName || '').toLowerCase();
        const email = (customer.email || '').toLowerCase();
        const phone = (customer.phoneNumber || '').toLowerCase();
        const city = (customer.defaultAddress?.city || '').toLowerCase();
        const street = (customer.defaultAddress?.streetName || '').toLowerCase();

        return (
          idStr.includes(q) ||
          `#cust-${idStr}`.includes(q) ||
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          city.includes(q) ||
          street.includes(q)
        );
      }

      return true;
    });
  }, [customers, searchQuery, selectedFilter]);

  // Reset page to 1 only when filters or search actually changes
  const prevFilterRef = React.useRef({ searchQuery, selectedFilter });
  React.useEffect(() => {
    if (
      prevFilterRef.current.searchQuery !== searchQuery ||
      prevFilterRef.current.selectedFilter !== selectedFilter
    ) {
      prevFilterRef.current = { searchQuery, selectedFilter };
      setPage(1);
    }
  }, [searchQuery, selectedFilter]);

  // Paginated slice
  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, page, pageSize]);

  const getInitials = (name?: string | null) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatDate = (dateValue?: string | Date | null) => {
    if (!dateValue) return 'N/A';
    try {
      return new Date(dateValue).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return String(dateValue);
    }
  };

  // 1. Loading State Skeleton
  if (loading && customers.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2EAE1] overflow-hidden shadow-xs">
        <div className="p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EAF2EA] text-[#2D5A27] flex items-center justify-center mx-auto animate-pulse">
            <Users className="w-7 h-7 animate-spin" />
          </div>
          <div className="space-y-2 max-w-sm mx-auto">
            <div className="h-4 bg-gray-200 rounded-full w-3/4 mx-auto animate-pulse" />
            <div className="h-3 bg-gray-100 rounded-full w-1/2 mx-auto animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="font-quicksand font-bold text-lg text-gray-900">Failed to Load Customers</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">{error}</p>
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-[#2D5A27] hover:bg-[#21431d] text-white font-quicksand font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-xs transition"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Now</span>
        </button>
      </div>
    );
  }

  // 3. Empty State
  if (filteredCustomers.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2EAE1] p-12 text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-[#F2F7F2] text-[#2D5A27] flex items-center justify-center mx-auto mb-4 border border-[#E2EAE1]">
          <Users className="w-7 h-7" />
        </div>
        <h3 className="font-quicksand font-bold text-lg text-gray-900">No Customers Found</h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-sm mx-auto">
          {searchQuery || selectedFilter !== 'all'
            ? 'No customers match your current filter and search criteria.'
            : 'There are currently no registered customers in the database.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-2xl border border-[#E2EAE1] overflow-hidden shadow-xs font-nunito">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2EAE1] bg-[#F9FBF9] text-[11px] font-bold uppercase tracking-wider text-gray-400 font-quicksand">
                <th className="py-3.5 px-6">Customer</th>
                <th className="py-3.5 px-6">Contact Details</th>
                <th className="py-3.5 px-6">Primary Address</th>
                <th className="py-3.5 px-6">Orders & Value</th>
                <th className="py-3.5 px-6">Cart Activity</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2EAE1] text-sm">
              {paginatedCustomers.map((customer) => {
                const defAddr = customer.defaultAddress;

                return (
                  <tr
                    key={customer.id}
                    className="hover:bg-[#F9FBF9] transition duration-150 cursor-pointer"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    {/* 1. Customer Column */}
                    <td className="py-4 px-6 align-top">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#F2F7F2] border border-[#E2EAE1] overflow-hidden shrink-0 flex items-center justify-center text-[#2D5A27] font-bold">
                          {customer.profileImage ? (
                            <img
                              src={customer.profileImage}
                              alt={customer.fullName || 'Customer'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span>{getInitials(customer.fullName)}</span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-bold text-gray-900 truncate max-w-[160px]">
                            {customer.fullName || 'Registered User'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[11px] font-bold text-[#2D5A27] bg-[#EAF2EA] px-1.5 py-0.2 rounded">
                              #CUST-{customer.id}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              Joined {formatDate(customer.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Contact Details */}
                    <td className="py-4 px-6 align-top">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-700">
                          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{customer.email}</span>
                        </div>
                        {customer.phoneNumber ? (
                          <div className="flex items-center gap-1.5 text-xs text-gray-700">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{customer.phoneNumber}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-gray-400 italic">No phone provided</div>
                        )}
                      </div>
                    </td>

                    {/* 3. Primary Address */}
                    <td className="py-4 px-6 align-top">
                      {defAddr ? (
                        <div className="space-y-0.5 max-w-[200px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 border border-gray-200">
                              {defAddr.addressType || 'Home'}
                            </span>
                            {customer.addressCount > 1 && (
                              <span className="text-[11px] text-gray-400">
                                +{customer.addressCount - 1} more
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-700 truncate">
                            {defAddr.buildingName ? `${defAddr.buildingName}, ` : ''}
                            {defAddr.streetName}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">
                            {defAddr.city}
                            {defAddr.pincode ? ` - ${defAddr.pincode}` : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No address added</span>
                      )}
                    </td>

                    {/* 4. Orders & Lifetime Value */}
                    <td className="py-4 px-6 align-top">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                              customer.totalOrders > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {customer.totalOrders} {customer.totalOrders === 1 ? 'Order' : 'Orders'}
                          </span>
                          <span className="font-quicksand font-bold text-sm text-gray-900">
                            ₹{customer.totalSpent.toFixed(0)}
                          </span>
                        </div>
                        {customer.lastOrderDate ? (
                          <div className="text-[11px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Last: {formatDate(customer.lastOrderDate)}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-gray-400">Never ordered</div>
                        )}
                      </div>
                    </td>

                    {/* 5. Cart Activity */}
                    <td className="py-4 px-6 align-top">
                      {customer.cartItemCount > 0 ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-lime-50 border border-lime-200 text-[#2D5A27] text-xs font-bold">
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{customer.cartItemCount} in Cart</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Cart Empty</span>
                      )}
                    </td>

                    {/* 6. Actions */}
                    <td className="py-4 px-6 align-top text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(customer);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#EAF2EA] border border-[#E2EAE1] hover:border-[#2D5A27] text-[#2D5A27] font-quicksand font-bold text-xs inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                        title="View Customer Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View (for screens below lg) */}
      <div className="lg:hidden space-y-3">
        {paginatedCustomers.map((customer) => {
          const defAddr = customer.defaultAddress;

          return (
            <div
              key={customer.id}
              className="bg-white rounded-2xl border border-[#E2EAE1] p-4 shadow-xs space-y-3"
              onClick={() => setSelectedCustomer(customer)}
            >
              {/* Card Header: Avatar, Name, ID, Actions */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#F2F7F2] border border-[#E2EAE1] overflow-hidden shrink-0 flex items-center justify-center text-[#2D5A27] font-bold text-lg">
                    {customer.profileImage ? (
                      <img
                        src={customer.profileImage}
                        alt={customer.fullName || 'Customer'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>{getInitials(customer.fullName)}</span>
                    )}
                  </div>
                  <div>
                    <div className="font-quicksand font-bold text-base text-gray-900">
                      {customer.fullName || 'Registered User'}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs font-bold text-[#2D5A27] bg-[#EAF2EA] px-2 py-0.5 rounded">
                        #CUST-{customer.id}
                      </span>
                      <span className="text-xs text-gray-400">
                        Joined {formatDate(customer.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCustomer(customer);
                  }}
                  className="p-2 rounded-xl bg-[#F2F7F2] text-[#2D5A27] hover:bg-[#EAF2EA] transition"
                  title="View Profile"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              {/* Contact Information */}
              <div className="p-2.5 rounded-xl bg-[#F9FBF9] border border-[#E2EAE1] space-y-1 text-xs text-gray-700">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </div>
                {customer.phoneNumber && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{customer.phoneNumber}</span>
                  </div>
                )}
                {defAddr && (
                  <div className="flex items-center gap-1.5 text-gray-500 pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">
                      {defAddr.streetName}, {defAddr.city}
                    </span>
                  </div>
                )}
              </div>

              {/* Orders & Spending Strip */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold ${
                      customer.totalOrders > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {customer.totalOrders} {customer.totalOrders === 1 ? 'Order' : 'Orders'}
                  </span>
                  {customer.cartItemCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full font-bold bg-lime-100 text-lime-800">
                      {customer.cartItemCount} in Cart
                    </span>
                  )}
                </div>

                <div className="font-quicksand font-bold text-sm text-gray-900">
                  ₹{customer.totalSpent.toFixed(0)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      <Pagination
        page={page}
        limit={pageSize}
        total={filteredCustomers.length}
        totalPages={totalPages}
        onPageChange={(newPage) => setPage(newPage)}
        itemName="customers"
      />

      {/* Customer Details Modal */}
      <CustomerDetailsModal
        isOpen={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        customer={selectedCustomer}
      />
    </div>
  );
}
