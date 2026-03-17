// ============================================================
// Database — SQLite (better-sqlite3) 초기화 + 마이그레이션
// ============================================================
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) throw new Error('DB not initialized. Call initDb() first.');
  return _db;
}

export function initDb(): Database.Database {
  if (_db) return _db;

  const dataDir = join(__dirname, '..', 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  const dbPath = join(dataDir, 'figma-viewer.db');
  _db = new Database(dbPath);

  // WAL 모드
  _db.pragma('journal_mode = WAL');
  _db.pragma('busy_timeout = 5000');
  _db.pragma('foreign_keys = ON');

  runMigrations(_db);

  console.log(`[DB] SQLite initialized: ${dbPath}`);
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
    console.log('[DB] SQLite closed.');
  }
}

// ============================================================
// Schema Migrations
// ============================================================
function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id   INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      appliedAt TEXT NOT NULL
    )
  `);

  const migrations: Array<{ name: string; sql: string }> = [
    { name: '001_settings', sql: SQL_SETTINGS },
    { name: '002_registry', sql: SQL_REGISTRY },
    { name: '003_node_mappings', sql: SQL_NODE_MAPPINGS },
    { name: '004_mapping_clusters', sql: SQL_MAPPING_CLUSTERS },
    { name: '005_default_mapping_rules', sql: SQL_DEFAULT_MAPPING_RULES },
    { name: '006_mapping_clusters_source', sql: SQL_MAPPING_CLUSTERS_SOURCE },
  ];

  const applied = db.prepare('SELECT name FROM migrations').all() as { name: string }[];
  const appliedSet = new Set(applied.map(r => r.name));

  const insert = db.prepare(
    "INSERT INTO migrations (name, appliedAt) VALUES (?, ?)"
  );

  for (const m of migrations) {
    if (appliedSet.has(m.name)) continue;
    db.exec(m.sql);
    insert.run(m.name, new Date().toISOString());
    console.log(`[DB] Migration applied: ${m.name}`);
  }
}

// ============================================================
// DDL
// ============================================================

const SQL_SETTINGS = `
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

const SQL_REGISTRY = `
  CREATE TABLE IF NOT EXISTS registry (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    tagName    TEXT NOT NULL DEFAULT '',
    properties TEXT NOT NULL DEFAULT '{}'
  );
`;

const SQL_NODE_MAPPINGS = `
  CREATE TABLE IF NOT EXISTS node_mappings (
    id              TEXT PRIMARY KEY,
    figma_file_key  TEXT NOT NULL,
    figma_node_id   TEXT NOT NULL,
    figma_node_name TEXT NOT NULL,
    figma_node_type TEXT,
    registry_id     TEXT,
    registry_name   TEXT,
    registry_tag    TEXT,
    custom_attrs    TEXT DEFAULT '{}',
    status          TEXT NOT NULL DEFAULT 'pending',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    UNIQUE(figma_file_key, figma_node_id)
  );
  CREATE INDEX IF NOT EXISTS idx_node_mappings_file ON node_mappings(figma_file_key);
`;

const SQL_MAPPING_CLUSTERS = `
  CREATE TABLE IF NOT EXISTS mapping_clusters (
    id              TEXT PRIMARY KEY,
    signature       TEXT NOT NULL UNIQUE,
    signature_data  TEXT NOT NULL,
    registry_id     TEXT NOT NULL,
    registry_name   TEXT NOT NULL,
    custom_attrs    TEXT DEFAULT '{}',
    sample_count    INTEGER DEFAULT 1,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_mapping_clusters_signature ON mapping_clusters(signature);
`;

const SQL_MAPPING_CLUSTERS_SOURCE = `
  ALTER TABLE mapping_clusters ADD COLUMN source TEXT NOT NULL DEFAULT 'generated';
`;

const SQL_DEFAULT_MAPPING_RULES = `
  CREATE TABLE IF NOT EXISTS default_mapping_rules (
    id          TEXT PRIMARY KEY,
    registry_id TEXT NOT NULL,
    keyword     TEXT NOT NULL UNIQUE,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_default_mapping_rules_registry ON default_mapping_rules(registry_id);
`;
