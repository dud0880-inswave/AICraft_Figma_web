// ============================================================
// Figma Viewer Backend Server
// ============================================================
import { config as dotenvConfig } from 'dotenv';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDb, closeDb, getDb } from './db.js';
import { RegistryStore } from './registry-store.js';
import { MappingStore } from './mapping-store.js';
import { FigmaFilesStore } from './figma-files-store.js';
import { FigmaFileDataStore } from './figma-file-data-store.js';
import { ClusterStore, type FigmaNodeLike, type AutoMappingSuggestion } from './cluster-store.js';
import { DefaultMappingRulesStore } from './default-mapping-rules-store.js';
import { ProjectStore } from './project-store.js';
import { SettingsStore } from './settings-store.js';

// __dirname 설정 (ESM 환경)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 서버 설정 파일 로드 (config/server.env 또는 .env)
// 패키지 내 config 디렉토리 또는 프로젝트 루트의 .env 파일을 찾음
const serverEnvPath = resolve(__dirname, '..', 'config', 'server.env');
const rootEnvPath = resolve(process.cwd(), '.env');

if (existsSync(serverEnvPath)) {
  dotenvConfig({ path: serverEnvPath });
  console.log('[Config] Loaded from config/server.env');
} else if (existsSync(rootEnvPath)) {
  dotenvConfig({ path: rootEnvPath });
  console.log('[Config] Loaded from .env (fallback)');
} else {
  console.log('[Config] No config file found, using defaults');
}

// 서버 설정
const PORT = parseInt(process.env.PORT || '5181', 10);
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGINS = process.env.CORS_ORIGINS || '*';
const ENABLE_DEBUG_JSON = process.env.ENABLE_DEBUG_JSON === 'true';

// ============================================================
// 헬퍼 함수: 클러스터에서 공통 클래스 추출 (Base 모드용)
// ============================================================
function extractCommonClassesFromCluster(cluster: any): Record<string, string> {
  const result: Record<string, string> = {};

  // class 속성 처리
  if (cluster.customAttrs.class) {
    if (typeof cluster.customAttrs.class === 'object' && !Array.isArray(cluster.customAttrs.class)) {
      // 빈도 객체: { "badge list info": 3, "badge list succ": 1 }
      // 빈도 === sampleCount인 조합 찾기 (공통으로 사용된 조합)
      const entries = Object.entries(cluster.customAttrs.class) as [string, number][];
      const commonCombos = entries.filter(([_, count]) => count === cluster.sampleCount);

      if (commonCombos.length > 0) {
        // 여러 개면 가장 빈도 높은 것 선택 (일반적으로 하나만 있을 것)
        commonCombos.sort((a, b) => b[1] - a[1]);
        result.class = commonCombos[0][0];
      }
    } else {
      // 레거시: 문자열 그대로 사용
      result.class = cluster.customAttrs.class;
    }
  }

  // 다른 속성들은 그대로 복사
  for (const [key, value] of Object.entries(cluster.customAttrs)) {
    if (key !== 'class') {
      result[key] = value as string;
    }
  }

  return result;
}

// ============================================================
// 헬퍼 함수: 클러스터에서 가장 많이 사용된 클래스 조합 추출 (Full 모드용)
// ============================================================
function extractAllClassesFromCluster(cluster: any): Record<string, string> {
  const result: Record<string, string> = {};

  // class 속성 처리
  if (cluster.customAttrs.class) {
    if (typeof cluster.customAttrs.class === 'object' && !Array.isArray(cluster.customAttrs.class)) {
      // 빈도 객체: { "badge list info": 3, "badge list succ": 1 }
      // 가장 빈도 높은 조합 선택
      const entries = Object.entries(cluster.customAttrs.class) as [string, number][];

      if (entries.length > 0) {
        // 빈도 순으로 정렬하여 가장 높은 것 선택
        entries.sort((a, b) => b[1] - a[1]);
        result.class = entries[0][0];
      }
    } else {
      // 레거시: 문자열 그대로 사용
      result.class = cluster.customAttrs.class;
    }
  }

  // 다른 속성들은 그대로 복사
  for (const [key, value] of Object.entries(cluster.customAttrs)) {
    if (key !== 'class') {
      result[key] = value as string;
    }
  }

  return result;
}

// DB 초기화
console.log('[Server] Initializing...');
initDb();
console.log('[Server] Creating stores...');
const registryStore = new RegistryStore(getDb());
const projectStore = new ProjectStore(getDb());
const settingsStore = new SettingsStore(getDb());
const figmaFilesStore = new FigmaFilesStore(getDb());
const mappingStore = new MappingStore(getDb());
const figmaFileDataStore = new FigmaFileDataStore(getDb());
const clusterStore = new ClusterStore(getDb());
const defaultMappingRulesStore = new DefaultMappingRulesStore(getDb());
console.log('[Server] Stores created.');

// ============================================================
// HTTP Server
// ============================================================
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // CORS - config에서 설정된 오리진 허용
  const origin = req.headers.origin || '*';
  if (CORS_ORIGINS === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    const allowedOrigins = CORS_ORIGINS.split(',').map(o => o.trim());
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }
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
    // ---- Project API ----
    if (path === '/api/projects' && req.method === 'GET') {
      const projects = projectStore.list();
      const projectsWithCount = projects.map(p => ({
        ...p,
        fileCount: projectStore.getFileCount(p.id),
      }));
      return json(res, projectsWithCount);
    }

    if (path === '/api/projects' && req.method === 'POST') {
      const body = await parseBody(req);
      const { name } = body;
      if (!name) return badRequest(res, 'name required');

      // 프로젝트 이름 중복 체크
      const existing = projectStore.getByName(name);
      if (existing) {
        return json(res, { error: '이미 존재하는 프로젝트 이름입니다' }, 400);
      }

      const project = projectStore.create(name);

      // 프로젝트 생성 시 초기 데이터 생성
      registryStore.seedForProject(project.id);
      defaultMappingRulesStore.seedForProject(project.id);

      return json(res, { ...project, fileCount: 0 }, 201);
    }

    if (path.match(/^\/api\/projects\/[^/]+$/) && req.method === 'GET') {
      const id = path.replace('/api/projects/', '');
      const project = projectStore.get(id);
      if (!project) return notFound(res);
      return json(res, { ...project, fileCount: projectStore.getFileCount(id) });
    }

    if (path.match(/^\/api\/projects\/[^/]+$/) && req.method === 'PUT') {
      const id = path.replace('/api/projects/', '');
      const body = await parseBody(req);
      const { name } = body;
      if (!name) return badRequest(res, 'name required');
      // 프로젝트 이름 중복 체크 (자기 자신 제외)
      const existing = projectStore.getByName(name);
      if (existing && existing.id !== id) {
        return json(res, { error: '이미 존재하는 프로젝트 이름입니다' }, 400);
      }
      const project = projectStore.update(id, name);
      if (!project) return notFound(res);
      return json(res, { ...project, fileCount: projectStore.getFileCount(id) });
    }

    if (path.match(/^\/api\/projects\/[^/]+$/) && req.method === 'DELETE') {
      const id = path.replace('/api/projects/', '');
      const project = projectStore.get(id);
      if (!project) return notFound(res);

      // 프로젝트 관련 데이터 삭제
      figmaFilesStore.deleteByProject(id);
      figmaFileDataStore.deleteByProject(id);
      mappingStore.deleteByProject(id);
      clusterStore.deleteByProject(id);
      settingsStore.deleteByProject(id);
      registryStore.deleteByProject(id);
      defaultMappingRulesStore.deleteByProject(id);

      // 프로젝트 삭제
      projectStore.delete(id);
      return json(res, { success: true });
    }

    // 프로젝트별 파일 목록
    if (path.match(/^\/api\/projects\/[^/]+\/files$/) && req.method === 'GET') {
      const id = path.replace('/api/projects/', '').replace('/files', '');
      const files = figmaFilesStore.listByProject(id);
      return json(res, files);
    }

    // ---- Registry API (프로젝트별) ----
    // GET /api/projects/:projectId/registry
    if (path.match(/^\/api\/projects\/[^/]+\/registry$/) && req.method === 'GET') {
      const projectId = path.replace('/api/projects/', '').replace('/registry', '');
      const items = registryStore.listByProject(projectId);
      return json(res, items);
    }

    // POST /api/projects/:projectId/registry
    if (path.match(/^\/api\/projects\/[^/]+\/registry$/) && req.method === 'POST') {
      const projectId = path.replace('/api/projects/', '').replace('/registry', '');
      const body = await parseBody(req);
      const { name, tagName, properties } = body;
      if (!name || !tagName) return badRequest(res, 'name and tagName required');
      try {
        const item = registryStore.create(projectId, { name, tagName, properties: properties || {} });
        return json(res, item, 201);
      } catch (err: any) {
        if (err.message?.includes('UNIQUE constraint')) {
          return json(res, { error: '이미 존재하는 컴포넌트 이름입니다' }, 400);
        }
        throw err;
      }
    }

    // GET /api/registry/:id (단일 조회)
    if (path.match(/^\/api\/registry\/[^/]+$/) && req.method === 'GET') {
      const id = path.replace('/api/registry/', '');
      const item = registryStore.get(id);
      if (!item) return notFound(res);
      return json(res, item);
    }

    // PUT /api/registry/:id
    if (path.match(/^\/api\/registry\/[^/]+$/) && req.method === 'PUT') {
      const id = path.replace('/api/registry/', '');
      const body = await parseBody(req);
      const item = registryStore.update(id, body);
      if (!item) return notFound(res);
      return json(res, item);
    }

    // DELETE /api/registry/:id
    if (path.match(/^\/api\/registry\/[^/]+$/) && req.method === 'DELETE') {
      const id = path.replace('/api/registry/', '');
      const deleted = registryStore.delete(id);
      if (!deleted) return notFound(res);
      return json(res, { success: true });
    }

    // ---- Settings API ----
    // 프로젝트별 설정 조회
    if (path.match(/^\/api\/projects\/[^/]+\/settings$/) && req.method === 'GET') {
      const id = path.replace('/api/projects/', '').replace('/settings', '');
      const project = projectStore.get(id);
      if (!project) return notFound(res);
      const settings = settingsStore.getAsObject(id);
      return json(res, settings);
    }

    // 프로젝트별 설정 저장
    if (path.match(/^\/api\/projects\/[^/]+\/settings$/) && req.method === 'POST') {
      const id = path.replace('/api/projects/', '').replace('/settings', '');
      const project = projectStore.get(id);
      if (!project) return notFound(res);
      const body = await parseBody(req);
      const { settings } = body as { settings: Record<string, string> };
      if (!settings || typeof settings !== 'object') return badRequest(res, 'settings object required');
      settingsStore.setMultiple(id, settings);
      return json(res, { success: true });
    }

    // ---- Mapping API (프로젝트별) ----
    if (path === '/api/mappings' && req.method === 'GET') {
      const projectId = url.searchParams.get('projectId');
      const fileKey = url.searchParams.get('fileKey');
      if (!projectId) return badRequest(res, 'projectId required');
      if (!fileKey) return badRequest(res, 'fileKey required');
      const rootNodeId = url.searchParams.get('rootNodeId') || null;
      const mappings = mappingStore.listByFile(projectId, fileKey, rootNodeId);
      return json(res, mappings);
    }

    if (path === '/api/mappings' && req.method === 'POST') {
      const body = await parseBody(req);
      if (!body.projectId) return badRequest(res, 'projectId required');
      const mapping = mappingStore.save(body);
      return json(res, mapping, 201);
    }

    if (path.match(/^\/api\/mappings\/[^/]+\/[^/]+$/) && req.method === 'GET') {
      const parts = path.split('/');
      const fileKey = decodeURIComponent(parts[3]);
      const nodeId = decodeURIComponent(parts[4]);
      const projectId = url.searchParams.get('projectId');
      const rootNodeId = url.searchParams.get('rootNodeId') || null;
      if (!projectId) return badRequest(res, 'projectId required');
      const mapping = mappingStore.get(projectId, fileKey, rootNodeId, nodeId);
      if (!mapping) return notFound(res);
      return json(res, mapping);
    }

    if (path.match(/^\/api\/mappings\/[^/]+\/[^/]+$/) && req.method === 'DELETE') {
      const parts = path.split('/');
      const fileKey = decodeURIComponent(parts[3]);
      const nodeId = decodeURIComponent(parts[4]);
      const projectId = url.searchParams.get('projectId');
      const rootNodeId = url.searchParams.get('rootNodeId') || null;
      if (!projectId) return badRequest(res, 'projectId required');
      const deleted = mappingStore.delete(projectId, fileKey, rootNodeId, nodeId);
      if (!deleted) return notFound(res);
      return json(res, { success: true });
    }

    // 파일의 모든 매핑 초기화
    if (path === '/api/mappings/clear' && req.method === 'POST') {
      const body = await parseBody(req);
      const { projectId, fileKey, rootNodeId } = body as {
        projectId: string;
        fileKey: string;
        rootNodeId?: string | null;
      };
      if (!projectId) return badRequest(res, 'projectId required');
      if (!fileKey) return badRequest(res, 'fileKey required');

      const count = mappingStore.deleteByFileKey(projectId, fileKey, rootNodeId || null);
      return json(res, { success: true, count });
    }

    // 추천 클래스 조회 (시그니처 기반)
    if (path === '/api/clusters/recommended-classes' && req.method === 'POST') {
      const body = await parseBody(req);
      const { projectId, node, parent } = body;

      if (!projectId) return badRequest(res, 'projectId required');
      if (!node) return badRequest(res, 'node required');

      const settings = settingsStore.listByProject(projectId);
      const includeNodeNameSetting = settings.find(s => s.key === 'cluster-include-node-name')?.value;
      const includeNodeName = includeNodeNameSetting !== 'false';

      // 1. Full 모드 시그니처로 먼저 조회 (노드 단독, variant value 포함)
      const signatureFull = clusterStore.createNodeSignature(node, null, 0, includeNodeName, 'full');
      let cluster = clusterStore.getBySignatureAndProject(signatureFull, projectId);

      if (!cluster) {
        // 2. Base 모드 시그니처로 조회
        const signatureBase = clusterStore.createNodeSignature(node, parent || null, 1, includeNodeName, 'base');
        cluster = clusterStore.getBySignatureAndProject(signatureBase, projectId);
      }

      if (!cluster) {
        return json(res, { commonClasses: [], recommendedClasses: [] });
      }

      const commonClasses: string[] = [];
      const recommendedClasses: Array<{ className: string; frequency: number; total: number }> = [];

      if (cluster.customAttrs.class && typeof cluster.customAttrs.class === 'object' && !Array.isArray(cluster.customAttrs.class)) {
        // 클래스 조합 전체가 키: { "badge list info": 3, "badge list succ": 1 }
        for (const [classCombo, frequency] of Object.entries(cluster.customAttrs.class)) {
          if (typeof frequency === 'number') {
            if (frequency === cluster.sampleCount) {
              commonClasses.push(classCombo);
            } else {
              recommendedClasses.push({
                className: classCombo,
                frequency,
                total: cluster.sampleCount
              });
            }
          }
        }
      }

      recommendedClasses.sort((a, b) => b.frequency - a.frequency);

      return json(res, { commonClasses, recommendedClasses });
    }

    // ---- Figma Files API ----
    if (path === '/api/figma-files' && req.method === 'GET') {
      const files = figmaFilesStore.list();
      return json(res, files);
    }

    if (path === '/api/figma-files' && req.method === 'POST') {
      const body = await parseBody(req);
      const { fileKey, nodeId, name, thumbnailUrl, projectId } = body;
      if (!fileKey || !name) return badRequest(res, 'fileKey and name required');
      if (!projectId) return badRequest(res, 'projectId required');
      const file = figmaFilesStore.upsert(fileKey, nodeId || null, name, thumbnailUrl || null, projectId);
      return json(res, file, 201);
    }

    if (path === '/api/figma-files' && req.method === 'DELETE') {
      const projectId = url.searchParams.get('projectId');
      const fileKey = url.searchParams.get('fileKey');
      const nodeId = url.searchParams.get('nodeId');
      if (!projectId) return badRequest(res, 'projectId required');
      if (!fileKey) return badRequest(res, 'fileKey required');

      figmaFilesStore.delete(fileKey, nodeId || null);
      mappingStore.deleteByFileKey(projectId, fileKey, nodeId || null);
      figmaFileDataStore.delete(projectId, fileKey, nodeId || null);

      // 클러스터 재생성
      // 프로젝트 설정에서 노드 이름 포함 여부 읽기
      const settings = settingsStore.listByProject(projectId);
      const includeNodeNameSetting = settings.find(s => s.key === 'cluster-include-node-name')?.value;
      const includeNodeName = includeNodeNameSetting !== 'false'; // 기본값 true

      clusterStore.deleteGenerated(projectId);
      const remainingFiles = figmaFilesStore.listByProject(projectId).filter(f => f.completed);
      for (const file of remainingFiles) {
        const mappings = mappingStore.listByFile(projectId, file.fileKey, file.nodeId);
        const mappedMappings = mappings.filter(m => m.status === 'mapped' && m.registryId);
        const fileData = figmaFileDataStore.get(projectId, file.fileKey, file.nodeId);
        if (!fileData) continue;
        const document = JSON.parse(fileData.data);
        for (const mapping of mappedMappings) {
          const result = findNodeInDocument(document, mapping.figmaNodeId);
          if (!result) continue;
          // 루트 노드는 parent를 null로 설정 (자동 매핑 비교 시와 동일하게)
          const isRootNode = mapping.figmaRootNodeId === mapping.figmaNodeId || mapping.figmaRootNodeId === null;
          const parent = isRootNode ? null : result.parent;

          // 1. Base 모드 클러스터 생성
          clusterStore.upsert(clusterStore.createSignatureData(result.node, parent, 1, includeNodeName, 'base'), mapping.registryId!, mapping.registryName || '', mapping.customAttrs, projectId, 'base');

          // 2. Full 모드 클러스터 생성 (노드 단독, variant value 포함) - variant 정보가 있는 경우만
          const hasVariant = result.node.componentProperties &&
            Object.values(result.node.componentProperties).some(prop =>
              prop && typeof prop === 'object' && prop.type && prop.type !== 'TEXT'
            );
          if (hasVariant) {
            clusterStore.upsert(clusterStore.createSignatureData(result.node, null, 0, includeNodeName, 'full'), mapping.registryId!, mapping.registryName || '', mapping.customAttrs, projectId, 'full');
          }
        }
      }
      return json(res, { success: true });
    }

    if (path === '/api/figma-files/touch' && req.method === 'POST') {
      const body = await parseBody(req);
      const { projectId, fileKey, nodeId } = body;
      if (!projectId) return badRequest(res, 'projectId required');
      if (!fileKey) return badRequest(res, 'fileKey required');
      figmaFilesStore.updateLastOpened(projectId, fileKey, nodeId || null);
      return json(res, { success: true });
    }

    if (path === '/api/figma-files/complete' && req.method === 'POST') {
      const body = await parseBody(req);
      const { projectId, fileKey, nodeId, completed } = body;
      if (!projectId) return badRequest(res, 'projectId required');
      if (!fileKey) return badRequest(res, 'fileKey required');
      if (typeof completed !== 'boolean') return badRequest(res, 'completed required as boolean');
      figmaFilesStore.updateCompleted(projectId, fileKey, nodeId || null, completed);
      return json(res, { success: true });
    }

    if (path === '/api/figma-files/refresh' && req.method === 'POST') {
      const body = await parseBody(req);
      const { projectId, fileKey, nodeId, data } = body;
      if (!projectId) return badRequest(res, 'projectId required');
      if (!fileKey) return badRequest(res, 'fileKey required');
      if (!data) return badRequest(res, 'data required');

      // 1. 이전 데이터에서 노드 ID 수집 (변경 감지용)
      const prevData = figmaFileDataStore.get(projectId, fileKey, nodeId || null);
      // prevData가 없으면 최초 refresh → 비교 기준 없음, 신규 노드 없음으로 처리
      const isFirstRefresh = !prevData;
      const prevNodeIds = new Set<string>();
      if (prevData) {
        const prevDoc = JSON.parse(prevData.data);
        function collectPrevNodeIds(node: any): void {
          if (node && node.id) prevNodeIds.add(node.id);
          if (node && node.children) node.children.forEach((c: any) => collectPrevNodeIds(c));
        }
        collectPrevNodeIds(prevDoc);
      }

      // 2. figma_file_data 업데이트
      figmaFileDataStore.save(projectId, fileKey, nodeId || null, data);

      // 3. 새 데이터에서 모든 노드 ID 수집
      const allNodeIds = new Set<string>();
      function collectNodeIds(node: any): void {
        if (node && node.id) {
          allNodeIds.add(node.id);
        }
        if (node && node.children) {
          node.children.forEach((child: any) => collectNodeIds(child));
        }
      }
      collectNodeIds(data);

      // 4. 추가된 노드 ID 계산 (이전에 없던 노드, 최초 refresh는 빈 배열)
      const newNodeIds: string[] = [];
      if (!isFirstRefresh) {
        for (const id of allNodeIds) {
          if (!prevNodeIds.has(id)) newNodeIds.push(id);
        }
      }

      // 5. 존재하지 않는 노드의 매핑 삭제
      const mappings = mappingStore.listByFile(projectId, fileKey, nodeId || null);
      let deletedCount = 0;
      for (const mapping of mappings) {
        if (!allNodeIds.has(mapping.figmaNodeId)) {
          mappingStore.deleteById(mapping.id);
          deletedCount++;
        }
      }

      console.log(`[Refresh] ${fileKey} - ${allNodeIds.size}개 노드, ${deletedCount}개 매핑 삭제, ${newNodeIds.length}개 신규 노드`);
      return json(res, { success: true, deletedMappingsCount: deletedCount, newNodeIds });
    }

    // ---- Figma File Data API (프로젝트별) ----
    if (path === '/api/figma-file-data' && req.method === 'GET') {
      const projectId = url.searchParams.get('projectId');
      const fileKey = url.searchParams.get('fileKey');
      const nodeId = url.searchParams.get('nodeId');
      if (!projectId) return badRequest(res, 'projectId required');
      if (!fileKey) return badRequest(res, 'fileKey required');
      const data = figmaFileDataStore.get(projectId, fileKey, nodeId || null);
      if (!data) return json(res, null);
      return json(res, { ...data, data: JSON.parse(data.data) });
    }

    if (path === '/api/figma-file-data' && req.method === 'POST') {
      const body = await parseBody(req);
      const { projectId, fileKey, nodeId, data } = body;
      if (!projectId) return badRequest(res, 'projectId required');
      if (!fileKey || !data) return badRequest(res, 'fileKey and data required');
      const saved = figmaFileDataStore.save(projectId, fileKey, nodeId || null, data);
      return json(res, { success: true, updatedAt: saved.updatedAt });
    }

    if (path === '/api/figma-file-data' && req.method === 'DELETE') {
      const projectId = url.searchParams.get('projectId');
      const fileKey = url.searchParams.get('fileKey');
      const nodeId = url.searchParams.get('nodeId');
      if (!projectId) return badRequest(res, 'projectId required');
      if (!fileKey) return badRequest(res, 'fileKey required');
      figmaFileDataStore.delete(projectId, fileKey, nodeId || null);
      return json(res, { success: true });
    }

    // ---- Cluster API ----
    if (path === '/api/clusters' && req.method === 'GET') {
      const projectId = url.searchParams.get('projectId');
      const clusters = projectId ? clusterStore.listByProject(projectId) : clusterStore.list();
      return json(res, clusters);
    }

    if (path === '/api/clusters/generate' && req.method === 'POST') {
      const body = await parseBody(req);
      const { projectId } = body as { projectId?: string };

      if (projectId) {
        // 프로젝트 설정에서 노드 이름 포함 여부 읽기
        const settings = settingsStore.listByProject(projectId);
        const includeNodeNameSetting = settings.find(s => s.key === 'cluster-include-node-name')?.value;
        const includeNodeName = includeNodeNameSetting !== 'false'; // 기본값 true

        clusterStore.deleteGenerated(projectId);
        const files = figmaFilesStore.listByProject(projectId).filter(f => f.completed);

        let createdCount = 0;
        for (const file of files) {
          const mappings = mappingStore.listByFile(projectId, file.fileKey, file.nodeId);
          const mappedMappings = mappings.filter(m => m.status === 'mapped' && m.registryId);
          const fileData = figmaFileDataStore.get(projectId, file.fileKey, file.nodeId);
          if (!fileData) continue;

          const document = JSON.parse(fileData.data);
          for (const mapping of mappedMappings) {
            const result = findNodeInDocument(document, mapping.figmaNodeId);
            if (!result) continue;

            // 루트 노드는 parent를 null로 설정 (자동 매핑 비교 시와 동일하게)
            const isRootNode = mapping.figmaRootNodeId === mapping.figmaNodeId || mapping.figmaRootNodeId === null;
            const parent = isRootNode ? null : result.parent;

            // 1. Base 모드 클러스터 생성 (componentProperties key만)
            const signatureDataBase = clusterStore.createSignatureData(result.node, parent, 1, includeNodeName, 'base');
            clusterStore.upsert(signatureDataBase, mapping.registryId!, mapping.registryName || '', mapping.customAttrs, projectId, 'base');
            createdCount++;

            // 2. Full 모드 클러스터 생성 (노드 단독, variant value 포함) - variant 정보가 있는 경우만
            const hasVariant = result.node.componentProperties &&
              Object.values(result.node.componentProperties).some(prop =>
                prop && typeof prop === 'object' && prop.type && prop.type !== 'TEXT'
              );
            if (hasVariant) {
              const signatureDataFull = clusterStore.createSignatureData(result.node, null, 0, includeNodeName, 'full');
              clusterStore.upsert(signatureDataFull, mapping.registryId!, mapping.registryName || '', mapping.customAttrs, projectId, 'full');
              createdCount++;
            }
          }
        }
        return json(res, { success: true, createdCount });
      } else {
        return badRequest(res, 'projectId required');
      }
    }

    // 자동 매핑 제안 (프로젝트별)
    if (path === '/api/clusters/suggest' && req.method === 'POST') {
      const body = await parseBody(req);
      const { nodes, existingMappingNodeIds = [], projectId } = body as {
        nodes: Array<{ id: string; name: string; type: string; children?: FigmaNodeLike[] }>;
        existingMappingNodeIds?: string[];
        projectId?: string;
      };

      if (!nodes || !Array.isArray(nodes)) {
        return badRequest(res, 'nodes array required');
      }
      if (!projectId) {
        return badRequest(res, 'projectId required');
      }

      // 프로젝트 설정에서 노드 이름 포함 여부 읽기
      const settings = settingsStore.listByProject(projectId);
      const includeNodeNameSetting = settings.find(s => s.key === 'cluster-include-node-name')?.value;
      const includeNodeName = includeNodeNameSetting !== 'false'; // 기본값 true

      const existingSet = new Set(existingMappingNodeIds);
      const nodeData: Array<{ nodeId: string; nodeName: string; nodeType: string; node: FigmaNodeLike; parent: FigmaNodeLike | null }> = [];

      const processNode = (node: FigmaNodeLike & { id: string }, parent: FigmaNodeLike | null = null) => {
        if (!existingSet.has(node.id)) {
          nodeData.push({
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.type,
            node,
            parent,
          });
        }

        if (node.children) {
          for (const child of node.children as Array<FigmaNodeLike & { id: string }>) {
            processNode(child, node);
          }
        }
      };

      for (const node of nodes) {
        processNode(node as FigmaNodeLike & { id: string });
      }

      const clusters = clusterStore.listByProject(projectId);
      const suggestionMap = new Map<string, AutoMappingSuggestion>();

      // 디버깅 데이터 수집
      const debugData: any[] = [];

      // 1단계: Base 모드 매핑
      const baseClusters = clusters.filter(c => c.variantMode === 'base' || c.variantMode === null);
      const baseClusterMap = new Map(baseClusters.map(c => [c.signature, c]));

      for (const nd of nodeData) {
        const signatureDataBase = clusterStore.createSignatureData(nd.node, nd.parent, 1, includeNodeName, 'base');
        const signatureBase = clusterStore.createNodeSignature(nd.node, nd.parent, 1, includeNodeName, 'base');
        const cluster = baseClusterMap.get(signatureBase);

        const debugEntry: any = {
          nodeId: nd.nodeId,
          nodeName: nd.nodeName,
          nodeType: nd.nodeType,
          signatureBase: signatureBase.substring(0, 16),
          signatureDataBase: signatureDataBase,
          baseClusterMatched: null,
          fullClusterMatched: null,
          finalSuggestion: null,
        };

        if (cluster) {
          const commonCustomAttrs = extractCommonClassesFromCluster(cluster);
          suggestionMap.set(nd.nodeId, {
            nodeId: nd.nodeId,
            nodeName: nd.nodeName,
            nodeType: nd.nodeType,
            signature: signatureBase,
            registryId: cluster.registryId,
            registryName: cluster.registryName,
            customAttrs: commonCustomAttrs,
            sampleCount: cluster.sampleCount,
          });

          debugEntry.baseClusterMatched = {
            signature: signatureBase.substring(0, 16),
            registryName: cluster.registryName,
            customAttrs: commonCustomAttrs,
            sampleCount: cluster.sampleCount,
            variantMode: cluster.variantMode || 'null',
          };
        }

        debugData.push(debugEntry);
      }

      // 2단계: Full 모드 매핑 (덮어쓰기)
      const fullClusters = clusters.filter(c => c.variantMode === 'full');
      const fullClusterMap = new Map(fullClusters.map(c => [c.signature, c]));

      for (const nd of nodeData) {
        const signatureDataFull = clusterStore.createSignatureData(nd.node, null, 0, includeNodeName, 'full');
        const signatureFull = clusterStore.createNodeSignature(nd.node, null, 0, includeNodeName, 'full');
        const cluster = fullClusterMap.get(signatureFull);

        const debugEntry = debugData.find(d => d.nodeId === nd.nodeId);
        if (debugEntry) {
          debugEntry.signatureFull = signatureFull.substring(0, 16);
          debugEntry.signatureDataFull = signatureDataFull;
        }

        if (cluster) {
          const allCustomAttrs = extractAllClassesFromCluster(cluster);
          suggestionMap.set(nd.nodeId, {
            nodeId: nd.nodeId,
            nodeName: nd.nodeName,
            nodeType: nd.nodeType,
            signature: signatureFull,
            registryId: cluster.registryId,
            registryName: cluster.registryName,
            customAttrs: allCustomAttrs,
            sampleCount: cluster.sampleCount,
          });

          if (debugEntry) {
            debugEntry.fullClusterMatched = {
              signature: signatureFull.substring(0, 16),
              registryName: cluster.registryName,
              customAttrs: allCustomAttrs,
              sampleCount: cluster.sampleCount,
              variantMode: cluster.variantMode,
            };
          }
        }

        // 최종 제안 기록
        if (debugEntry) {
          const finalSuggestion = suggestionMap.get(nd.nodeId);
          if (finalSuggestion) {
            debugEntry.finalSuggestion = {
              registryName: finalSuggestion.registryName,
              customAttrs: finalSuggestion.customAttrs,
              matchedMode: cluster ? 'full' : 'base',
            };
          }
        }
      }

      // 디버깅 JSON 저장 (설정 활성화 시)
      if (ENABLE_DEBUG_JSON) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const debugOutput = {
          timestamp: new Date().toISOString(),
          clusterStats: {
            total: clusters.length,
            base: baseClusters.length,
            full: fullClusters.length,
          },
          nodeResults: debugData,
        };

        try {
          const fs = await import('fs');
          const path = await import('path');
          const debugFilePath = path.join(process.cwd(), `signature-debug-${timestamp}.json`);
          fs.writeFileSync(debugFilePath, JSON.stringify(debugOutput, null, 2), 'utf-8');
          console.log(`[Debug] Signature debug data saved to: ${debugFilePath}`);
        } catch (err) {
          console.error('[Debug] Failed to save debug data:', err);
        }
      }

      const suggestions = Array.from(suggestionMap.values());
      return json(res, { suggestions });
    }

    // 제안된 매핑 일괄 적용
    if (path === '/api/clusters/apply' && req.method === 'POST') {
      const body = await parseBody(req);
      const { fileKey, rootNodeId, projectId, suggestions } = body as {
        fileKey: string;
        rootNodeId?: string | null;
        projectId: string;
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
      if (!projectId) {
        return badRequest(res, 'projectId required');
      }

      const registryItems = registryStore.listByProject(projectId);
      const registryMap = new Map(registryItems.map(r => [r.id, r]));

      let appliedCount = 0;
      for (const suggestion of suggestions) {
        const registryItem = registryMap.get(suggestion.registryId);
        if (!registryItem) continue;

        mappingStore.save({
          projectId,
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

    // ---- Default Mapping Rules API (프로젝트별) ----

    // GET /api/projects/:projectId/default-mapping-rules
    if (path.match(/^\/api\/projects\/[^/]+\/default-mapping-rules$/) && req.method === 'GET') {
      const projectId = path.replace('/api/projects/', '').replace('/default-mapping-rules', '');
      const grouped = url.searchParams.get('grouped') === 'true';
      if (grouped) {
        return json(res, defaultMappingRulesStore.listGroupedByProject(projectId));
      }
      return json(res, defaultMappingRulesStore.listByProject(projectId));
    }

    // POST /api/projects/:projectId/default-mapping-rules
    if (path.match(/^\/api\/projects\/[^/]+\/default-mapping-rules$/) && req.method === 'POST') {
      const projectId = path.replace('/api/projects/', '').replace('/default-mapping-rules', '');
      const body = await parseBody(req);
      const { registryId, keyword } = body;
      if (!registryId || !keyword) return badRequest(res, 'registryId and keyword required');
      try {
        const rule = defaultMappingRulesStore.create(projectId, { registryId, keyword });
        return json(res, rule, 201);
      } catch (err: any) {
        if (err.message?.includes('UNIQUE constraint')) {
          return json(res, { error: '이미 존재하는 키워드입니다' }, 400);
        }
        throw err;
      }
    }

    // POST /api/projects/:projectId/default-mapping-rules/reset
    if (path.match(/^\/api\/projects\/[^/]+\/default-mapping-rules\/reset$/) && req.method === 'POST') {
      const projectId = path.replace('/api/projects/', '').replace('/default-mapping-rules/reset', '');
      const count = defaultMappingRulesStore.resetForProject(projectId);
      return json(res, { success: true, count });
    }

    // DELETE /api/default-mapping-rules/:id
    if (path.match(/^\/api\/default-mapping-rules\/[^/]+$/) && req.method === 'DELETE') {
      const id = path.replace('/api/default-mapping-rules/', '');
      const deleted = defaultMappingRulesStore.delete(id);
      if (!deleted) return notFound(res);
      return json(res, { success: true });
    }

    // Default Rule 제안 (프로젝트별)
    if (path.match(/^\/api\/projects\/[^/]+\/default-mapping-rules\/suggest$/) && req.method === 'POST') {
      const projectId = path.replace('/api/projects/', '').replace('/default-mapping-rules/suggest', '');
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
        const match = defaultMappingRulesStore.match(projectId, node.name);
        if (match) {
          const registry = registryStore.get(match.registryId);
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

    // ---- Mapping Rules Export / Import (프로젝트별) ----
    // GET /api/projects/:projectId/mapping-rules/export
    if (path.match(/^\/api\/projects\/[^/]+\/mapping-rules\/export$/) && req.method === 'GET') {
      const projectId = path.replace('/api/projects/', '').replace('/mapping-rules/export', '');

      const defaultRules = defaultMappingRulesStore.listGroupedByProject(projectId).flatMap(g =>
        g.keywords.map(kw => ({ registryName: g.registryName, keyword: kw }))
      );
      const clusters = clusterStore.listByProject(projectId).map(c => ({
        signature: c.signature,
        registryName: c.registryName,
        customAttrs: c.customAttrs,
        sampleCount: c.sampleCount,
      }));

      // CSS 정보 가져오기
      const settings = settingsStore.getAsObject(projectId);
      const cssList = settings['css-list'] ? JSON.parse(settings['css-list']) : [];
      const componentClassMappingRaw = settings['css-class-mapping'] ? JSON.parse(settings['css-class-mapping']) : {};

      // componentId → componentName 변환 (다른 프로젝트에서 import 시 호환성)
      const registryList = registryStore.listByProject(projectId);
      const idToName: Record<string, string> = {};
      for (const r of registryList) {
        idToName[r.id] = r.name;
      }

      const componentClassMapping: Record<string, Record<string, string[]>> = {};
      for (const [cssId, compMap] of Object.entries(componentClassMappingRaw)) {
        componentClassMapping[cssId] = {};
        for (const [compId, classes] of Object.entries(compMap as Record<string, string[]>)) {
          const compName = idToName[compId];
          if (compName) {
            componentClassMapping[cssId][compName] = classes;
          }
        }
      }

      return json(res, {
        version: 2,
        exportedAt: new Date().toISOString(),
        projectId,
        defaultMappingRules: defaultRules,
        customMappingRules: clusters,
        cssList,
        componentClassMapping,
      });
    }

    // POST /api/projects/:projectId/mapping-rules/import
    if (path.match(/^\/api\/projects\/[^/]+\/mapping-rules\/import$/) && req.method === 'POST') {
      const projectId = path.replace('/api/projects/', '').replace('/mapping-rules/import', '');
      const body = await parseBody(req);
      const { defaultMappingRules = [], customMappingRules = [], cssList, componentClassMapping } = body as {
        version?: number;
        defaultMappingRules?: Array<{ registryName: string; keyword: string }>;
        customMappingRules?: Array<{ signature: string; registryName: string; customAttrs?: Record<string, string>; sampleCount?: number }>;
        cssList?: Array<{ id: string; name: string; content: string; classNames: string[] }>;
        componentClassMapping?: Record<string, Record<string, string[]>>;
      };

      let defaultAdded = 0;
      let clusterUpdated = 0;
      let cssImported = false;

      // defaultMappingRules: keyword 중복이면 skip
      for (const rule of defaultMappingRules) {
        const registry = registryStore.getByName(projectId, rule.registryName);
        if (!registry) continue;
        try {
          defaultMappingRulesStore.create(projectId, { registryId: registry.id, keyword: rule.keyword });
          defaultAdded++;
        } catch {
          // UNIQUE 제약 위반 (중복) → skip
        }
      }

      // customMappingRules: signature 기준 upsert
      for (const rule of customMappingRules) {
        const registry = registryStore.getByName(projectId, rule.registryName);
        if (!registry) continue;
        const existing = clusterStore.getBySignatureAndProject(rule.signature, projectId);
        if (existing) {
          getDb().prepare(`
            UPDATE mapping_clusters SET registry_id = ?, registry_name = ?, custom_attrs = ?, source = 'imported', updated_at = ? WHERE id = ?
          `).run(registry.id, registry.name, JSON.stringify(rule.customAttrs ?? {}), new Date().toISOString(), existing.id);
        } else {
          const now = new Date().toISOString();
          getDb().prepare(`
            INSERT INTO mapping_clusters (id, project_id, signature, signature_data, registry_id, registry_name, custom_attrs, sample_count, source, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'imported', ?, ?)
          `).run(randomUUID(), projectId, rule.signature, '{}', registry.id, registry.name, JSON.stringify(rule.customAttrs ?? {}), rule.sampleCount ?? 1, now, now);
        }
        clusterUpdated++;
      }

      // CSS 정보 저장 (v2)
      if (cssList && cssList.length > 0) {
        settingsStore.setMultiple(projectId, { 'css-list': JSON.stringify(cssList) });
        cssImported = true;
      }
      if (componentClassMapping && Object.keys(componentClassMapping).length > 0) {
        // componentName → componentId 변환 (현재 프로젝트의 registry 기준)
        const registryList = registryStore.listByProject(projectId);
        const nameToId: Record<string, string> = {};
        for (const r of registryList) {
          nameToId[r.name] = r.id;
        }

        const convertedMapping: Record<string, Record<string, string[]>> = {};
        for (const [cssId, compMap] of Object.entries(componentClassMapping)) {
          convertedMapping[cssId] = {};
          for (const [compName, classes] of Object.entries(compMap as Record<string, string[]>)) {
            const compId = nameToId[compName];
            if (compId) {
              convertedMapping[cssId][compId] = classes;
            }
          }
        }

        settingsStore.setMultiple(projectId, { 'css-class-mapping': JSON.stringify(convertedMapping) });
        cssImported = true;
      }

      return json(res, { success: true, defaultAdded, clusterUpdated, cssImported });
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

      if (!exportPath) {
        return badRequest(res, 'exportPath required. Set it in Settings.');
      }

      try {
        if (!existsSync(exportPath)) {
          mkdirSync(exportPath, { recursive: true });
        }

        const cleanFilename = filename.endsWith('.xml') ? filename : `${filename}.xml`;
        const fullPath = join(exportPath, cleanFilename);

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

server.listen(PORT, HOST, () => {
  console.log(`[Server] Figma Viewer API running on http://${HOST}:${PORT}`);
  console.log(`[Server] CORS allowed origins: ${CORS_ORIGINS}`);
  console.log(`[Server] Debug JSON generation: ${ENABLE_DEBUG_JSON ? 'ENABLED' : 'DISABLED'}`);
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
  res.end(JSON.stringify(data, null, 2));
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

function findNodeInDocument(node: any, nodeId: string, parent: FigmaNodeLike | null = null): { node: FigmaNodeLike; parent: FigmaNodeLike | null } | null {
  if (node.id === nodeId) {
    return { node, parent };
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeInDocument(child, nodeId, node);
      if (found) return found;
    }
  }
  return null;
}
