'use client';

import React, { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import Modal from '@/components/common/Modal';
import { SubCategoryData } from './SubCategoryTable';

interface DeleteSubCategoryModalProps {
  isOpen: boolean;
  subCategory: SubCategoryData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteSubCategoryModal({
  isOpen,
  subCategory,
  onClose,
  onSuccess,
}: DeleteSubCategoryModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !subCategory) return null;

  const nameToDisplay = subCategory.subcategory_name || subCategory.subcategoryName || 'SubCategory';

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/shop/sub-categories/${subCategory.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'An error occurred during deletion.');
        return;
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error deleting subcategory:', err);
      setError(err.message || 'An error occurred during deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleModalClose = () => {
    onClose();
    setError(null);
  }

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} maxWidthClass="max-w-md">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-bold font-quicksand text-gray-900">
            Delete Item?
          </h3>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed font-nunito">
            Are you sure you want to delete{' '}
            <span className="font-bold text-gray-900">"{nameToDisplay}"</span>?
          </p>
          <p className="mt-1 text-xs text-red-600 font-semibold">
            This action cannot be undone.
          </p>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-[#E2EAE1] bg-white hover:bg-gray-50 text-gray-700 font-quicksand font-bold text-xs sm:text-sm transition disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-quicksand font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
