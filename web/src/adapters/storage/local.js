// localStorage 封装。隐私模式或被禁用时静默退化为内存，不抛错。
export function create({ prefix = 'peng-' } = {}) {
  const mem = new Map();
  return {
    get(k) {
      try {
        return localStorage.getItem(prefix + k);
      } catch {
        return mem.get(k) ?? null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(prefix + k, v);
      } catch {
        mem.set(k, v);
      }
    },
  };
}
