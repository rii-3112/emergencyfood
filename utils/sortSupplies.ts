import type { SortOption, SortOrder } from "@/components/supplies/SupplySort";
import type { Supply } from "@/types";
import { getNearestExpiryDate } from "./supplyHelpers";

export const sortSupplies = (
  supplies: Supply[],
  sortBy: SortOption,
  order: SortOrder
): Supply[] => {
  const sortedSupplies = [...supplies];

  sortedSupplies.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name, "ja");
        break;
      case "expiryDate":
        const dateA = getNearestExpiryDate(a);
        const dateB = getNearestExpiryDate(b);
        comparison = new Date(dateA).getTime() - new Date(dateB).getTime();
        break;
      case "registeredAt":
        comparison = a.registeredAt.seconds - b.registeredAt.seconds;
        break;
      case "category":
        comparison = a.category.localeCompare(b.category, "ja");
        break;
      case "reviewCount":
        comparison = (a.reviewCount || 0) - (b.reviewCount || 0);
        break;
      default:
        comparison = 0;
    }

    return order === "asc" ? comparison : -comparison;
  });

  return sortedSupplies;
};
