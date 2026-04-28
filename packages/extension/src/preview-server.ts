import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const MIME_MAP: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  eot: 'application/vnd.ms-fontobject',
};

function getMime(filePath: string): string {
  const ext = path.extname(filePath).replace('.', '').toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

function safePath(baseDir: string, reqPath: string): string | null {
  const resolved = path.resolve(baseDir, '.' + reqPath);
  if (!resolved.startsWith(baseDir)) return null; // 디렉토리 탈출 방지
  return resolved;
}

export class PreviewServer {
  private server: http.Server | null = null;
  private _port = 0;

  get port(): number {
    return this._port;
  }

  /**
   * @param mediaDir  extension/media 경로 (/websquare/* 서빙용)
   */
  start(mediaDir: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        const url = new URL(req.url || '/', `http://localhost`);
        const reqPath = decodeURIComponent(url.pathname);

        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        // 1. /websquare/* → extension/media/websquare/
        if (reqPath.startsWith('/websquare/')) {
          const filePath = safePath(mediaDir, reqPath);
          if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const buf = fs.readFileSync(filePath);
            res.writeHead(200, { 'Content-Type': getMime(filePath) });
            res.end(buf);
            return;
          }
        }

        // 2. /* → 워크스페이스 폴더에서 탐색
        //    경로의 첫 세그먼트가 워크스페이스 폴더명과 일치하면 해당 폴더 기준
        //    일치하지 않으면 모든 폴더 순회
        const folders = vscode.workspace.workspaceFolders || [];
        const firstSegment = reqPath.split('/').filter(Boolean)[0] || '';
        const matchedFolder = folders.find(f => f.name === firstSegment);
        if (!matchedFolder && reqPath.includes('css')) {
        }

        if (matchedFolder) {
          const subPath = reqPath.substring(firstSegment.length + 1);
          const filePath = safePath(matchedFolder.uri.fsPath, subPath);
          if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const buf = fs.readFileSync(filePath);
            res.writeHead(200, { 'Content-Type': getMime(filePath) });
            res.end(buf);
            return;
          }
        }

        // 폴더명 불일치 → CSS 내부 절대경로(@import, url()) 대응: 전체 폴더 순회
        for (const folder of folders) {
          const filePath = safePath(folder.uri.fsPath, reqPath);
          if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const buf = fs.readFileSync(filePath);
            res.writeHead(200, { 'Content-Type': getMime(filePath) });
            res.end(buf);
            return;
          }
        }

        // 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      });

      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server!.address();
        if (addr && typeof addr === 'object') {
          this._port = addr.port;
          resolve(this._port);
        } else {
          reject(new Error('Failed to get server port'));
        }
      });

      this.server.on('error', reject);
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      this._port = 0;
    }
  }
}
