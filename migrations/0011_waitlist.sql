-- Add waitlist support: new users must be approved before accessing the app
ALTER TABLE users ADD COLUMN approved_at TEXT DEFAULT NULL;

-- Grandfather all existing users
UPDATE users SET approved_at = created_at;
