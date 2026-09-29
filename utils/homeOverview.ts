import type { Supply, TeamStockSettings } from "@/types";
import type { DisasterBoardData } from "@/types/forms";
import {
  aggregateStockStatus,
  calculateStockStatus,
} from "@/utils/stockCalculator";
import { getExpiryType } from "@/utils/stockRecommendations";
import {
  getNearestExpiryDate,
  migrateSupplyToExpiryDates,
} from "@/utils/supplyHelpers";
import {
  effectiveDetailedCompositionFlag,
  resolveCompositionFromStockSettings,
} from "@/utils/teamStockComposition";

/** SuppliesChecklist の項目 id と揃える。表示名は人数で変わるが id は固定。 */
const HOUSEHOLD_ITEM_IDS = [
  "household-stove",
  "household-gas",
  "household-ignition",
  "household-light",
  "household-radio",
  "household-power",
  "household-tool",
  "household-dishware",
  "household-sheet",
  "household-wipes",
  "household-bags",
  "household-tape",
  "household-cash-docs",
];

const ADULT_ITEM_IDS = [
  "adult-water",
  "adult-food",
  "adult-medicine",
  "adult-clothes",
  "adult-hygiene",
];

const CHILD_ITEM_IDS = [
  "child-water",
  "child-food",
  "child-toy",
  "child-clothes",
  "child-diaper",
];

const INFANT_ITEM_IDS = [
  "infant-milk",
  "infant-water",
  "infant-diaper",
  "infant-clothes",
  "infant-toy",
];

const ELDERLY_ITEM_IDS = [
  "elderly-water",
  "elderly-food",
  "elderly-medicine",
  "elderly-glasses",
  "elderly-clothes",
];

const DOG_ITEM_IDS = [
  "dog-food",
  "dog-water",
  "dog-medicine",
  "dog-leash",
  "dog-toy",
];

const CAT_ITEM_IDS = [
  "cat-food",
  "cat-water",
  "cat-litter",
  "cat-carrier",
  "cat-toy",
];

export interface HomeSupplySummary {
  total: number;
  out: number;
  short: number;
  nearExpiry: number;
  expired: number;
  overallPercentage: number;
}

export interface HomeChecklistSummary {
  checked: number;
  total: number;
}

export interface HomePlanSummary {
  evacuationSites: number;
  evacuationRoutes: number;
  safetyMethods: number;
  familyAgreements: number;
}

export interface SavedChecklist {
  checkedItemIds: string[];
  checkedPetItems: { [petType: string]: string[] };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export type SupplyFocus = "out" | "short" | "near" | "expired";

export function parseSupplyFocus(
  value: string | undefined
): SupplyFocus | null {
  if (
    value === "out" ||
    value === "short" ||
    value === "near" ||
    value === "expired"
  ) {
    return value;
  }
  return null;
}

function expiryTiming(supply: Supply, now: Date): "expired" | "near" | "none" {
  if (supply.isArchived || supply.quantity <= 0) return "none";

  const expiryType = getExpiryType(supply.category);
  if (expiryType.type === "noExpiry" || expiryType.notificationDays <= 0) {
    return "none";
  }

  const nearest = getNearestExpiryDate(migrateSupplyToExpiryDates(supply));
  if (!nearest) return "none";

  const expiryDate = new Date(nearest);
  if (Number.isNaN(expiryDate.getTime())) return "none";

  const notifyUntil = new Date(
    now.getTime() + expiryType.notificationDays * DAY_MS
  );
  if (expiryDate < now) return "expired";
  if (expiryDate < notifyUntil) return "near";
  return "none";
}

export function supplyMatchesFocus(
  supply: Supply,
  focus: SupplyFocus,
  settings?: TeamStockSettings | null,
  now: Date = new Date()
): boolean {
  if (supply.isArchived) return false;

  if (focus === "near" || focus === "expired") {
    return expiryTiming(supply, now) === focus;
  }

  const status = calculateStockStatus(supply, settings).status;
  if (focus === "out") return status === "out";
  return (
    status === "critical" || status === "low" || status === "below-recommended"
  );
}

export function summarizeSupplies(
  supplies: Supply[],
  settings?: TeamStockSettings | null,
  viewerGender?: string | null,
  now: Date = new Date()
): HomeSupplySummary {
  const active = supplies.filter((supply) => !supply.isArchived);
  const aggregated = aggregateStockStatus(active, settings, viewerGender);

  let nearExpiry = 0;
  let expired = 0;

  for (const supply of active) {
    const timing = expiryTiming(supply, now);
    if (timing === "expired") expired += 1;
    if (timing === "near") nearExpiry += 1;
  }

  return {
    total: aggregated.total,
    out: aggregated.out,
    short: aggregated.critical + aggregated.low + aggregated.belowRecommended,
    nearExpiry,
    expired,
    overallPercentage: aggregated.overallPercentage,
  };
}

export function summarizeChecklist(
  stock: TeamStockSettings | null | undefined,
  saved: SavedChecklist | null
): HomeChecklistSummary {
  const useDetailed = effectiveDetailedCompositionFlag(stock);
  const composition = resolveCompositionFromStockSettings(stock);
  const groups: string[][] = [];

  if (!useDetailed) {
    groups.push(ADULT_ITEM_IDS);
  } else {
    if (composition.adult > 0) groups.push(ADULT_ITEM_IDS);
    if (composition.child > 0) groups.push(CHILD_ITEM_IDS);
    if (composition.infant > 0) groups.push(INFANT_ITEM_IDS);
    if (composition.elderly > 0) groups.push(ELDERLY_ITEM_IDS);
  }

  const itemIds = new Set<string>();
  if (groups.length > 0) {
    for (const id of HOUSEHOLD_ITEM_IDS) itemIds.add(id);
    for (const group of groups) {
      for (const id of group) itemIds.add(id);
    }
  }

  const checkedIds = new Set(saved?.checkedItemIds ?? []);
  let checked = [...itemIds].filter((id) => checkedIds.has(id)).length;
  let total = itemIds.size;

  if (stock?.hasPets) {
    const pets: Array<[string, string[]]> = [];
    if ((stock.dogCount ?? 0) > 0) pets.push(["dog", DOG_ITEM_IDS]);
    if ((stock.catCount ?? 0) > 0) pets.push(["cat", CAT_ITEM_IDS]);

    for (const [petType, ids] of pets) {
      total += ids.length;
      const petChecked = new Set(saved?.checkedPetItems?.[petType] ?? []);
      checked += ids.filter((id) => petChecked.has(id)).length;
    }
  }

  return { checked, total };
}

export function isFamilyPrepared(
  supplies: HomeSupplySummary,
  plans: HomePlanSummary
): boolean {
  return (
    supplies.total > 0 &&
    supplies.out === 0 &&
    supplies.short === 0 &&
    supplies.nearExpiry === 0 &&
    supplies.expired === 0 &&
    plans.evacuationSites > 0 &&
    plans.evacuationRoutes > 0 &&
    plans.safetyMethods > 0 &&
    plans.familyAgreements > 0
  );
}

export function summarizePlans(
  data: DisasterBoardData | null
): HomePlanSummary {
  return {
    evacuationSites: data?.evacuationSites?.length ?? 0,
    evacuationRoutes: data?.evacuationRoutes?.length ?? 0,
    safetyMethods: data?.safetyMethods?.length ?? 0,
    familyAgreements: data?.familyAgreements?.length ?? 0,
  };
}
