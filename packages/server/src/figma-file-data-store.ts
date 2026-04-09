// ============================================================
// Figma File Data Store — 수정된 Figma 파일 구조 저장 (프로젝트별)
// ============================================================
import type { Database } from 'better-sqlite3';

export interface FigmaFileData {
  projectId: string;
  fileKey: string;
  nodeId: string | null;
  data: string;  // JSON string of the file structure
  updatedAt: string;
}

export class FigmaFileDataStore {
  constructor(private db: Database) {}

  get(projectId: string, fileKey: string, nodeId: string | null): FigmaFileData | null {
    if (nodeId) {
      return this.db.prepare(`
        SELECT project_id as projectId, fileKey, nodeId, data, updatedAt
        FROM figma_file_data
        WHERE project_id = ? AND fileKey = ? AND nodeId = ?
      `).get(projectId, fileKey, nodeId) as FigmaFileData | undefined || null;
    } else {
      return this.db.prepare(`
        SELECT project_id as projectId, fileKey, nodeId, data, updatedAt
        FROM figma_file_data
        WHERE project_id = ? AND fileKey = ? AND nodeId IS NULL
      `).get(projectId, fileKey) as FigmaFileData | undefined || null;
    }
  }

  save(projectId: string, fileKey: string, nodeId: string | null, data: object): FigmaFileData {
    const now = new Date().toISOString();
    const jsonData = JSON.stringify(data);
    const existing = this.get(projectId, fileKey, nodeId);

    if (existing) {
      if (nodeId) {
        this.db.prepare(`
          UPDATE figma_file_data
          SET data = ?, updatedAt = ?
          WHERE project_id = ? AND fileKey = ? AND nodeId = ?
        `).run(jsonData, now, projectId, fileKey, nodeId);
      } else {
        this.db.prepare(`
          UPDATE figma_file_data
          SET data = ?, updatedAt = ?
          WHERE project_id = ? AND fileKey = ? AND nodeId IS NULL
        `).run(jsonData, now, projectId, fileKey);
      }
    } else {
      this.db.prepare(`
        INSERT INTO figma_file_data (project_id, fileKey, nodeId, data, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(projectId, fileKey, nodeId, jsonData, now);
    }

    return { projectId, fileKey, nodeId, data: jsonData, updatedAt: now };
  }

  delete(projectId: string, fileKey: string, nodeId: string | null): void {
    if (nodeId) {
      this.db.prepare('DELETE FROM figma_file_data WHERE project_id = ? AND fileKey = ? AND nodeId = ?').run(projectId, fileKey, nodeId);
    } else {
      this.db.prepare('DELETE FROM figma_file_data WHERE project_id = ? AND fileKey = ? AND nodeId IS NULL').run(projectId, fileKey);
    }
  }

  listByProject(projectId: string): FigmaFileData[] {
    return this.db.prepare(
      'SELECT project_id as projectId, fileKey, nodeId, data, updatedAt FROM figma_file_data WHERE project_id = ?'
    ).all(projectId) as FigmaFileData[];
  }

  deleteByProject(projectId: string): number {
    const result = this.db.prepare('DELETE FROM figma_file_data WHERE project_id = ?').run(projectId);
    return result.changes;
  }
}
