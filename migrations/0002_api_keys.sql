-- Multi-key API support: named keys with SHA-256 hashing
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, name)
);
CREATE INDEX api_keys_hash_idx ON api_keys(key_hash);
CREATE INDEX api_keys_user_idx ON api_keys(user_id);
