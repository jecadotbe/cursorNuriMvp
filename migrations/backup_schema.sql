
-- Create enums
CREATE TYPE stress_level_enum AS ENUM ('low', 'moderate', 'high', 'very_high');
CREATE TYPE experience_level_enum AS ENUM ('first_time', 'experienced', 'multiple_children');
CREATE TYPE member_category_enum AS ENUM ('informeel', 'formeel', 'inspiratie');
CREATE TYPE contact_frequency_enum AS ENUM ('S', 'M', 'L', 'XL');

-- Create tables
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  profile_picture TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE parent_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  email TEXT,
  stress_level stress_level_enum NOT NULL,
  experience_level experience_level_enum NOT NULL,
  primary_concerns TEXT[],
  support_network TEXT[],
  bio TEXT,
  preferred_language TEXT DEFAULT 'nl',
  communication_preference TEXT,
  completed_onboarding BOOLEAN DEFAULT false,
  current_onboarding_step INTEGER DEFAULT 1,
  onboarding_data JSONB DEFAULT '{}',
  profile_embedding TEXT DEFAULT '[]',
  last_suggestion_check TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX parent_profiles_email_idx ON parent_profiles(email);
CREATE INDEX parent_profiles_embedding_idx ON parent_profiles(profile_embedding);

-- Add remaining table creation statements for other tables
CREATE TABLE children (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  special_needs TEXT[],
  routines JSONB,
  challenges JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add other tables similarly...
