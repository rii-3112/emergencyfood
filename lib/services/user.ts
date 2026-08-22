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
import { adminDb } from "@/utils/firebase/admin";

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

  await database.update(userTable).set(patch).where(eq(userTable.id, params.uid));

  const firestoreUpdates: Record<string, string> = {
    displayName: trimmedName,
  };
  if (gender !== undefined) {
    firestoreUpdates.gender = gender;
  }

  await adminDb
    .collection("users")
    .doc(params.uid)
    .set(firestoreUpdates, { merge: true });

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

  if (rows[0]?.gender) return rows[0].gender;

  const snap = await adminDb.collection("users").doc(uid).get();
  return (snap.data()?.gender as string | undefined) ?? null;
}

export async function listMyTeams(
  uid: string,
  activeTeamId: string | null | undefined,
  database?: TeamDb
) {
  const tursoTeams = await listTeamsForUser(uid, database);

  if (tursoTeams.length > 0) {
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

  // Firestore fallback during migration
  const userDoc = await adminDb.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    return { teams: [], activeTeamId: null };
  }

  const userData = userDoc.data();
  const userTeams = (userData?.teams as string[] | undefined) || [];
  const firestoreActive =
    (userData?.activeTeamId as string | undefined) ||
    (userData?.teamId as string | undefined) ||
    null;

  const teams = await Promise.all(
    userTeams.map(async (teamId) => {
      const teamDoc = await adminDb.collection("teams").doc(teamId).get();
      if (!teamDoc.exists) return null;
      return {
        id: teamDoc.id,
        name: (teamDoc.data()?.name as string | undefined) || "不明なチーム",
        isActive: teamId === firestoreActive,
      };
    })
  );

  return {
    teams: teams.filter((t): t is NonNullable<typeof t> => t !== null),
    activeTeamId: firestoreActive,
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

  let allowed = await isTeamMember(teamId, uid, database);
  if (!allowed) {
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userTeams = (userDoc.data()?.teams as string[] | undefined) || [];
    allowed = userTeams.includes(teamId);
  }

  if (!allowed) {
    throw new TeamServiceError("You are not a member of this team", 403);
  }

  await adminDb.collection("users").doc(uid).set(
    {
      activeTeamId: teamId,
      teamId,
    },
    { merge: true }
  );

  await syncUserTeamId(uid, teamId);

  return {
    message: "Team switched successfully",
    teamId,
  };
}
