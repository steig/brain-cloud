-- Orchestrator: agents, rooms, messages, presence
CREATE TABLE IF NOT EXISTS orchestrator_agents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    status TEXT NOT NULL DEFAULT 'idle'
        CHECK (status IN ('idle', 'busy', 'offline')),
    metadata TEXT DEFAULT '{}',
    last_seen_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_orchestrator_agents_user ON orchestrator_agents(user_id, status);

CREATE TABLE IF NOT EXISTS orchestrator_rooms (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    visibility TEXT DEFAULT 'private'
        CHECK (visibility IN ('private', 'team', 'public')),
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_orchestrator_rooms_user ON orchestrator_rooms(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS orchestrator_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id TEXT NOT NULL REFERENCES orchestrator_rooms(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL DEFAULT 'user'
        CHECK (sender_type IN ('user', 'agent', 'system')),
    sender_name TEXT,
    agent_id TEXT REFERENCES orchestrator_agents(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orchestrator_messages_room ON orchestrator_messages(user_id, room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS orchestrator_presence (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id TEXT NOT NULL REFERENCES orchestrator_rooms(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES orchestrator_agents(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'online'
        CHECK (status IN ('online', 'idle', 'busy', 'offline')),
    last_seen_at TEXT DEFAULT (datetime('now')),
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, room_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_orchestrator_presence_room ON orchestrator_presence(user_id, room_id, status);
