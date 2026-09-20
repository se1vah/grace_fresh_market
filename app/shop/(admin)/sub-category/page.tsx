'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, FolderTree, RefreshCw, Filter, ChevronDown } from 'lucide-react';
import SearchInput from '@/components/common/SearchInput';
import Pagination from '@/components/common/Pagination';
import SubCategoryTable, { SubCategoryData } from '@/components/shop/sub-category/SubCategoryTable';
import SubCategoryModal from '@/components/shop/sub-category/SubCategoryModal';
import DeleteSubCategoryModal from '@/components/shop/sub-category/DeleteSubCategoryModal';

export default function SubCategoryManagementPage() {
  const [subCategories, setSubCategories] = useState<SubCategoryData[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [categoriesList, setCategoriesList] = useState<{ id: number; category_name: string }[]>([]);

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
  const [subCategoryToEdit, setSubCategoryToEdit] = useState<SubCategoryData | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [subCategoryToDelete, setSubCategoryToDelete] = useState<SubCategoryData | null>(null);

  // Fetch active categories for the category filter dropdown
  useEffect(() => {
    async function fetchCategoriesList() {
      try {
        const res = await fetch('/api/shop/categories?limit=100');
        const data = await res.json();
        if (res.ok && data.data) {
          const activeCats = data.data
            .filter((c: any) => c.status === 'active')
            .map((c: any) => ({
              id: c.id,
              category_name: c.category_name || c.categoryName,
            }));
          setCategoriesList(activeCats);
        }
      } catch (e) {
        console.error('Failed to load categories for filter:', e);
      }
    }
    fetchCategoriesList();
  }, []);

  // Fetch subcategories
  const loadSubCategories = useCallback(
    async (targetPage: number, searchQuery: string, categoryIdFilter: string) => {
      setLoading(true);
      setError(null);
      try {
        let url = `/api/shop/sub-categories?page=${targetPage}&limit=${limit}&search=${encodeURIComponent(
          searchQuery
        )}`;
        if (categoryIdFilter && categoryIdFilter !== 'all') {
          url += `&categoryId=${encodeURIComponent(categoryIdFilter)}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to fetch subcategories');
          return;
        }

        setSubCategories(data.data || []);
        setPagination(
          data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 }
        );

        if (data.pagination && data.pagination.page !== targetPage) {
          setPage(data.pagination.page);
        }
      } catch (err: any) {
        console.error('Error loading subcategories:', err);
        setError(err.message || 'Failed to load subcategory data.');
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    loadSubCategories(page, search, selectedCategoryId);
  }, [page, search, selectedCategoryId, loadSubCategories]);

  // Handle Search Input Change
  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setPage(1); // Reset to page 1 on new search
  };

  // Handle Category Filter Change
  const handleCategoryFilterChange = (catId: string) => {
    setSelectedCategoryId(catId);
    setPage(1); // Reset to page 1 on category filter change
  };

  // Handle Add SubCategory Click
  const handleAddClick = () => {
    setSubCategoryToEdit(null);
    setIsModalOpen(true);
  };

  // Handle Edit Click
  const handleEditClick = (subCat: SubCategoryData) => {
    setSubCategoryToEdit(subCat);
    setIsModalOpen(true);
  };

  // Handle Delete Click
  const handleDeleteClick = (subCat: SubCategoryData) => {
    setSubCategoryToDelete(subCat);
    setIsDeleteModalOpen(true);
  };

  // Handle Successful SubCategory Delete
  const handleDeleteSuccess = () => {
    if (subCategories.length === 1 && page > 1) {
      const prevPage = page - 1;
      setPage(prevPage);
    } else {
      loadSubCategories(page, search, selectedCategoryId);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#EAF2EA] text-[#2D5A27] shadow-2xs">
              <FolderTree className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold font-quicksand text-gray-900 tracking-tight">
              Items
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-nunito">
            Configure sub-level product classification hierarchy and pricing details.
          </p>
        </div>

        {/* Top-Right Add SubCategory Button */}
        <button
          onClick={handleAddClick}
          className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#21431d] text-white font-quicksand font-bold text-xs sm:text-sm rounded-xl inline-flex items-center justify-center gap-2 shadow-xs transition cursor-pointer self-start sm:self-auto hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Add Items</span>
        </button>
      </div>

      {/* Search Bar & Filter Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E2EAE1] shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="flex-1">
            <SearchInput
              value={search}
              placeholder="Search items by name..."
              onSearch={handleSearchChange}
            />
          </div>

          {/* Category Filter Dropdown */}
          <div className="relative min-w-[200px] sm:w-60">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Filter className="w-4 h-4 text-[#2D5A27]" />
            </div>
            <select
              value={selectedCategoryId}
              onChange={(e) => handleCategoryFilterChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-gray-50 hover:bg-[#F9FBF9] border border-[#E2EAE1] rounded-xl text-xs font-bold font-quicksand text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A27]/20 focus:border-[#2D5A27] transition appearance-none cursor-pointer shadow-2xs"
            >
              <option value="all">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.category_name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Action / Refresh Button */}
        <div className="flex items-center justify-end gap-2 text-xs font-semibold text-gray-500 shrink-0">
          <button
            onClick={() => loadSubCategories(page, search, selectedCategoryId)}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#E2EAE1] hover:bg-[#F2F7F2] hover:text-[#2D5A27] transition cursor-pointer"
            title="Refresh table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* SubCategories Responsive Table Container */}
      <div className="my-6 sm:my-8">
        <SubCategoryTable
          subCategories={subCategories}
          loading={loading}
          error={error}
          searchQuery={search}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onAddClick={handleAddClick}
          onRetry={() => loadSubCategories(page, search, selectedCategoryId)}
        />
      </div>

      {/* Pagination Controls */}
      {!loading && !error && subCategories.length > 0 && (
        <div className="pt-2">
          <Pagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={(newPage) => setPage(newPage)}
            itemName="Item"
          />
        </div>
      )}

      {/* Add / Edit SubCategory Modal */}
      <SubCategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => loadSubCategories(page, search, selectedCategoryId)}
        subCategoryToEdit={subCategoryToEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteSubCategoryModal
        isOpen={isDeleteModalOpen}
        subCategory={subCategoryToDelete}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
