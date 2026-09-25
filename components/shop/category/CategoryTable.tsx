'use client';

import React from 'react';
import { 
  Edit3, 
  Trash2, 
  ImageIcon, 
  FolderPlus, 
  SearchX, 
  AlertCircle, 
  RefreshCw,
  Plus
} from 'lucide-react';
import { CategoryData } from './CategoryModal';

interface CategoryTableProps {
  categories: CategoryData[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  onEdit: (category: CategoryData) => void;
  onDelete: (category: CategoryData) => void;
  onAddClick: () => void;
  onRetry: () => void;
}

export default function CategoryTable({
  categories,
  loading,
  error,
  searchQuery,
  onEdit,
  onDelete,
  onAddClick,
  onRetry,
}: CategoryTableProps) {
  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h4 className="font-quicksand font-bold text-gray-900 text-base">
          Failed to load categories
        </h4>
        <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">{error}</p>
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-[#2D5A27] text-white text-xs font-bold font-quicksand rounded-xl inline-flex items-center gap-1.5 hover:bg-[#21431d] transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try Again
        </button>
      </div>
    );
  }

  // Loading Skeleton State
  if (loading) {
    return (
      <>
        {/* Desktop Skeleton */}
        <div className="hidden md:block bg-white rounded-2xl border border-[#E2EAE1] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F9FBF9] border-b border-[#E2EAE1]">
                  <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">ID</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">Category Name</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">Image</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2EAE1]">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 w-6 bg-gray-200 rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-32 bg-gray-200 rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-10 w-10 bg-gray-200 rounded-lg" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-16 bg-gray-200 rounded-full" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="h-8 w-20 bg-gray-200 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Skeleton (Distinct Cards with Gap) */}
        <div className="block md:hidden space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#E2EAE1] p-4 space-y-3 shadow-xs animate-pulse">
              <div className="flex justify-between"><div className="h-3 w-12 bg-gray-200 rounded" /><div className="h-3 w-10 bg-gray-200 rounded" /></div>
              <div className="flex justify-between"><div className="h-3 w-24 bg-gray-200 rounded" /><div className="h-4 w-32 bg-gray-200 rounded" /></div>
              <div className="flex justify-between items-center"><div className="h-3 w-16 bg-gray-200 rounded" /><div className="h-10 w-10 bg-gray-200 rounded-xl" /></div>
              <div className="flex justify-between"><div className="h-3 w-16 bg-gray-200 rounded" /><div className="h-5 w-16 bg-gray-200 rounded-full" /></div>
              <div className="pt-2 flex justify-between"><div className="h-3 w-16 bg-gray-200 rounded" /><div className="h-7 w-28 bg-gray-200 rounded-xl" /></div>
            </div>
          ))}
        </div>
      </>
    );
  }

  // Search Empty State
  if (searchQuery && categories.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2EAE1] p-12 text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
          <SearchX className="w-7 h-7" />
        </div>
        <h4 className="font-quicksand font-bold text-gray-900 text-lg">
          No categories found
        </h4>
        <p className="text-xs text-gray-500 mt-1">
          No categories matching <span className="font-bold text-gray-800">"{searchQuery}"</span>. Try a different search query.
        </p>
      </div>
    );
  }

  // Complete Empty State
  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2EAE1] p-12 text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-[#EAF2EA] text-[#2D5A27] flex items-center justify-center mx-auto mb-3">
          <FolderPlus className="w-7 h-7" />
        </div>
        <h4 className="font-quicksand font-bold text-gray-900 text-lg">
          No categories found
        </h4>
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          Create your first category to start organizing product items.
        </p>
        <button
          onClick={onAddClick}
          className="mt-5 px-4 py-2.5 bg-[#2D5A27] hover:bg-[#21431d] text-white font-quicksand font-bold text-xs sm:text-sm rounded-xl inline-flex items-center gap-2 shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl border border-[#E2EAE1] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-[#F9FBF9] border-b border-[#E2EAE1]">
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 w-16">
                  ID
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Category Name
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Image
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2EAE1]">
              {categories.map((cat) => (
                <tr 
                  key={cat.id} 
                  className="hover:bg-[#F9FBF9] transition-colors group"
                >
                  {/* ID */}
                  <td className="px-6 py-4 text-xs font-bold text-gray-500 font-mono">
                    #{cat.id}
                  </td>

                  {/* Category Name */}
                  <td className="px-6 py-4">
                    <span className="font-quicksand font-bold text-gray-900 text-sm group-hover:text-[#2D5A27] transition">
                      {cat.category_name}
                    </span>
                  </td>

                  {/* Image */}
                  <td className="px-6 py-4">
                    <div className="w-12 h-12 rounded-xl border border-[#E2EAE1] overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 shadow-xs">
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt={cat.category_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-6 py-4">
                    {cat.status === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Inactive
                      </span>
                    )}
                  </td>

                  {/* Action Buttons */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3 sm:gap-4">
                      <button
                        onClick={() => onEdit(cat)}
                        className="px-3.5 py-1.5 rounded-xl border border-[#E2EAE1] bg-white hover:bg-[#F2F7F2] hover:border-[#2D5A27] text-gray-700 hover:text-[#2D5A27] font-quicksand font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                        title="Edit Category"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => onDelete(cat)}
                        className="px-3.5 py-1.5 rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 text-red-600 font-quicksand font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View (Individual Separate Cards with Spacing Between Cards) */}
      <div className="block md:hidden space-y-4">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-2xl border border-[#E2EAE1] p-4 space-y-3 shadow-xs font-nunito">
            {/* Field: ID */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-400 uppercase tracking-wider font-quicksand">
                ID
              </span>
              <span className="font-bold text-gray-700 font-mono">#{cat.id}</span>
            </div>

            {/* Field: Category Name */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-400 uppercase tracking-wider font-quicksand">
                Category Name
              </span>
              <span className="font-quicksand font-bold text-gray-900 text-sm">
                {cat.category_name}
              </span>
            </div>

            {/* Field: Image */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-400 uppercase tracking-wider font-quicksand">
                Image
              </span>
              <div className="w-10 h-10 rounded-xl border border-[#E2EAE1] overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 shadow-2xs">
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.category_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-4 h-4 text-gray-300" />
                )}
              </div>
            </div>

            {/* Field: Status */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-400 uppercase tracking-wider font-quicksand">
                Status
              </span>
              {cat.status === 'active' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  Inactive
                </span>
              )}
            </div>

            {/* Field: Action */}
            <div className="pt-3 border-t border-[#E2EAE1]/80 flex items-center justify-between text-xs">
              <span className="font-bold text-gray-400 uppercase tracking-wider font-quicksand">
                Action
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onEdit(cat)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#E2EAE1] bg-white hover:bg-[#F2F7F2] hover:border-[#2D5A27] text-gray-700 hover:text-[#2D5A27] font-quicksand font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                  title="Edit Category"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => onDelete(cat)}
                  className="px-3.5 py-1.5 rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 text-red-600 font-quicksand font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                  title="Delete Category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
