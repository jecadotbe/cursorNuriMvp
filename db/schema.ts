import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const villageMembers = pgTable("village_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'individual' or 'group'
  circle: integer("circle").notNull(), // 1-5
  interactionFrequency: integer("interaction_frequency").notNull(), // 1-5
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title"),
  summary: text("summary"),
  messages: jsonb("messages").notNull(),
  metadata: jsonb("metadata"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messageFeedback = pgTable("message_feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  chatId: integer("chat_id").references(() => chats.id).notNull(),
  messageId: text("message_id").notNull(),
  feedbackType: text("feedback_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type VillageMember = typeof villageMembers.$inferSelect;
export type InsertVillageMember = typeof villageMembers.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type InsertChat = typeof chats.$inferInsert;
export type MessageFeedback = typeof messageFeedback.$inferSelect;
export type InsertMessageFeedback = typeof messageFeedback.$inferInsert;

// Validation schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertVillageMemberSchema = createInsertSchema(villageMembers);
export const selectVillageMemberSchema = createSelectSchema(villageMembers);
export const insertChatSchema = createInsertSchema(chats);
export const selectChatSchema = createSelectSchema(chats);
export const insertMessageFeedbackSchema = createInsertSchema(messageFeedback);
export const selectMessageFeedbackSchema = createSelectSchema(messageFeedback);
