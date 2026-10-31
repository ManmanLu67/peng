// 配置自检：config 里写的适配器和数据文件必须真实存在，否则启动才会报错。
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import config from '../config/app.config.js';
import { adapterFactories } from '../src/adapters/index.js';

test('config.adapters 里的每个实现都已登记在 adapters/index.js', () => {
  for (const [port, { use }] of Object.entries(config.adapters)) {
    assert.equal(typeof adapterFactories[port]?.[use], 'function', `${port}.${use} 未登记`);
  }
});

test('config.data 里的每个文件存在且是合法 JSON', () => {
  for (const name of config.data) {
    const file = fileURLToPath(new URL(`../data/${name}.json`, import.meta.url));
    assert.ok(existsSync(file), `data/${name}.json 不存在`);
    assert.doesNotThrow(() => JSON.parse(readFileSync(file, 'utf8')), `data/${name}.json 不是合法 JSON`);
  }
});

test('P0 必需的端口都已配置', () => {
  for (const port of ['chat', 'segmenter', 'clock']) assert.ok(config.adapters[port], `缺少 ${port}`);
});
