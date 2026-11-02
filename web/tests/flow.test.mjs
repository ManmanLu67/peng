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

test('请求在途时 traceSimulated=true（节点是模拟点亮的），带真实 trace 的响应回来后改为 false', () => {
  const { state: running, effects } = flow.reduce(init(), { type: 'SUBMIT', text: 'x' });
  assert.equal(running.traceSimulated, true);
  const { state: done } = flow.reduce(running, {
    type: 'RESPONSE', reqId: effects[0].reqId,
    resp: resp(4, { trace: [{ node: 'rewrite', status: 'done' }] }),
  });
  assert.equal(done.traceSimulated, false);
  // 再发一次请求（没看懂），在途期间重新变回模拟
  const again = flow.reduce(done, { type: 'NOT_UNDERSTOOD' });
  assert.equal(again.state.traceSimulated, true);
});

test('SUBMIT：原文里用冒号写出的场景，立刻出现在这句话下面', () => {
  const { state } = flow.reduce(init(), { type: 'SUBMIT', text: '一个人对着水杯说：这水太烫了' });
  assert.equal(state.messages[0].text, '一个人对着水杯说：这水太烫了');
  assert.equal(state.messages[0].context, '一个人对着水杯说');

  const plain = flow.reduce(init(), { type: 'SUBMIT', text: '床前明月光' });
  assert.equal(plain.state.messages[0].context, '');

  const given = flow.reduce(init(), { type: 'SUBMIT', text: '日照香炉生紫烟', context: '一个人对着水杯说' });
  assert.equal(given.state.messages[0].context, '一个人对着水杯说');
});

test('SUBMIT：转 running，生成 CALL_CHAT，请求带所选档', () => {
  const { state, effects } = flow.reduce(init(), { type: 'SUBMIT', text: ' 日照香炉生紫烟 ', context: '水杯' });
  assert.equal(state.status, 'running');
  assert.equal(effects.length, 1);
  assert.equal(effects[0].type, 'CALL_CHAT');
  assert.equal(state.inputMode, 'translate');
  assert.equal(effects[0].req.action, 'submit');
  assert.equal(effects[0].req.message, '日照香炉生紫烟');
  assert.equal(effects[0].req.target_rung, 4);
  assert.equal(effects[0].req.client, 'user');
  assert.deepEqual(effects[0].path, ['rewrite']);
  assert.equal(state.activeId, null);
  assert.equal(state.rung, null);
});

test('演示中的请求标成 demo，平时是 user', () => {
  const demoOn = flow.reduce(init(), { type: 'SET_DEMO', on: true }).state;
  const sent = flow.reduce(demoOn, { type: 'SUBMIT', text: 'a' });
  assert.equal(sent.effects[0].req.client, 'demo');
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

test('RESPONSE：模型认出的语境写到这句话下面；空白保持空；已有语境不覆盖', () => {
  let { state, effects } = flow.reduce(init(), { type: 'SUBMIT', text: '一个人对着水杯说：日照香炉生紫烟' });
  ({ state } = flow.reduce(state, {
    type: 'RESPONSE', reqId: effects[0].reqId,
    resp: resp(4, { context: ' 一个人对着水杯说 ' }),
  }));
  assert.equal(state.messages[0].context, '一个人对着水杯说');
  assert.equal(state.messages[0].text, '一个人对着水杯说：日照香炉生紫烟');
  const down = flow.reduce(state, { type: 'NOT_UNDERSTOOD' });
  assert.equal(down.effects[0].req.context, '一个人对着水杯说');

  const blank = flow.reduce(init(), { type: 'SUBMIT', text: '日照香炉生紫烟' });
  const noScene = flow.reduce(blank.state, {
    type: 'RESPONSE', reqId: blank.effects[0].reqId,
    resp: resp(4, { context: '  ' }),
  });
  assert.equal(noScene.state.messages[0].context, '');

  const kept = flow.reduce(init(), { type: 'SUBMIT', text: '日照香炉生紫烟', context: '一个人对着水杯说' });
  const still = flow.reduce(kept.state, {
    type: 'RESPONSE', reqId: kept.effects[0].reqId,
    resp: resp(4, { context: '别的场景' }),
  });
  assert.equal(still.state.messages[0].context, '一个人对着水杯说');
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

test('英文档不能再降', () => {
  const en = resolved(1);
  assert.equal(flow.reduce(en, { type: 'NOT_UNDERSTOOD' }).state, en);
});

test('没有结果时降档无效', () => {
  const s = init();
  assert.equal(flow.reduce(s, { type: 'NOT_UNDERSTOOD' }).state, s);
});

test('已删除的事件不再改变状态：看懂了、更简单、还原', () => {
  const s = resolved(4);
  for (const type of ['UNDERSTOOD', 'STEP_DOWN', 'STEP_UP']) {
    const r = flow.reduce(s, { type });
    assert.equal(r.state, s, type);
    assert.equal(r.effects.length, 0, type);
  }
  assert.equal('understood' in s, false);
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

test('普通回复不改变档位，也不换掉右侧那条解释', () => {
  const explained = flow.reduce(resolved(4), { type: 'SET_INPUT_MODE', mode: 'chat' }).state;
  assert.equal(explained.rung, 4);
  const { state, effects } = flow.reduce(explained, { type: 'SUBMIT', text: '你好' });
  assert.equal(state.activeId, explained.activeId);
  assert.equal(state.rung, 4);
  assert.deepEqual(effects[0].path, []);
  assert.equal(effects[0].req.action, 'chat');
  const chat = flow.reduce(state, {
    type: 'RESPONSE', reqId: effects[0].reqId,
    resp: { ok: true, intent: 'chat', rung: 4, output: { lang: 'zh', text: '你好呀' }, reply_text: '你好呀', error: null },
  });
  assert.equal(chat.state.rung, 4);
  assert.equal(chat.state.activeId, explained.activeId);
  assert.equal(chat.state.status, 'result');
  assert.equal(chat.state.messages.at(-1).mode, 'chat');
  assert.equal(chat.state.messages.at(-1).reply, '你好呀');
  assert.equal(chat.state.nodes.rewrite, 'idle');
});

test('聊天模式不改右侧；降档不改已经抽出的原句', () => {
  const chatting = flow.reduce(init(), { type: 'SET_INPUT_MODE', mode: 'chat' }).state;
  let { state, effects } = flow.reduce(chatting, { type: 'SUBMIT', text: '床前明月光' });
  assert.equal(effects[0].req.action, 'chat');
  assert.deepEqual(effects[0].path, []);
  assert.equal(state.messages[0].context, '');
  ({ state } = flow.reduce(state, {
    type: 'RESPONSE', reqId: effects[0].reqId,
    resp: {
      ok: true, intent: 'explain', sentence: '床前明月光', rung: 4,
      output: { lang: 'zh', text: '不该上右侧' }, reply_text: '这是一句诗。', error: null,
    },
  }));
  assert.equal(state.rung, null);
  assert.equal(state.activeId, null);
  assert.equal(state.messages.at(-1).mode, 'chat');
  assert.equal(state.messages.at(-1).reply, '这是一句诗。');

  const back = flow.reduce(state, { type: 'SET_INPUT_MODE', mode: 'translate' }).state;
  ({ state, effects } = flow.reduce(back, { type: 'SUBMIT', text: '我不懂床前明月光是什么意思' }));
  assert.equal(effects[0].req.action, 'submit');
  assert.deepEqual(effects[0].path, ['rewrite']);
  ({ state } = flow.reduce(state, {
    type: 'RESPONSE', reqId: effects[0].reqId, resp: resp(4, { sentence: '床前明月光' }),
  }));
  assert.equal(state.messages.at(-1).subject, '床前明月光');
  const down = flow.reduce(state, { type: 'NOT_UNDERSTOOD' });
  ({ state } = flow.reduce(down.state, {
    type: 'RESPONSE', reqId: down.effects[0].reqId, resp: resp(3),
  }));
  assert.equal(state.rung, 3);
  assert.equal(state.messages.at(-1).subject, '床前明月光');
  assert.equal(down.effects[0].req.message, '床前明月光');
});

test('语法点记在这句话上，换档不改也不丢', () => {
  const point = { title: '虽然……但是……', zh: '表示转折。', en: 'although... but', level: 3 };
  let { state, effects } = flow.reduce(init(), { type: 'SUBMIT', text: '虽然冷，但是他没穿外套' });
  assert.deepEqual(state.messages[0].grammar, []);
  ({ state } = flow.reduce(state, {
    type: 'RESPONSE', reqId: effects[0].reqId, resp: resp(4, { grammar: [point] }),
  }));
  assert.deepEqual(state.messages[0].grammar, [point]);
  const down = flow.reduce(state, { type: 'NOT_UNDERSTOOD' });
  ({ state } = flow.reduce(down.state, {
    type: 'RESPONSE', reqId: down.effects[0].reqId, resp: resp(3, { grammar: [{ title: '别的', zh: '别的讲解' }] }),
  }));
  assert.deepEqual(state.messages[0].grammar, [point]);

  const none = flow.reduce(init(), { type: 'SUBMIT', text: '水很烫' });
  const bare = flow.reduce(none.state, { type: 'RESPONSE', reqId: none.effects[0].reqId, resp: resp(4) });
  assert.deepEqual(bare.state.messages[0].grammar, []);
});

test('点阶梯换档，原句、语境和拼音保持不动', () => {
  let { state, effects } = flow.reduce(init(), { type: 'SUBMIT', text: '一个人对着水杯说：日照香炉生紫烟' });
  ({ state } = flow.reduce(state, {
    type: 'RESPONSE', reqId: effects[0].reqId,
    resp: resp(4, { pinyin: 'rì zhào xiāng lú shēng zǐ yān' }),
  }));
  assert.equal(state.messages[0].pinyin, 'rì zhào xiāng lú shēng zǐ yān');
  const jump = flow.reduce(state, { type: 'SET_RUNG', rung: 2 });
  assert.equal(jump.effects[0].req.action, 'set_rung');
  assert.equal(jump.effects[0].req.target_rung, 2);
  assert.equal(jump.effects[0].req.message, '一个人对着水杯说：日照香炉生紫烟');
  assert.deepEqual(jump.effects[0].path, ['rewrite']);
  ({ state } = flow.reduce(jump.state, {
    type: 'RESPONSE', reqId: jump.effects[0].reqId,
    resp: resp(2, { pinyin: 'bié de pīn yīn', sentence: '另一句' }),
  }));
  assert.equal(state.rung, 2);
  assert.equal(state.messages[0].text, '一个人对着水杯说：日照香炉生紫烟');
  assert.equal(state.messages[0].context, '一个人对着水杯说');
  assert.equal(state.messages[0].pinyin, 'rì zhào xiāng lú shēng zǐ yān');

  const same = flow.reduce(state, { type: 'SET_RUNG', rung: 2 });
  assert.equal(same.effects.length, 0);
  const busy = flow.reduce(jump.state, { type: 'SET_RUNG', rung: 1 });
  assert.equal(busy.effects.length, 0);
});

test('RESET：回到 idle 并取消在途任务', () => {
  const { state, effects } = flow.reduce(resolved(4), { type: 'RESET' });
  assert.equal(state.status, 'idle');
  assert.equal(state.messages.length, 0);
  assert.deepEqual(effects, [{ type: 'CANCEL' }]);
});
