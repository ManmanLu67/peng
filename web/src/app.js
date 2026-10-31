// 组装根：读 config → 加载数据 → 创建 ports → 组装 ctx → 挂载路由。
// 唯一允许同时看见 adapters、features、pages、shell 的地方。

import config from '../config/app.config.js';
import { adapterFactories } from './adapters/index.js';
import { featureRegistry } from './features/registry.js';
import { pages } from './pages/index.js';
import { mountRouter } from './shell/router.js';
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

/** 启动失败：整页替换成一条可读的错误，不白屏。用 textContent，不拼 HTML。 */
function showFatal(err) {
  console.error(err);
  const root = document.getElementById('root');
  root.replaceChildren();
  const box = document.createElement('div');
  box.className = 'feature-error';
  box.setAttribute('role', 'alert');
  box.textContent = `启动失败：${err.message}`;
  root.append(box);
}

/** 运行期意外异常：只弹一行提示，不拆页面（SCOPE：不白屏，不做详情与重试 UI）。 */
function installGuards(bus) {
  let timer = null;
  const toast = (message) => {
    document.querySelector('.toast')?.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'alert');
    el.textContent = message;
    document.body.append(el);
    clearTimeout(timer);
    timer = setTimeout(() => el.remove(), 5000);
  };
  window.addEventListener('error', (e) => {
    console.error(e.error ?? e.message);
    toast('出了点问题，页面仍可使用 · Something went wrong');
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error(e.reason);
    toast('出了点问题，页面仍可使用 · Something went wrong');
  });
  bus.on('error:shown', ({ code }) => toast(`请求失败（${code}） · Request failed`));
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

  installGuards(bus);
  if (config.flags.debug) globalThis.__peng = ctx;

  mountRouter(pages, featureRegistry, ctx, {
    root: document.getElementById('root'),
    live: document.getElementById('live'),
  });
  return ctx;
}

boot().catch(showFatal);
