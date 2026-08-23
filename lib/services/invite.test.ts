import { beforeEach, describe, expect, it, vi } from "vitest";

import { createInvite, getInviteInfo } from "@/lib/services/invite";
import { TeamServiceError } from "@/lib/services/team-errors";
import { insertTeam, type TeamDb } from "@/lib/repositories/team";
import { createTestDb, seedTestUser } from "@/lib/test/db";
import { hashTeamPassword } from "@/utils/auth/team-password";

vi.mock("@/utils/firebase/admin", () => ({
  adminDb: {
    collection: vi.fn(),
    runTransaction: vi.fn(),
  },
}));

vi.mock("@/utils/auth/server", () => ({
  syncUserTeamId: vi.fn(),
}));

import { adminDb } from "@/utils/firebase/admin";

function asTeamDb(db: ReturnType<typeof createTestDb>["db"]): TeamDb {
  return db as unknown as TeamDb;
}

function mockFirestoreTeam(teamId: string, members: string[], name: string) {
  vi.mocked(adminDb.collection).mockImplementation((collectionName: string) => {
    if (collectionName === "teams") {
      return {
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({ members, name }),
          }),
        }),
      } as never;
    }
    return {} as never;
  });
}

describe("invite service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an invite for a team member", async () => {
    const { db } = createTestDb();
    const teamDb = asTeamDb(db);
    await seedTestUser(db, { id: "user-1" });

    await insertTeam(
      {
        id: "team-1",
        name: "Family",
        passwordHash: await hashTeamPassword("pw"),
        ownerId: "user-1",
        createdBy: "user-1",
      },
      teamDb
    );

    mockFirestoreTeam("team-1", ["user-1"], "Family");

    const result = await createInvite(
      { uid: "user-1", teamId: "team-1" },
      teamDb
    );

    expect(result.inviteCode).toMatch(/^[A-Z0-9]+$/);
    expect(result.expiresAt).toBeTruthy();

    const info = await getInviteInfo(result.inviteCode, teamDb);
    expect(info).toEqual({ teamId: "team-1", teamName: "Family" });
  });

  it("rejects non-members when creating invites", async () => {
    const { db } = createTestDb();
    const teamDb = asTeamDb(db);
    await seedTestUser(db, { id: "user-1" });
    await seedTestUser(db, { id: "user-2", email: "user-2@example.com" });

    await insertTeam(
      {
        id: "team-1",
        name: "Family",
        passwordHash: await hashTeamPassword("pw"),
        ownerId: "user-1",
        createdBy: "user-1",
      },
      teamDb
    );

    mockFirestoreTeam("team-1", ["user-1"], "Family");

    await expect(
      createInvite({ uid: "user-2", teamId: "team-1" }, teamDb)
    ).rejects.toMatchObject({
      status: 403,
    } satisfies Partial<TeamServiceError>);
  });

  it("returns 404 for unknown invite codes", async () => {
    const { db } = createTestDb();
    await expect(getInviteInfo("NOPE", asTeamDb(db))).rejects.toMatchObject({
      status: 404,
    } satisfies Partial<TeamServiceError>);
  });
});
