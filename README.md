# AICraft Figma Viewer

Figma 파일을 WebSquare 컴포넌트로 변환하는 도구입니다.

## 기능

- Figma 파일/노드 불러오기
- 노드 트리 탐색 및 선택
- WebSquare 컴포넌트 매핑
- XML 코드 자동 생성
- 클러스터 기반 자동 매핑 제안

## 프로젝트 구조 (모노레포)

```
AICraft_Figma/
├── packages/
│   ├── server/           # 백엔드 (독립 배포 가능)
│   │   ├── src/          # TypeScript 소스
│   │   ├── config/       # 환경 설정 (server.env)
│   │   ├── data/         # SQLite DB (자동 생성)
│   │   └── package.json
│   │
│   └── client/           # 프론트엔드 (독립 배포 가능)
│       ├── src/          # React 소스
│       ├── public/       # 정적 파일
│       └── package.json
│
├── package.json          # 워크스페이스 루트
└── README.md
```

## 시작하기

### 설치

```bash
npm install
```

### 실행 (개발)

```bash
# 서버 + 클라이언트 동시 실행
npm run dev

# 개별 실행
npm run dev:server   # 백엔드 (localhost:5181)
npm run dev:client   # 프론트엔드 (localhost:5180)
```

### 빌드

```bash
# 전체 빌드
npm run build

# 개별 빌드
npm run build:server
npm run build:client
```

### 테스트

```bash
npm run test
```

## 환경 설정

### 서버 설정 (packages/server/config/server.env)

```env
PORT=5181
HOST=0.0.0.0
CORS_ORIGINS=*
ENABLE_DEBUG_JSON=false
```

### 클라이언트 설정 (packages/client/public/config.json)

```json
{
  "serverHost": "192.168.0.100",
  "serverPort": 5181,
  "appTitle": "AICraft Figma Viewer"
}
```

- `serverHost`: 빈 문자열이면 상대 경로 사용 (개발용)
- `serverPort`: API 서버 포트

## 독립 배포

### 서버 배포

```bash
# packages/server 폴더만 복사
scp -r packages/server user@server:/path/to/app

# 서버에서
cd /path/to/app
npm install
npm run start
```

### 클라이언트 배포

```bash
cd packages/client
npm install
npm run build
# dist/ 폴더를 웹서버에 배포
```

## Figma Access Token

1. Figma 설정 > Account > Personal access tokens에서 토큰 생성
2. 앱 설정에서 토큰 입력

## 기술 스택

- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, better-sqlite3, tsx
- **API**: Figma REST API

## 자동 매핑 기능

### 클러스터 기반 매칭

시스템은 두 가지 모드로 클러스터를 생성하여 정확한 매핑을 제공합니다:

**1. Base 모드 (구조 매칭)**
- componentProperties의 키 구조만 사용
- 부모 노드 정보 포함
- 일반적인 패턴 매칭에 사용

**2. Full 모드 (정확한 변형 매칭)**
- componentProperties의 VARIANT 값 포함
- 노드 단독으로 시그니처 생성
- 동일한 변형(variant)을 가진 노드 매칭

### 사용 방법

1. 파일 A에서 노드 매핑 후 "완료" 클릭 → 클러스터 생성
2. 새 파일 추가 시 동일 구조 노드 자동 감지
3. 자동 매핑 제안 모달에서 선택 적용
