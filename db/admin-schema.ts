import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Admin users table
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  isSuper: boolean("is_super").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Admin activity logs
export const adminLogs = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  adminId: serial("admin_id").references(() => adminUsers.id),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertAdminSchema = createInsertSchema(adminUsers, {
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  email: z.string().email(),
  isSuper: z.boolean().optional(),
});

export const selectAdminSchema = createSelectSchema(adminUsers);

// Types
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type SelectAdmin = z.infer<typeof selectAdminSchema>;
