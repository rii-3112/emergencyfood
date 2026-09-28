import BetterSqlite3 from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";

import * as schema from "@/lib/schema";

export type TestDb = BetterSQLite3Database<typeof schema>;

export function createTestDb(): { db: TestDb; sqlite: BetterSqlite3.Database } {
  const sqlite = new BetterSqlite3(":memory:");
  sqlite.exec(`
    CREATE TABLE \`user\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`name\` text NOT NULL,
      \`email\` text NOT NULL,
      \`email_verified\` integer DEFAULT 0 NOT NULL,
      \`image\` text,
      \`created_at\` integer NOT NULL,
      \`updated_at\` integer NOT NULL,
      \`team_id\` text,
      \`line_user_id\` text,
      \`gender\` text
    );
    CREATE UNIQUE INDEX \`user_email_unique\` ON \`user\` (\`email\`);
    CREATE TABLE \`team\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`name\` text NOT NULL,
      \`password_hash\` text NOT NULL,
      \`owner_id\` text NOT NULL,
      \`created_at\` integer NOT NULL,
      \`created_by\` text NOT NULL,
      \`stock_settings\` text,
      \`last_weekly_report_at\` integer,
      FOREIGN KEY (\`owner_id\`) REFERENCES \`user\`(\`id\`) ON UPDATE no action ON DELETE no action
    );
    CREATE UNIQUE INDEX \`team_name_unique\` ON \`team\` (\`name\`);
    CREATE TABLE \`team_member\` (
      \`team_id\` text NOT NULL,
      \`user_id\` text NOT NULL,
      \`role\` text NOT NULL,
      PRIMARY KEY (\`team_id\`, \`user_id\`),
      FOREIGN KEY (\`team_id\`) REFERENCES \`team\`(\`id\`) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON UPDATE no action ON DELETE cascade
    );
    CREATE TABLE \`invite\` (
      \`code\` text PRIMARY KEY NOT NULL,
      \`team_id\` text NOT NULL,
      \`team_name\` text NOT NULL,
      \`created_by\` text NOT NULL,
      \`created_at\` integer NOT NULL,
      \`expires_at\` integer NOT NULL,
      \`used\` integer DEFAULT 0 NOT NULL,
      FOREIGN KEY (\`team_id\`) REFERENCES \`team\`(\`id\`) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (\`created_by\`) REFERENCES \`user\`(\`id\`) ON UPDATE no action ON DELETE no action
    );
    CREATE TABLE \`supply\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`team_id\` text NOT NULL,
      \`uid\` text NOT NULL,
      \`name\` text NOT NULL,
      \`quantity\` integer NOT NULL,
      \`expiry_date\` text NOT NULL,
      \`expiry_dates\` text,
      \`is_archived\` integer DEFAULT 0 NOT NULL,
      \`category\` text NOT NULL,
      \`unit\` text NOT NULL,
      \`amount\` integer,
      \`purchase_location\` text,
      \`label\` text,
      \`storage_location\` text,
      \`registered_at\` integer NOT NULL,
      \`last_consumed_date\` text,
      \`consumption_count\` integer DEFAULT 0 NOT NULL,
      \`zero_stock_since\` text,
      \`updated_at\` integer,
      FOREIGN KEY (\`team_id\`) REFERENCES \`team\`(\`id\`) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (\`uid\`) REFERENCES \`user\`(\`id\`) ON UPDATE no action ON DELETE no action
    );
    CREATE TABLE \`supply_history\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`team_id\` text NOT NULL,
      \`name\` text NOT NULL,
      \`category\` text NOT NULL,
      \`unit\` text NOT NULL,
      \`total_consumed\` integer DEFAULT 0 NOT NULL,
      \`average_stock\` integer DEFAULT 0 NOT NULL,
      \`purchase_locations\` text DEFAULT '[]' NOT NULL,
      \`last_used_date\` text,
      \`first_registered_date\` text,
      \`has_reviews\` integer DEFAULT 0 NOT NULL,
      \`review_count\` integer DEFAULT 0 NOT NULL,
      \`archived_at\` integer NOT NULL,
      \`archived_by\` text NOT NULL,
      FOREIGN KEY (\`team_id\`) REFERENCES \`team\`(\`id\`) ON UPDATE no action ON DELETE cascade
    );
    CREATE TABLE \`supply_review\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`supply_id\` text NOT NULL,
      \`team_id\` text NOT NULL,
      \`content\` text NOT NULL,
      \`user_name\` text NOT NULL,
      \`user_id\` text NOT NULL,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`supply_id\`) REFERENCES \`supply\`(\`id\`) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (\`team_id\`) REFERENCES \`team\`(\`id\`) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON UPDATE no action ON DELETE no action
    );
    CREATE TABLE \`disaster_board\` (
      \`team_id\` text PRIMARY KEY NOT NULL,
      \`data\` text NOT NULL,
      \`last_updated\` integer NOT NULL,
      \`last_updated_by\` text NOT NULL,
      FOREIGN KEY (\`team_id\`) REFERENCES \`team\`(\`id\`) ON UPDATE no action ON DELETE cascade
    );
    CREATE TABLE \`handbook_checklist\` (
      \`team_id\` text PRIMARY KEY NOT NULL,
      \`checked_item_ids\` text DEFAULT '[]' NOT NULL,
      \`checked_pet_items\` text DEFAULT '{}' NOT NULL,
      \`last_updated\` integer NOT NULL,
      \`last_updated_by\` text NOT NULL,
      FOREIGN KEY (\`team_id\`) REFERENCES \`team\`(\`id\`) ON UPDATE no action ON DELETE cascade
    );
    CREATE TABLE \`line_auth_code\` (
      \`line_user_id\` text PRIMARY KEY NOT NULL,
      \`code\` text NOT NULL,
      \`expire_at\` integer NOT NULL,
      \`created_at\` integer NOT NULL
    );
  `);

  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

export async function seedTestUser(
  db: TestDb,
  params: { id: string; email?: string; name?: string }
) {
  const now = new Date();
  await db.insert(schema.user).values({
    id: params.id,
    name: params.name ?? "Test User",
    email: params.email ?? `${params.id}@example.com`,
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
  });
}
