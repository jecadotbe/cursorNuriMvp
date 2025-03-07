-- Migration to add push_subscriptions and notification_preferences fields to parent_profiles table
-- Generated manually for notification preferences feature

-- Add push_subscriptions column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'parent_profiles' 
        AND column_name = 'push_subscriptions'
    ) THEN
        ALTER TABLE "parent_profiles" ADD COLUMN "push_subscriptions" text;
    END IF;
END $$;
--> statement-breakpoint

-- Add notification_preferences column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'parent_profiles' 
        AND column_name = 'notification_preferences'
    ) THEN
        ALTER TABLE "parent_profiles" ADD COLUMN "notification_preferences" text;
    END IF;
END $$;
--> statement-breakpoint

-- Add comment to explain the notification_preferences column format
COMMENT ON COLUMN "parent_profiles"."notification_preferences" IS 'JSON string containing user notification preferences for different types of notifications';
--> statement-breakpoint

-- Add comment to explain the push_subscriptions column format
COMMENT ON COLUMN "parent_profiles"."push_subscriptions" IS 'JSON string containing push notification subscription data from the browser'; 