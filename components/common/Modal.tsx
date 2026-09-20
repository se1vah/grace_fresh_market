'use client';

import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export default function Modal({
  isOpen,
  onClose,
  children,
  maxWidthClass = 'max-w-lg',
}: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex min-h-full items-start justify-center p-4 sm:p-6"
    >
      <div
        className={`bg-white rounded-2xl border border-[#E2EAE1] ${maxWidthClass} w-full shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 my-auto`}
      >
        {children}
      </div>
    </div>
  );
}
