// utils/supplyHistoryHelpers.ts
import type { Review, Supply, SupplyHistory } from "@/types";

export async function convertSupplyToHistory(
  supply: Supply,
  archivedBy: string,
  reviews: Review[] = []
): Promise<SupplyHistory> {
  const purchaseLocations: string[] = [];
  if (supply.purchaseLocation && supply.purchaseLocation.trim() !== "") {
    purchaseLocations.push(supply.purchaseLocation.trim());
  }

  const totalConsumed = supply.consumptionCount || 0;

  const averageStock = supply.quantity || 0;

  const lastUsedDate =
    supply.lastConsumedDate ||
    new Date(supply.registeredAt.seconds * 1000).toISOString();

  const firstRegisteredDate = new Date(
    supply.registeredAt.seconds * 1000
  ).toISOString();

  const hasReviews = reviews.length > 0;
  const reviewCount = reviews.length;

  return {
    id: supply.id,
    name: supply.name,
    category: supply.category,
    unit: supply.unit,
    totalConsumed,
    averageStock,
    purchaseLocations,
    lastUsedDate,
    firstRegisteredDate,
    hasReviews,
    reviewCount,
    archivedAt: new Date().toISOString(),
    teamId: supply.teamId,
    archivedBy,
  };
}

export function createSupplyFromHistory(
  history: SupplyHistory
): Partial<Supply> {
  return {
    name: history.name,
    category: history.category,
    unit: history.unit,
    quantity: 0,
    expiryDate: "",
    purchaseLocation:
      history.purchaseLocations.length > 0
        ? history.purchaseLocations[0]
        : null,
    isArchived: false,
  };
}

export function mergeSupplyHistory(
  existingHistory: SupplyHistory,
  newSupply: Supply,
  reviews: Review[] = []
): SupplyHistory {
  const purchaseLocations = [...existingHistory.purchaseLocations];
  if (
    newSupply.purchaseLocation &&
    newSupply.purchaseLocation.trim() !== "" &&
    !purchaseLocations.includes(newSupply.purchaseLocation.trim())
  ) {
    purchaseLocations.push(newSupply.purchaseLocation.trim());
  }

  const totalConsumed =
    existingHistory.totalConsumed + (newSupply.consumptionCount || 0);

  const averageStock = Math.round(
    (existingHistory.averageStock + (newSupply.quantity || 0)) / 2
  );

  const lastUsedDate =
    newSupply.lastConsumedDate ||
    existingHistory.lastUsedDate ||
    new Date().toISOString();

  const reviewCount = existingHistory.reviewCount + reviews.length;
  const hasReviews = reviewCount > 0;

  return {
    ...existingHistory,
    totalConsumed,
    averageStock,
    purchaseLocations,
    lastUsedDate,
    hasReviews,
    reviewCount,
    archivedAt: new Date().toISOString(),
  };
}

export type HistorySortOption =
  | "archivedAt"
  | "name"
  | "category"
  | "totalConsumed"
  | "reviewCount";

export function sortSupplyHistory(
  histories: SupplyHistory[],
  sortBy: HistorySortOption = "archivedAt",
  order: "asc" | "desc" = "desc"
): SupplyHistory[] {
  const sorted = [...histories].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "archivedAt":
        comparison =
          new Date(a.archivedAt).getTime() - new Date(b.archivedAt).getTime();
        break;
      case "name":
        comparison = a.name.localeCompare(b.name, "ja");
        break;
      case "category":
        comparison = a.category.localeCompare(b.category, "ja");
        break;
      case "totalConsumed":
        comparison = a.totalConsumed - b.totalConsumed;
        break;
      case "reviewCount":
        comparison = a.reviewCount - b.reviewCount;
        break;
      default:
        comparison = 0;
    }

    return order === "asc" ? comparison : -comparison;
  });

  return sorted;
}
