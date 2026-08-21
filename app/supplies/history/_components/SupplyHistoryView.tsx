"use client";

import type { SupplyHistory } from "@/types";
import { ERROR_MESSAGES } from "@/utils/constants";
import { getExpiryType } from "@/utils/stockRecommendations";
import {
  sortSupplyHistory,
  type HistorySortOption,
} from "@/utils/supplyHistoryHelpers";
import { Toast } from "@/components/ui";
import { useToast } from "@/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ServerUser {
  uid: string;
  email: string;
  displayName?: string;
  teamId?: string;
}

interface SupplyHistoryViewProps {
  initialHistories: SupplyHistory[];
  user: ServerUser;
}

export default function SupplyHistoryView({
  initialHistories,
  user,
}: SupplyHistoryViewProps) {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [histories] = useState<SupplyHistory[]>(initialHistories);
  const [sortBy, setSortBy] = useState<HistorySortOption>("archivedAt");
  const sortOrder = "desc";
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<SupplyHistory | null>(
    null
  );
  const [restockQuantity, setRestockQuantity] = useState(1);
  const [restockUnit, setRestockUnit] = useState("");
  const [restockExpiryDate, setRestockExpiryDate] = useState("");
  const [restockLocation, setRestockLocation] = useState("");
  const [restockAmount, setRestockAmount] = useState("");
  const [restockLabel, setRestockLabel] = useState("");
  const [restockStorageLocation, setRestockStorageLocation] = useState("");
  const [restocking, setRestocking] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredHistories = histories.filter((history) => {
    if (selectedCategory !== "all" && history.category !== selectedCategory) {
      return false;
    }

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const nameMatch = history.name.toLowerCase().includes(query);
      const categoryMatch = history.category.toLowerCase().includes(query);
      const locationMatch = history.purchaseLocations.some((loc) =>
        loc.toLowerCase().includes(query)
      );

      return nameMatch || categoryMatch || locationMatch;
    }

    return true;
  });

  const sortedHistories = sortSupplyHistory(
    filteredHistories,
    sortBy,
    sortOrder
  );

  const categories = Array.from(
    new Set(histories.map((h) => h.category))
  ).sort();

  const handleRestockClick = (history: SupplyHistory) => {
    setSelectedHistory(history);
    setRestockQuantity(1);
    setRestockUnit(history.unit);
    setRestockExpiryDate("");
    setRestockLocation(
      history.purchaseLocations.length > 0 ? history.purchaseLocations[0] : ""
    );
    setRestockAmount("");
    setRestockLabel("");
    setRestockStorageLocation("");
    setShowRestockModal(true);
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedHistory || !restockExpiryDate) return;

    try {
      setRestocking(true);
      const response = await fetch("/api/actions/restore-from-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          historyId: selectedHistory.id,
          quantity: restockQuantity,
          unit: restockUnit,
          expiryDate: restockExpiryDate,
          purchaseLocation: restockLocation || null,
          amount: restockAmount ? parseFloat(restockAmount) : null,
          label: restockLabel || null,
          storageLocation: restockStorageLocation || null,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "保存に失敗しました");
      }

      showToast("備蓄品を追加しました！", "success");
      setShowRestockModal(false);
      setTimeout(() => {
        router.push("/supplies/list");
      }, 800);
    } catch (error) {
      console.error("Restock error:", error);
      showToast("保存に失敗しました", "error");
    } finally {
      setRestocking(false);
    }
  };

  if (!user.teamId) {
    return (
      <div className='text-center py-8'>
        <p className='text-gray-600'>
          {ERROR_MESSAGES.FAMILY_GROUP_ID_MISSING}
        </p>
      </div>
    );
  }

  return (
    <>
      {user.teamId ? (
        <>
          {histories.length > 0 && (
            <div className='mb-3 space-y-3'>
              <div className='flex flex-col sm:flex-row gap-4'>
                <div className='flex-1'>
                  <input
                    type='text'
                    placeholder='商品名、カテゴリ、購入場所で検索...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-black'
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
                  onChange={(e) =>
                    setSortBy(e.target.value as HistorySortOption)
                  }
                  value={sortBy}
                >
                  <option value='archivedAt'>アーカイブ日時順</option>
                  <option value='name'>商品名順</option>
                  <option value='category'>カテゴリ順</option>
                  <option value='totalConsumed'>累計消費量順</option>
                  <option value='reviewCount'>レビュー数順</option>
                </select>
              </div>

              <p className='text-sm text-gray-600'>
                {filteredHistories.length !== histories.length
                  ? `${filteredHistories.length}件の検索結果（全${histories.length}件）`
                  : `${histories.length}件の履歴`}
              </p>
            </div>
          )}

          {sortedHistories.length > 0 ? (
            <div className='space-y-4'>
              {sortedHistories.map((history: SupplyHistory) => (
                <div
                  key={history.id}
                  className='border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow'
                >
                  <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
                    <div className='flex-1'>
                      <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                        {history.name}
                      </h3>
                      <div className='space-y-1 text-sm text-gray-600'>
                        <p>
                          <span className='font-medium'>カテゴリ:</span>{" "}
                          {history.category}
                        </p>
                        <p>
                          <span className='font-medium'>累計消費:</span>{" "}
                          {history.totalConsumed}
                          {history.unit}
                        </p>
                        {history.purchaseLocations.length > 0 && (
                          <p>
                            <span className='font-medium'>購入場所:</span>{" "}
                            {history.purchaseLocations.join(", ")}
                          </p>
                        )}
                        <p>
                          <span className='font-medium'>最後に使用:</span>{" "}
                          {new Date(history.lastUsedDate).toLocaleDateString(
                            "ja-JP"
                          )}
                        </p>
                        {history.hasReviews && (
                          <p className='text-blue-400'>
                            <Link
                              href={`/supplies/${history.id}/reviews`}
                              className='hover:underline'
                            >
                              {history.reviewCount}件のレビュー
                            </Link>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className='flex flex-col gap-2'>
                      <button
                        className='bg-gray-800 text-white font-normal py-3 px-3 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg'
                        onClick={() => handleRestockClick(history)}
                      >
                        もう一度備蓄する
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : histories.length > 0 ? (
            <div className='text-center py-8 bg-gray-50 rounded-lg border border-gray-200'>
              <p className='text-gray-600 mb-2'>
                検索結果が見つかりませんでした
              </p>
              <p className='text-sm text-gray-500 mb-4'>
                別のキーワードやカテゴリで試してみてください
              </p>
            </div>
          ) : (
            <div className='text-center py-8'>
              <p className='text-gray-600 mb-4'>履歴はまだありません</p>
              <Link
                className='inline-block bg-gray-800 text-white font-semibold py-2 px-4 rounded hover:bg-gray-700'
                href='/supplies/list'
              >
                現在の備蓄品一覧に戻る
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className='text-center py-8'>
          <p className='text-gray-600'>
            {ERROR_MESSAGES.FAMILY_GROUP_ID_MISSING}
          </p>
        </div>
      )}
      {/* モーダル */}
      {showRestockModal && selectedHistory && (
        <div
          className='fixed inset-0 bg-white flex items-center justify-center z-50'
          onClick={() => setShowRestockModal(false)}
        >
          <div
            className='bg-white rounded-lg p-6 max-w-md w-full relative border border-gray-200'
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className='text-xl font-bold mb-4'>
              {selectedHistory.name} を備蓄する
            </h2>
            <form className='space-y-4' onSubmit={handleRestockSubmit}>
              <div>
                <label
                  className='block text-sm font-medium mb-1'
                  htmlFor='quantity'
                >
                  数量 <span className='text-red-500'>*</span>
                </label>
                <input
                  required
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  id='quantity'
                  min='1'
                  onChange={(e) =>
                    setRestockQuantity(parseInt(e.target.value) || 0)
                  }
                  type='number'
                  value={restockQuantity}
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
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  id='unit'
                  onChange={(e) => setRestockUnit(e.target.value)}
                  value={restockUnit}
                >
                  <option value='個'>個</option>
                  <option value='袋'>袋</option>
                  <option value='缶'>缶</option>
                  <option value='本'>本</option>
                  <option value='パック'>パック</option>
                  <option value='箱'>箱</option>
                  <option value='kg'>kg</option>
                  <option value='g'>g</option>
                  <option value='L'>L</option>
                  <option value='ml'>ml</option>
                </select>
              </div>
              <div>
                <label
                  className='block text-sm font-medium mb-1'
                  htmlFor='expiryDate'
                >
                  {selectedHistory
                    ? getExpiryType(selectedHistory.category).label
                    : "期限"}{" "}
                  {selectedHistory &&
                    getExpiryType(selectedHistory.category).type !==
                      "noExpiry" && <span className='text-red-500'>*</span>}
                </label>
                <input
                  required={
                    selectedHistory
                      ? getExpiryType(selectedHistory.category).type !==
                        "noExpiry"
                      : true
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  id='expiryDate'
                  onChange={(e) => setRestockExpiryDate(e.target.value)}
                  type='date'
                  value={restockExpiryDate}
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
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  id='amount'
                  onChange={(e) => setRestockAmount(e.target.value)}
                  placeholder='例: 500'
                  type='number'
                  value={restockAmount}
                />
              </div>
              <div>
                <label
                  className='block text-sm font-medium mb-1'
                  htmlFor='location'
                >
                  購入場所（任意）
                </label>
                <input
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  id='location'
                  onChange={(e) => setRestockLocation(e.target.value)}
                  placeholder='例: スーパーマーケット'
                  type='text'
                  value={restockLocation}
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
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  id='label'
                  onChange={(e) => setRestockLabel(e.target.value)}
                  placeholder='例: 非常用、日常用'
                  type='text'
                  value={restockLabel}
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
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  id='storageLocation'
                  onChange={(e) => setRestockStorageLocation(e.target.value)}
                  placeholder='例: キッチン、倉庫'
                  type='text'
                  value={restockStorageLocation}
                />
              </div>
              <div className='flex justify-end gap-3'>
                <button
                  className='px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors'
                  onClick={() => setShowRestockModal(false)}
                  type='button'
                >
                  キャンセル
                </button>
                <button
                  className='px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:bg-gray-400'
                  disabled={restocking}
                  type='submit'
                >
                  {restocking ? "追加中..." : "追加"}
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
