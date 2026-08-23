import { eq } from "drizzle-orm";

import { user as userTable } from "@/lib/auth-schema";
import { db as defaultDb } from "@/lib/db";
import {
  isTeamMember,
  listTeamsForUser,
  type TeamDb,
} from "@/lib/repositories/team";
import { TeamServiceError } from "@/lib/services/team-errors";
import { syncUserTeamId } from "@/utils/auth/server";

export type Gender = "male" | "female" | "prefer_not_to_say";

const ALLOWED_GENDERS: Gender[] = ["male", "female", "prefer_not_to_say"];

export async function updateUserProfile(
  params: {
    uid: string;
    displayName: string;
    gender?: string;
  },
  database: TeamDb = defaultDb
): Promise<{ displayName: string; gender?: Gender }> {
  const trimmedName = params.displayName.trim();
  if (!trimmedName) {
    throw new TeamServiceError("表示名が必要です", 400);
  }

  let gender: Gender | undefined;
  if (params.gender !== undefined) {
    if (!ALLOWED_GENDERS.includes(params.gender as Gender)) {
      throw new TeamServiceError("性別が不正です", 400);
    }
    gender = params.gender as Gender;
  }

  const patch: { name: string; gender?: string; updatedAt: Date } = {
    name: trimmedName,
    updatedAt: new Date(),
  };
  if (gender !== undefined) {
    patch.gender = gender;
  }

  await database
    .update(userTable)
    .set(patch)
    .where(eq(userTable.id, params.uid));

  return { displayName: trimmedName, gender };
}

export async function getUserGender(
  uid: string,
  database: TeamDb = defaultDb
): Promise<string | null> {
  const rows = await database
    .select({ gender: userTable.gender })
    .from(userTable)
    .where(eq(userTable.id, uid))
    .limit(1);

  return rows[0]?.gender ?? null;
}

export async function listMyTeams(
  uid: string,
  activeTeamId: string | null | undefined,
  database?: TeamDb
) {
  const tursoTeams = await listTeamsForUser(uid, database);

  const resolvedActive =
    activeTeamId && tursoTeams.some((t) => t.id === activeTeamId)
      ? activeTeamId
      : (tursoTeams[0]?.id ?? null);

  return {
    teams: tursoTeams.map((t) => ({
      id: t.id,
      name: t.name,
      isActive: t.id === resolvedActive,
    })),
    activeTeamId: resolvedActive,
  };
}

export async function switchActiveTeam(
  uid: string,
  teamId: string,
  database?: TeamDb
): Promise<{ message: string; teamId: string }> {
  if (!teamId) {
    throw new TeamServiceError("Team ID is required", 400);
  }

  const allowed = await isTeamMember(teamId, uid, database);
  if (!allowed) {
    throw new TeamServiceError("You are not a member of this team", 403);
  }

  await syncUserTeamId(uid, teamId);

  return {
    message: "Team switched successfully",
    teamId,
  };
}
