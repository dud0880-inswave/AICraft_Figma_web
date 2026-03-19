// ============================================================
// Figma Viewer Backend Server
// ============================================================
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { initDb, closeDb, getDb } from './db.js';
import { RegistryStore } from './registry-store.js';
import { MappingStore } from './mapping-store.js';
import { FigmaFilesStore } from './figma-files-store.js';
import { FigmaFileDataStore } from './figma-file-data-store.js';
import { ClusterStore, type FigmaNodeLike, type AutoMappingSuggestion } from './cluster-store.js';
import { DefaultMappingRulesStore } from './default-mapping-rules-store.js';

const PORT = 5181;

// DB 초기화
console.log('[Server] Initializing...');
initDb();
console.log('[Server] Creating stores...');
const registryStore = new RegistryStore(getDb());
const mappingStore = new MappingStore(getDb());
const figmaFilesStore = new FigmaFilesStore(getDb());
const figmaFileDataStore = new FigmaFileDataStore(getDb());
const clusterStore = new ClusterStore(getDb());
const defaultMappingRulesStore = new DefaultMappingRulesStore(getDb());
console.log('[Server] Stores created.');

// ============================================================
// HTTP Server
// ============================================================
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const path = url.pathname;

  console.log(`[Server] ${req.method} ${path}`);

  try {
    // ---- Registry API ----
    if (path === '/api/registry' && req.method === 'GET') {
      const items = registryStore.list();
      return json(res, items);
    }

    if (path === '/api/registry' && req.method === 'POST') {
      const body = await parseBody(req);
      const { name, tagName, properties } = body;
      if (!name || !tagName) return badRequest(res, 'name and tagName required');
      try {
        const item = registryStore.create({ name, tagName, properties: properties || {} });
        return json(res, item, 201);
      } catch (err: any) {
        if (err.message?.includes('UNIQUE constraint')) {
          return json(res, { error: '이미 존재하는 컴포넌트 이름입니다' }, 400);
        }
        throw err;
      }
    }

    if (path.startsWith('/api/registry/') && req.method === 'GET') {
      const id = path.replace('/api/registry/', '');
      const item = registryStore.get(id);
      if (!item) return notFound(res);
      return json(res, item);
    }

    if (path.startsWith('/api/registry/') && req.method === 'PUT') {
      const id = path.replace('/api/registry/', '');
      const body = await parseBody(req);
      const item = registryStore.update(id, body);
      if (!item) return notFound(res);
      return json(res, item);
    }

    if (path.startsWith('/api/registry/') && req.method === 'DELETE') {
      const id = path.replace('/api/registry/', '');
      const deleted = registryStore.delete(id);
      if (!deleted) return notFound(res);
      return json(res, { success: true });
    }

    // ---- Mapping API ----
    if (path === '/api/mappings' && req.method === 'GET') {
      const fileKey = url.searchParams.get('fileKey');
      if (!fileKey) return badRequest(res, 'fileKey required');
      const rootNodeId = url.searchParams.get('rootNodeId') || null;
      const mappings = mappingStore.listByFile(fileKey, rootNodeId);
      return json(res, mappings);
    }

    if (path === '/api/mappings' && req.method === 'POST') {
      const body = await parseBody(req);
      const mapping = mappingStore.save(body);
      return json(res, mapping, 201);
    }

    if (path.match(/^\/api\/mappings\/[^/]+\/[^/]+$/) && req.method === 'GET') {
      const parts = path.split('/');
      const fileKey = decodeURIComponent(parts[3]);
      const nodeId = decodeURIComponent(parts[4]);
      const rootNodeId = url.searchParams.get('rootNodeId') || null;
      const mapping = mappingStore.get(fileKey, rootNodeId, nodeId);
      if (!mapping) return notFound(res);
      return json(res, mapping);
    }

    if (path.match(/^\/api\/mappings\/[^/]+\/[^/]+$/) && req.method === 'DELETE') {
      const parts = path.split('/');
      const fileKey = decodeURIComponent(parts[3]);
      const nodeId = decodeURIComponent(parts[4]);
      const rootNodeId = url.searchParams.get('rootNodeId') || null;
      const deleted = mappingStore.delete(fileKey, rootNodeId, nodeId);
      if (!deleted) return notFound(res);
      return json(res, { success: true });
    }

    // ---- Figma Files API ----
    if (path === '/api/figma-files' && req.method === 'GET') {
      const files = figmaFilesStore.list();
      return json(res, files);
    }

    if (path === '/api/figma-files' && req.method === 'POST') {
      const body = await parseBody(req);
      const { fileKey, nodeId, name, thumbnailUrl } = body;
      if (!fileKey || !name) return badRequest(res, 'fileKey and name required');
      const file = figmaFilesStore.upsert(fileKey, nodeId || null, name, thumbnailUrl || null);
      return json(res, file, 201);
    }

    if (path === '/api/figma-files' && req.method === 'DELETE') {
      const fileKey = url.searchParams.get('fileKey');
      const nodeId = url.searchParams.get('nodeId');
      if (!fileKey) return badRequest(res, 'fileKey required');
      figmaFilesStore.delete(fileKey, nodeId || null);
      // 관련 매핑 및 파일 데이터 삭제
      mappingStore.deleteByFileKey(fileKey, nodeId || null);
      figmaFileDataStore.delete(fileKey, nodeId || null);
      // 파일 삭제 후 클러스터 재생성 (삭제된 파일의 클러스터 정리)
      clusterStore.deleteGenerated();
      const remainingFiles = figmaFilesStore.list().filter(f => f.completed);
      for (const file of remainingFiles) {
        const mappings = mappingStore.listByFile(file.fileKey, file.nodeId);
        const mappedMappings = mappings.filter(m => m.status === 'mapped' && m.registryId);
        const fileData = figmaFileDataStore.get(file.fileKey, file.nodeId);
        if (!fileData) continue;
        const document = JSON.parse(fileData.data);
        for (const mapping of mappedMappings) {
          const result = findNodeInDocument(document, mapping.figmaNodeId);
          if (!result) continue;
          clusterStore.upsert(clusterStore.createSignatureData(result.node, result.ancestors), mapping.registryId!, mapping.registryName || '', mapping.customAttrs);
        }
      }
      return json(res, { success: true });
    }

    if (path === '/api/figma-files/touch' && req.method === 'POST') {
      const body = await parseBody(req);
      const { fileKey, nodeId } = body;
      if (!fileKey) return badRequest(res, 'fileKey required');
      figmaFilesStore.updateLastOpened(fileKey, nodeId || null);
      return json(res, { success: true });
    }

    if (path === '/api/figma-files/complete' && req.method === 'POST') {
      const body = await parseBody(req);
      const { fileKey, nodeId, completed } = body;
      if (!fileKey) return badRequest(res, 'fileKey required');
      if (typeof completed !== 'boolean') return badRequest(res, 'completed required as boolean');
      figmaFilesStore.updateCompleted(fileKey, nodeId || null, completed);
      return json(res, { success: true });
    }

    // ---- Figma File Data API (수정된 파일 구조 저장) ----
    if (path === '/api/figma-file-data' && req.method === 'GET') {
      const fileKey = url.searchParams.get('fileKey');
      const nodeId = url.searchParams.get('nodeId');
      if (!fileKey) return badRequest(res, 'fileKey required');
      const data = figmaFileDataStore.get(fileKey, nodeId || null);
      if (!data) return json(res, null);
      return json(res, { ...data, data: JSON.parse(data.data) });
    }

    if (path === '/api/figma-file-data' && req.method === 'POST') {
      const body = await parseBody(req);
      const { fileKey, nodeId, data } = body;
      if (!fileKey || !data) return badRequest(res, 'fileKey and data required');
      const saved = figmaFileDataStore.save(fileKey, nodeId || null, data);
      return json(res, { success: true, updatedAt: saved.updatedAt });
    }

    if (path === '/api/figma-file-data' && req.method === 'DELETE') {
      const fileKey = url.searchParams.get('fileKey');
      const nodeId = url.searchParams.get('nodeId');
      if (!fileKey) return badRequest(res, 'fileKey required');
      figmaFileDataStore.delete(fileKey, nodeId || null);
      return json(res, { success: true });
    }

    // ---- Cluster API ----
    // 클러스터 목록 조회
    if (path === '/api/clusters' && req.method === 'GET') {
      const clusters = clusterStore.list();
      return json(res, clusters);
    }

    // 완료된 파일들에서 클러스터 생성
    if (path === '/api/clusters/generate' && req.method === 'POST') {
      // generated 클러스터 초기화 후 모든 완료된 파일 기준으로 재생성 (imported는 유지)
      clusterStore.deleteGenerated();
      const files = figmaFilesStore.list();
      const completedFiles = files.filter(f => f.completed);

      let createdCount = 0;

      for (const file of completedFiles) {
        // 해당 파일의 매핑 가져오기
        const mappings = mappingStore.listByFile(file.fileKey, file.nodeId);
        const mappedMappings = mappings.filter(m => m.status === 'mapped' && m.registryId);

        // 파일 데이터 가져오기
        const fileData = figmaFileDataStore.get(file.fileKey, file.nodeId);
        if (!fileData) continue;

        const document = JSON.parse(fileData.data);

        // 각 매핑에 대해 노드 찾고 클러스터 생성
        for (const mapping of mappedMappings) {
          const result = findNodeInDocument(document, mapping.figmaNodeId);
          if (!result) continue;

          const signatureData = clusterStore.createSignatureData(result.node, result.ancestors);
          clusterStore.upsert(
            signatureData,
            mapping.registryId!,
            mapping.registryName || '',
            mapping.customAttrs
          );
          createdCount++;
        }
      }

      return json(res, { success: true, createdCount });
    }

    // 자동 매핑 제안 (노드 시그니처로 클러스터 매칭)
    if (path === '/api/clusters/suggest' && req.method === 'POST') {
      const body = await parseBody(req);
      const { nodes, existingMappingNodeIds = [] } = body as {
        nodes: Array<{ id: string; name: string; type: string; children?: FigmaNodeLike[] }>;
        existingMappingNodeIds?: string[];
      };

      if (!nodes || !Array.isArray(nodes)) {
        return badRequest(res, 'nodes array required');
      }

      // 이미 매핑된 노드 제외
      const existingSet = new Set(existingMappingNodeIds);

      // 모든 노드의 시그니처 계산
      const nodeSignatures: Array<{ nodeId: string; nodeName: string; nodeType: string; signature: string; node: FigmaNodeLike }> = [];

      const processNode = (node: FigmaNodeLike & { id: string }, parents: FigmaNodeLike[] = []) => {
        if (!existingSet.has(node.id)) {
          const ancestors = parents.slice(-1);
          const signature = clusterStore.createNodeSignature(node, ancestors);
          nodeSignatures.push({
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.type,
            signature,
            node,
          });
        }
        // 자식 노드도 처리
        if (node.children) {
          for (const child of node.children as Array<FigmaNodeLike & { id: string }>) {
            processNode(child, [...parents, node]);
          }
        }
      };

      for (const node of nodes) {
        processNode(node as FigmaNodeLike & { id: string });
      }

      // 시그니처로 클러스터 일괄 조회
      const signatureSet = new Set(nodeSignatures.map(n => n.signature));
      const signatures = Array.from(signatureSet);
      const clusters = clusterStore.getBySignatures(signatures);
      const clusterMap = new Map(clusters.map(c => [c.signature, c]));

      // 매칭된 제안 생성
      const suggestions: AutoMappingSuggestion[] = [];
      for (const ns of nodeSignatures) {
        const cluster = clusterMap.get(ns.signature);
        if (cluster) {
          suggestions.push({
            nodeId: ns.nodeId,
            nodeName: ns.nodeName,
            nodeType: ns.nodeType,
            signature: ns.signature,
            registryId: cluster.registryId,
            registryName: cluster.registryName,
            customAttrs: cluster.customAttrs,
            sampleCount: cluster.sampleCount,
          });
        }
      }

      return json(res, { suggestions });
    }

    // 제안된 매핑 일괄 적용
    if (path === '/api/clusters/apply' && req.method === 'POST') {
      const body = await parseBody(req);
      const { fileKey, rootNodeId, suggestions } = body as {
        fileKey: string;
        rootNodeId?: string | null;
        suggestions: Array<{
          nodeId: string;
          nodeName: string;
          nodeType: string;
          registryId: string;
          registryName: string;
          customAttrs: Record<string, string>;
        }>;
      };

      if (!fileKey || !suggestions || !Array.isArray(suggestions)) {
        return badRequest(res, 'fileKey and suggestions array required');
      }

      // 레지스트리에서 tagName 조회
      const registryItems = registryStore.list();
      const registryMap = new Map(registryItems.map(r => [r.id, r]));

      let appliedCount = 0;
      for (const suggestion of suggestions) {
        const registryItem = registryMap.get(suggestion.registryId);
        if (!registryItem) continue;

        mappingStore.save({
          figmaFileKey: fileKey,
          figmaRootNodeId: rootNodeId ?? null,
          figmaNodeId: suggestion.nodeId,
          figmaNodeName: suggestion.nodeName,
          figmaNodeType: suggestion.nodeType,
          registryId: suggestion.registryId,
          registryName: suggestion.registryName,
          registryTag: registryItem.tagName,
          customAttrs: suggestion.customAttrs,
          status: 'mapped',
        });
        appliedCount++;
      }

      return json(res, { success: true, appliedCount });
    }

    // ---- Default Mapping Rules API ----

    // 전체 목록 (그룹화)
    if (path === '/api/default-mapping-rules' && req.method === 'GET') {
      const grouped = url.searchParams.get('grouped') === 'true';
      if (grouped) {
        return json(res, defaultMappingRulesStore.listGrouped());
      }
      return json(res, defaultMappingRulesStore.list());
    }

    // 추가
    if (path === '/api/default-mapping-rules' && req.method === 'POST') {
      const body = await parseBody(req);
      const { registryId, keyword } = body;
      if (!registryId || !keyword) return badRequest(res, 'registryId and keyword required');
      try {
        const rule = defaultMappingRulesStore.create({ registryId, keyword });
        return json(res, rule, 201);
      } catch (err: any) {
        if (err.message?.includes('UNIQUE constraint')) {
          return json(res, { error: '이미 존재하는 키워드입니다' }, 400);
        }
        throw err;
      }
    }

    // 수정
    if (path.startsWith('/api/default-mapping-rules/') && req.method === 'PUT') {
      const id = path.replace('/api/default-mapping-rules/', '');
      const body = await parseBody(req);
      const rule = defaultMappingRulesStore.update(id, body);
      if (!rule) return notFound(res);
      return json(res, rule);
    }

    // 삭제
    if (path.startsWith('/api/default-mapping-rules/') && req.method === 'DELETE') {
      const id = path.replace('/api/default-mapping-rules/', '');
      const deleted = defaultMappingRulesStore.delete(id);
      if (!deleted) return notFound(res);
      return json(res, { success: true });
    }

    // 노드 이름으로 매칭
    if (path === '/api/default-mapping-rules/match' && req.method === 'POST') {
      const body = await parseBody(req);
      const { nodeName } = body;
      if (!nodeName) return badRequest(res, 'nodeName required');
      const result = defaultMappingRulesStore.match(nodeName);
      return json(res, result ?? null);
    }

    // Default Rule 제안 (노드 배열 → 매칭 결과 반환, 적용 없음)
    if (path === '/api/default-mapping-rules/suggest' && req.method === 'POST') {
      const body = await parseBody(req);
      const { nodes } = body as {
        nodes: Array<{ id: string; name: string; type: string; children?: unknown[] }>;
      };
      if (!nodes || !Array.isArray(nodes)) return badRequest(res, 'nodes array required');

      type NodeLike = { id: string; name: string; type: string; children?: NodeLike[] };

      const suggestions: Array<{
        nodeId: string; nodeName: string; nodeType: string;
        signature: string; registryId: string; registryName: string;
        customAttrs: Record<string, string>; sampleCount: number; matchedKeyword: string;
      }> = [];

      const processNode = (node: NodeLike) => {
        const match = defaultMappingRulesStore.match(node.name);
        if (match) {
          const registry = getDb().prepare('SELECT name FROM registry WHERE id = ?').get(match.registryId) as { name: string } | undefined;
          if (registry) {
            suggestions.push({
              nodeId: node.id, nodeName: node.name, nodeType: node.type,
              signature: '', registryId: match.registryId, registryName: registry.name,
              customAttrs: {}, sampleCount: 0, matchedKeyword: match.matchedKeyword,
            });
          }
        }
        if (node.children) {
          for (const child of node.children) processNode(child as NodeLike);
        }
      };

      for (const node of nodes) processNode(node as NodeLike);
      return json(res, { suggestions });
    }

    // ---- Mapping Rules Export / Import ----
    if (path === '/api/mapping-rules/export' && req.method === 'GET') {
      const defaultRules = defaultMappingRulesStore.listGrouped().flatMap(g =>
        g.keywords.map(kw => ({ registryName: g.registryName, keyword: kw }))
      );
      const clusters = clusterStore.list().map(c => ({
        signature: c.signature,
        signatureData: c.signatureData,  // TODO: 테스트 후 제거
        registryName: c.registryName,
        customAttrs: c.customAttrs,
        sampleCount: c.sampleCount,
      }));
      return json(res, {
        version: 1,
        exportedAt: new Date().toISOString(),
        defaultMappingRules: defaultRules,
        customMappingRules: clusters,
      });
    }

    if (path === '/api/mapping-rules/import' && req.method === 'POST') {
      const body = await parseBody(req);
      const { defaultMappingRules = [], customMappingRules = [] } = body as {
        version?: number;
        defaultMappingRules?: Array<{ registryName: string; keyword: string }>;
        customMappingRules?: Array<{ signature: string; registryName: string; customAttrs?: Record<string, string>; sampleCount?: number }>;
      };

      let defaultAdded = 0;
      let clusterUpdated = 0;

      // defaultMappingRules: keyword 중복이면 skip
      for (const rule of defaultMappingRules) {
        const registry = getDb().prepare('SELECT id FROM registry WHERE name = ?').get(rule.registryName) as { id: string } | undefined;
        if (!registry) continue;
        try {
          defaultMappingRulesStore.create({ registryId: registry.id, keyword: rule.keyword });
          defaultAdded++;
        } catch {
          // UNIQUE 제약 위반 (중복) → skip
        }
      }

      // customMappingRules: signature 기준 upsert (registryName, customAttrs 덮어씀)
      for (const rule of customMappingRules) {
        const registry = getDb().prepare('SELECT id, name FROM registry WHERE name = ?').get(rule.registryName) as { id: string; name: string } | undefined;
        if (!registry) continue;
        const existing = clusterStore.getBySignature(rule.signature);
        if (existing) {
          getDb().prepare(`
            UPDATE mapping_clusters SET registry_id = ?, registry_name = ?, custom_attrs = ?, source = 'imported', updated_at = ? WHERE signature = ?
          `).run(registry.id, registry.name, JSON.stringify(rule.customAttrs ?? {}), new Date().toISOString(), rule.signature);
        } else {
          // 새 클러스터: signatureData 없이 삽입 (signature만 있으면 매칭 동작)
          const now = new Date().toISOString();
          getDb().prepare(`
            INSERT INTO mapping_clusters (id, signature, signature_data, registry_id, registry_name, custom_attrs, sample_count, source, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'imported', ?, ?)
          `).run(randomUUID(), rule.signature, '{}', registry.id, registry.name, JSON.stringify(rule.customAttrs ?? {}), rule.sampleCount ?? 1, now, now);
        }
        clusterUpdated++;
      }

      return json(res, { success: true, defaultAdded, clusterUpdated });
    }

    // ---- XML Export API ----
    if (path === '/api/export-xml' && req.method === 'POST') {
      const body = await parseBody(req);
      const { xml, filename, exportPath } = body as {
        xml: string;
        filename: string;
        exportPath?: string;
      };

      if (!xml || !filename) {
        return badRequest(res, 'xml and filename required');
      }

      // exportPath가 없으면 에러
      if (!exportPath) {
        return badRequest(res, 'exportPath required. Set it in Settings.');
      }

      try {
        // 경로가 없으면 생성
        if (!existsSync(exportPath)) {
          mkdirSync(exportPath, { recursive: true });
        }

        // 파일명 정리 (확장자 추가)
        const cleanFilename = filename.endsWith('.xml') ? filename : `${filename}.xml`;
        const fullPath = join(exportPath, cleanFilename);

        // 파일 저장
        writeFileSync(fullPath, xml, 'utf-8');
        console.log(`[Server] XML saved to: ${fullPath}`);

        return json(res, { success: true, path: fullPath });
      } catch (err) {
        console.error('[Server] Failed to save XML:', err);
        return json(res, { error: `Failed to save: ${String(err)}` }, 500);
      }
    }

    // ---- Health ----
    if (path === '/api/health') {
      return json(res, { status: 'ok' });
    }

    // 404
    return notFound(res);
  } catch (err) {
    console.error('[Server] Error:', err);
    return json(res, { error: String(err) }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`[Server] Figma Viewer API running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});

// ============================================================
// Helpers
// ============================================================
function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function notFound(res: ServerResponse): void {
  json(res, { error: 'Not Found' }, 404);
}

function badRequest(res: ServerResponse, message: string): void {
  json(res, { error: message }, 400);
}

async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// 문서에서 노드 찾기 (재귀) — 부모 경로도 반환
function findNodeInDocument(node: any, nodeId: string, parentPath: any[] = []): { node: FigmaNodeLike; ancestors: FigmaNodeLike[] } | null {
  if (node.id === nodeId) {
    // 부모 경로에서 최대 1단계까지 (부모만)
    const ancestors = parentPath.slice(-1);
    return { node, ancestors };
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeInDocument(child, nodeId, [...parentPath, node]);
      if (found) return found;
    }
  }
  return null;
}
