import { eq } from "drizzle-orm";

import { disasterBoard, handbookChecklist } from "@/lib/app-schema";
import { db as defaultDb } from "@/lib/db";
import type { DisasterBoardData } from "@/types/forms";
import type { TeamDb } from "@/lib/repositories/team";

export interface HandbookChecklistRecord {
  checkedItemIds: string[];
  checkedPetItems: Record<string, string[]>;
  lastUpdated: Date;
  lastUpdatedBy: string;
}

export async function findDisasterBoardByTeamId(
  teamId: string,
  database: TeamDb = defaultDb
): Promise<DisasterBoardData | null> {
  const rows = await database
    .select()
    .from(disasterBoard)
    .where(eq(disasterBoard.teamId, teamId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const parsed = JSON.parse(row.data) as Omit<
    DisasterBoardData,
    "lastUpdated" | "lastUpdatedBy"
  >;

  return {
    ...parsed,
    lastUpdated: row.lastUpdated,
    lastUpdatedBy: row.lastUpdatedBy,
  };
}

export async function upsertDisasterBoard(
  teamId: string,
  data: DisasterBoardData,
  database: TeamDb = defaultDb
): Promise<void> {
  const { lastUpdated, lastUpdatedBy, ...payload } = data;

  await database
    .insert(disasterBoard)
    .values({
      teamId,
      data: JSON.stringify(payload),
      lastUpdated: lastUpdated ?? new Date(),
      lastUpdatedBy: lastUpdatedBy ?? "ユーザー",
    })
    .onConflictDoUpdate({
      target: disasterBoard.teamId,
      set: {
        data: JSON.stringify(payload),
        lastUpdated: lastUpdated ?? new Date(),
        lastUpdatedBy: lastUpdatedBy ?? "ユーザー",
      },
    });
}

export async function findHandbookChecklistByTeamId(
  teamId: string,
  database: TeamDb = defaultDb
): Promise<HandbookChecklistRecord | null> {
  const rows = await database
    .select()
    .from(handbookChecklist)
    .where(eq(handbookChecklist.teamId, teamId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    checkedItemIds: JSON.parse(row.checkedItemIds) as string[],
    checkedPetItems: JSON.parse(row.checkedPetItems) as Record<
      string,
      string[]
    >,
    lastUpdated: row.lastUpdated,
    lastUpdatedBy: row.lastUpdatedBy,
  };
}

export async function upsertHandbookChecklist(
  teamId: string,
  data: {
    checkedItemIds: string[];
    checkedPetItems: Record<string, string[]>;
    lastUpdatedBy: string;
  },
  database: TeamDb = defaultDb
): Promise<void> {
  const now = new Date();

  await database
    .insert(handbookChecklist)
    .values({
      teamId,
      checkedItemIds: JSON.stringify(data.checkedItemIds),
      checkedPetItems: JSON.stringify(data.checkedPetItems),
      lastUpdated: now,
      lastUpdatedBy: data.lastUpdatedBy,
    })
    .onConflictDoUpdate({
      target: handbookChecklist.teamId,
      set: {
        checkedItemIds: JSON.stringify(data.checkedItemIds),
        checkedPetItems: JSON.stringify(data.checkedPetItems),
        lastUpdated: now,
        lastUpdatedBy: data.lastUpdatedBy,
      },
    });
}
