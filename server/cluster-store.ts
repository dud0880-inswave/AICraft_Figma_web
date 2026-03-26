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
  variantMode: 'base' | 'full' | null;  // base: key만, full: value 포함, null: 기존(base 취급)
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureData {
  name?: string;
  type: string;
  componentProperties?: Record<string, { value: string | boolean; type: string }>;
  parent?: ParentData | null;  // 직속 부모 (1단계만)
  children?: SignatureData[];
}

export interface ParentData {
  name?: string;
  type: string;
  componentProperties?: Record<string, { value: string | boolean; type: string }>;
  // parent, children 제외 (무한 반복 방지)
}

export interface FigmaNodeLike {
  name: string;
  type: string;
  visible?: boolean;
  componentProperties?: Record<string, { value: string | boolean; type: string }>;
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

  // componentProperties에서 value 제거, type과 기타 필드만 유지
  private filterComponentProperties(props: Record<string, any> | undefined): Record<string, any> | undefined {
    if (!props) return undefined;

    const filtered: Record<string, any> = {};
    for (const [key, prop] of Object.entries(props)) {
      if (typeof prop === 'object' && prop !== null) {
        // value 제거, 나머지 필드 유지
        const { value, ...rest } = prop;
        filtered[key] = rest;
      } else {
        filtered[key] = prop;
      }
    }

    return Object.keys(filtered).length > 0 ? filtered : undefined;
  }

  // 노드 구조에서 시그니처 데이터 생성
  // parent: 직속 부모 노드 (1단계만)
  // childDepth: 자식 포함 깊이 (기본 1단계만)
  // includeNodeName: 노드 이름 포함 여부 (기본 true)
  // variantMode: 'base' = key만, 'full' = value 포함
  createSignatureData(node: FigmaNodeLike, parent: FigmaNodeLike | null = null, childDepth: number = 1, includeNodeName: boolean = true, variantMode: 'base' | 'full' = 'base'): SignatureData {
    const data: SignatureData = {
      ...(includeNodeName ? { name: node.name } : {}),
      type: node.type,
    };

    // componentProperties 처리
    if (node.componentProperties) {
      if (variantMode === 'full') {
        // full 모드: VARIANT 등은 value 포함, TEXT는 value 제거
        const filtered: Record<string, any> = {};
        for (const [key, prop] of Object.entries(node.componentProperties)) {
          if (typeof prop === 'object' && prop !== null && prop.type === 'TEXT') {
            // TEXT 타입: value 제거 (동적 콘텐츠)
            const { value, ...rest } = prop;
            filtered[key] = rest;
          } else {
            // VARIANT 등: value 포함 (구조적 정보)
            filtered[key] = prop;
          }
        }
        if (Object.keys(filtered).length > 0) {
          data.componentProperties = filtered;
        }
      } else {
        // base 모드: 모든 value 제거
        const filteredProps = this.filterComponentProperties(node.componentProperties);
        if (filteredProps) {
          data.componentProperties = filteredProps;
        }
      }
    }

    // 직속 부모 정보 추가 (1단계만, parent/children 제외)
    if (parent) {
      const parentData: ParentData = {
        ...(includeNodeName ? { name: parent.name } : {}),
        type: parent.type
      };

      if (parent.componentProperties) {
        if (variantMode === 'full') {
          // full 모드: VARIANT 등은 value 포함, TEXT는 value 제거
          const filtered: Record<string, any> = {};
          for (const [key, prop] of Object.entries(parent.componentProperties)) {
            if (typeof prop === 'object' && prop !== null && prop.type === 'TEXT') {
              // TEXT 타입: value 제거
              const { value, ...rest } = prop;
              filtered[key] = rest;
            } else {
              // VARIANT 등: value 포함
              filtered[key] = prop;
            }
          }
          if (Object.keys(filtered).length > 0) {
            parentData.componentProperties = filtered;
          }
        } else {
          // base 모드: 모든 value 제거
          const parentFilteredProps = this.filterComponentProperties(parent.componentProperties);
          if (parentFilteredProps) {
            parentData.componentProperties = parentFilteredProps;
          }
        }
      }

      data.parent = parentData;
    } else {
      data.parent = null;
    }

    // 자식 노드 처리 (depth가 남아있을 때만, visible: false 제외)
    if (childDepth > 0 && node.children && node.children.length > 0) {
      const visibleChildren = node.children.filter(child => child.visible !== false);
      if (visibleChildren.length > 0) {
        data.children = visibleChildren.map(child => this.createSignatureData(child, node, childDepth - 1, includeNodeName, variantMode));
      }
    }

    return data;
  }

  // 시그니처 데이터에서 해시 생성
  createSignatureHash(signatureData: SignatureData): string {
    const json = JSON.stringify(signatureData);
    return createHash('sha256').update(json).digest('hex');
  }

  // 노드에서 직접 시그니처 해시 생성
  createNodeSignature(node: FigmaNodeLike, parent: FigmaNodeLike | null = null, childDepth: number = 1, includeNodeName: boolean = true, variantMode: 'base' | 'full' = 'base'): string {
    const data = this.createSignatureData(node, parent, childDepth, includeNodeName, variantMode);
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

  // customAttrs 병합 (클래스 빈도 추적)
  private mergeCustomAttrs(existing: Record<string, any>, newAttrs: Record<string, string>): Record<string, any> {
    const merged: Record<string, any> = { ...existing };

    // class 속성 병합 (빈도 추적)
    if (newAttrs.class) {
      const newClasses = newAttrs.class.trim().split(/\s+/).filter(Boolean);

      if (typeof existing.class === 'object' && !Array.isArray(existing.class)) {
        // 기존에 빈도 객체가 있음
        merged.class = { ...existing.class };
        for (const cls of newClasses) {
          merged.class[cls] = (merged.class[cls] || 0) + 1;
        }
      } else {
        // 첫 번째 샘플 - 빈도 객체 생성
        merged.class = {};
        for (const cls of newClasses) {
          merged.class[cls] = 1;
        }
      }
    }

    // 다른 속성들은 새 값으로 덮어쓰기
    for (const [key, value] of Object.entries(newAttrs)) {
      if (key !== 'class') {
        merged[key] = value;
      }
    }

    return merged;
  }

  // 클러스터 생성 또는 업데이트 (sample_count 증가, 클래스 빈도 추적) — source: 'generated'
  upsert(
    signatureData: SignatureData,
    registryId: string,
    registryName: string,
    customAttrs: Record<string, string> = {},
    projectId: string | null = null,
    variantMode: 'base' | 'full' = 'base'
  ): MappingCluster {
    const signature = this.createSignatureHash(signatureData);
    // 프로젝트 + 시그니처 조합으로 조회
    const existing = this.getBySignatureAndProject(signature, projectId);
    const now = new Date().toISOString();

    if (existing) {
      // 기존 클러스터 업데이트 - 클래스 빈도 병합
      const mergedAttrs = this.mergeCustomAttrs(existing.customAttrs, customAttrs);

      this.db.prepare(`
        UPDATE mapping_clusters SET
          registry_id = ?,
          registry_name = ?,
          custom_attrs = ?,
          sample_count = sample_count + 1,
          source = 'generated',
          variant_mode = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        registryId,
        registryName,
        JSON.stringify(mergedAttrs),
        variantMode,
        now,
        existing.id
      );
      return this.get(existing.id)!;
    } else {
      // 새 클러스터 생성 - 초기 빈도 설정
      const initialAttrs = this.mergeCustomAttrs({}, customAttrs);
      const id = randomUUID();
      this.db.prepare(`
        INSERT INTO mapping_clusters
          (id, signature, signature_data, registry_id, registry_name, custom_attrs, sample_count, source, variant_mode, project_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, 'generated', ?, ?, ?, ?)
      `).run(
        id,
        signature,
        JSON.stringify(signatureData),
        registryId,
        registryName,
        JSON.stringify(initialAttrs),
        variantMode,
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
  variant_mode: 'base' | 'full' | null;
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
    variantMode: r.variant_mode ?? null,
    projectId: r.project_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
