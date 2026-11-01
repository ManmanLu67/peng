import test from 'node:test';
import assert from 'node:assert/strict';
import { PengError } from '../src/core/contract.js';
import { chooseTargetRung, parseModelContent, create } from '../src/adapters/chat/live.js';
import { adapterFactories, applyLocalChat } from '../src/adapters/index.js';
import { readData, SAMPLE } from './helpers.mjs';

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

function model(content) {
  return jsonResponse({ choices: [{ message: { content } }] });
}

const OPTS = { baseUrl: 'https://api.example.com/v1', apiKey: 'secret', model: 'demo-model' };

test('submit：难句降到学习者档，不低于中文最低档', () => {
  assert.equal(chooseTargetRung('submit', 4, 8, 4), 4);
  assert.equal(chooseTargetRung('submit', 2, 8, 2), 2);
});

test('submit：句子已经不高于学习者时停在句子档', () => {
  assert.equal(chooseTargetRung('submit', 6, 3, 6), 3);
  assert.equal(chooseTargetRung('submit', 6, 6, 6), 6);
});

test('submit：没给出句子难度时当作原文，从而降到学习者档', () => {
  assert.equal(chooseTargetRung('submit', 4, undefined, 4), 4);
  assert.equal(chooseTargetRung('submit', 5, null, 5), 5);
});

test('submit：模型把难度写成英文档时仍停在中文', () => {
  assert.equal(chooseTargetRung('submit', 7, 1, 7), 2);
});

test('没看懂和升降档采用请求里的目标档，英文档允许', () => {
  assert.equal(chooseTargetRung('not_understood', 4, 8, 3), 3);
  assert.equal(chooseTargetRung('step_down', 2, 8, 1), 1);
  assert.equal(chooseTargetRung('step_up', 4, 8, 5), 5);
  assert.equal(chooseTargetRung('step_down', 4, 8, 0), 1);
  assert.equal(chooseTargetRung('step_up', 4, 8, 9), 8);
});

test('parseModelContent：去掉代码围栏并读出字段', () => {
  const parsed = parseModelContent('```json\n{"input_rung":8,"text":"水很烫。","english":"Hot.","culture_note":{"zh":"诗","en":"poem"}}\n```');
  assert.equal(parsed.input_rung, 8);
  assert.equal(parsed.text, '水很烫。');
  assert.equal(parsed.english, 'Hot.');
  assert.deepEqual(parsed.culture_note, { zh: '诗', en: 'poem' });
});

test('parseModelContent：语境有字才留下，空白当作没有', () => {
  assert.equal(parseModelContent('{"text":"水很烫。","context":" 对着水杯说 "}').context, '对着水杯说');
  assert.equal(parseModelContent('{"text":"水很烫。","context":"  "}').context, undefined);
  assert.equal(parseModelContent('{"text":"水很烫。"}').context, undefined);
});

test('parseModelContent：缺 text 抛 bad_response', () => {
  assert.throws(() => parseModelContent('{"input_rung":8}'), (err) => err instanceof PengError && err.code === 'bad_response');
  assert.throws(() => parseModelContent('not json'), (err) => err instanceof PengError && err.code === 'bad_response');
});

test('live 已登记，kind 为 live', () => {
  assert.equal(typeof adapterFactories.chat.live, 'function');
  assert.equal(create(OPTS).kind, 'live');
});

test('例句不打网络，沿用内置结果；没看懂也沿用', async () => {
  let called = false;
  const chat = create({
    ...OPTS,
    fetch: async () => { called = true; throw new Error('should not fetch'); },
  }, { data: { demo: readData('demo') } });
  const resp = await chat.send({
    action: 'submit', client: 'user', message: SAMPLE, target_rung: 4, current_rung: null,
  });
  assert.equal(called, false);
  assert.equal(resp.output.text, readData('demo').entries[0].rungs['4']);
  const down = await chat.send({
    action: 'not_understood', client: 'user', message: SAMPLE, target_rung: 3, current_rung: 4,
  });
  assert.equal(called, false);
  assert.equal(down.output.text, readData('demo').entries[0].rungs['3']);
});

test('demo 请求不打网络，走示例句', async () => {
  let called = false;
  const chat = create({
    ...OPTS,
    fetch: async () => { called = true; throw new Error('should not fetch'); },
  }, { data: { demo: readData('demo') } });
  const resp = await chat.send({
    action: 'submit', client: 'demo', message: SAMPLE, target_rung: 4, current_rung: null,
  });
  assert.equal(called, false);
  assert.equal(resp.rung, 4);
  assert.equal(resp.output.text, readData('demo').entries[0].rungs['4']);
});

test('submit 取更低档，请求打到 chat/completions', async () => {
  let url, init;
  const chat = create({
    ...OPTS,
    baseUrl: 'https://api.example.com/v1/',
    fetch: async (u, o) => {
      url = u;
      init = o;
      return model(JSON.stringify({ input_rung: 8, text: '水很烫。', english: 'Hot.', culture_note: { zh: '诗', en: 'poem' } }));
    },
  });
  const resp = await chat.send({
    action: 'submit', client: 'user', message: '日照香炉生紫烟', context: '水杯', target_rung: 4, current_rung: null,
  });
  assert.equal(url, 'https://api.example.com/v1/chat/completions');
  assert.equal(init.headers.Authorization, 'Bearer secret');
  const body = JSON.parse(init.body);
  assert.equal(body.model, 'demo-model');
  assert.equal(body.response_format.type, 'json_object');
  assert.match(body.messages.at(-1).content, /日照香炉生紫烟/);
  assert.equal(resp.ok, true);
  assert.equal(resp.intent, 'rewrite');
  assert.equal(resp.rung, 4);
  assert.equal(resp.input_rung, 8);
  assert.equal(resp.output.lang, 'zh');
  assert.equal(resp.output.text, '水很烫。');
  assert.equal(resp.reply_text, '水很烫。');
  assert.equal(resp.english, 'Hot.');
  assert.deepEqual(resp.culture_note, { zh: '诗', en: 'poem' });
  assert.equal(resp.mock_placeholder, undefined);
});

test('DeepSeek 关闭思考；其他接口不带 thinking', async () => {
  let deepseekBody;
  let otherBody;
  const deepseek = create({
    ...OPTS,
    baseUrl: 'https://api.deepseek.com',
    fetch: async (_u, o) => {
      deepseekBody = JSON.parse(o.body);
      return model(JSON.stringify({ input_rung: 8, text: '水很烫。' }));
    },
  });
  await deepseek.send({ action: 'submit', message: '水很烫', target_rung: 4 });
  assert.deepEqual(deepseekBody.thinking, { type: 'disabled' });

  const other = create({
    ...OPTS,
    baseUrl: 'https://api.example.com/v1',
    fetch: async (_u, o) => {
      otherBody = JSON.parse(o.body);
      return model(JSON.stringify({ input_rung: 8, text: '水很烫。' }));
    },
  });
  await other.send({ action: 'submit', message: '水很烫', target_rung: 4 });
  assert.equal(otherBody.thinking, undefined);
});

test('submit：只收下原文里写明的语境，没有就不带', async () => {
  let prompt = '';
  const chat = create({
    ...OPTS,
    fetch: async (_u, o) => {
      prompt = JSON.parse(o.body).messages.at(-1).content;
      return model(JSON.stringify({ input_rung: 8, text: '水很烫。', context: '一个人对着水杯说' }));
    },
  });
  const resp = await chat.send({
    action: 'submit', message: '一个人对着水杯说：日照香炉生紫烟', target_rung: 4,
  });
  assert.match(prompt, /context/);
  assert.match(prompt, /不要编造/);
  assert.equal(resp.context, '一个人对着水杯说');

  const echo = create({
    ...OPTS,
    fetch: async () => model(JSON.stringify({
      input_rung: 8, text: '水很烫。', context: '日照香炉生紫烟',
    })),
  });
  const same = await echo.send({ action: 'submit', message: '日照香炉生紫烟', target_rung: 4 });
  assert.equal(same.context, undefined);

  const none = create({
    ...OPTS,
    fetch: async () => model(JSON.stringify({ input_rung: 8, text: '水很烫。', context: '' })),
  });
  const empty = await none.send({ action: 'submit', message: '日照香炉生紫烟', target_rung: 4 });
  assert.equal(empty.context, undefined);
});

test('submit：句子更简单时停在句子档', async () => {
  const chat = create({
    ...OPTS,
    fetch: async () => model(JSON.stringify({ input_rung: 3, text: '水很烫。' })),
  });
  const resp = await chat.send({ action: 'submit', message: '水很烫', target_rung: 6 });
  assert.equal(resp.rung, 3);
  assert.equal(resp.input_rung, 3);
  assert.equal(resp.english, undefined);
});

test('没看懂按请求降到英文档，不改写句子难度', async () => {
  const chat = create({
    ...OPTS,
    fetch: async () => model(JSON.stringify({ input_rung: 8, text: 'The water is hot.' })),
  });
  const resp = await chat.send({
    action: 'not_understood', message: SAMPLE, current_rung: 2, target_rung: 1,
  });
  assert.equal(resp.intent, 'not_understood');
  assert.equal(resp.rung, 1);
  assert.equal(resp.output.lang, 'en');
  assert.equal(resp.input_rung, undefined);
});

test('401 与 403 是 auth，其它 HTTP 失败是 network', async () => {
  const auth = create({ ...OPTS, fetch: async () => jsonResponse({}, 401) });
  await assert.rejects(
    () => auth.send({ action: 'submit', message: 'x', target_rung: 4 }),
    (err) => err instanceof PengError && err.code === 'auth',
  );
  const forbidden = create({ ...OPTS, fetch: async () => jsonResponse({}, 403) });
  await assert.rejects(
    () => forbidden.send({ action: 'submit', message: 'x', target_rung: 4 }),
    (err) => err instanceof PengError && err.code === 'auth',
  );
  const down = create({ ...OPTS, fetch: async () => jsonResponse({}, 500) });
  await assert.rejects(
    () => down.send({ action: 'submit', message: 'x', target_rung: 4 }),
    (err) => err instanceof PengError && err.code === 'network',
  );
});

test('调用方取消是 aborted，超时是 timeout', async () => {
  const aborted = create({
    ...OPTS,
    fetch: async () => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }); },
  });
  const ctl = new AbortController();
  ctl.abort();
  await assert.rejects(
    () => aborted.send({ action: 'submit', message: 'x', target_rung: 4 }, { signal: ctl.signal }),
    (err) => err instanceof PengError && err.code === 'aborted',
  );

  const timed = create({
    ...OPTS,
    timeoutMs: 5,
    fetch: (_u, o) => new Promise((_resolve, reject) => {
      o.signal.addEventListener('abort', () => {
        reject(Object.assign(new Error('timeout'), { name: 'AbortError' }));
      });
    }),
  });
  await assert.rejects(
    () => timed.send({ action: 'submit', message: 'x', target_rung: 4 }),
    (err) => err instanceof PengError && err.code === 'timeout',
  );
});

test('有密钥和地址才改用 live，空配置保持 mock', () => {
  const base = { chat: { use: 'mock', options: { delayMs: [0, 0] } }, clock: { use: 'real' } };
  assert.equal(applyLocalChat(base, null), base);
  assert.equal(applyLocalChat(base, { chat: { apiKey: '', baseUrl: 'https://api.example.com/v1' } }), base);
  assert.equal(applyLocalChat(base, { chat: { apiKey: 'k', baseUrl: '  ' } }), base);
  const next = applyLocalChat(base, {
    chat: { apiKey: ' k ', baseUrl: 'https://api.example.com/v1/', model: 'm', timeoutMs: 1000 },
  });
  assert.equal(next.chat.use, 'live');
  assert.equal(next.chat.options.apiKey, 'k');
  assert.equal(next.chat.options.baseUrl, 'https://api.example.com/v1/');
  assert.equal(next.chat.options.model, 'm');
  assert.equal(next.clock, base.clock);
});

test('聊天请求即使被写成解释，也只返回回复', async () => {
  let prompt = '';
  const chat = create({
    ...OPTS,
    fetch: async (_u, o) => {
      prompt = JSON.parse(o.body).messages.at(-1).content;
      return model(JSON.stringify({
        intent: 'explain', reply: '这句是在说月光。', sentence: '床前明月光',
        input_rung: 8, text: '床前有明亮的月光。',
      }));
    },
  }, { data: { demo: readData('demo') } });
  const resp = await chat.send({
    action: 'chat', message: SAMPLE, target_rung: 4, history: [{ role: 'user', text: '上一句' }],
  });
  assert.equal(resp.intent, 'chat');
  assert.equal(resp.reply_text, '这句是在说月光。');
  assert.equal(resp.sentence, undefined);
  assert.match(prompt, /只聊天/);
  assert.match(prompt, /上一句/);
});

test('降维翻译的示例句不打网络，聊天同一句会打网络', async () => {
  let called = false;
  const exact = create({
    ...OPTS,
    fetch: async () => { called = true; throw new Error('should not fetch'); },
  }, { data: { demo: readData('demo') } });
  const sample = await exact.send({ action: 'submit', client: 'user', message: SAMPLE, target_rung: 4 });
  const down = await exact.send({ action: 'not_understood', client: 'user', message: SAMPLE, target_rung: 3, current_rung: 4 });
  assert.equal(called, false);
  assert.equal(sample.output.text, readData('demo').entries[0].rungs['4']);
  assert.equal(down.output.text, readData('demo').entries[0].rungs['3']);
});

test('模型正文不是 JSON 时是 bad_response', async () => {
  const chat = create({ ...OPTS, fetch: async () => model('你好') });
  await assert.rejects(
    () => chat.send({ action: 'submit', message: 'x', target_rung: 4 }),
    (err) => err instanceof PengError && err.code === 'bad_response',
  );
});
