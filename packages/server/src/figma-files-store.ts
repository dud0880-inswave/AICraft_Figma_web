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
  version: string;
  xmlFilename: string | null;
  projectId: string | null;
}

export class FigmaFilesStore {
  constructor(private db: Database) {}

  list(): FigmaFileRecord[] {
    const rows = this.db.prepare(`
      SELECT id, fileKey, nodeId, name, thumbnailUrl, lastOpenedAt, createdAt, completed, version, xmlFilename, project_id
      FROM figma_files
      ORDER BY lastOpenedAt DESC
    `).all() as any[];
    return rows.map(row => ({ ...row, completed: !!row.completed, projectId: row.project_id }));
  }

  listByProject(projectId: string): FigmaFileRecord[] {
    const rows = this.db.prepare(`
      SELECT id, fileKey, nodeId, name, thumbnailUrl, lastOpenedAt, createdAt, completed, version, xmlFilename, project_id
      FROM figma_files
      WHERE project_id = ?
      ORDER BY lastOpenedAt DESC
    `).all(projectId) as any[];
    return rows.map(row => ({ ...row, completed: !!row.completed, projectId: row.project_id }));
  }

  get(fileKey: string, nodeId: string | null, projectId?: string): FigmaFileRecord | null {
    let row: any;
    if (projectId) {
      // 프로젝트별 조회
      if (nodeId) {
        row = this.db.prepare(`
          SELECT id, fileKey, nodeId, name, thumbnailUrl, lastOpenedAt, createdAt, completed, version, xmlFilename, project_id
          FROM figma_files
          WHERE project_id = ? AND fileKey = ? AND nodeId = ?
        `).get(projectId, fileKey, nodeId);
      } else {
        row = this.db.prepare(`
          SELECT id, fileKey, nodeId, name, thumbnailUrl, lastOpenedAt, createdAt, completed, version, xmlFilename, project_id
          FROM figma_files
          WHERE project_id = ? AND fileKey = ? AND nodeId IS NULL
        `).get(projectId, fileKey);
      }
    } else {
      // 전역 조회 (기존 호환성)
      if (nodeId) {
        row = this.db.prepare(`
          SELECT id, fileKey, nodeId, name, thumbnailUrl, lastOpenedAt, createdAt, completed, version, xmlFilename, project_id
          FROM figma_files
          WHERE fileKey = ? AND nodeId = ?
        `).get(fileKey, nodeId);
      } else {
        row = this.db.prepare(`
          SELECT id, fileKey, nodeId, name, thumbnailUrl, lastOpenedAt, createdAt, completed, version, xmlFilename, project_id
          FROM figma_files
          WHERE fileKey = ? AND nodeId IS NULL
        `).get(fileKey);
      }
    }
    if (!row) return null;
    return { ...row, completed: !!row.completed, projectId: row.project_id };
  }

  upsert(fileKey: string, nodeId: string | null, name: string, thumbnailUrl: string | null, projectId: string): FigmaFileRecord {
    const now = new Date().toISOString();
    // 같은 프로젝트 내에서만 기존 레코드 검색
    const existing = this.get(fileKey, nodeId, projectId);

    if (existing) {
      if (nodeId) {
        this.db.prepare(`
          UPDATE figma_files
          SET name = ?, thumbnailUrl = ?, lastOpenedAt = ?
          WHERE project_id = ? AND fileKey = ? AND nodeId = ?
        `).run(name, thumbnailUrl, now, projectId, fileKey, nodeId);
      } else {
        this.db.prepare(`
          UPDATE figma_files
          SET name = ?, thumbnailUrl = ?, lastOpenedAt = ?
          WHERE project_id = ? AND fileKey = ? AND nodeId IS NULL
        `).run(name, thumbnailUrl, now, projectId, fileKey);
      }

      return { ...existing, name, thumbnailUrl, lastOpenedAt: now, projectId };
    } else {
      const id = randomUUID();
      this.db.prepare(`
        INSERT INTO figma_files (id, fileKey, nodeId, name, thumbnailUrl, lastOpenedAt, createdAt, completed, version, xmlFilename, project_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, '01', NULL, ?)
      `).run(id, fileKey, nodeId, name, thumbnailUrl, now, now, projectId);

      return { id, fileKey, nodeId, name, thumbnailUrl, lastOpenedAt: now, createdAt: now, completed: false, version: '01', xmlFilename: null, projectId };
    }
  }

  delete(fileKey: string, nodeId: string | null): void {
    if (nodeId) {
      this.db.prepare('DELETE FROM figma_files WHERE fileKey = ? AND nodeId = ?').run(fileKey, nodeId);
    } else {
      this.db.prepare('DELETE FROM figma_files WHERE fileKey = ? AND nodeId IS NULL').run(fileKey);
    }
  }

  deleteByProject(projectId: string): number {
    const result = this.db.prepare('DELETE FROM figma_files WHERE project_id = ?').run(projectId);
    return result.changes;
  }

  // lastOpenedAt만 업데이트 (프로젝트별)
  updateLastOpened(projectId: string, fileKey: string, nodeId: string | null): void {
    const now = new Date().toISOString();
    if (nodeId) {
      this.db.prepare(`
        UPDATE figma_files SET lastOpenedAt = ? WHERE project_id = ? AND fileKey = ? AND nodeId = ?
      `).run(now, projectId, fileKey, nodeId);
    } else {
      this.db.prepare(`
        UPDATE figma_files SET lastOpenedAt = ? WHERE project_id = ? AND fileKey = ? AND nodeId IS NULL
      `).run(now, projectId, fileKey);
    }
  }

  // completed 상태 업데이트 (프로젝트별)
  updateCompleted(projectId: string, fileKey: string, nodeId: string | null, completed: boolean): void {
    if (nodeId) {
      this.db.prepare(`
        UPDATE figma_files SET completed = ? WHERE project_id = ? AND fileKey = ? AND nodeId = ?
      `).run(completed ? 1 : 0, projectId, fileKey, nodeId);
    } else {
      this.db.prepare(`
        UPDATE figma_files SET completed = ? WHERE project_id = ? AND fileKey = ? AND nodeId IS NULL
      `).run(completed ? 1 : 0, projectId, fileKey);
    }
  }

  // XML 다운로드 파일명 업데이트 (최초 저장 시에만 호출)
  updateXmlFilename(projectId: string, fileKey: string, nodeId: string | null, xmlFilename: string): void {
    if (nodeId) {
      this.db.prepare(`
        UPDATE figma_files SET xmlFilename = ? WHERE project_id = ? AND fileKey = ? AND nodeId = ?
      `).run(xmlFilename, projectId, fileKey, nodeId);
    } else {
      this.db.prepare(`
        UPDATE figma_files SET xmlFilename = ? WHERE project_id = ? AND fileKey = ? AND nodeId IS NULL
      `).run(xmlFilename, projectId, fileKey);
    }
  }

  // 버전 증가: 현재 버전의 숫자에 +1 후 2자리 zero-pad로 저장
  incrementVersion(projectId: string, fileKey: string, nodeId: string | null): string {
    const existing = this.get(fileKey, nodeId, projectId);
    if (!existing) return '01';
    const current = parseInt(existing.version || '01', 10);
    const next = String(current + 1).padStart(2, '0');
    if (nodeId) {
      this.db.prepare(`
        UPDATE figma_files SET version = ? WHERE project_id = ? AND fileKey = ? AND nodeId = ?
      `).run(next, projectId, fileKey, nodeId);
    } else {
      this.db.prepare(`
        UPDATE figma_files SET version = ? WHERE project_id = ? AND fileKey = ? AND nodeId IS NULL
      `).run(next, projectId, fileKey);
    }
    return next;
  }
}
