// ============================================================
// Backend API Client
// ============================================================

const API_BASE = 'http://localhost:5181/api';

export interface RegistryItem {
  id: string;
  name: string;
  tagName: string;
  properties: Record<string, string>;
}

export interface NodeMapping {
  id: string;
  figmaFileKey: string;
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

// ---- Registry API ----

export async function fetchRegistry(): Promise<RegistryItem[]> {
  const res = await fetch(`${API_BASE}/registry`);
  if (!res.ok) throw new Error('Failed to fetch registry');
  return res.json();
}

export async function fetchRegistryItem(id: string): Promise<RegistryItem | null> {
  const res = await fetch(`${API_BASE}/registry/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch registry item');
  return res.json();
}

export async function createRegistryItem(data: { name: string; tagName: string; properties?: Record<string, string> }): Promise<RegistryItem> {
  const res = await fetch(`${API_BASE}/registry`, {
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
  const res = await fetch(`${API_BASE}/registry/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update registry item');
  return res.json();
}

export async function deleteRegistryItem(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/registry/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete registry item');
}

// ---- Mapping API ----

export async function fetchMappings(fileKey: string): Promise<NodeMapping[]> {
  const res = await fetch(`${API_BASE}/mappings?fileKey=${encodeURIComponent(fileKey)}`);
  if (!res.ok) throw new Error('Failed to fetch mappings');
  return res.json();
}

export async function fetchMapping(fileKey: string, nodeId: string): Promise<NodeMapping | null> {
  const res = await fetch(`${API_BASE}/mappings/${encodeURIComponent(fileKey)}/${encodeURIComponent(nodeId)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch mapping');
  return res.json();
}

export async function saveMapping(mapping: Omit<NodeMapping, 'id' | 'createdAt' | 'updatedAt'>): Promise<NodeMapping> {
  const res = await fetch(`${API_BASE}/mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mapping),
  });
  if (!res.ok) throw new Error('Failed to save mapping');
  return res.json();
}

export async function deleteMapping(fileKey: string, nodeId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/mappings/${encodeURIComponent(fileKey)}/${encodeURIComponent(nodeId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete mapping');
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
}

export async function fetchFigmaFiles(): Promise<FigmaFileRecord[]> {
  const res = await fetch(`${API_BASE}/figma-files`);
  if (!res.ok) throw new Error('Failed to fetch figma files');
  return res.json();
}

export async function saveFigmaFile(
  fileKey: string,
  nodeId: string | null,
  name: string,
  thumbnailUrl?: string
): Promise<FigmaFileRecord> {
  const res = await fetch(`${API_BASE}/figma-files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileKey, nodeId, name, thumbnailUrl }),
  });
  if (!res.ok) throw new Error('Failed to save figma file');
  return res.json();
}

export async function deleteFigmaFile(fileKey: string, nodeId: string | null): Promise<void> {
  const params = new URLSearchParams({ fileKey });
  if (nodeId) params.append('nodeId', nodeId);

  const res = await fetch(`${API_BASE}/figma-files?${params}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete figma file');
}

export async function touchFigmaFile(fileKey: string, nodeId: string | null): Promise<void> {
  const res = await fetch(`${API_BASE}/figma-files/touch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileKey, nodeId }),
  });
  if (!res.ok) throw new Error('Failed to touch figma file');
}

export async function updateFigmaFileCompleted(fileKey: string, nodeId: string | null, completed: boolean): Promise<void> {
  const res = await fetch(`${API_BASE}/figma-files/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileKey, nodeId, completed }),
  });
  if (!res.ok) throw new Error('Failed to update figma file completion status');
}

// ---- Figma File Data API (수정된 파일 구조 저장) ----

export interface FigmaFileDataRecord {
  fileKey: string;
  nodeId: string | null;
  data: object;
  updatedAt: string;
}

export async function fetchFigmaFileData(fileKey: string, nodeId: string | null): Promise<FigmaFileDataRecord | null> {
  const params = new URLSearchParams({ fileKey });
  if (nodeId) params.append('nodeId', nodeId);

  const res = await fetch(`${API_BASE}/figma-file-data?${params}`);
  if (!res.ok) throw new Error('Failed to fetch figma file data');
  return res.json();
}

export async function saveFigmaFileData(fileKey: string, nodeId: string | null, data: object): Promise<void> {
  const res = await fetch(`${API_BASE}/figma-file-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileKey, nodeId, data }),
  });
  if (!res.ok) throw new Error('Failed to save figma file data');
}

export async function deleteFigmaFileData(fileKey: string, nodeId: string | null): Promise<void> {
  const params = new URLSearchParams({ fileKey });
  if (nodeId) params.append('nodeId', nodeId);

  const res = await fetch(`${API_BASE}/figma-file-data?${params}`, {
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
  children?: FigmaNodeForSignature[];
}

export async function fetchClusters(): Promise<MappingCluster[]> {
  const res = await fetch(`${API_BASE}/clusters`);
  if (!res.ok) throw new Error('Failed to fetch clusters');
  return res.json();
}

export async function generateClusters(fileKey?: string, nodeId?: string | null): Promise<{ success: boolean; createdCount: number }> {
  const res = await fetch(`${API_BASE}/clusters/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileKey, nodeId }),
  });
  if (!res.ok) throw new Error('Failed to generate clusters');
  return res.json();
}

export async function fetchAutoMappingSuggestions(
  nodes: FigmaNodeForSignature[],
  existingMappingNodeIds: string[] = []
): Promise<AutoMappingSuggestion[]> {
  const res = await fetch(`${API_BASE}/clusters/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes, existingMappingNodeIds }),
  });
  if (!res.ok) throw new Error('Failed to fetch auto mapping suggestions');
  const data = await res.json();
  return data.suggestions;
}

export async function fetchDefaultRuleSuggestions(
  nodes: FigmaNodeForSignature[]
): Promise<AutoMappingSuggestion[]> {
  const res = await fetch(`${API_BASE}/default-mapping-rules/suggest`, {
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
  suggestions: Array<{
    nodeId: string;
    nodeName: string;
    nodeType: string;
    registryId: string;
    registryName: string;
    customAttrs: Record<string, string>;
  }>
): Promise<{ success: boolean; appliedCount: number }> {
  const res = await fetch(`${API_BASE}/clusters/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileKey, suggestions }),
  });
  if (!res.ok) throw new Error('Failed to apply auto mapping suggestions');
  return res.json();
}

// ---- Mapping Rules Export / Import ----

export interface MappingRulesJson {
  version: number;
  exportedAt: string;
  defaultMappingRules: Array<{ registryName: string; keyword: string }>;
  customMappingRules: Array<{ signature: string; registryName: string; customAttrs: Record<string, string>; sampleCount: number }>;
}

export async function exportMappingRules(): Promise<MappingRulesJson> {
  const res = await fetch(`${API_BASE}/mapping-rules/export`);
  if (!res.ok) throw new Error('Failed to export mapping rules');
  return res.json();
}

export async function importMappingRules(data: MappingRulesJson): Promise<{ defaultAdded: number; clusterUpdated: number }> {
  const res = await fetch(`${API_BASE}/mapping-rules/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to import mapping rules');
  return res.json();
}

// ---- XML Export API ----

export async function exportXml(
  xml: string,
  filename: string,
  exportPath: string
): Promise<{ success: boolean; path: string }> {
  const res = await fetch(`${API_BASE}/export-xml`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xml, filename, exportPath }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to export XML');
  }
  return res.json();
}
