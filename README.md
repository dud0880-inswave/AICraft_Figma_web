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

### 실행

```bash
# 프론트엔드 + 백엔드 동시 실행
npm run dev:all

# 또는 개별 실행
npm run dev      # 프론트엔드 (localhost:5180)
npm run server   # 백엔드 (localhost:5181)
```

### Figma Access Token

1. Figma 설정 > Account > Personal access tokens에서 토큰 생성
2. 앱 설정에서 토큰 입력

## 기술 스택

- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, better-sqlite3
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

1. 파일 A에서 노드 매핑 후 "완료" 클릭 → 클러스터 생성
2. 새 파일 추가 시 동일 구조 노드 자동 감지
3. 자동 매핑 제안 모달에서 선택 적용
