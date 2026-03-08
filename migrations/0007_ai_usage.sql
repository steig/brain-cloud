-- AI Usage tracking: per-event cost tracking for Workers AI operations
-- Separate from dx_costs (which tracks aggregated daily MCP client costs)

CREATE TABLE IF NOT EXISTS ai_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation TEXT NOT NULL CHECK (operation IN ('embedding', 'coaching', 'digest', 'rag_query', 'rag_generation')),
    model TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    estimated_cost REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ai_usage_user_created_idx ON ai_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_user_operation_idx ON ai_usage(user_id, operation);
