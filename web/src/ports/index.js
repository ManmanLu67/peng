// 接口约定：只有 JSDoc 类型，没有运行时代码。
// 功能代码只认这些接口，不认具体实现（技术文档 14.3）。

/**
 * @typedef {{ action: 'submit'|'set_rung'|'not_understood'|'chat',
 *             message: string, context?: string,
 *             current_rung: number|null, target_rung: number,
 *             conversation_id?: string, client?: string }} PengRequest
 */

/**
 * @typedef {{ ok: boolean, intent: string, rung: number, input_rung?: number,
 *             output: { lang: 'zh'|'en', text: string }, reply_text: string,
 *             english?: string, context?: string, culture_note?: { zh: string, en: string },
 *             trace?: { node: string, status: string, ms?: number, detail?: string }[],
 *             error: string|null }} PengResponse
 */

/** @typedef {{ kind: 'mock'|'live',
 *              send(req: PengRequest, o?: { signal?: AbortSignal }): Promise<PengResponse> }} ChatPort */

/** @typedef {{ words(text: string): string[] }} SegmenterPort */

/**
 * 深浅色。实现在 adapters/theme/pref.js：手动偏好写入 localStorage，否则跟随系统。
 * @typedef {{ get(): 'light'|'dark', set(t: 'light'|'dark'): void }} ThemePort
 */

/** @typedef {{ now(): number, after(ms: number, fn: Function): () => void }} ClockPort */

export {};
