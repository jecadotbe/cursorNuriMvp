import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

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
  type: text("type").notNull(), 
  circle: integer("circle").notNull(), 
  interactionFrequency: integer("interaction_frequency").notNull(), 
  emotionalContext: jsonb("emotional_context"), 
  relationshipStrength: integer("relationship_strength"), 
  lastInteraction: timestamp("last_interaction"),
  metadata: jsonb("metadata"), 
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const relationshipDynamics = pgTable("relationship_dynamics", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => villageMembers.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  emotionalState: text("emotional_state").notNull(), 
  contextVector: jsonb("context_vector"), 
  analysisResult: jsonb("analysis_result"), 
  createdAt: timestamp("created_at").defaultNow(),
});

export const interactionHistory = pgTable("interaction_history", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => villageMembers.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  interactionType: text("interaction_type").notNull(), 
  emotionalImpact: integer("emotional_impact"), 
  details: jsonb("details"), 
  memoryId: text("memory_id"), 
  createdAt: timestamp("created_at").defaultNow(),
});

export const villageMembersRelations = relations(villageMembers, ({ many }) => ({
  dynamics: many(relationshipDynamics),
  interactions: many(interactionHistory),
}));

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertVillageMemberSchema = createInsertSchema(villageMembers);
export const selectVillageMemberSchema = createSelectSchema(villageMembers);
export const insertRelationshipDynamicsSchema = createInsertSchema(relationshipDynamics);
export const selectRelationshipDynamicsSchema = createSelectSchema(relationshipDynamics);
export const insertInteractionHistorySchema = createInsertSchema(interactionHistory);
export const selectInteractionHistorySchema = createSelectSchema(interactionHistory);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type VillageMember = typeof villageMembers.$inferSelect;
export type InsertVillageMember = typeof villageMembers.$inferInsert;
export type RelationshipDynamic = typeof relationshipDynamics.$inferSelect;
export type InsertRelationshipDynamic = typeof relationshipDynamics.$inferInsert;
export type InteractionHistory = typeof interactionHistory.$inferSelect;
export type InsertInteractionHistory = typeof interactionHistory.$inferInsert;

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