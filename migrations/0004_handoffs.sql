-- Dedicated handoffs table (replaces tag-based convention on thoughts table)
CREATE TABLE IF NOT EXISTS handoffs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_project TEXT,
    to_project TEXT NOT NULL,
    handoff_type TEXT NOT NULL DEFAULT 'context'
        CHECK (handoff_type IN ('context', 'decision', 'blocker', 'task')),
    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    message TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'claimed', 'resolved')),
    claimed_at TEXT,
    claim_note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_handoffs_user_status ON handoffs(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handoffs_to_project ON handoffs(user_id, to_project, status);
