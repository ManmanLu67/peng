// 手动推进的时钟，供测试和演示加速。tick(ms) 按到期顺序触发定时器。
export function create() {
  let t = 0;
  let seq = 0;
  let queue = [];

  return {
    now: () => t,
    after(ms, fn) {
      const item = { at: t + Math.max(0, ms), seq: seq++, fn };
      queue.push(item);
      return () => { queue = queue.filter((x) => x !== item); };
    },
    /** 推进 ms 毫秒；回调里新建的定时器若在范围内也会被触发 */
    tick(ms) {
      const end = t + ms;
      for (;;) {
        queue.sort((a, b) => a.at - b.at || a.seq - b.seq);
        const next = queue[0];
        if (!next || next.at > end) break;
        queue.shift();
        t = next.at;
        next.fn();
      }
      t = end;
    },
    pending: () => queue.length,
  };
}
