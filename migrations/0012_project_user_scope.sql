-- Scope projects by user_id for tenant isolation (#78)
-- Previously projects had UNIQUE(name), allowing cross-user data leakage.
-- Now each user has their own project namespace: UNIQUE(user_id, name).

ALTER TABLE projects ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

-- Backfill: assign projects to their owner_id (or first user who created data in them)
UPDATE projects
SET user_id = COALESCE(
  owner_id,
  (SELECT user_id FROM thoughts WHERE project_id = projects.id LIMIT 1),
  (SELECT user_id FROM sessions WHERE project_id = projects.id LIMIT 1),
  (SELECT user_id FROM decisions WHERE project_id = projects.id LIMIT 1)
);

-- Drop old unique index on name alone and create scoped one
-- SQLite doesn't support DROP CONSTRAINT, so we create a new unique index
-- The old UNIQUE on name was enforced by the table definition, which we can't alter.
-- We add a new index for (user_id, name) uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_user_name ON projects(user_id, name);
