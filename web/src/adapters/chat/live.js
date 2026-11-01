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
  set_rung: 'level_changed',
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
 * submit：直接用学习者档，夹在 2–7。句子更简单也不再降到更低档。
 * 没看懂 / 升降档 / 点阶梯：采用请求里的 target_rung，允许英文档 1。
 */
export function chooseTargetRung(action, userRung, inputRung, requested) {
  if (action === 'submit') return clampInt(userRung, 2, 7) ?? 4;
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
    context: typeof data.context === 'string' && data.context.trim() ? data.context.trim() : undefined,
    pinyin: asPinyin(data.pinyin),
    grammar: asGrammar(data.grammar),
  };
}

/** 模型给的语法点：要有名称和中文讲解才收；最多 4 条，同名只留第一条。 */
function asGrammar(value) {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set();
  const out = [];
  for (const item of value) {
    const title = typeof item?.title === 'string' ? item.title.trim() : '';
    const zh = typeof item?.zh === 'string' ? item.zh.trim() : '';
    if (!title || !zh || seen.has(title)) continue;
    seen.add(title);
    out.push({
      title,
      zh,
      en: typeof item.en === 'string' ? item.en.trim() : '',
      level: Number.isInteger(item.level) ? item.level : undefined,
    });
    if (out.length === 4) break;
  }
  return out.length ? out : undefined;
}

function asPinyin(value) {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text || /[㐀-鿿]/.test(text) || !/[a-zāáǎàēéěèīíǐìōóǒòūúǔùüǖǘǚǜ]/i.test(text)) return undefined;
  return text;
}

/** 只收下原文里已经写明、且不是整句本身的那一段。去掉模型多加的引号和句末标点后再核对。 */
function recognizedContext(message, raw) {
  if (typeof raw !== 'string') return undefined;
  const source = String(message ?? '').trim();
  const text = raw.trim()
    .replace(/^["'「『]+|["'」』]+$/g, '')
    .replace(/[。！？，、：:\s]+$/g, '')
    .trim();
  if (!text || text === source || !source.includes(text)) return undefined;
  return text;
}

function endpoint(baseUrl) {
  const trimmed = String(baseUrl ?? '').trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/chat/completions')) return trimmed;
  return `${trimmed}/chat/completions`;
}

/** DeepSeek 不传 thinking 时默认长思考，25 秒内容易超时。其他接口不带此字段。 */
function requestExtras(baseUrl) {
  try {
    if (new URL(endpoint(baseUrl)).host === 'api.deepseek.com') {
      return { thinking: { type: 'disabled' } };
    }
  } catch {
    // 地址不合法时仍按原样请求，由随后的网络错误提示
  }
  return {};
}

/** 对话：判断是在闲聊，还是在请人解释某一句。 */
export function parseChatContent(raw) {
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
  const intent = data?.intent === 'explain' ? 'explain' : 'chat';
  const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
  const sentence = typeof data?.sentence === 'string' ? data.sentence.trim() : '';
  const note = data?.culture_note;
  const culture = note && typeof note === 'object'
    ? {
        zh: typeof note.zh === 'string' ? note.zh : '',
        en: typeof note.en === 'string' ? note.en : '',
      }
    : null;
  const parsed = {
    intent,
    reply,
    sentence,
    input_rung: Number.isInteger(data?.input_rung) ? data.input_rung : undefined,
    text: typeof data?.text === 'string' ? data.text.trim() : '',
    english: typeof data?.english === 'string' ? data.english.trim() : '',
    culture_note: culture && (culture.zh || culture.en) ? culture : undefined,
    context: typeof data?.context === 'string' && data.context.trim() ? data.context.trim() : undefined,
  };
  if (intent === 'explain' && !parsed.text) throw new PengError('bad_response', '模型返回缺少 text');
  if (intent === 'chat' && !reply) throw new PengError('bad_response', '模型返回缺少 reply');
  return parsed;
}

function chatPrompt(req) {
  const history = (req.history ?? [])
    .map((h) => `${h.role === 'assistant' ? '回复' : '用户'}：${h.text}`)
    .join('\n');
  return [
    '你在和汉语学习者聊天。这一轮只聊天，不要改写或解释句子。',
    history ? `此前对话：\n${history}` : '此前没有对话。',
    `学习者刚刚说：${req.message}`,
    '用 reply 直接回答。',
    '只输出 JSON：{"reply":"..."}',
  ].join('\n');
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
      '用中文把意思说清楚。难度必须是学习者档 L，不要因为句子更简单而改到更低档，也不要高于 L，不要写成英文。',
      '保留原意。不要加称呼，不要解释步骤。',
      '若句子里另写了场景、说话人或听话人，把那一段按原文字摘到 context，一个字都不要改。不要编造，不要复述整句。没有就给空字符串。',
      'pinyin 是原句的全文拼音，带声调，音节之间用空格，不要写汉字。',
      `grammar 拆解原句里学习者档 L 以上才会学到的语法点，最多 4 条。每条：title 是格式本身，例如“把……放在……”“虽然……但是……”；zh 用${RUNG_LABEL[Math.max(2, L - 1)] ?? 'HSK 2'}以内的简单中文说明它表示什么、怎么用，并指出原句里对应的那一段；en 是一句英文；level 是它大约属于的 HSK 等级（整数 1 到 6，文言格式记 7）。只写原句里真有的，不要编造；没有就给空数组。`,
      '只输出 JSON：{"input_rung":8,"text":"降级后的中文","pinyin":"yuán jù pīn yīn","grammar":[{"title":"虽然……但是……","zh":"表示转折。“虽然”后面是让步，“但是”后面才是重点。原句里的“虽然天冷，但是他没穿外套”就是这样。","en":"although... but...","level":3}],"english":"简短英文释义","context":"","culture_note":{"zh":"可选","en":"optional"}}',
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
  if (parsed.pinyin) out.pinyin = parsed.pinyin;
  if (req.action === 'submit' && parsed.grammar) out.grammar = parsed.grammar;
  if (parsed.english) out.english = parsed.english;
  if (parsed.culture_note) out.culture_note = parsed.culture_note;
  const context = recognizedContext(req.message, parsed.context);
  if (context) out.context = context;
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
  const samples = new Set((env.data?.demo?.entries ?? []).map((e) => e.match));

  return {
    kind: 'live',
    async send(req, { signal } = {}) {
      // 演示和三句例句都用内置结果，不打模型。没看懂时按同一句继续用内置档位。
      const sample = samples.has(String(req?.message ?? '').trim());
      if (req?.client === 'demo' || (req?.action !== 'chat' && sample)) {
        return mock.send(req, { signal });
      }

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
              { role: 'user', content: req.action === 'chat' ? chatPrompt(req) : promptFor(req) },
            ],
            ...requestExtras(baseUrl),
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
      const content = payload?.choices?.[0]?.message?.content;
      if (req.action === 'chat') {
        const parsed = parseChatContent(content);
        const reply = parsed.reply || parsed.text;
        if (!reply) throw new PengError('bad_response', '模型返回缺少 reply');
        return assertValid({
          ok: true,
          intent: 'chat',
          rung: clampInt(req.target_rung, 1, 8) ?? 4,
          output: { lang: 'zh', text: reply },
          reply_text: reply,
          error: null,
        });
      }
      return assertValid(toResponse(req, parseModelContent(content)));
    },
  };
}
