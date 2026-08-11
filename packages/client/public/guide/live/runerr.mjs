import pkg from '/Users/git-admin/Desktop/figma/AICraft_Figma/node_modules/playwright/index.js'; const { chromium } = pkg;
const DIR='/Volumes/web2doc/600.SW본부작업폴더/300.UX지원팀/Project_2026/임채원/guide_수정/가이드';
const b=await chromium.launch();
for(const f of ['_run.html','_run_nosnip.html']){
  const ctx=await b.newContext({viewport:{width:838,height:900}}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e).split('\n')[0]));
  await p.goto(`file://${encodeURI(DIR)}/live/${f}?id=button`); await p.waitForTimeout(7000);
  const st=await p.evaluate(()=>({ready:window.__ready, boot:document.getElementById('boot')?.textContent, sub:!!document.querySelector('.sub_contents')}));
  console.log(f, JSON.stringify(st), '오류:', errs);
  await ctx.close();
}
await b.close();
