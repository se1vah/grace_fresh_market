'use client';

import React, { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import Modal from '@/components/common/Modal';
import { CMSPageData } from './CMSTable';

interface CMSDeleteModalProps {
  isOpen: boolean;
  page: CMSPageData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CMSDeleteModal({
  isOpen,
  page,
  onClose,
  onSuccess,
}: CMSDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !page) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/shop/cms/${page.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to delete CMS page');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error deleting page:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-md">
      <div className="p-6 font-nunito text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold font-quicksand text-gray-900 mb-2">
          Delete CMS Page?
        </h3>

        <p className="text-xs sm:text-sm text-gray-600 mb-4">
          Are you sure you want to delete <span className="font-bold text-gray-900">"{page.page_name}"</span> (/{page.slug})?
          This action cannot be undone.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold text-left">
            {error}
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
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
              <span>Delete Page</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
