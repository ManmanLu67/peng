// 浏览器直连的 OpenAI 兼容聊天。档位由 chooseTargetRung 决定，不信模型自报的目标档。
// 演示请求（client === 'demo'）转给 mock，不打网络。
import { PengError, assertValid } from '../../core/contract.js';
import { create as createMock } from './mock.js';

const RUNG_LABEL = {
  1: '英文',
  2: 'HSK 1',
  3: 'HSK 2',
  4: 'HSK 3',
  5: 'HSK 4',
  6: 'HSK 5',
  7: 'HSK 6',
  8: '原文或古文',
};

const INTENT = {
  submit: 'rewrite',
  not_understood: 'not_understood',
  step_down: 'level_changed',
  step_up: 'level_changed',
  chat: 'other',
};

const SYSTEM = '你是汉语分级改写器。只输出一个 JSON 对象，不要 markdown，不要解释。档位：8 原文或古文，7 HSK 6，6 HSK 5，5 HSK 4，4 HSK 3，3 HSK 2，2 HSK 1，1 英文。';

function clampInt(n, lo, hi) {
  const x = Number(n);
  if (!Number.isInteger(x)) return null;
  return Math.min(hi, Math.max(lo, x));
}

/** 句子难度：缺省当原文 8；夹到 2–8，首次提交不会掉进英文。 */
function sentenceRung(inputRung) {
  if (inputRung == null || inputRung === '') return 8;
  return clampInt(inputRung, 2, 8) ?? 8;
}

/**
 * submit：T = min(学习者档, 句子难度)，夹在 2–7。
 * 没看懂 / 升降档：采用请求里的 target_rung，允许英文档 1。
 */
export function chooseTargetRung(action, userRung, inputRung, requested) {
  if (action === 'submit') {
    const learner = clampInt(userRung, 2, 7) ?? 4;
    return Math.min(learner, sentenceRung(inputRung));
  }
  return clampInt(requested, 1, 8) ?? 1;
}

/** 去掉 ```json 围栏，解析模型 JSON。缺 text 抛 bad_response。 */
export function parseModelContent(raw) {
  if (typeof raw !== 'string') throw new PengError('bad_response', '模型没有返回文本');
  let body = raw.trim();
  const fence = body.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) body = fence[1].trim();
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    throw new PengError('bad_response', '模型返回的不是 JSON');
  }
  if (!data || typeof data.text !== 'string' || data.text.trim() === '') {
    throw new PengError('bad_response', '模型返回缺少 text');
  }
  const note = data.culture_note;
  const culture = note && typeof note === 'object'
    ? {
        zh: typeof note.zh === 'string' ? note.zh : '',
        en: typeof note.en === 'string' ? note.en : '',
      }
    : null;
  return {
    input_rung: Number.isInteger(data.input_rung) ? data.input_rung : undefined,
    text: data.text.trim(),
    english: typeof data.english === 'string' ? data.english.trim() : '',
    culture_note: culture && (culture.zh || culture.en) ? culture : undefined,
  };
}

function endpoint(baseUrl) {
  const trimmed = String(baseUrl ?? '').trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/chat/completions')) return trimmed;
  return `${trimmed}/chat/completions`;
}

function promptFor(req) {
  const context = req.context?.trim() ? req.context.trim() : '无';
  if (req.action === 'submit') {
    const L = req.target_rung;
    return [
      `学习者档位 L=${L}（${RUNG_LABEL[L] ?? L}）。`,
      `句子：${req.message}`,
      `语境：${context}`,
      '判断句子难度 input_rung（整数 2 到 8；古文或明显超过 HSK 6 记 8）。',
      '用中文把意思说清楚。难度必须是 T=min(L, input_rung)。不得高于学习者档，不得写成英文。',
      '若句子已经不高于 L，就按句子本身的档位用明白的话重说一遍，不要再压低，也不要拔高。',
      '保留原意。不要加称呼，不要解释步骤。',
      '只输出 JSON：{"input_rung":8,"text":"降级后的中文","english":"简短英文释义","culture_note":{"zh":"可选","en":"optional"}}',
      '没有文化背景就省略 culture_note。',
    ].join('\n');
  }
  const n = req.target_rung;
  return [
    `把同一句改写到指定档 target_rung=${n}（${RUNG_LABEL[n] ?? n}）。`,
    '不要重新判断难度，不要输出 input_rung。',
    n === 1 ? 'text 必须是英文。' : 'text 必须是中文，用词尽量落在该档。',
    `句子：${req.message}`,
    `语境：${context}`,
    '只输出 JSON：{"text":"...","english":"简短英文释义","culture_note":{"zh":"...","en":"..."}}',
    '没有文化背景就省略 culture_note。',
  ].join('\n');
}

function toResponse(req, parsed) {
  const rung = chooseTargetRung(req.action, req.target_rung, parsed.input_rung, req.target_rung);
  const out = {
    ok: true,
    intent: INTENT[req.action] ?? 'other',
    rung,
    output: { lang: rung === 1 ? 'en' : 'zh', text: parsed.text },
    reply_text: parsed.text,
    error: null,
  };
  if (req.action === 'submit') out.input_rung = sentenceRung(parsed.input_rung);
  if (parsed.english) out.english = parsed.english;
  if (parsed.culture_note) out.culture_note = parsed.culture_note;
  return out;
}

export function create(options = {}, env = {}) {
  const {
    baseUrl,
    apiKey,
    model,
    timeoutMs = 25000,
    fetch: fetchImpl = globalThis.fetch,
    jsonObject = true,
  } = options;
  const mock = createMock({ delayMs: [0, 0] }, env);

  return {
    kind: 'live',
    async send(req, { signal } = {}) {
      if (req?.client === 'demo') return mock.send(req, { signal });

      const timeoutSignal = AbortSignal.timeout(timeoutMs);
      const timed = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
      let res;
      try {
        res = await fetchImpl(endpoint(baseUrl), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            messages: [
              { role: 'system', content: SYSTEM },
              { role: 'user', content: promptFor(req) },
            ],
            ...(jsonObject ? { response_format: { type: 'json_object' } } : {}),
          }),
          signal: timed,
        });
      } catch (err) {
        if (err instanceof PengError) throw err;
        if (signal?.aborted) throw new PengError('aborted');
        if (timeoutSignal.aborted || err?.name === 'TimeoutError' || err?.name === 'AbortError') {
          throw new PengError('timeout');
        }
        throw new PengError('network', err?.message);
      }

      if (res.status === 401 || res.status === 403) throw new PengError('auth');
      if (!res.ok) throw new PengError('network', `HTTP ${res.status}`);

      let payload;
      try {
        payload = await res.json();
      } catch {
        throw new PengError('bad_response', '接口没有返回 JSON');
      }
      return assertValid(toResponse(req, parseModelContent(payload?.choices?.[0]?.message?.content)));
    },
  };
}
