"use client";
import { useState } from "react";

export type SortOption =
  | "name"
  | "expiryDate"
  | "registeredAt"
  | "category"
  | "reviewCount";
export type SortOrder = "asc" | "desc";

interface SupplySortProps {
  currentOrder: SortOrder;
  currentSort: SortOption;
  onSortChange: (option: SortOption, order: SortOrder) => void;
}

export default function SupplySort({
  currentOrder,
  currentSort,
  onSortChange,
}: SupplySortProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sortOptions = [
    { value: "name", label: "商品名" },
    { value: "expiryDate", label: "賞味期限" },
    { value: "registeredAt", label: "登録日" },
    { value: "category", label: "カテゴリ" },
    { value: "reviewCount", label: "レビュー数" },
  ] as const;

  const handleSortChange = (option: SortOption) => {
    const newOrder =
      currentSort === option && currentOrder === "asc" ? "desc" : "asc";
    onSortChange(option, newOrder);
    setIsOpen(false);
  };

  const getCurrentSortLabel = () => {
    const option = sortOptions.find((opt) => opt.value === currentSort);
    return option ? option.label : "商品名";
  };

  return (
    <div className='relative'>
      <button
        className='flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-black'
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className='text-sm text-gray-700'>
          並び替え: {getCurrentSortLabel()}
        </span>
        <span className='text-gray-400'>
          {currentOrder === "asc" ? "↑" : "↓"}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            d='M19 9l-7 7-7-7'
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
          />
        </svg>
      </button>

      {isOpen && (
        <div className='absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10'>
          {sortOptions.map((option) => (
            <button
              key={option.value}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                currentSort === option.value
                  ? "bg-gray-100 text-black font-medium"
                  : "text-gray-700"
              }`}
              onClick={() => handleSortChange(option.value)}
            >
              {option.label}
              {currentSort === option.value && (
                <span className='ml-2 text-gray-400'>
                  {currentOrder === "asc" ? "↑" : "↓"}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
