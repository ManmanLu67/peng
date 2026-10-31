// 整条链路：commands + mock 聊天 + fake 时钟，不开浏览器。
import test from 'node:test';
import assert from 'node:assert/strict';
import { PengError } from '../src/core/contract.js';
import { setup, settle, flush, SAMPLE } from './helpers.mjs';

test('水杯例句：HSK 3 提交 → 连点“没看懂”降到英文 → 看懂了', async () => {
  const { commands, store, clock, ladder } = setup();

  commands.submit(SAMPLE, '一个人对着水杯说');
  assert.equal(store.get().status, 'running');
  await settle(clock);
  let s = store.get();
  assert.equal(s.status, 'result');
  assert.equal(s.rung, 4);
  assert.equal(s.messages[0].resp.output.text, '这是一句古诗。他的意思是：水很烫，有热气。');
  assert.equal(s.nodes.rewrite, 'done');

  const seen = [];
  for (let i = 0; i < 3; i++) {
    commands.notUnderstood();
    await settle(clock);
    seen.push(store.get().rung);
  }
  assert.deepEqual(seen, [3, 2, 1]);
  s = store.get();
  assert.equal(s.status, 'english');
  assert.equal(ladder.availability(s).simpler, false);

  // 没看懂 = 01→02→03 全部点亮
  assert.deepEqual([s.nodes.rewrite, s.nodes.notclear, s.nodes.stepdown], ['done', 'done', 'done']);

  commands.understood();
  await settle(clock);
  s = store.get();
  assert.equal(s.understood, true);
  assert.equal(s.nodes.bridge, 'done');
  assert.equal(s.nodes.stepdown, 'skipped');
});

test('更简单 / 还原不经过节点 02、03；没看懂会经过', async () => {
  const { commands, store, clock } = setup();
  commands.submit(SAMPLE);
  await settle(clock);

  commands.stepDown();
  await settle(clock);
  assert.equal(store.get().rung, 3);
  assert.equal(store.get().nodes.notclear, 'idle');
  assert.equal(store.get().nodes.stepdown, 'idle');

  commands.stepUp();
  await settle(clock);
  assert.equal(store.get().rung, 4);
  assert.equal(store.get().nodes.notclear, 'idle');

  commands.notUnderstood();
  await settle(clock);
  assert.equal(store.get().nodes.notclear, 'done');
  assert.equal(store.get().nodes.stepdown, 'done');
});

test('节点逐个点亮，不是一次全亮', async () => {
  const { commands, store, clock } = setup();
  commands.submit(SAMPLE);
  commands.notUnderstood(); // running 中被忽略
  assert.equal(store.get().nodes.rewrite, 'running');
  await settle(clock);
  commands.notUnderstood();
  assert.equal(store.get().nodes.rewrite, 'running');
  assert.equal(store.get().nodes.notclear, 'idle');
  clock.tick(500); // random=0.5 → 停留 600ms，仍在 01
  assert.equal(store.get().nodes.rewrite, 'running');
  clock.tick(200);
  assert.equal(store.get().nodes.rewrite, 'done');
  assert.equal(store.get().nodes.notclear, 'running');
});

test('接口失败：error，节点画叉，输入保留，重试成功', async () => {
  let failing = true;
  const { commands, store, clock } = setup({ chatOptions: { fail: () => failing } });
  commands.submit(SAMPLE, '水杯');
  await settle(clock);
  let s = store.get();
  assert.equal(s.status, 'error');
  assert.equal(s.error.code, 'network');
  assert.equal(s.nodes.rewrite, 'error');
  assert.equal(s.messages[0].text, SAMPLE);

  failing = false;
  commands.retry();
  await settle(clock);
  s = store.get();
  assert.equal(s.status, 'result');
  assert.equal(s.rung, 4);
  assert.equal(s.error, null);
});

test('error:shown 事件在失败时发出', async () => {
  const { commands, bus, clock } = setup({ chatOptions: { fail: () => true } });
  const events = [];
  bus.on('error:shown', (e) => events.push(e.code));
  commands.submit(SAMPLE);
  await settle(clock);
  assert.deepEqual(events, ['network']);
});

test('非示例句：返回占位，并带 mock_placeholder 标记', async () => {
  const { commands, store, clock } = setup();
  commands.submit('随便一句话');
  await settle(clock);
  const resp = store.get().messages[0].resp;
  assert.equal(resp.mock_placeholder, true);
  assert.match(resp.output.text, /模拟数据/);
});

test('防乱序：慢的旧响应不会覆盖新状态', async () => {
  // 第一次提交的响应很慢（手动放行），期间 RESET 后重新提交
  const gates = [];
  const slowChat = {
    kind: 'mock',
    send: (req, { signal } = {}) => new Promise((resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new PengError('aborted')));
      gates.push(() => resolve({
        ok: true, intent: 'rewrite', rung: req.target_rung, input_rung: 8,
        output: { lang: 'zh', text: `答:${req.message}` }, reply_text: `答:${req.message}`, error: null,
      }));
    }),
  };
  const { commands, store, clock } = setup({ chat: slowChat });

  commands.submit('旧');
  commands.reset();
  commands.submit('新');
  gates[0]();                 // 旧请求已被 abort，放行无效
  gates[1]();
  await settle(clock);
  const s = store.get();
  assert.equal(s.status, 'result');
  assert.equal(s.messages.length, 1);
  assert.equal(s.messages[0].text, '新');
  assert.equal(s.messages[0].resp.output.text, '答:新');
});

test('RESET 后没有残留的节点定时器', async () => {
  const { commands, store, clock } = setup();
  commands.submit(SAMPLE);
  await flush();
  commands.reset();
  assert.equal(clock.pending(), 0);
  assert.equal(store.get().status, 'idle');
  await settle(clock);
  assert.equal(store.get().status, 'idle');
});

test('store.subscribe：只在切片变化时通知', async () => {
  const { commands, store, clock } = setup();
  const calls = [];
  store.subscribe((s) => s.rung, (rung) => calls.push(rung));
  commands.submit(SAMPLE);
  await settle(clock);
  commands.stepDown();
  await settle(clock);
  assert.deepEqual(calls, [4, 3]);
});
