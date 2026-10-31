// 组装根：读 config → 加载数据 → 创建 ports → 组装 ctx。
// 唯一允许同时看见 adapters 与 features 的地方。阶段 1 在末尾接入路由。

import config from '../config/app.config.js';
import { adapterFactories } from './adapters/index.js';
import { createStore, createBus, createLadder, createFlow, createCommands } from './core/index.js';

async function loadData(names) {
  const entries = await Promise.all(names.map(async (name) => {
    const res = await fetch(`./data/${name}.json`);
    if (!res.ok) throw new Error(`数据加载失败：data/${name}.json（${res.status}）`);
    return [name, await res.json()];
  }));
  return Object.fromEntries(entries);
}

function createPorts(adapters, env) {
  return Object.fromEntries(Object.entries(adapters).map(([port, { use, options }]) => {
    const make = adapterFactories[port]?.[use];
    if (!make) throw new Error(`未知适配器：${port}.${use}`);
    return [port, make(options ?? {}, env)];
  }));
}

function showFatal(err) {
  console.error(err);
  const root = document.getElementById('root');
  root.replaceChildren();
  const box = document.createElement('div');
  box.setAttribute('role', 'alert');
  box.style.cssText = 'padding:24px;font:14px/1.6 system-ui,sans-serif;color:#C8412B';
  box.textContent = `启动失败：${err.message}`;
  root.append(box);
}

export async function boot() {
  const data = await loadData(config.data);

  const ports = createPorts(config.adapters, { data });
  const ladder = createLadder(data.rungs);
  const flow = createFlow({ ladder, nodes: data.nodes });
  const store = createStore(flow.initialState({ hskRung: ladder.hskToRung(config.defaults.hsk) }));
  const bus = createBus();
  const commands = createCommands({ store, bus, flow, ports });

  // 功能拿到的全部依赖
  const ctx = Object.freeze({
    store: store.view(),
    bus,
    commands,
    ports,
    data,
    ladder,
    flags: config.flags,
  });

  // 阶段 0：只证明骨架能启动。阶段 1 替换为 mountRouter(config.pages, featureRegistry, ctx)。
  const root = document.getElementById('root');
  root.replaceChildren(Object.assign(document.createElement('p'), {
    textContent: `朋 peng · 骨架已启动 · chat=${ports.chat.kind}`,
  }));
  if (config.flags.debug) globalThis.__peng = ctx;
  return ctx;
}

boot().catch(showFatal);
