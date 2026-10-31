import test from 'node:test';
import assert from 'node:assert/strict';
import { createLadder } from '../src/core/ladder.js';
import { createFlow } from '../src/core/flow.js';
import { readData } from './helpers.mjs';

const ladder = createLadder(readData('rungs'));
const flow = createFlow({ ladder, nodes: readData('nodes') });
const init = () => flow.initialState({ hskRung: ladder.hskToRung(3) });

const resp = (rung, extra = {}) => ({
  ok: true, intent: 'rewrite', rung, input_rung: 8,
  output: { lang: rung === 1 ? 'en' : 'zh', text: `r${rung}` }, reply_text: `r${rung}`, error: null, ...extra,
});

/** 提交 + 返回响应，得到 result 状态 */
function resolved(rung = 4) {
  let { state, effects } = flow.reduce(init(), { type: 'SUBMIT', text: '日照香炉生紫烟', context: '' });
  ({ state } = flow.reduce(state, { type: 'RESPONSE', reqId: effects[0].reqId, resp: resp(rung) }));
  return state;
}

test('初始：idle，4 个节点全空，起点 HSK 3 = 第 4 级', () => {
  const s = init();
  assert.equal(s.status, 'idle');
  assert.equal(s.hskStart, 4);
  assert.deepEqual(Object.values(s.nodes), ['idle', 'idle', 'idle', 'idle']);
});

test('SUBMIT：转 running，生成 CALL_CHAT，请求带所选档', () => {
  const { state, effects } = flow.reduce(init(), { type: 'SUBMIT', text: ' 日照香炉生紫烟 ', context: '水杯' });
  assert.equal(state.status, 'running');
  assert.equal(effects.length, 1);
  assert.equal(effects[0].type, 'CALL_CHAT');
  assert.equal(effects[0].req.action, 'submit');
  assert.equal(effects[0].req.message, '日照香炉生紫烟');
  assert.equal(effects[0].req.target_rung, 4);
  assert.deepEqual(effects[0].path, ['rewrite']);
});

test('SUBMIT：空输入与运行中重复提交被忽略', () => {
  const empty = flow.reduce(init(), { type: 'SUBMIT', text: '   ' });
  assert.equal(empty.state.status, 'idle');
  assert.equal(empty.effects.length, 0);

  const first = flow.reduce(init(), { type: 'SUBMIT', text: 'a' });
  const again = flow.reduce(first.state, { type: 'SUBMIT', text: 'b' });
  assert.equal(again.state, first.state);
  assert.equal(again.effects.length, 0);
});

test('RESPONSE：按返回的 rung 渲染；英文档转 english；无 trace 标记模拟回放', () => {
  const s4 = resolved(4);
  assert.equal(s4.status, 'result');
  assert.equal(s4.rung, 4);
  assert.equal(s4.traceSimulated, true);
  assert.equal(resolved(1).status, 'english');
});

test('RESPONSE：有 trace 时不是模拟回放', () => {
  let { state, effects } = flow.reduce(init(), { type: 'SUBMIT', text: 'x' });
  ({ state } = flow.reduce(state, {
    type: 'RESPONSE', reqId: effects[0].reqId,
    resp: resp(4, { trace: [{ node: 'rewrite', status: 'done' }] }),
  }));
  assert.equal(state.traceSimulated, false);
});

test('防乱序：reqId 对不上的响应被丢弃', () => {
  const { state } = flow.reduce(init(), { type: 'SUBMIT', text: 'x' });
  const late = flow.reduce(state, { type: 'RESPONSE', reqId: state.reqId - 1, resp: resp(4) });
  assert.equal(late.state, state);
  assert.equal(late.state.status, 'running');
});

test('没看懂：降一级，路径 01→02→03', () => {
  const { state, effects } = flow.reduce(resolved(4), { type: 'NOT_UNDERSTOOD' });
  assert.equal(state.status, 'running');
  assert.equal(effects[0].req.action, 'not_understood');
  assert.equal(effects[0].req.target_rung, 3);
  assert.deepEqual(effects[0].path, ['rewrite', 'notclear', 'stepdown']);
});

test('更简单 / 更接近原文：不经过 02、03', () => {
  const down = flow.reduce(resolved(4), { type: 'STEP_DOWN' });
  assert.deepEqual(down.effects[0].path, ['rewrite']);
  assert.equal(down.effects[0].req.target_rung, 3);
  const up = flow.reduce(resolved(4), { type: 'STEP_UP' });
  assert.deepEqual(up.effects[0].path, ['rewrite']);
  assert.equal(up.effects[0].req.target_rung, 5);
});

test('两端：英文档不能再降，原文档不能再升', () => {
  const en = resolved(1);
  assert.equal(flow.reduce(en, { type: 'STEP_DOWN' }).state, en);
  assert.equal(flow.reduce(en, { type: 'NOT_UNDERSTOOD' }).state, en);
  const org = resolved(8);
  assert.equal(flow.reduce(org, { type: 'STEP_UP' }).state, org);
});

test('没有结果时升降无效', () => {
  const s = init();
  assert.equal(flow.reduce(s, { type: 'STEP_DOWN' }).state, s);
  assert.equal(flow.reduce(s, { type: 'NOT_UNDERSTOOD' }).state, s);
  assert.equal(flow.reduce(s, { type: 'UNDERSTOOD' }).state, s);
});

test('看懂了：不调接口，只播 02、04，03 标记跳过', () => {
  const s = resolved(2);
  const { state, effects } = flow.reduce(s, { type: 'UNDERSTOOD' });
  assert.equal(state.understood, true);
  assert.equal(effects.length, 1);
  assert.equal(effects[0].type, 'PLAY_PATH');
  assert.deepEqual(effects[0].path, ['notclear', 'bridge']);
  assert.equal(state.nodes.stepdown, 'skipped');
  // 再点一次无效
  assert.equal(flow.reduce(state, { type: 'UNDERSTOOD' }).state, state);
});

test('FAIL：转 error，正在执行的节点画叉，保留消息便于重试', () => {
  let { state, effects } = flow.reduce(init(), { type: 'SUBMIT', text: '日照香炉生紫烟' });
  ({ state } = flow.reduce(state, { type: 'NODE', id: 'rewrite', status: 'running' }));
  const failed = flow.reduce(state, { type: 'FAIL', reqId: effects[0].reqId, code: 'timeout' });
  assert.equal(failed.state.status, 'error');
  assert.equal(failed.state.error.code, 'timeout');
  assert.equal(failed.state.nodes.rewrite, 'error');
  assert.equal(failed.state.messages[0].text, '日照香炉生紫烟');
});

test('RETRY：重发上一个请求', () => {
  let { state, effects } = flow.reduce(init(), { type: 'SUBMIT', text: 'x' });
  ({ state } = flow.reduce(state, { type: 'FAIL', reqId: effects[0].reqId, code: 'network' }));
  const retry = flow.reduce(state, { type: 'RETRY' });
  assert.equal(retry.state.status, 'running');
  assert.equal(retry.effects[0].req.message, 'x');
  assert.ok(retry.state.reqId > effects[0].reqId);
  // 非 error 状态下 RETRY 无效
  assert.equal(flow.reduce(init(), { type: 'RETRY' }).effects.length, 0);
});

test('失败后重新提交：无结果的旧消息被替换，不残留', () => {
  let { state, effects } = flow.reduce(init(), { type: 'SUBMIT', text: 'a' });
  ({ state } = flow.reduce(state, { type: 'FAIL', reqId: effects[0].reqId, code: 'network' }));
  ({ state } = flow.reduce(state, { type: 'SUBMIT', text: 'b' }));
  assert.deepEqual(state.messages.map((m) => m.text), ['b']);
});

test('SET_HSK 只改起点，不动当前结果', () => {
  const s = resolved(4);
  const { state } = flow.reduce(s, { type: 'SET_HSK', rung: 6 });
  assert.equal(state.hskStart, 6);
  assert.equal(state.rung, 4);
  assert.equal(state.status, 'result');
});

test('SELECT_MESSAGE：切换解读卡恢复该条的档位', () => {
  let s = resolved(4);
  ({ state: s } = flow.reduce(s, { type: 'SUBMIT', text: '第二句' }));
  ({ state: s } = flow.reduce(s, { type: 'RESPONSE', reqId: s.reqId, resp: resp(1) }));
  assert.equal(s.status, 'english');
  const back = flow.reduce(s, { type: 'SELECT_MESSAGE', id: 1 });
  assert.equal(back.state.rung, 4);
  assert.equal(back.state.status, 'result');
});

test('RESET：回到 idle 并取消在途任务', () => {
  const { state, effects } = flow.reduce(resolved(4), { type: 'RESET' });
  assert.equal(state.status, 'idle');
  assert.equal(state.messages.length, 0);
  assert.deepEqual(effects, [{ type: 'CANCEL' }]);
});
