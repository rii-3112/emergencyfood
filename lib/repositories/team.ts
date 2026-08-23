import { and, eq, inArray } from "drizzle-orm";

import { db as defaultDb } from "@/lib/db";
import { team, teamMember } from "@/lib/app-schema";
import { user } from "@/lib/auth-schema";
import type { TeamStockSettings } from "@/types";

export type TeamDb = typeof defaultDb;

export type TeamRole = "owner" | "admin" | "member";

export interface TeamRecord {
  id: string;
  name: string;
  passwordHash: string;
  ownerId: string;
  createdAt: Date;
  createdBy: string;
  stockSettings?: TeamStockSettings | null;
  lastWeeklyReportAt?: Date | null;
}

export interface InsertTeamParams {
  id: string;
  name: string;
  passwordHash: string;
  ownerId: string;
  createdBy: string;
  createdAt?: Date;
}

export async function insertTeam(
  params: InsertTeamParams,
  database: TeamDb = defaultDb
): Promise<TeamRecord> {
  const createdAt = params.createdAt ?? new Date();

  await database.insert(team).values({
    id: params.id,
    name: params.name,
    passwordHash: params.passwordHash,
    ownerId: params.ownerId,
    createdBy: params.createdBy,
    createdAt,
  });

  await database.insert(teamMember).values({
    teamId: params.id,
    userId: params.ownerId,
    role: "owner",
  });

  return {
    id: params.id,
    name: params.name,
    passwordHash: params.passwordHash,
    ownerId: params.ownerId,
    createdBy: params.createdBy,
    createdAt,
  };
}

export async function findTeamByName(
  name: string,
  database: TeamDb = defaultDb
): Promise<TeamRecord | null> {
  const rows = await database
    .select()
    .from(team)
    .where(eq(team.name, name))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return mapTeamRow(row);
}

export async function findTeamById(
  id: string,
  database: TeamDb = defaultDb
): Promise<TeamRecord | null> {
  const rows = await database
    .select()
    .from(team)
    .where(eq(team.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return mapTeamRow(row);
}

export async function teamNameExists(
  name: string,
  database: TeamDb = defaultDb
): Promise<boolean> {
  const found = await findTeamByName(name, database);
  return found !== null;
}

export async function insertTeamMember(
  params: { teamId: string; userId: string; role: TeamRole },
  database: TeamDb = defaultDb
): Promise<void> {
  await database
    .insert(teamMember)
    .values({
      teamId: params.teamId,
      userId: params.userId,
      role: params.role,
    })
    .onConflictDoNothing();
}

export async function updateTeamPasswordHash(
  teamId: string,
  passwordHash: string,
  database: TeamDb = defaultDb
): Promise<void> {
  await database.update(team).set({ passwordHash }).where(eq(team.id, teamId));
}

export async function isTeamMember(
  teamId: string,
  userId: string,
  database: TeamDb = defaultDb
): Promise<boolean> {
  const rows = await database
    .select()
    .from(teamMember)
    .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function filterExistingUserIds(
  userIds: string[],
  database: TeamDb = defaultDb
): Promise<Set<string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Set();

  const rows = await database
    .select({ id: user.id })
    .from(user)
    .where(inArray(user.id, unique));

  return new Set(rows.map((row) => row.id));
}

export async function listTeamsForUser(
  userId: string,
  database: TeamDb = defaultDb
): Promise<Array<{ id: string; name: string; role: TeamRole }>> {
  const rows = await database
    .select({
      id: team.id,
      name: team.name,
      role: teamMember.role,
    })
    .from(teamMember)
    .innerJoin(team, eq(teamMember.teamId, team.id))
    .where(eq(teamMember.userId, userId));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role as TeamRole,
  }));
}

export async function backfillTeamFromLegacy(
  params: InsertTeamParams & {
    members: Array<{ userId: string; role: TeamRole }>;
  },
  database: TeamDb = defaultDb
): Promise<TeamRecord> {
  const created = await insertTeam(params, database);

  for (const member of params.members) {
    if (member.userId === params.ownerId) continue;
    await insertTeamMember(
      {
        teamId: params.id,
        userId: member.userId,
        role: member.role,
      },
      database
    );
  }

  return created;
}

function parseStockSettings(
  raw: string | null | undefined
): TeamStockSettings | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TeamStockSettings;
  } catch {
    return null;
  }
}

function mapTeamRow(row: typeof team.$inferSelect): TeamRecord {
  return {
    id: row.id,
    name: row.name,
    passwordHash: row.passwordHash,
    ownerId: row.ownerId,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    stockSettings: parseStockSettings(row.stockSettings),
    lastWeeklyReportAt: row.lastWeeklyReportAt ?? null,
  };
}

export async function listAllTeams(
  database: TeamDb = defaultDb
): Promise<TeamRecord[]> {
  const rows = await database.select().from(team);
  return rows.map(mapTeamRow);
}

export async function listTeamMemberIds(
  teamId: string,
  database: TeamDb = defaultDb
): Promise<string[]> {
  const rows = await database
    .select({ userId: teamMember.userId })
    .from(teamMember)
    .where(eq(teamMember.teamId, teamId));
  return rows.map((row) => row.userId);
}

export async function getMemberRole(
  teamId: string,
  userId: string,
  database: TeamDb = defaultDb
): Promise<TeamRole | null> {
  const rows = await database
    .select({ role: teamMember.role })
    .from(teamMember)
    .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)))
    .limit(1);
  return (rows[0]?.role as TeamRole | undefined) ?? null;
}

export async function updateMemberRole(
  teamId: string,
  userId: string,
  role: TeamRole,
  database: TeamDb = defaultDb
): Promise<void> {
  await database
    .update(teamMember)
    .set({ role })
    .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)));
}

export async function updateTeamName(
  teamId: string,
  name: string,
  database: TeamDb = defaultDb
): Promise<void> {
  await database.update(team).set({ name }).where(eq(team.id, teamId));
}

export async function updateTeamStockSettings(
  teamId: string,
  stockSettings: TeamStockSettings,
  database: TeamDb = defaultDb
): Promise<void> {
  await database
    .update(team)
    .set({ stockSettings: JSON.stringify(stockSettings) })
    .where(eq(team.id, teamId));
}

export async function updateTeamLastWeeklyReportAt(
  teamId: string,
  at: Date,
  database: TeamDb = defaultDb
): Promise<void> {
  await database
    .update(team)
    .set({ lastWeeklyReportAt: at })
    .where(eq(team.id, teamId));
}

export async function listTeamMembersWithUsers(
  teamId: string,
  database: TeamDb = defaultDb
): Promise<
  Array<{
    uid: string;
    email: string | null;
    displayName: string | null;
    role: TeamRole;
  }>
> {
  const rows = await database
    .select({
      uid: teamMember.userId,
      email: user.email,
      displayName: user.name,
      role: teamMember.role,
    })
    .from(teamMember)
    .innerJoin(user, eq(teamMember.userId, user.id))
    .where(eq(teamMember.teamId, teamId));

  return rows.map((row) => ({
    uid: row.uid,
    email: row.email,
    displayName: row.displayName,
    role: row.role as TeamRole,
  }));
}

export function toApiTeam(
  record: TeamRecord,
  memberIds: string[]
): {
  id: string;
  name: string;
  members: string[];
  admins: string[];
  ownerId: string;
  createdAt: Date;
  createdBy: string;
  stockSettings?: TeamStockSettings;
} {
  return {
    id: record.id,
    name: record.name,
    ownerId: record.ownerId,
    createdAt: record.createdAt,
    createdBy: record.createdBy,
    members: memberIds,
    admins: [],
    stockSettings: record.stockSettings ?? undefined,
  };
}
