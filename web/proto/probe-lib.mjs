// 开发期探测库：用无头 Edge + DevTools 协议在真实浏览器里检查页面。仅本地开发使用，不部署。
// 用法见各 probe-*.mjs。需要环境变量 EDGE_EXE 指向 msedge.exe。
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout: ' + label)), ms))]);

export async function session(port, fn) {
  const profile = mkdtempSync(join(tmpdir(), 'peng-probe-'));
  const proc = spawn(process.env.EDGE_EXE, ['--headless=new', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  const results = [];
  let crashed = false;
  try {
    let list;
    for (let i = 0; i < 40; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); } }
    const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    let id = 0;
    const pending = new Map();
    const logs = [];
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
      if (d.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text));
      if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') logs.push('ERR ' + d.params.args.map((a) => a.value ?? a.description).join(' '));
      if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') logs.push('NET ' + d.params.entry.text + ' ' + (d.params.entry.url ?? ''));
    };
    const send = (method, params = {}) => withTimeout(new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); }), 20000, method);
    const ev = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true });
      if (r.result?.exceptionDetails) throw new Error('eval: ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text));
      return r.result?.result?.value;
    };
    for (const m of ['Runtime.enable', 'Log.enable', 'Page.enable']) await send(m);
    const check = (name, ok, detail = '') => { results.push(!!ok); console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (!ok && detail ? '  → ' + detail : '')); };
    const view = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    const go = async (url, wait = 1200) => { await send('Page.navigate', { url }); await sleep(wait); };
    const shot = async (file) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(file, Buffer.from(r.result.data, 'base64')); };
    await fn({ send, ev, check, view, go, shot, logs, sleep });
    check('控制台无错误', logs.length === 0, logs.join(' | '));
    ws.close();
  } catch (e) {
    crashed = true;
    console.log('probe error:', e.message);
  } finally {
    proc.kill();
    await sleep(1500);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* 目录被占用时留给外部清理 */ }
  }
  const fails = results.filter((x) => !x).length;
  console.log(crashed ? `\nINCOMPLETE（已完成 ${results.length} 项，失败 ${fails}）` : fails ? `\nFAILED ${fails}/${results.length}` : `\nALL PASS ${results.length}/${results.length}`);
  return { results, crashed, fails };
}

/** 等待 store 离开 running（最长 timeoutMs） */
export async function settle(ev, timeoutMs = 8000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if ((await ev('__peng.store.get().status')) !== 'running') return;
    await sleep(150);
  }
}
