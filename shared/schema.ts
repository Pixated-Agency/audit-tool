import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  jsonb,
  index,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for express-session
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  googleId: varchar("google_id").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audits table
export const audits = pgTable("audits", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  platform: varchar("platform").notNull(), // 'google-ads', 'google-analytics', 'facebook-ads', 'tiktok-ads', 'microsoft-ads'
  status: varchar("status").notNull().default("processing"), // 'processing', 'completed', 'failed'
  accountId: varchar("account_id"), // Connected account ID
  accountName: varchar("account_name"), // Display name for the account
  reportFormat: varchar("report_format").notNull(), // 'pdf', 'powerpoint', 'google-slides', 'google-doc'
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  reportUrl: varchar("report_url"), // URL to download the completed report
  auditData: jsonb("audit_data"), // Store audit results and metadata
});

// Account connections table
export const accountConnections = pgTable("account_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  platform: varchar("platform").notNull(),
  accountId: varchar("account_id").notNull(),
  accountName: varchar("account_name").notNull(),
  accessToken: text("access_token"), // Encrypted access token
  refreshToken: text("refresh_token"), // Encrypted refresh token
  expiresAt: timestamp("expires_at"),
  isActive: integer("is_active").notNull().default(1), // 1 for active, 0 for inactive
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schema definitions
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditSchema = createInsertSchema(audits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertAccountConnectionSchema = createInsertSchema(accountConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Audit = typeof audits.$inferSelect;
export type UpsertAudit = typeof audits.$inferInsert;
export type InsertAudit = z.infer<typeof insertAuditSchema>;

export type AccountConnection = typeof accountConnections.$inferSelect;
export type UpsertAccountConnection = typeof accountConnections.$inferInsert;
export type InsertAccountConnection = z.infer<typeof insertAccountConnectionSchema>;
