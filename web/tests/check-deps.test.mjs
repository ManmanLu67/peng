// check-deps 的反向测试：在临时目录造一份最小的 src/，故意写违规，确认脚本会报错；
// 合规的写法必须通过。脚本按自身所在位置定位 web/，所以把它复制进临时目录运行。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../scripts/check-deps.mjs', import.meta.url));

function run(files) {
  const root = mkdtempSync(join(tmpdir(), 'peng-deps-'));
  try {
    mkdirSync(join(root, 'scripts'), { recursive: true });
    copyFileSync(SCRIPT, join(root, 'scripts', 'check-deps.mjs'));
    for (const [rel, body] of Object.entries(files)) {
      const full = join(root, 'src', rel);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, body);
    }
    const r = spawnSync(process.execPath, [join(root, 'scripts', 'check-deps.mjs')], { encoding: 'utf8' });
    return { code: r.status, out: r.stdout + r.stderr };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('合规的最小结构通过', () => {
  const r = run({
    'core/a.js': 'export const a = 1;\n',
    'features/x/index.js': "import { a } from '../../core/a.js';\nexport default { a };\n",
    'features/registry.js': "import x from './x/index.js';\nexport default { x };\n",
  });
  assert.equal(r.code, 0, r.out);
});

test('功能 import 另一个功能 → 报错', () => {
  const r = run({
    'features/x/index.js': "import y from '../y/index.js';\nexport default y;\n",
    'features/y/index.js': 'export default 1;\n',
  });
  assert.equal(r.code, 1);
  assert.match(r.out, /功能 "x" 不得 import 功能 "y"/);
});

test('功能 import registry → 报错（registry 只能单向引用功能）', () => {
  const r = run({
    'features/x/index.js': "import r from '../registry.js';\nexport default r;\n",
    'features/registry.js': 'export default {};\n',
  });
  assert.equal(r.code, 1);
  assert.match(r.out, /不得 import 功能 "registry"/);
});

test('功能 import 适配器 → 报错', () => {
  const r = run({
    'features/x/index.js': "import m from '../../adapters/m.js';\nexport default m;\n",
    'adapters/m.js': 'export default 1;\n',
  });
  assert.equal(r.code, 1);
  assert.match(r.out, /features 层不得 import adapters 层/);
});

test('core 使用浏览器全局 → 报错', () => {
  const r = run({ 'core/a.js': 'export const t = () => document.title;\n' });
  assert.equal(r.code, 1);
  assert.match(r.out, /core 不得使用浏览器全局/);
});

test('功能里直接 fetch / localStorage → 报错', () => {
  const r = run({
    'features/x/index.js': "export default { f: () => fetch('/a'), s: () => localStorage.getItem('k') };\n",
  });
  assert.equal(r.code, 1);
  assert.match(r.out, /不得使用 fetch\(/);
  assert.match(r.out, /不得使用 localStorage/);
});

test('功能动态 import 另一个功能 → 报错', () => {
  const r = run({
    'features/x/index.js': "export default import('../y/index.js');\n",
    'features/y/index.js': 'export default 1;\n',
  });
  assert.equal(r.code, 1);
  assert.match(r.out, /功能 "x" 不得 import 功能 "y"/);
});

test('引入外部依赖 → 报错（零依赖）', () => {
  const r = run({ 'core/a.js': "import x from 'lodash';\nexport default x;\n" });
  assert.equal(r.code, 1);
  assert.match(r.out, /不允许引入外部依赖/);
});

test('注释里出现违规字样不算违规', () => {
  const r = run({ 'features/x/index.js': "// 不要用 fetch( 和 localStorage\nexport default 1;\n" });
  assert.equal(r.code, 0, r.out);
});
