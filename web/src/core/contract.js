// 请求/响应形状、校验、错误类型。字段名集中在这里，改名时全局搜索即可（技术文档 14.11）。

export const ACTIONS = Object.freeze(['submit', 'step_down', 'step_up', 'set_rung', 'not_understood', 'chat']);
export const INTENTS = Object.freeze(['rewrite', 'not_understood', 'level_changed', 'chat', 'explain', 'other']);
export const ERROR_CODES = Object.freeze(['timeout', 'network', 'auth', 'bad_response', 'aborted']);

/** 主页面状态。listening 在语音功能（P1）加入。 */
export const STATUS = Object.freeze({
  IDLE: 'idle',
  RUNNING: 'running',
  RESULT: 'result',
  ENGLISH: 'english',
  ERROR: 'error',
});

/** 节点状态，对应逻辑文档 5.5 的五种样式。 */
export const NODE_STATUS = Object.freeze({
  IDLE: 'idle',
  RUNNING: 'running',
  DONE: 'done',
  SKIPPED: 'skipped',
  ERROR: 'error',
});

export class PengError extends Error {
  /** @param {'timeout'|'network'|'auth'|'bad_response'|'aborted'} code */
  constructor(code, message) {
    super(message ?? code);
    this.name = 'PengError';
    this.code = code;
  }
}

/** 把任意异常归一成错误码。功能只按 code 分支，不解析底层异常文本。 */
export function errorCode(err) {
  if (err instanceof PengError) return err.code;
  if (err && err.name === 'AbortError') return 'aborted';
  return 'network';
}

/** 响应形状检查（技术文档 8 节）。不合格就当作错误，不渲染半成品。 */
export function validate(r) {
  return !!r
    && r.ok === true
    && Number.isInteger(r.rung) && r.rung >= 1 && r.rung <= 8
    && typeof r.output?.text === 'string'
    && typeof r.reply_text === 'string';
}

/** 适配器返回前调用：不合格抛 bad_response。 */
export function assertValid(r) {
  if (!validate(r)) {
    throw new PengError('bad_response', r && r.error ? String(r.error) : '响应格式不正确');
  }
  return r;
}
