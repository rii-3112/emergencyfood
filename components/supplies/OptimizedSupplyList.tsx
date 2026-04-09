"use client";
import { memo, useMemo, useState } from "react";

import { Button, Card } from "@/components/ui";
import { useDebounce } from "@/hooks/performance/useDebounce";
import { useMemoizedCallback } from "@/hooks/performance/useMemoizedCallback";
import type { Supply } from "@/types";
import { sortSupplies } from "@/utils/sortSupplies";

import SupplyItem from "./SupplyItem";
import type { SortOption, SortOrder } from "./SupplySort";

interface OptimizedSupplyListProps {
  supplies: Supply[];
  canDelete: boolean;
  onUpdate: (supplyId: string) => void;
  onDelete: (supplyId: string) => void;
  onArchive: (supplyId: string) => void;
}

export const OptimizedSupplyList = memo(function OptimizedSupplyList({
  supplies,
  canDelete,
  onUpdate,
  onDelete,
  onArchive,
}: OptimizedSupplyListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("registeredAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const processedSupplies = useMemo(() => {
    let filtered = supplies;

    if (debouncedSearchTerm) {
      filtered = filtered.filter(
        (supply) =>
          supply.name
            .toLowerCase()
            .includes(debouncedSearchTerm.toLowerCase()) ||
          supply.category
            .toLowerCase()
            .includes(debouncedSearchTerm.toLowerCase()) ||
          supply.storageLocation
            ?.toLowerCase()
            .includes(debouncedSearchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (supply) => supply.category === categoryFilter
      );
    }

    return sortSupplies(filtered, sortBy, sortOrder);
  }, [supplies, debouncedSearchTerm, categoryFilter, sortBy, sortOrder]);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(supplies.map((s) => s.category))
    );
    return uniqueCategories.sort();
  }, [supplies]);

  const handleUpdateSupply = useMemoizedCallback(
    (supplyId: string) => onUpdate(supplyId),
    [onUpdate]
  );

  const handleDeleteSupply = useMemoizedCallback(
    (supplyId: string) => onDelete(supplyId),
    [onDelete]
  );

  const handleArchiveSupply = useMemoizedCallback(
    (supplyId: string) => onArchive(supplyId),
    [onArchive]
  );

  if (supplies.length === 0) {
    return (
      <Card className='text-center py-12'>
        <h2 className='text-xl font-semibold mb-4 text-gray-900'>
          備蓄品が登録されていません
        </h2>
        <p className='mb-6 text-gray-600'>
          最初の備蓄品を登録して、防災準備を始めましょう。
        </p>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      <Card className='p-4'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div>
            <label
              className='block text-sm font-medium text-gray-700 mb-1'
              htmlFor='search'
            >
              検索
            </label>
            <input
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              id='search'
              placeholder='品名、カテゴリ、保存場所で検索...'
              type='text'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label
              className='block text-sm font-medium text-gray-700 mb-1'
              htmlFor='category-filter'
            >
              カテゴリ
            </label>
            <select
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              id='category-filter'
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value='all'>すべて</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className='block text-sm font-medium text-gray-700 mb-1'
              htmlFor='sort-by'
            >
              並び替え
            </label>
            <div className='flex gap-2'>
              <select
                className='flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                id='sort-by'
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value='registeredAt'>登録日</option>
                <option value='expiryDate'>賞味期限</option>
                <option value='name'>品名</option>
                <option value='category'>カテゴリ</option>
              </select>
              <Button
                size='sm'
                variant='outline'
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </div>
          </div>
        </div>

        <div className='mt-4 text-sm text-gray-600'>
          {processedSupplies.length} 件の備蓄品
          {debouncedSearchTerm && ` (「${debouncedSearchTerm}」で検索)`}
          {categoryFilter !== "all" && ` (${categoryFilter}カテゴリ)`}
        </div>
      </Card>

      {processedSupplies.length === 0 ? (
        <Card className='text-center py-8'>
          <p className='text-gray-600'>
            検索条件に一致する備蓄品が見つかりませんでした。
          </p>
        </Card>
      ) : (
        <div className='space-y-4'>
          {processedSupplies.map((supply: Supply) => (
            <SupplyItem
              key={supply.id}
              canDelete={canDelete}
              supply={supply}
              onArchiveSupply={() => handleArchiveSupply(supply.id)}
              onDeleteSupply={() => handleDeleteSupply(supply.id)}
              onUpdateSupply={() => handleUpdateSupply(supply.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default OptimizedSupplyList;
