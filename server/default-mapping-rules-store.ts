// ============================================================
// Default Mapping Rules Store — 노드 이름 기반 자동 매핑 기본 규칙 (프로젝트별)
// ============================================================
import { randomUUID } from 'crypto';
import type { Database } from 'better-sqlite3';

export interface DefaultMappingRule {
  id: string;
  projectId: string;
  registryId: string;
  keyword: string;
  createdAt: string;
  updatedAt: string;
}

// 컴포넌트 이름별 초기 기본 키워드 목록
const INITIAL_RULES: { registryName: string; keywords: string[] }[] = [
  { registryName: 'anchor',        keywords: ['anchor', '앵커'] },
  { registryName: 'button',        keywords: ['button', '버튼'] },
  { registryName: 'checkbox',      keywords: ['checkbox', '체크박스'] },
  { registryName: 'gridview',      keywords: ['gridview', 'grid', '그리드뷰', '그리드'] },
  { registryName: 'group',         keywords: ['group', '그룹'] },
  { registryName: 'inputcalendar', keywords: ['inputcalendar', '달력'] },
  { registryName: 'input',         keywords: ['inputbox', 'input', '인풋박스', '인풋', '입력'] },
  { registryName: 'multiselect',   keywords: ['multiselect', '다중선택'] },
  { registryName: 'pagelist',      keywords: ['pagelist', '페이지리스트'] },
  { registryName: 'radio',         keywords: ['radio', '라디오'] },
  { registryName: 'searchbox',     keywords: ['searchbox', '서치박스'] },
  { registryName: 'select',        keywords: ['select', '셀렉트박스', '선택'] },
  { registryName: 'tabcontrol',    keywords: ['tabcontrol', '탭컨트롤', 'tab', '탭'] },
  { registryName: 'table',         keywords: ['table', '테이블'] },
  { registryName: 'td',            keywords: ['td'] },
  { registryName: 'textarea',      keywords: ['textarea'] },
  { registryName: 'textbox',       keywords: ['textbox', '텍스트박스', 'text', '텍스트'] },
  { registryName: 'th',            keywords: ['th'] },
  { registryName: 'tr',            keywords: ['tr'] },
];

export class DefaultMappingRulesStore {
  constructor(private db: Database) {}

  // 프로젝트 생성 시 초기 규칙 삽입
  seedForProject(projectId: string): void {
    const insert = this.db.prepare(`
      INSERT INTO default_mapping_rules (id, project_id, registry_id, keyword, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();

    const tx = this.db.transaction(() => {
      for (const rule of INITIAL_RULES) {
        // 해당 프로젝트의 registry에서 컴포넌트 찾기
        const reg = this.db.prepare('SELECT id FROM registry WHERE project_id = ? AND name = ?').get(projectId, rule.registryName) as { id: string } | undefined;
        if (!reg) continue;

        for (const keyword of rule.keywords) {
          insert.run(randomUUID(), projectId, reg.id, keyword, now, now);
        }
      }
    });
    tx();
    console.log(`[DefaultMappingRules] 프로젝트 ${projectId}에 초기 규칙 생성`);
  }

  // 프로젝트별 규칙 목록
  listByProject(projectId: string): DefaultMappingRule[] {
    const rows = this.db.prepare(`
      SELECT id, project_id, registry_id, keyword, created_at, updated_at
      FROM default_mapping_rules
      WHERE project_id = ?
      ORDER BY LENGTH(keyword) DESC, keyword ASC
    `).all(projectId) as { id: string; project_id: string; registry_id: string; keyword: string; created_at: string; updated_at: string }[];

    return rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      registryId: r.registry_id,
      keyword: r.keyword,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  // 프로젝트별 그룹화 목록 (UI용)
  listGroupedByProject(projectId: string): { registryId: string; registryName: string; keywords: string[]; rules: { id: string; keyword: string }[] }[] {
    const rows = this.db.prepare(`
      SELECT dmr.id, dmr.registry_id, r.name as registry_name, dmr.keyword
      FROM default_mapping_rules dmr
      JOIN registry r ON r.id = dmr.registry_id
      WHERE dmr.project_id = ?
      ORDER BY r.name, LENGTH(dmr.keyword) DESC
    `).all(projectId) as { id: string; registry_id: string; registry_name: string; keyword: string }[];

    const map = new Map<string, { registryId: string; registryName: string; keywords: string[]; rules: { id: string; keyword: string }[] }>();
    for (const row of rows) {
      if (!map.has(row.registry_id)) {
        map.set(row.registry_id, { registryId: row.registry_id, registryName: row.registry_name, keywords: [], rules: [] });
      }
      const group = map.get(row.registry_id)!;
      group.keywords.push(row.keyword);
      group.rules.push({ id: row.id, keyword: row.keyword });
    }
    return Array.from(map.values());
  }

  get(id: string): DefaultMappingRule | null {
    const r = this.db.prepare(`
      SELECT id, project_id, registry_id, keyword, created_at, updated_at
      FROM default_mapping_rules WHERE id = ?
    `).get(id) as { id: string; project_id: string; registry_id: string; keyword: string; created_at: string; updated_at: string } | undefined;

    if (!r) return null;
    return { id: r.id, projectId: r.project_id, registryId: r.registry_id, keyword: r.keyword, createdAt: r.created_at, updatedAt: r.updated_at };
  }

  create(projectId: string, data: { registryId: string; keyword: string }): DefaultMappingRule {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO default_mapping_rules (id, project_id, registry_id, keyword, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, projectId, data.registryId, data.keyword, now, now);
    return { id, projectId, registryId: data.registryId, keyword: data.keyword, createdAt: now, updatedAt: now };
  }

  update(id: string, data: { registryId?: string; keyword?: string }): DefaultMappingRule | null {
    const existing = this.get(id);
    if (!existing) return null;

    const registryId = data.registryId ?? existing.registryId;
    const keyword = data.keyword ?? existing.keyword;
    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE default_mapping_rules SET registry_id = ?, keyword = ?, updated_at = ? WHERE id = ?
    `).run(registryId, keyword, now, id);

    return { ...existing, registryId, keyword, updatedAt: now };
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM default_mapping_rules WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // 프로젝트 삭제 시 해당 프로젝트의 모든 규칙 삭제
  deleteByProject(projectId: string): void {
    this.db.prepare('DELETE FROM default_mapping_rules WHERE project_id = ?').run(projectId);
  }

  // 프로젝트의 모든 규칙 삭제 후 초기 규칙으로 재설정
  resetForProject(projectId: string): number {
    // 모든 규칙 삭제
    this.db.prepare('DELETE FROM default_mapping_rules WHERE project_id = ?').run(projectId);

    // 초기 규칙 재삽입
    const insert = this.db.prepare(`
      INSERT INTO default_mapping_rules (id, project_id, registry_id, keyword, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    let count = 0;

    const tx = this.db.transaction(() => {
      for (const rule of INITIAL_RULES) {
        const reg = this.db.prepare('SELECT id FROM registry WHERE project_id = ? AND name = ?').get(projectId, rule.registryName) as { id: string } | undefined;
        if (!reg) continue;

        for (const keyword of rule.keywords) {
          insert.run(randomUUID(), projectId, reg.id, keyword, now, now);
          count++;
        }
      }
    });
    tx();

    console.log(`[DefaultMappingRules] 프로젝트 ${projectId}에 ${count}개 초기 규칙 복원`);
    return count;
  }

  // 노드 이름으로 매칭되는 registry_id 반환 (프로젝트별)
  match(projectId: string, nodeName: string): { registryId: string; matchedKeyword: string } | null {
    const lower = nodeName.toLowerCase();

    const rows = this.db.prepare(`
      SELECT registry_id, keyword
      FROM default_mapping_rules
      WHERE project_id = ?
      ORDER BY LENGTH(keyword) DESC
    `).all(projectId) as { registry_id: string; keyword: string }[];

    for (const row of rows) {
      if (lower.includes(row.keyword.toLowerCase())) {
        return { registryId: row.registry_id, matchedKeyword: row.keyword };
      }
    }

    return null;
  }
}
