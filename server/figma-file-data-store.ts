// ============================================================
// Figma File Data Store — 수정된 Figma 파일 구조 저장
// ============================================================
import type { Database } from 'better-sqlite3';

export interface FigmaFileData {
  fileKey: string;
  nodeId: string | null;
  data: string;  // JSON string of the file structure
  updatedAt: string;
}

export class FigmaFileDataStore {
  constructor(private db: Database) {
    this.init();
  }

  private init(): void {
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS figma_file_data (
        fileKey    TEXT NOT NULL,
        nodeId     TEXT,
        data       TEXT NOT NULL,
        updatedAt  TEXT NOT NULL,
        PRIMARY KEY (fileKey, nodeId)
      )
    `).run();
  }

  get(fileKey: string, nodeId: string | null): FigmaFileData | null {
    if (nodeId) {
      return this.db.prepare(`
        SELECT fileKey, nodeId, data, updatedAt
        FROM figma_file_data
        WHERE fileKey = ? AND nodeId = ?
      `).get(fileKey, nodeId) as FigmaFileData | undefined || null;
    } else {
      return this.db.prepare(`
        SELECT fileKey, nodeId, data, updatedAt
        FROM figma_file_data
        WHERE fileKey = ? AND nodeId IS NULL
      `).get(fileKey) as FigmaFileData | undefined || null;
    }
  }

  save(fileKey: string, nodeId: string | null, data: object): FigmaFileData {
    const now = new Date().toISOString();
    const jsonData = JSON.stringify(data);
    const existing = this.get(fileKey, nodeId);

    if (existing) {
      if (nodeId) {
        this.db.prepare(`
          UPDATE figma_file_data
          SET data = ?, updatedAt = ?
          WHERE fileKey = ? AND nodeId = ?
        `).run(jsonData, now, fileKey, nodeId);
      } else {
        this.db.prepare(`
          UPDATE figma_file_data
          SET data = ?, updatedAt = ?
          WHERE fileKey = ? AND nodeId IS NULL
        `).run(jsonData, now, fileKey);
      }
    } else {
      this.db.prepare(`
        INSERT INTO figma_file_data (fileKey, nodeId, data, updatedAt)
        VALUES (?, ?, ?, ?)
      `).run(fileKey, nodeId, jsonData, now);
    }

    return { fileKey, nodeId, data: jsonData, updatedAt: now };
  }

  delete(fileKey: string, nodeId: string | null): void {
    if (nodeId) {
      this.db.prepare('DELETE FROM figma_file_data WHERE fileKey = ? AND nodeId = ?').run(fileKey, nodeId);
    } else {
      this.db.prepare('DELETE FROM figma_file_data WHERE fileKey = ? AND nodeId IS NULL').run(fileKey);
    }
  }
}
