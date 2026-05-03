// components/supplies/MissingCategoriesAlert.tsx
"use client";
import Link from "next/link";
import { useState } from "react";

import type { Supply, TeamStockSettings } from "@/types";
import { DEFAULT_TEAM_STOCK_DAYS } from "@/utils/constants";
import {
  aggregateStockStatus,
  getCategoryStockTargetPreview,
} from "@/utils/stockCalculator";
import {
  getMissingCategoriesByPriority,
  getProgress,
  getRecommendedItems,
} from "@/utils/stockRecommendations";

interface MissingCategoriesAlertProps {
  supplies: Supply[];
  teamId: string;
  teamStockSettings?: TeamStockSettings;
  /** アカウント設定の性別*/
  viewerGender?: string | null;
}

function MissingCategoryTargetHint({
  category,
  settings,
}: {
  category: string;
  settings?: TeamStockSettings;
}) {
  const preview = getCategoryStockTargetPreview(category, settings);
  if (!preview) return null;
  return (
    <div className='mt-2 rounded-md bg-sky-50 border border-sky-100 px-2 py-2 text-xs sm:text-sm text-sky-950'>
      <p className='font-semibold'>{preview.headline}</p>
    </div>
  );
}

export function MissingCategoriesAlert({
  supplies,
  teamId,
  teamStockSettings,
  viewerGender,
}: MissingCategoriesAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const userSupplies = supplies.map((s) => ({
    category: s.category,
    quantity: s.quantity,
  }));

  const derivedDays = teamStockSettings?.stockDays ?? DEFAULT_TEAM_STOCK_DAYS;
  const missing = getMissingCategoriesByPriority(
    userSupplies,
    teamStockSettings,
    viewerGender
  );
  const progress = getProgress(userSupplies, teamStockSettings, viewerGender);
  const aggregate = aggregateStockStatus(
    supplies,
    teamStockSettings,
    viewerGender
  );
  const totalMissing =
    missing.essential.length +
    missing.important.length +
    missing.recommended.length;

  if (totalMissing === 0) {
    return (
      <div className='mb-6'>
        <div className='p-4 bg-green-50 border border-green-200 rounded-lg'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div>
                <p className='text-green-800 font-semibold'>
                  目標{derivedDays}日分を達成しました！
                </p>
                <p className='text-sm text-green-600'>
                  達成率 {aggregate.overallPercentage}%
                  {aggregate.out > 0 && ` • 在庫切れ ${aggregate.out}品目`}
                  {aggregate.critical > 0 &&
                    ` • 緊急 ${aggregate.critical}品目`}
                  {aggregate.low > 0 && ` • 少ない ${aggregate.low}品目`}
                </p>
                <p className='text-xs text-green-500'>
                  {progress.progressPercentage}% 完了（
                  {progress.stockedCategories}/{progress.totalCategories}
                  カテゴリ）
                </p>
              </div>
            </div>
            {teamStockSettings && (
              <span className='text-xs text-gray-600 bg-white px-2 py-1 rounded hidden sm:inline'>
                {teamStockSettings.householdSize}人・
                {teamStockSettings.stockDays}日分目標
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='mb-6'>
      {/* 統合された推奨カテゴリアラート */}
      <div className='p-4 bg-gray-50 border border-gray-300 rounded-lg'>
        <div
          className='flex items-center justify-between cursor-pointer'
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className='flex items-center gap-2'>
            <div>
              <p className='font-semibold text-gray-900'>
                ＊目標{derivedDays}日分の推奨（{totalMissing}件）
              </p>
              <p className='text-sm text-gray-600'>
                達成率 {aggregate.overallPercentage}%
                {aggregate.out > 0 && ` • 在庫切れ ${aggregate.out}品目`}
                {aggregate.critical > 0 && ` • 緊急 ${aggregate.critical}品目`}
                {aggregate.low > 0 && ` • 少ない ${aggregate.low}品目`}
              </p>
              <p className='text-xs text-gray-500'>
                {progress.progressPercentage}% 完了（
                {progress.stockedCategories}/{progress.totalCategories}
                カテゴリ）
              </p>
              <p className='text-xs text-gray-600 mt-1'>
                展開するとカテゴリごとに、いまの家族・備蓄日数から見た推奨量を表示します。
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            {teamStockSettings && (
              <span className='text-xs text-gray-600 bg-white px-2 py-1 rounded hidden sm:inline'>
                {teamStockSettings.householdSize}人・
                {teamStockSettings.stockDays}日分目標
              </span>
            )}
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${
                isExpanded ? "transform rotate-180" : ""
              }`}
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M19 9l-7 7-7-7'
              />
            </svg>
          </div>
        </div>

        {isExpanded && (
          <div className='mt-4 space-y-4'>
            {missing.essential.length > 0 && (
              <div>
                <h4 className='font-semibold text-orange-700 mb-2 flex items-center gap-2'>
                  <span>必須カテゴリ（{missing.essential.length}件）</span>
                </h4>
                <div className='space-y-2'>
                  {missing.essential.map((rec) => (
                    <div
                      key={rec.category}
                      className='p-3 bg-white border border-red-200 rounded-md'
                    >
                      <div className='flex items-start justify-between'>
                        <div className='flex-1'>
                          <p className='font-semibold text-gray-900'>
                            {rec.category}
                          </p>
                          <MissingCategoryTargetHint
                            category={rec.category}
                            settings={teamStockSettings}
                          />
                          <div className='mt-2'>
                            <p className='text-xs text-gray-500 font-semibold mb-1'>
                              推奨商品例:
                            </p>
                            <div className='flex flex-wrap gap-1'>
                              {getRecommendedItems(rec.category).map((item) => (
                                <span
                                  key={item}
                                  className='text-xs bg-gray-100 px-2 py-1 rounded'
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Link
                          href={`/supplies/add?teamId=${teamId}&category=${encodeURIComponent(rec.category)}`}
                          className='ml-3 px-3 py-1 bg-orange-400 text-white text-sm rounded hover:bg-orange-500 whitespace-nowrap'
                        >
                          追加
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {missing.important.length > 0 && (
              <div>
                <h4 className='font-semibold text-yellow-700 mb-2 flex items-center gap-2'>
                  <span>重要カテゴリ（{missing.important.length}件）</span>
                </h4>
                <div className='space-y-2'>
                  {missing.important.map((rec) => (
                    <div
                      key={rec.category}
                      className='p-3 bg-white border border-yellow-200 rounded-md'
                    >
                      <div className='flex items-start justify-between'>
                        <div className='flex-1'>
                          <p className='font-semibold text-gray-900'>
                            {rec.category}
                          </p>
                          <p className='text-sm text-gray-600 mt-1'>
                            {rec.description}
                          </p>
                          <MissingCategoryTargetHint
                            category={rec.category}
                            settings={teamStockSettings}
                          />
                          <div className='mt-2'>
                            <p className='text-xs text-gray-500 font-semibold mb-1'>
                              推奨商品例:
                            </p>
                            <div className='flex flex-wrap gap-1'>
                              {getRecommendedItems(rec.category).map((item) => (
                                <span
                                  key={item}
                                  className='text-xs bg-gray-100 px-2 py-1 rounded'
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Link
                          href={`/supplies/add?teamId=${teamId}&category=${encodeURIComponent(rec.category)}`}
                          className='ml-3 px-3 py-1 bg-orange-400 text-white text-sm rounded hover:bg-orange-500 whitespace-nowrap'
                        >
                          追加
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {missing.recommended.length > 0 && (
              <details>
                <summary className='font-semibold text-gray-700 cursor-pointer flex items-center gap-2 hover:text-gray-900'>
                  <span>推奨カテゴリ（{missing.recommended.length}件）</span>
                </summary>
                <div className='mt-2 space-y-2'>
                  {missing.recommended.map((rec) => (
                    <div
                      key={rec.category}
                      className='p-3 bg-white border border-gray-200 rounded-md'
                    >
                      <div className='flex items-start justify-between'>
                        <div className='flex-1'>
                          <p className='font-semibold text-gray-900'>
                            {rec.category}
                          </p>
                          <p className='text-sm text-gray-600 mt-1'>
                            {rec.description}
                          </p>
                          <MissingCategoryTargetHint
                            category={rec.category}
                            settings={teamStockSettings}
                          />
                          <div className='mt-2'>
                            <p className='text-xs text-gray-500 font-semibold mb-1'>
                              推奨商品例:
                            </p>
                            <div className='flex flex-wrap gap-1'>
                              {getRecommendedItems(rec.category).map((item) => (
                                <span
                                  key={item}
                                  className='text-xs bg-gray-100 px-2 py-1 rounded'
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Link
                          href={`/supplies/add?teamId=${teamId}&category=${encodeURIComponent(rec.category)}`}
                          className='ml-3 px-3 py-1 bg-orange-400 text-white text-sm rounded hover:bg-orange-500 whitespace-nowrap'
                        >
                          追加
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
