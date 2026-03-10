// ============================================================
// Registry Store — WebSquare 컴포넌트 레지스트리 (간소화)
// ============================================================
import { randomUUID } from 'crypto';
import type { Database } from 'better-sqlite3';

export interface RegistryItem {
  id: string;
  name: string;
  tagName: string;
  properties: Record<string, string>;
}

interface ComponentData {
  name: string;
  tagName: string;
  properties: Record<string, string>;
}

const COMPONENTS: ComponentData[] = [
  { name: "checkbox", tagName: "xf:select", properties: { appearance: "full", rows: "1" } },
  { name: "radio", tagName: "xf:select1", properties: { appearance: "full" } },
  { name: "select", tagName: "xf:select1", properties: { appearance: "minimal" } },
  { name: "input", tagName: "xf:input", properties: {} },
  { name: "multiselect", tagName: "xf:select", properties: { appearance: "minimal" } },
  { name: "inputcalendar", tagName: "w2:inputCalendar", properties: {} },
  { name: "button", tagName: "w2:button", properties: {} },
  { name: "pagelist", tagName: "w2:pageList", properties: {} },
  { name: "textarea", tagName: "xf:textarea", properties: {} },
  { name: "tabcontrol", tagName: "w2:tabControl", properties: {} },
  { name: "textbox", tagName: "w2:textbox", properties: {} },
  { name: "table", tagName: "xf:group", properties: { tagname: "table", class: "w2tb" } },
  { name: "tr", tagName: "xf:group", properties: { tagname: "tr" } },
  { name: "th", tagName: "xf:group", properties: { tagname: "th", class: "w2tb_th" } },
  { name: "td", tagName: "xf:group", properties: { tagname: "td", class: "w2tb_td" } },
  { name: "gridview", tagName: "w2:gridView", properties: {} },
  { name: "searchbox", tagName: "w2:Searchbox", properties: {} },
  { name: "group", tagName: "xf:group", properties: {} },
];

export class RegistryStore {
  constructor(private db: Database) {
    this.init();
  }

  private init(): void {
    // 테이블 생성
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS registry (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE,
        tagName    TEXT NOT NULL DEFAULT '',
        properties TEXT NOT NULL DEFAULT '{}'
      )
    `).run();

    // 기존 데이터 확인
    const existing = this.db.prepare('SELECT name, tagName, properties FROM registry').all() as { name: string; tagName: string; properties: string }[];
    const existingMap = new Map(existing.map(r => [r.name, r]));

    const insert = this.db.prepare('INSERT INTO registry (id, name, tagName, properties) VALUES (?, ?, ?, ?)');
    const update = this.db.prepare('UPDATE registry SET tagName = ?, properties = ? WHERE name = ?');

    const tx = this.db.transaction(() => {
      for (const comp of COMPONENTS) {
        const propsJson = JSON.stringify(comp.properties);
        const ex = existingMap.get(comp.name);

        if (!ex) {
          // 새로 추가
          insert.run(randomUUID(), comp.name, comp.tagName, propsJson);
          console.log(`[Registry] 추가: ${comp.name}`);
        } else if (ex.tagName !== comp.tagName || ex.properties !== propsJson) {
          // 업데이트
          update.run(comp.tagName, propsJson, comp.name);
          console.log(`[Registry] 업데이트: ${comp.name}`);
        }
      }
    });
    tx();
  }

  list(): RegistryItem[] {
    const rows = this.db.prepare('SELECT id, name, tagName, properties FROM registry ORDER BY name').all() as { id: string; name: string; tagName: string; properties: string }[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      tagName: r.tagName,
      properties: JSON.parse(r.properties),
    }));
  }

  get(id: string): RegistryItem | null {
    const r = this.db.prepare('SELECT id, name, tagName, properties FROM registry WHERE id = ?').get(id) as { id: string; name: string; tagName: string; properties: string } | undefined;
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      tagName: r.tagName,
      properties: JSON.parse(r.properties),
    };
  }

  getByName(name: string): RegistryItem | null {
    const r = this.db.prepare('SELECT id, name, tagName, properties FROM registry WHERE name = ?').get(name) as { id: string; name: string; tagName: string; properties: string } | undefined;
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      tagName: r.tagName,
      properties: JSON.parse(r.properties),
    };
  }

  create(data: { name: string; tagName: string; properties: Record<string, string> }): RegistryItem {
    const id = randomUUID();
    const propsJson = JSON.stringify(data.properties || {});
    this.db.prepare('INSERT INTO registry (id, name, tagName, properties) VALUES (?, ?, ?, ?)').run(id, data.name, data.tagName, propsJson);
    return { id, name: data.name, tagName: data.tagName, properties: data.properties || {} };
  }

  update(id: string, data: { name?: string; tagName?: string; properties?: Record<string, string> }): RegistryItem | null {
    const existing = this.get(id);
    if (!existing) return null;

    const name = data.name ?? existing.name;
    const tagName = data.tagName ?? existing.tagName;
    const properties = data.properties ?? existing.properties;
    const propsJson = JSON.stringify(properties);

    this.db.prepare('UPDATE registry SET name = ?, tagName = ?, properties = ? WHERE id = ?').run(name, tagName, propsJson, id);
    return { id, name, tagName, properties };
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM registry WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
