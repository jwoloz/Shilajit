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

    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      last_synced_at TEXT
    );

    INSERT OR IGNORE INTO sync_state (id) VALUES (1);

    CREATE INDEX IF NOT EXISTS idx_entries_journey ON entries(journey_id);
    CREATE INDEX IF NOT EXISTS idx_insights_journey ON insights(journey_id);
    CREATE INDEX IF NOT EXISTS idx_insights_core ON insights(is_core);
  `)
}
