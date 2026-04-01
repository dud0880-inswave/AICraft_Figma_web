// ============================================================
// Settings Store — 글로벌/프로젝트별 설정 관리
// ============================================================
import type { Database } from 'better-sqlite3';

export interface Setting {
  projectId: string | null;  // null = global
  key: string;
  value: string;
}

export class SettingsStore {
  constructor(private db: Database) {}

  // 설정 조회 (프로젝트 ID + 키)
  get(projectId: string | null, key: string): string | null {
    const row = this.db.prepare(`
      SELECT value FROM settings WHERE project_id IS ? AND key = ?
    `).get(projectId, key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  // 프로젝트의 모든 설정 조회
  listByProject(projectId: string | null): Setting[] {
    const rows = this.db.prepare(`
      SELECT project_id, key, value FROM settings WHERE project_id IS ?
    `).all(projectId) as Array<{ project_id: string | null; key: string; value: string }>;
    return rows.map(r => ({
      projectId: r.project_id,
      key: r.key,
      value: r.value,
    }));
  }

  // 설정 저장 (upsert)
  set(projectId: string | null, key: string, value: string): void {
    const existing = this.get(projectId, key);
    if (existing !== null) {
      this.db.prepare(`
        UPDATE settings SET value = ? WHERE project_id IS ? AND key = ?
      `).run(value, projectId, key);
    } else {
      this.db.prepare(`
        INSERT INTO settings (project_id, key, value) VALUES (?, ?, ?)
      `).run(projectId, key, value);
    }
  }

  // 설정 삭제
  delete(projectId: string | null, key: string): boolean {
    const result = this.db.prepare(`
      DELETE FROM settings WHERE project_id IS ? AND key = ?
    `).run(projectId, key);
    return result.changes > 0;
  }

  // 프로젝트의 모든 설정 삭제
  deleteByProject(projectId: string): number {
    const result = this.db.prepare(`
      DELETE FROM settings WHERE project_id = ?
    `).run(projectId);
    return result.changes;
  }

  // 여러 설정 한번에 저장
  setMultiple(projectId: string | null, settings: Record<string, string>): void {
    const tx = this.db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        this.set(projectId, key, value);
      }
    });
    tx();
  }

  // 프로젝트 설정을 객체로 반환
  getAsObject(projectId: string | null): Record<string, string> {
    const settings = this.listByProject(projectId);
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }
}
