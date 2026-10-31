// 订阅式状态容器。功能拿到的是只读视图（get / subscribe），写入只能经 commands。

function same(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => Object.is(a[k], b[k]));
}

export function createStore(initial) {
  let state = initial;
  const subs = new Set();

  return {
    get: () => state,

    /** 整体替换。引用没变就不通知。 */
    set(next) {
      if (next === state) return;
      state = next;
      for (const s of [...subs]) s.check(state);
    },

    /**
     * 只订阅自己用到的切片：selector 的结果（浅比较）变了才调用 fn。
     * 不会在订阅时立即调用，由功能自己先渲染一次。返回取消函数。
     */
    subscribe(selector, fn) {
      let last = selector(state);
      const sub = {
        check(s) {
          const next = selector(s);
          if (same(last, next)) return;
          last = next;
          fn(next);
        },
      };
      subs.add(sub);
      return () => subs.delete(sub);
    },

    /** 交给功能的只读视图 */
    view() {
      return Object.freeze({ get: this.get, subscribe: this.subscribe });
    },
  };
}
