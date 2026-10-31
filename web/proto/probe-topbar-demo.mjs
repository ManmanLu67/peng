// 演示进行中，顶栏各元素在不同宽度下是否互相重叠、是否溢出自己的框
import { session } from './probe-lib.mjs';
const BASE = process.argv[2];
await session(9491, async ({ ev, check, view, go, sleep }) => {
  await view(1440, 800);
  await go(`${BASE}/#/app`);
  await ev(`document.querySelector('.demo__start').click()`);
  await sleep(1800);
  for (const w of [1920, 1440, 1280, 1180, 1100, 1024, 900, 800, 720, 640, 600, 500, 400, 360]) {
    await view(w, 800);
    await sleep(200);
    const r = JSON.parse(await ev(`(()=>{
      const sel='.topbar .logo, .topbar .demo__banner, .topbar .demo__hint, .topbar .demo__exit, .topbar .hsk, .topbar .api-badge, .topbar .icon-btn';
      const els=[...document.querySelectorAll(sel)].filter(e=>e.offsetParent!==null);
      const rs=els.map(e=>({n:(e.className||'').toString().split(' ')[0],r:e.getBoundingClientRect(),e}));
      const bad=[];
      for(let i=0;i<rs.length;i++){
        const a=rs[i].r; if(a.left<-0.5||a.right>innerWidth+0.5) bad.push(rs[i].n+' 出界');
        for(let j=i+1;j<rs.length;j++){const b=rs[j].r;
          const nested=rs[i].e.contains(rs[j].e)||rs[j].e.contains(rs[i].e); if(nested) continue;
          if(a.left<b.right-0.5&&b.left<a.right-0.5&&a.top<b.bottom-0.5&&b.top<a.bottom-0.5) bad.push(rs[i].n+' × '+rs[j].n);}
      }
      const banner=document.querySelector('.demo__banner'); const kids=[...banner.children].filter(c=>c.offsetParent!==null);
      const bb=banner.getBoundingClientRect();
      kids.forEach(k=>{const kr=k.getBoundingClientRect(); if(kr.right>bb.right+0.5||kr.left<bb.left-0.5) bad.push('横幅内 '+k.className.split(' ')[0]+' 溢出横幅');});
      // 完整性：每个叶子必须落在自己所属的槽内，且文本没被裁（scrollWidth > clientWidth）
      document.querySelectorAll('.topbar__slot').forEach(slot=>{
        const sr=slot.getBoundingClientRect();
        slot.querySelectorAll('.logo, .demo__banner, .hsk__btn, .api-badge, .icon-btn').forEach(e=>{
          if(e.offsetParent===null) return; const r=e.getBoundingClientRect();
          if(r.left<sr.left-1||r.right>sr.right+1) bad.push((e.className||'').toString().split(' ')[0]+' 超出自己的槽');
        });
      });
      document.querySelectorAll('.topbar button, .topbar a, .topbar .api-badge').forEach(e=>{ if(e.offsetParent!==null && e.scrollWidth>e.clientWidth+1) bad.push((e.className||'').toString().split(' ')[0]+' 文字被截断'); });
      // 分隔点：英文被隐藏时，孤立的 · 不应留下
      document.querySelectorAll('.topbar .bi__sep').forEach(e=>{ if(e.offsetParent!==null){ const en=e.parentElement.querySelector('.bi__en'); if(!en||en.offsetParent===null) bad.push('孤立分隔点'); }});
      // HSK 6→1 六个按钮都要完整可见，文字是 “HSK n” 或 “n”
      const hsk=[...document.querySelectorAll('.hsk__btn')].filter(b=>b.offsetParent!==null);
      if(hsk.length!==6) bad.push('HSK 按钮数量='+hsk.length);
      return JSON.stringify(bad);})()`));
    check(`${w}px 演示中顶栏无重叠、无溢出`, r.length === 0, r.join('; '));
  }
});
