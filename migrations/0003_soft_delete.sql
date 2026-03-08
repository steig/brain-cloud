-- Add soft delete support to thoughts and decisions
ALTER TABLE thoughts ADD COLUMN deleted_at TEXT;
ALTER TABLE decisions ADD COLUMN deleted_at TEXT;

-- Index for efficient filtering of non-deleted rows
CREATE INDEX IF NOT EXISTS idx_thoughts_deleted_at ON thoughts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_decisions_deleted_at ON decisions(deleted_at);
