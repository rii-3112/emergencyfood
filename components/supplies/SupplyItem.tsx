//component/supplies/SupplyItem.tsx
"use client";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale/ja";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RestockModal } from "@/components/supplies/RestockModal";
import { ConfirmDialog } from "@/components/ui";
import { useAuth, useClickOutside } from "@/hooks";
import type { Supply, TeamStockSettings } from "@/types";
import { UI_CONSTANTS } from "@/utils/constants";
import { calculateStockStatus } from "@/utils/stockCalculator";
import {
  getNearestExpiryDate,
  migrateSupplyToExpiryDates,
  sortExpiryDates,
} from "@/utils/supplyHelpers";

type SupplyItemProps = {
  supply: Supply;
  onArchiveSupply: (supplyId: string) => void;
  onUpdateSupply: (supplyId: string) => void;
  onRestoreSupply?: (supplyId: string) => void;
  onDeleteSupply?: (supplyId: string) => void;
  canDelete?: boolean;
  onRefetch?: () => void;
  teamStockSettings?: TeamStockSettings | null;
};

const getExpiryLabel = (category: string) => {
  const foodCategories = [
    "米・パン",
    "麺類",
    "缶詰・レトルト",
    "調味料",
    "飲料",
    "お菓子・スイーツ",
  ];
  const dailyNecessities = [
    "トイレットペーパー",
    "マスク・消毒液",
    "電池・電球",
    "その他日用品",
  ];

  if (foodCategories.includes(category)) {
    return "賞味期限";
  } else if (dailyNecessities.includes(category)) {
    return "使用期限";
  } else {
    return "期限";
  }
};

export default function SupplyItem({
  supply,
  onArchiveSupply: _onArchiveSupply,
  onUpdateSupply,
  onRestoreSupply,
  onDeleteSupply,
  canDelete = false,
  onRefetch,
  teamStockSettings,
}: SupplyItemProps) {
  const router = useRouter();
  const { user } = useAuth(false);

  const migratedSupply = migrateSupplyToExpiryDates(supply);
  const nearestDate = getNearestExpiryDate(migratedSupply);

  const stockStatus = calculateStockStatus(supply, teamStockSettings);

  const expiryDate = new Date(nearestDate);
  const daysUntilExpiry = formatDistanceToNow(expiryDate, { locale: ja });
  const isNearExpiry =
    expiryDate > new Date() &&
    expiryDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const isOverExpiry = expiryDate.getTime() < Date.now();
  const registeredDate = new Date(supply.registeredAt.seconds * 1000);
  const _formattedRegisteredDate = registeredDate.toLocaleString("ja-JP");
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showExpiryDetails, setShowExpiryDetails] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [consuming, setConsuming] = useState(false);
  const [restocking, setRestocking] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const menuRef = useClickOutside(() => setShowMenu(false));

  const hasMultipleExpiries =
    migratedSupply.expiryDates && migratedSupply.expiryDates.length > 1;

  const expiryLabel = getExpiryLabel(supply.category);

  const reviewsLink = `/supplies/${supply.id}/reviews`;

  const handleMenuToggle = () => {
    setShowMenu((prev) => !prev);
  };

  const handleArchiveClick = async () => {
    if (!user) return;

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/actions/archive-to-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          supplyId: supply.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "履歴への移動に失敗しました");
      }

      setToastMessage(`${supply.name} を履歴に移動しました`);
      setTimeout(() => setToastMessage(null), 2000);

      setTimeout(() => {
        if (onRefetch) {
          onRefetch();
        } else {
          router.refresh();
        }
      }, 300);
    } catch (error) {
      console.error("Archive to history error:", error);
      setToastMessage(
        error instanceof Error ? error.message : "履歴への移動に失敗しました"
      );
      setTimeout(() => setToastMessage(null), 3000);
    }
    setShowMenu(false);
  };

  const handleUpdateClick = () => {
    onUpdateSupply(supply.id);
    setShowMenu(false);
  };

  const handleRestoreClick = () => {
    if (onRestoreSupply) {
      onRestoreSupply(supply.id);
      setShowMenu(false);
    }
  };

  const handleDeleteClick = () => {
    if (onDeleteSupply) {
      setConfirmDelete(true);
      setShowMenu(false);
    }
  };

  const handleConsume = async () => {
    if (!user) return;
    if (supply.quantity <= 0) {
      setToastMessage("在庫がありません");
      setTimeout(() => setToastMessage(null), 2000);
      return;
    }

    try {
      setConsuming(true);
      const idToken = await user.getIdToken();

      const res = await fetch("/api/actions/consume-supply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          supplyId: supply.id,
          quantity: 1,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "消費に失敗しました");
      }

      const data = await res.json();
      setToastMessage(
        `${supply.name} を 1${supply.unit} 使いました (残り ${data.remaining}${supply.unit})`
      );
      setTimeout(() => setToastMessage(null), 2000);

      setTimeout(() => {
        if (onRefetch) {
          onRefetch();
        } else {
          router.refresh();
        }
      }, 300);
    } catch (error) {
      console.error("Consume error:", error);
      setToastMessage(
        error instanceof Error ? error.message : "消費に失敗しました"
      );
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setConsuming(false);
    }
  };

  const handleRestock = async (
    quantity: number,
    expiryDate: string,
    purchasePrice?: number
  ) => {
    if (!user) return;

    try {
      setRestocking(true);
      const idToken = await user.getIdToken();

      const res = await fetch("/api/actions/restock-supply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          supplyId: supply.id,
          quantity,
          expiryDate,
          purchasePrice,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "買い足しに失敗しました");
      }

      const data = await res.json();
      setToastMessage(
        `${supply.name} を ${quantity}${supply.unit} 追加しました (合計 ${data.totalQuantity}${supply.unit})`
      );
      setTimeout(() => setToastMessage(null), 3000);
      setShowRestockModal(false);

      setTimeout(() => {
        if (onRefetch) {
          onRefetch();
        } else {
          router.refresh();
        }
      }, 300);
    } catch (error) {
      console.error("Restock error:", error);
      setToastMessage(
        error instanceof Error ? error.message : "買い足しに失敗しました"
      );
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setRestocking(false);
    }
  };

  const getExpiryStyle = () => {
    if (supply.quantity === 0) {
      return "border-gray-200 bg-white";
    }

    if (isOverExpiry) {
      return "border-red-500 bg-red-50";
    } else if (isNearExpiry) {
      return "border-yellow-500 bg-yellow-50";
    }
    return "border-gray-200 bg-white";
  };

  return (
    <>
      <div className={`border rounded-lg p-3 sm:p-4 ${getExpiryStyle()}`}>
        <div className='flex items-start justify-between mb-3 gap-3'>
          <div className='flex-1 min-w-0'>
            <h3 className='text-base sm:text-lg font-semibold text-gray-900 truncate'>
              {supply.name}
            </h3>
            <p className='text-xs sm:text-sm text-gray-600'>
              カテゴリ: {supply.category}
            </p>
          </div>

          <div ref={menuRef} className='relative flex-shrink-0'>
            <button
              aria-label='メニューを開く'
              className='p-1 text-gray-500 hover:text-gray-700 transition-colors'
              onClick={handleMenuToggle}
            >
              <span className='text-lg sm:text-xl'>⋮</span>
            </button>

            {showMenu && (
              <div className='absolute right-0 mt-1 w-28 sm:w-32 bg-white border border-gray-200 rounded shadow-lg z-10'>
                {supply.isArchived ? (
                  <>
                    {onRestoreSupply && (
                      <button
                        className='block w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                        onClick={handleRestoreClick}
                      >
                        リストに戻す
                      </button>
                    )}
                    {canDelete && onDeleteSupply && (
                      <button
                        className='block w-full text-left px-3 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 transition-colors'
                        onClick={handleDeleteClick}
                      >
                        {UI_CONSTANTS.DELETE}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      className='block w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                      onClick={handleArchiveClick}
                    >
                      履歴に移動
                    </button>
                    <button
                      className='block w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                      onClick={handleUpdateClick}
                    >
                      編集
                    </button>
                    {canDelete && onDeleteSupply && (
                      <button
                        className='block w-full text-left px-3 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 transition-colors'
                        onClick={handleDeleteClick}
                      >
                        {UI_CONSTANTS.DELETE}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className='space-y-1 sm:space-y-2 mb-3'>
          <div className='flex items-center justify-between'>
            <p className='text-xs sm:text-sm text-gray-700'>
              数量: {supply.quantity} {supply.unit}
            </p>
            {!supply.isArchived && (
              <div className='flex gap-2'>
                <button
                  className='px-2 py-1 text-xs bg-orange-100 text-orange-500 rounded hover:bg-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                  disabled={consuming || supply.quantity <= 0}
                  onClick={handleConsume}
                >
                  {consuming ? "処理中..." : "使った"}
                </button>
                <button
                  className='px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors disabled:opacity-50'
                  disabled={restocking}
                  onClick={() => setShowRestockModal(true)}
                >
                  {restocking ? "処理中..." : "買い足した"}
                </button>
              </div>
            )}
          </div>
          {supply.quantity > 0 && (
            <div>
              <p className='text-xs sm:text-sm text-gray-700'>
                {expiryLabel}: {nearestDate} ({daysUntilExpiry})
              </p>
              {hasMultipleExpiries && (
                <button
                  className='text-xs text-blue-600 hover:text-blue-800 mt-1'
                  onClick={() => setShowExpiryDetails(!showExpiryDetails)}
                >
                  {showExpiryDetails ? "▼ 詳細を隠す" : "▶ 詳細を表示"}
                </button>
              )}
              {showExpiryDetails && migratedSupply.expiryDates && (
                <div className='mt-2 pl-4 border-l-2 border-gray-300 space-y-1'>
                  {sortExpiryDates(migratedSupply.expiryDates).map(
                    (expiry, index) => {
                      const lotExpiryDate = new Date(expiry.date);
                      const lotDaysUntil = formatDistanceToNow(lotExpiryDate, {
                        locale: ja,
                      });
                      const lotIsNear =
                        lotExpiryDate > new Date() &&
                        lotExpiryDate <
                          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                      const lotIsOver = lotExpiryDate.getTime() < Date.now();

                      return (
                        <p
                          key={index}
                          className={`text-xs ${
                            lotIsOver
                              ? "text-red-600 font-semibold"
                              : lotIsNear
                                ? "text-yellow-600 font-semibold"
                                : "text-gray-600"
                          }`}
                        >
                          {expiry.date}: {expiry.quantity}
                          {supply.unit} ({lotDaysUntil})
                        </p>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          )}
          {supply.amount !== undefined &&
            supply.amount !== null &&
            supply.amount !== 0 && (
              <p className='text-xs sm:text-sm text-gray-700'>
                金額: {supply.amount} 円
              </p>
            )}
          {supply.storageLocation &&
            supply.storageLocation.trim() !== "" &&
            supply.storageLocation !== "未設定" && (
              <p className='text-xs sm:text-sm text-gray-700'>
                保存場所: {supply.storageLocation}
              </p>
            )}
          {supply.purchaseLocation && supply.purchaseLocation.trim() !== "" && (
            <p className='text-xs sm:text-sm text-gray-700'>
              購入場所: {supply.purchaseLocation}
            </p>
          )}
          {supply.label && supply.label.trim() !== "" && (
            <p className='text-xs sm:text-sm text-gray-700'>
              ラベル: {supply.label}
            </p>
          )}
        </div>

        {!supply.isArchived && stockStatus.status === "out" && (
          <div className='p-3 rounded mb-3 bg-red-100 text-red-700 border-2 border-red-300 animate-pulse'>
            <p className='text-sm font-bold flex items-center gap-2'>
              在庫がなくなりました！買い足してください
            </p>
            {stockStatus.recommended > 0 && (
              <p className='text-xs mt-1'>
                推奨: {stockStatus.recommended}
                {supply.unit}
                {teamStockSettings &&
                  stockStatus.consumptionDayBasedHint !== false &&
                  ` (${teamStockSettings.householdSize}人・${teamStockSettings.stockDays}日分)`}
              </p>
            )}
          </div>
        )}

        {!supply.isArchived &&
          (stockStatus.status === "critical" ||
            stockStatus.status === "low") && (
            <div className='p-3 rounded mb-3 bg-orange-100 text-orange-700 border-2 border-orange-300'>
              <p className='text-sm font-semibold flex items-center gap-2'>
                {stockStatus.message}
              </p>
              {stockStatus.needToBuy > 0 && (
                <p className='text-xs mt-1'>
                  目標まであと{stockStatus.needToBuy}
                  {supply.unit}
                  {stockStatus.consumptionDayBasedHint !== false &&
                    stockStatus.daysRemaining > 0 &&
                    ` (現在: 約${Math.floor(stockStatus.daysRemaining)}日分)`}
                </p>
              )}
            </div>
          )}

        {!supply.isArchived && stockStatus.status === "below-recommended" && (
          <div className='p-2 rounded mb-3 bg-yellow-50 text-yellow-700 border border-yellow-200'>
            <p className='text-xs flex items-center gap-2'>
              {stockStatus.message}
            </p>
          </div>
        )}

        {supply.quantity > 0 && (isNearExpiry || isOverExpiry) && (
          <div
            className={`p-2 rounded mb-3 ${
              isOverExpiry
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            <p className='text-xs sm:text-sm font-medium'>
              {isOverExpiry
                ? `${expiryLabel}が切れています！`
                : `${expiryLabel}が近づいています！`}
            </p>
          </div>
        )}

        <div>
          <Link
            className='inline-block bg-gray-800 text-white text-xs sm:text-sm font-medium py-2 px-3 sm:px-4 rounded hover:bg-gray-700 transition-colors'
            href={reviewsLink}
          >
            感想を見る・書く
          </Link>
        </div>
      </div>

      {onDeleteSupply && (
        <ConfirmDialog
          cancelText='キャンセル'
          confirmText='削除'
          confirmVariant='danger'
          isOpen={confirmDelete}
          message={UI_CONSTANTS.CONFIRM_DELETE_FOOD}
          title='削除の確認'
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => onDeleteSupply(supply.id)}
        />
      )}

      {showRestockModal && (
        <RestockModal
          supplyName={supply.name}
          unit={supply.unit}
          category={supply.category}
          onClose={() => setShowRestockModal(false)}
          onConfirm={handleRestock}
        />
      )}

      {toastMessage && (
        <div
          className='fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-[9999] max-w-sm bg-gray-800 text-white text-sm'
          style={{ zIndex: 9999 }}
        >
          {toastMessage}
        </div>
      )}
    </>
  );
}
