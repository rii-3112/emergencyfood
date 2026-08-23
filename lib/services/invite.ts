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
  if (!tursoTeam) {
    throw new TeamServiceError("Team not found", 404);
  }

  if (!(await isTeamMember(teamId, uid, database))) {
    throw new TeamServiceError("You are not a member of this team", 403);
  }

  const teamName = input.teamName || tursoTeam.name;

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

  if (!(await isTeamMember(teamId, uid, database))) {
    await insertTeamMember({ teamId, userId: uid, role: "member" }, database);
  }

  await markInviteUsed(inviteCode, database);
  await syncUserTeamId(uid, teamId);

  return {
    message: `Successfully joined team "${teamName}"`,
    teamId,
  };
}
