// 功能唯一的写入口。内部走 flow.reduce，再执行 effects：
//   CALL_CHAT  调 ports.chat.send（带 AbortController），同时经 ports.clock 逐个点亮节点
//   PLAY_PATH  只点亮节点（"看懂了"不调接口）
//   CANCEL     取消在途请求与全部节点定时器
// 请求防乱序：flow 以 reqId 丢弃旧响应；这里再 abort 旧请求，并清掉旧的节点定时器。

import { NODE_STATUS, errorCode } from './contract.js';

/**
 * @param {{ store, bus, flow, ports: { chat, clock }, dwellMs?: [number, number], random?: () => number }} deps
 */
export function createCommands({ store, bus, flow, ports, dwellMs = [400, 800], random = Math.random }) {
  let timers = [];          // 当前这一轮的节点定时器取消函数
  let controller = null;    // 当前在途请求

  const dwell = () => Math.round(dwellMs[0] + random() * (dwellMs[1] - dwellMs[0]));

  function clearRun() {
    timers.forEach((off) => off());
    timers = [];
    controller?.abort();
    controller = null;
  }

  function setNode(id, status) {
    dispatch({ type: 'NODE', id, status });
  }

  /**
   * 按路径依次点亮：每个节点 running → 停留 → done。
   * 返回 Promise，全部点亮后 resolve；被 clearRun 取消时永不 resolve（调用方用 reqId 兜底）。
   */
  function playPath(path) {
    return new Promise((resolve) => {
      const step = (i) => {
        if (i >= path.length) return resolve();
        setNode(path[i], NODE_STATUS.RUNNING);
        timers.push(ports.clock.after(dwell(), () => {
          setNode(path[i], NODE_STATUS.DONE);
          step(i + 1);
        }));
      };
      step(0);
    });
  }

  function run(effect) {
    switch (effect.type) {
      case 'CANCEL':
        clearRun();
        break;

      case 'PLAY_PATH':
        clearRun();
        playPath(effect.path);
        break;

      case 'CALL_CHAT': {
        clearRun();
        const { reqId, req, path } = effect;
        const ctl = new AbortController();
        controller = ctl;
        const played = playPath(path);
        ports.chat.send(req, { signal: ctl.signal }).then(
          // 回放跑完再显示结果，避免结果先于节点动画出现
          (resp) => played.then(() => {
            if (ctl.signal.aborted) return;
            dispatch({ type: 'RESPONSE', reqId, resp });
          }),
          (err) => {
            const code = errorCode(err);
            if (code === 'aborted' || ctl.signal.aborted) return;
            timers.forEach((off) => off());       // 节点停在出错处
            timers = [];
            dispatch({ type: 'FAIL', reqId, code });
            bus.emit('error:shown', { code });
          },
        );
        break;
      }
    }
  }

  function dispatch(event) {
    const { state, effects } = flow.reduce(store.get(), event);
    store.set(state);
    effects.forEach(run);
  }

  return {
    dispatch,
    submit: (text, context = '') => dispatch({ type: 'SUBMIT', text, context }),
    stepDown: () => dispatch({ type: 'STEP_DOWN' }),
    stepUp: () => dispatch({ type: 'STEP_UP' }),
    notUnderstood: () => dispatch({ type: 'NOT_UNDERSTOOD' }),
    understood: () => dispatch({ type: 'UNDERSTOOD' }),
    retry: () => dispatch({ type: 'RETRY' }),
    setHsk: (rung) => dispatch({ type: 'SET_HSK', rung }),
    select: (id) => dispatch({ type: 'SELECT_MESSAGE', id }),
    reset: () => dispatch({ type: 'RESET' }),
    setDemo: (on) => dispatch({ type: 'SET_DEMO', on }),
  };
}
