DO $$ BEGIN
 CREATE TYPE "contact_frequency_enum" AS ENUM('S', 'M', 'L', 'XL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "experience_level_enum" AS ENUM('first_time', 'experienced', 'multiple_children');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "member_category_enum" AS ENUM('informeel', 'formeel', 'inspiratie');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "stress_level_enum" AS ENUM('low', 'moderate', 'high', 'very_high');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text,
	"summary" text,
	"messages" jsonb NOT NULL,
	"metadata" jsonb,
	"tags" text[],
	"content_embedding" text DEFAULT '[]',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "child_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_profile_id" integer NOT NULL,
	"name" text NOT NULL,
	"age" integer NOT NULL,
	"special_needs" text[],
	"routines" jsonb DEFAULT '{}'::jsonb,
	"development_notes" text,
	"last_assessment" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "children" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"age" integer NOT NULL,
	"special_needs" text[],
	"routines" jsonb,
	"challenges" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"chat_id" integer NOT NULL,
	"message_id" text NOT NULL,
	"feedback_type" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "onboarding_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_profile_id" integer NOT NULL,
	"short_term" text[],
	"long_term" text[],
	"support_areas" text[],
	"communication_preference" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parent_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"stress_level" "stress_level_enum" NOT NULL,
	"experience_level" "experience_level_enum" NOT NULL,
	"primary_concerns" text[],
	"support_network" text[],
	"bio" text,
	"preferred_language" text DEFAULT 'nl',
	"communication_preference" text,
	"completed_onboarding" boolean DEFAULT false,
	"current_onboarding_step" integer DEFAULT 1,
	"onboarding_data" jsonb DEFAULT '{}'::jsonb,
	"profile_embedding" text DEFAULT '[]',
	"last_suggestion_check" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "parent_profiles_user_id_idx" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parenting_challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"severity" integer NOT NULL,
	"frequency" text NOT NULL,
	"impact_level" integer NOT NULL,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parenting_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_profile_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"priority" integer NOT NULL,
	"status" text DEFAULT 'active',
	"target_date" timestamp,
	"achieved_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prompt_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"text" text NOT NULL,
	"type" text NOT NULL,
	"context" text NOT NULL,
	"relevance" integer NOT NULL,
	"related_chat_id" integer,
	"related_chat_title" text,
	"used_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suggestion_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"suggestion_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"feedback" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"profile_picture" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "village_member_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"village_member_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"date" timestamp NOT NULL,
	"duration" integer,
	"quality" integer,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "village_member_memories" (
	"id" serial PRIMARY KEY NOT NULL,
	"village_member_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"date" timestamp NOT NULL,
	"tags" text[],
	"emotional_impact" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "village_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"role" text,
	"circle" integer NOT NULL,
	"category" "member_category_enum",
	"contact_frequency" "contact_frequency_enum",
	"position_angle" numeric DEFAULT '0' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chats_content_embedding_idx" ON "chats" ("content_embedding");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "parent_profiles_email_idx" ON "parent_profiles" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "parent_profiles_embedding_idx" ON "parent_profiles" ("profile_embedding");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "child_profiles" ADD CONSTRAINT "child_profiles_parent_profile_id_parent_profiles_id_fk" FOREIGN KEY ("parent_profile_id") REFERENCES "parent_profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "children" ADD CONSTRAINT "children_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message_feedback" ADD CONSTRAINT "message_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message_feedback" ADD CONSTRAINT "message_feedback_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_goals" ADD CONSTRAINT "onboarding_goals_parent_profile_id_parent_profiles_id_fk" FOREIGN KEY ("parent_profile_id") REFERENCES "parent_profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parent_profiles" ADD CONSTRAINT "parent_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parenting_challenges" ADD CONSTRAINT "parenting_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parenting_goals" ADD CONSTRAINT "parenting_goals_parent_profile_id_parent_profiles_id_fk" FOREIGN KEY ("parent_profile_id") REFERENCES "parent_profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prompt_suggestions" ADD CONSTRAINT "prompt_suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prompt_suggestions" ADD CONSTRAINT "prompt_suggestions_related_chat_id_chats_id_fk" FOREIGN KEY ("related_chat_id") REFERENCES "chats"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suggestion_feedback" ADD CONSTRAINT "suggestion_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suggestion_feedback" ADD CONSTRAINT "suggestion_feedback_suggestion_id_prompt_suggestions_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "prompt_suggestions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "village_member_interactions" ADD CONSTRAINT "village_member_interactions_village_member_id_village_members_id_fk" FOREIGN KEY ("village_member_id") REFERENCES "village_members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "village_member_interactions" ADD CONSTRAINT "village_member_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "village_member_memories" ADD CONSTRAINT "village_member_memories_village_member_id_village_members_id_fk" FOREIGN KEY ("village_member_id") REFERENCES "village_members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "village_member_memories" ADD CONSTRAINT "village_member_memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "village_members" ADD CONSTRAINT "village_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
