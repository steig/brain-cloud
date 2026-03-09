-- Reminders system (#135)
-- Lightweight reminders with due dates, completion, and dismissal.

CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  due_at TEXT NOT NULL,
  completed_at TEXT,
  dismissed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_reminders_user_due ON reminders(user_id, due_at);
CREATE INDEX idx_reminders_user_status ON reminders(user_id, completed_at, dismissed_at);
