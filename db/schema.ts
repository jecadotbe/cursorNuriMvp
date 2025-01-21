import { pgTable, text, serial, integer, boolean, timestamp, jsonb, pgEnum, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
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
  profilePicture: text("profile_picture"),
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
  supportNetwork: text("support_network").array(),
  completedOnboarding: boolean("completed_onboarding").default(false),
  currentOnboardingStep: integer("current_onboarding_step").default(1),
  onboardingData: jsonb("onboarding_data").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const children = pgTable("children", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  specialNeeds: text("special_needs").array(),
  routines: jsonb("routines"),
  challenges: jsonb("challenges"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const parentingChallenges = pgTable("parenting_challenges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  severity: integer("severity").notNull(),
  frequency: text("frequency").notNull(),
  impactLevel: integer("impact_level").notNull(),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const parentingGoals = pgTable("parenting_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  timeframe: text("timeframe").notNull(),
  priority: integer("priority").notNull(),
  status: text("status").default("active"),
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
  role: text("role"),
  circle: integer("circle").notNull(),
  category: memberCategoryEnum("category"),
  contactFrequency: contactFrequencyEnum("contact_frequency"),
  positionAngle: numeric("position_angle").notNull().default('0'),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const villageMemberMemories = pgTable("village_member_memories", {
  id: serial("id").primaryKey(),
  villageMemberId: integer("village_member_id").references(() => villageMembers.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  date: timestamp("date").notNull(),
  tags: text("tags").array(),
  emotionalImpact: integer("emotional_impact"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations using the imported relations function
export const villageMembersRelations = relations(villageMembers, ({ many }) => ({
  memories: many(villageMemberMemories),
}));

export const villageMemberMemoriesRelations = relations(villageMemberMemories, ({ one }) => ({
  member: one(villageMembers, {
    fields: [villageMemberMemories.villageMemberId],
    references: [villageMembers.id],
  }),
}));

export const villageMemberInteractions = pgTable("village_member_interactions", {
  id: serial("id").primaryKey(),
  villageMemberId: integer("village_member_id").references(() => villageMembers.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  date: timestamp("date").notNull(),
  duration: integer("duration"),
  quality: integer("quality"),
  notes: text("notes"),
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

export const promptSuggestions = pgTable("prompt_suggestions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  text: text("text").notNull(),
  type: text("type").notNull(),
  context: text("context").notNull(),
  relevance: integer("relevance").notNull(),
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
  rating: integer("rating").notNull(),
  feedback: text("feedback"),
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
export const insertVillageMemberMemorySchema = createInsertSchema(villageMemberMemories);
export const selectVillageMemberMemorySchema = createSelectSchema(villageMemberMemories);
export const insertVillageMemberInteractionSchema = createInsertSchema(villageMemberInteractions);
export const selectVillageMemberInteractionSchema = createSelectSchema(villageMemberInteractions);

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
export type VillageMemberMemory = typeof villageMemberMemories.$inferSelect;
export type InsertVillageMemberMemory = typeof villageMemberMemories.$inferInsert;
export type VillageMemberInteraction = typeof villageMemberInteractions.$inferSelect;
export type InsertVillageMemberInteraction = typeof villageMemberInteractions.$inferInsert;