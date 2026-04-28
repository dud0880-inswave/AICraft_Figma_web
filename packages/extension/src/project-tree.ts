import * as vscode from 'vscode';
import * as http from 'http';

// ============================================================
// Types
// ============================================================
interface Project {
  id: string;
  name: string;
  fileCount?: number;
}

export class ProjectTreeItem extends vscode.TreeItem {
  constructor(
    public readonly project: Project,
  ) {
    super(project.name, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'project';
    this.tooltip = `${project.name} (${project.fileCount ?? 0} files)`;
    this.description = project.fileCount !== undefined ? `${project.fileCount} files` : '';
    this.iconPath = new vscode.ThemeIcon('folder');
    this.command = {
      command: 'aicraftFigma.selectProject',
      title: 'Select Project',
      arguments: [project],
    };
  }
}

// ============================================================
// TreeDataProvider
// ============================================================
export class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ProjectTreeItem | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private projects: Project[] = [];

  constructor(
    private getServerBaseUrl: () => string,
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: ProjectTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<ProjectTreeItem[]> {
    try {
      this.projects = await this.fetchProjects();
      return this.projects.map(p => new ProjectTreeItem(p));
    } catch (err) {
      console.error('[ProjectTree] fetch failed:', err);
      return [];
    }
  }

  // ---- Server API ----

  private fetchJson<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.getServerBaseUrl() + path);
      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: { 'Content-Type': 'application/json' },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Invalid JSON: ${data.substring(0, 100)}`));
          }
        });
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  private async fetchProjects(): Promise<Project[]> {
    return this.fetchJson<Project[]>('/api/projects');
  }

  async createProject(name: string): Promise<Project> {
    const result = await this.fetchJson<Project>('/api/projects', 'POST', { name });
    this.refresh();
    return result;
  }

  async deleteProject(id: string): Promise<void> {
    await this.fetchJson<unknown>(`/api/projects/${id}`, 'DELETE');
    this.refresh();
  }

  async renameProject(id: string, name: string): Promise<void> {
    await this.fetchJson<unknown>(`/api/projects/${id}`, 'PUT', { name });
    this.refresh();
  }
}
