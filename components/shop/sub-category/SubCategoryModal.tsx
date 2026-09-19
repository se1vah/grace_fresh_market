'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UploadCloud,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  FolderTree,
  ShieldAlert,
  ChevronDown,
  Percent
} from 'lucide-react';
import Modal from '@/components/common/Modal';
import { SubCategoryData, CategorySimple } from './SubCategoryTable';

interface SubCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subCategoryToEdit?: SubCategoryData | null;
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

export default function SubCategoryModal({
  isOpen,
  onClose,
  onSuccess,
  subCategoryToEdit,
}: SubCategoryModalProps) {
  // Categories dropdown state
  const [categories, setCategories] = useState<CategorySimple[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Form fields state
  const [categoryId, setCategoryId] = useState<string>('');
  const [subCategoryName, setSubCategoryName] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [amount, setAmount] = useState<string>('');
  const [stock, setStock] = useState<string>('');
  const [offer, setOffer] = useState<string>('');

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);

  // Validation & error states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = Boolean(subCategoryToEdit && subCategoryToEdit.id);

  // Fetch categories for dropdown when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        setLoadingCategories(true);
        try {
          const res = await fetch('/api/shop/categories?limit=100');
          const data = await res.json();
          if (res.ok) {
            setCategories(data.data || []);
          }
        } catch (err) {
          console.error('Failed to load categories for dropdown:', err);
        } finally {
          setLoadingCategories(false);
        }
      };

      fetchCategories();
    }
  }, [isOpen]);

  // Populate or reset form values on open/edit change
  useEffect(() => {
    if (isOpen) {
      if (subCategoryToEdit) {
        setCategoryId(String(subCategoryToEdit.category_id || subCategoryToEdit.category?.id || ''));
        setSubCategoryName(subCategoryToEdit.subcategory_name || subCategoryToEdit.subcategoryName || '');
        setStatus(subCategoryToEdit.status || 'active');
        setAmount(subCategoryToEdit.amount !== undefined ? String(subCategoryToEdit.amount) : '');
        setStock(subCategoryToEdit.stock !== undefined && subCategoryToEdit.stock !== null ? String(subCategoryToEdit.stock) : '');
        setOffer(subCategoryToEdit.offer !== undefined && subCategoryToEdit.offer !== null ? String(subCategoryToEdit.offer) : '');

        const imgs = subCategoryToEdit.images && subCategoryToEdit.images.length > 0
          ? subCategoryToEdit.images
          : (subCategoryToEdit.image ? [subCategoryToEdit.image] : []);
        setExistingImages(imgs);
        setSelectedFiles([]);
        setFilePreviews([]);
      } else {
        setCategoryId(''); // Default to unselected
        setSubCategoryName('');
        setStatus('active');
        setAmount('');
        setStock('');
        setOffer('');
        setExistingImages([]);
        setSelectedFiles([]);
        setFilePreviews([]);
      }
      setErrors({});
      setGeneralError(null);
    }
  }, [isOpen, subCategoryToEdit]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setGeneralError(null);
    setErrors((prev) => ({ ...prev, image: '' }));

    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    let fileError = '';

    Array.from(files).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        fileError = `Invalid image format for "${file.name}". Allowed formats: JPG, JPEG, PNG, WEBP.`;
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        fileError = `File "${file.name}" exceeds ${MAX_SIZE_MB}MB limit.`;
        return;
      }
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    if (fileError) {
      setErrors((prev) => ({ ...prev, image: fileError }));
    }

    if (newFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setFilePreviews((prev) => [...prev, ...newPreviews]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewFile = (index: number) => {
    if (filePreviews[index]) {
      URL.revokeObjectURL(filePreviews[index]);
    }
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const validateCategory = (selectedId: string): string => {
    if (!selectedId || selectedId === '' || selectedId === 'select') {
      return 'Please select a valid parent Category.';
    }
    const selectedCat = categories.find((c) => String(c.id) === String(selectedId));
    if (selectedCat && selectedCat.status && selectedCat.status !== 'active') {
      return 'Selected category is currently inactive. Please select an active category.';
    }
    return '';
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Category validation
    const catErr = validateCategory(categoryId);
    if (catErr) {
      newErrors.category = catErr;
    }

    // 2. SubCategory Name validation
    if (!subCategoryName.trim()) {
      newErrors.subcategoryName = 'Item name is required.';
    }

    // 3. Amount validation
    if (!amount.trim()) {
      newErrors.amount = 'Amount is required.';
    } else {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        newErrors.amount = 'Please enter a valid non-negative amount.';
      }
    }

    // 4. Stock validation (Optional, non-negative whole number)
    if (stock.trim() !== '') {
      const parsedStock = Number(stock.trim());
      if (isNaN(parsedStock) || !Number.isInteger(parsedStock) || parsedStock < 0) {
        newErrors.stock = 'Stock must be a non-negative whole number.';
      }
    }

    // 5. Offer Percentage validation (Optional, number between 0 and 100)
    if (offer.trim() !== '') {
      const parsedOffer = Number(offer.trim());
      if (isNaN(parsedOffer) || parsedOffer < 0 || parsedOffer > 100) {
        newErrors.offer = 'Offer percentage must be between 0 and 100.';
      }
    }

    // 6. Image validation (At least one image)
    if (existingImages.length === 0 && selectedFiles.length === 0) {
      newErrors.image = 'At least one item image is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('category_id', categoryId);
      formData.append('subcategory_name', subCategoryName.trim());
      formData.append('status', status);
      formData.append('amount', amount.trim());
      formData.append('stock', stock.trim());
      formData.append('offer', offer.trim());

      existingImages.forEach((img) => {
        formData.append('existing_images', img);
      });

      selectedFiles.forEach((file) => {
        formData.append('images', file);
      });

      const url = isEditMode
        ? `/api/shop/sub-categories/${subCategoryToEdit!.id}`
        : '/api/shop/sub-categories';

      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setGeneralError(data.error || 'An unexpected error occurred while saving.');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving subcategory:', err);
      setGeneralError(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryInfo = categories.find((c) => String(c.id) === String(categoryId));

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-lg">
      {/* Modal Header */}
      <div className="px-6 py-4 border-b border-[#E2EAE1] flex items-center justify-between bg-[#F9FBF9]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#EAF2EA] text-[#2D5A27] shadow-2xs">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-quicksand text-[#2D5A27]">
              {isEditMode ? 'Edit Item' : 'Add Item'}
            </h3>
            <p className="text-xs text-gray-500 font-nunito">
              Fill in the item details and assign it to an active category.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4 font-nunito">
        {/* 1. Category Dropdown with Modern Validation UI */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 font-quicksand flex items-center justify-between">
            <span>
              Category <span className="text-red-500">*</span>
            </span>
            {selectedCategoryInfo && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-quicksand ${selectedCategoryInfo.status === 'active'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
                  }`}
              >
                {selectedCategoryInfo.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            )}
          </label>

          <div className="relative">
            <select
              value={categoryId}
              onChange={(e) => {
                const val = e.target.value;
                setCategoryId(val);
                const err = validateCategory(val);
                setErrors((prev) => ({ ...prev, category: err }));
              }}
              disabled={loadingCategories}
              className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm font-nunito appearance-none focus:outline-none transition cursor-pointer ${errors.category
                ? 'border-red-400 bg-red-50/20 ring-4 ring-red-500/10 text-red-950 font-medium'
                : 'border-[#E2EAE1] hover:border-gray-300 focus:ring-4 focus:ring-[#2D5A27]/10 focus:border-[#2D5A27]'
                }`}
            >
              <option value="">Select Category</option>
              {categories.map((cat) => {
                const isActive = cat.status === 'active';
                return (
                  <option key={cat.id} value={cat.id}>
                    {isActive ? '🟢' : '🔴'} {cat.category_name || cat.categoryName} {!isActive ? '(Inactive)' : ''}
                  </option>
                );
              })}
            </select>

            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          <ModernFieldError message={errors.category} />
        </div>

        {/* 2. SubCategory Name Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 font-quicksand">
            Item Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={subCategoryName}
            onChange={(e) => {
              setSubCategoryName(e.target.value);
              setErrors((prev) => ({ ...prev, subcategoryName: '' }));
            }}
            placeholder="e.g. Organic Apples, Fresh Citrus, Leafy Greens"
            className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm font-nunito focus:outline-none transition ${errors.subcategoryName
              ? 'border-red-400 bg-red-50/20 ring-4 ring-red-500/10 text-red-950 font-medium'
              : 'border-[#E2EAE1] hover:border-gray-300 focus:ring-4 focus:ring-[#2D5A27]/10 focus:border-[#2D5A27]'
              }`}
          />
          <ModernFieldError message={errors.subcategoryName} />
        </div>

        {/* 3. Multi-Image Upload & Preview Grid */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 font-quicksand">
            Item Images <span className="text-red-500">*</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Existing & New Images Preview Grid */}
          {(existingImages.length > 0 || filePreviews.length > 0) && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
              {/* Existing Images */}
              {existingImages.map((imgUrl, idx) => (
                <div key={`existing-${idx}`} className="relative group aspect-square rounded-xl overflow-hidden border border-[#E2EAE1] bg-gray-50 shadow-2xs">
                  <img src={imgUrl} alt={`Existing image ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(idx)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600/90 text-white flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition cursor-pointer shadow-xs"
                    title="Remove Image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* New Selected Image Previews */}
              {filePreviews.map((preview, idx) => (
                <div key={`new-${idx}`} className="relative group aspect-square rounded-xl overflow-hidden border border-emerald-300 bg-emerald-50/30 shadow-2xs">
                  <img src={preview} alt={`New image preview ${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded font-quicksand">
                    New
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveNewFile(idx)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600/90 text-white flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition cursor-pointer shadow-xs"
                    title="Remove Image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* File Upload Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${errors.image
              ? 'border-red-400 bg-red-50/20 ring-4 ring-red-500/10'
              : 'border-[#E2EAE1] hover:border-[#2D5A27] bg-[#F9FBF9] hover:bg-[#F2F7F2]'
              }`}
          >
            <UploadCloud className="w-7 h-7 mx-auto text-[#2D5A27] mb-1.5" />
            <div className="text-xs font-bold text-gray-700 font-quicksand">
              Click to select / upload multiple images
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              JPG, JPEG, PNG or WEBP (Max 5MB each)
            </div>
          </div>
          <ModernFieldError message={errors.image} />
        </div>

        {/* 4. Status Toggle */}
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

        {/* 5. Stock Input (Optional, numbers only) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 font-quicksand">
            Stock <span className="text-gray-400 font-normal lowercase">(optional)</span>
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || /^\d+$/.test(val)) {
                setStock(val);
                setErrors((prev) => ({ ...prev, stock: '' }));
              }
            }}
            placeholder="e.g. 50"
            className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm font-nunito focus:outline-none transition ${errors.stock
              ? 'border-red-400 bg-red-50/20 ring-4 ring-red-500/10 text-red-950 font-medium'
              : 'border-[#E2EAE1] hover:border-gray-300 focus:ring-4 focus:ring-[#2D5A27]/10 focus:border-[#2D5A27]'
              }`}
          />
          <ModernFieldError message={errors.stock} />
        </div>

        {/* 6. Amount Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 font-quicksand">
            Amount (₹) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 font-bold text-sm">
              ₹
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setErrors((prev) => ({ ...prev, amount: '' }));
              }}
              placeholder="e.g. 5000"
              className={`w-full pl-8 pr-4 py-2.5 bg-white border rounded-xl text-sm font-nunito focus:outline-none transition ${errors.amount
                ? 'border-red-400 bg-red-50/20 ring-4 ring-red-500/10 text-red-950 font-medium'
                : 'border-[#E2EAE1] hover:border-gray-300 focus:ring-4 focus:ring-[#2D5A27]/10 focus:border-[#2D5A27]'
                }`}
            />
          </div>
          <ModernFieldError message={errors.amount} />
        </div>

        {/* 7. Offer Percentage Input (Optional, percentage between 0 and 100) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 font-quicksand">
            Offer (%) <span className="text-gray-400 font-normal lowercase">(optional)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={offer}
              onChange={(e) => {
                const val = e.target.value;
                setOffer(val);
                if (val.trim() !== '') {
                  const num = Number(val);
                  if (isNaN(num) || num < 0 || num > 100) {
                    setErrors((prev) => ({ ...prev, offer: 'Offer percentage must be between 0 and 100.' }));
                  } else {
                    setErrors((prev) => ({ ...prev, offer: '' }));
                  }
                } else {
                  setErrors((prev) => ({ ...prev, offer: '' }));
                }
              }}
              placeholder="e.g. 10"
              className={`w-full pl-4 pr-14 py-2.5 bg-white border rounded-xl text-sm font-nunito focus:outline-none transition ${errors.offer
                ? 'border-red-400 bg-red-50/20 ring-4 ring-red-500/10 text-red-950 font-medium'
                : 'border-[#E2EAE1] hover:border-gray-300 focus:ring-4 focus:ring-[#2D5A27]/10 focus:border-[#2D5A27]'
                }`}
            />
            <div className="absolute inset-y-1 right-1 px-3 flex items-center justify-center pointer-events-none bg-amber-500 text-white font-bold text-xs font-quicksand rounded-lg shadow-2xs">
              %
            </div>
          </div>
          <ModernFieldError message={errors.offer} />
        </div>

        {/* Modal Actions */}
        <div className="pt-4 border-t border-[#E2EAE1] flex items-center justify-end gap-3">
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
              <span>{isEditMode ? 'Update Item' : 'Save Item'}</span>
            )}
          </button>
        </div>
        {generalError && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5 shadow-2xs animate-in fade-in zoom-in-95 duration-200">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
            <span>{generalError}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}
