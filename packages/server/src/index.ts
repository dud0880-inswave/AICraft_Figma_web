// ============================================================
// Figma Viewer Backend Server
// ============================================================
import { config as dotenvConfig } from 'dotenv';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import { writeFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
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
// mode: 'common' → sampleCount와 동일한 빈도의 클래스만 (Base 모드용)
// mode: 'all'    → 빈도 상위 1개 선택 (Full 모드용)
function extractClassesFromCluster(cluster: any, mode: 'common' | 'all'): Record<string, string> {
  const result: Record<string, string> = {};

  if (cluster.customAttrs.class) {
    if (typeof cluster.customAttrs.class === 'object' && !Array.isArray(cluster.customAttrs.class)) {
      const entries = Object.entries(cluster.customAttrs.class) as [string, number][];
      const candidates = mode === 'common'
        ? entries.filter(([_, count]) => count === cluster.sampleCount)
        : entries;

      if (candidates.length > 0) {
        candidates.sort((a, b) => b[1] - a[1]);
        result.class = candidates[0][0];
      }
    } else {
      result.class = cluster.customAttrs.class;
    }
  }

  for (const [key, value] of Object.entries(cluster.customAttrs)) {
    if (key !== 'class') {
      result[key] = value as string;
    }
  }

  return result;
}

// 이미지 저장 경로
const IMAGES_DIR = resolve(__dirname, '..', 'data', 'images');
if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true });

function sanitizeFilePart(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_');
}
function getImagePath(projectId: string, fileKey: string, nodeId: string | null, suffix: string | null = null): string {
  const safeProject = sanitizeFilePart(projectId);
  const safeFile = sanitizeFilePart(fileKey);
  const safeNode = nodeId ? sanitizeFilePart(nodeId) : 'root';
  const dir = join(IMAGES_DIR, safeProject);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const suffixPart = suffix ? `_${sanitizeFilePart(suffix)}` : '';
  return join(dir, `${safeFile}__${safeNode}${suffixPart}.svg`);
}

// DB 초기화
initDb();
const registryStore = new RegistryStore(getDb());
const projectStore = new ProjectStore(getDb());
const settingsStore = new SettingsStore(getDb());
const figmaFilesStore = new FigmaFilesStore(getDb());
const mappingStore = new MappingStore(getDb());
const figmaFileDataStore = new FigmaFileDataStore(getDb());
const clusterStore = new ClusterStore(getDb());
const defaultMappingRulesStore = new DefaultMappingRulesStore(getDb());

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Figma-Token');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const path = url.pathname;

  console.log(`[Server] ${req.method} ${path}`);

  try {
    // ---- 정적 파일 서빙: /websquare/* (미리보기 iframe + CSS 이미지 경로) ----
    if (path.startsWith('/websquare/')) {
      const clientPublicDir = resolve(__dirname, '..', '..', 'client', 'public');
      const filePath = join(clientPublicDir, path);
      if (!filePath.startsWith(clientPublicDir)) { res.writeHead(403); res.end(); return; }
      if (existsSync(filePath)) {
        const buf = readFileSync(filePath);
        const ext = (path.split('.').pop() || '').toLowerCase();
        const mime: Record<string, string> = {
          html: 'text/html; charset=utf-8', js: 'application/javascript; charset=utf-8',
          css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8',
          png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml',
          woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', eot: 'application/vnd.ms-fontobject',
        };
        res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream', 'Access-Control-Allow-Origin': origin });
        res.end(buf);
        return;
      }
    }

    // ---- Figma API Proxy (VS Code extension 및 운영 환경에서 Vite proxy 대체) ----
    if (path.startsWith('/api/figma-proxy/')) {
      const subPath = path.replace('/api/figma-proxy', '');
      const figmaUrl = `https://api.figma.com${subPath}${url.search || ''}`;
      try {
        const token = req.headers['x-figma-token'] as string | undefined;
        const headers: Record<string, string> = {};
        if (token) headers['X-Figma-Token'] = token;
        const figmaRes = await fetch(figmaUrl, { method: req.method, headers });
        const body = Buffer.from(await figmaRes.arrayBuffer());
        res.writeHead(figmaRes.status, {
          'Content-Type': figmaRes.headers.get('content-type') || 'application/json',
          'Access-Control-Allow-Origin': origin,
        });
        res.end(body);
        return;
      } catch (err) {
        console.error('[FigmaProxy] error:', err);
        return json(res, { error: String(err) }, 500);
      }
    }

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
      // 저장된 이미지 삭제 (기본 + _spec suffix 버전)
      try {
        for (const suffix of [null, 'spec']) {
          const imgPath = getImagePath(projectId, fileKey, nodeId || null, suffix);
          if (existsSync(imgPath)) unlinkSync(imgPath);
        }
      } catch { /* ignore */ }

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

      const collectNodeIds = (node: any, acc: Set<string>): void => {
        if (node?.id) acc.add(node.id);
        if (node?.children) node.children.forEach((c: any) => collectNodeIds(c, acc));
      };

      // 1. 이전 데이터 로드 및 변경 여부 판단
      const prevData = figmaFileDataStore.get(projectId, fileKey, nodeId || null);
      const newDataJson = JSON.stringify(data);
      const hasChanges = !prevData || prevData.data !== newDataJson;

      // 변경 없으면 아무 것도 안 함
      if (!hasChanges) {
        console.log(`[Refresh] ${fileKey} - 변경 없음`);
        return json(res, { success: true, hasChanges: false, deletedMappingsCount: 0, newNodeIds: [] });
      }

      // 2. 이전/신규 노드 ID 수집
      const prevNodeIds = new Set<string>();
      if (prevData) collectNodeIds(JSON.parse(prevData.data), prevNodeIds);
      const allNodeIds = new Set<string>();
      collectNodeIds(data, allNodeIds);

      // 3. figma_file_data 갱신
      figmaFileDataStore.save(projectId, fileKey, nodeId || null, data);

      // 4. 신규 노드 ID 계산 (최초 등록이면 prevNodeIds가 비어있으므로 모든 노드가 신규)
      const newNodeIds: string[] = [];
      for (const id of allNodeIds) {
        if (!prevNodeIds.has(id)) newNodeIds.push(id);
      }

      // 5. 사라진 노드의 매핑 삭제
      const mappings = mappingStore.listByFile(projectId, fileKey, nodeId || null);
      let deletedCount = 0;
      for (const mapping of mappings) {
        if (!allNodeIds.has(mapping.figmaNodeId)) {
          mappingStore.deleteById(mapping.id);
          deletedCount++;
        }
      }

      console.log(`[Refresh] ${fileKey} - ${allNodeIds.size}개 노드, ${deletedCount}개 매핑 삭제, ${newNodeIds.length}개 신규 노드`);
      return json(res, { success: true, hasChanges: true, deletedMappingsCount: deletedCount, newNodeIds });
    }

    // XML 다운로드 파일명 조회 (최초 저장 여부 판단용)
    if (path === '/api/figma-files/xml-filename' && req.method === 'GET') {
      const projectId = url.searchParams.get('projectId');
      const fileKey = url.searchParams.get('fileKey');
      const nodeId = url.searchParams.get('nodeId');
      if (!projectId || !fileKey) return badRequest(res, 'projectId, fileKey required');
      const record = figmaFilesStore.get(fileKey, nodeId || null, projectId);
      return json(res, { xmlFilename: record?.xmlFilename || null });
    }

    // XML 다운로드 파일명 저장 (최초 저장 후)
    if (path === '/api/figma-files/xml-filename' && req.method === 'POST') {
      const body = await parseBody(req);
      const { projectId, fileKey, nodeId, xmlFilename } = body;
      if (!projectId || !fileKey || !xmlFilename) return badRequest(res, 'projectId, fileKey, xmlFilename required');
      figmaFilesStore.updateXmlFilename(projectId, fileKey, nodeId || null, xmlFilename);
      return json(res, { success: true });
    }

    // 버전 증가 (refresh 시 사용자가 '버전 올리기' 컨펌한 경우 호출)
    if (path === '/api/figma-files/bump-version' && req.method === 'POST') {
      const body = await parseBody(req);
      const { projectId, fileKey, nodeId } = body;
      if (!projectId || !fileKey) return badRequest(res, 'projectId, fileKey required');
      const newVersion = figmaFilesStore.incrementVersion(projectId, fileKey, nodeId || null);
      console.log(`[BumpVersion] ${fileKey} → v${newVersion}`);
      return json(res, { success: true, version: newVersion });
    }

    // 이미지 저장: Figma presigned URL을 서버가 다운로드해서 로컬에 저장
    if (path === '/api/figma-files/image' && req.method === 'POST') {
      const body = await parseBody(req);
      const { projectId, fileKey, nodeId, imageUrl, suffix } = body as {
        projectId?: string; fileKey?: string; nodeId?: string | null; imageUrl?: string; suffix?: string;
      };
      if (!projectId || !fileKey) return badRequest(res, 'projectId, fileKey required');
      if (!imageUrl) return badRequest(res, 'imageUrl required');
      try {
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) return json(res, { error: `Failed to download image: ${imgRes.status}` }, 500);
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const imgPath = getImagePath(projectId, fileKey, nodeId || null, suffix || null);
        writeFileSync(imgPath, buf);
        console.log(`[Image] saved ${imgPath} (${buf.length} bytes)`);
        return json(res, { success: true });
      } catch (err) {
        console.error('[Image] save failed:', err);
        return json(res, { error: String(err) }, 500);
      }
    }

    // 이미지 조회
    if (path === '/api/figma-files/image' && req.method === 'GET') {
      const projectId = url.searchParams.get('projectId');
      const fileKey = url.searchParams.get('fileKey');
      const nodeId = url.searchParams.get('nodeId');
      const suffix = url.searchParams.get('suffix');
      if (!projectId || !fileKey) return badRequest(res, 'projectId, fileKey required');
      const imgPath = getImagePath(projectId, fileKey, nodeId || null, suffix || null);
      if (!existsSync(imgPath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const buf = readFileSync(imgPath);
      res.writeHead(200, {
        'Content-Type': 'image/svg+xml',
        'Content-Length': String(buf.length),
        'Cache-Control': 'no-cache',
      });
      res.end(buf);
      return;
    }

    // 이미지 삭제
    if (path === '/api/figma-files/image' && req.method === 'DELETE') {
      const projectId = url.searchParams.get('projectId');
      const fileKey = url.searchParams.get('fileKey');
      const nodeId = url.searchParams.get('nodeId');
      const suffix = url.searchParams.get('suffix');
      if (!projectId || !fileKey) return badRequest(res, 'projectId, fileKey required');
      const imgPath = getImagePath(projectId, fileKey, nodeId || null, suffix || null);
      if (existsSync(imgPath)) unlinkSync(imgPath);
      return json(res, { success: true });
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

    // 단일값 클러스터 여부 확인 (매핑 변경 후 전체 적용 팝업용)
    if (path === '/api/clusters/check-unique' && req.method === 'POST') {
      const body = await parseBody(req);
      const { projectId, node, parent } = body as {
        projectId: string;
        node: FigmaNodeLike & { id: string };
        parent: FigmaNodeLike | null;
      };
      if (!projectId || !node) return badRequest(res, 'projectId and node required');

      const settings = settingsStore.listByProject(projectId);
      const includeNodeName = settings.find(s => s.key === 'cluster-include-node-name')?.value !== 'false';

      // full 시그니처로 먼저 조회 (더 구체적)
      const sigFull = clusterStore.createNodeSignature(node, null, 0, includeNodeName, 'full');
      let clusters = clusterStore.listAllBySignatureAndProject(sigFull, projectId);
      let signature = sigFull;
      let mode: 'full' | 'base' = 'full';

      // full에 없으면 base 시그니처 조회 (더 일반적)
      if (clusters.length === 0) {
        const sigBase = clusterStore.createNodeSignature(node, parent, 1, includeNodeName, 'base');
        clusters = clusterStore.listAllBySignatureAndProject(sigBase, projectId);
        signature = sigBase;
        mode = 'base';
      }

      if (clusters.length !== 1) {
        return json(res, { isUnique: false });
      }

      const cluster = clusters[0];

      // customAttrs.class 조합이 1가지인지 확인
      const classAttr = cluster.customAttrs.class;
      const isClassUnique = !classAttr
        || typeof classAttr === 'string'
        || (typeof classAttr === 'object' && !Array.isArray(classAttr) && Object.keys(classAttr).length === 1);

      if (!isClassUnique) {
        return json(res, { isUnique: false });
      }

      // 프로젝트 내 동일 시그니처를 가진 노드 수 추정 (file_data 스캔, mode에 맞는 시그니처만 계산)
      const allFileData = figmaFileDataStore.listByProject(projectId);
      let affectedCount = 0;
      for (const fd of allFileData) {
        const doc = JSON.parse(fd.data);
        const scanNodes = (n: any, parentNode: any = null): void => {
          if (n?.id) {
            const sig = mode === 'full'
              ? clusterStore.createNodeSignature(n, null, 0, includeNodeName, 'full')
              : clusterStore.createNodeSignature(n, parentNode, 1, includeNodeName, 'base');
            if (sig === signature) affectedCount++;
          }
          if (n?.children) n.children.forEach((c: any) => scanNodes(c, n));
        };
        scanNodes(doc);
      }

      return json(res, { isUnique: true, signature, mode, cluster, affectedCount });
    }

    // 시그니처 기반 전체 매핑 적용
    if (path === '/api/mappings/apply-by-signature' && req.method === 'POST') {
      const body = await parseBody(req);
      const { projectId, signature, mode: applyMode, mapping: mappingData } = body as {
        projectId: string;
        signature: string;
        mode: 'full' | 'base';
        mapping: {
          registryId: string;
          registryName: string;
          registryTag?: string;
          customAttrs: Record<string, string>;
        };
      };
      if (!projectId || !signature || !mappingData) return badRequest(res, 'projectId, signature, mapping required');

      const settings = settingsStore.listByProject(projectId);
      const includeNodeName = settings.find(s => s.key === 'cluster-include-node-name')?.value !== 'false';

      const allFileData = figmaFileDataStore.listByProject(projectId);
      let appliedCount = 0;

      for (const fd of allFileData) {
        const doc = JSON.parse(fd.data);
        const scanAndApply = (n: any, parentNode: any = null): void => {
          if (n?.id) {
            const sig = applyMode === 'full'
              ? clusterStore.createNodeSignature(n, null, 0, includeNodeName, 'full')
              : clusterStore.createNodeSignature(n, parentNode, 1, includeNodeName, 'base');
            if (sig === signature) {
              mappingStore.save({
                projectId,
                figmaFileKey: fd.fileKey,
                figmaRootNodeId: fd.nodeId,
                figmaNodeId: n.id,
                figmaNodeName: n.name,
                figmaNodeType: n.type,
                registryId: mappingData.registryId,
                registryName: mappingData.registryName,
                registryTag: mappingData.registryTag || '',
                customAttrs: mappingData.customAttrs,
                status: 'mapped',
              });
              appliedCount++;
            }
          }
          if (n?.children) n.children.forEach((c: any) => scanAndApply(c, n));
        };
        scanAndApply(doc);
      }

      console.log(`[ApplyBySignature] ${signature.substring(0, 8)}... → ${appliedCount}개 적용`);
      return json(res, { success: true, appliedCount });
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
        if (!existingSet.has(node.id) && node.type !== 'VECTOR') {
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
          const commonCustomAttrs = extractClassesFromCluster(cluster, 'common');
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
          const allCustomAttrs = extractClassesFromCluster(cluster, 'all');
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

      // button/trigger로 매핑된 노드의 하위 요소는 제안에서 제외
      const noChildrenComponents = new Set(['button', 'trigger'])
      const descendantIdsToExclude = new Set<string>()
      const collectDescendants = (node: FigmaNodeLike) => {
        for (const child of (node.children ?? []) as FigmaNodeLike[]) {
          descendantIdsToExclude.add((child as any).id)
          collectDescendants(child)
        }
      }
      for (const nd of nodeData) {
        const suggestion = suggestionMap.get(nd.nodeId)
        if (suggestion && noChildrenComponents.has(suggestion.registryName.toLowerCase())) {
          collectDescendants(nd.node)
        }
      }
      for (const id of descendantIdsToExclude) suggestionMap.delete(id)

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

      const noChildrenComponents = new Set(['button', 'trigger'])
      const processNode = (node: NodeLike) => {
        if (node.type === 'VECTOR') return
        const match = defaultMappingRulesStore.match(projectId, node.name);
        if (match) {
          const registry = registryStore.get(match.registryId);
          if (registry) {
            suggestions.push({
              nodeId: node.id, nodeName: node.name, nodeType: node.type,
              signature: '', registryId: match.registryId, registryName: registry.name,
              customAttrs: {}, sampleCount: 0, matchedKeyword: match.matchedKeyword,
            });
            // button/trigger는 하위 요소 매핑 제외
            if (noChildrenComponents.has(registry.name.toLowerCase())) return
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
      const { xml, filename, exportPath, version } = body as {
        xml: string;
        filename: string;
        exportPath?: string;
        version?: string;
      };

      if (!xml || !filename) {
        return badRequest(res, 'xml and filename required');
      }

      if (!exportPath) {
        return badRequest(res, 'exportPath required. Set it in Settings.');
      }
      if (!version) {
        return badRequest(res, 'version required');
      }

      try {
        const baseName = filename.replace(/\.xml$/i, '');

        // 1. {exportPath}/{filename} 폴더 생성
        const fileDir = join(exportPath, baseName);
        if (!existsSync(fileDir)) {
          mkdirSync(fileDir, { recursive: true });
        }

        // 2. 전달받은 현재 버전 폴더에 저장 (자동 증가 X)
        const versionDir = join(fileDir, `v${String(version).padStart(2, '0')}`);
        if (!existsSync(versionDir)) {
          mkdirSync(versionDir, { recursive: true });
        }

        // 4. 버전 폴더 하위에 xml 저장
        const fullPath = join(versionDir, `${baseName}.xml`);
        writeFileSync(fullPath, xml, 'utf-8');
        console.log(`[Server] XML saved to: ${fullPath}`);

        return json(res, { success: true, path: fullPath });
      } catch (err) {
        console.error('[Server] Failed to save XML:', err);
        return json(res, { error: `Failed to save: ${String(err)}` }, 500);
      }
    }

    // Spec 마크다운 저장: XML과 동일 경로 구조로 저장 (현재 버전 폴더에 _spec.md)
    if (path === '/api/export-spec' && req.method === 'POST') {
      const body = await parseBody(req);
      const { markdown, content, exportPath, folderName, version, fileName } = body as {
        markdown?: string;
        content?: string;
        exportPath?: string;
        folderName: string;
        version: string;
        fileName?: string;
      };

      const fileContent = markdown || content;
      if (!fileContent || !folderName || !version) {
        return badRequest(res, 'markdown/content, folderName, version required');
      }
      if (!exportPath) {
        return badRequest(res, 'exportPath required. Set it in Settings.');
      }

      try {
        const baseName = folderName.replace(/\.xml$/i, '');
        const fileDir = join(exportPath, baseName);
        if (!existsSync(fileDir)) mkdirSync(fileDir, { recursive: true });

        const versionDir = join(fileDir, `v${String(version).padStart(2, '0')}`);
        if (!existsSync(versionDir)) mkdirSync(versionDir, { recursive: true });

        const outputFileName = fileName || `${baseName}_spec.md`;
        const fullPath = join(versionDir, outputFileName);
        writeFileSync(fullPath, fileContent, 'utf-8');
        console.log(`[Server] Spec saved to: ${fullPath}`);

        return json(res, { success: true, path: fullPath });
      } catch (err) {
        console.error('[Server] Failed to save spec:', err);
        return json(res, { error: `Failed to save: ${String(err)}` }, 500);
      }
    }

    // 이전 버전 스펙들 조회: v01 ~ v(upToVersion-1) 폴더에서 해당 파일을 순서대로 반환
    if (path === '/api/export-spec/prior' && req.method === 'GET') {
      const exportPath = url.searchParams.get('exportPath');
      const folderName = url.searchParams.get('folderName');
      const upToVersion = parseInt(url.searchParams.get('upToVersion') || '0', 10);
      const fileName = url.searchParams.get('fileName');

      if (!exportPath || !folderName || !upToVersion) {
        return badRequest(res, 'exportPath, folderName, upToVersion required');
      }

      try {
        const baseName = folderName.replace(/\.xml$/i, '');
        const fileDir = join(exportPath, baseName);
        const result: Array<{ version: string; content: string }> = [];
        const targetFileName = fileName || `${baseName}_spec.md`;

        for (let v = 1; v < upToVersion; v++) {
          const versionStr = String(v).padStart(2, '0');
          const filePath = join(fileDir, `v${versionStr}`, targetFileName);
          if (existsSync(filePath)) {
            try {
              const content = readFileSync(filePath, 'utf-8');
              result.push({ version: versionStr, content });
            } catch { /* ignore unreadable */ }
          }
        }

        return json(res, { priorSpecs: result });
      } catch (err) {
        console.error('[Server] Failed to list prior specs:', err);
        return json(res, { error: String(err) }, 500);
      }
    }

    // ---- Health ----
    if (path === '/api/health') {
      return json(res, { status: 'ok' });
    }

    // ---- Node SVG fetch API ----
    if (path === '/api/node-svgs' && req.method === 'POST') {
      const body = await parseBody(req);
      const { projectId, fileKey, nodeIds } = body;
      if (!projectId || !fileKey || !nodeIds?.length) return badRequest(res, 'projectId, fileKey, nodeIds required');

      const settings = settingsStore.listByProject(projectId);
      const token = settings.find(s => s.key === 'figma-token')?.value;
      if (!token) return badRequest(res, 'figma-token not configured');

      // Figma API로 SVG URL 가져오기
      const ids = (nodeIds as string[]).join(',');
      const figmaUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=svg`;
      const figmaRes = await fetch(figmaUrl, { headers: { 'X-Figma-Token': token } });
      if (!figmaRes.ok) {
        const err = await figmaRes.text();
        return json(res, { error: `Figma API error: ${figmaRes.status} - ${err}` }, 500);
      }
      const figmaData = await figmaRes.json() as { images: Record<string, string | null> };

      // SVG URL에서 실제 SVG 콘텐츠 fetch
      const svgMap: Record<string, string> = {};
      await Promise.all(
        Object.entries(figmaData.images).map(async ([id, url]) => {
          if (!url) return;
          try {
            const svgRes = await fetch(url);
            if (svgRes.ok) svgMap[id] = await svgRes.text();
          } catch { /* skip */ }
        })
      );

      return json(res, { svgs: svgMap });
    }

    // ---- 스펙문서 생성 API (Claude) ----
    // ── 스펙 자동 매핑 ──
    if (path === '/api/auto-map-spec' && req.method === 'POST') {
      const body = await parseBody(req);
      const { textNodes, nodeTree, imageUrl } = body;
      if (!textNodes || !Array.isArray(textNodes)) return badRequest(res, 'textNodes required');

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return json(res, { error: 'ANTHROPIC_API_KEY not configured' }, 500);

      const nodesJson = JSON.stringify(textNodes, null, 2);
      const treeSection = nodeTree ? `\n## 노드 트리 구조 (대상 매칭용)
\`\`\`json
${JSON.stringify(nodeTree, null, 2)}
\`\`\`\n` : '';

      const prompt = `당신은 Figma 화면 설계서(SDD) 분석 전문가입니다.
아래는 Figma 스펙 문서 프레임에서 추출한 데이터입니다.

## 1. 텍스트 노드 목록
\`\`\`json
${nodesJson}
\`\`\`
${treeSection}
## 분류 규칙

### screenName (화면 명) — 반드시 1개만 선택
- 스펙 문서 최상단에 테이블 형태로 "화면명", "화면 경로", "제공 채널", "화면 ID" 등의 항목이 있음
- screenName은 "화면명" 라벨 옆에 있는 값 텍스트 노드 (예: "EPC 상품 조회/찾기")
- "화면명"이라는 라벨 자체가 아니라 그 값에 해당하는 텍스트 노드를 선택
- "화면 경로", "제공 채널", "화면 ID" 등의 라벨이나 값은 screenName이 아님

### description (설명)
- 기능 설명, 요구사항, 비즈니스 로직, Activity ID 등이 포함된 텍스트
- 보통 번호(①②③ 또는 1. 2. 3.)가 붙어있거나, 특정 UI 요소의 동작을 설명하는 내용

### 분류하지 않는 것
- 단순 레이블 ("버전", "출시일", "담당자")
- 샘플 데이터값 ("V1.0", "2025-05-18", "홍길동")
- UI 장식 텍스트, 구분선, 빈 텍스트

### description의 대상 노드 (targetNodeId)
- 각 description이 설명하는 대상 UI 요소의 nodeId를 노드 트리에서 찾아 매핑
- 설명 텍스트 내용과 노드 트리의 name을 비교하여 가장 관련 있는 노드를 선택
- 대상을 특정할 수 없으면 targetNodeId를 생략

## 출력 형식
반드시 아래 JSON 형식만 출력하세요. 다른 텍스트 없이 JSON만 출력하세요.
\`\`\`json
{
  "mappings": [
    { "nodeId": "텍스트노드ID", "type": "screenName" },
    { "nodeId": "텍스트노드ID", "type": "description", "targetNodeId": "대상노드ID" }
  ]
}
\`\`\``;

      try {
        // 이미지가 있으면 base64 변환 (data URL 또는 HTTP URL)
        let imageBase64: string | null = null
        let imageMediaType = 'image/png'
        if (imageUrl) {
          try {
            const imgUrlStr = imageUrl as string
            const dataMatch = imgUrlStr.match(/^data:image\/(\w+);base64,(.+)$/)
            if (dataMatch) {
              imageMediaType = `image/${dataMatch[1]}`
              imageBase64 = dataMatch[2]
            } else {
              const imgRes = await fetch(imgUrlStr)
              if (imgRes.ok) {
                const imgBuf = Buffer.from(await imgRes.arrayBuffer())
                imageBase64 = imgBuf.toString('base64')
              }
            }
          } catch { /* ignore */ }
        }

        const messageContent: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = []
        if (imageBase64) {
          messageContent.push({
            type: 'image',
            source: { type: 'base64', media_type: imageMediaType, data: imageBase64 },
          })
          messageContent.push({ type: 'text', text: '위 이미지는 스펙 문서 캡쳐입니다. 이미지와 텍스트 노드를 함께 분석하세요.\n\n' + prompt })
        } else {
          messageContent.push({ type: 'text', text: prompt })
        }

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            messages: [{ role: 'user', content: messageContent }],
          }),
        });

        if (!claudeRes.ok) {
          const err = await claudeRes.text();
          console.error('[AutoMap] Claude API error:', err);
          return json(res, { error: `Claude API error: ${claudeRes.status}` }, 500);
        }

        const claudeData = await claudeRes.json() as { content: Array<{ type: string; text: string }> };
        const rawText = claudeData.content?.find(c => c.type === 'text')?.text || '';

        // JSON 파싱 (```json ... ``` 블록 또는 순수 JSON)
        const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/) || rawText.match(/(\{[\s\S]*\})/);
        const metaTagMap: Record<string, string> = {};
        const markTargetMap: Record<string, string> = {};

        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            if (parsed.mappings && Array.isArray(parsed.mappings)) {
              for (const m of parsed.mappings) {
                if (m.nodeId && (m.type === 'screenName' || m.type === 'description')) {
                  metaTagMap[m.nodeId] = m.type;
                  if (m.type === 'description' && m.targetNodeId) {
                    markTargetMap[m.nodeId] = m.targetNodeId;
                  }
                }
              }
            }
          } catch (e) {
            console.error('[AutoMap] JSON parse error:', e, rawText);
          }
        }

        return json(res, { metaTagMap, markTargetMap });
      } catch (err) {
        console.error('[AutoMap] Claude API call failed:', err);
        return json(res, { error: String(err) }, 500);
      }
    }

    // ── 스펙 문서 생성 ──
    if (path === '/api/generate-spec' && req.method === 'POST') {
      const body = await parseBody(req);
      const { specJson, convertedXml, screenName, imageUrl, priorSpecs, specType } = body as {
        specJson?: object | null;
        convertedXml?: string;
        screenName?: string;
        imageUrl?: string;
        priorSpecs?: Array<{ version: string; content: string }>;
        specType?: 'screen-info' | 'test-plan' | 'interface-metadata' | null;
      };
      if (!specJson && !convertedXml) return badRequest(res, 'specJson or convertedXml required');

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return json(res, { error: 'ANTHROPIC_API_KEY not configured' }, 500);

      const effectiveSpecType = specType || 'screen-info';
      const hasSpecMeta = !!specJson;

      const specMetaSection = hasSpecMeta ? `### 1. 스펙 메타데이터 (JSON)
\`\`\`json
${JSON.stringify(specJson, null, 2)}
\`\`\`

` : '';

      const xmlSection = convertedXml ? `### ${hasSpecMeta ? '2' : '1'}. 변환된 UI 구조 (XML)
\`\`\`xml
${convertedXml}
\`\`\`` : '';

      const hasPrior = Array.isArray(priorSpecs) && priorSpecs.length > 0;

      const priorSection = hasPrior
        ? `## 이전 버전 누적 스펙

아래는 이전 버전들에서 작성된 스펙 문서들입니다. 이들은 버전 순서대로 누적되어 현재까지의 스펙 상태를 구성합니다.
**현재 입력 데이터와 비교하여 변경/추가/삭제된 내용만 이번 버전의 스펙으로 작성하세요.**

${priorSpecs!.map(p => `### v${p.version}\n\`\`\`markdown\n${p.content}\n\`\`\``).join('\n\n')}
`
        : '';

      // ---- specType별 프롬프트 생성 ----
      let prompt = '';
      let maxTokens = 8192;

      if (effectiveSpecType === 'screen-info') {
        const analysisGuide = hasSpecMeta
          ? `규칙:
- 한국어로 작성
- 설명 데이터의 texts를 분석하여 의미 있는 요구사항으로 변환
- XML 구조에서 컴포넌트 타입과 속성을 분석
- 스펙 메타데이터의 설명(description)과 대상 요소(target) 매핑을 기반으로 기능 요구사항 작성
- 추정이 필요한 부분은 합리적으로 추정하되 [추정] 표시
- Markdown만 출력 (다른 설명 없이)`
          : `규칙:
- 한국어로 작성
- 스펙 매핑정보가 없으므로 XML 구조와 이미지를 기반으로 화면을 분석
- XML에서 컴포넌트 타입, 속성, 계층 구조를 분석하여 기능 요구사항을 도출
- 이미지가 제공된 경우 화면의 시각적 구조와 레이아웃을 참고하여 분석
- 추정이 필요한 부분은 합리적으로 추정하되 [추정] 표시
- Markdown만 출력 (다른 설명 없이)`;

        prompt = hasPrior
          ? `당신은 소프트웨어 화면 설계서(SDD) 작성 전문가입니다.
이 문서는 **화면 정보(screen-info)** 문서입니다.

${priorSection}

## 이번 버전 입력 데이터

${specMetaSection}${xmlSection}

## 출력 형식

이번 버전에서 **변경된/추가된/삭제된** 내용만 간결한 Markdown으로 작성하세요.

# ${screenName || '화면'} 변경 스펙

## 변경 요약
(한 두 문장으로 이번 버전 핵심 변경점)

## 추가된 기능/요소
(없으면 "없음")

## 변경된 기능/요소
(없으면 "없음")
- 기존: ...
- 변경: ...

## 제거된 기능/요소
(없으면 "없음")

## TODO 변경사항
(팝업 연결, 화면 전환, 외부 API 연동, 권한, 데이터 바인딩 등 화면 내부에서 정의하기 어려운 항목의 변경/추가/삭제를 TODO 체크리스트로 작성. 없으면 "없음")

${analysisGuide}
- 이전 스펙에 이미 있는 내용은 반복하지 마세요.
- 변경 없으면 해당 섹션에 "없음"이라고 명시.`
          : `당신은 소프트웨어 화면 설계서(SDD) 작성 전문가입니다.
아래 데이터를 분석하여 **화면 정보(screen-info)** 문서를 Markdown 형식으로 작성하세요.

## 입력 데이터

${specMetaSection}${xmlSection}

## 출력 형식

다음 구조의 Markdown 문서를 작성하세요:

# ${screenName || '화면'} 화면 정보

## 1. 기본 정보

| 항목 | 내용 |
|------|------|
| 화면 ID | (화면 ID) |
| 화면명 | (화면명) |
| 화면 유형 | 메인 화면 (M) 또는 팝업 (P) |
| 화면 패턴 | (CRUD_MAIN, SEARCH, POPUP 등 추정) |
| 경로 | (XML 파일 경로) |
| 설명 | (화면 설명) |

### 1.1 전역 상태

| 변수 | 초기값 | 역할 |
|------|--------|------|
(XML/JS에서 scwin.* 전역 변수를 추출하여 나열)

## 2. 목적 및 사용자 시나리오

### 2.1 화면 목적
(화면의 목적을 자연어로 서술)

### 2.2 사용자 시나리오
(화면의 UI 구조와 ${hasSpecMeta ? '설명' : '이미지'}을 기반으로 사용자 시나리오를 번호 목록으로 작성)

## 3. 기능 요구사항

| ID | 우선순위 | 요구사항 | 수용 기준 (EARS) | 구현 근거 | 상태 |
|----|---------|---------|-----------------|----------|------|
(REQ-001부터 순서대로 기능 요구사항을 정리. 각 요구사항마다:
- 우선순위: A(필수) 또는 B(선택)
- 수용 기준: WHEN/THEN/SHALL 형식의 EARS 패턴
- 구현 근거: 관련 핸들러 함수명
- 상태: [ ] 고정)

### 3.1 비기능 요구사항
(NOVA 표준 구조 준수, Native API 사용 금지 등)

### 3.2 금지 규칙
(Native API, 원본 WRM API 사용 금지 등)

### 3.3 제외 범위
(서버 측 API 로직 변경, 다국어, 권한, 배치 연계 등)

## 4. 컴포넌트 목록
(XML에서 추출한 컴포넌트 목록을 테이블로 정리)
| No | 요소명 | 컴포넌트 타입 | 설명 |
|----|-------|-------------|------|

## 5. TODO (추가 확인/구현 필요)
(이 화면 단독으로는 정의하기 어려운 항목을 TODO 체크리스트로 작성. 예시:)
- [ ] 팝업 연결: 어떤 버튼 클릭 시 어떤 팝업이 호출되는지 (팝업 화면 ID, 전달 파라미터)
- [ ] 화면 전환: 특정 동작 후 이동하는 화면 경로 및 조건
- [ ] 외부 API 연동: 조회/저장 시 호출할 서비스 API 엔드포인트, 파라미터
- [ ] 권한/인증: 화면 접근 권한, 버튼별 권한 제어
- [ ] 데이터 바인딩: 서버 데이터 모델과 UI 컴포넌트 매핑 (DataCollection 등)
- [ ] 유효성 검증: 입력값 검증 규칙, 에러 메시지
- [ ] 기타 비즈니스 로직: 화면 내에서 파악 불가능한 업무 규칙
(위 예시 중 해당 화면에 관련 있는 항목만 선별하여 구체적으로 작성. 해당 없으면 "없음")

${analysisGuide}`;
      } else if (effectiveSpecType === 'test-plan') {
        maxTokens = 8192;
        prompt = hasPrior
          ? `당신은 소프트웨어 생성물 검증 전문가입니다.
이 문서는 **검증 계획서(test-plan)** 문서입니다.

${priorSection}

## 이번 버전 입력 데이터

${specMetaSection}${xmlSection}

## 출력 형식

이번 버전에서 **변경된/추가된/삭제된** 검증 항목만 간결한 Markdown으로 작성하세요.
이전 스펙에 이미 있는 검증 항목은 반복하지 마세요.
Markdown만 출력 (다른 설명 없이)`
          : `당신은 소프트웨어 생성물 검증 전문가입니다.
아래 데이터를 분석하여 **검증 계획서(test-plan)** 를 Markdown 형식으로 작성하세요.

## 입력 데이터

${specMetaSection}${xmlSection}

## 출력 형식

다음 구조의 Markdown 문서를 작성하세요:

# ${screenName || '화면'} 검증 계획

## 문서 상태

| 항목 | 값 |
|------|-----|
| 문서 유형 | 생성물 검증 계획서 |
| 기준 화면 | (화면 ID + 화면명) |
| 기준 파일 | (XML 파일명) |
| 화면 패턴 | (CRUD_MAIN 등) |

## 1. 목적

이 문서는 ${screenName || '화면'}의 설계 기준 준수 여부를 검증하기 위한 생성물 체크리스트이다.

## 2. 검증 항목

### 2.1 화면 구조

| ID | 검증 항목 | 기대 결과 | 관련 REQ |
|----|----------|----------|----------|
(V-01부터. 최상위 레이아웃 class, 버튼 개수 및 ID 목록 등)

### 2.2 GridView

| ID | 검증 항목 | 기대 결과 | 관련 REQ |
|----|----------|----------|----------|
(각 GridView별: 컬럼 개수 검증, dataList 바인딩 검증)

### 2.3 데이터 바인딩

| ID | 검증 항목 | 기대 결과 | 관련 REQ |
|----|----------|----------|----------|
(정적 submission 없음, 동적 서비스 호출 건수, DataCollection 개수)

### 2.4 업무 로직

| ID | 검증 항목 | 기대 결과 | 관련 REQ |
|----|----------|----------|----------|
(초기화, 조회, 저장, 행추가, 삭제, 셀클릭, 팝업, 엑셀, 콜백 등)

### 2.x 유효성 검증

| ID | 검증 항목 | 기대 결과 | 관련 REQ |
|----|----------|----------|----------|
(필수값 미입력 시 저장 차단 검증 - 각 필수 필드별)

### 2.5 안정성 (금지 검증)

| ID | 검증 항목 | 기대 결과 | 관련 REQ |
|----|----------|----------|----------|
(Native API 미사용, 원본 WRM API 미사용, 설계서에 없는 이벤트 핸들러/컬럼 미추가, 정적 submission 금지)

### 2.6 메시지

| ID | 검증 항목 | 기대 결과 | 관련 REQ |
|----|----------|----------|----------|
(사용되는 메시지 코드별 검증, 어느 핸들러에서 호출되는지)

### 2.6.5 핸들러별 검증

| ID | 검증 항목 | 기대 결과 | 관련 REQ |
|----|----------|----------|----------|
(각 핸들러 함수가 정상 실행되는지, 서비스 호출이 있으면 요청/응답 검증, 메시지 표시 검증)

## 3. 판정 기준

### 통과 기준
- 검증 항목 전체 통과
- 안정성(§2.5) 금지 항목 위반 0건
- 콘솔 오류와 치명적 경고 없음

### 조건부 통과 기준
- 안정성 항목 통과
- 업무 로직 항목에서 경미한 이슈만 존재

### 실패 기준
- 안정성 항목 1건 이상 위반
- 원본 WRM API 잔존

## 4. 실행 후 기록 위치

- 검증 결과 표: check-result.md
- API 캡처: evidence/api/
- 화면 캡처: evidence/capture/

규칙:
- 한국어로 작성
- XML 구조에서 컴포넌트, 핸들러, DataCollection, submission 등을 정확히 추출
- 검증 항목 ID는 V-01부터 순차 부여
- 관련 REQ가 있으면 REQ-xxx 형식으로 기재, 없으면 "-"
- Markdown만 출력 (다른 설명 없이)`;
      } else if (effectiveSpecType === 'interface-metadata') {
        maxTokens = 8192;
        prompt = hasPrior
          ? `당신은 소프트웨어 화면 인터페이스 분석 전문가입니다.
이 문서는 **인터페이스 메타데이터(interface-metadata)** JSON 문서입니다.

${priorSection}

## 이번 버전 입력 데이터

${specMetaSection}${xmlSection}

## 출력 형식

이번 버전의 전체 인터페이스 메타데이터를 JSON으로 출력하세요 (이전 버전과의 변경사항이 반영된 최신 상태).
JSON만 출력 (다른 설명이나 마크다운 코드블록 없이 순수 JSON만)`
          : `당신은 소프트웨어 화면 인터페이스 분석 전문가입니다.
아래 데이터를 분석하여 **인터페이스 메타데이터(interface-metadata)** 를 JSON 형식으로 작성하세요.

## 입력 데이터

${specMetaSection}${xmlSection}

## 출력 형식

다음 구조의 JSON을 작성하세요 (순수 JSON만 출력, 마크다운 코드블록이나 다른 설명 없이):

{
  "screenId": "(화면 ID)",
  "screenName": "(화면명)",
  "collections": [
    {
      "id": "(DataCollection ID, 예: dlt_INPUT)",
      "type": "dataList | dataMap",
      "fields": [
        {
          "name": "(필드명)",
          "type": "string | number | date",
          "required": true/false,
          "description": "(필드 설명)"
        }
      ],
      "initialData": [ ... ] // 초기 데이터가 있는 경우만 포함
    }
  ],
  "submissions": [
    {
      "id": "(submission ID)",
      "action": "(URL 또는 서비스명)",
      "ref": "(관련 DataCollection ID)",
      "target": "(결과 DataCollection ID)"
    }
  ],
  "gridViews": [
    {
      "id": "(GridView ID)",
      "dataList": "(바인딩된 DataCollection ID)",
      "autoFit": "allColumn | none",
      "rowStatusVisible": true/false,
      "columns": [
        {
          "order": 1,
          "headerId": "(헤더 ID)",
          "headerValue": "(헤더 표시 텍스트)",
          "columnId": "(컬럼 ID)",
          "headerInputType": "text | checkbox",
          "bodyInputType": "text | checkbox | select | textImage 등"
        }
      ]
    }
  ],
  "popups": [
    {
      "id": "(팝업 식별자)",
      "url": "(팝업 URL 또는 화면 ID)",
      "type": "팝업호출 | 팝업수신 | LOV",
      "caller": "(호출하는 핸들러 함수명)",
      "params": ["(전달 파라미터 목록)"]
    }
  ]
}

규칙:
- XML 구조에서 w2:dataCollection, w2:submission, w2:gridView 등을 정확히 추출
- DataCollection의 필드는 XML의 w2:column 정의에서 추출
- GridView 컬럼은 순서(order) 포함하여 정확히 기재
- 팝업은 JS 코드에서 nova.popup 또는 유사 호출 패턴을 분석하여 추출
- 초기 데이터(initialData)가 XML에 정의되어 있으면 포함
- 순수 JSON만 출력 (마크다운 코드블록, 설명 텍스트 없이)`;
      }

      try {
        // 이미지가 있으면 base64 변환 (data URL 또는 HTTP URL)
        let imageBase64: string | null = null
        let imageMediaType = 'image/png'
        if (imageUrl) {
          try {
            const imgUrlStr = imageUrl as string
            const dataMatch = imgUrlStr.match(/^data:image\/(\w+);base64,(.+)$/)
            if (dataMatch) {
              imageMediaType = `image/${dataMatch[1]}`
              imageBase64 = dataMatch[2]
            } else {
              const imgRes = await fetch(imgUrlStr)
              if (imgRes.ok) {
                const imgBuf = Buffer.from(await imgRes.arrayBuffer())
                imageBase64 = imgBuf.toString('base64')
              }
            }
          } catch { /* ignore */ }
        }

        // Claude 메시지 구성 (이미지 포함 여부에 따라)
        const messageContent: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = []
        if (imageBase64) {
          messageContent.push({
            type: 'image',
            source: { type: 'base64', media_type: imageMediaType, data: imageBase64 },
          })
          messageContent.push({ type: 'text', text: '위 이미지는 화면 설계서(SDD) 캡쳐입니다. 이 이미지와 아래 데이터를 함께 분석하세요.\n\n' + prompt })
        } else {
          messageContent.push({ type: 'text', text: prompt })
        }

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: messageContent }],
          }),
        });

        if (!claudeRes.ok) {
          const err = await claudeRes.text();
          console.error('[Spec] Claude API error:', err);
          return json(res, { error: `Claude API error: ${claudeRes.status}` }, 500);
        }

        const claudeData = await claudeRes.json() as { content: Array<{ type: string; text: string }> };
        const resultText = claudeData.content?.find(c => c.type === 'text')?.text || '';

        // interface-metadata는 JSON으로 반환, 나머지는 markdown으로 반환
        if (effectiveSpecType === 'interface-metadata') {
          return json(res, { content: resultText, specType: effectiveSpecType });
        }
        return json(res, { markdown: resultText, specType: effectiveSpecType });
      } catch (err) {
        console.error('[Spec] Claude API call failed:', err);
        return json(res, { error: String(err) }, 500);
      }
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
