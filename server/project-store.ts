// ============================================================
// Project Store — 프로젝트 CRUD
// ============================================================
import { randomUUID } from 'crypto';
import type { Database } from 'better-sqlite3';

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export class ProjectStore {
  constructor(private db: Database) {}

  list(): Project[] {
    const rows = this.db.prepare(`
      SELECT id, name, created_at, updated_at
      FROM projects
      ORDER BY created_at DESC
    `).all() as { id: string; name: string; created_at: string; updated_at: string }[];

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  get(id: string): Project | null {
    const row = this.db.prepare(`
      SELECT id, name, created_at, updated_at
      FROM projects
      WHERE id = ?
    `).get(id) as { id: string; name: string; created_at: string; updated_at: string } | undefined;

    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  getByName(name: string): Project | null {
    const row = this.db.prepare(`
      SELECT id, name, created_at, updated_at
      FROM projects
      WHERE name = ?
    `).get(name) as { id: string; name: string; created_at: string; updated_at: string } | undefined;

    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  create(name: string): Project {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO projects (id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(id, name, now, now);

    return { id, name, createdAt: now, updatedAt: now };
  }

  update(id: string, name: string): Project | null {
    const existing = this.get(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE projects SET name = ?, updated_at = ? WHERE id = ?
    `).run(name, now, id);

    return { ...existing, name, updatedAt: now };
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // 프로젝트에 속한 파일 수 조회
  getFileCount(id: string): number {
    const row = this.db.prepare(`
      SELECT COUNT(*) as count FROM figma_files WHERE project_id = ?
    `).get(id) as { count: number };
    return row.count;
  }
}
