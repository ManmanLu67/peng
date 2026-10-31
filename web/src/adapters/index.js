// 适配器工厂表：{ 端口名: { 实现名: create } }。只有 app.js 可以 import 这里。
// 新增实现：加一个文件，在这里登记，再改 config/app.config.js。
// chat.live 是浏览器直连的 OpenAI 兼容接口；没配密钥时 app.js 仍用 mock。
import { create as chatMock } from './chat/mock.js';
import { create as chatLive } from './chat/live.js';
import { create as clockReal } from './clock/real.js';
import { create as clockFake } from './clock/fake.js';
import { create as segmenterIntl } from './segmenter/intl.js';
import { create as themePref } from './theme/pref.js';

/** 本地密钥齐全才改走 live；否则原样返回，页面继续用 mock。 */
export function applyLocalChat(adapters, local) {
  const chat = local?.chat;
  const apiKey = typeof chat?.apiKey === 'string' ? chat.apiKey.trim() : '';
  const baseUrl = typeof chat?.baseUrl === 'string' ? chat.baseUrl.trim() : '';
  if (!apiKey || !baseUrl) return adapters;
  return {
    ...adapters,
    chat: { use: 'live', options: { ...chat, apiKey, baseUrl } },
  };
}

export const adapterFactories = {
  chat: { mock: chatMock, live: chatLive },
  clock: { real: clockReal, fake: clockFake },
  segmenter: { intl: segmenterIntl },
  theme: { pref: themePref },
};
