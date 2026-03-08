-- Add user_id to github_repos so repos can be linked per-user without requiring a project
ALTER TABLE github_repos ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_github_repos_user ON github_repos(user_id);
