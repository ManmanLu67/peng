// “能力缺失”的正式表示：功能据 canListen / canSpeak 隐藏入口，不到处写 if (!SR)。
export function create() {
  const noop = () => {};
  return {
    canListen: false,
    canSpeak: false,
    listen: () => noop,
    speak: noop,
    cancel: noop,
  };
}
