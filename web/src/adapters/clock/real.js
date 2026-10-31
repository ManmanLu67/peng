export function create() {
  return {
    now: () => Date.now(),
    /** 返回取消函数 */
    after(ms, fn) {
      const t = setTimeout(fn, ms);
      return () => clearTimeout(t);
    },
  };
}
