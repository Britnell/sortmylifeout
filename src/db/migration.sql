PRAGMA foreign_keys = OFF;

-- Initial schema (v0)
CREATE TABLE IF NOT EXISTS event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('event', 'todo', 'reminder')),
  title TEXT NOT NULL,
  detail TEXT,
  completed INTEGER DEFAULT 0,
  begin TEXT,
  end TEXT,
  all_day INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- v1: remove type CHECK (add 'shopping'), make all_day + completed nullable
CREATE TABLE IF NOT EXISTS event_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  completed INTEGER,
  all_day INTEGER,
  begin TEXT,
  end TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
INSERT OR IGNORE INTO event_new SELECT id, user_id, type, title, detail, completed, begin, end, all_day, created_at FROM event;
DROP TABLE event;
ALTER TABLE event_new RENAME TO event;

PRAGMA foreign_keys = ON;
