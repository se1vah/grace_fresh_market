'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UploadCloud,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  FolderPlus,
  ShieldAlert,
} from 'lucide-react';
import Modal from '@/components/common/Modal';

export interface CategoryData {
  id?: number;
  category_name: string;
  image: string;
  status: 'active' | 'inactive';
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categoryToEdit?: CategoryData | null;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;

// Modern Field Error Badge Component
function ModernFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mt-2 p-2.5 rounded-xl bg-gradient-to-r from-red-50 via-rose-50/90 to-red-50 border border-red-200/80 text-red-700 text-xs font-semibold font-nunito flex items-center gap-2 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="w-5 h-5 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-2xs">
        <AlertCircle className="w-3.5 h-3.5" />
      </div>
      <span className="leading-snug">{message}</span>
    </div>
  );
}

export default function CategoryModal({
  isOpen,
  onClose,
  onSuccess,
  categoryToEdit,
}: CategoryModalProps) {
  const [categoryName, setCategoryName] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formBodyRef = useRef<HTMLDivElement>(null);
  const isEditMode = Boolean(categoryToEdit && categoryToEdit.id);

  const scrollToTop = () => {
    const doScroll = () => {
      if (formBodyRef.current) {
        formBodyRef.current.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
    };

    doScroll();
    setTimeout(doScroll, 50);
  };

  useEffect(() => {
    if (generalError) {
      scrollToTop();
    }
  }, [generalError]);

  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setCategoryName(categoryToEdit.category_name || '');
        setStatus(categoryToEdit.status || 'active');
        setPreviewUrl(categoryToEdit.image || null);
        setSelectedFile(null);
      } else {
        setCategoryName('');
        setStatus('active');
        setPreviewUrl(null);
        setSelectedFile(null);
      }
      setErrors({});
      setGeneralError(null);
    }
  }, [isOpen, categoryToEdit]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGeneralError(null);
    setErrors((prev) => ({ ...prev, image: '' }));

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        image: 'Invalid image format. Allowed formats: JPG, JPEG, PNG, WEBP',
      }));
      scrollToTop();
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        image: `File size exceeds ${MAX_SIZE_MB}MB limit.`,
      }));
      scrollToTop();
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Category Name validation
    if (!categoryName.trim()) {
      newErrors.categoryName = 'Category name is required.';
    }
    // 2. Image validation
    if (!selectedFile && !isEditMode) {
      newErrors.image = 'Category image is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      scrollToTop();
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('category_name', categoryName.trim());
      formData.append('status', status);

      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      const url = isEditMode
        ? `/api/shop/categories/${categoryToEdit!.id}`
        : '/api/shop/categories';

      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setGeneralError(data.error || 'An error occurred while saving.');
        scrollToTop();
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving category:', err);
      setGeneralError(err.message || 'An unexpected error occurred while saving.');
      scrollToTop();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setGeneralError(null);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} maxWidthClass="max-w-lg">
      <div className="flex flex-col max-h-[calc(100vh-2.5rem)] sm:max-h-[calc(100vh-3.5rem)]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E2EAE1] flex items-center justify-between bg-[#F9FBF9] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#EAF2EA] text-[#2D5A27] shadow-2xs">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-quicksand text-[#2D5A27]">
                {isEditMode ? 'Edit Category' : 'Add Category'}
              </h3>
              <p className="text-xs text-gray-500 font-nunito">
                Create or manage shop category details, type, and image.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div ref={formBodyRef} className="p-6 space-y-4 font-nunito overflow-y-auto flex-1">
            {generalError && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5 shadow-2xs animate-in fade-in zoom-in-95 duration-200">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Category Name Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 font-quicksand">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value);
                  setErrors((prev) => ({ ...prev, categoryName: '' }));
                }}
                placeholder="e.g. Organic Fruits, Fresh Vegetables, Daily Dairy"
                className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm font-nunito focus:outline-none transition ${errors.categoryName
                  ? 'border-red-400 bg-red-50/20 ring-4 ring-red-500/10 text-red-950 font-medium'
                  : 'border-[#E2EAE1] hover:border-gray-300 focus:ring-4 focus:ring-[#2D5A27]/10 focus:border-[#2D5A27]'
                  }`}
              />
              <ModernFieldError message={errors.categoryName} />
            </div>

            {/* Category Image Upload & Preview */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 font-quicksand">
                Category Image {!isEditMode && <span className="text-red-500">*</span>}
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {previewUrl ? (
                <div className="relative rounded-xl border border-[#E2EAE1] p-3 bg-[#F9FBF9] flex items-center gap-4 shadow-2xs">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-white shrink-0">
                    <img
                      src={previewUrl}
                      alt="Category Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-800 truncate font-quicksand">
                      {selectedFile ? selectedFile.name : 'Current Image'}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {selectedFile
                        ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                        : 'Existing image loaded'}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-bold text-[#2D5A27] hover:underline cursor-pointer"
                      >
                        Change Image
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${errors.image
                    ? 'border-red-400 bg-red-50/20 ring-4 ring-red-500/10'
                    : 'border-[#E2EAE1] hover:border-[#2D5A27] bg-[#F9FBF9] hover:bg-[#F2F7F2]'
                    }`}
                >
                  <UploadCloud className="w-7 h-7 mx-auto text-[#2D5A27] mb-1.5" />
                  <div className="text-xs font-bold text-gray-700 font-quicksand">
                    Click to upload category image
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    JPG, JPEG, PNG or WEBP (Max 5MB)
                  </div>
                </div>
              )}
              <ModernFieldError message={errors.image} />
            </div>

            {/* Status Control */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 font-quicksand">
                Status <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStatus('active')}
                  className={`py-2.5 px-4 rounded-xl border text-xs font-bold font-quicksand flex items-center justify-center gap-2 transition cursor-pointer ${status === 'active'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-800 ring-2 ring-emerald-600/20'
                    : 'bg-white border-[#E2EAE1] text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Active
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('inactive')}
                  className={`py-2.5 px-4 rounded-xl border text-xs font-bold font-quicksand flex items-center justify-center gap-2 transition cursor-pointer ${status === 'inactive'
                    ? 'bg-gray-100 border-gray-500 text-gray-800 ring-2 ring-gray-400/20'
                    : 'bg-white border-[#E2EAE1] text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <X className="w-4 h-4 text-gray-500" />
                  Inactive
                </button>
              </div>
            </div>

          </div>

          {/* Modal Actions Footer */}
          <div className="px-6 py-4 border-t border-[#E2EAE1] bg-[#F9FBF9] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-[#E2EAE1] bg-white hover:bg-gray-50 text-gray-700 font-quicksand font-bold text-xs sm:text-sm transition disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#2D5A27] hover:bg-[#21431d] text-white font-quicksand font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditMode ? 'Update Category' : 'Save Category'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
