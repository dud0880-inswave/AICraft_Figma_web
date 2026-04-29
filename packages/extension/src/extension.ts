import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PreviewServer } from './preview-server';
import { ProjectTreeProvider, ProjectTreeItem } from './project-tree';
// import { NodeTreeProvider } from './node-tree';

// ============================================================
// Constants
// ============================================================
const EXTENSION_ID = 'aicraftFigma';
const CONFIG_KEY_HOST = 'serverHost';
const CONFIG_KEY_PORT = 'serverPort';
const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 5181;
const PANEL_VIEW_TYPE = 'aicraftFigma';
const PANEL_TITLE = 'AICraft Figma';
const OUTPUT_CHANNEL_NAME = 'AICraft Figma';

// ============================================================
// State
// ============================================================
let currentPanel: vscode.WebviewPanel | undefined;
let outputChannel: vscode.OutputChannel | undefined;
const previewServer = new PreviewServer();
let projectTree: ProjectTreeProvider | undefined;

function log(...args: unknown[]): void {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  }
  outputChannel.appendLine(
    args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
  );
}

// ============================================================
// Config
// ============================================================
interface ServerConfig {
  host: string;
  port: number;
  baseUrl: string;
}

function getServerConfig(): ServerConfig {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  const host = (config.get<string>(CONFIG_KEY_HOST) || DEFAULT_HOST).trim();
  const port = config.get<number>(CONFIG_KEY_PORT) || DEFAULT_PORT;
  return { host, port, baseUrl: `http://${host}:${port}` };
}

// ============================================================
// Webview HTML — helpers
// ============================================================

/** Vite 정적 빌드 산출물의 절대 경로 애셋 (`/assets/...` 등) 을 webview URI 로 치환 */
function rewriteStaticAssets(html: string, webviewMediaUri: string): string {
  return html.replace(/(src|href)="\/([^/"][^"]*)"/g, (match, attr, path) => {
    if (path.startsWith('api/')) return match; // API 호출은 서버로 가야 함
    return `${attr}="${webviewMediaUri}/${path}"`;
  });
}

function buildCsp(webview: vscode.Webview, serverBaseUrl: string, previewBaseUrl?: string): string {
  const src = webview.cspSource;
  const extraSrc = previewBaseUrl ? ` ${previewBaseUrl}` : '';
  return [
    `default-src 'none'`,
    `script-src ${src} 'unsafe-inline' 'unsafe-eval'`,
    `style-src ${src} 'unsafe-inline'`,
    `img-src ${src} ${serverBaseUrl}${extraSrc} data: blob: https:`,
    `font-src ${src} data:`,
    `connect-src ${serverBaseUrl}${extraSrc} https://api.figma.com`,
    `frame-src ${src} ${serverBaseUrl}${extraSrc}`,
    `child-src ${src} ${serverBaseUrl}${extraSrc}`,
    `worker-src ${src} blob:`,
  ].join('; ');
}

/**
 * Webview <head> 에 주입할 스크립트.
 *  - window.__AICRAFT_CONFIG__ : 서버 정보 (클라이언트 config/index.ts 가 읽음)
 *  - fetch monkey-patch : '/api/...' 상대 경로를 서버 base 로 포워딩
 *  - MutationObserver : 런타임 렌더링된 <img src="/..."/> 등을 webview URI 로 재작성
 *    (<base href> 는 absolute path('/xxx')에는 안 먹혀서 observer 사용)
 *  - 에러 리포트 : window.onerror / onunhandledrejection → extension host
 */
function buildInjectionScript(server: ServerConfig, webviewMediaUri: string, previewBaseUrl?: string): string {
  const serverBaseJson = JSON.stringify(server.baseUrl);
  const webviewBaseJson = JSON.stringify(webviewMediaUri);
  // WebSquare config에서 DeploySource 읽기
  const mainConfig = vscode.workspace.getConfiguration('config.properties').get<{
    DeploySource?: string;
  }>('main');
  const deploySource = mainConfig?.DeploySource?.replace(/^\//, '') || '';

  const configJson = JSON.stringify({
    serverHost: server.host,
    serverPort: server.port,
    deploySource,
  });

  const previewBaseJson = previewBaseUrl ? JSON.stringify(previewBaseUrl) : 'null';

  return `<script>
(function() {
  window.__AICRAFT_CONFIG__ = ${configJson};
  var SERVER_BASE = ${serverBaseJson};
  var WEBVIEW_BASE = ${webviewBaseJson};
  var PREVIEW_BASE = ${previewBaseJson};

  // ---------- fetch monkey-patch: /api/* → localhost:PORT (portMapping이 처리) ----------
  var origFetch = window.fetch.bind(window);
  window.fetch = function(input, init) {
    try {
      // '/api/...' 상대 경로 → 'http://localhost:PORT/api/...' 로 변환
      // VS Code portMapping 이 localhost:PORT 접근을 허용/중계
      if (typeof input === 'string' && input.indexOf('/api/') === 0) {
        return origFetch(SERVER_BASE + input, init);
      }
      // 이미 full URL인 경우 (getApiBase가 http://host:port/api 반환)
      if (typeof input === 'string' && input.indexOf(SERVER_BASE) === 0) {
        return origFetch(input, init);
      }
      // Request object
      if (input && typeof input === 'object' && typeof input.url === 'string') {
        try {
          var u = new URL(input.url);
          if (u.pathname.indexOf('/api/') === 0) {
            return origFetch(SERVER_BASE + u.pathname + u.search, init || input);
          }
        } catch (_) { /* ignore */ }
      }
    } catch (_) { /* ignore */ }
    return origFetch(input, init);
  };

  // ---------- static asset rewrite (MutationObserver) ----------
  function needsRewrite(v) {
    return typeof v === 'string'
      && v.charAt(0) === '/'
      && v.charAt(1) !== '/'
      && v.indexOf('/api/') !== 0
      && v.indexOf(WEBVIEW_BASE) !== 0
      && v.indexOf(SERVER_BASE) !== 0;
  }
  function rewriteAttr(el) {
    if (!el || el.nodeType !== 1 || typeof el.getAttribute !== 'function') return;
    var attrs = ['src', 'href'];
    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i];
      var v = el.getAttribute(attr);
      if (!needsRewrite(v)) continue;
      // iframe src="/websquare/..." → 서버에서 로드 (엔진+CSS 이미지 경로 해결)
      if (el.tagName === 'IFRAME' && v.indexOf('/websquare/') === 0 && PREVIEW_BASE) {
        el.setAttribute(attr, PREVIEW_BASE + v);
      } else if (el.tagName === 'IFRAME' && v.indexOf('/websquare/') === 0) {
        el.setAttribute(attr, SERVER_BASE + v);
      } else {
        el.setAttribute(attr, WEBVIEW_BASE + v);
      }
    }
  }
  function scanAll(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    var all = root.querySelectorAll('[src], [href]');
    for (var i = 0; i < all.length; i++) rewriteAttr(all[i]);
  }
  var mo = new MutationObserver(function(muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === 'attributes') {
        rewriteAttr(m.target);
      } else if (m.type === 'childList') {
        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j];
          if (n && n.nodeType === 1) {
            rewriteAttr(n);
            scanAll(n);
          }
        }
      }
    }
  });
  function startObserver() {
    if (!document.documentElement) return;
    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'href'],
    });
    scanAll(document);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }

  // ---------- error reporting to extension host ----------
  var _vscode = null;
  try { _vscode = window.acquireVsCodeApi ? window.acquireVsCodeApi() : null; } catch (_) {}
  if (_vscode) window.__vscode = _vscode;
  window.addEventListener('error', function(e) {
    if (_vscode && e) {
      _vscode.postMessage({
        type: 'error',
        message: (e.message || 'unknown') + (e.filename ? (' @ ' + e.filename + ':' + e.lineno) : ''),
      });
    }
  });
  window.addEventListener('unhandledrejection', function(e) {
    if (_vscode && e) {
      var reason = e.reason;
      var msg = reason && reason.message ? reason.message : String(reason);
      _vscode.postMessage({ type: 'error', message: 'unhandledrejection: ' + msg });
    }
  });
})();
</script>`;
}

function mergeIntoHead(html: string, injection: string): string {
  if (html.includes('<head>')) {
    return html.replace(/<head>/, `<head>${injection}`);
  }
  if (html.includes('<html')) {
    return html.replace(/(<html[^>]*>)/, `$1<head>${injection}</head>`);
  }
  return `<!DOCTYPE html><html><head>${injection}</head><body>${html}</body></html>`;
}

function buildWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  server: ServerConfig,
  previewBaseUrl?: string
): string {
  const mediaUri = vscode.Uri.joinPath(extensionUri, 'media');
  const indexPath = vscode.Uri.joinPath(mediaUri, 'index.html').fsPath;

  if (!fs.existsSync(indexPath)) {
    return buildPlaceholderHtml(
      'Client not built yet.',
      '터미널에서 확장 디렉토리로 이동 후 다음을 실행하세요:',
      '  npm install',
      '  npm run build-client',
      '  npm run compile',
      '그 후 "AICraft Figma: Reload Viewer" 명령을 실행하세요.'
    );
  }

  let html: string;
  try {
    html = fs.readFileSync(indexPath, 'utf8');
  } catch (err) {
    log('Failed to read index.html:', String(err));
    return buildPlaceholderHtml(`index.html 읽기 실패: ${String(err)}`);
  }

  const webviewMediaUri = webview.asWebviewUri(mediaUri).toString().replace(/\/$/, '');

  html = rewriteStaticAssets(html, webviewMediaUri);

  const csp = buildCsp(webview, server.baseUrl, previewBaseUrl);
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
  const scriptInjection = buildInjectionScript(server, webviewMediaUri, previewBaseUrl);

  return mergeIntoHead(html, cspMeta + scriptInjection);
}

function buildPlaceholderHtml(...lines: string[]): string {
  const content = lines.map(l => `<p>${escapeHtml(l)}</p>`).join('\n');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: var(--vscode-font-family, -apple-system, sans-serif);
      padding: 2rem;
      color: var(--vscode-foreground, #ddd);
      background: var(--vscode-editor-background, #1e1e1e);
      line-height: 1.6;
    }
    h1 { color: var(--vscode-textLink-foreground, #4ec9b0); margin-top: 0; }
    p { margin: 0.4rem 0; }
    code {
      background: var(--vscode-textCodeBlock-background, #2d2d2d);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-family: var(--vscode-editor-font-family, Consolas, monospace);
    }
  </style>
</head>
<body>
  <h1>AICraft Figma</h1>
  ${content}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// Commands
// ============================================================
async function openViewer(context: vscode.ExtensionContext): Promise<void> {
  if (currentPanel) {
    currentPanel.reveal();
    return;
  }

  const server = getServerConfig();

  // VS Code 공식 API로 로컬 서버 URI를 webview에서 접근 가능한 URI로 변환
  const localUri = vscode.Uri.parse(server.baseUrl);
  const resolvedUri = await vscode.env.asExternalUri(localUri);
  const resolvedBaseUrl = resolvedUri.toString().replace(/\/$/, '');

  log(`[Open] Server: ${server.baseUrl} → resolved: ${resolvedBaseUrl}`);

  const resolvedServer: ServerConfig = {
    host: resolvedUri.authority.split(':')[0] || server.host,
    port: Number(resolvedUri.authority.split(':')[1]) || server.port,
    baseUrl: resolvedBaseUrl,
  };

  // Preview Server 시작 (엔진 + 워크스페이스 파일 서빙)
  let previewBaseUrl: string | undefined;
  if (previewServer.port === 0) {
    try {
      const mediaDir = vscode.Uri.joinPath(context.extensionUri, 'media').fsPath;
      const port = await previewServer.start(mediaDir);
      previewBaseUrl = `http://127.0.0.1:${port}`;
      log(`[Preview Server] started on port ${port}`);
    } catch (err) {
      log('[Preview Server] start failed:', String(err));
    }
  } else {
    previewBaseUrl = `http://127.0.0.1:${previewServer.port}`;
  }

  const portMappings: Array<{ webviewPort: number; extensionHostPort: number }> = [
    { webviewPort: server.port, extensionHostPort: server.port },
  ];
  if (previewServer.port > 0) {
    portMappings.push({ webviewPort: previewServer.port, extensionHostPort: previewServer.port });
  }

  const panel = vscode.window.createWebviewPanel(
    PANEL_VIEW_TYPE,
    PANEL_TITLE,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      portMapping: portMappings,
    }
  );

  panel.webview.html = buildWebviewHtml(panel.webview, context.extensionUri, resolvedServer, previewBaseUrl);

  panel.webview.onDidReceiveMessage(async (msg) => {
    if (msg && msg.type === 'error') {
      log('[Webview Error]', msg.message);
    }
    // XML/Spec 파일 저장 (워크스페이스 기준)
    if (msg && msg.type === 'saveFile') {
      const { content, relativePath, wsFolder } = msg;
      const folders = vscode.workspace.workspaceFolders || [];
      const folder = wsFolder
        ? folders.find(f => f.name === wsFolder)
        : folders[0];
      if (folder && content && relativePath) {
        try {
          const fileUri = vscode.Uri.joinPath(folder.uri, relativePath);
          const dirUri = vscode.Uri.joinPath(fileUri, '..');
          await vscode.workspace.fs.createDirectory(dirUri);
          await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf-8'));
          panel.webview.postMessage({ type: 'fileSaved', requestId: msg.requestId, path: fileUri.fsPath });
        } catch (err) {
          panel.webview.postMessage({ type: 'fileSaved', requestId: msg.requestId, error: String(err) });
        }
      }
    }
    // 개인 설정 읽기 (VS Code settings.json)
    if (msg && msg.type === 'getPersonalSettings') {
      const config = vscode.workspace.getConfiguration(EXTENSION_ID);
      const projectId = msg.projectId || '';
      const allPersonal = config.get<Record<string, unknown>>('personalSettings') || {};
      const projectSettings = (allPersonal[projectId] as Record<string, unknown>) || {};
      panel.webview.postMessage({
        type: 'personalSettings',
        requestId: msg.requestId,
        settings: projectSettings,
      });
    }
    // 개인 설정 쓰기 (VS Code settings.json)
    if (msg && msg.type === 'savePersonalSettings') {
      const config = vscode.workspace.getConfiguration(EXTENSION_ID);
      const projectId = msg.projectId || '';
      const allPersonal = { ...(config.get<Record<string, unknown>>('personalSettings') || {}) };
      allPersonal[projectId] = { ...((allPersonal[projectId] as Record<string, unknown>) || {}), ...msg.settings };
      await config.update('personalSettings', allPersonal, vscode.ConfigurationTarget.Global);
      panel.webview.postMessage({ type: 'personalSettingsSaved', requestId: msg.requestId });
    }
    // 프로젝트 목록 갱신 (파일 추가/삭제 등)
    if (msg && msg.type === 'refreshProjects') {
      projectTree?.refresh();
    }
    // 파일 열림 → 사이드바 닫기
    if (msg && msg.type === 'fileOpened') {
      vscode.commands.executeCommand('workbench.action.closeSidebar');
    }
    // 프로젝트 이동 → 사이드바 열기
    if (msg && msg.type === 'backToProject') {
      vscode.commands.executeCommand(`workbench.view.extension.${EXTENSION_ID}`);
    }
    // 파일 읽기 요청 (CSS 파싱용)
    if (msg && msg.type === 'readFile') {
      if (msg.relativePath) {
        try {
          let fileUri: vscode.Uri;
          // 절대경로 판별 (드라이브 문자 또는 / 시작)
          if (/^[a-zA-Z]:[\\/]/.test(msg.relativePath) || msg.relativePath.startsWith('/')) {
            fileUri = vscode.Uri.file(msg.relativePath);
          } else {
            const folders = vscode.workspace.workspaceFolders || [];
            const folder = msg.wsFolder
              ? folders.find(f => f.name === msg.wsFolder)
              : folders[0];
            if (!folder) throw new Error('No workspace folder');
            fileUri = vscode.Uri.joinPath(folder.uri, msg.relativePath);
          }
          const buf = await vscode.workspace.fs.readFile(fileUri);
          panel.webview.postMessage({
            type: 'fileContent',
            requestId: msg.requestId,
            content: Buffer.from(buf).toString('utf-8'),
          });
        } catch {
          panel.webview.postMessage({ type: 'fileContent', requestId: msg.requestId, content: '' });
        }
      }
    }
    // 파일 선택 다이얼로그 요청
    if (msg && msg.type === 'pickFile') {
      const filters: Record<string, string[]> = msg.filters || { 'All': ['*'] };
      const result = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters,
        defaultUri: vscode.workspace.workspaceFile || vscode.workspace.workspaceFolders?.[0]?.uri,
      });
      if (result?.[0]) {
        const selectedFolder = vscode.workspace.getWorkspaceFolder(result[0]);
        const isExternal = !selectedFolder;
        const relativePath = selectedFolder
          ? path.relative(selectedFolder.uri.fsPath, result[0].fsPath)
          : result[0].fsPath;
        const wsFolder = selectedFolder?.name || '';
        panel.webview.postMessage({
          type: 'filePicked',
          requestId: msg.requestId,
          relativePath: relativePath.replace(/\\/g, '/'),
          wsFolder,
          external: isExternal,
        });
      }
    }
    // 폴더 선택 다이얼로그 (저장 경로 지정용)
    if (msg && msg.type === 'pickFolder') {
      const result = await vscode.window.showOpenDialog({
        canSelectMany: false,
        canSelectFiles: false,
        canSelectFolders: true,
        defaultUri: vscode.workspace.workspaceFile || vscode.workspace.workspaceFolders?.[0]?.uri,
      });
      if (result?.[0]) {
        const selectedFolder = vscode.workspace.getWorkspaceFolder(result[0]);
        const relativePath = selectedFolder
          ? path.relative(selectedFolder.uri.fsPath, result[0].fsPath)
          : vscode.workspace.asRelativePath(result[0]);
        const wsFolder = selectedFolder?.name || '';
        panel.webview.postMessage({
          type: 'folderPicked',
          requestId: msg.requestId,
          relativePath: relativePath.replace(/\\/g, '/'),
          wsFolder,
        });
      }
    }
    // 이전 스펙 조회 (워크스페이스 파일 읽기)
    if (msg && msg.type === 'readPriorSpecs') {
      const { wsFolder: wf, basePath, upToVersion, fileName } = msg;
      const folders = vscode.workspace.workspaceFolders || [];
      const folder = wf ? folders.find(f => f.name === wf) : folders[0];
      const priorSpecs: Array<{ version: string; content: string }> = [];
      if (folder && basePath) {
        for (let v = 1; v < upToVersion; v++) {
          const vStr = String(v).padStart(2, '0');
          const fileUri = vscode.Uri.joinPath(folder.uri, basePath, `v${vStr}`, fileName);
          try {
            const buf = await vscode.workspace.fs.readFile(fileUri);
            priorSpecs.push({ version: vStr, content: Buffer.from(buf).toString('utf-8') });
          } catch { /* file doesn't exist */ }
        }
      }
      panel.webview.postMessage({ type: 'priorSpecsLoaded', requestId: msg.requestId, priorSpecs });
    }
  });

  panel.onDidDispose(() => {
    currentPanel = undefined;
  });

  currentPanel = panel;
}

async function setServerUrl(): Promise<void> {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  const currentHost = config.get<string>(CONFIG_KEY_HOST) || DEFAULT_HOST;
  const currentPort = config.get<number>(CONFIG_KEY_PORT) || DEFAULT_PORT;

  const host = await vscode.window.showInputBox({
    prompt: '서버 호스트',
    value: currentHost,
    placeHolder: 'localhost 또는 192.168.0.10',
  });
  if (!host) return;

  const portStr = await vscode.window.showInputBox({
    prompt: '서버 포트',
    value: String(currentPort),
    validateInput: (v) =>
      /^\d+$/.test(v) && Number(v) > 0 && Number(v) <= 65535
        ? null
        : '1~65535 사이 숫자를 입력하세요',
  });
  if (!portStr) return;

  await config.update(CONFIG_KEY_HOST, host.trim(), vscode.ConfigurationTarget.Global);
  await config.update(CONFIG_KEY_PORT, Number(portStr), vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(`서버 URL 설정됨: http://${host.trim()}:${portStr}`);
  // onDidChangeConfiguration 에서 자동 reload
}

async function reloadViewer(context: vscode.ExtensionContext): Promise<void> {
  if (!currentPanel) {
    await openViewer(context);
    return;
  }
  const server = getServerConfig();
  const localUri = vscode.Uri.parse(server.baseUrl);
  const resolvedUri = await vscode.env.asExternalUri(localUri);
  const resolvedBaseUrl = resolvedUri.toString().replace(/\/$/, '');

  const resolvedServer: ServerConfig = {
    host: resolvedUri.authority.split(':')[0] || server.host,
    port: Number(resolvedUri.authority.split(':')[1]) || server.port,
    baseUrl: resolvedBaseUrl,
  };

  const previewBaseUrl = previewServer.port > 0 ? `http://127.0.0.1:${previewServer.port}` : undefined;
  log(`[Reload] Server: ${resolvedBaseUrl}, Preview: ${previewBaseUrl || 'none'}`);
  currentPanel.webview.html = buildWebviewHtml(
    currentPanel.webview,
    context.extensionUri,
    resolvedServer,
    previewBaseUrl
  );
}

// ============================================================
// Activation
// ============================================================
export function activate(context: vscode.ExtensionContext): void {
  log('[Activate] AICraft Figma extension');

  // 프로젝트 TreeView
  projectTree = new ProjectTreeProvider(() => getServerConfig().baseUrl);
  vscode.window.createTreeView(`${EXTENSION_ID}.projects`, { treeDataProvider: projectTree });

  // 프로젝트 선택 → webview에 파일 대시보드 표시
  const handleSelectProject = async (project: { id: string; name: string }) => {
    await openViewer(context);
    if (currentPanel) {
      currentPanel.webview.postMessage({
        type: 'selectProject',
        projectId: project.id,
        projectName: project.name,
      });
    }
  };

  // 프로젝트 추가
  const handleAddProject = async () => {
    const name = await vscode.window.showInputBox({
      prompt: '프로젝트 이름',
      placeHolder: '새 프로젝트',
    });
    if (!name?.trim()) return;
    try {
      const project = await projectTree!.createProject(name.trim());
      vscode.window.showInformationMessage(`프로젝트 "${project.name}" 생성됨`);
    } catch (err) {
      vscode.window.showErrorMessage(`프로젝트 생성 실패: ${String(err)}`);
    }
  };

  // 프로젝트 삭제
  const handleDeleteProject = async (item: ProjectTreeItem) => {
    const answer = await vscode.window.showWarningMessage(
      `프로젝트 "${item.project.name}"을(를) 삭제하시겠습니까?\n하위 파일도 모두 삭제됩니다.`,
      { modal: true },
      '삭제'
    );
    if (answer !== '삭제') return;
    try {
      await projectTree!.deleteProject(item.project.id);
      vscode.window.showInformationMessage(`프로젝트 "${item.project.name}" 삭제됨`);
    } catch (err) {
      vscode.window.showErrorMessage(`프로젝트 삭제 실패: ${String(err)}`);
    }
  };

  // 프로젝트 이름 변경
  const handleRenameProject = async (item: ProjectTreeItem) => {
    const newName = await vscode.window.showInputBox({
      prompt: '새 프로젝트 이름',
      value: item.project.name,
    });
    if (!newName?.trim() || newName === item.project.name) return;
    try {
      await projectTree!.renameProject(item.project.id, newName.trim());
    } catch (err) {
      vscode.window.showErrorMessage(`이름 변경 실패: ${String(err)}`);
    }
  };

  // 노드 선택 → webview에 전달
  const handleSelectNode = (nodeId: string) => {
    if (currentPanel) {
      currentPanel.webview.postMessage({ type: 'selectNode', nodeId });
    }
  };

  // 프로젝트 목록으로 돌아가기

  context.subscriptions.push(
    vscode.commands.registerCommand(`${EXTENSION_ID}.open`, () => openViewer(context)),
    vscode.commands.registerCommand(`${EXTENSION_ID}.selectProject`, handleSelectProject),
    vscode.commands.registerCommand(`${EXTENSION_ID}.addProject`, handleAddProject),
    vscode.commands.registerCommand(`${EXTENSION_ID}.deleteProject`, handleDeleteProject),
    vscode.commands.registerCommand(`${EXTENSION_ID}.renameProject`, handleRenameProject),
    vscode.commands.registerCommand(`${EXTENSION_ID}.refreshProjects`, () => projectTree?.refresh()),
    vscode.commands.registerCommand(`${EXTENSION_ID}.selectNode`, handleSelectNode),
    vscode.commands.registerCommand(`${EXTENSION_ID}.setServerUrl`, setServerUrl),
    vscode.commands.registerCommand(`${EXTENSION_ID}.reload`, () => reloadViewer(context)),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(EXTENSION_ID)) {
        projectTree?.refresh();
        reloadViewer(context);
      }
    })
  );
}

export function deactivate(): void {
  previewServer.stop();
  if (currentPanel) {
    currentPanel.dispose();
    currentPanel = undefined;
  }
  if (outputChannel) {
    outputChannel.dispose();
    outputChannel = undefined;
  }
}
