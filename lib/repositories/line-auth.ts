import { eq } from "drizzle-orm";

import { lineAuthCode } from "@/lib/app-schema";
import { db as defaultDb } from "@/lib/db";
import type { TeamDb } from "@/lib/repositories/team";

export interface LineAuthCodeRecord {
  lineUserId: string;
  code: string;
  expireAt: Date;
  createdAt: Date;
}

export async function upsertLineAuthCode(
  params: { lineUserId: string; code: string; expireAt: Date },
  database: TeamDb = defaultDb
): Promise<void> {
  await database
    .insert(lineAuthCode)
    .values({
      lineUserId: params.lineUserId,
      code: params.code,
      expireAt: params.expireAt,
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: lineAuthCode.lineUserId,
      set: {
        code: params.code,
        expireAt: params.expireAt,
        createdAt: new Date(),
      },
    });
}

export async function findLineAuthCodeByLineUserId(
  lineUserId: string,
  database: TeamDb = defaultDb
): Promise<LineAuthCodeRecord | null> {
  const rows = await database
    .select()
    .from(lineAuthCode)
    .where(eq(lineAuthCode.lineUserId, lineUserId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    lineUserId: row.lineUserId,
    code: row.code,
    expireAt: row.expireAt,
    createdAt: row.createdAt,
  };
}

export async function findLineAuthCodeByCode(
  code: string,
  database: TeamDb = defaultDb
): Promise<LineAuthCodeRecord | null> {
  const rows = await database
    .select()
    .from(lineAuthCode)
    .where(eq(lineAuthCode.code, code))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    lineUserId: row.lineUserId,
    code: row.code,
    expireAt: row.expireAt,
    createdAt: row.createdAt,
  };
}

export async function deleteLineAuthCode(
  lineUserId: string,
  database: TeamDb = defaultDb
): Promise<void> {
  await database
    .delete(lineAuthCode)
    .where(eq(lineAuthCode.lineUserId, lineUserId));
}
