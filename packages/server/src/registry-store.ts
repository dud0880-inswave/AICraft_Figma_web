// ============================================================
// Registry Store — WebSquare 컴포넌트 레지스트리 (프로젝트별)
// ============================================================
import { randomUUID } from 'crypto';
import type { Database } from 'better-sqlite3';

export interface RegistryItem {
  id: string;
  projectId: string;
  name: string;
  tagName: string;
  properties: Record<string, string>;
}

interface ComponentData {
  name: string;
  tagName: string;
  properties: Record<string, string>;
}

// 초기 컴포넌트 데이터 (프로젝트 생성 시 복사됨)
const INITIAL_COMPONENTS: ComponentData[] = [
  { name: "checkbox", tagName: "xf:select", properties: { appearance: "full", rows: "1" } },
  { name: "radio", tagName: "xf:select1", properties: { appearance: "full", rows: "1" } },
  { name: "select", tagName: "xf:select1", properties: { appearance: "minimal" } },
  { name: "input", tagName: "xf:input", properties: {} },
  { name: "multiselect", tagName: "xf:select", properties: { appearance: "minimal" } },
  { name: "inputcalendar", tagName: "w2:inputCalendar", properties: {} },
  { name: "button", tagName: "w2:button", properties: {} },
  { name: "trigger", tagName: "xf:trigger", properties: { type: "button" } },
  { name: "span", tagName: "w2:span", properties: {} },
  { name: "pageFrame", tagName: "w2:pageFrame", properties: {} },
  { name: "pagelist", tagName: "w2:pageList", properties: { displayButtonType: "display", adaptive: "none" } },
  { name: "textarea", tagName: "xf:textarea", properties: {} },
  { name: "tabcontrol", tagName: "w2:tabControl", properties: {} },
  { name: "textbox", tagName: "w2:textbox", properties: {} },
  { name: "table", tagName: "xf:group", properties: { tagname: "table", class: "w2tb", style: "width:100%;" } },
  { name: "tr", tagName: "xf:group", properties: { tagname: "tr" } },
  { name: "th", tagName: "xf:group", properties: { tagname: "th", class: "w2tb_th" } },
  { name: "td", tagName: "xf:group", properties: { tagname: "td", class: "w2tb_td" } },
  { name: "gridview", tagName: "w2:gridView", properties: { style: "height:153px;", autoFit: "allColumn" } },
  { name: "searchbox", tagName: "w2:Searchbox", properties: {} },
  { name: "group", tagName: "xf:group", properties: {} },
  { name: "anchor", tagName: "w2:anchor", properties: { outerDiv: "false" } },
  { name: "image", tagName: "xf:image", properties: {} },
  { name: "widget", tagName: "w2:widgetContainer", properties: { horizontalMargin: "8", verticalMargin: "8", preventMaximizeByTitle: "true", widgetMove: "true", mode: "pushpull" } },
  { name: "widgetItem", tagName: "__widgetItem__", properties: {} },
  { name: "widgetTitle", tagName: "__widgetTitle__", properties: {} },
  { name: "widgetContent", tagName: "__widgetContent__", properties: {} },
];

export class RegistryStore {
  constructor(private db: Database) {}

  // 프로젝트 생성 시 초기 컴포넌트 데이터 삽입
  seedForProject(projectId: string): void {
    const insert = this.db.prepare('INSERT INTO registry (id, project_id, name, tagName, properties) VALUES (?, ?, ?, ?, ?)');

    const tx = this.db.transaction(() => {
      for (const comp of INITIAL_COMPONENTS) {
        insert.run(randomUUID(), projectId, comp.name, comp.tagName, JSON.stringify(comp.properties));
      }
    });
    tx();
    console.log(`[Registry] 프로젝트 ${projectId}에 ${INITIAL_COMPONENTS.length}개 컴포넌트 초기화`);
  }

  // 프로젝트별 컴포넌트 목록
  listByProject(projectId: string): RegistryItem[] {
    const rows = this.db.prepare('SELECT id, project_id, name, tagName, properties FROM registry WHERE project_id = ? ORDER BY name').all(projectId) as { id: string; project_id: string; name: string; tagName: string; properties: string }[];
    return rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      name: r.name,
      tagName: r.tagName,
      properties: JSON.parse(r.properties),
    }));
  }

  get(id: string): RegistryItem | null {
    const r = this.db.prepare('SELECT id, project_id, name, tagName, properties FROM registry WHERE id = ?').get(id) as { id: string; project_id: string; name: string; tagName: string; properties: string } | undefined;
    if (!r) return null;
    return {
      id: r.id,
      projectId: r.project_id,
      name: r.name,
      tagName: r.tagName,
      properties: JSON.parse(r.properties),
    };
  }

  getByName(projectId: string, name: string): RegistryItem | null {
    const r = this.db.prepare('SELECT id, project_id, name, tagName, properties FROM registry WHERE project_id = ? AND name = ?').get(projectId, name) as { id: string; project_id: string; name: string; tagName: string; properties: string } | undefined;
    if (!r) return null;
    return {
      id: r.id,
      projectId: r.project_id,
      name: r.name,
      tagName: r.tagName,
      properties: JSON.parse(r.properties),
    };
  }

  create(projectId: string, data: { name: string; tagName: string; properties: Record<string, string> }): RegistryItem {
    const id = randomUUID();
    const propsJson = JSON.stringify(data.properties || {});
    this.db.prepare('INSERT INTO registry (id, project_id, name, tagName, properties) VALUES (?, ?, ?, ?, ?)').run(id, projectId, data.name, data.tagName, propsJson);
    return { id, projectId, name: data.name, tagName: data.tagName, properties: data.properties || {} };
  }

  update(id: string, data: { name?: string; tagName?: string; properties?: Record<string, string> }): RegistryItem | null {
    const existing = this.get(id);
    if (!existing) return null;

    const name = data.name ?? existing.name;
    const tagName = data.tagName ?? existing.tagName;
    const properties = data.properties ?? existing.properties;
    const propsJson = JSON.stringify(properties);

    this.db.prepare('UPDATE registry SET name = ?, tagName = ?, properties = ? WHERE id = ?').run(name, tagName, propsJson, id);
    return { id, projectId: existing.projectId, name, tagName, properties };
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM registry WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // 프로젝트 삭제 시 해당 프로젝트의 모든 컴포넌트 삭제
  deleteByProject(projectId: string): void {
    this.db.prepare('DELETE FROM registry WHERE project_id = ?').run(projectId);
  }
}
