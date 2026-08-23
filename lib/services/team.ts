import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

import {
  backfillTeamFromLegacy,
  filterExistingUserIds,
  findTeamById,
  findTeamByName,
  insertTeam,
  insertTeamMember,
  isTeamMember,
  teamNameExists,
  type TeamDb,
  type TeamRole,
} from "@/lib/repositories/team";
import { TeamServiceError } from "@/lib/services/team-errors";
import { syncUserTeamId } from "@/utils/auth/server";
import {
  hashTeamPassword,
  isTeamPasswordHashed,
  verifyTeamPassword,
} from "@/utils/auth/team-password";
import { adminDb } from "@/utils/firebase/admin";

export interface CreateTeamInput {
  uid: string;
  teamName: string;
  teamPassword?: string;
}

export interface CreateTeamResult {
  message: string;
  teamId: string;
}

export interface JoinTeamInput {
  uid: string;
  teamName: string;
  teamPassword: string;
}

export interface JoinTeamResult {
  message: string;
  teamId: string;
}

async function firestoreTeamNameExists(teamName: string): Promise<boolean> {
  const snapshot = await adminDb
    .collection("teams")
    .where("name", "==", teamName)
    .limit(1)
    .get();
  return !snapshot.empty;
}

async function findFirestoreTeamByName(teamName: string) {
  const snapshot = await adminDb
    .collection("teams")
    .where("name", "==", teamName)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    data: doc.data(),
  };
}

function resolveMemberRole(
  uid: string,
  teamData: FirebaseFirestore.DocumentData
): TeamRole {
  const ownerId = teamData.ownerId as string;
  const admins = (teamData.admins as string[] | undefined) ?? [];

  if (uid === ownerId) return "owner";
  if (admins.includes(uid)) return "admin";
  return "member";
}

export async function createTeam(
  input: CreateTeamInput,
  database?: TeamDb
): Promise<CreateTeamResult> {
  const { uid, teamName } = input;
  const trimmedName = teamName.trim();

  if (!trimmedName) {
    throw new TeamServiceError("Team name is required", 400);
  }

  if (await teamNameExists(trimmedName, database)) {
    throw new TeamServiceError("Team name already exists", 409);
  }

  if (await firestoreTeamNameExists(trimmedName)) {
    throw new TeamServiceError("Team name already exists", 409);
  }

  const plainPassword =
    input.teamPassword?.trim() || `auto-${uid}-${Date.now()}`;
  const passwordHash = await hashTeamPassword(plainPassword);
  const teamId = randomUUID();

  await insertTeam(
    {
      id: teamId,
      name: trimmedName,
      passwordHash,
      ownerId: uid,
      createdBy: uid,
    },
    database
  );

  const teamsRef = adminDb.collection("teams");

  await adminDb.runTransaction(async (transaction: Transaction) => {
    const userDocRef = adminDb.collection("users").doc(uid);
    const userDoc = await transaction.get(userDocRef);

    if (!userDoc.exists) {
      throw new TeamServiceError("User document not found.", 500);
    }

    const userData = userDoc.data();
    const currentTeams = userData?.teams || [];
    const teamDocRef = teamsRef.doc(teamId);

    transaction.set(teamDocRef, {
      name: trimmedName,
      members: [uid],
      ownerId: uid,
      admins: [uid],
      createdAt: new Date(),
      createdBy: uid,
    });

    transaction.update(userDocRef, {
      teams: [...currentTeams, teamId],
      activeTeamId: teamId,
      teamId,
    });
  });

  await syncUserTeamId(uid, teamId);

  return {
    message: `Team "${trimmedName}" created and you joined.`,
    teamId,
  };
}

async function verifyPasswordForJoin(
  teamName: string,
  teamPassword: string,
  database?: TeamDb
): Promise<{ teamId: string }> {
  const tursoTeam = await findTeamByName(teamName, database);

  if (tursoTeam) {
    const result = await verifyTeamPassword(
      teamPassword,
      tursoTeam.passwordHash
    );
    if (!result.matched) {
      throw new TeamServiceError("Incorrect team name or password", 401);
    }
    return { teamId: tursoTeam.id };
  }

  const firestoreTeam = await findFirestoreTeamByName(teamName);
  if (!firestoreTeam) {
    throw new TeamServiceError("Team not found", 404);
  }

  const legacyPassword = firestoreTeam.data.password as string | undefined;
  if (!legacyPassword) {
    throw new TeamServiceError("Incorrect team name or password", 401);
  }

  const result = await verifyTeamPassword(teamPassword, legacyPassword);
  if (!result.matched) {
    throw new TeamServiceError("Incorrect team name or password", 401);
  }

  const passwordHash = await hashTeamPassword(teamPassword);

  const members = (firestoreTeam.data.members as string[] | undefined) ?? [];
  const ownerId =
    (firestoreTeam.data.ownerId as string | undefined) ??
    (firestoreTeam.data.createdBy as string | undefined) ??
    members[0];

  if (!ownerId) {
    throw new TeamServiceError("Invalid team data", 500);
  }

  await backfillTeamFromLegacy(
    {
      id: firestoreTeam.id,
      name: teamName,
      passwordHash,
      ownerId,
      createdBy:
        (firestoreTeam.data.createdBy as string | undefined) ?? ownerId,
      members: members.map((userId) => ({
        userId,
        role: resolveMemberRole(userId, firestoreTeam.data),
      })),
    },
    database
  );

  await adminDb.collection("teams").doc(firestoreTeam.id).update({
    password: FieldValue.delete(),
  });

  return { teamId: firestoreTeam.id };
}

async function syncTursoTeamMember(
  teamId: string,
  uid: string,
  database?: TeamDb
): Promise<void> {
  const teamDoc = await adminDb.collection("teams").doc(teamId).get();
  if (!teamDoc.exists) return;

  const teamData = teamDoc.data() ?? {};
  await insertTeamMember(
    {
      teamId,
      userId: uid,
      role: resolveMemberRole(uid, teamData),
    },
    database
  );
}

/**
 * Firestore のみに存在するチームを Turso へ同期し、uid の membership を確保する。
 * supply など Turso FK を要する書き込み前に呼ぶ。
 */
export async function ensureTursoTeamMembership(
  teamId: string,
  uid: string,
  database?: TeamDb
): Promise<void> {
  if (await isTeamMember(teamId, uid, database)) return;

  const existingTeam = await findTeamById(teamId, database);
  if (existingTeam) {
    await syncTursoTeamMember(teamId, uid, database);
    return;
  }

  const teamDoc = await adminDb.collection("teams").doc(teamId).get();
  if (!teamDoc.exists) {
    throw new TeamServiceError("Team not found", 404);
  }

  const teamData = teamDoc.data() ?? {};
  const name = teamData.name as string | undefined;
  if (!name) {
    throw new TeamServiceError("Invalid team data", 500);
  }

  const members = (teamData.members as string[] | undefined) ?? [];
  if (!members.includes(uid)) {
    throw new TeamServiceError("You are not a member of this team", 403);
  }

  const legacyPassword = teamData.password as string | undefined;
  let passwordHash: string;
  if (legacyPassword) {
    passwordHash = isTeamPasswordHashed(legacyPassword)
      ? legacyPassword
      : await hashTeamPassword(legacyPassword);
  } else {
    passwordHash = await hashTeamPassword(`legacy-sync-${teamId}`);
  }

  const candidateOwnerId =
    (teamData.ownerId as string | undefined) ??
    (teamData.createdBy as string | undefined) ??
    members[0] ??
    uid;

  const existingUserIds = await filterExistingUserIds(
    [candidateOwnerId, uid, ...members],
    database
  );

  if (!existingUserIds.has(uid)) {
    throw new TeamServiceError("User not found", 500);
  }

  const ownerId = existingUserIds.has(candidateOwnerId)
    ? candidateOwnerId
    : uid;

  await backfillTeamFromLegacy(
    {
      id: teamId,
      name,
      passwordHash,
      ownerId,
      createdBy:
        (teamData.createdBy as string | undefined) &&
        existingUserIds.has(teamData.createdBy as string)
          ? (teamData.createdBy as string)
          : ownerId,
      members: members
        .filter((userId) => existingUserIds.has(userId))
        .map((userId) => ({
          userId,
          role: resolveMemberRole(userId, teamData),
        })),
    },
    database
  );

  if (!(await isTeamMember(teamId, uid, database))) {
    await insertTeamMember(
      {
        teamId,
        userId: uid,
        role: resolveMemberRole(uid, teamData),
      },
      database
    );
  }
}

export async function joinTeam(
  input: JoinTeamInput,
  database?: TeamDb
): Promise<JoinTeamResult> {
  const { uid, teamName, teamPassword } = input;
  const trimmedName = teamName.trim();

  if (!trimmedName || !teamPassword) {
    throw new TeamServiceError("Team name and password are required", 400);
  }

  const { teamId } = await verifyPasswordForJoin(
    trimmedName,
    teamPassword,
    database
  );

  await adminDb.runTransaction(async (transaction) => {
    const userDocRef = adminDb.collection("users").doc(uid);
    const teamDocRef = adminDb.collection("teams").doc(teamId);

    const userDoc = await transaction.get(userDocRef);
    const teamDocFromTransaction = await transaction.get(teamDocRef);

    if (!userDoc.exists) {
      throw new TeamServiceError("User document not found.", 500);
    }
    if (!teamDocFromTransaction.exists) {
      throw new TeamServiceError("Team not found", 404);
    }

    const userData = userDoc.data();
    const teamDataAfterTransaction = teamDocFromTransaction.data();

    const currentTeamMembers = teamDataAfterTransaction?.members || [];
    const currentUserTeams = userData?.teams || [];

    if (currentTeamMembers.includes(uid)) {
      transaction.update(userDocRef, {
        activeTeamId: teamId,
        teamId,
      });
      return;
    }

    transaction.update(userDocRef, {
      teams: [...currentUserTeams, teamId],
      activeTeamId: teamId,
      teamId,
    });
    transaction.update(teamDocRef, {
      members: [...currentTeamMembers, uid],
    });
  });

  await syncTursoTeamMember(teamId, uid, database);
  await syncUserTeamId(uid, teamId);

  return {
    message: `Successfully joined team "${trimmedName}" and updated claims.`,
    teamId,
  };
}
