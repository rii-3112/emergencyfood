import { and, eq, inArray } from "drizzle-orm";

import { db as defaultDb } from "@/lib/db";
import { team, teamMember } from "@/lib/app-schema";
import { user } from "@/lib/auth-schema";

export type TeamDb = typeof defaultDb;

export type TeamRole = "owner" | "admin" | "member";

export interface TeamRecord {
  id: string;
  name: string;
  passwordHash: string;
  ownerId: string;
  createdAt: Date;
  createdBy: string;
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

  return {
    id: row.id,
    name: row.name,
    passwordHash: row.passwordHash,
    ownerId: row.ownerId,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
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

  return {
    id: row.id,
    name: row.name,
    passwordHash: row.passwordHash,
    ownerId: row.ownerId,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
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
