// ============================================================
// Backend API Client
// ============================================================

import { getApiBaseUrl } from '../config';

// API_BASE는 config.json에서 런타임에 로드됩니다
// 앱 시작 시 loadConfig()가 먼저 호출되어야 합니다
const getApiBase = () => getApiBaseUrl();

export interface RegistryItem {
  id: string;
  projectId?: string;
  name: string;
  tagName: string;
  properties: Record<string, string>;
}

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

// ---- Registry API (프로젝트별) ----

export async function fetchRegistry(projectId: string): Promise<RegistryItem[]> {
  const res = await fetch(`${getApiBase()}/projects/${projectId}/registry`);
  if (!res.ok) throw new Error('Failed to fetch registry');
  return res.json();
}

export async function fetchRegistryItem(id: string): Promise<RegistryItem | null> {
  const res = await fetch(`${getApiBase()}/registry/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch registry item');
  return res.json();
}

export async function createRegistryItem(projectId: string, data: { name: string; tagName: string; properties?: Record<string, string> }): Promise<RegistryItem> {
  const res = await fetch(`${getApiBase()}/projects/${projectId}/registry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create registry item');
  }
  return res.json();
}

export async function updateRegistryItem(id: string, data: { name?: string; tagName?: string; properties?: Record<string, string> }): Promise<RegistryItem> {
  const res = await fetch(`${getApiBase()}/registry/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update registry item');
  return res.json();
}

export async function deleteRegistryItem(id: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/registry/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete registry item');
}

// ---- Mapping API (프로젝트별) ----

export async function fetchMappings(projectId: string, fileKey: string, rootNodeId?: string | null): Promise<NodeMapping[]> {
  let url = `${getApiBase()}/mappings?projectId=${encodeURIComponent(projectId)}&fileKey=${encodeURIComponent(fileKey)}`;
  if (rootNodeId) url += `&rootNodeId=${encodeURIComponent(rootNodeId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch mappings');
  return res.json();
}

export async function fetchMapping(projectId: string, fileKey: string, nodeId: string, rootNodeId?: string | null): Promise<NodeMapping | null> {
  let url = `${getApiBase()}/mappings/${encodeURIComponent(fileKey)}/${encodeURIComponent(nodeId)}?projectId=${encodeURIComponent(projectId)}`;
  if (rootNodeId) url += `&rootNodeId=${encodeURIComponent(rootNodeId)}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch mapping');
  return res.json();
}

export async function saveMapping(mapping: Omit<NodeMapping, 'id' | 'createdAt' | 'updatedAt'>): Promise<NodeMapping> {
  const res = await fetch(`${getApiBase()}/mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mapping),
  });
  if (!res.ok) throw new Error('Failed to save mapping');
  return res.json();
}

export async function deleteMapping(projectId: string, fileKey: string, nodeId: string, rootNodeId?: string | null): Promise<void> {
  let url = `${getApiBase()}/mappings/${encodeURIComponent(fileKey)}/${encodeURIComponent(nodeId)}?projectId=${encodeURIComponent(projectId)}`;
  if (rootNodeId) url += `&rootNodeId=${encodeURIComponent(rootNodeId)}`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete mapping');
}

export async function clearAllMappings(projectId: string, fileKey: string, rootNodeId?: string | null): Promise<{ success: boolean; count: number }> {
  const res = await fetch(`${getApiBase()}/mappings/clear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, fileKey, rootNodeId }),
  });
  if (!res.ok) throw new Error('Failed to clear mappings');
  return res.json();
}

export interface UniqueClusterCheck {
  isUnique: boolean
  signature?: string
  mode?: 'full' | 'base'
  affectedCount?: number
  cluster?: { registryId: string; registryName: string; registryTag?: string; customAttrs: Record<string, string> }
}

export async function checkUniqueCluster(
  projectId: string,
  node: FigmaNodeForSignature,
  parent: FigmaNodeForSignature | null
): Promise<UniqueClusterCheck> {
  const res = await fetch(`${getApiBase()}/clusters/check-unique`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, node, parent }),
  });
  if (!res.ok) return { isUnique: false };
  return res.json();
}

export async function applyMappingBySignature(
  projectId: string,
  signature: string,
  mode: 'full' | 'base',
  mapping: { registryId: string; registryName: string; registryTag?: string; customAttrs: Record<string, string> }
): Promise<{ success: boolean; appliedCount: number }> {
  const res = await fetch(`${getApiBase()}/mappings/apply-by-signature`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, signature, mode, mapping }),
  });
  if (!res.ok) throw new Error('Failed to apply mapping by signature');
  return res.json();
}

export interface RecommendedClass {
  className: string;
  frequency: number;
  total: number;
}

export async function getRecommendedClasses(
  projectId: string,
  node: FigmaNodeForSignature,
  parent: FigmaNodeForSignature | null
): Promise<{ commonClasses: string[]; recommendedClasses: RecommendedClass[] }> {
  const res = await fetch(`${getApiBase()}/clusters/recommended-classes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, node, parent }),
  });
  if (!res.ok) throw new Error('Failed to get recommended classes');
  return res.json();
}

// ---- Figma Files API ----

export interface FigmaFileRecord {
  id: string;
  fileKey: string;
  nodeId: string | null;
  name: string;
  thumbnailUrl: string | null;
  lastOpenedAt: string;
  createdAt: string;
  completed: boolean;
  version: string;
  xmlFilename: string | null;
  projectId: string | null;
}

// ---- Project API ----

export interface Project {
  id: string;
  name: string;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${getApiBase()}/projects`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function fetchProject(id: string): Promise<Project | null> {
  const res = await fetch(`${getApiBase()}/projects/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch project');
  return res.json();
}

export async function createProject(name: string): Promise<Project> {
  const res = await fetch(`${getApiBase()}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create project');
  }
  return res.json();
}

export async function updateProject(id: string, name: string): Promise<Project> {
  const res = await fetch(`${getApiBase()}/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update project');
  }
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/projects/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete project');
}

export async function fetchProjectFiles(projectId: string): Promise<FigmaFileRecord[]> {
  const res = await fetch(`${getApiBase()}/projects/${projectId}/files`);
  if (!res.ok) throw new Error('Failed to fetch project files');
  return res.json();
}

// ---- Settings API ----

export async function fetchProjectSettings(projectId: string): Promise<Record<string, string>> {
  const res = await fetch(`${getApiBase()}/projects/${projectId}/settings`);
  if (!res.ok) throw new Error('Failed to fetch project settings');
  return res.json();
}

export async function saveProjectSettings(projectId: string, settings: Record<string, string>): Promise<void> {
  const res = await fetch(`${getApiBase()}/projects/${projectId}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  });
  if (!res.ok) throw new Error('Failed to save project settings');
}

export async function fetchFigmaFiles(): Promise<FigmaFileRecord[]> {
  const res = await fetch(`${getApiBase()}/figma-files`);
  if (!res.ok) throw new Error('Failed to fetch figma files');
  return res.json();
}

export async function saveFigmaFile(
  fileKey: string,
  nodeId: string | null,
  name: string,
  thumbnailUrl: string | undefined,
  projectId: string
): Promise<FigmaFileRecord> {
  const res = await fetch(`${getApiBase()}/figma-files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileKey, nodeId, name, thumbnailUrl, projectId }),
  });
  if (!res.ok) throw new Error('Failed to save figma file');
  return res.json();
}

export async function deleteFigmaFile(projectId: string, fileKey: string, nodeId: string | null): Promise<void> {
  const params = new URLSearchParams({ projectId, fileKey });
  if (nodeId) params.append('nodeId', nodeId);

  const res = await fetch(`${getApiBase()}/figma-files?${params}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete figma file');
}

export async function touchFigmaFile(projectId: string, fileKey: string, nodeId: string | null): Promise<void> {
  const res = await fetch(`${getApiBase()}/figma-files/touch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, fileKey, nodeId }),
  });
  if (!res.ok) throw new Error('Failed to touch figma file');
}

export async function updateFigmaFileCompleted(projectId: string, fileKey: string, nodeId: string | null, completed: boolean): Promise<void> {
  const res = await fetch(`${getApiBase()}/figma-files/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, fileKey, nodeId, completed }),
  });
  if (!res.ok) throw new Error('Failed to update figma file completion status');
}

export async function refreshFigmaFile(projectId: string, fileKey: string, nodeId: string | null, data: object): Promise<{ hasChanges: boolean; deletedMappingsCount: number; newNodeIds: string[] }> {
  const res = await fetch(`${getApiBase()}/figma-files/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, fileKey, nodeId, data }),
  });
  if (!res.ok) throw new Error('Failed to refresh figma file');
  return res.json();
}

// 저장된 XML 파일명 조회 (최초 저장 여부 판단용)
export async function getFigmaFileXmlFilename(projectId: string, fileKey: string, nodeId: string | null): Promise<string | null> {
  const params = new URLSearchParams({ projectId, fileKey });
  if (nodeId) params.append('nodeId', nodeId);
  const res = await fetch(`${getApiBase()}/figma-files/xml-filename?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.xmlFilename || null;
}

// 최초 저장 후 파일명 저장
export async function setFigmaFileXmlFilename(projectId: string, fileKey: string, nodeId: string | null, xmlFilename: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/figma-files/xml-filename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, fileKey, nodeId, xmlFilename }),
  });
  if (!res.ok) throw new Error('Failed to save xml filename');
}

// 버전 증가 (refresh 시 사용자 컨펌 후 호출)
export async function bumpFigmaFileVersion(projectId: string, fileKey: string, nodeId: string | null): Promise<{ version: string }> {
  const res = await fetch(`${getApiBase()}/figma-files/bump-version`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, fileKey, nodeId }),
  });
  if (!res.ok) throw new Error('Failed to bump figma file version');
  return res.json();
}

// 서버에 이미지 다운로드 + 로컬 저장 요청 (Figma presigned URL 전달)
// suffix: 파일명 뒤에 붙는 접미사 (예: 'spec' → _spec.svg)
export async function saveFigmaFileImage(projectId: string, fileKey: string, nodeId: string | null, imageUrl: string, suffix?: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/figma-files/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, fileKey, nodeId, imageUrl, suffix }),
  });
  if (!res.ok) throw new Error('Failed to save figma file image');
}

// 저장된 이미지 삭제
export async function deleteFigmaFileImage(projectId: string, fileKey: string, nodeId: string | null, suffix?: string): Promise<void> {
  const params = new URLSearchParams({ projectId, fileKey });
  if (nodeId) params.append('nodeId', nodeId);
  if (suffix) params.append('suffix', suffix);
  const res = await fetch(`${getApiBase()}/figma-files/image?${params}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete figma file image');
}

// 저장된 이미지 URL (서버 endpoint)
export function getFigmaFileImageUrl(projectId: string, fileKey: string, nodeId: string | null, suffix?: string): string {
  const params = new URLSearchParams({ projectId, fileKey });
  if (nodeId) params.append('nodeId', nodeId);
  if (suffix) params.append('suffix', suffix);
  // cache buster 필요하면 호출 쪽에서 &t=... 붙이기
  return `${getApiBase()}/figma-files/image?${params}`;
}

// ---- Figma File Data API (수정된 파일 구조 저장) ----

export interface FigmaFileDataRecord {
  fileKey: string;
  nodeId: string | null;
  data: object;
  updatedAt: string;
}

export async function fetchFigmaFileData(projectId: string, fileKey: string, nodeId: string | null): Promise<FigmaFileDataRecord | null> {
  const params = new URLSearchParams({ projectId, fileKey });
  if (nodeId) params.append('nodeId', nodeId);

  const res = await fetch(`${getApiBase()}/figma-file-data?${params}`);
  if (!res.ok) throw new Error('Failed to fetch figma file data');
  return res.json();
}

export async function saveFigmaFileData(projectId: string, fileKey: string, nodeId: string | null, data: object): Promise<void> {
  const res = await fetch(`${getApiBase()}/figma-file-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, fileKey, nodeId, data }),
  });
  if (!res.ok) throw new Error('Failed to save figma file data');
}

export async function deleteFigmaFileData(projectId: string, fileKey: string, nodeId: string | null): Promise<void> {
  const params = new URLSearchParams({ projectId, fileKey });
  if (nodeId) params.append('nodeId', nodeId);

  const res = await fetch(`${getApiBase()}/figma-file-data?${params}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete figma file data');
}

// ---- Cluster API (자동 매핑) ----

export interface MappingCluster {
  id: string;
  signature: string;
  signatureData: object;
  registryId: string;
  registryName: string;
  customAttrs: Record<string, string>;
  sampleCount: number;
  createdAt: string;
  updatedAt: string;
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
  source?: 'cluster' | 'default';
  matchedKeyword?: string;
}

export interface FigmaNodeForSignature {
  id: string;
  name: string;
  type: string;
  componentProperties?: Record<string, { value: string; type: string }>;
  children?: FigmaNodeForSignature[];
}

export async function fetchClusters(projectId?: string): Promise<MappingCluster[]> {
  const url = projectId ? `${getApiBase()}/clusters?projectId=${projectId}` : `${getApiBase()}/clusters`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch clusters');
  return res.json();
}

export async function generateClusters(projectId: string): Promise<{ success: boolean; createdCount: number }> {
  const res = await fetch(`${getApiBase()}/clusters/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  });
  if (!res.ok) throw new Error('Failed to generate clusters');
  return res.json();
}

export async function fetchAutoMappingSuggestions(
  nodes: FigmaNodeForSignature[],
  existingMappingNodeIds: string[] = [],
  projectId: string
): Promise<AutoMappingSuggestion[]> {
  const res = await fetch(`${getApiBase()}/clusters/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes, existingMappingNodeIds, projectId }),
  });
  if (!res.ok) throw new Error('Failed to fetch auto mapping suggestions');
  const data = await res.json();
  return data.suggestions;
}

export async function fetchDefaultRuleSuggestions(
  projectId: string,
  nodes: FigmaNodeForSignature[]
): Promise<AutoMappingSuggestion[]> {
  const res = await fetch(`${getApiBase()}/projects/${projectId}/default-mapping-rules/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes }),
  });
  if (!res.ok) throw new Error('Failed to fetch default rule suggestions');
  const data = await res.json();
  return data.suggestions.map((s: AutoMappingSuggestion) => ({ ...s, source: 'default' as const }));
}

export async function applyAutoMappingSuggestions(
  fileKey: string,
  projectId: string,
  suggestions: Array<{
    nodeId: string;
    nodeName: string;
    nodeType: string;
    registryId: string;
    registryName: string;
    customAttrs: Record<string, string>;
  }>,
  rootNodeId?: string | null
): Promise<{ success: boolean; appliedCount: number }> {
  const res = await fetch(`${getApiBase()}/clusters/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileKey, rootNodeId, projectId, suggestions }),
  });
  if (!res.ok) throw new Error('Failed to apply auto mapping suggestions');
  return res.json();
}

// ---- Mapping Rules Export / Import (프로젝트별) ----

export interface MappingRulesJson {
  version: number;
  exportedAt: string;
  projectId?: string;
  defaultMappingRules: Array<{ registryName: string; keyword: string }>;
  customMappingRules: Array<{ signature: string; registryName: string; customAttrs: Record<string, string>; sampleCount: number }>;
  // v2: CSS 정보 추가
  cssList?: Array<{ id: string; name: string; content: string; classNames: string[] }>;
  componentClassMapping?: Record<string, Record<string, string[]>>;
}

export async function exportMappingRules(projectId: string): Promise<MappingRulesJson> {
  const res = await fetch(`${getApiBase()}/projects/${projectId}/mapping-rules/export`);
  if (!res.ok) throw new Error('Failed to export mapping rules');
  return res.json();
}

export async function importMappingRules(projectId: string, data: MappingRulesJson): Promise<{ defaultAdded: number; clusterUpdated: number }> {
  const res = await fetch(`${getApiBase()}/projects/${projectId}/mapping-rules/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to import mapping rules');
  return res.json();
}

// ---- Default Mapping Rules CRUD (프로젝트별) ----

export interface DefaultMappingRule {
  id: string;
  projectId?: string;
  registryId: string;
  keyword: string;
  createdAt: string;
}

export interface DefaultMappingRuleGrouped {
  registryId: string;
  registryName: string;
  keywords: string[];
  rules: Array<{ id: string; keyword: string }>;
}

export async function fetchDefaultMappingRules(projectId: string): Promise<DefaultMappingRule[]> {
  const res = await fetch(`${getApiBase()}/projects/${projectId}/default-mapping-rules`);
  if (!res.ok) throw new Error('Failed to fetch default mapping rules');
  return res.json();
}

export async function fetchDefaultMappingRulesGrouped(projectId: string): Promise<DefaultMappingRuleGrouped[]> {
  const res = await fetch(`${getApiBase()}/projects/${projectId}/default-mapping-rules?grouped=true`);
  if (!res.ok) throw new Error('Failed to fetch default mapping rules');
  return res.json();
}

export async function createDefaultMappingRule(projectId: string, data: { registryId: string; keyword: string }): Promise<DefaultMappingRule> {
  const res = await fetch(`${getApiBase()}/projects/${projectId}/default-mapping-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create default mapping rule');
  }
  return res.json();
}

export async function deleteDefaultMappingRule(id: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/default-mapping-rules/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete default mapping rule');
}

export async function resetDefaultMappingRules(projectId: string): Promise<{ count: number }> {
  const res = await fetch(`${getApiBase()}/projects/${projectId}/default-mapping-rules/reset`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset default mapping rules');
  return res.json();
}

// ---- XML Export API ----

export async function exportXml(
  xml: string,
  filename: string,
  exportPath: string,
  version: string
): Promise<{ success: boolean; path: string }> {
  const res = await fetch(`${getApiBase()}/export-xml`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xml, filename, exportPath, version }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to export XML');
  }
  return res.json();
}

// Spec 마크다운을 XML과 동일 경로의 현재 버전 폴더에 _spec.md로 저장
export async function exportSpec(
  content: string,
  folderName: string,
  version: string,
  exportPath: string,
  fileName?: string
): Promise<{ success: boolean; path: string }> {
  const res = await fetch(`${getApiBase()}/export-spec`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markdown: content, folderName, version, exportPath, fileName }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to export spec');
  }
  return res.json();
}

// 노드 SVG 가져오기 (서버 경유)
export async function fetchNodeSvgs(projectId: string, fileKey: string, nodeIds: string[], figmaToken?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (figmaToken) headers['x-figma-token'] = figmaToken;
  const res = await fetch(`${getApiBase()}/node-svgs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ projectId, fileKey, nodeIds }),
  });
  if (!res.ok) throw new Error('Failed to fetch node SVGs');
  const data = await res.json();
  return data.svgs || {};
}

// 스펙 자동 매핑 (Claude API 경유)
export async function autoMapSpec(textNodes: Array<{ nodeId: string; name: string; text: string }>, nodeTree?: object, imageUrl?: string): Promise<{ metaTagMap: Record<string, string>; markTargetMap: Record<string, string> }> {
  const res = await fetch(`${getApiBase()}/auto-map-spec`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ textNodes, nodeTree, imageUrl }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to auto-map spec');
  }
  return await res.json();
}

// 스펙 유형 타입
export type SpecType = 'screen-info' | 'test-plan' | 'interface-metadata';

// 스펙문서 생성 (Claude API 경유)
export async function generateSpec(
  specJson: object | null,
  convertedXml?: string,
  screenName?: string,
  imageUrl?: string,
  priorSpecs?: Array<{ version: string; content: string }>,
  specType?: SpecType
): Promise<string> {
  const res = await fetch(`${getApiBase()}/generate-spec`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ specJson, convertedXml, screenName, imageUrl, priorSpecs, specType }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate spec');
  }
  const data = await res.json();
  return data.markdown || data.content || '';
}

// 이전 버전 스펙 파일들 조회
export async function fetchPriorSpecs(
  exportPath: string,
  folderName: string,
  upToVersion: number,
  fileName?: string
): Promise<Array<{ version: string; content: string }>> {
  const params = new URLSearchParams({ exportPath, folderName, upToVersion: String(upToVersion) });
  if (fileName) params.set('fileName', fileName);
  const res = await fetch(`${getApiBase()}/export-spec/prior?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.priorSpecs || [];
}

// ---- 개인 설정 (VS Code settings.json 경유) ----

const _vscApi = () => (window as unknown as { __vscode?: { postMessage: (msg: unknown) => void } }).__vscode;

export async function getPersonalSettings(projectId: string): Promise<Record<string, string>> {
  const vsc = _vscApi();
  if (!vsc) return {};
  return new Promise((resolve) => {
    const requestId = `ps-get-${Date.now()}`;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'personalSettings' && e.data?.requestId === requestId) {
        window.removeEventListener('message', handler);
        resolve(e.data.settings || {});
      }
    };
    window.addEventListener('message', handler);
    setTimeout(() => { window.removeEventListener('message', handler); resolve({}); }, 5000);
    vsc.postMessage({ type: 'getPersonalSettings', requestId, projectId });
  });
}

export async function savePersonalSettings(projectId: string, settings: Record<string, string>): Promise<void> {
  const vsc = _vscApi();
  if (!vsc) return;
  return new Promise((resolve) => {
    const requestId = `ps-save-${Date.now()}`;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'personalSettingsSaved' && e.data?.requestId === requestId) {
        window.removeEventListener('message', handler);
        resolve();
      }
    };
    window.addEventListener('message', handler);
    setTimeout(() => { window.removeEventListener('message', handler); resolve(); }, 5000);
    vsc.postMessage({ type: 'savePersonalSettings', requestId, projectId, settings });
  });
}
