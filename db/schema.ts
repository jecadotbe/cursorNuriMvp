import { pgTable, text, serial, integer, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Define all enums first
export const stressLevelEnum = pgEnum("stress_level_enum", [
  "low",
  "moderate",
  "high",
  "very_high"
]);

export const experienceLevelEnum = pgEnum("experience_level_enum", [
  "first_time",
  "experienced",
  "multiple_children"
]);

export const memberCategoryEnum = pgEnum("member_category_enum", [
  "informeel",
  "formeel",
  "inspiratie"
]);

export const contactFrequencyEnum = pgEnum("contact_frequency_enum", [
  "S",
  "M",
  "L",
  "XL"
]);

// Define all tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const parentProfiles = pgTable("parent_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  stressLevel: stressLevelEnum("stress_level").notNull(),
  experienceLevel: experienceLevelEnum("experience_level").notNull(),
  primaryConcerns: text("primary_concerns").array(),
  supportNetwork: text("support_network").array(), // family, friends, professionals
  completedOnboarding: boolean("completed_onboarding").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const children = pgTable("children", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  specialNeeds: text("special_needs").array(),
  routines: jsonb("routines"), // Daily routines and preferences
  challenges: jsonb("challenges"), // Specific challenges for this child
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const parentingChallenges = pgTable("parenting_challenges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  category: text("category").notNull(), // sleep, behavior, education, etc.
  description: text("description").notNull(),
  severity: integer("severity").notNull(), // 1-5 scale
  frequency: text("frequency").notNull(), // daily, weekly, monthly
  impactLevel: integer("impact_level").notNull(), // 1-5 scale
  status: text("status").default("active"), // active, managed, resolved
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const parentingGoals = pgTable("parenting_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  timeframe: text("timeframe").notNull(), // short_term, long_term
  priority: integer("priority").notNull(), // 1-5 scale
  status: text("status").default("active"), // active, in_progress, achieved
  targetDate: timestamp("target_date"),
  achievedDate: timestamp("achieved_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const villageMembers = pgTable("village_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  circle: integer("circle").notNull(),
  category: memberCategoryEnum("category"),
  contactFrequency: contactFrequencyEnum("contact_frequency"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const promptSuggestions = pgTable("prompt_suggestions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  text: text("text").notNull(),
  type: text("type").notNull(), // 'action' | 'follow_up'
  context: text("context").notNull(), // 'new' | 'existing'
  relevance: integer("relevance").notNull(), // 1-10 score
  relatedChatId: integer("related_chat_id").references(() => chats.id),
  relatedChatTitle: text("related_chat_title"),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const suggestionFeedback = pgTable("suggestion_feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  suggestionId: integer("suggestion_id").references(() => promptSuggestions.id).notNull(),
  rating: integer("rating").notNull(), // 1-5 scale
  feedback: text("feedback"), // Optional text feedback
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema types
export const insertParentProfileSchema = createInsertSchema(parentProfiles);
export const selectParentProfileSchema = createSelectSchema(parentProfiles);
export const insertChildSchema = createInsertSchema(children);
export const selectChildSchema = createSelectSchema(children);
export const insertParentingChallengeSchema = createInsertSchema(parentingChallenges);
export const selectParentingChallengeSchema = createSelectSchema(parentingChallenges);
export const insertParentingGoalSchema = createInsertSchema(parentingGoals);
export const selectParentingGoalSchema = createSelectSchema(parentingGoals);
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertVillageMemberSchema = createInsertSchema(villageMembers);
export const selectVillageMemberSchema = createSelectSchema(villageMembers);
export const insertChatSchema = createInsertSchema(chats);
export const selectChatSchema = createSelectSchema(chats);
export const insertMessageFeedbackSchema = createInsertSchema(messageFeedback);
export const selectMessageFeedbackSchema = createSelectSchema(messageFeedback);
export const insertPromptSuggestionSchema = createInsertSchema(promptSuggestions);
export const selectPromptSuggestionSchema = createSelectSchema(promptSuggestions);
export const insertSuggestionFeedbackSchema = createInsertSchema(suggestionFeedback);
export const selectSuggestionFeedbackSchema = createSelectSchema(suggestionFeedback);

// Types
export type ParentProfile = typeof parentProfiles.$inferSelect;
export type InsertParentProfile = typeof parentProfiles.$inferInsert;
export type Child = typeof children.$inferSelect;
export type InsertChild = typeof children.$inferInsert;
export type ParentingChallenge = typeof parentingChallenges.$inferSelect;
export type InsertParentingChallenge = typeof parentingChallenges.$inferInsert;
export type ParentingGoal = typeof parentingGoals.$inferSelect;
export type InsertParentingGoal = typeof parentingGoals.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type VillageMember = typeof villageMembers.$inferSelect;
export type InsertVillageMember = typeof villageMembers.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type InsertChat = typeof chats.$inferInsert;
export type MessageFeedback = typeof messageFeedback.$inferSelect;
export type InsertMessageFeedback = typeof messageFeedback.$inferInsert;
export type PromptSuggestion = typeof promptSuggestions.$inferSelect;
export type InsertPromptSuggestion = typeof promptSuggestions.$inferInsert;
export type SuggestionFeedback = typeof suggestionFeedback.$inferSelect;
export type InsertSuggestionFeedback = typeof suggestionFeedback.$inferInsert;