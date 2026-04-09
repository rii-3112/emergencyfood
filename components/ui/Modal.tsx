"use client";
import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      <div
        className='absolute inset-0 backdrop-blur-sm transition-opacity'
        role='button'
        tabIndex={0}
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      />

      <div
        className={`relative bg-white rounded-lg shadow-xl w-full mx-4 ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}
        role='button'
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        {title && (
          <div className='flex items-center justify-between p-6 border-b border-gray-200'>
            <h2 className='text-lg font-semibold text-gray-900'>{title}</h2>
            <button
              aria-label='閉じる'
              className='text-gray-400 hover:text-gray-600 transition-colors'
              onClick={onClose}
            />
          </div>
        )}

        <div className='p-6'>{children}</div>
      </div>
    </div>
  );
}
