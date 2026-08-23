/**
 * Firestore invites → Turso 移行スクリプト
 *
 * Usage:
 *   npx tsx scripts/migrate-invites-to-turso.ts --dry-run
 *   npx tsx scripts/migrate-invites-to-turso.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { findInviteByCode, insertInvite } from "../lib/repositories/invite";

function loadEnvFile(filename: string) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const dryRun = process.argv.includes("--dry-run");

function initFirebase() {
  if (getApps().length > 0) return;
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

async function main() {
  initFirebase();
  const firestore = getFirestore();
  const snapshot = await firestore.collection("invites").get();

  console.log(
    `${dryRun ? "[dry-run] " : ""}Found ${snapshot.size} invite(s) in Firestore`
  );

  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const code = doc.id;
    const teamId = data.teamId as string | undefined;
    const teamName = (data.teamName as string | undefined) || "";
    const createdBy = (data.createdBy as string | undefined) || "unknown";
    const expiresAt = toDate(data.expiresAt);
    const createdAt = toDate(data.createdAt) ?? new Date();
    const used = Boolean(data.used);

    if (!teamId || !expiresAt) {
      console.warn(`Skip ${code}: missing teamId or expiresAt`);
      skipped++;
      continue;
    }

    if (await findInviteByCode(code)) {
      console.log(`Skip ${code}: already in Turso`);
      skipped++;
      continue;
    }

    console.log(
      `${dryRun ? "[dry-run] " : ""}Migrate invite ${code} → team ${teamId}`
    );

    if (!dryRun) {
      await insertInvite({
        code,
        teamId,
        teamName,
        createdBy,
        createdAt,
        expiresAt,
        used,
      });
    }
    migrated++;
  }

  console.log(
    `Done. migrated=${migrated} skipped=${skipped}${dryRun ? " (dry-run)" : ""}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
