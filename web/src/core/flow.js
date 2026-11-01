// 状态迁移：reduce(state, event) → { state, effects }。纯函数，不碰网络与计时。
// effects 由 commands 执行：CALL_CHAT 调 ports.chat，PLAY_PATH 经 ports.clock 逐个点亮节点。

import { STATUS, NODE_STATUS } from './contract.js';

/**
 * @param {{ ladder: ReturnType<typeof import('./ladder.js').createLadder>,
 *           nodes: { nodes: {id:string}[], paths: Record<string,string[]> } }} deps
 */
export function createFlow({ ladder, nodes }) {
  const nodeIds = nodes.nodes.map((n) => n.id);
  const paths = nodes.paths;

  const idleNodes = () => Object.fromEntries(nodeIds.map((id) => [id, NODE_STATUS.IDLE]));

  function initialState({ hskRung }) {
    return {
      status: STATUS.IDLE,
      hskStart: hskRung,        // 起点档（rung 编号），只影响下一次提交
      rung: null,               // 当前输出档
      inputRung: null,
      messages: [],             // [{ id, text, subject, context, mode, reply, resp, rung, inputRung }]
      activeId: null,
      pendingId: null,          // 正在等待响应的那条消息；普通聊天不改 activeId
      nodes: idleNodes(),
      traceSimulated: false,
      understood: false,
      inputMode: 'translate',   // chat 只对话；translate 把这一句简化到右侧
      demo: false,              // 演示模式中：输入与按钮禁用（features 读它）
      reqSeq: 0,
      reqId: null,              // 当前有效请求；对不上的响应一律丢弃
      lastCall: null,           // { action, req } 供重试
      error: null,              // { code, action } | null
    };
  }

  const active = (s) => s.messages.find((m) => m.id === s.activeId) ?? null;

  /** 原文开头用冒号写下的场景，例如「一个人对着水杯说：这水太烫了」。没有则空。 */
  function sceneContext(text) {
    const m = String(text ?? '').match(/^(.{2,30}?)[：:]\s*(\S[\s\S]*)$/);
    if (!m || !/[㐀-鿿]/.test(m[1])) return '';
    const scene = m[1].trim();
    return scene && scene !== text.trim() ? scene : '';
  }
  const pathOf = (action) => paths[action] ?? [];

  /** 最近 8 条：用户原话、模型回复、已经解释过的句子。 */
  function historyOf(messages) {
    const items = [];
    for (const m of messages) {
      if (m.text) items.push({ role: 'user', text: m.text });
      if (m.mode === 'chat' && m.reply) items.push({ role: 'assistant', text: m.reply });
      if (m.mode === 'explain' && m.subject && m.subject !== m.text) items.push({ role: 'user', text: m.subject });
    }
    return items.slice(-8);
  }

  /** 发起一次请求：reqId 自增，节点全部复位，状态转 running。 */
  function startCall(s, action, req, messages = s.messages, extra = {}) {
    const reqId = s.reqSeq + 1;
    // client 告诉 live 适配器：演示走 mock，用户提交才打模型
    const stamped = { ...req, client: s.demo ? 'demo' : 'user' };
    const lastCall = { action, req: stamped };
    return {
      state: {
        ...s,
        messages,
        pendingId: extra.pendingId ?? s.pendingId,
        status: STATUS.RUNNING,
        reqSeq: reqId,
        reqId,
        lastCall,
        error: null,
        understood: false,
        nodes: idleNodes(),
        // 请求在途时还没有真实 trace，节点是按固定节奏模拟点亮的；响应回来后再按 trace 是否存在改写
        traceSimulated: true,
      },
      effects: [{
        type: 'CALL_CHAT',
        reqId,
        req: stamped,
        path: extra.path ?? pathOf(action),
        explainPath: pathOf('submit'),
      }],
    };
  }

  const noop = (s) => ({ state: s, effects: [] });
  const canAct = (s) => (s.status === STATUS.RESULT || s.status === STATUS.ENGLISH) && !!active(s)?.resp;

  function stepRequest(s, action, target) {
    const msg = active(s);
    return startCall(s, action, {
      action,
      message: msg.subject || msg.text,
      context: msg.context,
      current_rung: s.rung,
      target_rung: target,
    }, s.messages, { pendingId: msg.id });
  }

  function reduce(s, e) {
    switch (e.type) {
      case 'SUBMIT': {
        const text = (e.text ?? '').trim();
        if (!text || s.status === STATUS.RUNNING) return noop(s);
        // 上一次失败遗留的无结果消息，由这次新提交替换
        const kept = s.messages.filter((m) => m.resp);
        const id = (kept.at(-1)?.id ?? 0) + 1;
        const translating = s.inputMode === 'translate';
        const given = translating ? (e.context ?? '').trim() : '';
        const msg = {
          id, text, subject: '', context: given || (translating ? sceneContext(text) : ''),
          mode: null, reply: '', resp: null, rung: null, inputRung: null,
        };
        const messages = [...kept, msg];
        if (!translating) {
          return startCall(s, 'chat', {
            action: 'chat',
            message: text,
            context: '',
            history: historyOf(kept),
            current_rung: s.rung,
            target_rung: s.hskStart,
          }, messages, { pendingId: id, path: [] });
        }
        return startCall(s, 'submit', {
          action: 'submit',
          message: text,
          context: msg.context,
          current_rung: null,
          target_rung: s.hskStart,
        }, messages, { pendingId: id });
      }

      case 'STEP_DOWN':
        if (!canAct(s) || !ladder.canStepDown(s.rung)) return noop(s);
        return stepRequest(s, 'step_down', s.rung - 1);

      case 'STEP_UP':
        if (!canAct(s) || !ladder.canStepUp(s.rung)) return noop(s);
        return stepRequest(s, 'step_up', s.rung + 1);

      case 'NOT_UNDERSTOOD':
        if (!canAct(s) || !ladder.canStepDown(s.rung)) return noop(s);
        return stepRequest(s, 'not_understood', s.rung - 1);

      case 'UNDERSTOOD': {
        // 只在前端结束：不调接口。03 跳过，02、04 由 PLAY_PATH 依次点亮。
        if (!canAct(s) || s.understood) return noop(s);
        const next = { ...s, understood: true, nodes: { ...s.nodes, ...markSkipped('understood') } };
        return { state: next, effects: [{ type: 'PLAY_PATH', path: pathOf('understood') }] };
      }

      case 'RESPONSE': {
        // 防乱序：reqId 对不上、或已不在 running，直接丢弃
        if (e.reqId !== s.reqId || s.status !== STATUS.RUNNING) return noop(s);
        const resp = e.resp;
        const pendingId = s.pendingId;
        if (resp.intent === 'chat' || s.inputMode === 'chat') {
          const messages = s.messages.map((m) =>
            m.id === pendingId ? { ...m, mode: 'chat', reply: resp.reply_text, resp } : m);
          const status = s.rung == null
            ? STATUS.IDLE
            : (ladder.isEnglish(s.rung) ? STATUS.ENGLISH : STATUS.RESULT);
          return {
            state: {
              ...s,
              messages,
              status,
              pendingId: null,
              traceSimulated: false,
              reqId: null,
              error: null,
              nodes: idleNodes(),
            },
            effects: [],
          };
        }
        const messages = s.messages.map((m) =>
          m.id === pendingId
            ? {
                ...m,
                mode: 'explain',
                subject: m.subject?.trim()
                  ? m.subject
                  : ((typeof resp.sentence === 'string' && resp.sentence.trim()) ? resp.sentence.trim() : m.text),
                context: m.context?.trim() ? m.context : (typeof resp.context === 'string' ? resp.context.trim() : m.context),
                resp,
                rung: resp.rung,
                inputRung: resp.input_rung ?? m.inputRung,
              }
            : m);
        return {
          state: {
            ...s,
            messages,
            activeId: pendingId,
            pendingId: null,
            rung: resp.rung,
            inputRung: resp.input_rung ?? s.inputRung,
            status: ladder.isEnglish(resp.rung) ? STATUS.ENGLISH : STATUS.RESULT,
            traceSimulated: !(Array.isArray(resp.trace) && resp.trace.length),
            reqId: null,
            error: null,
          },
          effects: [],
        };
      }

      case 'FAIL': {
        if (e.reqId !== s.reqId || s.status !== STATUS.RUNNING) return noop(s);
        // 节点停在出错处：正在执行的节点画叉；没有就让第一个节点画叉
        const runningId = nodeIds.find((id) => s.nodes[id] === NODE_STATUS.RUNNING) ?? nodeIds[0];
        return {
          state: {
            ...s,
            status: STATUS.ERROR,
            reqId: null,
            error: { code: e.code, action: s.lastCall?.action ?? null },
            nodes: { ...s.nodes, [runningId]: NODE_STATUS.ERROR },
          },
          effects: [],
        };
      }

      case 'RETRY': {
        if (s.status !== STATUS.ERROR || !s.lastCall) return noop(s);
        return startCall(s, s.lastCall.action, s.lastCall.req);
      }

      case 'NODE':
        if (!(e.id in s.nodes)) return noop(s);
        return { state: { ...s, nodes: { ...s.nodes, [e.id]: e.status } }, effects: [] };

      case 'SET_INPUT_MODE': {
        const mode = e.mode === 'chat' || e.mode === 'translate' ? e.mode : null;
        if (!mode || mode === s.inputMode || s.status === STATUS.RUNNING || s.demo) return noop(s);
        return { state: { ...s, inputMode: mode }, effects: [] };
      }

      case 'SET_HSK':
        // 只改起点，不动当前已出的结果
        return { state: { ...s, hskStart: e.rung }, effects: [] };

      case 'SELECT_MESSAGE': {
        if (s.status === STATUS.RUNNING) return noop(s);
        const m = s.messages.find((x) => x.id === e.id);
        if (!m || m.mode === 'chat' || !m.resp) return noop(s);
        return {
          state: {
            ...s,
            activeId: m.id,
            rung: m.rung,
            inputRung: m.inputRung,
            status: ladder.isEnglish(m.rung) ? STATUS.ENGLISH : STATUS.RESULT,
            understood: false,
          },
          effects: [],
        };
      }

      case 'SET_DEMO':
        return { state: { ...s, demo: !!e.on }, effects: [] };

      case 'RESET':
        // reqSeq 必须单调递增：重置后新请求的 reqId 不能与被取消的旧请求撞号
        return { state: { ...initialState({ hskRung: s.hskStart }), reqSeq: s.reqSeq }, effects: [{ type: 'CANCEL' }] };

      default:
        return noop(s);
    }
  }

  /** nodes.json 的 skip[action] 列出的节点标成跳过（即使上一圈已点亮）。 */
  function markSkipped(action) {
    const out = {};
    for (const id of nodes.skip?.[action] ?? []) {
      if (id in idleNodes()) out[id] = NODE_STATUS.SKIPPED;
    }
    return out;
  }

  return { initialState, reduce };
}
