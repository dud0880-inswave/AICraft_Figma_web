// ============================================================
// Cluster Store — 노드 구조 시그니처 기반 자동 매핑 클러스터
// ============================================================
import { randomUUID, createHash } from 'crypto';
import type { Database } from 'better-sqlite3';

export interface MappingCluster {
  id: string;
  signature: string;
  signatureData: SignatureData;
  registryId: string;
  registryName: string;
  customAttrs: Record<string, string>;
  sampleCount: number;
  source: 'generated' | 'imported';
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureData {
  name: string;
  type: string;
  componentProperties?: Record<string, { value: string; type: string }>;
  parent?: ParentData | null;  // 직속 부모 (1단계만)
  children?: SignatureData[];
}

export interface ParentData {
  name: string;
  type: string;
  componentProperties?: Record<string, { value: string; type: string }>;
  // parent, children 제외 (무한 반복 방지)
}

export interface FigmaNodeLike {
  name: string;
  type: string;
  componentProperties?: Record<string, { value: string; type: string }>;
  children?: FigmaNodeLike[];
}

export interface AutoMappingSuggestion {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  signature: string;
  registryId: string;
  registryName: string;
  customAttrs: Record<string, string>;
  sampleCount: number;
}

export class ClusterStore {
  constructor(private db: Database) {}

  // 노드 구조에서 시그니처 데이터 생성
  // parent: 직속 부모 노드 (1단계만)
  // childDepth: 자식 포함 깊이 (기본 1단계만)
  createSignatureData(node: FigmaNodeLike, parent: FigmaNodeLike | null = null, childDepth: number = 1): SignatureData {
    const data: SignatureData = {
      name: node.name,
      type: node.type,
    };

    // componentProperties 포함 (인스턴스 variant 정보 등)
    if (node.componentProperties && Object.keys(node.componentProperties).length > 0) {
      data.componentProperties = node.componentProperties;
    }

    // 직속 부모 정보 추가 (1단계만, parent/children 제외)
    if (parent) {
      const parentData: ParentData = { name: parent.name, type: parent.type };
      if (parent.componentProperties && Object.keys(parent.componentProperties).length > 0) {
        parentData.componentProperties = parent.componentProperties;
      }
      data.parent = parentData;
    } else {
      data.parent = null;
    }

    // 자식 노드 처리 (depth가 남아있을 때만)
    if (childDepth > 0 && node.children && node.children.length > 0) {
      data.children = node.children.map(child => this.createSignatureData(child, node, childDepth - 1));
    }

    return data;
  }

  // 시그니처 데이터에서 해시 생성
  createSignatureHash(signatureData: SignatureData): string {
    const json = JSON.stringify(signatureData);
    return createHash('sha256').update(json).digest('hex');
  }

  // 노드에서 직접 시그니처 해시 생성
  createNodeSignature(node: FigmaNodeLike, parent: FigmaNodeLike | null = null, childDepth: number = 1): string {
    const data = this.createSignatureData(node, parent, childDepth);
    return this.createSignatureHash(data);
  }

  // 클러스터 조회 (ID)
  get(id: string): MappingCluster | null {
    const row = this.db.prepare(
      'SELECT * FROM mapping_clusters WHERE id = ?'
    ).get(id) as RawCluster | undefined;
    return row ? toCluster(row) : null;
  }

  // 시그니처로 클러스터 조회
  getBySignature(signature: string): MappingCluster | null {
    const row = this.db.prepare(
      'SELECT * FROM mapping_clusters WHERE signature = ?'
    ).get(signature) as RawCluster | undefined;
    return row ? toCluster(row) : null;
  }

  // 시그니처 + 프로젝트로 클러스터 조회
  getBySignatureAndProject(signature: string, projectId: string | null): MappingCluster | null {
    let row: RawCluster | undefined;
    if (projectId) {
      row = this.db.prepare(
        'SELECT * FROM mapping_clusters WHERE signature = ? AND project_id = ?'
      ).get(signature, projectId) as RawCluster | undefined;
    } else {
      row = this.db.prepare(
        'SELECT * FROM mapping_clusters WHERE signature = ? AND project_id IS NULL'
      ).get(signature) as RawCluster | undefined;
    }
    return row ? toCluster(row) : null;
  }

  // 여러 시그니처로 클러스터 일괄 조회
  getBySignatures(signatures: string[]): MappingCluster[] {
    if (signatures.length === 0) return [];

    const placeholders = signatures.map(() => '?').join(',');
    const rows = this.db.prepare(
      `SELECT * FROM mapping_clusters WHERE signature IN (${placeholders})`
    ).all(...signatures) as RawCluster[];

    return rows.map(toCluster);
  }

  // 전체 클러스터 목록
  list(): MappingCluster[] {
    const rows = this.db.prepare(
      'SELECT * FROM mapping_clusters ORDER BY sample_count DESC, updated_at DESC'
    ).all() as RawCluster[];
    return rows.map(toCluster);
  }

  // 프로젝트별 클러스터 목록
  listByProject(projectId: string): MappingCluster[] {
    const rows = this.db.prepare(
      'SELECT * FROM mapping_clusters WHERE project_id = ? ORDER BY sample_count DESC, updated_at DESC'
    ).all(projectId) as RawCluster[];
    return rows.map(toCluster);
  }

  // 클러스터 생성 또는 업데이트 (sample_count 증가) — source: 'generated'
  upsert(
    signatureData: SignatureData,
    registryId: string,
    registryName: string,
    customAttrs: Record<string, string> = {},
    projectId: string | null = null
  ): MappingCluster {
    const signature = this.createSignatureHash(signatureData);
    // 프로젝트 + 시그니처 조합으로 조회
    const existing = this.getBySignatureAndProject(signature, projectId);
    const now = new Date().toISOString();

    if (existing) {
      this.db.prepare(`
        UPDATE mapping_clusters SET
          registry_id = ?,
          registry_name = ?,
          custom_attrs = ?,
          sample_count = sample_count + 1,
          source = 'generated',
          updated_at = ?
        WHERE id = ?
      `).run(
        registryId,
        registryName,
        JSON.stringify(customAttrs),
        now,
        existing.id
      );
      return this.get(existing.id)!;
    } else {
      const id = randomUUID();
      this.db.prepare(`
        INSERT INTO mapping_clusters
          (id, signature, signature_data, registry_id, registry_name, custom_attrs, sample_count, source, project_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, 'generated', ?, ?, ?)
      `).run(
        id,
        signature,
        JSON.stringify(signatureData),
        registryId,
        registryName,
        JSON.stringify(customAttrs),
        projectId,
        now,
        now
      );
      return this.get(id)!;
    }
  }

  // 클러스터 삭제
  delete(id: string): boolean {
    const result = this.db.prepare(
      'DELETE FROM mapping_clusters WHERE id = ?'
    ).run(id);
    return result.changes > 0;
  }

  // generated 클러스터만 삭제 (imported는 유지)
  deleteGenerated(projectId?: string): number {
    if (projectId) {
      const result = this.db.prepare("DELETE FROM mapping_clusters WHERE source = 'generated' AND project_id = ?").run(projectId);
      return result.changes;
    } else {
      const result = this.db.prepare("DELETE FROM mapping_clusters WHERE source = 'generated'").run();
      return result.changes;
    }
  }

  // 프로젝트별 클러스터 삭제
  deleteByProject(projectId: string): number {
    const result = this.db.prepare('DELETE FROM mapping_clusters WHERE project_id = ?').run(projectId);
    return result.changes;
  }

  // 전체 클러스터 삭제
  deleteAll(): number {
    const result = this.db.prepare('DELETE FROM mapping_clusters').run();
    return result.changes;
  }
}

// ---- Row → Domain ----
interface RawCluster {
  id: string;
  signature: string;
  signature_data: string;
  registry_id: string;
  registry_name: string;
  custom_attrs: string;
  sample_count: number;
  source: 'generated' | 'imported';
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

function toCluster(r: RawCluster): MappingCluster {
  return {
    id: r.id,
    signature: r.signature,
    signatureData: JSON.parse(r.signature_data),
    registryId: r.registry_id,
    registryName: r.registry_name,
    customAttrs: JSON.parse(r.custom_attrs),
    sampleCount: r.sample_count,
    source: r.source ?? 'generated',
    projectId: r.project_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
