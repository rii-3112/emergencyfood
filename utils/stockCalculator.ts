// utils/stockCalculator.ts

import type { Supply, TeamStockSettings } from "@/types";
import { getRecommendation } from "./stockRecommendations";

export interface StockStatus {
  recommended: number; // 推奨在庫量
  current: number; // 現在の在庫
  status: "sufficient" | "below-recommended" | "low" | "critical" | "out";
  daysRemaining: number; // 残り日数
  needToBuy: number; // 買い足すべき量
  priority: "high" | "medium" | "low";
  message: string; // ユーザーへのメッセージ
  dailyConsumption: number; // 1日あたりの消費量
}

export function getDefaultSettings(): TeamStockSettings {
  return {
    householdSize: 1,
    stockDays: 7,
    hasPets: false,
    dogCount: 0,
    catCount: 0,
  };
}

/**
 * 在庫状況を計算
 */
export function calculateStockStatus(
  supply: Supply,
  settings?: TeamStockSettings | null
): StockStatus {
  // 設定がない場合はデフォルト値を使用
  const finalSettings = settings || getDefaultSettings();

  const recommendation = getRecommendation(supply.category);

  // カテゴリが見つからない場合は最小限の情報を返す
  if (!recommendation) {
    return {
      recommended: 0,
      current: supply.quantity,
      status: supply.quantity === 0 ? "out" : "sufficient",
      daysRemaining: 0,
      needToBuy: 0,
      priority: "low",
      message: "",
      dailyConsumption: 0,
    };
  }

  // 1日あたりの必要量を計算
  let dailyConsumption = 0;

  // 詳細な家族構成を使用する場合
  if (
    finalSettings.useDetailedComposition &&
    finalSettings.composition &&
    recommendation.byAgeGroup
  ) {
    const comp = finalSettings.composition;
    dailyConsumption +=
      recommendation.byAgeGroup.adult * comp.adult +
      recommendation.byAgeGroup.child * comp.child +
      recommendation.byAgeGroup.infant * comp.infant +
      recommendation.byAgeGroup.elderly * comp.elderly;
  } else {
    // 簡易計算（全員平均として計算）
    dailyConsumption +=
      recommendation.perPersonPerDay * finalSettings.householdSize;
  }

  // ペット分を追加
  if (finalSettings.hasPets) {
    if (recommendation.perDogPerDay && finalSettings.dogCount) {
      dailyConsumption += recommendation.perDogPerDay * finalSettings.dogCount;
    }
    if (recommendation.perCatPerDay && finalSettings.catCount) {
      dailyConsumption += recommendation.perCatPerDay * finalSettings.catCount;
    }
  }

  // 目標日数分の推奨量
  const recommended = Math.ceil(dailyConsumption * finalSettings.stockDays);

  // 残り日数を計算
  const daysRemaining =
    dailyConsumption > 0 ? supply.quantity / dailyConsumption : 0;

  // 買い足すべき量
  const needToBuy = Math.max(0, recommended - supply.quantity);

  // ステータスを判定
  let status: StockStatus["status"];
  let priority: StockStatus["priority"];
  let message: string;

  if (supply.quantity === 0) {
    status = "out";
    priority = "high";
    message = `在庫がありません！${recommended}${supply.unit}必要です`;
  } else if (daysRemaining < 1) {
    status = "critical";
    priority = "high";
    message = `残り1日分以下です！早急に買い足してください`;
  } else if (daysRemaining < 3) {
    status = "low";
    priority = "high";
    message = `残り${Math.floor(daysRemaining)}日分です。買い足しをおすすめします`;
  } else if (supply.quantity < recommended) {
    status = "below-recommended";
    priority = "medium";
    message = `目標まであと${needToBuy}${supply.unit}です`;
  } else {
    status = "sufficient";
    priority = "low";
    message = `十分な備蓄があります（約${Math.floor(daysRemaining)}日分）`;
  }

  return {
    recommended,
    current: supply.quantity,
    status,
    daysRemaining,
    needToBuy,
    priority,
    message,
    dailyConsumption,
  };
}

/**
 * 複数の備蓄品の状況を集計
 */
export function aggregateStockStatus(
  supplies: Supply[],
  settings?: TeamStockSettings | null
): {
  total: number;
  out: number;
  critical: number;
  low: number;
  belowRecommended: number;
  sufficient: number;
  overallPercentage: number;
} {
  let totalRecommended = 0;
  let totalCurrent = 0;
  const statusCount = {
    out: 0,
    critical: 0,
    low: 0,
    belowRecommended: 0,
    sufficient: 0,
  };

  supplies.forEach((supply) => {
    const status = calculateStockStatus(supply, settings);
    totalRecommended += status.recommended;
    totalCurrent += status.current;

    switch (status.status) {
      case "out":
        statusCount.out++;
        break;
      case "critical":
        statusCount.critical++;
        break;
      case "low":
        statusCount.low++;
        break;
      case "below-recommended":
        statusCount.belowRecommended++;
        break;
      case "sufficient":
        statusCount.sufficient++;
        break;
    }
  });

  const overallPercentage =
    totalRecommended > 0
      ? Math.round((totalCurrent / totalRecommended) * 100)
      : 100;

  return {
    total: supplies.length,
    ...statusCount,
    overallPercentage,
  };
}

/**
 * カテゴリ別の達成率を計算
 */
export function calculateCategoryProgress(
  supplies: Supply[],
  settings?: TeamStockSettings | null
): Record<
  string,
  { current: number; recommended: number; percentage: number }
> {
  const categoryMap: Record<string, { current: number; recommended: number }> =
    {};

  supplies.forEach((supply) => {
    if (!categoryMap[supply.category]) {
      categoryMap[supply.category] = { current: 0, recommended: 0 };
    }

    const status = calculateStockStatus(supply, settings);
    categoryMap[supply.category].current += status.current;
    categoryMap[supply.category].recommended += status.recommended;
  });

  // パーセンテージを計算
  const result: Record<
    string,
    { current: number; recommended: number; percentage: number }
  > = {};
  Object.keys(categoryMap).forEach((category) => {
    const data = categoryMap[category];
    result[category] = {
      ...data,
      percentage:
        data.recommended > 0
          ? Math.round((data.current / data.recommended) * 100)
          : 100,
    };
  });

  return result;
}
