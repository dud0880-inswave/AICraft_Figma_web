/* ============================================================
   guide/assets/branch-toggle.js

   피그마 가이드(index.html · index-mobile.html)의 타이틀 옆 PC/모바일 토글.
   좌측 상단 「가이드 전환」에서 피그마 가이드는 한 항목으로 묶였고, 그 안에서 어느 변형을 볼지는
   여기서 정한다.

   하는 일:
     ① 현재 챕터(location.hash)를 상대 변형 링크에 붙여 「보고 있던 자리」를 들고 넘어간다.
     ② 클릭한 변형을 localStorage 에 남긴다 — 다음에 좌측 메뉴에서 「피그마 가이드」를 다시 눌러도
        마지막에 본 변형으로 돌아간다.
   ============================================================ */
(function () {
  'use strict';
  var tog = document.querySelector('.branch-tog');
  if (!tog) return;
  var KEY = 'fx-guide-variant';
  var FILE = { pc: 'index.html', mobile: 'index-mobile.html' };

  tog.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-variant]');
    if (!a) return;
    if (a.classList.contains('on')) { e.preventDefault(); return; }
    /* 챕터 인계 — PC/모바일은 21장 미러이므로 해시를 그대로 옮긴다.
       (guide-switch.js 도 두 index 를 mirror:true 로 다루는 이유와 같다) */
    if (location.hash) a.href = FILE[a.dataset.variant] + location.hash;
    try { localStorage.setItem(KEY, FILE[a.dataset.variant]); } catch (err) {}
  });
})();
