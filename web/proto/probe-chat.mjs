import { session, settle } from './probe-lib.mjs';

const BASE = process.argv[2];
const SHOTS = process.argv[3];
const q = (s) => `document.querySelector(${JSON.stringify(s)})`;

await session(9400, async ({ ev, check, view, go, shot, sleep }) => {
  await view(1440, 800);
  await go(`${BASE}/#/app`);

  check('B1 空输入时发送按钮禁用', (await ev(`${q('.chat__send')}.disabled`)) === true);
  await ev(`(()=>{const i=${q('.chat__input')}; i.value='日照香炉生紫烟'; i.dispatchEvent(new Event('input'))})()`);
  check('输入后发送按钮可用', (await ev(`${q('.chat__send')}.disabled`)) === false);
  check('示例按钮 3 个', (await ev(`document.querySelectorAll('.chat__example').length`)) === 3);

  await ev(`${q('.chat__send')}.click()`);
  await sleep(150);
  check('B2 提交后进入 running，输入与示例禁用',
    (await ev('__peng.store.get().status')) === 'running'
    && (await ev(`${q('.chat__input')}.readOnly`)) === true
    && (await ev(`${q('.chat__example')}.disabled`)) === true);
  check('提交后输入框被清空', (await ev(`${q('.chat__input')}.value`)) === '');

  await ev(`(()=>{const i=${q('.chat__input')}; i.readOnly=false; i.value='再来一句'; i.dispatchEvent(new Event('input')); ${q('.chat__form')}.requestSubmit()})()`);
  check('B3 运行中再次提交被忽略', (await ev('__peng.store.get().messages.length')) === 1);

  await settle(ev);
  check('B2 结果：HSK 3 的改写文字', (await ev('__peng.store.get().messages[0].resp.output.text')) === '这是一句古诗。他的意思是：水很烫，有热气。');
  check('用户消息显示原文', (await ev(`${q('.chat__text')}.textContent`)) === '日照香炉生紫烟');
  const meta = await ev(`${q('.chat__card-meta')}.textContent`);
  check('解读卡：Level 古典 · Classical，Analysis Done', meta.includes('Level: 古典 · Classical') && meta.includes('Analysis Done'), meta);
  check('解读卡可点击且为选中态', (await ev(`${q('.chat__card')}.disabled`)) === false && (await ev(`${q('.chat__card')}.getAttribute('aria-pressed')`)) === 'true');
  check('结果出来后输入恢复可用', (await ev(`${q('.chat__input')}.readOnly`)) === false);

  await ev(`document.querySelectorAll('.chat__example')[0].click()`);
  await sleep(150);
  check('点示例即提交，且带语境', (await ev('__peng.store.get().messages.at(-1).context')) === '一个人对着水杯说' && (await ev('__peng.store.get().status')) === 'running');
  await settle(ev);
  check('共 2 张解读卡', (await ev(`document.querySelectorAll('.chat__card').length`)) === 2);
  check('用户消息下显示语境', (await ev(`document.querySelectorAll('.chat__ctx')[0]?.textContent`)) === '语境 · 一个人对着水杯说');

  await ev(`document.querySelectorAll('.chat__card')[0].click()`);
  await sleep(100);
  check('点第一张解读卡 → activeId 回到 1', (await ev('__peng.store.get().activeId')) === 1);

  await ev(`(()=>{const i=${q('.chat__input')}; i.value='随便一句话'; i.dispatchEvent(new Event('input')); ${q('.chat__form')}.requestSubmit()})()`);
  await settle(ev);
  check('非示例句得到 mock_placeholder 响应', (await ev('__peng.store.get().messages.at(-1).resp.mock_placeholder')) === true);
  check('输入框 maxlength=200', (await ev(`${q('.chat__input')}.maxLength`)) === 200);

  await shot(`${SHOTS}/chat.png`);
  await view(400, 800);
  await go(`${BASE}/#/app`);
  check('窄屏不横向溢出', await ev('document.documentElement.scrollWidth <= document.documentElement.clientWidth'));
  await shot(`${SHOTS}/chat-400.png`);
});
