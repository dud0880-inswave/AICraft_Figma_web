# AICraft Figma (VS Code Extension)

Figma 파일 노드 매핑 및 XML/Spec 문서 생성 도구를 VS Code Webview에서 사용하는 확장 프로그램입니다.

## 아키텍처

```
┌─────────────────────────────┐          ┌─────────────────────┐
│ VS Code Extension           │          │ AICraft Figma Server │
│  ├─ extension.ts            │  HTTP    │  (packages/server)   │
│  └─ WebviewPanel            │ <──────> │  ├─ SQLite            │
│     └─ React Client (media/)│          │  ├─ Figma API proxy  │
│        = AICraft_Figma 빌드 │          │  └─ Claude API       │
└─────────────────────────────┘          └─────────────────────┘
```

- Extension은 **독립 패키지** (`node_modules`/빌드 분리)
- 서버는 **형제 프로젝트(`AICraft_Figma/packages/server`)를 공유**
- 클라이언트(React)는 extension 빌드 시 `AICraft_Figma/packages/client`에서 빌드해 `media/`에 복사

## 사전 요구사항

- **Node.js** 18 이상
- **npm** 9 이상
- **VS Code** 1.80 이상
- **AICraft Figma 클라이언트 소스** — 기본 경로: `../figma/figma-viewer-v2/AICraft_Figma/packages/client`

## 설치 및 빌드

```bash
# 1. 의존성 설치
npm install

# 2. 클라이언트 빌드 (media/ 폴더 생성)
npm run build-client

# 3. Extension 컴파일
npm run compile
```

> 클라이언트 소스 경로가 다른 경우 환경변수로 지정:
> ```bash
> AICRAFT_CLIENT_DIR=/path/to/AICraft_Figma/packages/client npm run build-client
> ```

## 서버 실행

별도 터미널에서 AICraft Figma 서버를 실행합니다.

```bash
cd ../figma/figma-viewer-v2/AICraft_Figma/packages/server
npm install
npm run dev
```

기본 주소: `http://localhost:5181`

## Extension 실행 (개발 모드)

1. 이 폴더를 VS Code로 열기
2. `F5` (Run Extension Development Host)
3. 새 창에서 `Ctrl+Shift+P` → **AICraft Figma: Open Viewer**

## 설정

VS Code 설정 (`Ctrl+,` → `AICraft Figma` 검색):

| 설정 | 기본값 | 설명 |
|---|---|---|
| `aicraftFigma.serverHost` | `localhost` | 서버 호스트 |
| `aicraftFigma.serverPort` | `5181` | 서버 포트 |

Command Palette → **AICraft Figma: Set Server URL** 로 즉시 변경 가능 (webview 자동 재로드).

## 명령어

| 명령 | 설명 |
|---|---|
| `AICraft Figma: Open Viewer` | Webview 패널 열기 |
| `AICraft Figma: Reload Viewer` | 패널 재로드 |
| `AICraft Figma: Set Server URL` | 호스트/포트 변경 |
| `AICraft Figma: Select Project` | 프로젝트 선택 |

## 패키징 (.vsix)

```bash
npm run build      # client + tsc 전체 빌드
npm run package    # .vsix 파일 생성
```

생성된 `.vsix` 파일은 VS Code에서 **Install from VSIX** 로 설치할 수 있습니다.

## 프로젝트 구조

```
aiCraft_figma_extension/
├── src/                    # TypeScript 소스
│   ├── extension.ts        # Extension 진입점
│   ├── node-tree.ts        # Figma 노드 트리 뷰
│   ├── project-tree.ts     # 프로젝트 트리 뷰
│   └── preview-server.ts   # 미리보기 서버
├── media/                  # 클라이언트 빌드 산출물 (gitignore)
├── out/                    # TS 컴파일 산출물 (gitignore)
├── resources/              # 아이콘 등 정적 리소스
├── scripts/
│   └── build-client.js     # 클라이언트 빌드 스크립트
├── package.json
└── tsconfig.json
```

## 작동 원리

1. Extension 활성화 시 `WebviewPanel` 생성
2. `media/index.html`을 읽어 절대 경로를 `webview.asWebviewUri()`로 변환하고 CSP + config 스크립트 주입
3. 주입 스크립트가 `window.__AICRAFT_CONFIG__` 설정 및 `fetch` monkey-patch로 API 요청을 서버로 포워딩
4. 클라이언트(React)가 config를 읽어 서버와 통신

## 트러블슈팅

| 증상 | 해결 방법 |
|---|---|
| "Client not built yet" 메시지 | `npm run build-client` 실행 후 Reload Viewer |
| API 호출 실패 (CORS) | 서버 실행 여부 및 호스트/포트 설정 확인. 서버 CORS에 `vscode-webview://*` 허용 필요 |
| 이미지 미표시 | 서버의 `/api/figma-files/image` 엔드포인트 확인 |
| Figma API 호출 실패 | 서버의 `/api/figma-proxy/*` 엔드포인트 및 Figma Token 확인 |

## 라이선스

MIT
