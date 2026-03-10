// ============================================================
// Figma Files Store — 로드한 Figma 파일 목록 관리
// ============================================================
import { randomUUID } from 'crypto';
import type { Database } from 'better-sqlite3';

export interface FigmaFileRecord {
  id: string;
  fileKey: string;
  nodeId: string | null;  // 특정 노드 ID (null이면 전체 파일)
  name: string;
  thumbnailUrl: string | null;
  lastOpenedAt: string;
  createdAt: string;
  completed: boolean;
}

export class FigmaFilesStore {
  constructor(private db: Database) {
    this.init();
  }

  private init(): void {
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS figma_files (
        id            TEXT PRIMARY KEY,
        fileKey       TEXT NOT NULL,
        nodeId        TEXT,
        name          TEXT NOT NULL,
        thumbnailUrl  TEXT,
        lastOpenedAt  TEXT NOT NULL,
        createdAt     TEXT NOT NULL,
        completed     INTEGER DEFAULT 0,
        UNIQUE(fileKey, nodeId)
      )
    `).run();

    // 기존 테이블에 completed 컬럼 추가 (마이그레이션)
    try {
      this.db.prepare(`ALTER TABLE figma_files ADD COLUMN completed INTEGER DEFAULT 0`).run();
    } catch (e) {
      // 이미 컬럼이 존재하면 무시
    }
  }

  list(): FigmaFileRecord[] {
    const rows = this.db.prepare(`
      SELECT id, fileKey, nodeId, name, thumbnailUrl, lastOpenedAt, createdAt, completed
      FROM figma_files
      ORDER BY lastOpenedAt DESC
    `).all() as any[];
    return rows.map(row => ({ ...row, completed: !!row.completed }));
  }

  get(fileKey: string, nodeId: string | null): FigmaFileRecord | null {
    let row: any;
    if (nodeId) {
      row = this.db.prepare(`
        SELECT id, fileKey, nodeId, name, thumbnailUrl, lastOpenedAt, createdAt, completed
        FROM figma_files
        WHERE fileKey = ? AND nodeId = ?
      `).get(fileKey, nodeId);
    } else {
      row = this.db.prepare(`
        SELECT id, fileKey, nodeId, name, thumbnailUrl, lastOpenedAt, createdAt, completed
        FROM figma_files
        WHERE fileKey = ? AND nodeId IS NULL
      `).get(fileKey);
    }
    if (!row) return null;
    return { ...row, completed: !!row.completed };
  }

  upsert(fileKey: string, nodeId: string | null, name: string, thumbnailUrl: string | null): FigmaFileRecord {
    const now = new Date().toISOString();
    const existing = this.get(fileKey, nodeId);

    if (existing) {
      if (nodeId) {
        this.db.prepare(`
          UPDATE figma_files
          SET name = ?, thumbnailUrl = ?, lastOpenedAt = ?
          WHERE fileKey = ? AND nodeId = ?
        `).run(name, thumbnailUrl, now, fileKey, nodeId);
      } else {
        this.db.prepare(`
          UPDATE figma_files
          SET name = ?, thumbnailUrl = ?, lastOpenedAt = ?
          WHERE fileKey = ? AND nodeId IS NULL
        `).run(name, thumbnailUrl, now, fileKey);
      }

      return { ...existing, name, thumbnailUrl, lastOpenedAt: now };
    } else {
      const id = randomUUID();
      this.db.prepare(`
        INSERT INTO figma_files (id, fileKey, nodeId, name, thumbnailUrl, lastOpenedAt, createdAt, completed)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `).run(id, fileKey, nodeId, name, thumbnailUrl, now, now);

      return { id, fileKey, nodeId, name, thumbnailUrl, lastOpenedAt: now, createdAt: now, completed: false };
    }
  }

  delete(fileKey: string, nodeId: string | null): void {
    if (nodeId) {
      this.db.prepare('DELETE FROM figma_files WHERE fileKey = ? AND nodeId = ?').run(fileKey, nodeId);
    } else {
      this.db.prepare('DELETE FROM figma_files WHERE fileKey = ? AND nodeId IS NULL').run(fileKey);
    }
  }

  // lastOpenedAt만 업데이트
  updateLastOpened(fileKey: string, nodeId: string | null): void {
    const now = new Date().toISOString();
    if (nodeId) {
      this.db.prepare(`
        UPDATE figma_files SET lastOpenedAt = ? WHERE fileKey = ? AND nodeId = ?
      `).run(now, fileKey, nodeId);
    } else {
      this.db.prepare(`
        UPDATE figma_files SET lastOpenedAt = ? WHERE fileKey = ? AND nodeId IS NULL
      `).run(now, fileKey);
    }
  }

  // completed 상태 업데이트
  updateCompleted(fileKey: string, nodeId: string | null, completed: boolean): void {
    if (nodeId) {
      this.db.prepare(`
        UPDATE figma_files SET completed = ? WHERE fileKey = ? AND nodeId = ?
      `).run(completed ? 1 : 0, fileKey, nodeId);
    } else {
      this.db.prepare(`
        UPDATE figma_files SET completed = ? WHERE fileKey = ? AND nodeId IS NULL
      `).run(completed ? 1 : 0, fileKey);
    }
  }
}
