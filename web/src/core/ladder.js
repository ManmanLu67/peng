// 档位映射与"可否升降"。数据来自 data/rungs.json，由外部注入。
// ladder-bar 与 actions 都调用这里的 availability，不各算各的（技术文档 14.6）。

export function createLadder(rungs) {
  const list = [...rungs].sort((a, b) => a.n - b.n);
  if (list.length === 0) throw new Error('rungs 不能为空');
  const byN = new Map(list.map((r) => [r.n, r]));
  const min = list[0].n;
  const max = list[list.length - 1].n;

  const canStepDown = (n) => Number.isInteger(n) && n > min;
  const canStepUp = (n) => Number.isInteger(n) && n < max;

  /**
   * 按钮可用性。state 需要有 status / rung / messages / understood。
   * 没看懂与更简单一样，到英文就不能再降。
   */
  function availability(state) {
    const busy = state.status === 'running' || !!state.demo;   // 演示中与运行中一样禁用输入和按钮
    // 只有停在结果上才能改档或结束；失败态下这些按钮不亮，免得点了没反应（flow 同样只认 result / english）
    const showing = state.status === 'result' || state.status === 'english';
    const hasResult = state.rung != null && state.messages.length > 0;
    const idle = !busy && showing && hasResult;
    return {
      busy,
      send: !busy,
      retry: !state.demo && state.status === 'error' && !!state.lastCall,
      simpler: idle && canStepDown(state.rung),
      closer: idle && canStepUp(state.rung),
      notUnderstood: idle && canStepDown(state.rung),
      gotIt: idle && !state.understood,
    };
  }

  return {
    list,
    min,
    max,
    get: (n) => byN.get(n) ?? null,
    hskToRung: (h) => list.find((r) => r.hsk === h)?.n ?? null,
    rungToHsk: (n) => byN.get(n)?.hsk ?? null,
    /** HSK 选档用：高到低（6→1） */
    hskRungs: () => list.filter((r) => r.hsk != null).sort((a, b) => b.n - a.n),
    isEnglish: (n) => byN.get(n)?.lang === 'en',
    isOriginal: (n) => !!byN.get(n)?.original,
    canStepDown,
    canStepUp,
    availability,
  };
}
