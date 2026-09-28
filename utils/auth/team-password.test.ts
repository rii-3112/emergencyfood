import { describe, expect, it } from "vitest";

import {
  hashTeamPassword,
  isTeamPasswordHashed,
  verifyTeamPassword,
} from "./team-password";

describe("team-password", () => {
  it("hashes password into prefixed format", async () => {
    const hashed = await hashTeamPassword("secret123");
    expect(isTeamPasswordHashed(hashed)).toBe(true);
    expect(hashed.startsWith("$scrypt$v1$")).toBe(true);
  });

  it("produces different hashes for the same plain password", async () => {
    const a = await hashTeamPassword("secret123");
    const b = await hashTeamPassword("secret123");
    expect(a).not.toBe(b);
  });

  it("verifies correct password against hash", async () => {
    const hashed = await hashTeamPassword("secret123");
    const result = await verifyTeamPassword("secret123", hashed);
    expect(result).toEqual({ matched: true, needsRehash: false });
  });

  it("rejects incorrect password against hash", async () => {
    const hashed = await hashTeamPassword("secret123");
    const result = await verifyTeamPassword("wrong", hashed);
    expect(result).toEqual({ matched: false, needsRehash: false });
  });

  it("supports legacy plaintext verification with rehash flag", async () => {
    const result = await verifyTeamPassword("legacy-pass", "legacy-pass");
    expect(result).toEqual({ matched: true, needsRehash: true });
  });

  it("rejects incorrect password for legacy plaintext", async () => {
    const result = await verifyTeamPassword("wrong", "legacy-pass");
    expect(result).toEqual({ matched: false, needsRehash: false });
  });
});
