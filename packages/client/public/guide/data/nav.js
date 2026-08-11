// 사이드바 목차 — 파트(로마숫자) > 챕터(=한 페이지)
window.NAV = [
  {
    part: 'I', title: '시작하기',
    chapters: [
      { no: 1, id: 'intro',      title: '이 가이드는 무엇인가', ready: true },
    ],
  },
  {
    part: 'II', title: '반드시 지켜야 할 4가지',
    chapters: [
      { no: 2, id: 'naming',     title: '레이어 이름', ready: true },
      { no: 3, id: 'class',      title: '클래스', ready: true },
      { no: 4, id: 'structure',  title: '구조', ready: true },
      { no: 5, id: 'autolayout', title: '크기와 오토레이아웃', ready: true },
    ],
  },
  {
    part: 'III', title: '컴포넌트별 제작 규칙',
    chapters: [
      { no: 6,  id: 'layout',    title: '레이아웃', ready: true },
      { no: 7,  id: 'title',     title: '제목·경로', ready: true },
      { no: 8,  id: 'schbox',    title: '조회영역', ready: true },
      { no: 9, id: 'tab',       title: '탭', ready: true },
      { no: 10, id: 'tblbox',    title: '입출력 테이블', ready: true },
      { no: 11, id: 'grid',      title: '그리드', ready: true },
      { no: 12, id: 'tree',      title: '트리', ready: true },
      { no: 13, id: 'button',    title: '버튼·트리거', ready: true },
      { no: 14, id: 'accordion', title: '아코디언', ready: true },
      { no: 15, id: 'form',      title: '입력폼', ready: true },
      { no: 16, id: 'calendar',  title: '캘린더', ready: true },
      { no: 17, id: 'schedule',  title: '스케쥴 캘린더', ready: true },
      { no: 18, id: 'widget',    title: '그 밖의 컴포넌트', ready: true },
    ],
  },
  {
    part: 'IV', title: '확인과 문제 해결',
    chapters: [
      { no: 19, id: 'checklist', title: '넘기기 전 체크리스트', ready: true },
      { no: 20, id: 'symptoms',  title: '증상별 원인 찾기', ready: true },
    ],
  },
  {
    part: 'V', title: '부록',
    chapters: [
      { no: 21, id: 'appendix',  title: '부록', ready: true },
    ],
  },
];
