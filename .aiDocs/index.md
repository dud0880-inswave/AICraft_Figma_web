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

**AICraft_Figma** = Figma 디자인 → WebSquare XML 변환 도구

---

## 프로젝트 구조 (모노레포)

```
AICraft_Figma/
├── packages/
│   ├── server/              # 백엔드 (독립 배포 가능)
│   │   ├── src/             # TypeScript 소스
│   │   │   ├── index.ts     # HTTP 서버
│   │   │   ├── db.ts        # SQLite 초기화
│   │   │   └── *-store.ts   # 데이터 스토어
│   │   ├── config/          # 환경 설정
│   │   └── data/            # SQLite DB
│   │
│   └── client/              # 프론트엔드 (독립 배포 가능)
│       ├── src/
│       │   ├── components/  # React 컴포넌트
│       │   ├── utils/       # API 클라이언트
│       │   ├── config/      # 런타임 설정
│       │   └── types/       # TypeScript 타입
│       └── public/          # 정적 파일
│
├── package.json             # 워크스페이스 루트
└── README.md
```

---

## 핵심 개념 5가지

| 개념 | 설명 |
|-----|------|
| **시그니처** | 노드 구조(name, type, componentProperties)의 SHA256 해시 |
| **클러스터** | 동일 시그니처 매핑들의 그룹. 자동 매핑 제안에 사용 |
| **Base/Full 모드** | Base: variant key만, Full: variant value 포함 |
| **레지스트리** | 매핑 가능한 WebSquare 컴포넌트 목록 |
| **기본 규칙** | 노드 이름 키워드 매칭 (예: "btn" → Button) |

---

## 자주 쓰는 명령어

```bash
# 개발 (서버 + 클라이언트)
npm run dev

# 개별 실행
npm run dev:server    # 백엔드 (localhost:5181)
npm run dev:client    # 프론트엔드 (localhost:5180)

# 빌드
npm run build         # 전체
npm run build:client  # 클라이언트만
npm run build:server  # 서버만

# 테스트
npm run test          # watch 모드
npm run test:run      # 1회 실행
```

---

## 주요 파일 위치

| 용도 | 파일 |
|-----|------|
| 메인 앱 | `packages/client/src/App.tsx` |
| API 클라이언트 | `packages/client/src/utils/api.ts` |
| 클라이언트 설정 | `packages/client/src/config/index.ts` |
| 백엔드 서버 | `packages/server/src/index.ts` |
| 클러스터 로직 | `packages/server/src/cluster-store.ts` |
| DB 스키마 | `packages/server/src/db.ts` |

---

## 환경 설정

### 서버 (packages/server/config/server.env)
```env
PORT=5181
HOST=0.0.0.0
CORS_ORIGINS=*
```

### 클라이언트 (packages/client/public/config.json)
```json
{
  "serverHost": "192.168.0.100",
  "serverPort": 5181
}
```

---

## 독립 배포

### 서버
```bash
# packages/server 폴더만 복사
cd /path/to/server
npm install
npm run start
```

### 클라이언트
```bash
cd packages/client
npm run build
# dist/ 폴더 배포
```

---

## 작업 시 주의사항

1. **CLAUDE.md 규칙 준수**: 모든 대화/코드 변경은 work-tracker로 기록
2. **테스트 확인**: 코드 수정 후 `npm run test:run` 실행
3. **시그니처 변경 주의**: cluster-store.ts 수정 시 기존 클러스터 무효화 가능
4. **프로젝트 격리**: 모든 데이터는 project_id로 분리됨

---

*마지막 업데이트: 2026-04-06 (refresh auto-mapping 개선, 리팩토링)*
