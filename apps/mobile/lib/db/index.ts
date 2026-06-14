import * as SQLite from 'expo-sqlite'

let _db: SQLite.SQLiteDatabase | null = null

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('shilajit.db')
    initSchema(_db)
  }
  return _db
}

function initSchema(db: SQLite.SQLiteDatabase) {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS journeys (
      id TEXT PRIMARY KEY,
      substance TEXT NOT NULL,
      dose_mg REAL,
      dose_unit TEXT DEFAULT 'mg',
      spore_source TEXT,
      scheduled_at TEXT NOT NULL,
      intentions TEXT,
      setting TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at TEXT,
      _deleted INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      journey_id TEXT NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      phase TEXT NOT NULL CHECK(phase IN ('BEFORE','DURING','AFTER','INTEGRATION')),
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at TEXT,
      _deleted INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY,
      journey_id TEXT REFERENCES journeys(id) ON DELETE SET NULL,
      content TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      resonance INTEGER DEFAULT 5,
      is_core INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at TEXT,
      _deleted INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS beliefs (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      category TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at TEXT,
      _deleted INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS rituals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      frequency TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at TEXT,
      _deleted INTEGER DEFAULT 0
    );

    -- Individual dose events during a journey (time-stamped with cumulative tracking)
    CREATE TABLE IF NOT EXISTS dose_events (
      id TEXT PRIMARY KEY,
      journey_id TEXT NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
      substance TEXT NOT NULL,
      dose_mg REAL NOT NULL,
      dose_unit TEXT DEFAULT 'mg',
      taken_at TEXT NOT NULL DEFAULT (datetime('now')),
      cumulative_mg REAL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at TEXT,
      _deleted INTEGER DEFAULT 0
    );

    -- Multi-modal notes: text, audio transcription, canvas drawing, photo OCR
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      journey_id TEXT NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('TEXT','AUDIO','VISUAL','PHOTO')),
      content TEXT,
      media_uri TEXT,
      canvas_data TEXT,
      phase TEXT CHECK(phase IN ('BEFORE','DURING','AFTER','INTEGRATION')),
      mood INTEGER CHECK(mood BETWEEN 1 AND 10),
      body_feel INTEGER CHECK(body_feel BETWEEN 1 AND 10),
      analysis TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at TEXT,
      _deleted INTEGER DEFAULT 0
    );

    -- Scheduled reminders tied to journey dose events
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      journey_id TEXT NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
      notification_id TEXT,
      message TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      fired INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      last_synced_at TEXT
    );

    INSERT OR IGNORE INTO sync_state (id) VALUES (1);

    CREATE INDEX IF NOT EXISTS idx_entries_journey ON entries(journey_id);
    CREATE INDEX IF NOT EXISTS idx_insights_journey ON insights(journey_id);
    CREATE INDEX IF NOT EXISTS idx_insights_core ON insights(is_core);
    CREATE INDEX IF NOT EXISTS idx_dose_events_journey ON dose_events(journey_id);
    CREATE INDEX IF NOT EXISTS idx_dose_events_taken_at ON dose_events(taken_at);
    CREATE INDEX IF NOT EXISTS idx_notes_journey ON notes(journey_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_journey ON reminders(journey_id);
  `)
}
