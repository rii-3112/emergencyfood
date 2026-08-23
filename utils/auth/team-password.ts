import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export const TEAM_PASSWORD_HASH_PREFIX = "$scrypt$v1$";

export function isTeamPasswordHashed(stored: string): boolean {
  return stored.startsWith(TEAM_PASSWORD_HASH_PREFIX);
}

export async function hashTeamPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scryptAsync(plain, salt, 64)) as Buffer;
  return `${TEAM_PASSWORD_HASH_PREFIX}${salt.toString("base64")}$${hash.toString("base64")}`;
}

export interface VerifyTeamPasswordResult {
  matched: boolean;
  needsRehash: boolean;
}

export async function verifyTeamPassword(
  plain: string,
  stored: string
): Promise<VerifyTeamPasswordResult> {
  if (isTeamPasswordHashed(stored)) {
    const payload = stored.slice(TEAM_PASSWORD_HASH_PREFIX.length);
    const separator = payload.indexOf("$");
    if (separator === -1) {
      return { matched: false, needsRehash: false };
    }

    const saltB64 = payload.slice(0, separator);
    const hashB64 = payload.slice(separator + 1);
    if (!saltB64 || !hashB64) {
      return { matched: false, needsRehash: false };
    }

    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const actual = (await scryptAsync(plain, salt, 64)) as Buffer;

    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      return { matched: false, needsRehash: false };
    }

    return { matched: true, needsRehash: false };
  }

  const matched = stored === plain;
  return { matched, needsRehash: matched };
}
