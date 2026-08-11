# 캡처 갱신 방법

Figma 템플릿이 바뀌면 이 폴더의 PNG를 다시 받아야 합니다.

1. Figma MCP가 연결된 세션에서, `data/registry.js`의 각 항목 `figmaNodeId`를 확인합니다.
2. 파일 키 `fmkqvl44khDxBKUB1r9QFh`, 해당 노드 ID로 스크린샷을 요청합니다(`maxDimension: 2048`).
3. 반환된 URL을 `img/<항목 id>.png`로 내려받습니다.
4. `node tools/guide/verify.mjs`로 누락·손상이 없는지 확인합니다.

캡처 대상은 **제목(titbox)이 아니라 본체 노드**입니다. Figma에서 제목과 본체가 형제로 나란히 있어
한 노드로 묶여 있지 않기 때문이며, 제목은 페이지에 텍스트로 들어갑니다.

## 캡처가 여러 장인 항목

`registry.js`의 `capture`는 문자열 하나 대신 **배열**을 받습니다. 상태·변형을 나란히 보여줘야 하는
항목이 그렇습니다. 배열 순서가 화면에 쌓이는 순서입니다.

| 항목 | 파일 | 순서 |
|---|---|---|
| `button` | `button-1.png` ~ `button-4.png` | 기본 / 기본·비활성 / 아이콘 전용 / 아이콘 전용·비활성 |
| `trigger` | `trigger-1.png` ~ `trigger-4.png` | 위와 동일 |
| `grid-noresult` | `grid-noresult.png` · `grid-pagelist.png` | 데이터없음 그리드 / 페이지 목록 |

이 항목들은 `figmaNodeId`가 대표 노드 하나만 담고 있으므로, 나머지 노드 ID는
`captureNote`에 적어 둡니다(예: `1864:8618 · 8710 · 8802 · 8855`).
번호가 붙은 파일은 `-1`부터 시작하고, 중간을 비우지 않습니다.

