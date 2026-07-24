# 데이터 관리 현황

AICraft Figma의 모든 영속 데이터가 어디에, 어떤 형태로 저장되는지 정리한 문서.
(기준: 2026-07-24, `f46634f` + 웹 다운로드 폴백 + 개인 설정 DB 이관 작업분)

> **2026-07-24 변경**: 구 개인 설정 5종(figma-token, xml-export-path, xml-export-ws-folder,
> css-list, css-class-mapping)을 VS Code settings.json에서 **서버 DB `settings` 테이블로 이관**.
> 전제: 1프로젝트 = 1사용자 운영. 기존 settings.json 값은 프로젝트 진입/설정 열기 시
> 1회 자동 마이그레이션됨 (`api.ts migratePersonalSettingsToDb` — DB에 없는 키만 올림).

## 저장소 한눈에 보기

| # | 저장소 | 위치 | 성격 | 웹 | Extension |
|---|---|---|---|:---:|:---:|
| 1 | 서버 SQLite DB | `packages/server/data/figma-viewer.db` | 프로젝트 데이터 + 전체 설정 | ✅ | ✅ |
| 2 | 서버 파일시스템 | `packages/server/data/images/` | SVG 이미지 캐시 | ✅ | ✅ |
| 3 | VS Code settings.json | `%APPDATA%\Code\User\settings.json` | (레거시) 구 개인 설정 — 마이그레이션 소스로만 사용 | ❌ | ✅ |
| 4 | 브라우저 localStorage | 브라우저별 | UI 상태 | ✅ | ✅(webview) |
| 5 | 사용자 워크스페이스 | 사용자가 지정한 폴더 | 산출물 (XML/스펙) | ⬇️ 다운로드 | ✅ |
| 6 | 정적 설정 파일 | `config.json`, `server.env` | 배포 설정 | ✅ | ✅ |

---

## 1. 서버 SQLite DB (`figma-viewer.db`)

- 초기화: `packages/server/src/db.ts` (WAL 모드, `CREATE TABLE IF NOT EXISTS`)
- 접근: 서버 REST API (`packages/server/src/index.ts`) → 클라이언트 `utils/api.ts`
- 테이블별 store 모듈: `packages/server/src/*-store.ts`
- **같은 서버를 쓰는 모든 사용자가 공유** (extension `setServerUrl`로 원격 서버 지정 가능)

| 테이블 | 내용 | 키 |
|---|---|---|
| `projects` | 프로젝트 목록 | id |
| `settings` | 프로젝트별 key-value 설정 (아래 키 목록 참조) | (project_id, key) |
| `registry` | WebSquare 컴포넌트 목록 (name, tagName, properties JSON) | (project_id, name) |
| `default_mapping_rules` | 키워드 → 컴포넌트 기본 매핑 규칙 | (project_id, keyword) |
| `figma_files` | 불러온 Figma 파일/노드 (version, completed, xmlFilename 포함) | (project_id, fileKey, nodeId) |
| `node_mappings` | Figma 노드 ↔ 컴포넌트 매핑 (custom_attrs JSON) | (project_id, fileKey, rootNodeId, nodeId) |
| `mapping_clusters` | 자동 매핑용 시그니처 클러스터 (variant_mode는 런타임 마이그레이션) | (project_id, signature) |
| `figma_file_data` | Figma 노드 트리 원본 JSON 캐시 | (project_id, fileKey, nodeId) |

특이사항: FK 제약 없음(연쇄 삭제는 앱 코드 책임), 스키마 버전 관리 없음, JSON은 TEXT 저장.

### `settings` 테이블에 실제로 저장되는 키

| 키 | 내용 | 쓰는 곳 |
|---|---|---|
| `cluster-include-node-name` | 클러스터 시그니처에 노드명 포함 여부 | SettingsModal |
| `enable-inline-style` | XML 변환 시 인라인 스타일 생성 여부 | SettingsModal |
| `spec-url-map` | 스펙문서(설계서) URL ↔ 원본 파일 연결 맵 (JSON) | Dashboard, Spec |
| `spec-meta-<fileKey>-<nodeId>` | 스펙 화면별 메타 태그 매핑 (JSON) | Spec |
| `spec-mark-target-<fileKey>-<nodeId>` | 스펙 화면별 마크 대상 (JSON) | Spec |
| `figma-token` | Figma 개인 액세스 토큰 (구 개인 설정에서 이관) | App, Spec, Dashboard, AddFileModal, SettingsModal |
| `xml-export-path` | XML/스펙 저장 경로 — extension에서만 의미 있음 | ConvertedCodeEditor, Spec, SettingsModal |
| `xml-export-ws-folder` | VS Code 워크스페이스 폴더명 — extension에서만 의미 있음 | ConvertedCodeEditor, Spec, SettingsModal |
| `css-list` | CSS 파일 목록. 웹은 `assetPath`(서버 에셋) 사용, 직접 입력분은 `content`, extension은 `filePath`(로컬) — 셋이 공존 | SettingsModal, MappingEditor, ConvertedCodeEditor |
| `css-class-mapping` | 컴포넌트별 CSS 클래스 바인딩 | SettingsModal, MappingEditor |

## 2. 서버 파일시스템 (`data/images/`, `data/assets/`)

- `data/images/<projectId>/<figma_files.id>` — 파일 등록/refresh 시 Figma에서 받은 SVG 원본 저장 (`index.ts:604`)
- DB의 `figma_files`와 1:1. 프로젝트/파일 삭제 시 함께 삭제되는지는 앱 코드에 의존
- `ENABLE_DEBUG_JSON=true`면 자동매핑 디버그 JSON도 생성

### `data/assets/<projectId>/` — 업로드한 CSS/이미지 (2026-07-24 추가)

웹에서 CSS 등록 시 파일을 서버에 업로드하고, 미리보기가 서버 URL로 다이나믹 로드하는 구조.
로컬 파일 의존을 제거해 웹에서 CSS + 참조 이미지가 그대로 표시된다.

```
data/assets/<projectId>/
  ├─ css/<파일명>.css          # 등록한 CSS
  └─ images/<상대구조>/...      # CSS url()이 참조하는 이미지 (폴더 구조 유지)
```

라우트 (`index.ts` `/api/assets/` prefix 핸들러):
| 메서드 | 경로 | 동작 |
|---|---|---|
| POST | `/api/assets/<projectId>/<relPath>` | raw body 업로드 (파일 1개) |
| GET | `/api/assets/<projectId>?list=1` | 상대경로 목록(JSON) |
| GET | `/api/assets/<projectId>/<relPath>` | 정적 서빙 (확장자로 Content-Type 결정) |
| DELETE | `/api/assets/<projectId>/<relPath>` | 파일 삭제 |
| DELETE | `/api/assets/<projectId>` | 프로젝트 에셋 전체 삭제 |

- 디렉터리 탈출 차단(`getAssetPath` — `..`/절대경로 거부, baseDir 밖 접근 404)
- **url() 해석**: CSS를 `/api/assets/<pid>/css/x.css`에서 `<link>`로 로드하면, 내부 `url(../images/..)`가 서버 기준으로 해석됨 → 이미지를 `images/` 하위에 같은 상대구조로 올리면 자동 매칭. **root-absolute `url(/images/..)`는 해석 안 됨**(서버 루트로 감) — 상대경로 CSS 전제
- 미리보기 연결: `ConvertedCodeEditor`가 `css-list`의 `assetPath` 항목을 `assetUrl()`로 변환해 `cssPaths`로 전달, `preview.html`이 절대/상대 URL 구분해 `<link>` 주입
- 이미지 업로드 UI: SettingsModal CSS 탭 (개별 `image/*` 다중 + 폴더 전체 `webkitdirectory`, 웹 전용)

## 3. VS Code settings.json — (레거시) 구 개인 설정

**2026-07-24부로 읽기 전용 레거시.** 5개 키 전부 서버 DB `settings` 테이블로 이관됐고,
settings.json은 마이그레이션 소스로만 남아 있다.

- 이력: 원래 서버 DB에 있던 5개 키를 `a47929c`(2026-04-29)에서 settings.json으로 뺐다가,
  웹 버전 지원 + 관리 일원화를 위해 다시 DB로 복귀 (1프로젝트 = 1사용자 전제)
- 마이그레이션: extension 환경에서 프로젝트 진입/설정 열기 시 `migratePersonalSettingsToDb()`가
  settings.json 값 중 DB에 없는 키만 1회 업로드 (`utils/api.ts`)
- extension host의 `getPersonalSettings`/`savePersonalSettings` 핸들러(`extension.ts:398-417`)와
  `aicraftFigma.personalSettings` 설정 키는 마이그레이션 지원을 위해 유지
- 마이그레이션이 안정화되면 핸들러/설정 키 제거 가능

extension 자체 설정 (여전히 settings.json):
- `aicraftFigma.serverHost` / `aicraftFigma.serverPort` — 접속할 서버 주소 (`setServerUrl` 명령으로 변경)

## 4. 브라우저 localStorage

| 키 | 내용 | 위치 |
|---|---|---|
| 테마 (`THEME_STORAGE_KEY`) | 라이트/다크 모드 | `contexts/ThemeContext.tsx:17-22` |

## 5. 산출물 (XML / 스펙 문서 3종)

DB에 저장되지 않는 최종 결과물. 저장 위치가 환경에 따라 다름:

| 환경 | 동작 |
|---|---|
| Extension | `xml-export-path` 기준 `<경로>/<파일명>/v<NN>/` 폴더에 저장 (extension host `saveFile` 핸들러) |
| 웹 | 브라우저 다운로드 (`utils/webDownload.ts`) — XML은 `<파일명>.xml`, 스펙은 `<폴더명>_v<NN>_<파일명>` |

- XML: `ConvertedCodeEditor.tsx` `doExportXml`
- 스펙 3종 (screen-info.md / test-plan.md / interface-metadata.json): `Spec.tsx`
- 버전(v01, v02…)은 DB `figma_files.version`이 원본, 이전 버전 스펙 조회는 extension이 워크스페이스 파일을 읽음 (`readPriorSpecs` — 웹에서는 빈 배열)

## 6. 정적 설정 파일

| 파일 | 내용 |
|---|---|
| `packages/client/public/config.json` | serverHost/serverPort(API 주소), appTitle, enableDebugJson — 클라이언트 런타임 로드 |
| `packages/server/config/server.env` | PORT, HOST, CORS_ORIGINS, DB_PATH, LLM_BASE_URL/API_KEY/MODEL(LiteLLM), ENABLE_DEBUG_JSON |

## 토큰 흐름 (참고)

- 저장: 서버 DB `settings` 테이블 (`figma-token` 키, 프로젝트당 1개)
- 사용: 클라이언트가 설정 API로 토큰을 읽어 `x-figma-token` 헤더로 Figma 프록시(`/api/figma-proxy/*`)에 전달, 서버는 중계 (`index.ts:142-146`)

---

## 알려진 문제점 / 운영 전제

1. **1프로젝트 = 1사용자 전제** — `settings` 테이블에 사용자 구분이 없으므로, 여러 사람이 같은
   프로젝트를 쓰면 토큰/경로를 서로 덮어쓴다. 이 전제는 시스템이 강제하지 않는 팀 규칙이다.
   공유가 필요해지면 settings에 사용자 차원을 추가해야 한다.
2. **토큰이 서버 DB에 평문 저장** — 서버 API에 인증이 없으므로(CORS `*`, HOST `0.0.0.0`)
   네트워크 접근이 곧 토큰 접근. 사내망 + 저권한 토큰 전제로 수용한 리스크.
   DB 파일 백업/공유(data.7z 등) 시 토큰이 포함됨에 유의.
3. **DB 교체 = 설정 리셋** — DB 파일을 갈아끼우면 토큰/경로/CSS 설정도 함께 교체된다.
   (역으로 DB 파일 하나로 환경 전체 백업/이전 가능)
4. **경로 키는 여전히 머신 종속** — PC를 옮기면 `xml-export-path`/`ws-folder` 재설정 필요.
5. **`fetchProjectSettings`가 전체 키 반환** — css-list content가 커지면 설정 조회 페이로드가
   커진다. 필요 시 키 단위 조회 API 또는 css content 분리 검토.
6. **DB 무결성 장치 부재** — FK 제약/스키마 버전 관리 없음.
7. **레거시 stripped css-list** — a47929c~이관 사이에 저장된 css-list는 filePath 항목의
   content가 비어 있음. extension에서 CSS 설정을 한 번 다시 저장하면 content가 채워진다.
