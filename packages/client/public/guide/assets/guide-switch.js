/* ============================================================
   guide/assets/guide-switch.js

   탑바 오른쪽의 **가이드 전환 메뉴**. 세 페이지가 이 파일 하나를 같이 쓴다.
     index.html         WebSquare 변환을 위한 Figma 디자인 가이드 (PC)
     index-mobile.html  WebSquare 변환을 위한 Figma 디자인 가이드 — 모바일
     user-guide.html    AICraft-Figma 사용자 가이드

   예전에는 두 index 가 `.guide-swap` 링크 한 개로 서로를 가리켰다. 페이지가 셋이 되면서
   링크 하나로는 「어디로 갈지」를 고를 수 없어 목록으로 바꿨다.

   ⚠ 목록을 각 HTML 에 세 번 적지 않는다 — 여기 PAGES 한 곳만 고치면 세 페이지가 같이 따라온다.
     (예전 방식이면 페이지를 하나 더할 때 HTML 세 군데를 손봐야 한다.)

   마크업은 각 페이지의 <div class="gsw" id="guideSwitch"></div> 자리에 이 파일이 채운다.
   모양은 style.css 의 `가이드 전환 메뉴` 절이 쥔다.
   ============================================================ */
(function () {
  'use strict';

  /* mirror:true 끼리는 챕터(해시)를 그대로 들고 넘어간다 — 두 제작 가이드가 21장 미러라서다.
     사용자 가이드는 목차가 달라 해시를 넘기면 엉뚱한 자리로 떨어진다 → mirror:false.
     테마·글자 크기는 세 페이지가 localStorage 를 공유하므로 따로 넘길 것이 없다. */
  /* 사용자 가이드가 맨 위다(사용자 지시, 2026-08-11) — 도구 쓰는 법이 먼저고, 제작 규칙이 그 뒤에 붙는다.
     PC·모바일은 「피그마 가이드」 한 묶음이다(2026-08-12 사용자 지시). 그 안에서 어느 변형인지는 타이틀 옆
     PC/모바일 토글이 정한다 — 여기서는 두 파일을 같은 항목으로 묶고, 클릭 시엔 마지막에 본 변형으로 돌아간다. */
  var FIGMA_VARIANTS = ['index.html', 'index-mobile.html'];
  var VARIANT_KEY = 'fx-guide-variant';   /* 'index.html' | 'index-mobile.html' 저장 */
  var lastVariant;
  try { lastVariant = localStorage.getItem(VARIANT_KEY); } catch (e) {}
  if (FIGMA_VARIANTS.indexOf(lastVariant) < 0) lastVariant = 'index.html';

  var PAGES = [
    {
      file: 'user-guide.html', icon: 'menu_book', mirror: false,
      title: 'AICraft-Figma 사용자 가이드', sub: '도구 사용법 · FAQ', short: '사용자 가이드'
    },
    {
      /* file 은 「이 항목을 눌렀을 때 어디로 갈지」. 마지막 변형을 기억해 돌려준다 */
      file: lastVariant, icon: 'description', mirror: true,
      title: 'WebSquare 변환을 위한 Figma 디자인 가이드', sub: 'PC · 모바일 화면 제작 규칙', short: '피그마 가이드',
      isFigma: true
    }
  ];

  var root = document.getElementById('guideSwitch');
  if (!root) return;

  /* 지금 어느 페이지인가 — 경로 끝 조각으로 가른다.
     디렉터리로 열면(끝이 /) 서버가 index.html 을 준 것이므로 그렇게 본다.
     file:// 에서 한글 폴더명이 %EA.. 로 오지만 파일명만 보므로 상관없다. */
  var here = location.pathname.split('/').pop() || 'index.html';
  /* 두 index 는 「피그마 가이드」 한 항목에 묶였다 → 파일명이 아니라 「사용자 가이드인지 여부」로 가른다 */
  var cur = here === 'user-guide.html' ? PAGES[0] : PAGES[1];
  /* 지금 피그마 가이드에 있으면 그 변형을 다음 방문 때 기본으로 돌려준다 */
  if (cur.isFigma && FIGMA_VARIANTS.indexOf(here) >= 0) {
    try { localStorage.setItem(VARIANT_KEY, here); } catch (e) {}
    cur.file = here;   /* 「자기 자신」으로 처리 — 아래 on 매칭이 정확해진다 */
  }

  function esc(s) {
    return s.replace(/[&<>"]/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m];
    });
  }

  var html =
    '<button class="gsw-btn" id="gswBtn" type="button" aria-haspopup="menu" aria-expanded="false"' +
    ' title="다른 가이드로 전환">' +
      '<span class="material-icons" aria-hidden="true">' + cur.icon + '</span>' +
      '<span class="gsw-lbl">' + esc(cur.short) + '</span>' +
      '<span class="material-icons gsw-caret" aria-hidden="true">expand_more</span>' +
    '</button>' +
    '<div class="gsw-menu" id="gswMenu" role="menu" aria-label="가이드 전환" hidden>';

  PAGES.forEach(function (p) {
    var on = p === cur;
    html +=
      '<a class="gsw-item' + (on ? ' on' : '') + '" role="menuitem" href="' + p.file + '"' +
      (on ? ' aria-current="page"' : '') + ' data-mirror="' + (p.mirror ? '1' : '') + '">' +
        '<span class="material-icons gsw-ic" aria-hidden="true">' + p.icon + '</span>' +
        '<span class="gsw-tx"><b>' + esc(p.title) + '</b><i>' + esc(p.sub) + '</i></span>' +
      '</a>';
  });
  html += '</div>';
  root.innerHTML = html;

  var btn = document.getElementById('gswBtn');
  var menu = document.getElementById('gswMenu');
  var items = [].slice.call(menu.querySelectorAll('.gsw-item'));

  function setOpen(open) {
    root.classList.toggle('open', open);
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  }
  var isOpen = function () { return !menu.hidden; };

  btn.addEventListener('click', function (e) {
    e.stopPropagation();          /* 아래 document 핸들러가 곧바로 다시 닫는 것을 막는다 */
    setOpen(!isOpen());
    if (isOpen()) (menu.querySelector('.gsw-item.on') || items[0]).focus();
  });

  /* 보고 있던 챕터를 들고 넘어간다 — 미러인 두 페이지끼리일 때만.
     href 는 누르는 **순간** 정한다(해시는 스크롤에 따라 계속 바뀐다). */
  menu.addEventListener('click', function (e) {
    var a = e.target.closest('.gsw-item');
    if (!a) return;
    if (a.classList.contains('on')) { e.preventDefault(); setOpen(false); return; }
    if (a.dataset.mirror && cur.mirror && location.hash) a.href = a.getAttribute('href') + location.hash;
  });

  /* 닫기 — ①바깥 클릭 ②Esc ③위/아래 화살표로 항목 이동 */
  document.addEventListener('click', function (e) {
    if (isOpen() && !root.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') { setOpen(false); btn.focus(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    var i = items.indexOf(document.activeElement);
    var n = e.key === 'ArrowDown' ? i + 1 : i - 1;
    items[(n + items.length) % items.length].focus();
  });
})();
