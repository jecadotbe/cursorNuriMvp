-- Add isAdmin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;

-- Set the first user as admin (optional, you can remove this if you want)
UPDATE users SET is_admin = TRUE WHERE id = 1;