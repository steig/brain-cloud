-- Access tracking for staleness detection (#134)
-- Tracks how often thoughts/decisions are accessed and when last accessed.

ALTER TABLE thoughts ADD COLUMN access_count INTEGER DEFAULT 0;
ALTER TABLE thoughts ADD COLUMN last_accessed_at TEXT;
ALTER TABLE decisions ADD COLUMN access_count INTEGER DEFAULT 0;
ALTER TABLE decisions ADD COLUMN last_accessed_at TEXT;
