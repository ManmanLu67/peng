// 组装根：读 config → 加载数据 → 创建 ports → 组装 ctx → 挂载路由。
// 唯一允许同时看见 adapters、features、pages、shell 的地方。

import config from '../config/app.config.js';
import { adapterFactories, applyLocalChat } from './adapters/index.js';
import { loadRegistry } from './features/registry.js';
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
  box.textContent = '页面没能打开，请刷新再试 · The page could not load. Please refresh.';
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
  const REASON = {
    timeout: ['等了太久，没有收到回复，请再试一次', 'No reply in time. Please try again'],
    network: ['网络连不上，请检查网络后再试', 'Cannot connect. Check your network and try again'],
    auth: ['模型的密钥不对或已失效', 'The model key is invalid or expired'],
    bad_response: ['模型这次的回复没法使用，请再试一次', 'The reply could not be used. Please try again'],
  };
  bus.on('error:shown', ({ code }) => {
    const [zh, en] = REASON[code] ?? REASON.network;
    toast(`${zh} · ${en}`);
  });
}

/** 没有 config.local.js（或它被浏览器拦下）时继续用 mock。 */
async function loadLocalConfig() {
  try {
    const mod = await import('../config/config.local.js');
    return mod.default ?? null;
  } catch {
    return null;
  }
}

export async function boot() {
  const data = await loadData(config.data);
  const local = await loadLocalConfig();

  const ports = createPorts(applyLocalChat(config.adapters, local), { data });
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

  mountRouter(pages, loadRegistry, ctx, {
    root: document.getElementById('root'),
    live: document.getElementById('live'),
  });
  return ctx;
}

boot().catch(showFatal);
