'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  itemName?: string;
}

export default function Pagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  itemName = 'items',
}: PaginationProps) {
  if (total === 0) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (page > 3) {
        pages.push('...');
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E2EAE1]">
      {/* Pagination Summary */}
      <div className="text-xs sm:text-sm text-gray-600 font-medium">
        Showing <span className="font-bold text-gray-900">{startItem}</span>–
        <span className="font-bold text-gray-900">{endItem}</span> of{' '}
        <span className="font-bold text-gray-900">{total}</span> {itemName}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-xl border border-[#E2EAE1] bg-white text-gray-700 text-xs sm:text-sm font-quicksand font-bold flex items-center gap-1 hover:bg-[#F2F7F2] hover:border-[#2D5A27] transition disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-[#E2EAE1] disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span key={`ellipse-${idx}`} className="px-2 text-xs text-gray-400 font-bold">
                  ...
                </span>
              );
            }

            const isCurrent = p === page;
            return (
              <button
                type="button"
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-xl font-quicksand font-bold text-xs transition cursor-pointer ${
                  isCurrent
                    ? 'bg-[#2D5A27] text-white shadow-xs'
                    : 'bg-white border border-[#E2EAE1] text-gray-700 hover:bg-[#F2F7F2] hover:border-[#2D5A27]'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-xl border border-[#E2EAE1] bg-white text-gray-700 text-xs sm:text-sm font-quicksand font-bold flex items-center gap-1 hover:bg-[#F2F7F2] hover:border-[#2D5A27] transition disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-[#E2EAE1] disabled:cursor-not-allowed cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
