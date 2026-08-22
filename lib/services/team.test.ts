import { beforeEach, describe, expect, it, vi } from "vitest";

import { TeamServiceError } from "@/lib/services/team-errors";
import { createTeam, joinTeam } from "@/lib/services/team";
import type { TeamDb } from "@/lib/repositories/team";
import { createTestDb, seedTestUser } from "@/lib/test/db";
import { hashTeamPassword } from "@/utils/auth/team-password";
import { findTeamByName, insertTeam } from "@/lib/repositories/team";

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
import { syncUserTeamId } from "@/utils/auth/server";

function asTeamDb(db: ReturnType<typeof createTestDb>["db"]): TeamDb {
  return db as unknown as TeamDb;
}

function mockFirestoreForCreate(uid: string, teamId: string) {
  const userDoc = {
    exists: true,
    data: () => ({ teams: [] }),
  };

  const transaction = {
    get: vi.fn().mockResolvedValue(userDoc),
    set: vi.fn(),
    update: vi.fn(),
  };

  const teamsRef = {
    doc: vi.fn().mockReturnValue({ id: teamId }),
  };

  vi.mocked(adminDb.collection).mockImplementation((name: string) => {
    if (name === "teams") {
      return {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
          }),
        }),
        doc: vi.fn().mockReturnValue({}),
      } as never;
    }
    if (name === "users") {
      return {
        doc: vi.fn().mockReturnValue({}),
      } as never;
    }
    return {} as never;
  });

  vi.mocked(adminDb.runTransaction).mockImplementation(async (fn) => {
    return fn(transaction as never);
  });

  return { transaction, teamsRef };
}

describe("team service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates team in Turso and Firestore without password field", async () => {
    const { db } = createTestDb();
    const teamDb = asTeamDb(db);
    await seedTestUser(db, { id: "user-1" });

    mockFirestoreForCreate("user-1", "ignored");

    const result = await createTeam(
      {
        uid: "user-1",
        teamName: "New Family",
        teamPassword: "join-me",
      },
      teamDb
    );

    expect(result.teamId).toBeTruthy();
    expect(result.message).toContain("New Family");

    const tursoTeam = await findTeamByName("New Family", teamDb);
    expect(tursoTeam).not.toBeNull();
    expect(tursoTeam?.passwordHash).not.toBe("join-me");

    expect(syncUserTeamId).toHaveBeenCalledWith("user-1", result.teamId);
  });

  it("throws 409 when Turso team name already exists", async () => {
    const { db } = createTestDb();
    const teamDb = asTeamDb(db);
    await seedTestUser(db, { id: "user-1" });

    await insertTeam(
      {
        id: "team-existing",
        name: "Taken Name",
        passwordHash: await hashTeamPassword("pw"),
        ownerId: "user-1",
        createdBy: "user-1",
      },
      teamDb
    );

    vi.mocked(adminDb.collection).mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ empty: true }),
        }),
      }),
    } as never);

    await expect(
      createTeam({ uid: "user-2", teamName: "Taken Name" }, teamDb)
    ).rejects.toMatchObject({ status: 409 } satisfies Partial<TeamServiceError>);
  });

  it("throws 401 for wrong password on Turso team", async () => {
    const { db } = createTestDb();
    const teamDb = asTeamDb(db);
    await seedTestUser(db, { id: "user-1" });
    await seedTestUser(db, { id: "user-2", email: "user-2@example.com" });

    await insertTeam(
      {
        id: "team-join",
        name: "Join Target",
        passwordHash: await hashTeamPassword("correct"),
        ownerId: "user-1",
        createdBy: "user-1",
      },
      teamDb
    );

    vi.mocked(adminDb.collection).mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ empty: true }),
        }),
      }),
    } as never);

    await expect(
      joinTeam(
        {
          uid: "user-2",
          teamName: "Join Target",
          teamPassword: "wrong",
        },
        teamDb
      )
    ).rejects.toMatchObject({ status: 401 } satisfies Partial<TeamServiceError>);
  });
});
