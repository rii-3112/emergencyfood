import { describe, expect, it } from "vitest";

import {
  findInviteByCode,
  insertInvite,
} from "@/lib/repositories/invite";
import { insertTeam, type TeamDb } from "@/lib/repositories/team";
import { createTestDb, seedTestUser } from "@/lib/test/db";
import { hashTeamPassword } from "@/utils/auth/team-password";

function asTeamDb(db: ReturnType<typeof createTestDb>["db"]): TeamDb {
  return db as unknown as TeamDb;
}

describe("invite repository", () => {
  it("inserts and finds an invite by code", async () => {
    const { db } = createTestDb();
    const teamDb = asTeamDb(db);
    await seedTestUser(db, { id: "user-1" });

    await insertTeam(
      {
        id: "team-1",
        name: "Invite Team",
        passwordHash: await hashTeamPassword("secret"),
        ownerId: "user-1",
        createdBy: "user-1",
      },
      teamDb
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const created = await insertInvite(
      {
        code: "ABC123",
        teamId: "team-1",
        teamName: "Invite Team",
        createdBy: "user-1",
        expiresAt,
      },
      teamDb
    );

    expect(created.code).toBe("ABC123");
    expect(created.used).toBe(false);

    const found = await findInviteByCode("ABC123", teamDb);
    expect(found).not.toBeNull();
    expect(found?.teamId).toBe("team-1");
    expect(found?.teamName).toBe("Invite Team");
    expect(found?.createdBy).toBe("user-1");
  });

  it("returns null for unknown invite codes", async () => {
    const { db } = createTestDb();
    const found = await findInviteByCode("MISSING", asTeamDb(db));
    expect(found).toBeNull();
  });
});
