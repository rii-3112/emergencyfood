"use client";
import { MissingCategoriesAlert } from "@/components/supplies/MissingCategoriesAlert";
import SupplyItem from "@/components/supplies/SupplyItem";
import type { SortOption, SortOrder } from "@/components/supplies/SupplySort";
import { Button, Card, Toast } from "@/components/ui";
import { useToast } from "@/hooks";
import type { Supply, Team } from "@/types";
import { FOOD_CATEGORIES, FOOD_UNITS } from "@/utils/constants";
import { sortSupplies } from "@/utils/sortSupplies";
import Link from "next/link";
import { useState } from "react";

interface ServerUser {
  uid: string;
  email: string;
  displayName?: string;
  teamId?: string;
  gender?: string;
}

interface SupplyListViewProps {
  initialSupplies: Supply[];
  initialTeam: Team | null;
  user: ServerUser;
}

export default function SupplyListView({
  initialSupplies,
  initialTeam,
  user,
}: SupplyListViewProps) {
  const { toast, showToast } = useToast();
  const [sortBy, setSortBy] = useState<SortOption>("registeredAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [supplies, setSupplies] = useState<Supply[]>(initialSupplies);
  const [team] = useState<Team | null>(initialTeam);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);

  const canDelete = team
    ? team.ownerId === user.uid || team.admins?.includes(user.uid)
    : false;

  const handleSortChange = (option: SortOption, order: SortOrder) => {
    setSortBy(option);
    setSortOrder(order);
  };

  const filteredSupplies = supplies.filter((supply) => {
    if (selectedCategory !== "all" && supply.category !== selectedCategory) {
      return false;
    }

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const nameMatch = supply.name.toLowerCase().includes(query);
      const categoryMatch = supply.category.toLowerCase().includes(query);
      const locationMatch =
        supply.purchaseLocation?.toLowerCase().includes(query) || false;

      return nameMatch || categoryMatch || locationMatch;
    }

    return true;
  });

  const sortedSupplies = sortSupplies(filteredSupplies, sortBy, sortOrder);

  const categories = Array.from(
    new Set(supplies.map((s) => s.category))
  ).sort();

  const handleUpdateSupply = (supplyIdToUpdate: string) => {
    const supplyToEdit = supplies.find((s) => s.id === supplyIdToUpdate);
    if (supplyToEdit) {
      setSelectedSupply(supplyToEdit);
      setShowEditModal(true);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSupply) return;

    const formData = new FormData(e.currentTarget);
    const updatedData = {
      name: formData.get("name") as string,
      quantity: parseInt(formData.get("quantity") as string),
      unit: formData.get("unit") as string,
      category: formData.get("category") as string,
      expiryDate: formData.get("expiryDate") as string,
      amount: formData.get("amount")
        ? parseFloat(formData.get("amount") as string)
        : null,
      purchaseLocation: formData.get("purchaseLocation") as string,
      label: formData.get("label") as string,
      storageLocation: formData.get("storageLocation") as string,
    };

    try {
      const response = await fetch("/api/actions/update-supply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplyId: selectedSupply.id,
          ...updatedData,
        }),
      });

      if (response.ok) {
        setSupplies((prev) =>
          prev.map((s) =>
            s.id === selectedSupply.id ? { ...s, ...updatedData } : s
          )
        );
        setShowEditModal(false);
      } else {
        const result = await response.json();
        showToast(result.error || "更新に失敗しました", "error");
      }
    } catch (error) {
      console.error("Update error:", error);
      showToast("更新に失敗しました", "error");
    }
  };

  const handleDeleteSupply = async (supplyId: string) => {
    try {
      const response = await fetch("/api/actions/delete-supply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ supplyId }),
      });

      if (response.ok) {
        setSupplies((prev) => prev.filter((supply) => supply.id !== supplyId));
      } else {
        console.error("削除に失敗しました。");
      }
    } catch (error) {
      console.error("Delete error:", error);
      console.error("削除に失敗しました。");
    }
  };

  const handleRefetch = async () => {
    try {
      const response = await fetch(
        `/api/supplies/list?teamId=${user.teamId}&isArchived=false`
      );
      if (response.ok) {
        const data = await response.json();
        setSupplies(data.supplies || []);
      }
    } catch (error) {
      console.error("Refetch error:", error);
    }
  };

  if (!user.teamId) {
    return (
      <Card className='text-center py-8 space-y-4'>
        <h2 className='text-xl font-semibold text-gray-900'>
          チームへの参加が必要です
        </h2>
        <p className='text-gray-600'>
          備蓄品を管理するには、まずチームに参加する必要があります。
        </p>
        <Button asChild>
          <Link href='/settings?tab=team'>設定でグループを作成する</Link>
        </Button>
      </Card>
    );
  }

  if (sortedSupplies.length === 0) {
    return (
      <Card className='text-center py-8 space-y-4'>
        <h2 className='text-xl font-semibold text-gray-900'>
          備蓄品が登録されていません
        </h2>
        <p className='text-gray-600'>
          備蓄品を登録して、防災準備を始めましょう。
        </p>
        <Button asChild>
          <Link href='/supplies/add'>備蓄品を追加する</Link>
        </Button>
      </Card>
    );
  }

  return (
    <>
      {/* 検索とソート */}
      <div className='mb-3 space-y-3'>
        <div className='flex flex-col sm:flex-row gap-4'>
          <div className='flex-1'>
            <input
              type='text'
              placeholder='商品名、カテゴリ、購入場所で検索...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>

          <select
            className='px-3 py-2 border border-gray-300 rounded-md text-sm'
            onChange={(e) => setSelectedCategory(e.target.value)}
            value={selectedCategory}
          >
            <option value='all'>全カテゴリ</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            className='px-3 py-2 border border-gray-300 rounded-md text-sm'
            onChange={(e) => {
              const selectedOption = e.target.value as SortOption;
              handleSortChange(selectedOption, sortOrder);
            }}
            value={sortBy}
          >
            <option value='name'>商品名順</option>
            <option value='expiryDate'>賞味期限順</option>
            <option value='registeredAt'>登録日順</option>
            <option value='category'>カテゴリ順</option>
            <option value='reviewCount'>レビュー数順</option>
          </select>
        </div>

        <div className='flex items-center justify-between'>
          <p className='text-sm text-gray-600'>
            {filteredSupplies.length !== supplies.length
              ? `${filteredSupplies.length}件の検索結果（全${supplies.length}件）`
              : `${supplies.length}件の備蓄品`}
          </p>
          <Button asChild>
            <Link href='/supplies/add'>備蓄品を追加</Link>
          </Button>
        </div>
      </div>

      {/* 不足カテゴリ */}
      <MissingCategoriesAlert
        supplies={sortedSupplies}
        teamId={user.teamId}
        teamStockSettings={team?.stockSettings}
        viewerGender={user.gender}
      />
      {/* 備蓄品 */}
      <div className='space-y-4'>
        {sortedSupplies.map((supply: Supply) => (
          <SupplyItem
            key={supply.id}
            canDelete={canDelete}
            supply={supply}
            teamStockSettings={team?.stockSettings}
            onArchiveSupply={() => {
              setSupplies((prev) => prev.filter((s) => s.id !== supply.id));
            }}
            onDeleteSupply={() => handleDeleteSupply(supply.id)}
            onRefetch={handleRefetch}
            onUpdateSupply={() => handleUpdateSupply(supply.id)}
          />
        ))}
      </div>

      {/* 編集モーダル */}
      {showEditModal && selectedSupply && (
        <div
          className='fixed inset-0 bg-white flex items-center justify-center z-50'
          onClick={() => setShowEditModal(false)}
        >
          <div
            className='bg-white rounded-lg p-6 max-w-md w-full relative border border-gray-200'
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className='text-xl font-bold mb-4'>
              {selectedSupply.name} を編集
            </h2>
            <form className='space-y-4' onSubmit={handleEditSubmit}>
              <div>
                <label
                  className='block text-sm font-medium mb-1'
                  htmlFor='name'
                >
                  品名 <span className='text-red-500'>*</span>
                </label>
                <input
                  required
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black'
                  id='name'
                  type='text'
                  defaultValue={selectedSupply.name}
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label
                    className='block text-sm font-medium mb-1'
                    htmlFor='quantity'
                  >
                    数量 <span className='text-red-500'>*</span>
                  </label>
                  <input
                    required
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black'
                    id='quantity'
                    type='number'
                    min={1}
                    defaultValue={selectedSupply.quantity}
                  />
                </div>
                <div>
                  <label
                    className='block text-sm font-medium mb-1'
                    htmlFor='unit'
                  >
                    単位 <span className='text-red-500'>*</span>
                  </label>
                  <select
                    required
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black'
                    id='unit'
                    defaultValue={selectedSupply.unit}
                  >
                    {FOOD_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label
                  className='block text-sm font-medium mb-1'
                  htmlFor='category'
                >
                  カテゴリ <span className='text-red-500'>*</span>
                </label>
                <select
                  required
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black'
                  id='category'
                  name='category'
                  defaultValue={selectedSupply.category}
                >
                  {FOOD_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className='block text-sm font-medium mb-1'
                  htmlFor='expiryDate'
                >
                  賞味期限 <span className='text-red-500'>*</span>
                </label>
                <input
                  required
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black'
                  id='expiryDate'
                  type='date'
                  defaultValue={selectedSupply.expiryDate}
                />
              </div>
              <div>
                <label
                  className='block text-sm font-medium mb-1'
                  htmlFor='amount'
                >
                  金額（任意）
                </label>
                <input
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black'
                  id='amount'
                  type='number'
                  defaultValue={selectedSupply.amount || ""}
                />
              </div>
              <div>
                <label
                  className='block text-sm font-medium mb-1'
                  htmlFor='purchaseLocation'
                >
                  購入場所（任意）
                </label>
                <input
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black'
                  id='purchaseLocation'
                  type='text'
                  defaultValue={selectedSupply.purchaseLocation || ""}
                />
              </div>
              <div>
                <label
                  className='block text-sm font-medium mb-1'
                  htmlFor='label'
                >
                  ラベル・メモ（任意）
                </label>
                <input
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black'
                  id='label'
                  type='text'
                  defaultValue={selectedSupply.label || ""}
                />
              </div>
              <div>
                <label
                  className='block text-sm font-medium mb-1'
                  htmlFor='storageLocation'
                >
                  保管場所（任意）
                </label>
                <input
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black'
                  id='storageLocation'
                  type='text'
                  defaultValue={selectedSupply.storageLocation || ""}
                />
              </div>
              <div className='flex justify-end gap-3 pt-4'>
                <button
                  className='px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors'
                  onClick={(e) => {
                    e.preventDefault();
                    setShowEditModal(false);
                  }}
                  type='button'
                >
                  キャンセル
                </button>
                <button
                  className='px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors'
                  type='submit'
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} variant={toast.variant} />}
    </>
  );
}
