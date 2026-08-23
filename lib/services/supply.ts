import { randomUUID } from "crypto";

import {
  deleteReview,
  deleteReviewsBySupply,
  deleteSupply,
  findReviewById,
  findSupplyById,
  findSupplyHistoryById,
  insertReview,
  insertSupply,
  listReviewsBySupply,
  listSuppliesByTeam,
  listSupplyHistoryByTeam,
  updateSupply,
  upsertSupplyHistory,
  type SupplyHistoryRecord,
  type SupplyRecord,
} from "@/lib/repositories/supply";
import { isTeamMember, type TeamDb } from "@/lib/repositories/team";
import { ensureTursoTeamMembership } from "@/lib/services/team";
import { TeamServiceError } from "@/lib/services/team-errors";
import type { ExpiryInfo, Supply, SupplyHistory } from "@/types";
import { adminDb } from "@/utils/firebase/admin";

export type { SupplyRecord };

async function assertTeamMember(
  teamId: string,
  uid: string,
  database?: TeamDb
): Promise<void> {
  const inTurso = await isTeamMember(teamId, uid, database);
  if (inTurso) return;

  const teamDoc = await adminDb.collection("teams").doc(teamId).get();
  const members = (teamDoc.data()?.members as string[] | undefined) ?? [];
  const inFirestore = members.includes(uid);
  if (!inFirestore) {
    throw new TeamServiceError("You are not a member of this team", 403);
  }

  // Firestore-only teams must be synced before Turso FK writes
  await ensureTursoTeamMembership(teamId, uid, database);
}

function ensureLots(record: SupplyRecord): ExpiryInfo[] {
  if (record.expiryDates && record.expiryDates.length > 0) {
    return record.expiryDates.map((lot) => ({ ...lot }));
  }
  return [
    {
      date: record.expiryDate || new Date().toISOString().slice(0, 10),
      quantity: record.quantity || 0,
      addedAt: record.registeredAt.toISOString(),
    },
  ];
}

function nearestExpiry(lots: ExpiryInfo[], fallback: string): string {
  if (lots.length === 0) return fallback;
  return [...lots].map((lot) => lot.date).sort()[0];
}

function toFirestoreTimestamp(date: Date) {
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1_000_000,
  };
}

/** FIFO: consume from oldest expiry lot first */
export function consumeFromOldestLots(
  lots: ExpiryInfo[],
  quantity: number
): {
  updatedLots: ExpiryInfo[];
  consumedFrom: Array<{ date: string; quantity: number }>;
  remainingToConsume: number;
} {
  const sorted = [...lots]
    .map((lot) => ({ ...lot }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let remaining = quantity;
  const consumedFrom: Array<{ date: string; quantity: number }> = [];

  for (const lot of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(lot.quantity, remaining);
    if (take <= 0) continue;
    consumedFrom.push({ date: lot.date, quantity: take });
    lot.quantity -= take;
    remaining -= take;
  }

  return {
    updatedLots: sorted.filter((lot) => lot.quantity > 0),
    consumedFrom,
    remainingToConsume: remaining,
  };
}

export function toApiSupply(record: SupplyRecord): Supply {
  return {
    id: record.id,
    name: record.name,
    quantity: record.quantity,
    expiryDate: record.expiryDate,
    expiryDates: record.expiryDates ?? undefined,
    isArchived: record.isArchived,
    category: record.category,
    unit: record.unit,
    amount: record.amount,
    purchaseLocation: record.purchaseLocation,
    label: record.label,
    storageLocation: record.storageLocation,
    registeredAt: toFirestoreTimestamp(record.registeredAt),
    teamId: record.teamId,
    uid: record.uid,
    lastConsumedDate: record.lastConsumedDate ?? undefined,
    consumptionCount: record.consumptionCount,
    zeroStockSince: record.zeroStockSince,
    reviewCount: record.reviewCount,
  };
}

function toApiHistory(record: SupplyHistoryRecord): SupplyHistory {
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    unit: record.unit,
    totalConsumed: record.totalConsumed,
    averageStock: record.averageStock,
    purchaseLocations: record.purchaseLocations,
    lastUsedDate: record.lastUsedDate ?? "",
    firstRegisteredDate: record.firstRegisteredDate ?? "",
    hasReviews: record.hasReviews,
    reviewCount: record.reviewCount,
    archivedAt: record.archivedAt.toISOString(),
    teamId: record.teamId,
    archivedBy: record.archivedBy,
  };
}

export async function createSupply(
  input: {
    uid: string;
    teamId: string;
    name: string;
    quantity: number;
    expiryDate: string;
    category: string;
    unit: string;
    amount?: number | null;
    purchaseLocation?: string | null;
    label?: string | null;
    storageLocation?: string | null;
  },
  database?: TeamDb
) {
  const { uid, teamId, name, quantity, expiryDate, category, unit } = input;

  if (!name || !quantity || !expiryDate || !category || !unit || !teamId) {
    throw new TeamServiceError("必須フィールドが不足しています", 400);
  }

  await assertTeamMember(teamId, uid, database);

  const qty = Number(quantity) || 1;
  const registeredAt = new Date();
  const expiryDates: ExpiryInfo[] = [
    {
      date: expiryDate,
      quantity: qty,
      addedAt: registeredAt.toISOString(),
    },
  ];

  const created = await insertSupply(
    {
      teamId,
      uid,
      name,
      quantity: qty,
      expiryDate,
      expiryDates,
      category,
      unit,
      amount: input.amount !== undefined ? Number(input.amount) : null,
      purchaseLocation: input.purchaseLocation ?? null,
      label: input.label ?? null,
      storageLocation: input.storageLocation ?? "未設定",
      registeredAt,
    },
    database
  );

  return {
    success: true,
    supplyId: created.id,
    message: "備蓄品を追加しました",
  };
}

export async function listSupplies(
  uid: string,
  teamId: string,
  isArchived: boolean,
  database?: TeamDb
) {
  if (!teamId) {
    throw new TeamServiceError("チームIDが必要です", 400);
  }

  await assertTeamMember(teamId, uid, database);
  const rows = await listSuppliesByTeam(teamId, isArchived, database);
  return {
    success: true,
    supplies: rows.map(toApiSupply),
  };
}

export async function consumeSupply(
  input: { uid: string; supplyId: string; quantity?: number },
  database?: TeamDb
) {
  if (!input.supplyId) {
    throw new TeamServiceError("Supply ID is required", 400);
  }

  const quantity = input.quantity ?? 1;
  const supply = await findSupplyById(input.supplyId, database);
  if (!supply) {
    throw new TeamServiceError("Supply not found", 404);
  }

  await assertTeamMember(supply.teamId, input.uid, database);

  const lots = ensureLots(supply);
  const { updatedLots, consumedFrom } = consumeFromOldestLots(lots, quantity);
  const newTotal = updatedLots.reduce((sum, lot) => sum + lot.quantity, 0);

  let zeroStockSince = supply.zeroStockSince;
  if (newTotal === 0 && !zeroStockSince) {
    zeroStockSince = new Date().toISOString();
  }
  if (newTotal > 0) {
    zeroStockSince = null;
  }

  await updateSupply(
    supply.id,
    {
      quantity: newTotal,
      expiryDates: updatedLots,
      expiryDate: nearestExpiry(updatedLots, supply.expiryDate),
      lastConsumedDate: new Date().toISOString(),
      consumptionCount: supply.consumptionCount + quantity,
      zeroStockSince,
    },
    database
  );

  return {
    message: "Supply consumed successfully",
    consumed: { quantity, from: consumedFrom },
    remaining: newTotal,
  };
}

export async function restockSupply(
  input: {
    uid: string;
    supplyId: string;
    quantity: number;
    expiryDate: string;
    purchasePrice?: number;
  },
  database?: TeamDb
) {
  if (!input.supplyId || !input.quantity || !input.expiryDate) {
    throw new TeamServiceError(
      "Supply ID, quantity, and expiry date are required",
      400
    );
  }
  if (input.quantity <= 0) {
    throw new TeamServiceError("Quantity must be greater than 0", 400);
  }

  const supply = await findSupplyById(input.supplyId, database);
  if (!supply) {
    throw new TeamServiceError("Supply not found", 404);
  }
  await assertTeamMember(supply.teamId, input.uid, database);

  const lots =
    supply.expiryDates && supply.expiryDates.length > 0
      ? supply.expiryDates.map((lot) => ({ ...lot }))
      : supply.quantity > 0
        ? ensureLots(supply)
        : [];

  const existing = lots.find((lot) => lot.date === input.expiryDate);
  if (existing) {
    existing.quantity += input.quantity;
    if (input.purchasePrice !== undefined && input.purchasePrice !== null) {
      existing.purchasePrice = input.purchasePrice;
    }
  } else {
    const newLot: ExpiryInfo = {
      date: input.expiryDate,
      quantity: input.quantity,
      addedAt: new Date().toISOString(),
    };
    if (input.purchasePrice !== undefined && input.purchasePrice !== null) {
      newLot.purchasePrice = input.purchasePrice;
    }
    lots.push(newLot);
  }

  const newTotal = lots.reduce((sum, lot) => sum + lot.quantity, 0);
  await updateSupply(
    supply.id,
    {
      quantity: newTotal,
      expiryDates: lots,
      expiryDate: nearestExpiry(lots, input.expiryDate),
      zeroStockSince: null,
    },
    database
  );

  return {
    message: "Supply restocked successfully",
    added: {
      quantity: input.quantity,
      expiryDate: input.expiryDate,
    },
    totalQuantity: newTotal,
  };
}

export async function updateSupplyFields(
  input: {
    uid: string;
    supplyId: string;
    updates: Record<string, unknown>;
  },
  database?: TeamDb
) {
  if (!input.supplyId || !input.updates || typeof input.updates !== "object") {
    throw new TeamServiceError("Supply ID and update data are required", 400);
  }

  const supply = await findSupplyById(input.supplyId, database);
  if (!supply) {
    throw new TeamServiceError("Supply item not found", 404);
  }
  await assertTeamMember(supply.teamId, input.uid, database);

  const allowed: Parameters<typeof updateSupply>[1] = {};
  const u = input.updates;
  if (typeof u.name === "string") allowed.name = u.name;
  if (typeof u.category === "string") allowed.category = u.category;
  if (typeof u.unit === "string") allowed.unit = u.unit;
  if (typeof u.expiryDate === "string") allowed.expiryDate = u.expiryDate;
  if (typeof u.quantity === "number") allowed.quantity = u.quantity;
  if (u.amount !== undefined) allowed.amount = u.amount as number | null;
  if (u.purchaseLocation !== undefined) {
    allowed.purchaseLocation = u.purchaseLocation as string | null;
  }
  if (u.label !== undefined) allowed.label = u.label as string | null;
  if (u.storageLocation !== undefined) {
    allowed.storageLocation = u.storageLocation as string | null;
  }
  if (u.expiryDates !== undefined) {
    allowed.expiryDates = u.expiryDates as ExpiryInfo[] | null;
  }

  await updateSupply(supply.id, allowed, database);
  return {
    message: `Supply item ${input.supplyId} updated successfully.`,
  };
}

export async function archiveSupply(
  input: { uid: string; supplyId: string },
  database?: TeamDb
) {
  if (!input.supplyId) {
    throw new TeamServiceError("Supply ID is required", 400);
  }

  const supply = await findSupplyById(input.supplyId, database);
  if (!supply) {
    throw new TeamServiceError("Supply not found", 404);
  }
  await assertTeamMember(supply.teamId, input.uid, database);
  await updateSupply(supply.id, { isArchived: true }, database);
  return {
    message: `Supply item ${input.supplyId} archived successfully.`,
  };
}

export async function restoreSupply(
  input: { uid: string; supplyId: string },
  database?: TeamDb
) {
  if (!input.supplyId) {
    throw new TeamServiceError("Supply ID is required", 400);
  }

  const supply = await findSupplyById(input.supplyId, database);
  if (!supply) {
    throw new TeamServiceError("Supply item not found", 404);
  }
  await assertTeamMember(supply.teamId, input.uid, database);
  await updateSupply(supply.id, { isArchived: false }, database);
  return {
    message: `Supply item ${input.supplyId} restored successfully.`,
  };
}

export async function removeSupply(
  input: { uid: string; supplyId: string },
  database?: TeamDb
) {
  if (!input.supplyId) {
    throw new TeamServiceError("備蓄品IDが必要です", 400);
  }

  const supply = await findSupplyById(input.supplyId, database);
  if (!supply) {
    throw new TeamServiceError("備蓄品が見つかりません", 404);
  }
  await assertTeamMember(supply.teamId, input.uid, database);
  await deleteReviewsBySupply(supply.id, database);
  await deleteSupply(supply.id, database);
  return {
    success: true,
    message: "備蓄品を削除しました",
  };
}

export async function archiveSupplyToHistory(
  input: { uid: string; supplyId: string },
  database?: TeamDb
) {
  if (!input.supplyId) {
    throw new TeamServiceError("Supply ID is required", 400);
  }

  const supply = await findSupplyById(input.supplyId, database);
  if (!supply) {
    throw new TeamServiceError("Supply not found", 404);
  }
  await assertTeamMember(supply.teamId, input.uid, database);

  const reviews = await listReviewsBySupply(supply.id, supply.teamId, database);

  const history = await upsertSupplyHistory(
    {
      teamId: supply.teamId,
      name: supply.name,
      category: supply.category,
      unit: supply.unit,
      totalConsumed: supply.consumptionCount || 0,
      averageStock: supply.quantity,
      purchaseLocations: supply.purchaseLocation
        ? [supply.purchaseLocation]
        : [],
      lastUsedDate:
        supply.lastConsumedDate || supply.registeredAt.toISOString(),
      firstRegisteredDate: supply.registeredAt.toISOString(),
      hasReviews: reviews.length > 0,
      reviewCount: reviews.length,
      archivedBy: input.uid,
    },
    database
  );

  await updateSupply(supply.id, { isArchived: true }, database);

  return {
    message: "Supply archived to history successfully",
    history: toApiHistory(history),
  };
}

export async function restoreSupplyFromHistory(
  input: {
    uid: string;
    historyId: string;
    quantity: number;
    expiryDate: string;
    unit?: string;
    purchaseLocation?: string;
    amount?: number;
    label?: string;
    storageLocation?: string;
  },
  database?: TeamDb
) {
  if (!input.historyId || !input.quantity || !input.expiryDate) {
    throw new TeamServiceError(
      "History ID, quantity, and expiry date are required",
      400
    );
  }

  const history = await findSupplyHistoryById(input.historyId, database);
  if (!history) {
    throw new TeamServiceError("History not found", 404);
  }
  await assertTeamMember(history.teamId, input.uid, database);

  const registeredAt = new Date();
  const qty = Number(input.quantity) || 1;
  const created = await insertSupply(
    {
      teamId: history.teamId,
      uid: input.uid,
      name: history.name,
      quantity: qty,
      expiryDate: input.expiryDate,
      expiryDates: [
        {
          date: input.expiryDate,
          quantity: qty,
          addedAt: registeredAt.toISOString(),
        },
      ],
      category: history.category,
      unit: input.unit || history.unit,
      amount: input.amount ?? null,
      purchaseLocation: input.purchaseLocation ?? null,
      label: input.label ?? null,
      storageLocation: input.storageLocation ?? null,
      registeredAt,
    },
    database
  );

  return {
    message: "Supply restored from history successfully",
    supplyId: created.id,
    supply: toApiSupply(created),
  };
}

export async function listHistory(
  uid: string,
  teamId: string,
  database?: TeamDb
) {
  if (!teamId) {
    throw new TeamServiceError("Team ID not found in token", 400);
  }

  await assertTeamMember(teamId, uid, database);
  const rows = await listSupplyHistoryByTeam(teamId, database);
  return {
    histories: rows.map(toApiHistory),
  };
}

export async function listSupplyReviews(
  input: { uid: string; supplyId: string; teamId: string },
  database?: TeamDb
) {
  if (!input.teamId) {
    throw new TeamServiceError("チームIDが必要です", 400);
  }

  await assertTeamMember(input.teamId, input.uid, database);
  const reviews = await listReviewsBySupply(
    input.supplyId,
    input.teamId,
    database
  );

  return {
    reviews: reviews.map((r) => ({
      id: r.id,
      supplyId: r.supplyId,
      teamId: r.teamId,
      content: r.content,
      userName: r.userName,
      userId: r.userId,
      createdAt: toFirestoreTimestamp(r.createdAt),
    })),
  };
}

export async function createSupplyReview(
  input: {
    uid: string;
    supplyId: string;
    teamId: string;
    content: string;
    userName: string;
  },
  database?: TeamDb
) {
  if (!input.teamId) {
    throw new TeamServiceError("チームIDが必要です", 400);
  }
  if (!input.content) {
    throw new TeamServiceError("レビュー内容が必要です", 400);
  }

  await assertTeamMember(input.teamId, input.uid, database);

  const supply = await findSupplyById(input.supplyId, database);
  if (!supply) {
    throw new TeamServiceError("備蓄品が見つかりません", 404);
  }
  if (supply.teamId !== input.teamId) {
    throw new TeamServiceError("アクセス権限がありません", 403);
  }

  const review = await insertReview(
    {
      id: randomUUID(),
      supplyId: input.supplyId,
      teamId: input.teamId,
      content: input.content,
      userName: input.userName,
      userId: input.uid,
    },
    database
  );

  return {
    success: true,
    reviewId: review.id,
    message: "レビューを投稿しました",
  };
}

export async function removeSupplyReview(
  input: { uid: string; reviewId: string },
  database?: TeamDb
) {
  if (!input.reviewId) {
    throw new TeamServiceError("レビューIDが必要です", 400);
  }

  const review = await findReviewById(input.reviewId, database);
  if (!review) {
    throw new TeamServiceError("レビューが見つかりません", 404);
  }
  if (review.userId !== input.uid) {
    throw new TeamServiceError("削除権限がありません", 403);
  }

  await deleteReview(review.id, database);
  return {
    success: true,
    message: "レビューを削除しました",
  };
}
