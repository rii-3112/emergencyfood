import type { Supply, SupplyHistory, Team } from "@/types";
import type { DisasterBoardData } from "@/types/forms";
import {
  findDisasterBoardByTeamId,
  findHandbookChecklistByTeamId,
} from "@/lib/repositories/handbook";
import {
  findSupplyById,
  listSuppliesByTeam,
  listSupplyHistoryByTeam,
} from "@/lib/repositories/supply";
import { buildTeamForApi } from "@/lib/services/team";
import { toApiSupply } from "@/lib/services/supply";

export async function fetchSuppliesFromDB(
  teamId: string,
  isArchived: boolean = false
): Promise<Supply[]> {
  try {
    const rows = await listSuppliesByTeam(teamId, isArchived);
    return rows.map(toApiSupply);
  } catch (error) {
    console.error("Error fetching supplies:", error);
    return [];
  }
}

export async function fetchTeamFromDB(teamId: string): Promise<Team | null> {
  try {
    return await buildTeamForApi(teamId);
  } catch (error) {
    console.error("Error fetching team:", error);
    return null;
  }
}

export async function fetchSupplyByIdFromDB(
  teamId: string,
  supplyId: string
): Promise<Supply | null> {
  try {
    const record = await findSupplyById(supplyId);
    if (!record || record.teamId !== teamId) {
      return null;
    }
    return toApiSupply(record);
  } catch (error) {
    console.error("Error fetching supply by ID:", error);
    return null;
  }
}

export async function fetchDisasterBoardFromDB(
  teamId: string
): Promise<DisasterBoardData | null> {
  try {
    return await findDisasterBoardByTeamId(teamId);
  } catch (error) {
    console.error("Error fetching disaster board:", error);
    return null;
  }
}

export async function fetchHistoriesFromDB(
  teamId: string
): Promise<SupplyHistory[]> {
  try {
    const rows = await listSupplyHistoryByTeam(teamId);
    return rows.map((h) => ({
      id: h.id,
      name: h.name,
      category: h.category,
      unit: h.unit,
      totalConsumed: h.totalConsumed,
      averageStock: h.averageStock,
      purchaseLocations: h.purchaseLocations,
      lastUsedDate: h.lastUsedDate ?? "",
      firstRegisteredDate: h.firstRegisteredDate ?? "",
      hasReviews: h.hasReviews,
      reviewCount: h.reviewCount,
      archivedAt: h.archivedAt.toISOString(),
      teamId: h.teamId,
      archivedBy: h.archivedBy,
    }));
  } catch (error) {
    console.error("Error fetching histories:", error);
    return [];
  }
}

export async function fetchHandbookChecklistFromDB(teamId: string): Promise<{
  checkedItemIds: string[];
  checkedPetItems: { [petType: string]: string[] };
} | null> {
  try {
    const record = await findHandbookChecklistByTeamId(teamId);
    if (!record) return null;

    return {
      checkedItemIds: record.checkedItemIds,
      checkedPetItems: record.checkedPetItems,
    };
  } catch (error) {
    console.error("Error fetching handbook checklist:", error);
    return null;
  }
}
