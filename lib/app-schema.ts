import { relations } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth-schema";

export const team = sqliteTable("team", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  createdBy: text("created_by").notNull(),
});

export const teamMember = sqliteTable(
  "team_member",
  {
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
  },
  (table) => [primaryKey({ columns: [table.teamId, table.userId] })]
);

export const invite = sqliteTable("invite", {
  code: text("code").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => team.id, { onDelete: "cascade" }),
  teamName: text("team_name").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  used: integer("used", { mode: "boolean" }).notNull().default(false),
});

export const supply = sqliteTable("supply", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => team.id, { onDelete: "cascade" }),
  uid: text("uid")
    .notNull()
    .references(() => user.id),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  expiryDate: text("expiry_date").notNull(),
  /** JSON: ExpiryInfo[] */
  expiryDates: text("expiry_dates"),
  isArchived: integer("is_archived", { mode: "boolean" })
    .notNull()
    .default(false),
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  amount: integer("amount"),
  purchaseLocation: text("purchase_location"),
  label: text("label"),
  storageLocation: text("storage_location"),
  registeredAt: integer("registered_at", { mode: "timestamp_ms" }).notNull(),
  lastConsumedDate: text("last_consumed_date"),
  consumptionCount: integer("consumption_count").notNull().default(0),
  zeroStockSince: text("zero_stock_since"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});

export const supplyHistory = sqliteTable("supply_history", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => team.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  totalConsumed: integer("total_consumed").notNull().default(0),
  averageStock: integer("average_stock").notNull().default(0),
  /** JSON: string[] */
  purchaseLocations: text("purchase_locations").notNull().default("[]"),
  lastUsedDate: text("last_used_date"),
  firstRegisteredDate: text("first_registered_date"),
  hasReviews: integer("has_reviews", { mode: "boolean" })
    .notNull()
    .default(false),
  reviewCount: integer("review_count").notNull().default(0),
  archivedAt: integer("archived_at", { mode: "timestamp_ms" }).notNull(),
  archivedBy: text("archived_by").notNull(),
});

export const supplyReview = sqliteTable("supply_review", {
  id: text("id").primaryKey(),
  supplyId: text("supply_id")
    .notNull()
    .references(() => supply.id, { onDelete: "cascade" }),
  teamId: text("team_id")
    .notNull()
    .references(() => team.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  userName: text("user_name").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const teamRelations = relations(team, ({ many, one }) => ({
  owner: one(user, {
    fields: [team.ownerId],
    references: [user.id],
  }),
  members: many(teamMember),
  invites: many(invite),
  supplies: many(supply),
}));

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
  team: one(team, {
    fields: [teamMember.teamId],
    references: [team.id],
  }),
  user: one(user, {
    fields: [teamMember.userId],
    references: [user.id],
  }),
}));

export const inviteRelations = relations(invite, ({ one }) => ({
  team: one(team, {
    fields: [invite.teamId],
    references: [team.id],
  }),
  creator: one(user, {
    fields: [invite.createdBy],
    references: [user.id],
  }),
}));

export const supplyRelations = relations(supply, ({ one, many }) => ({
  team: one(team, {
    fields: [supply.teamId],
    references: [team.id],
  }),
  owner: one(user, {
    fields: [supply.uid],
    references: [user.id],
  }),
  reviews: many(supplyReview),
}));

export const supplyHistoryRelations = relations(supplyHistory, ({ one }) => ({
  team: one(team, {
    fields: [supplyHistory.teamId],
    references: [team.id],
  }),
}));

export const supplyReviewRelations = relations(supplyReview, ({ one }) => ({
  supply: one(supply, {
    fields: [supplyReview.supplyId],
    references: [supply.id],
  }),
  team: one(team, {
    fields: [supplyReview.teamId],
    references: [team.id],
  }),
  user: one(user, {
    fields: [supplyReview.userId],
    references: [user.id],
  }),
}));
