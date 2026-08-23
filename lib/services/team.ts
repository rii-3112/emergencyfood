import { randomUUID } from "crypto";

import {
  findTeamById,
  findTeamByName,
  getMemberRole,
  insertTeam,
  insertTeamMember,
  isTeamMember,
  listTeamMemberIds,
  listTeamMembersWithUsers,
  teamNameExists,
  updateMemberRole,
  updateTeamLastWeeklyReportAt,
  updateTeamName,
  updateTeamStockSettings,
  type TeamDb,
  type TeamRole,
} from "@/lib/repositories/team";
import { TeamServiceError } from "@/lib/services/team-errors";
import { syncUserTeamId } from "@/utils/auth/server";
import {
  hashTeamPassword,
  verifyTeamPassword,
} from "@/utils/auth/team-password";
import type { Team, TeamMember, TeamStockSettings } from "@/types";

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

function isOwnerOrAdmin(role: TeamRole | null): boolean {
  return role === "owner" || role === "admin";
}

async function requireTeamRole(
  teamId: string,
  uid: string,
  database?: TeamDb
): Promise<TeamRole> {
  const role = await getMemberRole(teamId, uid, database);
  if (!role) {
    throw new TeamServiceError("You are not a member of this team", 403);
  }
  return role;
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
  if (!tursoTeam) {
    throw new TeamServiceError("Team not found", 404);
  }

  const result = await verifyTeamPassword(teamPassword, tursoTeam.passwordHash);
  if (!result.matched) {
    throw new TeamServiceError("Incorrect team name or password", 401);
  }

  return { teamId: tursoTeam.id };
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

  if (!(await isTeamMember(teamId, uid, database))) {
    await insertTeamMember({ teamId, userId: uid, role: "member" }, database);
  }

  await syncUserTeamId(uid, teamId);

  return {
    message: `Successfully joined team "${trimmedName}" and updated claims.`,
    teamId,
  };
}

export async function getTeamDetail(
  teamId: string,
  requesterId: string,
  database?: TeamDb
): Promise<{ team: Team; members: TeamMember[] }> {
  const teamRecord = await findTeamById(teamId, database);
  if (!teamRecord) {
    throw new TeamServiceError("チームが見つかりません", 404);
  }

  if (!(await isTeamMember(teamId, requesterId, database))) {
    throw new TeamServiceError("このチームのメンバーではありません", 403);
  }

  const memberRows = await listTeamMembersWithUsers(teamId, database);
  const memberIds = memberRows.map((m) => m.uid);
  const admins = memberRows
    .filter((m) => m.role === "owner" || m.role === "admin")
    .map((m) => m.uid);

  const team: Team = {
    id: teamRecord.id,
    name: teamRecord.name,
    ownerId: teamRecord.ownerId,
    createdAt: teamRecord.createdAt,
    createdBy: teamRecord.createdBy,
    members: memberIds,
    admins,
    stockSettings: teamRecord.stockSettings ?? undefined,
  };

  const members: TeamMember[] = memberRows.map((m) => ({
    uid: m.uid,
    email: m.email ?? "",
    displayName: m.displayName,
    role: m.role,
  }));

  return { team, members };
}

export async function updateTeamNameForUser(
  params: { uid: string; teamId: string; newTeamName: string },
  database?: TeamDb
): Promise<{ teamName: string }> {
  const trimmedName = params.newTeamName.trim();
  if (trimmedName.length < 1 || trimmedName.length > 50) {
    throw new TeamServiceError(
      "Team name must be between 1 and 50 characters",
      400
    );
  }

  const role = await requireTeamRole(params.teamId, params.uid, database);
  if (!isOwnerOrAdmin(role)) {
    throw new TeamServiceError(
      "Only team owners or admins can change the team name",
      403
    );
  }

  if (await teamNameExists(trimmedName, database)) {
    const existing = await findTeamByName(trimmedName, database);
    if (existing && existing.id !== params.teamId) {
      throw new TeamServiceError("Team name already exists", 409);
    }
  }

  await updateTeamName(params.teamId, trimmedName, database);
  return { teamName: trimmedName };
}

export async function updateStockSettingsForUser(
  params: {
    uid: string;
    teamId: string;
    stockSettings: Partial<TeamStockSettings>;
  },
  database?: TeamDb
): Promise<{ stockSettings: TeamStockSettings }> {
  const role = await requireTeamRole(params.teamId, params.uid, database);
  if (!isOwnerOrAdmin(role)) {
    throw new TeamServiceError(
      "Only team owners or admins can update stock settings",
      403
    );
  }

  const teamRecord = await findTeamById(params.teamId, database);
  if (!teamRecord) {
    throw new TeamServiceError("Team not found", 404);
  }

  const previousStock = teamRecord.stockSettings ?? undefined;
  const incoming = params.stockSettings;

  if (
    typeof incoming.householdSize !== "number" ||
    incoming.householdSize < 1 ||
    incoming.householdSize > 50
  ) {
    throw new TeamServiceError("Household size must be between 1 and 50", 400);
  }

  if (
    typeof incoming.stockDays !== "number" ||
    ![3, 7, 14, 30].includes(incoming.stockDays)
  ) {
    throw new TeamServiceError("Stock days must be 3, 7, 14, or 30", 400);
  }

  const needsSanitaryResolved =
    typeof incoming.needsSanitarySupplies === "boolean"
      ? incoming.needsSanitarySupplies
      : typeof previousStock?.needsSanitarySupplies === "boolean"
        ? previousStock.needsSanitarySupplies
        : undefined;

  const settingsToSave: TeamStockSettings = {
    householdSize: incoming.householdSize,
    stockDays: incoming.stockDays,
    hasPets: incoming.hasPets || false,
    dogCount: incoming.dogCount || 0,
    catCount: incoming.catCount || 0,
    updatedAt: new Date().toISOString(),
    ...(needsSanitaryResolved !== undefined
      ? { needsSanitarySupplies: needsSanitaryResolved }
      : {}),
    ...(incoming.useDetailedComposition
      ? {
          useDetailedComposition: true,
          composition: {
            adult: Number(incoming.composition?.adult || 0),
            child: Number(incoming.composition?.child || 0),
            infant: Number(incoming.composition?.infant || 0),
            elderly: Number(incoming.composition?.elderly || 0),
          },
        }
      : {}),
    ...(incoming.notifications
      ? {
          notifications: {
            enabled: incoming.notifications.enabled !== false,
            criticalStock: incoming.notifications.criticalStock !== false,
            expiryNear: incoming.notifications.expiryNear !== false,
          },
        }
      : {}),
    ...(incoming.stockLevel ? { stockLevel: incoming.stockLevel } : {}),
  };

  await updateTeamStockSettings(params.teamId, settingsToSave, database);
  return { stockSettings: settingsToSave };
}

export async function addTeamAdmin(
  params: { uid: string; teamId: string; targetUserId: string },
  database?: TeamDb
): Promise<void> {
  const role = await requireTeamRole(params.teamId, params.uid, database);
  if (!isOwnerOrAdmin(role)) {
    throw new TeamServiceError("管理者権限が必要です", 403);
  }

  const targetRole = await getMemberRole(
    params.teamId,
    params.targetUserId,
    database
  );
  if (!targetRole) {
    throw new TeamServiceError(
      "指定されたユーザーはチームのメンバーではありません",
      400
    );
  }
  if (targetRole === "owner" || targetRole === "admin") {
    throw new TeamServiceError("指定されたユーザーは既に管理者です", 400);
  }

  await updateMemberRole(params.teamId, params.targetUserId, "admin", database);
}

export async function removeTeamAdmin(
  params: { uid: string; teamId: string; targetUserId: string },
  database?: TeamDb
): Promise<void> {
  const role = await requireTeamRole(params.teamId, params.uid, database);
  if (!isOwnerOrAdmin(role)) {
    throw new TeamServiceError("管理者権限が必要です", 403);
  }

  const teamRecord = await findTeamById(params.teamId, database);
  if (!teamRecord) {
    throw new TeamServiceError("チームが見つかりません", 404);
  }

  if (params.targetUserId === teamRecord.ownerId) {
    throw new TeamServiceError(
      "オーナーを管理者から削除することはできません",
      400
    );
  }

  const targetRole = await getMemberRole(
    params.teamId,
    params.targetUserId,
    database
  );
  if (targetRole !== "admin") {
    throw new TeamServiceError("指定されたユーザーは管理者ではありません", 400);
  }

  await updateMemberRole(
    params.teamId,
    params.targetUserId,
    "member",
    database
  );
}

export async function markTeamNotified(
  teamId: string,
  at: Date,
  database?: TeamDb
): Promise<void> {
  await updateTeamLastWeeklyReportAt(teamId, at, database);
}

export async function buildTeamForApi(
  teamId: string,
  database?: TeamDb
): Promise<Team | null> {
  const teamRecord = await findTeamById(teamId, database);
  if (!teamRecord) return null;

  const memberRows = await listTeamMembersWithUsers(teamId, database);
  const memberIds = await listTeamMemberIds(teamId, database);
  const admins = memberRows
    .filter((m) => m.role === "owner" || m.role === "admin")
    .map((m) => m.uid);

  return {
    id: teamRecord.id,
    name: teamRecord.name,
    ownerId: teamRecord.ownerId,
    createdAt: teamRecord.createdAt,
    createdBy: teamRecord.createdBy,
    members: memberIds,
    admins,
    stockSettings: teamRecord.stockSettings ?? undefined,
  };
}
