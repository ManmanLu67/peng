// 适配器工厂表：{ 端口名: { 实现名: create } }。只有 app.js 可以 import 这里。
// 新增实现：加一个文件，在这里登记，再改 config/app.config.js。
// P1 的 speech / theme 与真实聊天后端本次不实现，只在 ports/index.js 保留契约。
import { create as chatMock } from './chat/mock.js';
import { create as clockReal } from './clock/real.js';
import { create as clockFake } from './clock/fake.js';
import { create as segmenterIntl } from './segmenter/intl.js';

export const adapterFactories = {
  chat: { mock: chatMock },
  clock: { real: clockReal, fake: clockFake },
  segmenter: { intl: segmenterIntl },
};
