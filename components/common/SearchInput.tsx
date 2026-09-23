'use client';

import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value?: string;
  placeholder?: string;
  onSearch: (searchTerm: string) => void;
  debounceMs?: number;
  className?: string;
}

export default function SearchInput({
  value = '',
  placeholder = 'Search...',
  onSearch,
  debounceMs = 400,
  className = '',
}: SearchInputProps) {
  const [searchTerm, setSearchTerm] = useState(value);
  const onSearchRef = React.useRef(onSearch);
  const lastEmittedValue = React.useRef(value);
  const isFirstRender = React.useRef(true);

  // Keep latest onSearch callback in ref so changes to onSearch reference never trigger debounced search
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  // Sync state if value prop changes from outside
  useEffect(() => {
    setSearchTerm(value);
    lastEmittedValue.current = value;
  }, [value]);

  useEffect(() => {
    // Prevent initial mount from triggering onSearch
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // If searchTerm hasn't actually changed from last emitted search, do nothing
    if (searchTerm === lastEmittedValue.current) {
      return;
    }

    const handler = setTimeout(() => {
      lastEmittedValue.current = searchTerm;
      onSearchRef.current(searchTerm);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, debounceMs]);

  const handleClear = () => {
    setSearchTerm('');
    if (lastEmittedValue.current !== '') {
      lastEmittedValue.current = '';
      onSearchRef.current('');
    }
  };

  return (
    <div className={`relative flex-1 max-w-md ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#E2EAE1] rounded-xl text-sm font-nunito placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:border-transparent transition shadow-xs"
      />
      {searchTerm && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition cursor-pointer"
          type="button"
          aria-label="Clear search input"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
