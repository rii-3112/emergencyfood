/**
 * Firestore teams → Turso 移行スクリプト
 *
 * Usage:
 *   npx tsx scripts/migrate-teams-to-turso.ts --dry-run
 *   npx tsx scripts/migrate-teams-to-turso.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { backfillTeamFromLegacy, findTeamById } from "../lib/repositories/team";
import { hashTeamPassword, isTeamPasswordHashed } from "../utils/auth/team-password";

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

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
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

type TeamRole = "owner" | "admin" | "member";

function resolveMemberRole(
  uid: string,
  teamData: FirebaseFirestore.DocumentData
): TeamRole {
  const ownerId = teamData.ownerId as string;
  const admins = (teamData.admins as string[] | undefined) ?? [];

  if (uid === ownerId) return "owner";
  if (admins.includes(uid)) return "admin";
  return "member";
}

async function main() {
  initFirebase();
  const db = getFirestore();
  const snapshot = await db.collection("teams").get();

  console.log(
    `${dryRun ? "[dry-run] " : ""}Found ${snapshot.size} team(s) in Firestore`
  );

  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const name = data.name as string | undefined;
    const legacyPassword = data.password as string | undefined;

    if (!name) {
      console.warn(`Skip ${doc.id}: missing name`);
      skipped++;
      continue;
    }

    if (!legacyPassword) {
      console.log(`Skip ${doc.id} (${name}): no password field (already migrated?)`);
      skipped++;
      continue;
    }

    if (!dryRun && (await findTeamById(doc.id))) {
      console.log(`Skip ${doc.id} (${name}): already in Turso`);
      skipped++;
      continue;
    }

    const members = (data.members as string[] | undefined) ?? [];
    const ownerId =
      (data.ownerId as string | undefined) ??
      (data.createdBy as string | undefined) ??
      members[0];

    if (!ownerId) {
      console.warn(`Skip ${doc.id} (${name}): missing owner`);
      skipped++;
      continue;
    }

    const passwordHash = isTeamPasswordHashed(legacyPassword)
      ? legacyPassword
      : await hashTeamPassword(legacyPassword);

    console.log(
      `${dryRun ? "[dry-run] " : ""}Migrate ${doc.id} (${name}) → Turso`
    );

    if (!dryRun) {
      await backfillTeamFromLegacy({
        id: doc.id,
        name,
        passwordHash,
        ownerId,
        createdBy: (data.createdBy as string | undefined) ?? ownerId,
        members: members.map((userId) => ({
          userId,
          role: resolveMemberRole(userId, data),
        })),
      });

      await db.collection("teams").doc(doc.id).update({
        password: FieldValue.delete(),
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
