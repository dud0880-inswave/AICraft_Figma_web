// ============================================================
// Default Mapping Rules Store — 노드 이름 기반 자동 매핑 기본 규칙
// ============================================================
import { randomUUID } from 'crypto';
import type { Database } from 'better-sqlite3';

export interface DefaultMappingRule {
  id: string;
  registryId: string;
  keyword: string;
  createdAt: string;
  updatedAt: string;
}

// 컴포넌트 이름별 초기 기본 키워드 목록
// registry 테이블의 name 컬럼 기준으로 매핑
const INITIAL_RULES: { registryName: string; keywords: string[] }[] = [
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
  constructor(private db: Database) {
    this.seed();
  }

  // registry에 데이터가 있을 때 초기 룰 삽입 (없는 것만)
  private seed(): void {
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO default_mapping_rules (id, registry_id, keyword, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();

    const tx = this.db.transaction(() => {
      for (const rule of INITIAL_RULES) {
        const reg = this.db.prepare('SELECT id FROM registry WHERE name = ?').get(rule.registryName) as { id: string } | undefined;
        if (!reg) continue;

        for (const keyword of rule.keywords) {
          const result = insert.run(randomUUID(), reg.id, keyword, now, now);
          if (result.changes > 0) {
            console.log(`[DefaultMappingRules] 추가: ${rule.registryName} ← "${keyword}"`);
          }
        }
      }
    });
    tx();
  }

  list(): DefaultMappingRule[] {
    const rows = this.db.prepare(`
      SELECT id, registry_id, keyword, created_at, updated_at
      FROM default_mapping_rules
      ORDER BY LENGTH(keyword) DESC, keyword ASC
    `).all() as { id: string; registry_id: string; keyword: string; created_at: string; updated_at: string }[];

    return rows.map(r => ({
      id: r.id,
      registryId: r.registry_id,
      keyword: r.keyword,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  // registry_id 별 그룹화 목록 (UI용)
  listGrouped(): { registryId: string; registryName: string; keywords: string[]; rules: { id: string; keyword: string }[] }[] {
    const rows = this.db.prepare(`
      SELECT dmr.id, dmr.registry_id, r.name as registry_name, dmr.keyword
      FROM default_mapping_rules dmr
      JOIN registry r ON r.id = dmr.registry_id
      ORDER BY r.name, LENGTH(dmr.keyword) DESC
    `).all() as { id: string; registry_id: string; registry_name: string; keyword: string }[];

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
      SELECT id, registry_id, keyword, created_at, updated_at
      FROM default_mapping_rules WHERE id = ?
    `).get(id) as { id: string; registry_id: string; keyword: string; created_at: string; updated_at: string } | undefined;

    if (!r) return null;
    return { id: r.id, registryId: r.registry_id, keyword: r.keyword, createdAt: r.created_at, updatedAt: r.updated_at };
  }

  create(data: { registryId: string; keyword: string }): DefaultMappingRule {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO default_mapping_rules (id, registry_id, keyword, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.registryId, data.keyword, now, now);
    return { id, registryId: data.registryId, keyword: data.keyword, createdAt: now, updatedAt: now };
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

  /**
   * 노드 이름으로 매칭되는 registry_id 반환
   * 키워드 길이 내림차순으로 정렬된 목록에서 첫 매칭 반환 (더 구체적인 키워드 우선)
   */
  match(nodeName: string): { registryId: string; matchedKeyword: string } | null {
    const lower = nodeName.toLowerCase();

    // 길이 내림차순 정렬된 전체 룰 조회
    const rows = this.db.prepare(`
      SELECT registry_id, keyword
      FROM default_mapping_rules
      ORDER BY LENGTH(keyword) DESC
    `).all() as { registry_id: string; keyword: string }[];

    for (const row of rows) {
      if (lower.includes(row.keyword.toLowerCase())) {
        return { registryId: row.registry_id, matchedKeyword: row.keyword };
      }
    }

    return null;
  }
}
