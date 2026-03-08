CREATE TABLE IF NOT EXISTS page_views (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  referrer TEXT,
  visitor_hash TEXT,
  country TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_page_views_created ON page_views(created_at);
CREATE INDEX idx_page_views_path ON page_views(path);
