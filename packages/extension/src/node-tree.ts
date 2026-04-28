import * as vscode from 'vscode';
import * as http from 'http';

// ============================================================
// Types (Figma 노드 구조 최소)
// ============================================================
interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  children?: FigmaNode[];
}

const NODE_ICONS: Record<string, string> = {
  DOCUMENT: 'file',
  CANVAS: 'symbol-namespace',
  FRAME: 'symbol-class',
  GROUP: 'folder',
  COMPONENT: 'symbol-method',
  COMPONENT_SET: 'symbol-package',
  INSTANCE: 'references',
  TEXT: 'symbol-string',
  RECTANGLE: 'symbol-ruler',
  VECTOR: 'edit',
  BOOLEAN_OPERATION: 'merge',
  IMAGE: 'file-media',
};

// ============================================================
// TreeItem
// ============================================================
export class FigmaNodeTreeItem extends vscode.TreeItem {
  constructor(
    public readonly node: FigmaNode,
    public readonly isMapped: boolean,
  ) {
    super(
      node.name,
      node.children && node.children.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );
    this.contextValue = 'figmaNode';
    this.tooltip = `${node.type} — ${node.id}`;

    const iconName = NODE_ICONS[node.type] || 'circle-outline';
    this.iconPath = new vscode.ThemeIcon(iconName, isMapped ? new vscode.ThemeColor('charts.green') : undefined);

    if (node.visible === false) {
      this.description = '(hidden)';
    }

    this.command = {
      command: 'aicraftFigma.selectNode',
      title: 'Select Node',
      arguments: [node.id],
    };
  }
}

// ============================================================
// TreeDataProvider
// ============================================================
export class NodeTreeProvider implements vscode.TreeDataProvider<FigmaNodeTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<FigmaNodeTreeItem | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private rootNode: FigmaNode | null = null;
  private mappedNodeIds = new Set<string>();

  setData(rootNode: FigmaNode | null, mappedNodeIds?: string[]): void {
    this.rootNode = rootNode;
    this.mappedNodeIds = new Set(mappedNodeIds || []);
    this._onDidChangeTreeData.fire(undefined);
  }

  clear(): void {
    this.rootNode = null;
    this.mappedNodeIds.clear();
    this._onDidChangeTreeData.fire(undefined);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  updateMappedIds(ids: string[]): void {
    this.mappedNodeIds = new Set(ids);
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: FigmaNodeTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FigmaNodeTreeItem): FigmaNodeTreeItem[] {
    if (!element) {
      if (!this.rootNode) return [];
      if (this.rootNode.visible === false) return [];
      return [new FigmaNodeTreeItem(this.rootNode, this.mappedNodeIds.has(this.rootNode.id))];
    }
    const children = (element.node.children || []).filter(c => c.visible !== false);
    return children.map(child =>
      new FigmaNodeTreeItem(child, this.mappedNodeIds.has(child.id))
    );
  }

  // ---- Server API로 노드 트리 로드 ----
  async loadFromServer(serverBaseUrl: string, projectId: string, fileKey: string, nodeId: string | null): Promise<void> {
    try {
      const data = await this.fetchFileData(serverBaseUrl, projectId, fileKey, nodeId);
      if (data) {
        this.setData(data);
      }
    } catch (err) {
      console.error('[NodeTree] load failed:', err);
    }
  }

  async loadMappedIds(serverBaseUrl: string, projectId: string, fileKey: string, nodeId: string | null): Promise<void> {
    try {
      const mappings = await this.fetchMappings(serverBaseUrl, projectId, fileKey, nodeId);
      const ids = mappings.filter((m: { status: string }) => m.status === 'mapped').map((m: { figmaNodeId: string }) => m.figmaNodeId);
      this.updateMappedIds(ids);
    } catch (err) {
      console.error('[NodeTree] mappings load failed:', err);
    }
  }

  private fetchJson<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      http.get({
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); }
        });
      }).on('error', reject);
    });
  }

  private async fetchFileData(serverBaseUrl: string, projectId: string, fileKey: string, nodeId: string | null): Promise<FigmaNode | null> {
    const params = new URLSearchParams({ projectId, fileKey });
    if (nodeId) params.set('nodeId', nodeId);
    const result = await this.fetchJson<{ data?: FigmaNode } | null>(`${serverBaseUrl}/api/figma-file-data?${params}`);
    return result?.data || null;
  }

  private async fetchMappings(serverBaseUrl: string, projectId: string, fileKey: string, nodeId: string | null): Promise<Array<{ figmaNodeId: string; status: string }>> {
    const parts = [fileKey];
    if (nodeId) parts.push(nodeId);
    const params = new URLSearchParams({ projectId });
    if (nodeId) params.set('rootNodeId', nodeId);
    return this.fetchJson(`${serverBaseUrl}/api/mappings/${fileKey}/${nodeId || ''}?${params}`);
  }
}
