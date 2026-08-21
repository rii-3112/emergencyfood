import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/auth-schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || "file:./data/auth.db",
    token: process.env.TURSO_AUTH_TOKEN,
  },
});
