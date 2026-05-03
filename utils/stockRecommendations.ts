// utils/stockRecommendations.ts
// 備蓄品の推奨在庫量を定義

export interface StockRecommendation {
  category: string;
  perPersonPerDay: number; // 1人・1日あたりの推奨量（平均）
  perDogPerDay?: number; // 犬1匹・1日あたり（該当する場合）
  perCatPerDay?: number; // 猫1匹・1日あたり（該当する場合）
  unit: string;
  priority: "essential" | "important" | "recommended"; // 優先度
  description: string;

  // 年齢層別の推奨量（より詳細な計算用）
  byAgeGroup?: {
    adult: number; // 大人（18-64歳）
    child: number; // 子供（6-17歳）
    infant: number; // 乳幼児（0-5歳）
    elderly: number; // 高齢者（65歳以上）
  };

  /**
   * 世帯あたりこの台数・個数を目標にする（人日あたり消費モデルとは別）。
   * 設定時は「○日分」ベースのアラートにしない。
   */
  householdUnitTarget?: number;
}

// 備蓄レベル別のカテゴリ設定
export const STOCK_LEVELS = {
  beginner: {
    name: "最小限（1週間）",
    description: "まずはこれだけ！政府推奨の最低限カテゴリ",
    categories: [
      "米・パン",
      "飲料",
      "缶詰",
      "レトルト食品",
      "インスタント食品",
      "トイレットペーパー",
      "医薬品",
    ],
    color: "green",
  },
  standard: {
    name: "標準（2週間）",
    description: "バランス良く備蓄。推奨レベル",
    categories: [
      "米・パン",
      "麺類",
      "飲料",
      "缶詰",
      "レトルト食品",
      "トイレットペーパー",
      "ティッシュペーパー",
      "洗剤・石鹸",
      "医薬品",
      "懐中電灯・電池",
    ],
    color: "blue",
  },
  advanced: {
    name: "充実（1ヶ月）",
    description: "本格的な備蓄。全カテゴリを推奨",
    categories: [
      "米・パン",
      "麺類",
      "缶詰",
      "レトルト食品",
      "インスタント食品",
      "乾物",
      "調味料",
      "飲料",
      "野菜・果物",
      "菓子",
      "トイレットペーパー",
      "ティッシュペーパー",
      "ウェットティッシュ",
      "洗剤・石鹸",
      "シャンプー・ボディソープ",
      "歯磨き粉・歯ブラシ",
      "生理用品",
      "おむつ・ベビー用品",
      "マスク・消毒液",
      "医薬品",
      "懐中電灯・電池",
      "カセットコンロ・ガスボンベ",
      "カセットコンロ（本体）",
      "ラップ・アルミホイル",
      "ポリ袋・ゴミ袋",
      "ペットフード",
    ],
    color: "purple",
  },
} as const;

export type StockLevel = keyof typeof STOCK_LEVELS;

// 期限管理のカテゴリ分類
export const EXPIRY_CATEGORIES = {
  // 食品系（賞味期限）
  food: [
    "米・パン",
    "麺類",
    "缶詰",
    "レトルト食品",
    "インスタント食品",
    "乾物",
    "調味料",
    "飲料",
    "野菜・果物",
    "菓子",
  ],

  // 日用品系（使用期限）
  daily: [
    "トイレットペーパー",
    "ティッシュペーパー",
    "ウェットティッシュ",
    "洗剤・石鹸",
    "シャンプー・ボディソープ",
    "歯磨き粉・歯ブラシ",
    "生理用品",
    "おむつ・ベビー用品",
    "マスク・消毒液",
  ],

  // 医薬品系（消費期限）
  medical: ["医薬品"],

  // その他（使用期限）
  other: [
    "懐中電灯・電池",
    "カセットコンロ・ガスボンベ",
    "ラップ・アルミホイル",
    "ポリ袋・ゴミ袋",
    "ペットフード",
  ],

  // 期限なし（通知対象外）
  noExpiry: ["その他"],
} as const;

export type ExpiryCategoryType = keyof typeof EXPIRY_CATEGORIES;

/**
 * カテゴリの期限タイプを取得
 */
export function getExpiryType(category: string): {
  type: "food" | "daily" | "medical" | "other" | "noExpiry";
  label: string;
  notificationDays: number;
} {
  if ((EXPIRY_CATEGORIES.food as readonly string[]).includes(category)) {
    return {
      type: "food",
      label: "賞味期限",
      notificationDays: 30, // 30日前通知
    };
  }

  if ((EXPIRY_CATEGORIES.medical as readonly string[]).includes(category)) {
    return {
      type: "medical",
      label: "消費期限",
      notificationDays: 60, // 60日前通知（医薬品は重要）
    };
  }

  if ((EXPIRY_CATEGORIES.daily as readonly string[]).includes(category)) {
    return {
      type: "daily",
      label: "使用期限",
      notificationDays: 90, // 90日前通知
    };
  }

  if ((EXPIRY_CATEGORIES.other as readonly string[]).includes(category)) {
    return {
      type: "other",
      label: "使用期限",
      notificationDays: 90, // 90日前通知
    };
  }

  // 期限なし
  return {
    type: "noExpiry",
    label: "期限",
    notificationDays: 0, // 通知しない
  };
}

// カテゴリ別の推奨在庫量（1人・1日あたり）
export const STOCK_RECOMMENDATIONS: Record<string, StockRecommendation> = {
  "米・パン": {
    category: "米・パン",
    perPersonPerDay: 3, // 政府推奨：ご飯（アルファ米など）2食分、乾パンなど1食分
    byAgeGroup: {
      adult: 3,
      child: 2.5,
      infant: 1.5,
      elderly: 2.5,
    },
    unit: "食",
    priority: "essential",
    description: "主食は最も重要な備蓄品（政府推奨：ご飯・乾パンなど）",
  },
  麺類: {
    category: "麺類",
    perPersonPerDay: 1,
    byAgeGroup: {
      adult: 1,
      child: 0.8,
      infant: 0.3,
      elderly: 0.8,
    },
    unit: "食",
    priority: "important",
    description: "主食のバリエーションとして",
  },
  缶詰: {
    category: "缶詰",
    perPersonPerDay: 3, // 政府推奨：肉や魚の缶詰3缶/日
    byAgeGroup: {
      adult: 3,
      child: 2,
      infant: 1.5,
      elderly: 2.5,
    },
    perDogPerDay: 2, // 中型犬想定
    perCatPerDay: 2,
    unit: "缶",
    priority: "essential",
    description: "タンパク質源として重要（政府推奨：肉や魚の缶詰）",
  },
  乾物: {
    category: "乾物",
    perPersonPerDay: 1,
    unit: "食",
    priority: "recommended",
    description: "長期保存が可能",
  },
  調味料: {
    category: "調味料",
    perPersonPerDay: 0.2, // 1週間で1.4個程度
    unit: "個",
    priority: "recommended",
    description: "食事の満足度を高めます",
  },
  飲料: {
    category: "飲料",
    perPersonPerDay: 3, // リットル
    byAgeGroup: {
      adult: 3,
      child: 2,
      infant: 1,
      elderly: 2.5,
    },
    perDogPerDay: 0.5, // 中型犬想定
    perCatPerDay: 0.2,
    unit: "リットル",
    priority: "essential",
    description: "生命維持に最も重要（1人1日3リットルが目安）",
  },
  菓子: {
    category: "菓子",
    perPersonPerDay: 0.5,
    unit: "個",
    priority: "recommended",
    description: "ストレス軽減に役立ちます",
  },
  トイレットペーパー: {
    category: "トイレットペーパー",
    // 平常は「おおよそ4日で1ロール/人」程度の目安。防災時は使い増え・他用途を少し織り込み 0.35（約3日弱で1ロール/人）で算出。
    perPersonPerDay: 0.35,
    unit: "ロール",
    priority: "essential",
    description:
      "日用品で最も重要（目安は人数×備蓄日数で増えます。買い足しは12ロールパック等でも可）",
  },
  ティッシュペーパー: {
    category: "ティッシュペーパー",
    perPersonPerDay: 0.2, // 5日で1箱
    unit: "箱",
    priority: "important",
    description: "衛生管理に必要",
  },
  "洗剤・石鹸": {
    category: "洗剤・石鹸",
    perPersonPerDay: 0.1, // 10日で1個
    unit: "個",
    priority: "important",
    description: "衛生管理に重要",
  },
  "シャンプー・ボディソープ": {
    category: "シャンプー・ボディソープ",
    perPersonPerDay: 0.05, // 20日で1本
    unit: "本",
    priority: "recommended",
    description: "清潔を保つために",
  },
  "歯磨き粉・歯ブラシ": {
    category: "歯磨き粉・歯ブラシ",
    perPersonPerDay: 0.1, // 10日で1セット
    unit: "セット",
    priority: "important",
    description: "口腔衛生の維持",
  },
  生理用品: {
    category: "生理用品",
    perPersonPerDay: 5, // 該当者のみ
    unit: "個",
    priority: "essential",
    description: "必要な方は多めに備蓄",
  },
  "おむつ・ベビー用品": {
    category: "おむつ・ベビー用品",
    perPersonPerDay: 8, // 乳幼児1人あたり
    unit: "枚",
    priority: "essential",
    description: "乳幼児がいる場合は必須",
  },
  "マスク・消毒液": {
    category: "マスク・消毒液",
    perPersonPerDay: 2,
    unit: "枚",
    priority: "important",
    description: "感染症対策に重要",
  },
  "懐中電灯・電池": {
    category: "懐中電灯・電池",
    perPersonPerDay: 0.5,
    unit: "個",
    priority: "essential",
    description: "停電時に必須",
  },
  レトルト食品: {
    category: "レトルト食品",
    perPersonPerDay: 3, // 政府推奨：副菜としてレトルト食品3食分/日
    byAgeGroup: {
      adult: 3,
      child: 2,
      infant: 1,
      elderly: 2.5,
    },
    unit: "食",
    priority: "essential",
    description: "副菜として重要（政府推奨：野菜の缶詰やレトルト食品3食分）",
  },
  インスタント食品: {
    category: "インスタント食品",
    perPersonPerDay: 3, // 政府推奨：汁物として即席みそ汁やスープ3食分/日
    byAgeGroup: {
      adult: 3,
      child: 2,
      infant: 1,
      elderly: 2.5,
    },
    unit: "食",
    priority: "important",
    description: "汁物として重要（政府推奨：即席みそ汁やスープ3食分）",
  },
  "野菜・果物": {
    category: "野菜・果物",
    perPersonPerDay: 2,
    byAgeGroup: {
      adult: 2,
      child: 1.5,
      infant: 1,
      elderly: 2,
    },
    unit: "個",
    priority: "important",
    description: "ビタミン・ミネラル補給に必須",
  },
  医薬品: {
    category: "医薬品",
    perPersonPerDay: 0.3,
    unit: "個",
    priority: "essential",
    description: "常備薬・救急用品は必須",
  },
  ペットフード: {
    category: "ペットフード",
    perPersonPerDay: 0,
    perDogPerDay: 2,
    perCatPerDay: 2,
    unit: "食",
    priority: "essential",
    description: "ペットがいる場合は必須",
  },
  "カセットコンロ・ガスボンベ": {
    category: "カセットコンロ・ガスボンベ",
    perPersonPerDay: 0.5,
    unit: "本",
    priority: "essential",
    description: "カセットガス缶など燃料の消耗ペースの目安",
  },
  "カセットコンロ（本体）": {
    category: "カセットコンロ（本体）",
    perPersonPerDay: 0,
    householdUnitTarget: 1,
    unit: "台",
    priority: "important",
    description: "停電時に使うコンロ本体",
  },
  "ラップ・アルミホイル": {
    category: "ラップ・アルミホイル",
    perPersonPerDay: 0.1,
    unit: "本",
    priority: "important",
    description: "食器の代わりや保存に便利",
  },
  "ポリ袋・ゴミ袋": {
    category: "ポリ袋・ゴミ袋",
    perPersonPerDay: 2,
    unit: "枚",
    priority: "important",
    description: "衛生管理・簡易トイレに使用",
  },
  ウェットティッシュ: {
    category: "ウェットティッシュ",
    perPersonPerDay: 0.2,
    unit: "パック",
    priority: "important",
    description: "水が使えない時の衛生管理",
  },
  その他: {
    category: "その他",
    perPersonPerDay: 1,
    unit: "個",
    priority: "recommended",
    description: "その他の必需品",
  },
};

/**
 * カテゴリの推奨在庫量を取得
 */
export function getRecommendation(
  category: string
): StockRecommendation | null {
  return STOCK_RECOMMENDATIONS[category] || null;
}

/**
 * すべての推奨設定を取得
 */
export function getAllRecommendations(): StockRecommendation[] {
  return Object.values(STOCK_RECOMMENDATIONS);
}

/**
 * 優先度でフィルタリング
 */
export function getRecommendationsByPriority(
  priority: "essential" | "important" | "recommended"
): StockRecommendation[] {
  return getAllRecommendations().filter((rec) => rec.priority === priority);
}

export type StockTeamFilterSettings =
  | {
      composition?: { infant?: number };
      hasPets?: boolean;
      needsSanitarySupplies?: boolean;
    }
  | null
  | undefined;

/** ログイン利用者の gender（未設定可）。needsSanitarySupplies 未設定のとき生理用品可否のfallbackに利用 */
export type StockRecommendationViewerGender = string | null | undefined;

/** 乳幼児・ペット・閲覧者の性別など、推奨リストに載せるか */
export function isStockRecommendationActiveForTeam(
  rec: StockRecommendation,
  teamStockSettings?: StockTeamFilterSettings,
  viewerGender?: StockRecommendationViewerGender
): boolean {
  if (rec.category === "おむつ・ベビー用品") {
    const hasInfant =
      teamStockSettings?.composition?.infant !== undefined &&
      (teamStockSettings.composition.infant ?? 0) > 0;
    return hasInfant;
  }
  if (rec.category === "ペットフード") {
    return teamStockSettings?.hasPets === true;
  }
  if (rec.category === "生理用品") {
    const flag = teamStockSettings?.needsSanitarySupplies;
    if (flag === false) return false;
    if (flag === true) return true;
    return viewerGender !== "male";
  }
  return true;
}

/** 達成率などに使う・現在のコンテキストで有効な STOCK カテゴリ一覧 */
export function getApplicableStockRecommendationCategories(
  teamStockSettings?: StockTeamFilterSettings,
  viewerGender?: StockRecommendationViewerGender
): string[] {
  return Object.values(STOCK_RECOMMENDATIONS)
    .filter((rec) =>
      isStockRecommendationActiveForTeam(rec, teamStockSettings, viewerGender)
    )
    .map((rec) => rec.category);
}

/**
 * ユーザーが備蓄していないカテゴリを取得（全カテゴリ対象、家族構成を考慮）
 */
export function getMissingCategories(
  userSupplies: Array<{ category: string; quantity: number }>,
  teamStockSettings?: StockTeamFilterSettings,
  viewerGender?: StockRecommendationViewerGender
): StockRecommendation[] {
  const userCategories = new Set(
    userSupplies.filter((s) => s.quantity > 0).map((s) => s.category)
  );

  return Object.values(STOCK_RECOMMENDATIONS).filter((rec) => {
    if (userCategories.has(rec.category)) {
      return false;
    }
    return isStockRecommendationActiveForTeam(
      rec,
      teamStockSettings,
      viewerGender
    );
  });
}

/**
 * 優先度別に不足カテゴリを取得（全カテゴリ対象、家族構成を考慮）
 */
export function getMissingCategoriesByPriority(
  userSupplies: Array<{ category: string; quantity: number }>,
  teamStockSettings?: StockTeamFilterSettings,
  viewerGender?: StockRecommendationViewerGender
): {
  essential: StockRecommendation[];
  important: StockRecommendation[];
  recommended: StockRecommendation[];
} {
  const missing = getMissingCategories(
    userSupplies,
    teamStockSettings,
    viewerGender
  );

  return {
    essential: missing.filter((rec) => rec.priority === "essential"),
    important: missing.filter((rec) => rec.priority === "important"),
    recommended: missing.filter((rec) => rec.priority === "recommended"),
  };
}

/**
 * 全カテゴリの進捗状況を取得（表示中のおすすめ対象カテゴリに合わせる）
 */
export function getProgress(
  userSupplies: Array<{ category: string; quantity: number }>,
  teamStockSettings?: StockTeamFilterSettings,
  viewerGender?: StockRecommendationViewerGender
): {
  totalCategories: number;
  stockedCategories: number;
  missingCategories: number;
  progressPercentage: number;
} {
  const applicable = getApplicableStockRecommendationCategories(
    teamStockSettings,
    viewerGender
  );

  const userCategories = new Set(
    userSupplies.filter((s) => s.quantity > 0).map((s) => s.category)
  );

  const totalCategories = applicable.length;
  const stockedCategories = applicable.filter((category) =>
    userCategories.has(category)
  ).length;
  const missingCategories = totalCategories - stockedCategories;
  const progressPercentage =
    totalCategories > 0
      ? Math.round((stockedCategories / totalCategories) * 100)
      : 0;

  return {
    totalCategories,
    stockedCategories,
    missingCategories,
    progressPercentage,
  };
}

//レベル別の進捗状況を取得（非推奨：getProgressを使用してください）
export function getLevelProgress(
  userSupplies: Array<{ category: string; quantity: number }>,
  stockLevel: StockLevel = "standard"
): {
  level: StockLevel;
  levelConfig: (typeof STOCK_LEVELS)[StockLevel];
  totalCategories: number;
  stockedCategories: number;
  missingCategories: number;
  progressPercentage: number;
  nextLevel?: StockLevel;
} {
  const levelConfig = STOCK_LEVELS[stockLevel];
  const userCategories = new Set(
    userSupplies.filter((s) => s.quantity > 0).map((s) => s.category)
  );

  const totalCategories = levelConfig.categories.length;
  const stockedCategories = levelConfig.categories.filter((category) =>
    userCategories.has(category)
  ).length;
  const missingCategories = totalCategories - stockedCategories;
  const progressPercentage = Math.round(
    (stockedCategories / totalCategories) * 100
  );

  // 次のレベルを決定
  let nextLevel: StockLevel | undefined;
  if (stockLevel === "beginner" && progressPercentage >= 100) {
    nextLevel = "standard";
  } else if (stockLevel === "standard" && progressPercentage >= 100) {
    nextLevel = "advanced";
  }

  return {
    level: stockLevel,
    levelConfig,
    totalCategories,
    stockedCategories,
    missingCategories,
    progressPercentage,
    nextLevel,
  };
}

//カテゴリ別の推奨商品例を取得
export function getRecommendedItems(category: string): string[] {
  const RECOMMENDED_ITEMS: Record<string, string[]> = {
    "米・パン": ["無洗米", "パックご飯", "缶詰パン", "乾パン"],
    麺類: ["パスタ", "そうめん", "うどん", "インスタントラーメン"],
    缶詰: ["ツナ缶", "サバ缶", "焼き鳥缶", "コンビーフ", "豆缶"],
    レトルト食品: ["カレー", "シチュー", "牛丼", "親子丼", "おかゆ"],
    インスタント食品: ["味噌汁", "スープ", "カップ麺"],
    乾物: ["のり", "わかめ", "ひじき", "切り干し大根", "干ししいたけ"],
    調味料: ["塩", "砂糖", "醤油", "味噌", "食用油"],
    飲料: ["水", "野菜ジュース", "スポーツドリンク", "お茶"],
    "野菜・果物": [
      "じゃがいも",
      "玉ねぎ",
      "かぼちゃ",
      "野菜ジュース",
      "果物缶詰",
    ],
    菓子: ["チョコレート", "ビスケット", "飴", "ナッツ"],
    トイレットペーパー: ["トイレットペーパー12ロール"],
    ティッシュペーパー: ["ボックスティッシュ5箱"],
    ウェットティッシュ: ["除菌ウェットティッシュ", "お口拭き"],
    "洗剤・石鹸": ["固形石鹸", "ハンドソープ", "洗濯洗剤"],
    "シャンプー・ボディソープ": [
      "シャンプー",
      "ボディソープ",
      "ドライシャンプー",
    ],
    "歯磨き粉・歯ブラシ": ["歯磨き粉", "歯ブラシ", "マウスウォッシュ"],
    生理用品: ["生理用ナプキン", "タンポン"],
    "おむつ・ベビー用品": ["紙おむつ", "おしりふき", "粉ミルク", "離乳食"],
    "マスク・消毒液": ["不織布マスク", "アルコール消毒液", "除菌シート"],
    医薬品: ["風邪薬", "頭痛薬", "胃腸薬", "絆創膏", "消毒液"],
    "懐中電灯・電池": [
      "LED懐中電灯",
      "乾電池（単1〜単4）",
      "ランタン",
      "モバイルバッテリー",
    ],
    "カセットコンロ・ガスボンベ": ["カセットガス缶・燃料（予備）"],
    "カセットコンロ（本体）": ["カセットコンロ（本体・卓上）"],
    "ラップ・アルミホイル": ["食品用ラップ", "アルミホイル"],
    "ポリ袋・ゴミ袋": ["ポリ袋（大・中・小）", "ゴミ袋45L"],
    ペットフード: ["ドッグフード", "キャットフード", "ペット用水"],
    その他: [],
  };

  return RECOMMENDED_ITEMS[category] || [];
}
