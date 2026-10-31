// 3b 对比区 / 3c 阶梯条 / 3f 标注与注释卡
import { session, settle } from './probe-lib.mjs';

const BASE = process.argv[2];
const SHOTS = process.argv[3];
const q = (s) => `document.querySelector(${JSON.stringify(s)})`;
const qa = (s) => `[...document.querySelectorAll(${JSON.stringify(s)})]`;
const submit = (text) => `(()=>{const i=${q('.chat__input')}; i.value=${JSON.stringify(text)}; i.dispatchEvent(new Event('input')); ${q('.chat__form')}.requestSubmit()})()`;

await session(9420, async ({ ev, check, view, go, shot, sleep }) => {
  await view(1440, 800);
  await go(`${BASE}/#/app`);

  check('空状态：提示文字', (await ev(`${q('.cmp__empty')}?.textContent`)).includes('输入一句话'));
  check('阶梯条 8 级，ORG 在上、ENG 在下', (await ev(`${qa('.lad__label')}.map(e=>e.textContent).join(',')`)) === 'ORG,HSK6,HSK5,HSK4,HSK3,HSK2,HSK1,ENG');
  check('提交前阶梯条无当前档', (await ev(`${qa('.lad__item.is-on')}.length`)) === 0);

  await ev(submit('日照香炉生紫烟'));
  await sleep(200);
  check('running 时对比区显示骨架屏', (await ev(`!!${q('.cmp__skeleton')}`)) === true);
  check('running 时阶梯条不高亮', (await ev(`${qa('.lad__item.is-on')}.length`)) === 0);
  await settle(ev);

  check('B4 左栏标题“Original Text · 原文”', (await ev(`${qa('.cmp__h')}[0].textContent`)) === 'Original Text · 原文');
  check('B4 右栏标题“HSK 3 Rewrite · 简化”', (await ev(`${qa('.cmp__h')}[1].textContent`)) === 'HSK 3 Rewrite · 简化');
  check('B4 标题行带延伸细线', (await ev(`${qa('.cmp__rule')}.length`)) === 2);
  check('B2 右栏改写文字', (await ev(`${qa('.cmp__col')}[1].querySelector('.cmp__text').textContent`)) === '这是一句古诗。他的意思是：水很烫，有热气。');
  check('B5 阶梯条当前档 = HSK3，且只有一个', (await ev(`${qa('.lad__item.is-on')}.map(e=>e.dataset.rung).join()`)) === '4');
  check('B5 阶梯条不可点击（无按钮）', (await ev(`${qa('.lad button')}.length`)) === 0);

  // 标注
  const leftMarks = await ev(`JSON.stringify(${qa('.cmp__col')}[0].querySelectorAll('mark').length ? [...${qa('.cmp__col')}[0].querySelectorAll('mark')].map(m=>[m.textContent,m.dataset.t]) : [])`);
  check('B10 原文整句作为典故被整体标注', leftMarks === JSON.stringify([['日照香炉生紫烟', 'allusion']]), leftMarks);
  const rightMarks = JSON.parse(await ev(`JSON.stringify([...${qa('.cmp__col')}[1].querySelectorAll('mark')].map(m=>m.textContent))`));
  check('B10 右栏标注不超过 3 个', rightMarks.length <= 3 && rightMarks.length > 0, JSON.stringify(rightMarks));
  check('B10 标注线型：典故实线', (await ev(`getComputedStyle(${q('.cmp mark[data-t="allusion"]')}).textDecorationStyle`)) === 'solid');
  check('释义行：含拼音与英文', (await ev(`${qa('.cmp__gloss')}[0].textContent`)).includes('(rì zhào xiāng lú shēng zǐ yān)') );

  // 注释卡
  await ev(`${q('.cmp mark')}.click()`);
  await sleep(100);
  check('B11 点标注弹出注释卡：词 + 拼音 + 中文 + English', await ev(`(()=>{const n=${q('.cmp__note')}; const t=n.textContent; return !n.hidden && t.includes('日照香炉生紫烟') && t.includes('rì zhào') && t.includes('李白') && t.includes('Li Bai')})()`));
  await ev(`${q('.cmp')}.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  await sleep(50);
  check('Esc 关闭注释卡', (await ev(`${q('.cmp__note')}.hidden`)) === true);

  // 英文折叠
  check('非末档：英文折叠，显示 “View in English →”', (await ev(`${q('.cmp__more')}.textContent`)) === 'View in English →' && (await ev(`!!${q('.cmp__text--en')}`)) === false);
  await ev(`${q('.cmp__more')}.click()`);
  await sleep(100);
  check('点开后显示英文意译', (await ev(`${q('.cmp__text--en')}.textContent`)) === "The water is so hot it's steaming.");
  check('文化语境条显示', (await ev(`${q('.cmp__culture')}.textContent`)).includes('望庐山瀑布'));

  // 降到英文档
  for (let k = 0; k < 3; k++) { await ev('__peng.commands.notUnderstood()'); await settle(ev); }
  check('降到英文档：阶梯条高亮 ENG', (await ev(`${qa('.lad__item.is-on')}.map(e=>e.dataset.rung).join()`)) === '1');
  check('B7 英文档右栏标题“English”，英文主显', (await ev(`${qa('.cmp__h')}[1].textContent`)).startsWith('English') && (await ev(`${q('.cmp__text--en')}.textContent`)).startsWith('The water is so hot'));
  check('英文档不再有 “View in English”', (await ev(`!!${q('.cmp__more')}`)) === false);

  // 原文档
  await ev('__peng.commands.dispatch({type:"STEP_UP"})'); await settle(ev);
  for (let k = 0; k < 6; k++) { await ev('__peng.commands.stepUp()'); await settle(ev); }
  check('升到原文档：阶梯条高亮 ORG', (await ev(`${qa('.lad__item.is-on')}.map(e=>e.dataset.rung).join()`)) === '8');
  check('原文档右栏标题“原文（未改写）”，不重复同一段文字', (await ev(`${qa('.cmp__h')}[1].textContent`)).includes('原文（未改写）') && (await ev(`${qa('.cmp__col')}[1].querySelectorAll('.cmp__text').length`)) === 0);

  // 非示例句：模拟数据标识
  await ev(submit('随便一句话'));
  await settle(ev);
  check('B12 非示例句：显示“模拟数据”标识', (await ev(`${q('.cmp__mock')}?.textContent`))?.includes('模拟数据'));
  check('B12 占位响应的右栏不做标注（无 mark、无释义行）', (await ev(`${qa('.cmp__col')}[1].querySelectorAll('mark, .cmp__gloss').length`)) === 0);
  check('B12 无文化语境条（缺失即隐藏）', (await ev(`!!${q('.cmp__culture')}`)) === false);
  check('B12 非示例句不出现英文意译外的错误文本 undefined', !(await ev('document.body.textContent')).includes('undefined'));

  // 超纲词：不带释义
  await ev(submit('饕餮'));
  await settle(ev);
  await ev(`${qa('.cmp__col')}[0].querySelector('mark').click()`);
  await sleep(100);
  check('超纲词注释卡：标注“超纲词”，不带释义', await ev(`(()=>{const t=${q('.cmp__note')}.textContent; return t.includes('超纲词') && t.includes('暂无释义')})()`));

  await shot(`${SHOTS}/compare.png`);
  await view(400, 800);
  await go(`${BASE}/#/app`);
  check('窄屏不横向溢出', await ev('document.documentElement.scrollWidth <= document.documentElement.clientWidth'));
});
