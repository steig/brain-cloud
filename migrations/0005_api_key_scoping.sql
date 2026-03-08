-- Add scope and expiry to API keys
ALTER TABLE api_keys ADD COLUMN scope TEXT NOT NULL DEFAULT 'write' CHECK (scope IN ('read', 'write', 'admin'));
ALTER TABLE api_keys ADD COLUMN expires_at TEXT;
