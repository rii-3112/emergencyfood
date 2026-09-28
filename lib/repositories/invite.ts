import { eq } from "drizzle-orm";

import { invite } from "@/lib/app-schema";
import { db as defaultDb } from "@/lib/db";
import type { TeamDb } from "@/lib/repositories/team";

export interface InviteRecord {
  code: string;
  teamId: string;
  teamName: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
}

export interface InsertInviteParams {
  code: string;
  teamId: string;
  teamName: string;
  createdBy: string;
  createdAt?: Date;
  expiresAt: Date;
  used?: boolean;
}

export async function insertInvite(
  params: InsertInviteParams,
  database: TeamDb = defaultDb
): Promise<InviteRecord> {
  const createdAt = params.createdAt ?? new Date();
  const used = params.used ?? false;

  await database.insert(invite).values({
    code: params.code,
    teamId: params.teamId,
    teamName: params.teamName,
    createdBy: params.createdBy,
    createdAt,
    expiresAt: params.expiresAt,
    used,
  });

  return {
    code: params.code,
    teamId: params.teamId,
    teamName: params.teamName,
    createdBy: params.createdBy,
    createdAt,
    expiresAt: params.expiresAt,
    used,
  };
}

export async function findInviteByCode(
  code: string,
  database: TeamDb = defaultDb
): Promise<InviteRecord | null> {
  const rows = await database
    .select()
    .from(invite)
    .where(eq(invite.code, code))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    code: row.code,
    teamId: row.teamId,
    teamName: row.teamName,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    used: row.used,
  };
}

export async function markInviteUsed(
  code: string,
  database: TeamDb = defaultDb
): Promise<void> {
  await database
    .update(invite)
    .set({ used: true })
    .where(eq(invite.code, code));
}
