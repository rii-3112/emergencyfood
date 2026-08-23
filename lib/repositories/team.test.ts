import { describe, expect, it } from "vitest";

import {
  findTeamByName,
  insertTeam,
  teamNameExists,
  type TeamDb,
} from "@/lib/repositories/team";
import { createTestDb, seedTestUser } from "@/lib/test/db";
import { hashTeamPassword } from "@/utils/auth/team-password";

function asTeamDb(db: ReturnType<typeof createTestDb>["db"]): TeamDb {
  return db as unknown as TeamDb;
}

describe("team repository", () => {
  it("inserts and finds team by name", async () => {
    const { db } = createTestDb();
    const teamDb = asTeamDb(db);
    await seedTestUser(db, { id: "user-1" });

    const passwordHash = await hashTeamPassword("team-pass");
    await insertTeam(
      {
        id: "team-1",
        name: "Test Family",
        passwordHash,
        ownerId: "user-1",
        createdBy: "user-1",
      },
      teamDb
    );

    const found = await findTeamByName("Test Family", teamDb);
    expect(found).not.toBeNull();
    expect(found?.id).toBe("team-1");
    expect(found?.passwordHash).toBe(passwordHash);
  });

  it("detects duplicate team names", async () => {
    const { db } = createTestDb();
    const teamDb = asTeamDb(db);
    await seedTestUser(db, { id: "user-1" });

    const passwordHash = await hashTeamPassword("team-pass");
    await insertTeam(
      {
        id: "team-1",
        name: "Duplicate Name",
        passwordHash,
        ownerId: "user-1",
        createdBy: "user-1",
      },
      teamDb
    );

    expect(await teamNameExists("Duplicate Name", teamDb)).toBe(true);
    expect(await teamNameExists("Other Name", teamDb)).toBe(false);
  });
});
