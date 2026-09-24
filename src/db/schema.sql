-- App tables
CREATE TABLE IF NOT EXISTS event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'event' | 'todo' | 'shopping'
  title TEXT NOT NULL,
  detail TEXT,
  completed TEXT, -- 'YYYY-MM-DD' when todo/shopping done, NULL otherwise
  all_day INTEGER,
  begin TEXT, -- date/datetime
  end TEXT,   -- date/datetime
  -- both begin + end date :
  -- 'YYYY-MM-DD' : all_day=1,
  -- 'YYYY-MM-DDTHH:MM' (local time, no TZ suffix) : all_day=0
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- migration: completed INTEGER 0/1 -> 'YYYY-MM-DD' text
UPDATE event SET completed = strftime('%Y-%m-%d','now') WHERE completed = 1;
UPDATE event SET completed = NULL WHERE completed = 0 OR completed = '';
