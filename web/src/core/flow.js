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
      messages: [],             // [{ id, text, context, resp, rung, inputRung }]
      activeId: null,
      nodes: idleNodes(),
      traceSimulated: false,
      understood: false,
      reqSeq: 0,
      reqId: null,              // 当前有效请求；对不上的响应一律丢弃
      lastCall: null,           // { action, req } 供重试
      error: null,              // { code, action } | null
    };
  }

  const active = (s) => s.messages.find((m) => m.id === s.activeId) ?? null;
  const pathOf = (action) => paths[action] ?? [];

  /** 发起一次请求：reqId 自增，节点全部复位，状态转 running。 */
  function startCall(s, action, req, messages = s.messages) {
    const reqId = s.reqSeq + 1;
    const lastCall = { action, req };
    return {
      state: {
        ...s,
        messages,
        status: STATUS.RUNNING,
        reqSeq: reqId,
        reqId,
        lastCall,
        error: null,
        understood: false,
        nodes: idleNodes(),
      },
      effects: [{ type: 'CALL_CHAT', reqId, req, path: pathOf(action) }],
    };
  }

  const noop = (s) => ({ state: s, effects: [] });
  const canAct = (s) => (s.status === STATUS.RESULT || s.status === STATUS.ENGLISH) && !!active(s)?.resp;

  function stepRequest(s, action, target) {
    const msg = active(s);
    return startCall(s, action, {
      action,
      message: msg.text,
      context: msg.context,
      current_rung: s.rung,
      target_rung: target,
    });
  }

  function reduce(s, e) {
    switch (e.type) {
      case 'SUBMIT': {
        const text = (e.text ?? '').trim();
        if (!text || s.status === STATUS.RUNNING) return noop(s);
        // 上一次失败遗留的无结果消息，由这次新提交替换
        const kept = s.messages.filter((m) => m.resp);
        const id = (kept.at(-1)?.id ?? 0) + 1;
        const msg = { id, text, context: e.context ?? '', resp: null, rung: null, inputRung: null };
        const r = startCall(
          { ...s, activeId: id, rung: null },
          'submit',
          { action: 'submit', message: text, context: msg.context, current_rung: null, target_rung: s.hskStart },
          [...kept, msg],
        );
        return r;
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
        const messages = s.messages.map((m) =>
          m.id === s.activeId
            ? { ...m, resp, rung: resp.rung, inputRung: resp.input_rung ?? m.inputRung }
            : m);
        return {
          state: {
            ...s,
            messages,
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

      case 'SET_HSK':
        // 只改起点，不动当前已出的结果
        return { state: { ...s, hskStart: e.rung }, effects: [] };

      case 'SELECT_MESSAGE': {
        if (s.status === STATUS.RUNNING) return noop(s);
        const m = s.messages.find((x) => x.id === e.id);
        if (!m || !m.resp) return noop(s);
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

      case 'RESET':
        return { state: initialState({ hskRung: s.hskStart }), effects: [{ type: 'CANCEL' }] };

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
