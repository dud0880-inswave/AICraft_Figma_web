# AICraft_Figma AI 문서 센터

> AI 세션이 프로젝트를 빠르게 이해하고 효과적으로 작업할 수 있도록 돕는 문서 모음

---

## 문서 구조

```
aiDocs/
├── index.md          ← 지금 보고 있는 파일 (시작점)
├── research/         ← 프로젝트 구조, 핵심 로직 분석
├── history/          ← 작업 히스토리, 변경 이력
├── todo/             ← 할 일 목록, 우선순위
└── issue/            ← 버그, 이슈, 기술 부채
```

---

## 프로젝트 한 줄 요약

**AICraft_Figma** = Figma 디자인 → WebSquare XML 변환 + 스펙 문서 생성 도구 (웹 + VS Code Extension)

---

## 프로젝트 구조 (모노레포)

```
AICraft_Figma/
├── packages/
│   ├── server/              # 백엔드 (SQLite + Figma/Claude API)
│   │   ├── src/
│   │   │   ├── index.ts     # HTTP 서버 + 모든 API 엔드포인트
│   │   │   ├── db.ts        # SQLite 초기화 + 테이블 생성
│   │   │   └── *-store.ts   # 데이터 스토어 (8개)
│   │   ├── config/          # 환경 설정 (server.env)
│   │   └── data/            # SQLite DB + 이미지 저장
│   │
│   ├── client/              # 프론트엔드 (React + Vite)
│   │   ├── src/
│   │   │   ├── App.tsx      # 메인 앱 (대시보드/에디터/스펙 뷰)
│   │   │   ├── Spec.tsx     # 스펙 문서 에디터
│   │   │   ├── components/  # React 컴포넌트
│   │   │   ├── contexts/    # DialogContext, ThemeContext
│   │   │   ├── utils/       # API 클라이언트, 변환 로직
│   │   │   └── config/      # 런타임 설정 (__AICRAFT_CONFIG__ 지원)
│   │   └── public/          # 정적 파일 + WebSquare 엔진
│   │
│   └── extension/           # VS Code Extension
│       ├── src/
│       │   ├── extension.ts     # Extension 진입점 (webview, 명령)
│       │   ├── project-tree.ts  # 사이드바 프로젝트 TreeView
│       │   ├── node-tree.ts     # 노드 TreeView (미사용)
│       │   └── preview-server.ts # 미리보기 로컬 HTTP 서버
│       ├── scripts/
│       │   └── build-client.js  # 클라이언트 빌드 → media/ 복사
│       └── resources/           # 아이콘
│
├── package.json             # 워크스페이스 루트
├── start-server.bat         # 서버 실행 배치파일
└── README.md
```

---

## 핵심 개념

| 개념 | 설명 |
|-----|------|
| **시그니처** | 노드 구조(name, type, componentProperties)의 SHA256 해시 |
| **클러스터** | 동일 시그니처 매핑들의 그룹. 자동 매핑 제안에 사용 |
| **Base/Full 모드** | Base: variant key만, Full: variant value 포함 |
| **레지스트리** | 매핑 가능한 WebSquare 컴포넌트 목록 (widget 포함) |
| **기본 규칙** | 노드 이름 키워드 매칭 (예: "btn" → Button) |
| **버전 관리** | figma_files.version — refresh 변경 감지 시 사용자 컨펌으로 증가 |
| **스펙 delta 체인** | v01=전체, v02+=이전 누적 대비 변경분만 기록 |
| **widgetContainer** | 가상 컴포넌트(widgetItem/Title/Content)로 addWidgets JS 코드 자동 생성 |

---

## DB 테이블

| 테이블 | 용도 |
|--------|------|
| projects | 프로젝트 관리 |
| settings | 프로젝트별 key-value 설정 (토큰, CSS, export 경로 등) |
| figma_files | 파일 메타 (version, xmlFilename 포함) |
| figma_file_data | 노드 트리 JSON 캐시 (비교 기준 + 사용자 편집본) |
| node_mappings | 노드 → 컴포넌트 매핑 |
| registry | WebSquare 컴포넌트 레지스트리 |
| default_mapping_rules | 이름 기반 자동 매핑 규칙 |
| mapping_clusters | 시그니처 기반 클러스터 |

---

## 이미지 저장

- 경로: `packages/server/data/images/{projectId}/{fileKey}__{nodeId}.svg`
- 스펙 이미지: `{fileKey}__{nodeId}_spec.svg` (suffix 방식)
- SVG format (scale=1), Figma API에서 받아 서버가 로컬에 저장

---

## 자주 쓰는 명령어

```bash
# 개발 (서버 + 클라이언트)
npm run dev

# 개별 실행
npm run dev:server    # 백엔드 (localhost:5181)
npm run dev:client    # 프론트엔드 (localhost:5180)

# 빌드
npm run build         # 서버 + 클라이언트
npm run build:ext     # Extension (클라이언트 빌드 + TS 컴파일)
npm run package:ext   # Extension .vsix 패키징 (루트에 생성)

# 테스트
npm run test          # watch 모드
npm run test:run      # 1회 실행

# 서버 시작
start-server.bat      # Windows 배치파일
```

---

## 주요 파일 위치

| 용도 | 파일 |
|-----|------|
| 메인 앱 | `packages/client/src/App.tsx` |
| 스펙 에디터 | `packages/client/src/Spec.tsx` |
| API 클라이언트 | `packages/client/src/utils/api.ts` |
| Figma API | `packages/client/src/utils/figma-api.ts` |
| XML 변환 (공유, 현재 미사용) | `packages/client/src/utils/convert-xml.ts` |
| XML 변환 (에디터, **실제 출력 생성**) | `packages/client/src/components/ConvertedCodeEditor.tsx` |
| 인라인 스타일 | `packages/client/src/utils/figma-style.ts` |
| 클라이언트 설정 | `packages/client/src/config/index.ts` |
| 커스텀 다이얼로그 | `packages/client/src/contexts/DialogContext.tsx` |
| 백엔드 서버 | `packages/server/src/index.ts` |
| 클러스터 로직 | `packages/server/src/cluster-store.ts` |
| DB 스키마 | `packages/server/src/db.ts` |
| Extension 진입점 | `packages/extension/src/extension.ts` |
| Preview Server | `packages/extension/src/preview-server.ts` |

---

## 환경 설정

### 서버 (packages/server/config/server.env)
```env
PORT=5181
HOST=0.0.0.0
CORS_ORIGINS=*
ANTHROPIC_API_KEY=sk-ant-...
```

### 클라이언트 (packages/client/public/config.json)
```json
{
  "serverHost": "",
  "serverPort": 5181,
  "appTitle": "AICraft Figma Viewer",
  "enableDebugJson": false
}
```

### Extension (VS Code 설정)
- `aicraftFigma.serverHost` — 서버 호스트 (기본: localhost)
- `aicraftFigma.serverPort` — 서버 포트 (기본: 5181)

### WebSquare 프로젝트 (.vscode/settings.json)
```json
{
  "config.properties.main": {
    "ContextRoot": "/",
    "DeploySource": "/WebContent"
  }
}
```

---

## 웹 vs Extension 차이

| 기능 | 웹 | Extension |
|------|:---:|:---:|
| 프로젝트 관리 | 대시보드 UI | 사이드바 TreeView |
| XML 저장 | 서버 exportPath | 서버 exportPath |
| 미리보기 | Vite 서빙 | Preview Server (내장) |
| CSS 파일 선택 | input file (내용 복사) | VS Code 다이얼로그 (상대경로 + link) |
| confirm/alert | 브라우저 네이티브 | 커스텀 다이얼로그 |
| 위젯 XML 로드 | 불가 | Preview Server → 워크스페이스 |
| DeploySource | 불가 | .vscode/settings.json 자동 읽기 |

---

## 작업 시 주의사항

1. **figma_file_data 이중 용도**: 사용자 편집본 + refresh 비교 기준. shape 불일치 주의
2. **synthetic file**: 파일 선택 시 displayRoot를 synthetic wrapper로 감싸서 렌더. DB 저장 시 synthetic이 아닌 displayRoot 자체를 저장해야 함
3. **SVG 이미지**: Claude API는 SVG 처리 불가 → 자동매핑/스펙생성 시 canvas로 PNG 변환 후 전달
4. **Extension webview sandbox**: confirm/alert 차단, iframe 중첩 제한
5. **widgetContainer**: widgetItem/Title/Content는 가상 컴포넌트 (XML 출력 X, 데이터 추출용)
6. **변환 로직 이중화**: `convert-xml.ts`와 `ConvertedCodeEditor.tsx` 인라인 `traverse`가 중복. 변환 동작 수정 시 **실제 출력을 만드는 `ConvertedCodeEditor.tsx`** 를 고쳐야 함 (한쪽만 고치면 반영 안 됨)
7. **커스텀 속성 `label`**: 버튼류(button/span/trigger/anchor)는 커스텀 `label`이 Figma 텍스트보다 우선(덮어쓰기)
8. **전역 Space 패닝**: input 포커스 시 비활성화됨(`FigmaViewer.tsx isTypingTarget`). 새 전역 키 핸들러 추가 시 입력 포커스 가드 주의

---

*마지막 업데이트: 2026-06-30 (미리보기 디바이스 비율, 공백 입력 수정, 버튼 label 덮어쓰기, CSS 검색 완전일치 정렬)*
