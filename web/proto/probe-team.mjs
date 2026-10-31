// T5 团队页：4 张卡、错位、字段缺失、窄屏
import { session } from './probe-lib.mjs';
const BASE = process.argv[2];
const SHOTS = process.argv[3];
const q = (s) => `document.querySelector(${JSON.stringify(s)})`;
const qa = (s) => `[...document.querySelectorAll(${JSON.stringify(s)})]`;
const MODE = process.argv[4] ?? 'full';   // full | sparse（用临时副本测字段缺失）

await session(MODE === 'sparse' ? 9531 : 9530, async ({ ev, check, view, go, shot }) => {
  await view(1440, 900);
  await go(`${BASE}/#/team`, 1500);

  if (MODE === 'sparse') {
    const html = await ev('document.body.innerText + document.body.innerHTML');
    check('字段缺失：页面不出现 "undefined" / "null" / "NaN"', !/undefined|null|NaN/.test(html), (html.match(/.{20}(undefined|null|NaN).{20}/) ?? [''])[0]);
    check('字段缺失：没有空的 role / bio 节点', (await ev(`${qa('.team__role, .team__bio')}.every(e => e.textContent.trim() !== '')`)) === true);
    check('字段缺失：没有成员时仍显示标题且不崩', (await ev(`!!${q('.team__title')}`)) === true);
    console.log('      sparse 卡片数:', await ev(`${qa('.team__card')}.length`), '| role 节点:', await ev(`${qa('.team__role')}.length`), '| bio 节点:', await ev(`${qa('.team__bio')}.length`));
    return;
  }

  check('4 张成员卡，序号 01–04', (await ev(`${qa('.team__no')}.map(e=>e.textContent).join()`)) === '01,02,03,04');
  check('每张卡有印章（占位“朋”）、职责中文 + 英文', await ev(`${qa('.team__card')}.every(c => c.querySelector('.team__stamp').textContent === '朋' && c.querySelector('.team__role').textContent.length > 4 && c.querySelector('.team__role-en').textContent.length > 4)`));
  check('姓名为空显示“姓名待填 · Name TBD”', (await ev(`${qa('.team__name')}.map(e=>e.textContent).every(t => t.includes('姓名待填') && t.includes('Name TBD'))`)) === true);
  check('页面不出现 "undefined"', !(await ev('document.body.innerText')).includes('undefined'));
  check('团队简介与致谢显示', (await ev(`${q('.team__intro')}.textContent`)).includes('4 人') && (await ev(`${q('.team__thanks')}.textContent`)).includes('扣子'));
  check('没有外链（P1 不展示）', (await ev(`${qa('.team a')}.length`)) === 0);

  const tops = JSON.parse(await ev(`JSON.stringify(${qa('.team__card')}.map(c => Math.round(c.getBoundingClientRect().top)))`));
  check('A 错位：相邻卡垂直错开（不是整齐四等分）', tops[1] - tops[0] >= 40 && tops[1] - tops[2] >= 40 && tops[3] - tops[2] >= 40, JSON.stringify(tops));
  check('A 错位：奇数卡与偶数卡各自同高', tops[0] === tops[2] && tops[1] === tops[3], JSON.stringify(tops));

  const redArea = await ev(`(()=>{let sum=0; for (const e of document.querySelectorAll('.team *')) { const cs=getComputedStyle(e); if (cs.backgroundColor==='rgb(200, 65, 43)') { const r=e.getBoundingClientRect(); sum+=r.width*r.height; } } return +(sum/(innerWidth*innerHeight)*100).toFixed(2)})()`);
  check(`朱砂面积占视口 ${redArea}%（≤ 3%）`, redArea <= 3);
  await shot(`${SHOTS}/team-1440.png`);

  for (const [w, h] of [[720, 900], [400, 800], [360, 640]]) {
    await view(w, h);
    await go(`${BASE}/#/team`, 1200);
    check(`${w}×${h} 不横向溢出`, await ev('document.documentElement.scrollWidth <= document.documentElement.clientWidth'));
    if (w <= 720) {
      check(`${w}×${h} 单列`, (await ev(`new Set(${qa('.team__card')}.map(c => Math.round(c.getBoundingClientRect().left))).size`)) <= 2 && (await ev(`getComputedStyle(${q('.team__grid')}).gridTemplateColumns.split(' ').length`)) === 1);
      check(`${w}×${h} 保留错位的左右偏移且 ≤ 24px`, await ev(`(()=>{const l=${qa('.team__card')}.map(c => c.getBoundingClientRect().left); const base=Math.min(...l); return Math.max(...l)-base > 0 && Math.max(...l)-base <= 24.5})()`));
    }
    if (w === 400) await shot(`${SHOTS}/team-400.png`);
  }
});
