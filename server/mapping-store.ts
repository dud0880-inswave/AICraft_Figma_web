// ============================================================
// Node Mapping Store — Figma 노드 ↔ WebSquare 컴포넌트 매핑
// ============================================================
import { randomUUID } from 'crypto';
import type { Database } from 'better-sqlite3';

export interface NodeMapping {
  id: string;
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
  constructor(private db: Database) {
    this.migrate();
  }

  private migrate(): void {
    // figma_root_node_id 컬럼 추가 (이미 존재하면 무시)
    const columns = this.db.prepare('PRAGMA table_info(node_mappings)').all() as { name: string }[];
    const hasColumn = columns.some(c => c.name === 'figma_root_node_id');
    if (!hasColumn) {
      this.db.prepare('ALTER TABLE node_mappings ADD COLUMN figma_root_node_id TEXT').run();
      // 기존 데이터 마이그레이션: figma_files에서 nodeId 가져와서 설정
      this.db.prepare(`
        UPDATE node_mappings SET figma_root_node_id = (
          SELECT nodeId FROM figma_files WHERE figma_files.fileKey = node_mappings.figma_file_key LIMIT 1
        )
      `).run();
      console.log('[MappingStore] Migration: added figma_root_node_id column');
    }
    // 인덱스 생성
    this.db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_node_mappings_file_root ON node_mappings(figma_file_key, figma_root_node_id)'
    ).run();
  }

  // 매핑 조회 (파일 + 루트노드 + 노드)
  get(fileKey: string, rootNodeId: string | null, nodeId: string): NodeMapping | null {
    const row = this.db.prepare(
      'SELECT * FROM node_mappings WHERE figma_file_key = ? AND figma_root_node_id IS ? AND figma_node_id = ?'
    ).get(fileKey, rootNodeId, nodeId) as RawMapping | undefined;
    return row ? toMapping(row) : null;
  }

  // 파일+루트노드의 모든 매핑 조회
  listByFile(fileKey: string, rootNodeId?: string | null): NodeMapping[] {
    if (rootNodeId !== undefined) {
      const rows = this.db.prepare(
        'SELECT * FROM node_mappings WHERE figma_file_key = ? AND figma_root_node_id IS ? ORDER BY created_at DESC'
      ).all(fileKey, rootNodeId) as RawMapping[];
      return rows.map(toMapping);
    }
    // rootNodeId 미지정: fileKey 전체
    const rows = this.db.prepare(
      'SELECT * FROM node_mappings WHERE figma_file_key = ? ORDER BY created_at DESC'
    ).all(fileKey) as RawMapping[];
    return rows.map(toMapping);
  }

  // 매핑 저장 (upsert)
  save(mapping: Omit<NodeMapping, 'id' | 'createdAt' | 'updatedAt'>): NodeMapping {
    const existing = this.get(mapping.figmaFileKey, mapping.figmaRootNodeId, mapping.figmaNodeId);
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
        WHERE figma_file_key = ? AND figma_root_node_id IS ? AND figma_node_id = ?
      `).run(
        mapping.figmaNodeName,
        mapping.figmaNodeType ?? null,
        mapping.registryId ?? null,
        mapping.registryName ?? null,
        mapping.registryTag ?? null,
        JSON.stringify(mapping.customAttrs),
        mapping.status,
        now,
        mapping.figmaFileKey,
        mapping.figmaRootNodeId,
        mapping.figmaNodeId
      );
      return this.get(mapping.figmaFileKey, mapping.figmaRootNodeId, mapping.figmaNodeId)!;
    } else {
      const id = randomUUID();
      this.db.prepare(`
        INSERT INTO node_mappings
          (id, figma_file_key, figma_root_node_id, figma_node_id, figma_node_name, figma_node_type,
           registry_id, registry_name, registry_tag, custom_attrs, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
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
      return this.get(mapping.figmaFileKey, mapping.figmaRootNodeId, mapping.figmaNodeId)!;
    }
  }

  // 매핑 삭제
  delete(fileKey: string, rootNodeId: string | null, nodeId: string): boolean {
    const result = this.db.prepare(
      'DELETE FROM node_mappings WHERE figma_file_key = ? AND figma_root_node_id IS ? AND figma_node_id = ?'
    ).run(fileKey, rootNodeId, nodeId);
    return result.changes > 0;
  }

  // 파일+루트노드 기준 매핑 전체 삭제
  deleteByFileKey(fileKey: string, rootNodeId?: string | null): number {
    if (rootNodeId !== undefined) {
      const result = this.db.prepare(
        'DELETE FROM node_mappings WHERE figma_file_key = ? AND figma_root_node_id IS ?'
      ).run(fileKey, rootNodeId);
      return result.changes;
    }
    const result = this.db.prepare(
      'DELETE FROM node_mappings WHERE figma_file_key = ?'
    ).run(fileKey);
    return result.changes;
  }
}

// ---- Row → Domain ----
interface RawMapping {
  id: string;
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
