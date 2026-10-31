// 测试装配：用真实的 data/*.json、mock 聊天、fake 时钟，在 Node 里毫秒级跑完整流程。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createStore, createBus, createLadder, createFlow, createCommands } from '../src/core/index.js';
import { create as createMock } from '../src/adapters/chat/mock.js';
import { create as createFakeClock } from '../src/adapters/clock/fake.js';

const dataDir = new URL('../data/', import.meta.url);
export const readData = (name) => JSON.parse(readFileSync(fileURLToPath(new URL(`${name}.json`, dataDir)), 'utf8'));

export const SAMPLE = '日照香炉生紫烟';

export function setup({ hsk = 3, chatOptions = {}, chat } = {}) {
  const data = {
    rungs: readData('rungs'),
    nodes: readData('nodes'),
    demo: readData('demo'),
  };
  const ladder = createLadder(data.rungs);
  const flow = createFlow({ ladder, nodes: data.nodes });
  const store = createStore(flow.initialState({ hskRung: ladder.hskToRung(hsk) }));
  const bus = createBus();
  const clock = createFakeClock();
  const chatPort = chat ?? createMock({ delayMs: [0, 0], ...chatOptions }, { data });
  const commands = createCommands({
    store, bus, flow, ports: { chat: chatPort, clock }, random: () => 0.5,
  });
  return { data, ladder, flow, store, bus, clock, commands, chat: chatPort };
}

/** 让微任务（Promise 链）跑完。fake 时钟下的节点定时器要靠 clock.tick。 */
export const flush = () => new Promise((r) => setImmediate(r));

/** 推进时钟直到不再有待处理定时器，并让 Promise 链跑完。最多 20 轮，防死循环。 */
export async function settle(clock, step = 1000) {
  for (let i = 0; i < 20; i++) {
    await flush();
    clock.tick(step);
    await flush();
  }
}
