import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import * as schema from "@/lib/schema";

export type TestDb = BetterSQLite3Database<typeof schema>;

export function createTestDb(): { db: TestDb; sqlite: Database.Database } {
  const sqlite = new Database(":memory:");
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
      \`line_user_id\` text
    );
    CREATE UNIQUE INDEX \`user_email_unique\` ON \`user\` (\`email\`);
    CREATE TABLE \`team\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`name\` text NOT NULL,
      \`password_hash\` text NOT NULL,
      \`owner_id\` text NOT NULL,
      \`created_at\` integer NOT NULL,
      \`created_by\` text NOT NULL,
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
