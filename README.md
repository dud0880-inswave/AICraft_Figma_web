# Figma Viewer

Figma 파일을 WebSquare 컴포넌트로 변환하는 도구입니다.

## 기능

- Figma 파일/노드 불러오기
- 노드 트리 탐색 및 선택
- WebSquare 컴포넌트 매핑
- XML 코드 자동 생성
- 클러스터 기반 자동 매핑 제안

## 시작하기

### 설치

```bash
npm install
```

### 환경 설정

프로젝트 루트에 `.env` 파일을 생성하여 서버 설정을 관리할 수 있습니다:

```bash
# .env 파일 예시
PORT=5181                    # 서버 포트 (기본값: 5181)
ENABLE_DEBUG_JSON=false      # 디버깅 JSON 생성 활성화 (기본값: false)
```

`.env.example` 파일을 참고하여 설정하세요.

### 실행

```bash
# 프론트엔드 + 백엔드 동시 실행
npm run dev:all

# 또는 개별 실행
npm run dev      # 프론트엔드 (localhost:5180)
npm run server   # 백엔드 (localhost:5181)
```

서버 시작 시 다음 로그를 통해 설정을 확인할 수 있습니다:
```
[Server] Figma Viewer API running on http://localhost:5181
[Server] Debug JSON generation: DISABLED
```

### Figma Access Token

1. Figma 설정 > Account > Personal access tokens에서 토큰 생성
2. 앱 설정에서 토큰 입력

## 기술 스택

- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, better-sqlite3, dotenv
- **API**: Figma REST API

## 프로젝트 구조

```
├── src/                 # 프론트엔드 소스
│   ├── components/      # React 컴포넌트
│   ├── utils/           # API 클라이언트, 유틸리티
│   └── types/           # TypeScript 타입 정의
├── server/              # 백엔드 소스
│   ├── index.ts         # HTTP 서버
│   ├── db.ts            # SQLite 초기화
│   └── *-store.ts       # 데이터 스토어
└── data/                # SQLite DB 파일 (gitignore)
```

## 자동 매핑 기능

### 클러스터 기반 매칭

시스템은 두 가지 모드로 클러스터를 생성하여 정확한 매핑을 제공합니다:

**1. Base 모드 (구조 매칭)**
- componentProperties의 키 구조만 사용
- 부모 노드 정보 포함
- 일반적인 패턴 매칭에 사용
- 공통으로 사용된 클래스만 적용 (빈도 = 샘플 수)

**2. Full 모드 (정확한 변형 매칭)**
- componentProperties의 VARIANT 값 포함 (TEXT 값 제외)
- 노드 단독으로 시그니처 생성
- 동일한 변형(variant)을 가진 노드 매칭
- 가장 많이 사용된 클래스 조합 적용

### 클래스 조합 빈도 추적

클래스는 조합 단위로 추적되어 정확한 스타일을 유지합니다:

```json
// 클래스 빈도 예시
{
  "badge list info": 3,    // 3회 사용
  "badge list succ": 1     // 1회 사용
}
```

가장 많이 사용된 조합이 자동으로 적용됩니다.

### 사용 방법

1. 파일 A에서 노드 매핑 후 "완료" 클릭 → 클러스터 생성
2. 새 파일 추가 시 동일 구조 노드 자동 감지
3. 자동 매핑 제안 모달에서 선택 적용

### 디버깅

`.env` 파일에서 `ENABLE_DEBUG_JSON=true`로 설정하면 자동 매핑 실행 시 `signature-debug-{timestamp}.json` 파일이 생성되어 매칭 과정을 확인할 수 있습니다.
