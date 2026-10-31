export function create() {
  const mem = new Map();
  return {
    get: (k) => mem.get(k) ?? null,
    set: (k, v) => { mem.set(k, v); },
  };
}
