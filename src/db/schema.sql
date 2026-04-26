-- App tables
CREATE TABLE IF NOT EXISTS event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('event', 'todo','shopping')),
  title TEXT NOT NULL,
  detail TEXT,
  completed INTEGER,
  all_day INTEGER,
  begin TEXT, -- date/datetime
  end TEXT,   -- date/datetime
  -- both begin + end date :
  -- 'YYYY-MM-DD' : all_day=1,
  -- 'YYYY-MM-DDTHH:MM' (local time, no TZ suffix) : all_day=0
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
