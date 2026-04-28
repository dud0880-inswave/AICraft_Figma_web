#!/usr/bin/env node
/**
 * AICraft Figma 클라이언트를 빌드해 extension/media/ 로 복사합니다.
 *
 * 기본 경로: 형제 디렉토리 `../figma/figma-viewer-v2/AICraft_Figma/packages/client`
 * 환경변수 `AICRAFT_CLIENT_DIR` 로 덮어쓸 수 있습니다.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const EXTENSION_ROOT = path.resolve(__dirname, '..');
const DEFAULT_CLIENT_DIR = path.resolve(
  EXTENSION_ROOT,
  '..',
  'client'
);
const CLIENT_DIR = process.env.AICRAFT_CLIENT_DIR
  ? path.resolve(process.env.AICRAFT_CLIENT_DIR)
  : DEFAULT_CLIENT_DIR;
const DIST_DIR = path.join(CLIENT_DIR, 'dist');
const MEDIA_DIR = path.join(EXTENSION_ROOT, 'media');

function log(msg) {
  console.log('[build-client] ' + msg);
}

function assert(cond, msg) {
  if (!cond) {
    console.error('[build-client] ERROR: ' + msg);
    process.exit(1);
  }
}

function rimraf(target) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else if (stat.isFile()) {
    fs.copyFileSync(src, dest);
  }
}

// ============================================================
// Run
// ============================================================
log('Client source dir: ' + CLIENT_DIR);
assert(fs.existsSync(CLIENT_DIR), `Client dir not found: ${CLIENT_DIR}`);
assert(fs.existsSync(path.join(CLIENT_DIR, 'package.json')), 'Client package.json not found');

// 1. Install (optional — skip if node_modules exists)
const clientNodeModules = path.join(CLIENT_DIR, 'node_modules');
if (!fs.existsSync(clientNodeModules)) {
  log('Installing client dependencies...');
  execSync('npm install', { cwd: CLIENT_DIR, stdio: 'inherit' });
}

// 2. Build
log('Running Vite build...');
execSync('npm run build', { cwd: CLIENT_DIR, stdio: 'inherit' });
assert(fs.existsSync(DIST_DIR), `Build output not found: ${DIST_DIR}`);

// 3. Clean + copy
log('Cleaning ' + MEDIA_DIR);
rimraf(MEDIA_DIR);
fs.mkdirSync(MEDIA_DIR, { recursive: true });

log('Copying dist → media');
copyRecursive(DIST_DIR, MEDIA_DIR);

// 4. iframe 내부(webview 리소스 호스트에서 로드됨)에서 동작하도록 preview.html 후처리
//    - '/websquare/xxx' 절대 경로 → './xxx' 상대 경로로 재작성
//    - fetch/XHR monkey-patch 주입: 엔진 내부의 동적 '/websquare/...' 요청도 상대 경로로 변환
const previewHtmlPath = path.join(MEDIA_DIR, 'websquare', 'preview.html');
if (fs.existsSync(previewHtmlPath)) {
  let content = fs.readFileSync(previewHtmlPath, 'utf8');

  // 4-1. 정적 참조 경로 변환
  content = content.replace(/(["'`])\/websquare\//g, '$1./');

  // 4-2. <head> 에 종합 monkey-patch 주입
  //      엔진이 동적으로 절대 경로('/...')를 사용하는 모든 케이스를 상대 경로로 변환:
  //      - fetch, XHR → 네트워크 요청
  //      - script/link/img 동적 생성 → MutationObserver
  const patchScript = `<script>
(function() {
  var docBase = document.baseURI || '';
  var dirBase = docBase.substring(0, docBase.lastIndexOf('/') + 1);

  // 절대 경로 '/' 시작 → preview.html 기준 상대 경로로 변환
  // '//' (프로토콜 상대), 'http' (완전 절대) 는 제외
  function resolve(url) {
    if (typeof url !== 'string') return url;
    if (url.charAt(0) === '/' && url.charAt(1) !== '/') {
      return dirBase + url.substring(1);
    }
    return url;
  }

  // --- fetch monkey-patch ---
  var origFetch = window.fetch ? window.fetch.bind(window) : null;
  if (origFetch) {
    window.fetch = function(input, init) {
      if (typeof input === 'string') return origFetch(resolve(input), init);
      return origFetch(input, init);
    };
  }

  // --- XHR monkey-patch ---
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    arguments[1] = resolve(url);
    return origOpen.apply(this, arguments);
  };

  // --- MutationObserver: 동적 생성된 script/link/img 등의 절대 경로 변환 ---
  function rewrite(el) {
    if (!el || el.nodeType !== 1) return;
    ['src', 'href'].forEach(function(attr) {
      var v = el.getAttribute && el.getAttribute(attr);
      if (v && v.charAt(0) === '/' && v.charAt(1) !== '/' && v.indexOf(dirBase) !== 0) {
        el.setAttribute(attr, resolve(v));
      }
    });
  }
  var mo = new MutationObserver(function(muts) {
    muts.forEach(function(m) {
      if (m.type === 'attributes') rewrite(m.target);
      if (m.type === 'childList') {
        for (var i = 0; i < m.addedNodes.length; i++) {
          var n = m.addedNodes[i];
          if (n && n.nodeType === 1) {
            rewrite(n);
            if (n.querySelectorAll) n.querySelectorAll('[src],[href]').forEach(rewrite);
          }
        }
      }
    });
  });
  if (document.documentElement) {
    mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href'] });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href'] });
    });
  }
})();
</script>`;

  if (content.includes('<head>')) {
    content = content.replace(/<head>/, '<head>' + patchScript);
  } else {
    content = patchScript + content;
  }

  fs.writeFileSync(previewHtmlPath, content, 'utf8');
  log('Post-processed: websquare/preview.html (paths + monkey-patch)');
}

log('Done.');
log('  Output: ' + MEDIA_DIR);
