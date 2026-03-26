// ============================================================
// Database — SQLite (better-sqlite3) 초기화
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

  createTables(_db);

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
// 테이블 생성
// ============================================================
function createTables(db: Database.Database): void {
  // projects
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    )
  `);

  // settings (프로젝트별 설정)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      project_id TEXT NOT NULL,
      key        TEXT NOT NULL,
      value      TEXT NOT NULL,
      PRIMARY KEY (project_id, key)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_settings_project ON settings(project_id)`);

  // registry (프로젝트별 컴포넌트 목록)
  db.exec(`
    CREATE TABLE IF NOT EXISTS registry (
      id         TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name       TEXT NOT NULL,
      tagName    TEXT NOT NULL DEFAULT '',
      properties TEXT NOT NULL DEFAULT '{}',
      UNIQUE(project_id, name)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_registry_project ON registry(project_id)`);

  // default_mapping_rules (프로젝트별 기본 매핑 규칙)
  db.exec(`
    CREATE TABLE IF NOT EXISTS default_mapping_rules (
      id          TEXT PRIMARY KEY,
      project_id  TEXT NOT NULL,
      registry_id TEXT NOT NULL,
      keyword     TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      UNIQUE(project_id, keyword)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_default_mapping_rules_project ON default_mapping_rules(project_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_default_mapping_rules_registry ON default_mapping_rules(registry_id)`);

  // figma_files
  db.exec(`
    CREATE TABLE IF NOT EXISTS figma_files (
      id            TEXT PRIMARY KEY,
      fileKey       TEXT NOT NULL,
      nodeId        TEXT,
      name          TEXT NOT NULL,
      thumbnailUrl  TEXT,
      lastOpenedAt  TEXT NOT NULL,
      createdAt     TEXT NOT NULL,
      completed     INTEGER DEFAULT 0,
      project_id    TEXT NOT NULL,
      UNIQUE(project_id, fileKey, nodeId)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_figma_files_project ON figma_files(project_id)`);

  // node_mappings (프로젝트별)
  db.exec(`
    CREATE TABLE IF NOT EXISTS node_mappings (
      id                  TEXT PRIMARY KEY,
      project_id          TEXT NOT NULL,
      figma_file_key      TEXT NOT NULL,
      figma_root_node_id  TEXT,
      figma_node_id       TEXT NOT NULL,
      figma_node_name     TEXT NOT NULL,
      figma_node_type     TEXT,
      registry_id         TEXT,
      registry_name       TEXT,
      registry_tag        TEXT,
      custom_attrs        TEXT DEFAULT '{}',
      status              TEXT NOT NULL DEFAULT 'pending',
      created_at          TEXT NOT NULL,
      updated_at          TEXT NOT NULL,
      UNIQUE(project_id, figma_file_key, figma_root_node_id, figma_node_id)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_node_mappings_project ON node_mappings(project_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_node_mappings_file ON node_mappings(project_id, figma_file_key)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_node_mappings_root ON node_mappings(project_id, figma_file_key, figma_root_node_id)`);

  // mapping_clusters (프로젝트별 클러스터)
  db.exec(`
    CREATE TABLE IF NOT EXISTS mapping_clusters (
      id              TEXT PRIMARY KEY,
      project_id      TEXT NOT NULL,
      signature       TEXT NOT NULL,
      signature_data  TEXT NOT NULL,
      registry_id     TEXT NOT NULL,
      registry_name   TEXT NOT NULL,
      custom_attrs    TEXT DEFAULT '{}',
      sample_count    INTEGER DEFAULT 1,
      source          TEXT NOT NULL DEFAULT 'generated',
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL,
      UNIQUE(project_id, signature)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_mapping_clusters_project ON mapping_clusters(project_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_mapping_clusters_signature ON mapping_clusters(signature)`);

  // variant_mode 컬럼 추가 (마이그레이션)
  const clusterColumns = db.pragma("table_info('mapping_clusters')") as Array<{ name: string }>;
  const hasVariantMode = clusterColumns.some(col => col.name === 'variant_mode');
  if (!hasVariantMode) {
    console.log('[DB Migration] Adding variant_mode column to mapping_clusters...');
    db.exec(`ALTER TABLE mapping_clusters ADD COLUMN variant_mode TEXT`);
    console.log('[DB Migration] variant_mode column added successfully');
  }

  // figma_file_data (프로젝트별)
  db.exec(`
    CREATE TABLE IF NOT EXISTS figma_file_data (
      project_id TEXT NOT NULL,
      fileKey    TEXT NOT NULL,
      nodeId     TEXT,
      data       TEXT NOT NULL,
      updatedAt  TEXT NOT NULL,
      PRIMARY KEY (project_id, fileKey, nodeId)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_figma_file_data_project ON figma_file_data(project_id)`);
}
