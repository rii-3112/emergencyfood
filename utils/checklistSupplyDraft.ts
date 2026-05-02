import { VALIDATION_RULES } from "@/utils/constants";
import { getExpiryType } from "@/utils/stockRecommendations";

type ChecklistItemDraftDef = {
  category: string;
  unit: string;
  quantity?: number;
  /** checklist の動的文言の代わりに使う品名（重複や曖昧さを避ける） */
  nameOverride?: string;
};

/** チェックリスト項目 ID → 備蓄リスト登録時のデフォルト（省略時は その他系） */
const CHECKLIST_SUPPLY_DRAFT: Record<string, ChecklistItemDraftDef> = {
  "household-stove": {
    category: "カセットコンロ・ガスボンベ",
    unit: "個",
    nameOverride: "カセットコンロ（本体）",
  },
  "household-gas": {
    category: "カセットコンロ・ガスボンベ",
    unit: "本",
    nameOverride: "カセットガス（予備）",
  },
  "household-ignition": {
    category: "その他（期限のないものなど）",
    unit: "個",
    nameOverride: "ライター・マッチ",
  },
  "household-light": {
    category: "懐中電灯・電池",
    unit: "個",
    nameOverride: "懐中電灯・ランタン",
  },
  "household-radio": {
    category: "その他（期限のないものなど）",
    unit: "個",
    nameOverride: "ラジオ（防災用）",
  },
  "household-power": {
    category: "懐中電灯・電池",
    unit: "個",
    nameOverride: "モバイルバッテリー",
  },
  "household-tool": {
    category: "その他（期限のないものなど）",
    unit: "個",
    nameOverride: "マルチツール・缶切り",
  },
  "household-dishware": {
    category: "その他（期限のないものなど）",
    unit: "セット",
    nameOverride: "使い捨て皿・箸・コップ",
  },
  "household-sheet": {
    category: "その他（期限のないものなど）",
    unit: "枚",
    quantity: 2,
    nameOverride: "タオル・レジャーシート",
  },
  "household-wipes": {
    category: "ウェットティッシュ",
    unit: "個",
    nameOverride: "ティッシュ・ウェットティッシュ（共用）",
  },
  "household-bags": {
    category: "ポリ袋・ゴミ袋",
    unit: "袋",
    nameOverride: "ビニール袋・ゴミ袋",
  },
  "household-tape": {
    category: "その他（期限のないものなど）",
    unit: "個",
    nameOverride: "養生テープ・ビニールテープ",
  },
  "household-cash-docs": {
    category: "その他（期限のないものなど）",
    unit: "セット",
    nameOverride: "現金・身分証などの副本セット",
  },
  "adult-water": {
    category: "飲料",
    unit: "L",
    quantity: 6,
  },
  "adult-food": {
    category: "レトルト食品",
    unit: "個",
    quantity: 10,
  },
  "adult-medicine": {
    category: "医薬品",
    unit: "セット",
    nameOverride: "常備薬セット",
  },
  "adult-clothes": {
    category: "その他（期限のないものなど）",
    unit: "枚",
    quantity: 2,
    nameOverride: "着替え（大人）",
  },
  "adult-hygiene": {
    category: "歯磨き粉・歯ブラシ",
    unit: "セット",
    nameOverride: "個人用衛生用品（歯ブラシ等）",
  },
  "child-water": {
    category: "飲料",
    unit: "L",
    quantity: 4,
  },
  "child-food": {
    category: "レトルト食品",
    unit: "個",
    quantity: 8,
    nameOverride: "子供用非常食",
  },
  "child-toy": {
    category: "その他（期限のないものなど）",
    unit: "セット",
    nameOverride: "子供のおもちゃ・絵本",
  },
  "child-clothes": {
    category: "その他（期限のないものなど）",
    unit: "枚",
    quantity: 2,
    nameOverride: "着替え（子供）",
  },
  "child-diaper": {
    category: "おむつ・ベビー用品",
    unit: "パック",
    quantity: 1,
    nameOverride: "おむつ（子供用）",
  },
  "infant-milk": {
    category: "インスタント食品",
    unit: "袋",
    quantity: 2,
    nameOverride: "粉ミルク",
  },
  "infant-water": {
    category: "飲料",
    unit: "L",
    quantity: 2,
    nameOverride: "水（調乳用・乳幼児）",
  },
  "infant-diaper": {
    category: "おむつ・ベビー用品",
    unit: "パック",
    quantity: 2,
    nameOverride: "おむつ（乳幼児）",
  },
  "infant-clothes": {
    category: "その他（期限のないものなど）",
    unit: "枚",
    quantity: 3,
    nameOverride: "ベビー服",
  },
  "infant-toy": {
    category: "おむつ・ベビー用品",
    unit: "セット",
    nameOverride: "ベビー用品類",
  },
  "elderly-water": {
    category: "飲料",
    unit: "L",
    quantity: 6,
  },
  "elderly-food": {
    category: "レトルト食品",
    unit: "個",
    quantity: 5,
    nameOverride: "介護食・やわらかい食品",
  },
  "elderly-medicine": {
    category: "医薬品",
    unit: "セット",
    nameOverride: "薬・医療用品（高齢者）",
  },
  "elderly-glasses": {
    category: "その他（期限のないものなど）",
    unit: "セット",
    nameOverride: "眼鏡・補聴器",
  },
  "elderly-clothes": {
    category: "その他（期限のないものなど）",
    unit: "枚",
    quantity: 2,
    nameOverride: "着替え（高齢者）",
  },
  "dog-food": {
    category: "ペットフード",
    unit: "袋",
    nameOverride: "ドッグフード",
    quantity: 1,
  },
  "dog-water": {
    category: "飲料",
    unit: "L",
    quantity: 2,
    nameOverride: "水（犬用）",
  },
  "dog-medicine": {
    category: "その他（期限のないものなど）",
    unit: "セット",
    nameOverride: "ペット用薬（犬）",
  },
  "dog-leash": {
    category: "その他（期限のないものなど）",
    unit: "セット",
    nameOverride: "リード・首輪（犬）",
  },
  "dog-toy": {
    category: "その他（期限のないものなど）",
    unit: "個",
    nameOverride: "犬用おもちゃ",
  },
  "cat-food": {
    category: "ペットフード",
    unit: "袋",
    nameOverride: "キャットフード",
    quantity: 1,
  },
  "cat-water": {
    category: "飲料",
    unit: "L",
    quantity: 2,
    nameOverride: "水（猫用）",
  },
  "cat-litter": {
    category: "その他（期限のないものなど）",
    unit: "袋",
    quantity: 1,
    nameOverride: "猫砂",
  },
  "cat-carrier": {
    category: "その他（期限のないものなど）",
    unit: "個",
    nameOverride: "ペット用キャリーケース",
  },
  "cat-toy": {
    category: "その他（期限のないものなど）",
    unit: "個",
    nameOverride: "猫用おもちゃ",
  },
};

function clipFoodName(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length <= VALIDATION_RULES.FOOD_NAME_MAX_LENGTH) return trimmed;
  return trimmed.slice(0, VALIDATION_RULES.FOOD_NAME_MAX_LENGTH).trim();
}

/** カテゴリに応じた仮の期限日（一覧で後から修正前提） */
export function defaultExpiryDateForSupplyCategory(category: string): string {
  const et = getExpiryType(category);
  const d = new Date();
  if (et.type === "noExpiry") {
    return "2099-12-31";
  }
  if (et.type === "medical") {
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().split("T")[0];
  }
  if (et.type === "food") {
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  }
  d.setFullYear(d.getFullYear() + 2);
  return d.toISOString().split("T")[0];
}

export interface HandbookSupplyDraft {
  name: string;
  category: string;
  unit: string;
  quantity: number;
  expiryDate: string;
}

export function getSupplyDraftFromHandbookChecklistItem(
  itemId: string,
  displayName: string
): HandbookSupplyDraft {
  const def = CHECKLIST_SUPPLY_DRAFT[itemId];
  const category = def?.category ?? "その他（期限のないものなど）";
  const unit = def?.unit ?? "個";
  const quantity = def?.quantity ?? 1;
  const name = clipFoodName(def?.nameOverride ?? displayName);
  return {
    name,
    category,
    unit,
    quantity,
    expiryDate: defaultExpiryDateForSupplyCategory(category),
  };
}
