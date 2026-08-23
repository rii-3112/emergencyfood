/**
 * Firestore supplies / supply_history / supplyReviews → Turso 移行スクリプト
 *
 * Usage:
 *   npx tsx scripts/migrate-supplies-to-turso.ts --dry-run
 *   npx tsx scripts/migrate-supplies-to-turso.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import {
  findSupplyById,
  findSupplyHistoryById,
  findReviewById,
  insertReview,
  insertSupply,
  upsertSupplyHistory,
} from "../lib/repositories/supply";
import type { ExpiryInfo } from "../types";

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

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds: number }).seconds === "number"
  ) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return new Date();
}

async function migrateSupplies() {
  const firestore = getFirestore();
  const snapshot = await firestore.collection("supplies").get();
  console.log(
    `${dryRun ? "[dry-run] " : ""}Found ${snapshot.size} supply(ies)`
  );

  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (await findSupplyById(doc.id)) {
      skipped++;
      continue;
    }

    const expiryDates = (data.expiryDates as ExpiryInfo[] | undefined) ?? null;
    const registeredAt = toDate(data.registeredAt);

    console.log(
      `${dryRun ? "[dry-run] " : ""}Migrate supply ${doc.id} (${data.name})`
    );

    if (!dryRun) {
      await insertSupply({
        id: doc.id,
        teamId: data.teamId as string,
        uid: (data.uid as string) || "unknown",
        name: data.name as string,
        quantity: Number(data.quantity) || 0,
        expiryDate: (data.expiryDate as string) || "",
        expiryDates,
        isArchived: Boolean(data.isArchived),
        category: (data.category as string) || "other",
        unit: (data.unit as string) || "個",
        amount: data.amount != null ? Number(data.amount) : null,
        purchaseLocation: (data.purchaseLocation as string) ?? null,
        label: (data.label as string) ?? null,
        storageLocation: (data.storageLocation as string) ?? "未設定",
        registeredAt,
        lastConsumedDate: (data.lastConsumedDate as string) ?? null,
        consumptionCount: Number(data.consumptionCount) || 0,
        zeroStockSince: (data.zeroStockSince as string) ?? null,
      });
    }
    migrated++;
  }

  console.log(`Supplies: migrated=${migrated} skipped=${skipped}`);
}

async function migrateHistory() {
  const firestore = getFirestore();
  const snapshot = await firestore.collection("supply_history").get();
  console.log(
    `${dryRun ? "[dry-run] " : ""}Found ${snapshot.size} history doc(s)`
  );

  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (await findSupplyHistoryById(doc.id)) {
      skipped++;
      continue;
    }

    console.log(
      `${dryRun ? "[dry-run] " : ""}Migrate history ${doc.id} (${data.name})`
    );

    if (!dryRun) {
      await upsertSupplyHistory({
        id: doc.id,
        teamId: data.teamId as string,
        name: data.name as string,
        category: (data.category as string) || "other",
        unit: (data.unit as string) || "個",
        totalConsumed: Number(data.totalConsumed) || 0,
        averageStock: Number(data.averageStock) || 0,
        purchaseLocations: (data.purchaseLocations as string[]) || [],
        lastUsedDate: (data.lastUsedDate as string) ?? null,
        firstRegisteredDate: (data.firstRegisteredDate as string) ?? null,
        hasReviews: Boolean(data.hasReviews),
        reviewCount: Number(data.reviewCount) || 0,
        archivedBy: (data.archivedBy as string) || "unknown",
      });
    }
    migrated++;
  }

  console.log(`History: migrated=${migrated} skipped=${skipped}`);
}

async function migrateReviews() {
  const firestore = getFirestore();
  const snapshot = await firestore.collection("supplyReviews").get();
  console.log(`${dryRun ? "[dry-run] " : ""}Found ${snapshot.size} review(s)`);

  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (await findReviewById(doc.id)) {
      skipped++;
      continue;
    }

    const supplyId = data.supplyId as string | undefined;
    const teamId = data.teamId as string | undefined;
    if (!supplyId || !teamId) {
      skipped++;
      continue;
    }

    console.log(`${dryRun ? "[dry-run] " : ""}Migrate review ${doc.id}`);

    if (!dryRun) {
      await insertReview({
        id: doc.id,
        supplyId,
        teamId,
        content: (data.content as string) || (data.text as string) || "",
        userName: (data.userName as string) || "ユーザー",
        userId: (data.userId as string) || "unknown",
      });
    }
    migrated++;
  }

  console.log(`Reviews: migrated=${migrated} skipped=${skipped}`);
}

async function main() {
  initFirebase();
  await migrateSupplies();
  await migrateHistory();
  await migrateReviews();
  console.log(`Done${dryRun ? " (dry-run)" : ""}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
