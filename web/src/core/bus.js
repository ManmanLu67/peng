// 瞬时事件："刚发生了什么"。不保存历史，不依赖订阅顺序。

export function createBus() {
  const handlers = new Map();

  return {
    on(type, fn) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type).add(fn);
      return () => handlers.get(type)?.delete(fn);
    },
    emit(type, payload) {
      for (const fn of [...(handlers.get(type) ?? [])]) {
        try {
          fn(payload);
        } catch (err) {
          // 一个监听者出错不影响其他监听者
          console.error(`[bus] ${type} 监听出错`, err);
        }
      }
    },
  };
}
