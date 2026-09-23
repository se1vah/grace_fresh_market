'use client';

import React, { useState, useEffect, useCallback } from 'react';
import CMSHeader from './CMSHeader';
import CMSFilters from './CMSFilters';
import CMSTable, { CMSPageData } from './CMSTable';
import CMSPagination from './CMSPagination';
import CMSFormModal from './CMSFormModal';
import CMSDeleteModal from './CMSDeleteModal';
import { CheckCircle2, X } from 'lucide-react';

export default function CMSDashboard() {
  const [pages, setPages] = useState<CMSPageData[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [pageToEdit, setPageToEdit] = useState<CMSPageData | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<CMSPageData | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const loadCMSPages = useCallback(
    async (targetPage: number, searchQuery: string, currentStatus: string) => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          page: String(targetPage),
          limit: String(limit),
          search: searchQuery,
          status: currentStatus,
        });

        const res = await fetch(`/api/shop/cms?${queryParams.toString()}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to fetch CMS pages');
          return;
        }

        setPages(data.data || []);
        setPagination(
          data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 }
        );

        if (data.pagination && data.pagination.page !== targetPage) {
          setPage(data.pagination.page);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load CMS page data.');
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    loadCMSPages(page, search, statusFilter);
  }, [page, search, statusFilter, loadCMSPages]);

  const handleSearchChange = useCallback((newSearch: string) => {
    setSearch((prev) => {
      if (prev !== newSearch) {
        setPage(1);
        return newSearch;
      }
      return prev;
    });
  }, []);

  const handleStatusChange = useCallback((newStatus: string) => {
    setStatusFilter((prev) => {
      if (prev !== newStatus) {
        setPage(1);
        return newStatus;
      }
      return prev;
    });
  }, []);

  const handleAddClick = () => {
    setPageToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleEditClick = (cmsPage: CMSPageData) => {
    setPageToEdit(cmsPage);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (cmsPage: CMSPageData) => {
    setPageToDelete(cmsPage);
    setIsDeleteModalOpen(true);
  };

  const handleFormSuccess = () => {
    showToast(
      pageToEdit
        ? 'CMS page updated successfully!'
        : 'New CMS page created successfully!'
    );
    setPageToEdit(null);
    loadCMSPages(page, search, statusFilter);
  };

  const handleDeleteSuccess = () => {
    showToast('CMS page deleted successfully!');
    if (pages.length === 1 && page > 1) {
      setPage(page - 1);
    } else {
      loadCMSPages(page, search, statusFilter);
    }
  };

  return (
    <div className="space-y-6 font-nunito">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 bg-[#2D5A27] text-[#80C34A] text-white font-quicksand font-bold text-xs sm:text-sm rounded-xl shadow-xl animate-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-5 h-5 text-[#80C34A]" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 text-white/70 hover:text-white transition cursor-pointer ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <CMSHeader onAddClick={handleAddClick} />

      {/* Filters (Search & Status) */}
      <CMSFilters
        search={search}
        status={statusFilter}
        loading={loading}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onRefresh={() => loadCMSPages(page, search, statusFilter)}
      />

      {/* Data Table */}
      <CMSTable
        pages={pages}
        loading={loading}
        error={error}
        searchQuery={search}
        statusFilter={statusFilter}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onAddClick={handleAddClick}
        onRetry={() => loadCMSPages(page, search, statusFilter)}
      />

      {/* Pagination Controls */}
      {!loading && !error && pages.length > 0 && (
        <CMSPagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={(newPage) => setPage(newPage)}
        />
      )}

      {/* Add / Edit Form Modal */}
      <CMSFormModal
        key={pageToEdit ? `edit-${pageToEdit.id}` : 'add'}
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setPageToEdit(null);
        }}
        onSuccess={handleFormSuccess}
        pageToEdit={pageToEdit}
      />

      {/* Delete Confirmation Modal */}
      <CMSDeleteModal
        isOpen={isDeleteModalOpen}
        page={pageToDelete}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
