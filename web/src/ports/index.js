// 接口约定：只有 JSDoc 类型，没有运行时代码。
// 功能代码只认这些接口，不认具体实现（技术文档 14.3）。

/**
 * @typedef {{ action: 'submit'|'step_down'|'step_up'|'not_understood'|'chat',
 *             message: string, context?: string,
 *             current_rung: number|null, target_rung: number,
 *             conversation_id?: string, client?: string }} PengRequest
 */

/**
 * @typedef {{ ok: boolean, intent: string, rung: number, input_rung?: number,
 *             output: { lang: 'zh'|'en', text: string }, reply_text: string,
 *             english?: string, culture_note?: { zh: string, en: string },
 *             trace?: { node: string, status: string, ms?: number, detail?: string }[],
 *             error: string|null }} PengResponse
 */

/** @typedef {{ kind: 'mock'|'live',
 *              send(req: PengRequest, o?: { signal?: AbortSignal }): Promise<PengResponse> }} ChatPort */

/**
 * P1，本次只留契约，不实现、不展示（语音输入 / 播报）。
 * 接入时：新建 adapters/speech/*.js，在 adapters/index.js 登记，功能里声明 needs: ['speech']。
 * @typedef {{ canListen: boolean, canSpeak: boolean,
 *              listen(h: { onText: Function, onEnd: Function, onError: Function }): () => void,
 *              speak(text: string, lang: 'zh'|'en', rate?: number): void,
 *              cancel(): void }} SpeechPort
 */

/** @typedef {{ words(text: string): string[] }} SegmenterPort */

/**
 * P1，本次只留契约（深浅色实际切换）。P0 页面固定浅色，tokens.css 保留 dark 变量结构。
 * 接入时：新建 adapters/theme/*.js 读写偏好并设置 document.documentElement.dataset.theme。
 * @typedef {{ get(): 'light'|'dark', set(t: 'light'|'dark'): void }} ThemePort
 */

/** @typedef {{ now(): number, after(ms: number, fn: Function): () => void }} ClockPort */

export {};
