-- MCP OAuth 2.1 support for claude.ai custom connectors
-- RFC 9728 (Protected Resource Metadata) + RFC 8414 (Authorization Server Metadata)
-- RFC 7591 (Dynamic Client Registration) + PKCE (RFC 7636)

CREATE TABLE IF NOT EXISTS oauth_clients (
    id TEXT PRIMARY KEY,                    -- client_id (UUID)
    client_secret_hash TEXT,                -- SHA-256 (NULL for public clients)
    client_name TEXT,
    redirect_uris TEXT NOT NULL,            -- JSON array
    grant_types TEXT NOT NULL DEFAULT '["authorization_code"]',
    token_endpoint_auth_method TEXT NOT NULL DEFAULT 'client_secret_post',
    scope TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
    id TEXT PRIMARY KEY,                    -- the code (random 32-byte hex)
    client_id TEXT NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    redirect_uri TEXT NOT NULL,
    scope TEXT,
    code_challenge TEXT NOT NULL,           -- PKCE (required)
    code_challenge_method TEXT NOT NULL DEFAULT 'S256',
    resource TEXT,                          -- RFC 8707
    expires_at TEXT NOT NULL,               -- 5 min TTL
    used_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS oauth_tokens (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    refresh_token_hash TEXT UNIQUE,
    scope TEXT,
    expires_at TEXT NOT NULL,               -- 1 hour access
    refresh_expires_at TEXT,                -- 30 day refresh
    created_at TEXT DEFAULT (datetime('now')),
    last_used_at TEXT
);
