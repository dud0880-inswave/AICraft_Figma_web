// ============================================================
// Node Mapping Store — Figma 노드 ↔ WebSquare 컴포넌트 매핑 (프로젝트별)
// ============================================================
import { randomUUID } from 'crypto';
import type { Database } from 'better-sqlite3';

export interface NodeMapping {
  id: string;
  projectId: string;
  figmaFileKey: string;
  figmaRootNodeId: string | null;
  figmaNodeId: string;
  figmaNodeName: string;
  figmaNodeType?: string;
  registryId?: string;
  registryName?: string;
  registryTag?: string;
  customAttrs: Record<string, string>;
  status: 'pending' | 'mapped' | 'ignored';
  createdAt: string;
  updatedAt: string;
}

export class MappingStore {
  constructor(private db: Database) {}

  // 매핑 조회 (프로젝트 + 파일 + 루트노드 + 노드)
  get(projectId: string, fileKey: string, rootNodeId: string | null, nodeId: string): NodeMapping | null {
    const row = this.db.prepare(
      'SELECT * FROM node_mappings WHERE project_id = ? AND figma_file_key = ? AND figma_root_node_id IS ? AND figma_node_id = ?'
    ).get(projectId, fileKey, rootNodeId, nodeId) as RawMapping | undefined;
    return row ? toMapping(row) : null;
  }

  // 파일+루트노드의 모든 매핑 조회 (프로젝트별)
  listByFile(projectId: string, fileKey: string, rootNodeId?: string | null): NodeMapping[] {
    if (rootNodeId !== undefined) {
      const rows = this.db.prepare(
        'SELECT * FROM node_mappings WHERE project_id = ? AND figma_file_key = ? AND figma_root_node_id IS ? ORDER BY created_at DESC'
      ).all(projectId, fileKey, rootNodeId) as RawMapping[];
      return rows.map(toMapping);
    }
    // rootNodeId 미지정: fileKey 전체
    const rows = this.db.prepare(
      'SELECT * FROM node_mappings WHERE project_id = ? AND figma_file_key = ? ORDER BY created_at DESC'
    ).all(projectId, fileKey) as RawMapping[];
    return rows.map(toMapping);
  }

  // 매핑 저장 (upsert)
  save(mapping: Omit<NodeMapping, 'id' | 'createdAt' | 'updatedAt'>): NodeMapping {
    const existing = this.get(mapping.projectId, mapping.figmaFileKey, mapping.figmaRootNodeId, mapping.figmaNodeId);
    const now = new Date().toISOString();

    if (existing) {
      this.db.prepare(`
        UPDATE node_mappings SET
          figma_node_name = ?,
          figma_node_type = ?,
          registry_id = ?,
          registry_name = ?,
          registry_tag = ?,
          custom_attrs = ?,
          status = ?,
          updated_at = ?
        WHERE project_id = ? AND figma_file_key = ? AND figma_root_node_id IS ? AND figma_node_id = ?
      `).run(
        mapping.figmaNodeName,
        mapping.figmaNodeType ?? null,
        mapping.registryId ?? null,
        mapping.registryName ?? null,
        mapping.registryTag ?? null,
        JSON.stringify(mapping.customAttrs),
        mapping.status,
        now,
        mapping.projectId,
        mapping.figmaFileKey,
        mapping.figmaRootNodeId,
        mapping.figmaNodeId
      );
      return this.get(mapping.projectId, mapping.figmaFileKey, mapping.figmaRootNodeId, mapping.figmaNodeId)!;
    } else {
      const id = randomUUID();
      this.db.prepare(`
        INSERT INTO node_mappings
          (id, project_id, figma_file_key, figma_root_node_id, figma_node_id, figma_node_name, figma_node_type,
           registry_id, registry_name, registry_tag, custom_attrs, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        mapping.projectId,
        mapping.figmaFileKey,
        mapping.figmaRootNodeId,
        mapping.figmaNodeId,
        mapping.figmaNodeName,
        mapping.figmaNodeType ?? null,
        mapping.registryId ?? null,
        mapping.registryName ?? null,
        mapping.registryTag ?? null,
        JSON.stringify(mapping.customAttrs),
        mapping.status,
        now,
        now
      );
      return this.get(mapping.projectId, mapping.figmaFileKey, mapping.figmaRootNodeId, mapping.figmaNodeId)!;
    }
  }

  // 매핑 삭제
  delete(projectId: string, fileKey: string, rootNodeId: string | null, nodeId: string): boolean {
    const result = this.db.prepare(
      'DELETE FROM node_mappings WHERE project_id = ? AND figma_file_key = ? AND figma_root_node_id IS ? AND figma_node_id = ?'
    ).run(projectId, fileKey, rootNodeId, nodeId);
    return result.changes > 0;
  }

  // 파일+루트노드 기준 매핑 전체 삭제 (프로젝트별)
  deleteByFileKey(projectId: string, fileKey: string, rootNodeId?: string | null): number {
    if (rootNodeId !== undefined) {
      const result = this.db.prepare(
        'DELETE FROM node_mappings WHERE project_id = ? AND figma_file_key = ? AND figma_root_node_id IS ?'
      ).run(projectId, fileKey, rootNodeId);
      return result.changes;
    }
    const result = this.db.prepare(
      'DELETE FROM node_mappings WHERE project_id = ? AND figma_file_key = ?'
    ).run(projectId, fileKey);
    return result.changes;
  }

  // 프로젝트의 모든 매핑 삭제
  deleteByProject(projectId: string): number {
    const result = this.db.prepare('DELETE FROM node_mappings WHERE project_id = ?').run(projectId);
    return result.changes;
  }
}

// ---- Row → Domain ----
interface RawMapping {
  id: string;
  project_id: string;
  figma_file_key: string;
  figma_root_node_id: string | null;
  figma_node_id: string;
  figma_node_name: string;
  figma_node_type: string | null;
  registry_id: string | null;
  registry_name: string | null;
  registry_tag: string | null;
  custom_attrs: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function toMapping(r: RawMapping): NodeMapping {
  return {
    id: r.id,
    projectId: r.project_id,
    figmaFileKey: r.figma_file_key,
    figmaRootNodeId: r.figma_root_node_id,
    figmaNodeId: r.figma_node_id,
    figmaNodeName: r.figma_node_name,
    figmaNodeType: r.figma_node_type ?? undefined,
    registryId: r.registry_id ?? undefined,
    registryName: r.registry_name ?? undefined,
    registryTag: r.registry_tag ?? undefined,
    customAttrs: JSON.parse(r.custom_attrs),
    status: r.status as NodeMapping['status'],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
