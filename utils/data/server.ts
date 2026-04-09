import type { Supply, SupplyHistory, Team } from "@/types";
import type { DisasterBoardData } from "@/types/forms";
import { adminDb } from "@/utils/firebase/admin";

/**
 * FirestoreのTimestampをDateに変換するヘルパー関数
 */
function convertTimestampsToDates(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
    return new Date(obj._seconds * 1000 + obj._nanoseconds / 1000000);
  }

  if (Array.isArray(obj)) {
    return obj.map(convertTimestampsToDates);
  }

  if (typeof obj === "object") {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertTimestampsToDates(value);
    }
    return converted;
  }

  return obj;
}

/**
 * サーバーサイドで備蓄品データを取得
 */
export async function fetchSuppliesFromDB(
  teamId: string,
  isArchived: boolean = false
): Promise<Supply[]> {
  try {
    const suppliesSnapshot = await adminDb
      .collection("supplies")
      .where("teamId", "==", teamId)
      .where("isArchived", "==", isArchived)
      .get();

    const supplies: Supply[] = suppliesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return convertTimestampsToDates({
        id: doc.id,
        ...data,
      });
    }) as Supply[];

    const suppliesWithReviews = await Promise.all(
      supplies.map(async (supply) => {
        const reviewsSnapshot = await adminDb
          .collection("supplyReviews")
          .where("supplyId", "==", supply.id)
          .where("teamId", "==", teamId)
          .get();

        return {
          ...supply,
          reviewCount: reviewsSnapshot.size,
        };
      })
    );

    return suppliesWithReviews;
  } catch (error) {
    console.error("Error fetching supplies:", error);
    return [];
  }
}

/**
 * サーバーサイドでチーム情報を取得
 */
export async function fetchTeamFromDB(teamId: string): Promise<Team | null> {
  try {
    const teamDoc = await adminDb.collection("teams").doc(teamId).get();

    if (!teamDoc.exists) {
      return null;
    }

    const data = teamDoc.data();
    return convertTimestampsToDates({
      id: teamDoc.id,
      ...data,
    }) as Team;
  } catch (error) {
    console.error("Error fetching team:", error);
    return null;
  }
}

/**
 * サーバーサイドで特定の備蓄品データを取得
 */
export async function fetchSupplyByIdFromDB(
  teamId: string,
  supplyId: string
): Promise<Supply | null> {
  try {
    const supplyDoc = await adminDb.collection("supplies").doc(supplyId).get();

    if (!supplyDoc.exists) {
      return null;
    }

    const data = supplyDoc.data();

    if (data?.teamId !== teamId) {
      return null;
    }

    return convertTimestampsToDates({
      id: supplyDoc.id,
      ...data,
    }) as Supply;
  } catch (error) {
    console.error("Error fetching supply by ID:", error);
    return null;
  }
}

/**
 * サーバーサイドで災害用伝言板データを取得
 */
export async function fetchDisasterBoardFromDB(
  teamId: string
): Promise<DisasterBoardData | null> {
  try {
    const disasterBoardDoc = await adminDb
      .collection("disaster-boards")
      .doc(teamId)
      .get();

    if (!disasterBoardDoc.exists) {
      return null;
    }

    const rawData = disasterBoardDoc.data();

    const data: DisasterBoardData = {
      ...rawData,
      lastUpdated: rawData?.lastUpdated?.toDate
        ? rawData.lastUpdated.toDate()
        : rawData?.lastUpdated,
      lastUpdatedBy: rawData?.lastUpdatedBy || undefined,
    } as DisasterBoardData;

    return convertTimestampsToDates(data);
  } catch (error) {
    console.error("Error fetching disaster board:", error);
    return null;
  }
}

/**
 * サーバーサイドで備蓄履歴データを取得
 */
export async function fetchHistoriesFromDB(
  teamId: string
): Promise<SupplyHistory[]> {
  try {
    const historySnapshot = await adminDb
      .collection("supply_history")
      .where("teamId", "==", teamId)
      .get();

    const histories = historySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a: any, b: any) => {
        const dateA = new Date(a.archivedAt || 0).getTime();
        const dateB = new Date(b.archivedAt || 0).getTime();
        return dateB - dateA;
      });

    return convertTimestampsToDates(histories) as SupplyHistory[];
  } catch (error) {
    console.error("Error fetching histories:", error);
    return [];
  }
}

/**
 * サーバーサイドでハンドブックチェックリストデータを取得
 */
export async function fetchHandbookChecklistFromDB(teamId: string): Promise<{
  checkedItemIds: string[];
  checkedPetItems: { [petType: string]: string[] };
} | null> {
  try {
    const checklistDoc = await adminDb
      .collection("handbook-checklists")
      .doc(teamId)
      .get();

    if (!checklistDoc.exists) {
      return null;
    }

    const rawData = checklistDoc.data();

    // 新しい形式があればそのまま返す
    if (rawData?.checkedItemIds) {
      return convertTimestampsToDates({
        checkedItemIds: rawData.checkedItemIds || [],
        checkedPetItems: rawData.checkedPetItems || {},
      });
    }

    // 後方互換性: 古い形式（ageGroups）があれば変換
    if (rawData?.ageGroups) {
      const checkedItemIds = new Set<string>();
      rawData.ageGroups.forEach((group: any) => {
        group.checkedItems?.forEach((itemId: string) => {
          checkedItemIds.add(itemId);
        });
      });

      const checkedPetItems: { [key: string]: string[] } = {};
      rawData.pets?.forEach((pet: any) => {
        if (pet.checkedItems && pet.checkedItems.length > 0) {
          checkedPetItems[pet.petType] = pet.checkedItems;
        }
      });

      return convertTimestampsToDates({
        checkedItemIds: Array.from(checkedItemIds),
        checkedPetItems,
      });
    }

    return convertTimestampsToDates({
      checkedItemIds: [],
      checkedPetItems: {},
    });
  } catch (error) {
    console.error("Error fetching handbook checklist:", error);
    return null;
  }
}
