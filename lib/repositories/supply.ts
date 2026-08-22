import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";

import {
  supply,
  supplyHistory,
  supplyReview,
} from "@/lib/app-schema";
import { db as defaultDb } from "@/lib/db";
import type { TeamDb } from "@/lib/repositories/team";
import type { ExpiryInfo } from "@/types";

export interface SupplyRecord {
  id: string;
  teamId: string;
  uid: string;
  name: string;
  quantity: number;
  expiryDate: string;
  expiryDates: ExpiryInfo[] | null;
  isArchived: boolean;
  category: string;
  unit: string;
  amount: number | null;
  purchaseLocation: string | null;
  label: string | null;
  storageLocation: string | null;
  registeredAt: Date;
  lastConsumedDate: string | null;
  consumptionCount: number;
  zeroStockSince: string | null;
  updatedAt: Date | null;
  reviewCount?: number;
}

export interface InsertSupplyParams {
  id?: string;
  teamId: string;
  uid: string;
  name: string;
  quantity: number;
  expiryDate: string;
  expiryDates?: ExpiryInfo[] | null;
  category: string;
  unit: string;
  amount?: number | null;
  purchaseLocation?: string | null;
  label?: string | null;
  storageLocation?: string | null;
  isArchived?: boolean;
  registeredAt?: Date;
  lastConsumedDate?: string | null;
  consumptionCount?: number;
  zeroStockSince?: string | null;
}

function parseExpiryDates(raw: string | null): ExpiryInfo[] | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExpiryInfo[];
  } catch {
    return null;
  }
}

function mapSupplyRow(
  row: typeof supply.$inferSelect,
  reviewCount?: number
): SupplyRecord {
  return {
    id: row.id,
    teamId: row.teamId,
    uid: row.uid,
    name: row.name,
    quantity: row.quantity,
    expiryDate: row.expiryDate,
    expiryDates: parseExpiryDates(row.expiryDates),
    isArchived: row.isArchived,
    category: row.category,
    unit: row.unit,
    amount: row.amount,
    purchaseLocation: row.purchaseLocation,
    label: row.label,
    storageLocation: row.storageLocation,
    registeredAt: row.registeredAt,
    lastConsumedDate: row.lastConsumedDate,
    consumptionCount: row.consumptionCount,
    zeroStockSince: row.zeroStockSince,
    updatedAt: row.updatedAt,
    reviewCount,
  };
}

export async function insertSupply(
  params: InsertSupplyParams,
  database: TeamDb = defaultDb
): Promise<SupplyRecord> {
  const id = params.id ?? randomUUID();
  const registeredAt = params.registeredAt ?? new Date();
  const expiryDatesJson = params.expiryDates
    ? JSON.stringify(params.expiryDates)
    : null;

  await database.insert(supply).values({
    id,
    teamId: params.teamId,
    uid: params.uid,
    name: params.name,
    quantity: params.quantity,
    expiryDate: params.expiryDate,
    expiryDates: expiryDatesJson,
    isArchived: params.isArchived ?? false,
    category: params.category,
    unit: params.unit,
    amount: params.amount ?? null,
    purchaseLocation: params.purchaseLocation ?? null,
    label: params.label ?? null,
    storageLocation: params.storageLocation ?? "未設定",
    registeredAt,
    lastConsumedDate: params.lastConsumedDate ?? null,
    consumptionCount: params.consumptionCount ?? 0,
    zeroStockSince: params.zeroStockSince ?? null,
  });

  return mapSupplyRow({
    id,
    teamId: params.teamId,
    uid: params.uid,
    name: params.name,
    quantity: params.quantity,
    expiryDate: params.expiryDate,
    expiryDates: expiryDatesJson,
    isArchived: params.isArchived ?? false,
    category: params.category,
    unit: params.unit,
    amount: params.amount ?? null,
    purchaseLocation: params.purchaseLocation ?? null,
    label: params.label ?? null,
    storageLocation: params.storageLocation ?? "未設定",
    registeredAt,
    lastConsumedDate: params.lastConsumedDate ?? null,
    consumptionCount: params.consumptionCount ?? 0,
    zeroStockSince: params.zeroStockSince ?? null,
    updatedAt: null,
  });
}

export async function findSupplyById(
  id: string,
  database: TeamDb = defaultDb
): Promise<SupplyRecord | null> {
  const rows = await database
    .select()
    .from(supply)
    .where(eq(supply.id, id))
    .limit(1);
  const row = rows[0];
  return row ? mapSupplyRow(row) : null;
}

export async function listSuppliesByTeam(
  teamId: string,
  isArchived: boolean,
  database: TeamDb = defaultDb
): Promise<SupplyRecord[]> {
  const rows = await database
    .select()
    .from(supply)
    .where(and(eq(supply.teamId, teamId), eq(supply.isArchived, isArchived)));

  const withCounts = await Promise.all(
    rows.map(async (row) => {
      const reviews = await database
        .select()
        .from(supplyReview)
        .where(
          and(
            eq(supplyReview.supplyId, row.id),
            eq(supplyReview.teamId, teamId)
          )
        );
      return mapSupplyRow(row, reviews.length);
    })
  );

  return withCounts;
}

export async function updateSupply(
  id: string,
  updates: Partial<{
    name: string;
    quantity: number;
    expiryDate: string;
    expiryDates: ExpiryInfo[] | null;
    isArchived: boolean;
    category: string;
    unit: string;
    amount: number | null;
    purchaseLocation: string | null;
    label: string | null;
    storageLocation: string | null;
    lastConsumedDate: string | null;
    consumptionCount: number;
    zeroStockSince: string | null;
  }>,
  database: TeamDb = defaultDb
): Promise<void> {
  const patch: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.quantity !== undefined) patch.quantity = updates.quantity;
  if (updates.expiryDate !== undefined) patch.expiryDate = updates.expiryDate;
  if (updates.expiryDates !== undefined) {
    patch.expiryDates = updates.expiryDates
      ? JSON.stringify(updates.expiryDates)
      : null;
  }
  if (updates.isArchived !== undefined) patch.isArchived = updates.isArchived;
  if (updates.category !== undefined) patch.category = updates.category;
  if (updates.unit !== undefined) patch.unit = updates.unit;
  if (updates.amount !== undefined) patch.amount = updates.amount;
  if (updates.purchaseLocation !== undefined) {
    patch.purchaseLocation = updates.purchaseLocation;
  }
  if (updates.label !== undefined) patch.label = updates.label;
  if (updates.storageLocation !== undefined) {
    patch.storageLocation = updates.storageLocation;
  }
  if (updates.lastConsumedDate !== undefined) {
    patch.lastConsumedDate = updates.lastConsumedDate;
  }
  if (updates.consumptionCount !== undefined) {
    patch.consumptionCount = updates.consumptionCount;
  }
  if (updates.zeroStockSince !== undefined) {
    patch.zeroStockSince = updates.zeroStockSince;
  }

  await database.update(supply).set(patch).where(eq(supply.id, id));
}

export async function deleteSupply(
  id: string,
  database: TeamDb = defaultDb
): Promise<void> {
  await database.delete(supply).where(eq(supply.id, id));
}

export interface SupplyHistoryRecord {
  id: string;
  teamId: string;
  name: string;
  category: string;
  unit: string;
  totalConsumed: number;
  averageStock: number;
  purchaseLocations: string[];
  lastUsedDate: string | null;
  firstRegisteredDate: string | null;
  hasReviews: boolean;
  reviewCount: number;
  archivedAt: Date;
  archivedBy: string;
}

function parseLocations(raw: string): string[] {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function mapHistoryRow(
  row: typeof supplyHistory.$inferSelect
): SupplyHistoryRecord {
  return {
    id: row.id,
    teamId: row.teamId,
    name: row.name,
    category: row.category,
    unit: row.unit,
    totalConsumed: row.totalConsumed,
    averageStock: row.averageStock,
    purchaseLocations: parseLocations(row.purchaseLocations),
    lastUsedDate: row.lastUsedDate,
    firstRegisteredDate: row.firstRegisteredDate,
    hasReviews: row.hasReviews,
    reviewCount: row.reviewCount,
    archivedAt: row.archivedAt,
    archivedBy: row.archivedBy,
  };
}

export async function listSupplyHistoryByTeam(
  teamId: string,
  database: TeamDb = defaultDb
): Promise<SupplyHistoryRecord[]> {
  const rows = await database
    .select()
    .from(supplyHistory)
    .where(eq(supplyHistory.teamId, teamId))
    .orderBy(desc(supplyHistory.archivedAt));

  return rows.map(mapHistoryRow);
}

export async function findSupplyHistoryById(
  id: string,
  database: TeamDb = defaultDb
): Promise<SupplyHistoryRecord | null> {
  const rows = await database
    .select()
    .from(supplyHistory)
    .where(eq(supplyHistory.id, id))
    .limit(1);
  return rows[0] ? mapHistoryRow(rows[0]) : null;
}

export async function findSupplyHistoryByNameCategory(
  teamId: string,
  name: string,
  category: string,
  database: TeamDb = defaultDb
): Promise<SupplyHistoryRecord | null> {
  const rows = await database
    .select()
    .from(supplyHistory)
    .where(
      and(
        eq(supplyHistory.teamId, teamId),
        eq(supplyHistory.name, name),
        eq(supplyHistory.category, category)
      )
    )
    .limit(1);
  return rows[0] ? mapHistoryRow(rows[0]) : null;
}

export async function upsertSupplyHistory(
  params: {
    id?: string;
    teamId: string;
    name: string;
    category: string;
    unit: string;
    totalConsumed: number;
    averageStock: number;
    purchaseLocations: string[];
    lastUsedDate: string | null;
    firstRegisteredDate: string | null;
    hasReviews: boolean;
    reviewCount: number;
    archivedBy: string;
  },
  database: TeamDb = defaultDb
): Promise<SupplyHistoryRecord> {
  const existing = await findSupplyHistoryByNameCategory(
    params.teamId,
    params.name,
    params.category,
    database
  );

  if (existing) {
    const purchaseLocations = Array.from(
      new Set([...existing.purchaseLocations, ...params.purchaseLocations])
    );
    const archivedAt = new Date();
    await database
      .update(supplyHistory)
      .set({
        totalConsumed: existing.totalConsumed + params.totalConsumed,
        reviewCount: existing.reviewCount + params.reviewCount,
        hasReviews: existing.hasReviews || params.hasReviews,
        archivedAt,
        lastUsedDate: params.lastUsedDate,
        purchaseLocations: JSON.stringify(purchaseLocations),
      })
      .where(eq(supplyHistory.id, existing.id));

    return {
      ...existing,
      totalConsumed: existing.totalConsumed + params.totalConsumed,
      reviewCount: existing.reviewCount + params.reviewCount,
      hasReviews: existing.hasReviews || params.hasReviews,
      archivedAt,
      lastUsedDate: params.lastUsedDate,
      purchaseLocations,
    };
  }

  const id = params.id ?? randomUUID();
  const archivedAt = new Date();
  await database.insert(supplyHistory).values({
    id,
    teamId: params.teamId,
    name: params.name,
    category: params.category,
    unit: params.unit,
    totalConsumed: params.totalConsumed,
    averageStock: params.averageStock,
    purchaseLocations: JSON.stringify(params.purchaseLocations),
    lastUsedDate: params.lastUsedDate,
    firstRegisteredDate: params.firstRegisteredDate,
    hasReviews: params.hasReviews,
    reviewCount: params.reviewCount,
    archivedAt,
    archivedBy: params.archivedBy,
  });

  return {
    id,
    teamId: params.teamId,
    name: params.name,
    category: params.category,
    unit: params.unit,
    totalConsumed: params.totalConsumed,
    averageStock: params.averageStock,
    purchaseLocations: params.purchaseLocations,
    lastUsedDate: params.lastUsedDate,
    firstRegisteredDate: params.firstRegisteredDate,
    hasReviews: params.hasReviews,
    reviewCount: params.reviewCount,
    archivedAt,
    archivedBy: params.archivedBy,
  };
}

export interface SupplyReviewRecord {
  id: string;
  supplyId: string;
  teamId: string;
  content: string;
  userName: string;
  userId: string;
  createdAt: Date;
}

export async function listReviewsBySupply(
  supplyId: string,
  teamId: string,
  database: TeamDb = defaultDb
): Promise<SupplyReviewRecord[]> {
  const rows = await database
    .select()
    .from(supplyReview)
    .where(
      and(eq(supplyReview.supplyId, supplyId), eq(supplyReview.teamId, teamId))
    )
    .orderBy(desc(supplyReview.createdAt));

  return rows.map((row) => ({
    id: row.id,
    supplyId: row.supplyId,
    teamId: row.teamId,
    content: row.content,
    userName: row.userName,
    userId: row.userId,
    createdAt: row.createdAt,
  }));
}

export async function insertReview(
  params: {
    id?: string;
    supplyId: string;
    teamId: string;
    content: string;
    userName: string;
    userId: string;
  },
  database: TeamDb = defaultDb
): Promise<SupplyReviewRecord> {
  const id = params.id ?? randomUUID();
  const createdAt = new Date();
  await database.insert(supplyReview).values({
    id,
    supplyId: params.supplyId,
    teamId: params.teamId,
    content: params.content,
    userName: params.userName,
    userId: params.userId,
    createdAt,
  });
  return {
    id,
    supplyId: params.supplyId,
    teamId: params.teamId,
    content: params.content,
    userName: params.userName,
    userId: params.userId,
    createdAt,
  };
}

export async function findReviewById(
  id: string,
  database: TeamDb = defaultDb
): Promise<SupplyReviewRecord | null> {
  const rows = await database
    .select()
    .from(supplyReview)
    .where(eq(supplyReview.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    supplyId: row.supplyId,
    teamId: row.teamId,
    content: row.content,
    userName: row.userName,
    userId: row.userId,
    createdAt: row.createdAt,
  };
}

export async function deleteReview(
  id: string,
  database: TeamDb = defaultDb
): Promise<void> {
  await database.delete(supplyReview).where(eq(supplyReview.id, id));
}

export async function deleteReviewsBySupply(
  supplyId: string,
  database: TeamDb = defaultDb
): Promise<void> {
  await database.delete(supplyReview).where(eq(supplyReview.supplyId, supplyId));
}
