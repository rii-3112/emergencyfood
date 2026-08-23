import { randomUUID } from "crypto";

import {
  findInviteByCode,
  insertInvite,
  markInviteUsed,
} from "@/lib/repositories/invite";
import {
  findTeamById,
  insertTeamMember,
  isTeamMember,
  type TeamDb,
} from "@/lib/repositories/team";
import { TeamServiceError } from "@/lib/services/team-errors";
import { syncUserTeamId } from "@/utils/auth/server";
import { adminDb } from "@/utils/firebase/admin";

export interface CreateInviteInput {
  uid: string;
  teamId: string;
  teamName?: string;
}

export interface CreateInviteResult {
  inviteCode: string;
  expiresAt: string;
}

export interface InviteInfoResult {
  teamId: string;
  teamName: string;
}

export interface JoinByInviteInput {
  uid: string;
  inviteCode: string;
}

export interface JoinByInviteResult {
  message: string;
  teamId: string;
}

function assertInviteValid(invite: { expiresAt: Date; used: boolean }): void {
  if (invite.used) {
    throw new TeamServiceError("Invite code has already been used", 410);
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    throw new TeamServiceError("Invite code has expired", 410);
  }
}

export async function createInvite(
  input: CreateInviteInput,
  database?: TeamDb
): Promise<CreateInviteResult> {
  const { uid, teamId } = input;

  if (!teamId) {
    throw new TeamServiceError("Team ID is required", 400);
  }

  const tursoTeam = await findTeamById(teamId, database);
  const firestoreTeam = await adminDb.collection("teams").doc(teamId).get();

  if (!tursoTeam && !firestoreTeam.exists) {
    throw new TeamServiceError("Team not found", 404);
  }

  const isMember =
    (await isTeamMember(teamId, uid, database)) ||
    ((firestoreTeam.data()?.members as string[] | undefined) ?? []).includes(
      uid
    );

  if (!isMember) {
    throw new TeamServiceError("You are not a member of this team", 403);
  }

  const teamName =
    input.teamName ||
    tursoTeam?.name ||
    (firestoreTeam.data()?.name as string | undefined) ||
    "";

  const inviteCode = randomUUID().split("-")[0].toUpperCase();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await insertInvite(
    {
      code: inviteCode,
      teamId,
      teamName,
      createdBy: uid,
      expiresAt,
    },
    database
  );

  return {
    inviteCode,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function getInviteInfo(
  code: string,
  database?: TeamDb
): Promise<InviteInfoResult> {
  if (!code) {
    throw new TeamServiceError("Invite code is required", 400);
  }

  const invite = await findInviteByCode(code, database);
  if (!invite) {
    throw new TeamServiceError("Invalid or expired invite code", 404);
  }

  assertInviteValid(invite);

  return {
    teamId: invite.teamId,
    teamName: invite.teamName,
  };
}

export async function joinTeamByInvite(
  input: JoinByInviteInput,
  database?: TeamDb
): Promise<JoinByInviteResult> {
  const { uid, inviteCode } = input;

  if (!inviteCode) {
    throw new TeamServiceError("Invite code is required", 400);
  }

  const invite = await findInviteByCode(inviteCode, database);
  if (!invite) {
    throw new TeamServiceError("Invalid or expired invite code", 404);
  }

  assertInviteValid(invite);

  const { teamId, teamName } = invite;

  await adminDb.runTransaction(async (transaction) => {
    const userDocRef = adminDb.collection("users").doc(uid);
    const teamDocRef = adminDb.collection("teams").doc(teamId);

    const userDoc = await transaction.get(userDocRef);
    const teamDoc = await transaction.get(teamDocRef);

    if (!userDoc.exists) {
      throw new TeamServiceError("User document not found.", 500);
    }
    if (!teamDoc.exists) {
      throw new TeamServiceError("Team document not found.", 500);
    }

    const userData = userDoc.data();
    const teamData = teamDoc.data();
    const currentTeamMembers = teamData?.members || [];
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

  await insertTeamMember({ teamId, userId: uid, role: "member" }, database);
  await markInviteUsed(inviteCode, database);
  await syncUserTeamId(uid, teamId);

  return {
    message: `Successfully joined team "${teamName}"`,
    teamId,
  };
}
