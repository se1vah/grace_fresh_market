'use client';

import React from 'react';
import {
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  ImageIcon,
  FolderTree,
  AlertCircle,
  RefreshCw,
  Plus
} from 'lucide-react';

export interface CategorySimple {
  id: number;
  category_name: string;
  categoryName?: string;
  image?: string;
  status?: string;
}

export interface SubCategoryData {
  id?: number;
  category_id: number;
  category?: CategorySimple;
  subcategory_name: string;
  subcategoryName?: string;
  subCategoryType?: 'gram' | 'quantity' | string;
  sub_category_type?: 'gram' | 'quantity' | string;
  image: string;
  images?: string[];
  status: 'active' | 'inactive';
  amount: number;
  stock?: number | null;
  offer?: number;
  created_at?: string;
  updated_at?: string;
}

interface SubCategoryTableProps {
  subCategories: SubCategoryData[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  onEdit: (subCategory: SubCategoryData) => void;
  onDelete: (subCategory: SubCategoryData) => void;
  onAddClick: () => void;
  onRetry: () => void;
}

export default function SubCategoryTable({
  subCategories,
  loading,
  error,
  searchQuery,
  onEdit,
  onDelete,
  onAddClick,
  onRetry,
}: SubCategoryTableProps) {
  // Format amount with currency symbol
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <>
        {/* Desktop Skeleton */}
        <div className="hidden md:block bg-white rounded-2xl border border-[#E2EAE1] overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#E2EAE1] bg-[#F9FBF9] flex items-center justify-between">
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
          </div>
          <div className="divide-y divide-[#E2EAE1]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-200" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-36" />
                    <div className="h-3 bg-gray-100 rounded w-24" />
                  </div>
                </div>
                <div className="h-6 bg-gray-200 rounded-full w-20" />
                <div className="h-4 bg-gray-200 rounded w-16" />
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gray-200" />
                  <div className="w-8 h-8 rounded-lg bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Skeleton (Distinct Cards with Gap) */}
        <div className="block md:hidden space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#E2EAE1] p-4 space-y-3 shadow-xs animate-pulse">
              <div className="flex justify-between"><div className="h-3 w-12 bg-gray-200 rounded" /><div className="h-3 w-10 bg-gray-200 rounded" /></div>
              <div className="flex justify-between"><div className="h-3 w-20 bg-gray-200 rounded" /><div className="h-4 w-28 bg-gray-200 rounded" /></div>
              <div className="flex justify-between"><div className="h-3 w-24 bg-gray-200 rounded" /><div className="h-4 w-32 bg-gray-200 rounded" /></div>
              <div className="flex justify-between items-center"><div className="h-3 w-16 bg-gray-200 rounded" /><div className="h-10 w-10 bg-gray-200 rounded-xl" /></div>
              <div className="flex justify-between"><div className="h-3 w-16 bg-gray-200 rounded" /><div className="h-5 w-16 bg-gray-200 rounded-full" /></div>
              <div className="flex justify-between"><div className="h-3 w-16 bg-gray-200 rounded" /><div className="h-4 w-20 bg-gray-200 rounded" /></div>
              <div className="pt-2 flex justify-between"><div className="h-3 w-16 bg-gray-200 rounded" /><div className="h-7 w-28 bg-gray-200 rounded-xl" /></div>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 border border-red-100">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold font-quicksand text-gray-900">
          Failed to load subcategories
        </h3>
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto font-nunito">
          {error}
        </p>
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-[#2D5A27] text-white text-xs font-bold font-quicksand rounded-xl inline-flex items-center gap-1.5 hover:bg-[#21431d] transition cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  if (subCategories.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2EAE1] p-12 text-center shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-[#F2F7F2] text-[#2D5A27] flex items-center justify-center mx-auto mb-4 border border-[#E2EAE1]">
          <FolderTree className="w-8 h-8 text-[#80C34A]" />
        </div>
        <h3 className="text-lg font-bold font-quicksand text-gray-900">
          {searchQuery ? 'No matching items found' : 'No items Available'}
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto mt-1 font-nunito leading-relaxed">
          {searchQuery
            ? `We couldn't find any items matching "${searchQuery}". Try searching for something else.`
            : 'Get started by creating your first items for product organization.'}
        </p>

        {!searchQuery && (
          <button
            onClick={onAddClick}
            className="mt-5 px-4 py-2.5 bg-[#2D5A27] hover:bg-[#21431d] text-white font-quicksand font-bold text-xs sm:text-sm rounded-xl inline-flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Item</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl border border-[#E2EAE1] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F9FBF9] border-b border-[#E2EAE1] text-[11px] font-bold text-gray-500 uppercase tracking-wider font-quicksand">
                <th className="py-3.5 px-4 sm:px-6 w-16">ID</th>
                <th className="py-3.5 px-4 sm:px-6">Category</th>
                <th className="py-3.5 px-4 sm:px-6">Item Name</th>
                <th className="py-3.5 px-4 sm:px-6">Type</th>
                <th className="py-3.5 px-4 sm:px-6">Image</th>
                <th className="py-3.5 px-4 sm:px-6">Status</th>
                <th className="py-3.5 px-4 sm:px-6">Stock</th>
                <th className="py-3.5 px-4 sm:px-6">Amount</th>
                <th className="py-3.5 px-4 sm:px-6">Offer</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2EAE1] font-nunito text-xs sm:text-sm">
              {subCategories.map((subCat) => {
                const categoryName =
                  subCat.category?.category_name ||
                  subCat.category?.categoryName ||
                  `Category #${subCat.category_id}`;

                const isStatusActive = subCat.status === 'active';
                const hasMultipleImages = Boolean(subCat.images && subCat.images.length > 1);

                return (
                  <tr
                    key={subCat.id}
                    className="hover:bg-[#F9FBF9]/80 transition duration-150 group"
                  >
                    {/* ID */}
                    <td className="py-4 px-4 sm:px-6 font-bold text-gray-400 font-mono">
                      #{subCat.id}
                    </td>

                    {/* Category Name */}
                    <td className="py-4 px-4 sm:px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-[#2D5A27] font-quicksand font-bold text-xs border border-emerald-100/80">
                        {categoryName}
                      </span>
                    </td>

                    {/* SubCategory Name */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="font-bold text-gray-900 group-hover:text-[#2D5A27] transition font-quicksand text-sm sm:text-base">
                        {subCat.subcategory_name || subCat.subcategoryName}
                      </div>
                    </td>

                    {/* SubCategory Type */}
                    <td className="py-4 px-4 sm:px-6">
                      {(subCat.subCategoryType || subCat.sub_category_type) === 'quantity' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                          Quantity
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#EAF2EA] text-[#2D5A27] border border-[#2D5A27]/20 capitalize">
                          Gram
                        </span>
                      )}
                    </td>

                    {/* Image Thumbnail */}
                    <td className="py-4 px-4 sm:px-6">
                      {subCat.images && subCat.images.length > 0 ? (
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-[#E2EAE1] bg-gray-50 shadow-2xs group-hover:border-[#2D5A27]/30 transition shrink-0">
                          <img
                            src={subCat.images[0]}
                            alt={subCat.subcategory_name || 'SubCategory image'}
                            className="w-full h-full object-cover"
                          />
                          {hasMultipleImages && (
                            <span className="absolute bottom-0 right-0 bg-[#2D5A27] text-white text-[9px] font-bold px-1 py-0.2 rounded-tl-md shadow-2xs">
                              +{subCat.images.length}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 sm:px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-quicksand border ${isStatusActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                      >
                        {isStatusActive ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-gray-400" />
                            <span>Inactive</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="py-4 px-4 sm:px-6">
                      {subCat.stock !== null && subCat.stock !== undefined ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold font-quicksand text-xs border border-blue-100">
                          {subCat.stock} units
                        </span>
                      ) : (
                        <span className="text-gray-400 font-normal italic text-xs">N/A</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-4 sm:px-6">
                      <span className="font-bold font-quicksand text-gray-900 text-sm">
                        {formatAmount(subCat.amount)}
                      </span>
                    </td>

                    {/* Offer */}
                    <td className="py-4 px-4 sm:px-6">
                      {subCat.offer && subCat.offer > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold font-quicksand text-xs border border-amber-200/80">
                          {subCat.offer}% OFF
                        </span>
                      ) : (
                        <span className="text-gray-400 font-normal italic text-xs">0%</span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-4 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-3 sm:gap-4">
                        <button
                          onClick={() => onEdit(subCat)}
                          className="px-3.5 py-1.5 rounded-xl border border-[#E2EAE1] bg-white hover:bg-[#F2F7F2] hover:border-[#2D5A27] text-gray-700 hover:text-[#2D5A27] font-quicksand font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                          title="Edit SubCategory"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => onDelete(subCat)}
                          className="px-3.5 py-1.5 rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 text-red-600 font-quicksand font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                          title="Delete SubCategory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View (Individual Separate Cards with Spacing Between Cards) */}
      <div className="block md:hidden space-y-4">
        {subCategories.map((subCat) => {
          const categoryName =
            subCat.category?.category_name ||
            subCat.category?.categoryName ||
            `Category #${subCat.category_id}`;

          const isStatusActive = subCat.status === 'active';
          const hasMultipleImages = Boolean(subCat.images && subCat.images.length > 1);

          return (
            <div key={subCat.id} className="bg-white rounded-2xl border border-[#E2EAE1] p-4 space-y-3 shadow-xs font-nunito">
              {/* Field: ID */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-400 uppercase tracking-wider font-quicksand">
                  ID
                </span>
                <span className="font-bold text-gray-700 font-mono">#{subCat.id}</span>
              </div>

              {/* Field: Category */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-400 uppercase tracking-wider font-quicksand">
                  Category
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-[#2D5A27] font-quicksand font-bold text-xs border border-emerald-100/80">
                  {categoryName}
                </span>
              </div>

              {/* Field: SubCategory Name */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-400 uppercase tracking-wider font-quicksand">
                  Item Name
                </span>
                <span className="font-quicksand font-bold text-gray-900 text-sm">
                  {subCat.subcategory_name || subCat.subcategoryName}
                </span>
              </div>

              {/* Field: Image */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-400 uppercase tracking-wider font-quicksand">
                  Image
                </span>
                <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-[#E2EAE1] bg-gray-50 shadow-2xs flex items-center justify-center shrink-0">
                  {subCat && subCat.images && subCat.images.length > 0 ? (
                    <>
                      <img
                        src={subCat.images[0]}
                        alt={subCat.subcategory_name || 'SubCategory image'}
                        className="w-full h-full object-cover"
                      />
                      {hasMultipleImages && (
                        <span className="absolute bottom-0 right-0 bg-[#2D5A27] text-white text-[8px] font-bold px-1 py-0.2 rounded-tl-md">
                          +{subCat.images.length}
                        </span>
                      )}
                    </>
                  ) : (
                    <ImageIcon className="w-4 h-4 text-gray-300" />
                  )}
                </div>
              </div>

              {/* Field: Type */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-400 uppercase tracking-wider font-quicksand">
                  Type
                </span>
                {(subCat.subCategoryType || subCat.sub_category_type) === 'quantity' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                    Quantity
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EAF2EA] text-[#2D5A27] border border-[#2D5A27]/20 capitalize">
                    Gram
                  </span>
                )}
              </div>

              {/* Field: Status */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-400 uppercase tracking-wider font-quicksand">
                  Status
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-quicksand border ${isStatusActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                >
                  {isStatusActive ? (
                    <>
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 text-gray-400" />
                      <span>Inactive</span>
                    </>
                  )}
                </span>
              </div>

              {/* Field: Stock */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-400 uppercase tracking-wider font-quicksand">
                  Stock
                </span>
                <span className="font-bold font-quicksand text-gray-800 text-xs">
                  {subCat.stock !== null && subCat.stock !== undefined ? `${subCat.stock} units` : 'N/A'}
                </span>
              </div>

              {/* Field: Amount */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-400 uppercase tracking-wider font-quicksand">
                  Amount
                </span>
                <span className="font-bold font-quicksand text-gray-900 text-sm">
                  {formatAmount(subCat.amount)}
                </span>
              </div>

              {/* Field: Offer */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-400 uppercase tracking-wider font-quicksand">
                  Offer
                </span>
                <span className="font-bold font-quicksand text-xs">
                  {subCat.offer && subCat.offer > 0 ? (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/80">
                      {subCat.offer}% OFF
                    </span>
                  ) : (
                    <span className="text-gray-400 font-normal italic">0%</span>
                  )}
                </span>
              </div>

              {/* Field: Action */}
              <div className="pt-3 border-t border-[#E2EAE1]/80 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-400 uppercase tracking-wider font-quicksand">
                  Action
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onEdit(subCat)}
                    className="px-3.5 py-1.5 rounded-xl border border-[#E2EAE1] bg-[#F9FBF9] hover:bg-[#F2F7F2] hover:border-[#2D5A27] text-gray-700 hover:text-[#2D5A27] font-quicksand font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                    title="Edit SubCategory"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => onDelete(subCat)}
                    className="px-3.5 py-1.5 rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 text-red-600 font-quicksand font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                    title="Delete SubCategory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
