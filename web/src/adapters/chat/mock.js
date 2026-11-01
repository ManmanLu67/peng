// 模拟聊天后端：读 data/demo.json，不联网。断网也能跑完整流程。
//
// options.delayMs  [min, max] 毫秒，给节点动画留出时间（测试传 [0, 0]）
// options.fail     () => boolean，返回 true 时抛 network 错误，用来现场演示 error 状态
// env.data.demo    demo.json 的内容（由 app.js 注入）

import { PengError, assertValid } from '../../core/contract.js';

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new PengError('aborted'));
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(t);
      reject(new PengError('aborted'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

const INTENT = {
  submit: 'rewrite',
  not_understood: 'not_understood',
  step_down: 'level_changed',
  step_up: 'level_changed',
  chat: 'other',
};

/** 本次要输出哪一档。submit 取所选档，其余在当前档上移动一级。 */
function targetRung(req) {
  const cur = req.current_rung ?? req.target_rung;
  let n;
  switch (req.action) {
    case 'step_down':
    case 'not_understood': n = cur - 1; break;
    case 'step_up': n = cur + 1; break;
    default: n = req.target_rung ?? cur;
  }
  return Math.min(8, Math.max(1, n));
}

export function create(options = {}, env = {}) {
  const { delayMs = [500, 900], fail = () => false } = options;
  const entries = env.data?.demo?.entries ?? [];

  const find = (text) => entries.find((e) => text.trim() === e.match) ?? null;

  function build(req, n) {
    const entry = find(req.message);
    const lang = n === 1 ? 'en' : 'zh';

    if (req.action === 'chat') {
      const reply = '接上模型后才能对话';
      return {
        ok: true,
        intent: 'chat',
        rung: req.target_rung ?? 4,
        output: { lang: 'zh', text: reply },
        reply_text: reply,
        error: null,
      };
    }

    if (entry) {
      const text = entry.rungs[String(n)];
      return {
        ok: true,
        intent: INTENT[req.action] ?? 'other',
        rung: n,
        input_rung: entry.input_rung ?? 8,
        output: { lang, text },
        reply_text: text,
        english: entry.english,
        culture_note: entry.culture_note,
        error: null,
      };
    }

    // 升降档时没有准备好的句子：原样停在原文
    const text = req.message;
    return {
      ok: true,
      intent: INTENT[req.action] ?? 'other',
      rung: 8,
      output: { lang: 'zh', text },
      reply_text: text,
      error: null,
    };
  }

  return {
    kind: 'mock',
    async send(req, { signal } = {}) {
      const [lo, hi] = delayMs;
      if (signal?.aborted) throw new PengError('aborted');
      // 延迟为 0 时不建定时器（测试用），仍然异步返回
      if (hi > 0) await sleep(lo + Math.random() * (hi - lo), signal);
      if (fail()) throw new PengError('network', '模拟失败（?mock=fail）');
      return assertValid(build(req, targetRung(req)));
    },
  };
}
