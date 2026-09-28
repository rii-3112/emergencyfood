import type { HouseholdComposition, TeamStockSettings } from "@/types";

/**
 * Turso の stockSettings を年齢別の人数へ正規化する。
 * 詳細フラグ省略時は詳細ありとして扱い、内訳が空なら householdSize を大人に読み替える。
 */
export function resolveCompositionFromStockSettings(
  stock: TeamStockSettings | undefined | null
): HouseholdComposition {
  if (!stock) {
    return {
      adult: 1,
      child: 0,
      infant: 0,
      elderly: 0,
    };
  }

  if (stock.useDetailedComposition === false) {
    const hs = Math.max(1, stock.householdSize ?? 1);
    return {
      adult: hs,
      child: 0,
      infant: 0,
      elderly: 0,
    };
  }

  const comp = stock.composition;
  if (comp) {
    const adult = comp.adult ?? 0;
    const child = comp.child ?? 0;
    const infant = comp.infant ?? 0;
    const elderly = comp.elderly ?? 0;
    if (adult + child + infant + elderly > 0) {
      return {
        adult,
        child,
        infant,
        elderly,
      };
    }
  }

  const hs = Math.max(1, stock.householdSize ?? 1);
  return {
    adult: hs,
    child: 0,
    infant: 0,
    elderly: 0,
  };
}

export function compositionTotal(comp: HouseholdComposition): number {
  return comp.adult + comp.child + comp.infant + comp.elderly;
}

/** 省略時は true（詳細な家族構成を標準）。明示的な false のみ簡易扱い。 */
export function effectiveDetailedCompositionFlag(
  stock: TeamStockSettings | undefined | null
): boolean {
  if (!stock) return true;
  return stock.useDetailedComposition !== false;
}
