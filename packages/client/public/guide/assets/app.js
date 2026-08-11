// 가이드 사이트 렌더러 — 해시 라우팅 · 사이드바 · 우측 TOC · 검색
// 빌드 없이 file:// 에서 동작한다 (데이터는 .js 전역, fetch 안 씀)

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CHAPTERS = NAV.flatMap(p => p.chapters.map(c => ({ ...c, part: p })));
const chapterById = id => CHAPTERS.find(c => c.id === id);
const itemsOf = no => REGISTRY.filter(r => r.chapter === no).sort((a, b) => a.index - b.index);

/* ---------------- 사이드바 ---------------- */
function renderSide(activeId) {
  const nav = $('#nav');
  nav.innerHTML = NAV.map(p => `
    <div class="part">파트 ${p.part}. ${p.title}</div>
    ${p.chapters.map(c => `
      <a href="#/${c.id}" class="${c.id === activeId ? 'on' : ''}${c.ready ? '' : ' todo'}">
        <span class="no">${c.no}.</span>${c.title}${c.ready ? '' : ' <span style="font-size:11px">(가안 미작성)</span>'}
      </a>`).join('')}
  `).join('');
}

/* ---------------- 검색 ---------------- */
function search(q) {
  const box = $('#hits');
  q = q.trim().toLowerCase();
  if (!q) { box.innerHTML = ''; $('#nav').style.display = ''; return; }
  $('#nav').style.display = 'none';

  const hits = [];
  for (const c of CHAPTERS) {
    if (c.title.toLowerCase().includes(q)) hits.push({ href: `#/${c.id}`, label: `${c.no}. ${c.title}`, sub: `파트 ${c.part.part}` });
  }
  // 제목 + 요약 + 주의사항까지 인덱싱 (제목만 보면 "버튼이 사라짐" 같은 걸로 못 찾는다)
  for (const r of REGISTRY) {
    const hay = [r.name, r.summary, ...(r.pitfalls || []), ...(r.limits || [])].join(' ').toLowerCase();
    if (hay.includes(q)) {
      const c = CHAPTERS.find(x => x.no === r.chapter);
      hits.push({ href: `#/${c.id}#${r.id}`, label: `${r.chapter}.${r.index} ${r.name}`, sub: '컴포넌트' });
    }
  }
  box.innerHTML = hits.length
    ? hits.map(h => `<a href="${h.href}">${h.label}<br><span class="sub">${h.sub}</span></a>`).join('')
    : '<div class="none">결과 없음</div>';
}

/* ---------------- 항목의 「완성 모습」 ----------------
   프레임 안쪽(live/*.html)도 가이드와 같은 테마로 그린다.
   조각 문서의 head 스크립트가 #dark 해시를 보고 <html class="dark">를 걸면,
   정본 CSS의 :root.dark → color-scheme:dark → light-dark() 토큰이 통째로 뒤집힌다.
   해시로 넘기는 이유는 **첫 페인트 전에** 정해져야 흰 화면이 번쩍이지 않기 때문이다.
   (테마를 바꾼 뒤에는 아래 pushLiveTheme 이 postMessage 로 알려 다시 읽지 않고 갈아 끼운다) */
function liveTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}
/* 조각 폴더 — 모바일판(index-mobile.html)이 'live-m/' 를 주입한다.
   두 페이지가 이 파일 한 벌을 공유하므로 경로만 밖에서 정하고 로직은 같이 쓴다. */
const LIVE_DIR = window.GUIDE_LIVE_DIR || 'live/';
/* 모바일판 표식 — data-m/pages.js 가 켠다(index-mobile.html 은 손대지 않는다).
   PC 페이지에는 이 값이 없으므로 아래 분기는 전부 PC 쪽 문장을 그대로 쓴다. */
const IS_MOBILE = !!window.GUIDE_MOBILE;
function liveSrc(path) {
  return path + (liveTheme() === 'dark' ? '#dark' : '');
}
function pushLiveTheme() {
  const t = liveTheme();
  for (const f of document.querySelectorAll('.liveframe iframe')) {
    try { f.contentWindow.postMessage({ fxTheme: t }, '*'); } catch (e) {}
  }
}

/* ---------------- 항목의 「완성 모습」 ---------------- */
// 정본 XML을 실제로 렌더해 둔 조각이 있으면 iframe으로, 없으면 Figma 캡처로 보여준다.
// file://에서는 iframe이 교차 출처라 안쪽 높이를 잴 수 없어 추출 때 잰 값을 쓴다.
function renderShot(r) {
  const L = window.LIVE || {};
  const h = (L.h || {})[r.id];
  const run = (L.run || {})[r.id];
  if (h) return `
    <div class="liveframe" id="lf-${r.id}" style="height:${h}px">
      <iframe src="${liveSrc(LIVE_DIR + r.id + '.html')}" title="${esc(r.name)} 변환 결과" scrolling="no"></iframe>
    </div>
    <p class="livecap"><span>정본 XML을 WebSquare로 렌더한 화면입니다${IS_MOBILE ? ' — 완성 모습은 다크 모드에서도 항상 라이트 화면으로 보여 줍니다' : ''}</span>${run ? `
      <button type="button" class="livego" data-id="${r.id}" data-h="${run}">직접 조작해 보기</button>` : ''}
      <a href="${LIVE_DIR}${r.id}.html" target="_blank" rel="noopener">새 창에서 보기</a></p>`;
  const shots = Array.isArray(r.capture) ? r.capture : (r.capture ? [r.capture] : []);
  if (!shots.length) return `
    <div class="note">이 항목은 살아 있는 화면도 Figma 캡처도 없어 완성 모습을 싣지 못했습니다.</div>`;
  return `${shots.map(src => `
      <figure>
        <div class="shot"><img src="${src}" alt="${esc(r.name)} 캡처"></div>
      </figure>`).join('')}
    <p class="livecap"><span class="hint">클릭하면 팝업으로 크게 보기</span></p>`;
}

/* ---------------- 항목(7칸) ---------------- */
function renderItem(r) {
  if (r.stub) return `
    <h2 id="${r.id}">${r.chapter}.${r.index} ${esc(r.name)}</h2>
    <p class="lead">${r.summary}</p>
    <div class="todo-box">가안에서는 이 항목을 채우지 않았습니다.</div>`;

  const metricKeys = r.metrics ? Object.keys(r.metrics[0]) : [];
  return `
    <h2 id="${r.id}">${r.chapter}.${r.index} ${esc(r.name)}</h2>
    <p class="lead">${r.summary}</p>

    <h3>완성 모습</h3>
    ${renderShot(r)}

    <h3>만드는 법</h3>
    <pre>${esc(r.build.tree)}</pre>
    <ul class="pts">${r.build.points.map(p => `<li><b>${p.t}</b><br>${p.d}</li>`).join('')}</ul>

    <h3>주의사항</h3>
    <ul class="pts">${r.pitfalls.map(p => `<li>${p}</li>`).join('')}</ul>

    <h3>표현할 수 없는 것</h3>
    <ul class="pts">${r.limits.map(p => `<li>${p}</li>`).join('')}</ul>

    <details>
      <summary>변환 결과 XML</summary>
      ${r.xmlOut.note ? `<div class="note">${r.xmlOut.note}</div>` : ''}
      <pre>${esc(r.xmlOut.code)}</pre>
      <ul class="pts">${r.xmlOut.points.map(p => `<li>${p}</li>`).join('')}</ul>
    </details>

    <details>
      <summary>템플릿 룩 스펙</summary>
      ${r.metrics ? `<div class="tblwrap"><table>
        <tr>${metricKeys.map(k => `<th>${k}</th>`).join('')}</tr>
        ${r.metrics.map(m => `<tr>${metricKeys.map(k => `<td>${m[k]}</td>`).join('')}</tr>`).join('')}
      </table></div>` : ''}
      <p class="quiet" style="font-size:11px;margin:0">${IS_MOBILE
        ? '본문 글꼴 16px(정본 14px) · <code>tit_main</code> 정본 18px / 화면 16px · <code>tit_sub</code> 화면 16px · 색은 라이트 모드 값'
        : '글꼴 12px · <code>tit_main</code> 14px · <code>tit_sub</code> 12px · 색은 라이트 모드 값'}</p>
    </details>`;
}

/* ---------------- 부록: 표준 클래스 표 ---------------- */
function renderClassTable() {
  const layers = (window.CLASSES && window.CLASSES.layers) || [];
  if (!layers.length) return '<p class="lead">클래스 데이터가 없습니다.</p>';
  return `<div class="tblwrap"><table class="clstbl">
    <tr><th>층</th><th>값</th><th>설명</th></tr>
    ${layers.map(l => `<tr>
      <th scope="row">${l.layer}</th>
      <td>${l.values.map(v => `<code>${v}</code>`).join(' ')}</td>
      <td>${l.note || ''}</td>
    </tr>`).join('')}
  </table></div>`;
}

/* ---------------- 부록: 컴포넌트 이름 전체표 ---------------- */
const REGISTRY_NAMES = [
  ['그룹·텍스트', [
    ['group', '영역을 감싸는 컨테이너'], ['textbox', '글자를 보여주는 요소'],
    ['span', '구분자·짧은 글자'], ['image', '이미지'], ['anchor', '링크'],
  ]],
  ['버튼', [
    ['button', '버튼 — 배경색은 클래스가 정합니다(13.1)'],
    ['trigger', '트리거 — Figma 채움색이 인라인으로 실립니다(13.2)'],
  ]],
  ['입력 계열', [
    ['input', '입력칸'], ['secret', '비밀번호 입력칸'], ['textarea', '여러 줄 입력칸'],
    ['select', '셀렉트박스'], ['multiselect', '다중선택'],
    ['checkbox', '체크박스'], ['radio', '라디오'],
    ['searchbox', '조회상자'], ['upload', '파일 업로드'], ['spinner', '숫자 증감'],
    ['autocomplete', '자동완성'], ['checkcombobox', '체크 콤보'],
    ['inputcalendar', '날짜 입력칸'], ['calendar', '펼친 달력(16.2)'],
  ]],
  ['표', [
    ['table', '표'], ['tr', '표의 행'], ['th', '표의 라벨셀'], ['td', '표의 값셀'],
  ]],
  ['목록·계층', [
    ['gridview', '그리드(11장)'], ['pagelist', '페이지 목록(11.5)'],
    ['treeview', '트리(12장)'], ['node', '트리 노드'],
  ]],
  ['묶음', [
    ['tabcontrol', '탭(9장)'], ['tabs', '탭 하나'],
    ['accordion', '아코디언(14장)'], ['panels', '아코디언 패널'],
    ['paneltitle', '패널 제목'], ['panelcontent', '패널 본문'],
  ]],
  ['그 밖의 위젯', [
    ['widget', '위젯 컨테이너(18.2)'], ['floatinglayer', '떠 있는 레이어(18.3)'],
    ['schedulecalendar', '스케쥴 캘린더(17.1)'], ['processbar', '진행 단계(18.4)'],
    ['progressbar', '진행바(15.2)'], ['fliptoggle', '토글(15.2)'],
    ['pagecontrol', '페이지컨트롤(15.2)'], ['datepicker', '날짜선택기(15.2)'],
    ['slider', '슬라이더(15.2)'],
  ]],
];
function renderRegistryNames() {
  return `<div class="tblwrap"><table class="clstbl">
    <tr><th>묶음</th><th>이름에 쓰는 값</th><th>무엇인가</th></tr>
    ${REGISTRY_NAMES.map(([g, rows]) => rows.map((r, i) => `<tr>
      ${i === 0 ? `<th scope="row" rowspan="${rows.length}">${g}</th>` : ''}
      <td><code>${r[0]}</code></td><td>${r[1]}</td>
    </tr>`).join('')).join('')}
  </table></div>`;
}

/* ---------------- 대문 ----------------
   문서 머리(제목 · 한 줄 소개 · 칩) 아래에 파트 카드를 세로로 쌓는다.
   카드는 왼쪽부터 파트 순번 · 파트 제목 · 그 파트의 챕터 목록 순이다.
   카드에서 링크는 챕터뿐이다 — 순번·제목은 안내용이라 누를 수 없다. */
function renderHome() {
  const H = window.HOME || {};
  const chapterCount = CHAPTERS.length;
  const itemCount = REGISTRY.filter(r => !r.stub).length;

  const cards = NAV.map((p, i) => `
    <div class="pcard" id="part-${i + 1}">
      <span class="pnum" aria-hidden="true">${i + 1}</span>
      <div class="pttl">${p.title}</div>
      <ul class="pchaps">${p.chapters.map(c => `
        <li><a href="#/${c.id}" class="${c.ready ? '' : 'todo'}"><span class="n">${c.no}</span>${c.title}</a></li>`).join('')}
      </ul>
    </div>`).join('');

  $('#main').innerHTML = `
    <div class="page-head">
      <h1>${H.title || 'WebSquare 변환을 위한 Figma 디자인 가이드'}</h1>
      <p class="lede">${H.lead || ''}</p>
      <div class="chips">
        <span class="chip"><span class="material-icons">design_services</span>Figma 레이어 규칙</span>
        <span class="chip"><span class="material-icons">code</span>WebSquare XML 변환</span>
        <span class="chip"><span class="material-icons">menu_book</span>챕터 ${chapterCount}개</span>
        <span class="chip"><span class="material-icons">widgets</span>컴포넌트 ${itemCount}개</span>
      </div>
    </div>
    <div class="hcards">${cards}</div>
    <!-- 문서를 닫는 브랜드 마크 — 장식이라 스크린리더에서는 감춘다 -->
    <div class="home-logo" aria-hidden="true"><img src="assets/logo-group.svg" alt=""></div>`;
  document.title = 'WebSquare 변환을 위한 Figma 디자인 가이드';
  $('#toc').innerHTML = '';
  document.body.classList.add('home');   // 대문에선 우측 TOC 열 자체를 없앤다
  window.scrollTo({ top: 0 });
}

/* ---------------- 챕터 ---------------- */
const CHAPTER_INTRO = {
  layout: `<p>레이아웃은 화면의 한 영역을 좌우 또는 상하로 분할하는 컨테이너입니다. 그룹 레이어 이름에
  <code>lybox</code> 클래스를 지정하면 분할되며, 방향은 뒤에 이어지는 <code>horizontal</code>/<code>vertical</code> 토큰이 결정합니다.
  네 항목 중 앞의 두 항목(분할·분할(고정))과 뒤의 두 항목(셔틀)은 서로 다른 컴포넌트로 보이지만, 동일한 <code>lybox</code> 구조에
  이동 버튼을 포함한 중앙 패널(<code>ly_btn</code>)이 추가되는 차이만 있습니다.</p>
  <div class="note"><b>방향 클래스를 지정하지 않으면 기본값은 가로입니다.</b> <code>lybox</code>만 지정해도 패널은 가로로 분할됩니다.
  <code>vertical</code>은 방향을 세로로 변경하지만, <code>horizontal</code>은 기본값을 재지정하는 것이 아니라
  간격을 축소하고 중앙 버튼 패널의 전용 스타일을 활성화하는 역할을 합니다.</div>
  <div class="warn"><b>패널 폭은 이름에 클래스를 지정해 결정합니다.</b> 클래스를 지정하지 않은 패널은 균등 분할됩니다 —
  <b>비율은 <code>col_2</code>~<code>col_9</code>, px 고정폭은 <code>col_fix</code></b>를 사용합니다.
  Figma에서 폭만 다르게 작성한 경우 해당 비율은 결과에 반영되지 않으므로, <b>의도한 비율은 이름에 지정해야 합니다.</b></div>`,
  tab: `<p>탭은 하나의 영역을 여러 장으로 분할해 전환하는 컴포넌트입니다. 일곱 개 항목이 있으나 <b>기본 구조는 하나</b>입니다 —
  <code>tbcbox</code> 그룹 › 탭 컨트롤(<code>tbc</code>) › <code>tabhost</code> › <code>tabs</code> 프레임 + 본문(<code>content</code>) 그룹.
  나머지 여섯 항목은 이 구조에서 <b>한 지점만</b> 변경한 형태이므로, 9.1을 먼저 확인한 뒤 나머지는 차이점만 확인합니다.</p>
  <div class="note"><b>변형은 탭 컨트롤이 아니라 상위 그룹 이름이 결정합니다.</b> <code>tbcbox</code> 그룹 이름의
  <b>첫 조각</b>이 <code>scroll</code>이면 스크롤, <code>left</code>·<code>right</code>·<code>bottom</code>이면 탭 위치,
  <code>adaptive</code>면 아코디언으로 처리됩니다. 탭 컨트롤 레이어에 지정하면 적용되지 않습니다.
  단 서브탭은 예외로, 탭 컨트롤의 <b>클래스</b>(<code>tbc_sub</code>)가 결정합니다.</div>
  <div class="warn"><b><code>tabhost</code> 래퍼의 유무에 따라 결과가 완전히 달라집니다.</b>
  탭을 탭 컨트롤 <b>직속</b>에 배치하면 변환기가 어댑티브(아코디언)로 판정하며, <b>어댑티브로 판정되면 탭 위치는 적용되지 않습니다.</b>
  따라서 위치 변형(9.4~9.6)에는 <code>tabhost</code>가 필수이며 어댑티브(9.7)에는 사용하지 않습니다 —
  두 구조는 서로 치환되지 않으며 결과 형태도 다릅니다.</div>
  <div class="note">내부를 자체 방식으로 해석하는 컴포넌트(달력·그리드·트리·아코디언·위젯 등) 중에서
  탭 본문은 <b>작성한 구조가 그대로 유지되는 유일한 위치</b>입니다(4장 참조).
  본문에 표·버튼·그리드를 배치하면 결과에 그대로 반영됩니다. 탭·본문의 <code>id</code>는 변환기가 자동으로 부여합니다.</div>`,
  button: `<p>버튼과 트리거는 <b>형태와 구조가 동일합니다.</b> 클래스 조합(<code>btn_cm</code> → 변형 → <code>icon</code> → <code>disabled</code>),
  아이콘을 클래스가 결정하는 방식, 내부에 텍스트 레이어 하나를 배치하는 방식까지 같습니다. 이름의 <b>두 번째 조각</b>이
  <code>button</code>인지 <code>trigger</code>인지에 따라 구분됩니다.</p>
  <div class="warn"><b>차이는 하나입니다 — 배경색의 결정 주체.</b>
  <b>버튼은 클래스(CSS)가, 트리거는 Figma에서 지정한 채움색이 결정합니다.</b> 트리거는 해당 색상이 인라인으로 출력되어 CSS보다 우선 적용되기 때문입니다.
  따라서 강조 버튼은 <code>fill</code> 토큰으로 작성하고, <b>트리거는 비활성 등 상태별 색상까지 Figma에서 구분해 지정</b>해야 합니다.
  두 컴포넌트는 형태가 동일해 캡처로 구분되지 않으며, 레이어 이름으로만 식별됩니다.</div>
  <div class="note"><b>적용할 아이콘은 클래스가 결정합니다.</b> 변형 토큰(<code>search</code>·<code>save</code> 등)을
  이름에 지정해야 결과 화면에 해당 아이콘이 적용됩니다. <b>Figma에는 아이콘을 작성합니다</b> — 결과에 출력되지 않는 것과
  작성하지 않아도 되는 것은 별개입니다(부록 21.5).
  아이콘 전용 버튼은 <code>icon</code> 토큰을 지정하고 <b>텍스트 레이어를 배치하지 않습니다.</b></div>
  <div class="note"><b>상태는 클래스가 아니라 속성으로 출력됩니다.</b> 이름에 <code>disabled</code>를 지정하면 결과에
  <code>disabled="true"</code>가 추가되고 <b>클래스에서는 제외됩니다.</b>
  <b>단 버튼·트리거가 처리하는 상태는 <code>disabled</code> 하나입니다</b> —
  <code>req</code>·<code>error</code>·<code>readonly</code>는 클래스에서 제외되기만 하고 결과에 출력되지 않습니다.
  해당 세 가지는 폼 필드(15장)에서만 전달됩니다.</div>`,
  calendar: `<p>날짜를 입력받거나 표시하는 컴포넌트는 <b>두 가지</b>이며 레이어 이름의 <b>두 번째 조각</b>으로 구분됩니다 —
  셀 안에 배치하는 <b>날짜 입력칸</b>(<code>inputcalendar</code>)과 화면에 펼치는 <b>달력</b>(<code>calendar</code>)입니다.
  세 번째 항목은 별도의 컴포넌트가 아니라, 펼친 달력을 브라우저 기본 형태로 전환하는 이름 토큰(<code>native</code>)입니다.</p>
  <div class="warn"><b>날짜 단위를 지정할 수 있는 대상은 펼친 달력뿐입니다.</b>
  <code>yearMonth</code>·<code>yearMonthDateTimeSec</code> 등을 이름에 지정하면 해당 단위로 출력되지만,
  <b>날짜 입력칸은 이름과 무관하게 연·월·일로 고정 출력</b>됩니다.</div>
  <div class="note"><b>펼친 달력은 내부 구조가 결과에 반영되지 않습니다</b>(4장의 목록에 포함).
  빈 프레임으로 두지는 않으며, 작성 범위는 16.2의 「그리는 기준선」에 있습니다.</div>`,
  widget: `<p>본 챕터는 앞선 챕터에 포함되지 않는 네 가지를 다룹니다 — 메시지 · 위젯 컨테이너 ·
  떠 있는 레이어 · 진행 단계.</p>
  <div class="warn"><b>네 가지 중 둘은 내부 구조가 결과에 반영되지 않습니다</b> —
  위젯 컨테이너 · 떠 있는 레이어. 4장의 목록에 포함된 컴포넌트입니다.
  <b>단, 빈 프레임으로 두지 않습니다.</b> 인수자가 확인하는 대상은 Figma 화면이므로 외형은 식별 가능한 수준까지 작성합니다 —
  <b>항목마다 「그리는 기준선」에 작성 범위를 명시</b>했습니다(18.2 · 18.3).</div>
  <div class="note"><b>나머지 둘은 작성한 내용이 전달됩니다.</b> 메시지는 클래스만으로 구성하는 요소이며
  (<code>txt_info</code>·<code>msgbox</code>·<code>listbox</code>), 진행 단계는 <b>단계 개수·이름·상태가
  모두 전달되는</b> 본 챕터의 유일한 항목입니다 — 상태는 이름의 <code>finish</code>·<code>on</code>이 결정합니다(18.4).</div>`,
  schedule: `<p>스케쥴 캘린더는 일정을 월 단위로 표시하는 달력입니다. 16장의 두 컴포넌트와 이름이 유사하나
  <b>별개의 컴포넌트</b>이며, 두 번째 조각은 <code>schedulecalendar</code>입니다.</p>
  <div class="warn"><b>내부 구조가 결과에 반영되지 않습니다</b>(4장의 목록에 포함).
  날짜 격자와 일정 막대를 작성해도 결과에는 태그 하나만 출력되며, 표시할 일정은 화면 실행 후 데이터가 결정합니다.
  <b>작성 범위는 툴바와 주 한 줄까지</b>입니다(17.1).</div>`,
  form: `<p>입력폼은 10장 입출력 테이블과 <b>표 구조가 동일합니다</b> — 행은 <code>tr</code>, 라벨셀은 <code>th</code>, 값셀은 <code>td</code>입니다.
  본 챕터에서 추가로 다루는 내용은 <b>값셀에 배치하는 필드의 명명 방식</b>입니다.</p>
  <div class="note"><b>필드 종류는 두 번째 조각이 결정하며, 상태는 이름의 위치와 무관하게 매칭됩니다.</b>
  <code>disabled</code>(<code>dis</code>) · <code>readonly</code>(<code>ro</code>) ·
  <code>req</code>(<code>required</code>) · <code>error</code>(<code>err</code>) —
  <b>조각 단위 완전일치</b>이므로 <code>disabled2</code>와 같이 결합된 형태는 매칭되지 않습니다.
  비활성·읽기전용은 <b>속성</b>으로, 필수·에러는 <b>클래스</b>로 출력됩니다.</div>
  <div class="warn"><b>폼 필드는 이름의 클래스가 결과에 출력되지 않습니다.</b> 변환기가 필드별로 지정된 속성 세트를
  생성해 출력하기 때문이며, 예외는 <code>req</code>·<code>error</code> 두 가지입니다.
  <b>읽기전용도 셀렉트·멀티셀렉트·체크박스·라디오·업로드에서는 출력되지 않으며</b>, 해당 다섯 가지는 비활성으로만 처리됩니다.</div>
  <div class="note"><b>필드 폭은 종류별로 고정되어 있습니다.</b> 대부분 <code>width:100%</code>이며, 날짜 입력칸은 120px 고정,
  다중선택·체크박스·라디오·자동완성·체크 콤보는 클래스(CSS)가 결정합니다.
  <b>Figma 측정 폭이 반영되는 대상은 인풋 한 종류</b>이며, 동일 셀에 다른 요소가 있는 경우에 한정됩니다(5.2) — 15.3이 해당 사례입니다.</div>`,
  accordion: `<p>아코디언은 제목을 선택해 본문을 펼치고 접는 목록입니다. 구조는
  <code>acdbox</code> 그룹 › 아코디언(<code>acd</code>) › <code>panels</code> 프레임이며,
  패널마다 <code>paneltitle</code>(제목)과 <code>panelcontent</code>(본문)를 배치합니다.</p>
  <div class="warn"><b>본문은 텍스트 한 줄만 전달됩니다 — 9장 탭과 반대입니다.</b>
  탭 본문은 작성한 구조가 유지되는 유일한 위치였으나, 아코디언 본문은
  <b><code>panelcontent</code> 내 첫 텍스트 하나</b>로 축약됩니다. 표·버튼·복수 문단을 배치해도
  해당 구조는 결과에 반영되지 않습니다. <b>본문이 복잡한 화면에는 아코디언이 아니라 탭을 사용합니다.</b></div>
  <div class="note">제목·본문·패널의 판정 기준은 모두 <b>이름의 두 번째 조각</b>이며 <b>완전일치</b>가 적용됩니다 —
  <code>panels</code>·<code>paneltitle</code>·<code>panelcontent</code>. 단수형(<code>panel</code>)이나
  숫자가 결합된 이름(<code>panel1</code>)은 인식되지 않습니다.</div>`,
  tree: `<p>트리는 상위·하위 관계를 펼치고 접는 목록입니다. 두 개 항목이 있으며 <b>구조는 하나</b>입니다 —
  <code>tvwbox</code> 그룹 › 트리(<code>tvw</code>) › <code>node</code> 프레임. 12.2는 클래스 토큰 하나만 다릅니다.</p>
  <div class="warn"><b>계층은 중첩으로 구성합니다 — 그리드 드릴다운과 반대입니다.</b>
  11.4는 행을 동일 레벨에 배치하고 <b>텍스트 들여쓰기 픽셀</b>로 계층을 계산하지만, 트리는 <b>노드의 중첩 구조</b>만 참조하며
  들여쓰기는 참조하지 않습니다. 트리를 들여쓰기로 작성하면 전체가 1단계로 처리되고,
  드릴다운을 중첩으로 작성하면 해당 행이 결과에서 누락됩니다.</div>
  <div class="note"><b>트리 높이는 Figma 측정값이 출력됩니다.</b> 클래스가 적용된 경우에도 예외적으로 출력되는 값이므로
  트리의 표시 높이는 <b>Figma에서 지정합니다</b>(5장 예외 목록의 네 가지 중 하나).</div>
  <div class="warn"><b>노드 내부에 이름에 <code>check</code>가 포함된 레이어가 하나라도 있으면 트리 전체에 체크박스가 활성화됩니다.</b>
  특정 노드에만 체크박스를 적용할 수 없으며, 의도하지 않은 활성화도 이 규칙에 의해 발생합니다.</div>`,
  grid: `<p>그리드는 다량의 데이터를 행과 열로 표시하는 컴포넌트입니다. 표(10장)와 유사해 보이지만 <b>구성 방식이 다릅니다</b> —
  표는 셀을 개별 작성하는 방식이지만, 그리드는 <b>헤더 행 하나가 컬럼 전체를 정의하고</b> 나머지 행은 해당 컬럼의 데이터로 처리됩니다.
  다섯 개 항목 모두 <code>gvwbox</code> 그룹 › 그리드(<code>gvw</code>) › <code>header_row</code> + <code>body_row</code>의 동일 구조를 사용합니다.</p>
  <div class="warn"><b>판정 기준은 행 이름의 <code>header</code>·<code>row</code>·<code>footer</code> 포함 여부입니다.</b>
  <code>header</code>가 포함된 행은 컬럼 정의, <code>row</code>가 포함되고 <code>header</code>·<code>footer</code>가 없는 행은 데이터,
  <code>footer</code>가 포함된 행은 합계 행으로 처리됩니다. <b>어느 조건에도 해당하지 않는 행은 결과에서 제외됩니다</b> —
  <code>line1</code>·<code>data2</code>와 같이 지정하면 작성한 데이터가 결과에서 누락되며 오류나 경고는 발생하지 않습니다.</div>
  <div class="warn"><b>그리드의 크기는 변환기가 결정합니다.</b> 컬럼 폭은 전체 <b>70px</b>,
  그리드 높이는 <b>153px</b>로 적용됩니다. 셀 치수를 지정하거나 행을 추가해도 이 값은 변경되지 않으므로,
  <b>그리드에서 결과에 반영되는 요소는 컬럼 개수와 데이터 내용</b>입니다.</div>
  <div class="note"><b>셀 내부 위젯은 종류 정보만 전달됩니다.</b> 체크박스·셀렉트·달력을 셀에 배치하면
  변환기가 이를 참조해 <b>컬럼 타입</b>을 결정하며, 실제 위젯은 프레임워크가 생성합니다(11.2).
  작성 범위는 <b>셀마다 판정용 아이콘 하나</b>이며, 필요한 경우 입력칸 윤곽 하나를 추가합니다.</div>`,
  tblbox: `<p>입출력 테이블은 라벨과 값을 대응시켜 표시하거나 입력받는 표입니다. <b>표 작성 규칙은 8장 조회영역과 동일합니다</b> —
  행은 두 번째 조각이 <code>tr</code>, 라벨셀은 <code>th</code>, 값셀은 <code>td</code>입니다. 차이는 외부 컨테이너(<code>tblbox</code> 한 겹)와
  라벨열 폭(80px → 150px)입니다.</p>
  <div class="warn"><b>어댑티브(10.2)는 좁은 화면에서만 접히는 표가 아닙니다.</b>
  <code>w2tb_adaptive_layout</code>을 지정하면 <b>화면 폭과 무관하게 항상</b> 「라벨 + 값」 한 쌍씩 한 줄로 배치됩니다.
  한 행에 두 쌍(셀 4개)을 작성해도 두 줄로 분리되며, <b>라벨열은 150px로 고정됩니다</b>(5.3의 예외).
  일반 표와 어댑티브는 <b>결과 형태가 명확히 다르므로</b> 용도에 맞는 방식을 선택합니다.</div>
  <div class="note">셀의 헤더 여부(<code>scope</code>), 표의 열 너비 정의(<code>colgroup</code>),
  표 요약 블록, 행의 <code>w2tb_tr</code> 클래스는 <b>변환기가 자동으로 생성합니다.</b>
  10.1의 접힌 XML 항목에서 자동 생성 대상을 확인할 수 있습니다.</div>`,
  schbox: `<p>조회영역은 화면 상단에서 조회 조건을 입력받는 영역입니다. 표(<code>table</code> · <code>tr</code> · <code>th</code> · <code>td</code>)와
  폼 필드가 함께 포함되어, <b>레이어 이름 · 클래스 · 구조 · 오토레이아웃 네 가지가 모두 적용되는</b> 컴포넌트입니다.
</p>
  <div class="warn"><b>본 챕터에서 가장 빈번한 오류</b> — 어댑티브 표는 표 레이어 이름에
  <code>w2tb_adaptive_layout</code>을 직접 지정해야 합니다. 해당 클래스는 <b>자동 추가되지 않습니다.</b>
  누락 시 일반 표로 변환되며, <b>Figma 화면에서는 구조와 형태가 동일해 식별할 수 없습니다.</b> 결과 화면에서는 배치가 명확히 달라집니다 — 어댑티브 표는 화면 폭과 무관하게 「라벨 + 값」 한 쌍씩 한 줄로 배치됩니다(10.2).</div>
  <div class="note">행의 <code>w2tb_tr</code> 클래스, 셀의 속성 블록,
  표의 <code>colgroup</code>은 <b>변환기가 자동으로 추가합니다.</b> 이름에 지정하지 않아도 결과는 동일합니다.</div>`,
  title: `<p>본 챕터는 화면 상단 제목 영역(<code>pgtbox</code>)과 섹션 제목(<code>titbox</code>) 두 단계(<code>tit_main</code>·<code>tit_sub</code>)를
  다룹니다. 세 항목 모두 <b>제목 앞의 막대·점 장식은 디자이너가 작성하는 것이 아니라 클래스의 CSS가 생성한다</b>는 규칙을 공유합니다.
  장식 레이어(<code>title_bar</code>·<code>dot</code>)는 유지해도 무방하나, 해당 레이어의 형태를 변경해 결과를 조정할 수는 없습니다.</p>
  <div class="note"><b>브레드크럼은 태그를 직접 지정하지 않습니다.</b> 그룹에 <code>breadcrumb</code> 클래스를 지정하면
  해당 그룹은 <code>&lt;ul&gt;</code>, 직속 하위 그룹은 각각 <code>&lt;li&gt;</code>가 되도록 변환기가 자동으로 추가합니다.
  뎁스 사이 구분자(<code>/</code>)는 결과에서 CSS가 생성하므로 작성한 텍스트는 매핑되지 않습니다.
  <b>단, Figma에는 템플릿과 동일하게 작성합니다</b> — 누락 시 캔버스에서 뎁스가 연결되어 경로로 식별되지 않습니다(7.1).</div>
  <div class="warn"><b>모바일 화면에서는 브레드크럼이 제외됩니다.</b> PC 화면을 모바일로 전환해도
  <code>pgtbox</code> 내 <code>breadcrumb</code> 영역은 규칙상 제외되며, 오류가 아닙니다.</div>`,
};

/* 카탈로그 장(6~18)의 도입부 — 위 CHAPTER_INTRO 는 **PC 문장**이다.
   모바일판은 치수·배치·규칙이 달라(어댑티브가 화면에 안 나타남 · 브레드크럼 없음 · 행 클래스 직접 기재)
   같은 문장을 쓰면 그 아래 항목과 정면으로 어긋난다. 그래서 data-m/pages.js 가
   window.GUIDE_CHAPTER_INTRO 로 **모바일용 도입부 한 벌**을 통째로 갈아 끼운다.
   PC 페이지에는 그 값이 없으므로 여기 정의가 그대로 쓰인다. */
const INTRO = window.GUIDE_CHAPTER_INTRO || CHAPTER_INTRO;

/* ---------------- 브레드크럼 ----------------
   ★ [2026-08-11] 앞의 두 마디를 **링크로** 바꿨다 (사용자 지시). 마지막 마디(현재 챕터)는
     제자리라 링크로 두지 않는다 — 눌러도 아무 데도 안 가는 링크는 없느니만 못하다.
     · 문서 이름 → 대문(#/home)
     · 파트      → 대문의 그 파트 카드(#/home#part-N). 카드 id 는 renderHome 이 붙이고,
                   home 라우트에서 앵커를 살리는 처리는 route() 에 있다.
   ⚠ 문서 이름은 박아 두지 않고 HOME.title 에서 가져온다 — 여기 있던 하드코딩 때문에
     모바일판 브레드크럼이 「— 모바일」 없이 PC 이름으로 나오고 있었다. */
function renderCrumb(c) {
  const home = (window.HOME || {}).title || 'WebSquare 변환을 위한 Figma 디자인 가이드';
  const partNo = NAV.indexOf(c.part) + 1;
  return `<a href="#/home">${home}</a>`
       + ` &nbsp;›&nbsp; <a href="#/home#part-${partNo}">파트 ${c.part.part}. ${c.part.title}</a>`
       + ` &nbsp;›&nbsp; <b>${c.title}</b>`;
}

function renderChapter(c) {
  const items = itemsOf(c.no);
  const narrative = ((window.PAGES || {})[c.id] || '')
    .replace('{{CLASS_TABLE}}', renderClassTable())
    .replace('{{REGISTRY_NAMES}}', renderRegistryNames());
  const body = narrative
    ? narrative
    : items.length
      ? (INTRO[c.id] || '') + items.map(renderItem).join('')
      : `<div class="todo-box">아직 작성되지 않은 챕터입니다.<br>이 자리는 목차 확인용입니다.</div>`;

  $('#main').innerHTML = `
    <div class="crumb">${renderCrumb(c)}</div>
    <h1>${c.no}. ${c.title}</h1>
    <div class="meta">${narrative ? '읽는 문서' : items.length ? `컴포넌트 ${items.length}개` : '작성 예정'} · 정본 기준 2026-07-30</div>
    ${body}`;
  document.title = `${c.no}. ${c.title} — WebSquare 변환을 위한 Figma 디자인 가이드`;
  document.body.classList.remove('home');
  $('#main').scrollIntoView({ block: 'start' });
  badgeSecNums();
  linkifyRefs();
  renderToc(c.id);
}

/* ---------------- 제목 앞머리 번호 → 배지 ----------------
   「11. 그리드」 · 「11.2 그리드 폼」의 번호를 .sec-num 배지로 감싼다.
   숫자만 span 으로 옮길 뿐 textContent 는 그대로라, 뒤이어 도는
   renderToc(sec-11-2 앵커)·sectionIndex 는 영향을 받지 않는다. */
function badgeSecNums() {
  const wrap = (el, re) => {
    const first = el.firstChild;
    if (!first || first.nodeType !== 3) return;          // 텍스트로 시작하는 제목만
    const hit = first.nodeValue.match(re);
    if (!hit) return;
    first.nodeValue = first.nodeValue.slice(hit[0].length);   // 뒤따르는 공백은 남긴다
    el.insertAdjacentHTML('afterbegin', `<span class="sec-num">${hit[1]}</span>`);
  };
  $('#main').querySelectorAll('h1').forEach(h => wrap(h, /^\s*(\d+\.)(?=\s)/));
  $('#main').querySelectorAll('h2').forEach(h => wrap(h, /^\s*(\d+\.\d+)(?=\s)/));
}

/* ---------------- 섹션 색인 — "11.2" → 그 섹션의 해시 ---------------- */
// 참조 표의 「참조」 칸과 본문 괄호 안 번호를 링크로 바꿀 때 쓴다.
let SECTIONS = null;
function sectionIndex() {
  if (SECTIONS) return SECTIONS;
  SECTIONS = {};
  const chapIdOf = {};
  CHAPTERS.forEach(c => { chapIdOf[c.no] = c.id; });
  // 파트 III 컴포넌트 항목 — h2의 id가 곧 항목 id다
  for (const r of REGISTRY) {
    if (chapIdOf[r.chapter]) SECTIONS[`${r.chapter}.${r.index}`] = { chap: chapIdOf[r.chapter], anchor: r.id };
  }
  // 서술형 챕터 — h2/h3 앞머리 번호로 sec-N-M 앵커를 만든다(renderToc이 실제로 붙인다)
  for (const [id, html] of Object.entries(window.PAGES || {})) {
    for (const m of String(html).matchAll(/<h[23]>\s*(\d+)\.(\d+)/g)) {
      SECTIONS[`${m[1]}.${m[2]}`] = { chap: id, anchor: `sec-${m[1]}-${m[2]}` };
    }
  }
  return SECTIONS;
}
const refHref = n => { const s = sectionIndex()[n]; return s ? `#/${s.chap}#${s.anchor}` : null; };

/* ---------------- 섹션 번호 → 하이퍼링크 ---------------- */
function linkifyRefs() {
  const link = n => { const h = refHref(n); return h ? `<a class="ref" href="${h}">${n}</a>` : esc(n); };

  // ① 표의 마지막 열이 섹션 번호만으로 이뤄진 칸 (20장 「참조」)
  $('#main').querySelectorAll('td:last-child').forEach(td => {
    const t = td.textContent.trim();
    if (!/^\d+\.\d+(\s*·\s*\d+\.\d+)*$/.test(t)) return;
    td.innerHTML = t.split('·').map(s => link(s.trim())).join(' · ');
    td.className = 'refcell';
  });

  // ② 본문 괄호 안 번호 — (11.2) · (4.2 · 16.2 참고)
  const RE = /\((\d+\.\d+(?:\s*·\s*\d+\.\d+)*)(\s*(?:참고|참조))?\)/g;
  const walker = document.createTreeWalker($('#main'), NodeFilter.SHOW_TEXT);
  const hits = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.parentElement.closest('a, pre, code, h1, h2, h3, summary')) continue;
    if (RE.test(n.nodeValue)) hits.push(n);
    RE.lastIndex = 0;
  }
  for (const n of hits) {
    const html = esc(n.nodeValue).replace(RE, (m, nums, tail) => {
      const parts = nums.split('·').map(s => s.trim());
      if (!parts.every(refHref)) return m;              // 하나라도 없는 번호면 손대지 않는다
      return `(${parts.map(link).join(' · ')}${tail || ''})`;
    });
    if (html === esc(n.nodeValue)) continue;
    const span = document.createElement('span');
    span.innerHTML = html;
    n.replaceWith(span);
  }
}

/* ---------------- 우측 TOC (h2/h3에서 자동 생성) ---------------- */
function renderToc(chapId) {
  const heads = [...$('#main').querySelectorAll('h2, h3')];
  heads.forEach((h, i) => {
    // 「11.2 …」로 시작하는 제목은 sec-11-2로 고정한다 — 다른 챕터에서 걸어 오는 링크가 이걸 쓴다
    const m = h.textContent.match(/^\s*(\d+)\.(\d+)\b/);
    if (m) { const sec = `sec-${m[1]}-${m[2]}`; if (h.id !== sec) h.insertAdjacentHTML('beforebegin', `<span class="anch" id="${sec}"></span>`); }
    if (!h.id) h.id = 'h-' + i;
  });
  $('#toc').innerHTML = heads.length
    ? `<div class="cap">이 페이지</div>` + heads.map(h =>
        `<a href="#/${chapId}#${h.id}" class="${h.tagName === 'H3' ? 'lv3' : ''}" data-t="${h.id}">${h.textContent}</a>`).join('')
    : '';

  const links = [...$('#toc').querySelectorAll('a')];
  const spy = () => {
    let cur = heads[0];
    for (const h of heads) if (h.getBoundingClientRect().top <= 90) cur = h;
    links.forEach(a => a.classList.toggle('on', cur && a.dataset.t === cur.id));
  };
  window.onscroll = spy; spy();
}

/* ---------------- 라우팅 ---------------- */
let curChap = null;
function route() {
  const raw = location.hash.replace(/^#\//, '');
  const [chapId, anchor] = raw.split('#');
  const c = chapterById(chapId);
  if (!c) {                               // 챕터가 아니면 대문 — 해시가 없을 때의 기본이기도 하다
    if (curChap !== 'home') { curChap = 'home'; renderSide(null); renderHome(); }
    /* 대문에도 앵커를 살린다 — 브레드크럼의 파트가 #/home#part-N 으로 걸어 온다.
       예전에는 여기서 곧장 return 해 앵커가 통째로 무시됐다(대문은 늘 맨 위였다).
       renderHome 이 innerHTML 을 동기로 채우므로 바로 아래에서 찾을 수 있다. */
    const at = anchor ? document.getElementById(anchor) : null;
    if (at) at.scrollIntoView({ block: 'start' });
    else if (!anchor) window.scrollTo({ top: 0 });
    return;
  }
  if (curChap !== c.id) {                 // 같은 챕터 안에서 움직일 땐 다시 그리지 않는다
    curChap = c.id;
    renderSide(c.id);
    renderChapter(c);
  }
  const el = anchor ? document.getElementById(anchor) : null;
  if (el) el.scrollIntoView({ block: 'start' });
  else if (!anchor) window.scrollTo({ top: 0 });
}

/* ---------------- 캡처 팝업(라이트박스) ---------------- */
const lb = $('#lb');
let lastFocus = null;

function openLightbox(img) {
  lastFocus = document.activeElement;
  $('#lb-img').src = img.getAttribute('src');
  $('#lb-img').alt = img.getAttribute('alt') || '';
  $('#lb-cap').textContent = img.getAttribute('alt') || '';
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
  $('#lb-x').focus();
}
function closeLightbox() {
  lb.hidden = true;
  $('#lb-img').removeAttribute('src');
  document.body.style.overflow = '';
  if (lastFocus) lastFocus.focus();
}

// 캡처 클릭 → 팝업으로 원본 크기
$('#main').addEventListener('click', e => {
  const img = e.target.closest('figure img');
  if (img) openLightbox(img);
});
$('#lb-x').addEventListener('click', closeLightbox);
// 이미지 바깥(어두운 배경)을 눌러도 닫힌다
lb.addEventListener('click', e => { if (!e.target.closest('.lb-scroll')) closeLightbox(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !lb.hidden) closeLightbox();
});

/* ---------------- 「완성 모습」 프레임 높이 ----------------
   file:// 에서는 부모가 iframe 안쪽을 잴 수 없다(교차 출처). 그래서 안쪽 문서(live/*.html)가
   자기 높이를 재서 postMessage 로 보내오고, 여기서 그대로 프레임에 씌운다.
   data/live.js 의 값은 이 신호가 닿기 전까지 쓰는 초기 추정치다 — 첫 그림이 튀지 않게 하는 용도.
   보는 이의 창 폭이 달라져 안쪽 내용이 다시 접혀도 프레임이 따라 커진다(잘리지 않는다).
   출처는 확인하지 않는다 — file:// 은 origin 이 "null" 이라 확인할 수단이 없고,
   대신 **보낸 모양**을 검사한다(우리 조각이 보내는 형태가 아니면 버린다). */
addEventListener('message', e => {
  const d = e.data;
  if (!d || typeof d.fxLiveHeight !== 'number' || !(d.fxLiveHeight > 0)) return;
  if (typeof d.id !== 'string' || !/^[a-z0-9-]+$/.test(d.id)) return;
  const box = document.getElementById('lf-' + d.id);
  if (box) box.style.height = d.fxLiveHeight + 'px';
});

// 「직접 조작해 보기」 — 그 프레임만 엔진 버전으로 바꾼다.
// 엔진은 프레임마다 따로 뜨므로 한 번에 하나만 켠다(다른 프레임은 정적 화면으로 되돌린다).
$('#main').addEventListener('click', e => {
  const btn = e.target.closest('.livego');
  if (!btn) return;
  const id = btn.dataset.id;
  for (const other of document.querySelectorAll('.livego.on')) {
    if (other === btn) continue;
    const box = document.getElementById('lf-' + other.dataset.id);
    box.style.height = box.dataset.staticH + 'px';
    box.querySelector('iframe').src = liveSrc(LIVE_DIR + other.dataset.id + '.html');
    other.classList.remove('on');
    other.textContent = '직접 조작해 보기';
  }
  const box = document.getElementById('lf-' + id);
  const frame = box.querySelector('iframe');
  const on = btn.classList.toggle('on');
  if (on) {
    box.dataset.staticH = parseInt(box.style.height, 10);
    box.style.height = btn.dataset.h + 'px';
    frame.src = liveSrc(LIVE_DIR + '_run.html?id=' + id);
    btn.textContent = '멈추기';
  } else {
    box.style.height = box.dataset.staticH + 'px';
    frame.src = liveSrc(LIVE_DIR + id + '.html');
    btn.textContent = '직접 조작해 보기';
  }
});

/* ---------------- 다크 모드 토글 ----------------
   실제 전환은 <html data-theme="dark"> 하나로 끝난다 — 색은 전부 토큰이라
   이 속성 하나에 표·칩·콜아웃·버튼이 같이 따라온다.
   초기값은 index.html 의 theme-init 이 첫 페인트 전에 정해뒀다(번쩍임 방지).
   인쇄는 다크와 무관하게 항상 라이트다(@media screen 으로 감싸둠). */
const themeBtn = $('#themeBtn');
const themeIcon = themeBtn.querySelector('.material-icons');
const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

function paintThemeBtn() {
  const dark = isDark();
  themeIcon.textContent = dark ? 'light_mode' : 'dark_mode';
  themeBtn.title = dark ? '라이트 모드로 전환' : '다크 모드로 전환';
  themeBtn.setAttribute('aria-pressed', String(dark));
}
themeBtn.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  if (next === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
  try { localStorage.setItem('fx-guide-theme', next); } catch (e) {}
  paintThemeBtn();
  pushLiveTheme();          // 「완성 모습」 프레임 안쪽도 같이 뒤집는다
});
paintThemeBtn();

/* ---------------- 사이드바 서랍 (≤900) ----------------
   좁은 화면에서는 사이드바가 화면 밖에 접혀 있다가 본문 위로 밀려 나온다.
   여는 것은 탑바의 햄버거 하나, 닫는 것은 ①다시 누르기 ②어두운 바탕 ③Esc
   ④사이드바 안의 링크(챕터·검색 결과) 클릭 — 넷 다 같은 setNav(false) 로 모은다.
   상태는 <body class="nav-open"> 하나뿐이고, 접힘/펼침 모양은 전부 CSS 가 쥔다. */
const navBtn = $('#navBtn');
const navScrim = $('#navScrim');
const navMQ = matchMedia('(max-width:900px)');
const navOpen = () => document.body.classList.contains('nav-open');

function setNav(open) {
  document.body.classList.toggle('nav-open', open);
  navBtn.setAttribute('aria-expanded', String(open));
  navBtn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  navBtn.querySelector('.material-icons').textContent = open ? 'close' : 'menu';
}
navBtn.addEventListener('click', () => setNav(!navOpen()));
navScrim.addEventListener('click', () => setNav(false));
// 링크를 누르면 바로 닫는다 — 서랍이 본문을 덮고 있어 안 닫으면 이동한 곳이 안 보인다
$('.side').addEventListener('click', e => { if (e.target.closest('a')) setNav(false); });
// Esc — 캡처 팝업이 떠 있으면 그쪽이 먼저다(위의 라이트박스 핸들러가 처리한다).
// ⚠ **캡처 단계**로 듣는다. 버블로 두면 라이트박스 쪽이 먼저 닫아 lb.hidden 이 이미 true 가 되고,
//    Esc 한 번에 팝업과 서랍이 같이 닫힌다.
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && lb.hidden && navOpen()) setNav(false);
}, true);
// 넓어지면 사이드바가 다시 붙박이가 된다 → 열림 표식(본문 스크롤 잠금)을 걷어낸다
const navSync = () => { if (!navMQ.matches && navOpen()) setNav(false); };
if (navMQ.addEventListener) navMQ.addEventListener('change', navSync);
else navMQ.addListener(navSync);            // 옛 사파리

/* ---------------- 글자 크기 ----------------
   --fs-scale 하나만 바꾼다. style.css 의 .main / .side 가 이 배수로 --fs-* 토큰을
   다시 선언하므로 본문(제목·문단·표·코드)과 사이드바 라벨이 한꺼번에 따라온다.
   탑바·우측 목차는 셸이라 그대로 둔다.
   줄간은 전부 배수(unitless)라 글자를 키워도 줄이 붙지 않는다. */
const FS_STEPS = [0.85, 0.925, 1, 1.1, 1.2, 1.35];
const FS_KEY = 'fx-guide-fontscale';
let fsIdx = FS_STEPS.indexOf(1);
try {
  const i = FS_STEPS.indexOf(parseFloat(localStorage.getItem(FS_KEY)));
  if (i >= 0) fsIdx = i;
} catch (e) {}

function applyFontScale() {
  const s = FS_STEPS[fsIdx];
  document.documentElement.style.setProperty('--fs-scale', s);
  $('#fsVal').textContent = Math.round(s * 100) + '%';
  $('#fsDown').disabled = fsIdx === 0;
  $('#fsUp').disabled = fsIdx === FS_STEPS.length - 1;
  try { localStorage.setItem(FS_KEY, String(s)); } catch (e) {}
}
function stepFontScale(d) {
  const next = Math.min(FS_STEPS.length - 1, Math.max(0, fsIdx + d));
  if (next === fsIdx) return;
  fsIdx = next;
  applyFontScale();
}
$('#fsDown').addEventListener('click', () => stepFontScale(-1));
$('#fsUp').addEventListener('click', () => stepFontScale(1));
$('#fsVal').addEventListener('click', () => { fsIdx = FS_STEPS.indexOf(1); applyFontScale(); });
applyFontScale();

/* ---------------- 스크롤바 — 스크롤 중에만 보인다 ----------------
   CSS 만으로는 「멈추면 사라지는」 상태를 만들 수 없다(:hover 밖에 없다).
   그래서 스크롤이 나는 동안만 <html> 에 표식을 달고, 멎으면 떼어 낸다.
   scroll 은 버블링하지 않으므로 **캡처 단계**로 듣는다 — 사이드바·표·코드블록
   안쪽 스크롤까지 한 번에 잡힌다. */
let scrollFade = null;
addEventListener('scroll', () => {
  document.documentElement.classList.add('scrolling');
  clearTimeout(scrollFade);
  scrollFade = setTimeout(() => document.documentElement.classList.remove('scrolling'), 700);
}, { capture: true, passive: true });

window.addEventListener('hashchange', route);
$('#q').addEventListener('input', e => search(e.target.value));

// 맨 위로 — 조금 내려갔을 때만 보인다
const fab = $('#top');
fab.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
const fabSpy = () => { fab.hidden = window.scrollY < 400; };
window.addEventListener('scroll', fabSpy, { passive: true });
fabSpy();

route();
