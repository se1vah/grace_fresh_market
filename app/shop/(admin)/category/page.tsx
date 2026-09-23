'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Layers, RefreshCw } from 'lucide-react';
import SearchInput from '@/components/common/SearchInput';
import Pagination from '@/components/common/Pagination';
import CategoryTable from '@/components/shop/category/CategoryTable';
import CategoryModal, { CategoryData } from '@/components/shop/category/CategoryModal';
import DeleteCategoryModal from '@/components/shop/category/DeleteCategoryModal';

export default function CategoryManagementPage() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<CategoryData | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryData | null>(null);

  // Fetch categories function
  const loadCategories = useCallback(async (targetPage: number, searchQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/shop/categories?page=${targetPage}&limit=${limit}&search=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch categories');
        return;
      }

      setCategories(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });

      // If server adjusted the page (e.g. current page became out of bounds)
      if (data.pagination && data.pagination.page !== targetPage) {
        setPage(data.pagination.page);
      }
    } catch (err: any) {
      console.error('Error loading categories:', err);
      setError(err.message || 'Failed to load category data.');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadCategories(page, search);
  }, [page, search, loadCategories]);

  // Handle Search Input Change
  const handleSearchChange = useCallback((newSearch: string) => {
    setSearch((prev) => {
      if (prev !== newSearch) {
        setPage(1); // Only reset to page 1 on new search
        return newSearch;
      }
      return prev;
    });
  }, []);

  // Handle Add Category Click
  const handleAddClick = () => {
    setCategoryToEdit(null);
    setIsModalOpen(true);
  };

  // Handle Edit Click
  const handleEditClick = (cat: CategoryData) => {
    setCategoryToEdit(cat);
    setIsModalOpen(true);
  };

  // Handle Delete Click
  const handleDeleteClick = (cat: CategoryData) => {
    setCategoryToDelete(cat);
    setIsDeleteModalOpen(true);
  };

  // Handle Successful Category Delete
  const handleDeleteSuccess = () => {
    // If deleted category was the last item on the current page (and not on page 1)
    if (categories.length === 1 && page > 1) {
      const prevPage = page - 1;
      setPage(prevPage);
    } else {
      loadCategories(page, search);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#EAF2EA] text-[#2D5A27]">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold font-quicksand text-gray-900 tracking-tight">
              Categories
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Organize and manage organic produce product classifications.
          </p>
        </div>

        {/* Top-Right Add Category Button */}
        <button
          onClick={handleAddClick}
          className="px-4 py-2.5 bg-[#2D5A27] hover:bg-[#21431d] text-white font-quicksand font-bold text-xs sm:text-sm rounded-xl inline-flex items-center justify-center gap-2 shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Search Bar & Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E2EAE1] shadow-xs">
        <SearchInput
          value={search}
          placeholder="Search categories by name..."
          onSearch={handleSearchChange}
        />

        <div className="flex items-center justify-end gap-2 text-xs font-semibold text-gray-500">
          <button
            onClick={() => loadCategories(page, search)}
            disabled={loading}
            className="p-2 rounded-xl border border-[#E2EAE1] hover:bg-[#F2F7F2] hover:text-[#2D5A27] transition cursor-pointer"
            title="Refresh table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Categories Responsive Table */}
      <CategoryTable
        categories={categories}
        loading={loading}
        error={error}
        searchQuery={search}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onAddClick={handleAddClick}
        onRetry={() => loadCategories(page, search)}
      />

      {/* Pagination Controls */}
      {!loading && !error && categories.length > 0 && (
        <Pagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={(newPage) => setPage(newPage)}
          itemName="categories"
        />
      )}

      {/* Add / Edit Category Modal */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => loadCategories(page, search)}
        categoryToEdit={categoryToEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteCategoryModal
        isOpen={isDeleteModalOpen}
        category={categoryToDelete}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
