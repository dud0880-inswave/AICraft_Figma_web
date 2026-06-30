# 컴포넌트 이름 매핑 기본규칙

Figma 노드 이름에 특정 키워드가 포함되어 있으면 해당 WebSquare 컴포넌트로 자동 매핑하는 규칙입니다.

- **정의 위치**: `packages/server/src/default-mapping-rules-store.ts`
- **UI 편집**: `packages/client/src/components/MappingEditor.tsx`

## 기본 규칙 (INITIAL_RULES)

| WebSquare 컴포넌트 | 매칭 키워드 |
|---|---|
| `anchor` | anchor, 앵커 |
| `button` | button, 버튼 |
| `checkbox` | checkbox, 체크박스 |
| `gridview` | gridview, grid, 그리드뷰, 그리드 |
| `group` | group, 그룹 |
| `inputcalendar` | inputcalendar, 달력, calendar |
| `input` | inputbox, input, 인풋박스, 인풋, 입력 |
| `multiselect` | multiselect, 다중선택 |
| `pagelist` | pagelist, 페이지리스트 |
| `radio` | radio, 라디오 |
| `searchbox` | searchbox, 서치박스 |
| `select` | select, 셀렉트박스, 선택 |
| `tabcontrol` | tabcontrol, 탭컨트롤, tab, 탭 |
| `table` | table, 테이블 |
| `td` | td |
| `textarea` | textarea |
| `textbox` | textbox, 텍스트박스, text, 텍스트 |
| `th` | th |
| `tr` | tr |
| `image` | image, 이미지, img, 사진 |

## 매칭 동작 방식 (`match()`)

1. **대소문자 무시** — 노드 이름을 `toLowerCase()`로 변환 후 비교
2. **부분 포함(substring) 매칭** — 키워드가 노드 이름에 `includes()`로 포함되면 매칭 (정확히 일치할 필요 없음)
3. **긴 키워드 우선** — `ORDER BY LENGTH(keyword) DESC`로 정렬해 더 구체적인(긴) 키워드를 먼저 매칭 (예: `inputcalendar`가 `input`보다 우선)
4. **첫 매칭 반환** — 가장 먼저 일치하는 컴포넌트의 `registryId` 반환

## 적용 시점·범위

- **프로젝트별로 독립** 관리 (`projectId` 기준)
- 프로젝트 생성 시 `seedForProject()`로 위 규칙이 자동 삽입되며, 해당 프로젝트 registry에 존재하는 컴포넌트에 대해서만 시드됩니다
- `resetForProject()`로 초기 규칙 복원 가능
- UI에서 키워드를 추가/수정/삭제 가능

## 주의사항

긴 키워드 우선 정렬 덕분에 구체적 매칭이 먼저 잡히지만, substring 매칭이라 노드 이름에 의도치 않은 키워드가 섞이면 오매칭될 수 있습니다. (예: 이름에 `text`가 들어가면 `textbox`로 매칭)
