// utils/stockCalculator.ts

import type { Supply, TeamStockSettings } from "@/types";
import { DEFAULT_TEAM_STOCK_DAYS } from "@/utils/constants";
import { getApplicableStockRecommendationCategories, getRecommendation } from "./stockRecommendations";

export interface StockStatus {
  recommended: number; // 推奨在庫量
  current: number; // 現在の在庫
  status: "sufficient" | "below-recommended" | "low" | "critical" | "out";
  daysRemaining: number; // 残り日数
  needToBuy: number; // 買い足すべき量
  priority: "high" | "medium" | "low";
  message: string; // ユーザーへのメッセージ
  dailyConsumption: number; // 1日あたりの消費量
  consumptionDayBasedHint?: boolean;
}

export function getDefaultSettings(): TeamStockSettings {
  return {
    householdSize: 1,
    stockDays: DEFAULT_TEAM_STOCK_DAYS,
    hasPets: false,
    dogCount: 0,
    catCount: 0,
    useDetailedComposition: true,
    composition: {
      adult: 1,
      child: 0,
      infant: 0,
      elderly: 0,
    },
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
      consumptionDayBasedHint: false,
    };
  }

  const legacyGasCategoryStoveBody =
    recommendation.category === "カセットコンロ・ガスボンベ" &&
    /\(本体\)|（本体）|コンロ\s*本体/u.test(supply.name ?? "");

  const householdTargetRaw =
    recommendation.householdUnitTarget ??
    (legacyGasCategoryStoveBody ? 1 : undefined);

  if (householdTargetRaw != null) {
    const recommended = Math.max(Math.round(householdTargetRaw), 1);
    const needToBuy = Math.max(0, recommended - supply.quantity);
    let status: StockStatus["status"];
    let priority: StockStatus["priority"];
    let message: string;

    if (supply.quantity === 0) {
      status = "out";
      priority = "high";
      message = `在庫がありません。世帯向けに${recommended}${supply.unit}ほどあると安心です`;
    } else if (needToBuy > 0) {
      status = "below-recommended";
      priority = "medium";
      message = `世帯向けの目安は${recommended}${supply.unit}です（あと${needToBuy}${supply.unit}）`;
    } else {
      status = "sufficient";
      priority = "low";
      message = `世帯向けの目標を満たしています`;
    }

    return {
      recommended,
      current: supply.quantity,
      status,
      daysRemaining: 0,
      needToBuy,
      priority,
      message,
      dailyConsumption: 0,
      consumptionDayBasedHint: false,
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
    consumptionDayBasedHint: true,
  };
}

/** カテゴリのみ不足一覧に使う（数量0のときの算出と同一ロジック） */
const CATEGORY_TARGET_PREVIEW_DUMMY = "__category_target_preview__";

/**
 * 「このカテゴリはまだ未登録」のときに、備蓄設定に基づく目標量の目安を返す。
 * 不足カテゴリリストで「およそどれだけ欲しいか」を表示する用途。
 */
export function getCategoryStockTargetPreview(
  category: string,
  settings?: TeamStockSettings | null
): {
  recommended: number;
  unit: string;
  headline: string;
} | null {
  const recommendation = getRecommendation(category);
  if (!recommendation) return null;

  const status = calculateStockStatus(
    {
      id: CATEGORY_TARGET_PREVIEW_DUMMY,
      name: "",
      quantity: 0,
      expiryDate: "",
      isArchived: false,
      category,
      unit: recommendation.unit,
      registeredAt: { seconds: 0, nanoseconds: 0 },
      teamId: "",
      uid: "",
    },
    settings
  );

  const { recommended, needToBuy } = status;
  const unit = recommendation.unit;

  if (recommended <= 0) {
    return null;
  }

  if (status.consumptionDayBasedHint === false) {
    return {
      recommended,
      unit,
      headline: `目標まであと ${needToBuy}${unit}`,
    };
  }

  return {
    recommended,
    unit,
    headline: `目標まであとおよそ ${needToBuy}${unit}`,
  };
}

/**
 * 複数の備蓄品の状況を集計
 * 達成率はカテゴリごとに1つの目標量を立て、手持ち合算を min(合算, 目標) で足す（未登録カテゴリも分母に含む）。
 */
export function aggregateStockStatus(
  supplies: Supply[],
  settings?: TeamStockSettings | null,
  viewerGender?: string | null
): {
  total: number;
  out: number;
  critical: number;
  low: number;
  belowRecommended: number;
  sufficient: number;
  overallPercentage: number;
} {
  const activeSupplies = supplies.filter((s) => !s.isArchived);

  const statusCount = {
    out: 0,
    critical: 0,
    low: 0,
    belowRecommended: 0,
    sufficient: 0,
  };

  activeSupplies.forEach((supply) => {
    const status = calculateStockStatus(supply, settings);
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

  const scoredCategories = getApplicableStockRecommendationCategories(
    settings,
    viewerGender
  );

  let totalTarget = 0;
  let totalAchieved = 0;
  for (const category of scoredCategories) {
    const preview = getCategoryStockTargetPreview(category, settings);
    if (!preview || preview.recommended <= 0) continue;

    const onHand = activeSupplies
      .filter((s) => s.category === category)
      .reduce((sum, s) => sum + s.quantity, 0);

    totalTarget += preview.recommended;
    totalAchieved += Math.min(onHand, preview.recommended);
  }

  const overallPercentage =
    totalTarget > 0
      ? Math.round((totalAchieved / totalTarget) * 100)
      : 0;

  return {
    total: activeSupplies.length,
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
