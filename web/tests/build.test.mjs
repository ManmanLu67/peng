// 发布包：压缩体积、按动态 import 拆开、文件名带哈希、密钥不进包。明文保留。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildRelease } from '../scripts/build.mjs';
import { cacheControl } from '../scripts/static.mjs';

test('发布包 minify、拆包、预压缩，且不把密钥打进去', async () => {
  const root = await mkdtemp(join(tmpdir(), 'peng-build-'));
  try {
    await mkdir(join(root, 'src'));
    await mkdir(join(root, 'styles'));
    await mkdir(join(root, 'data'));
    await mkdir(join(root, 'config'));
    await writeFile(
      join(root, 'config/config.local.js'),
      "export default { chat: { apiKey: 'SENTINEL_KEY_9f3a' } };\n",
    );
    await writeFile(
      join(root, 'src/a.js'),
      "/* DROP_ME */\nexport function text() { return '汉语分级改写器'; }\n",
    );
    await writeFile(
      join(root, 'src/b.js'),
      `export function text() { return '${'B'.repeat(4000)}'; }\n`,
    );
    await writeFile(
      join(root, 'src/app.js'),
      [
        "const loadA = () => import('./a.js');",
        "const loadB = () => import('./b.js');",
        'globalThis.__pengRun = async function () {',
        '  const [a, b] = await Promise.all([loadA(), loadB()]);',
        '  let local = null;',
        '  try {',
        "    local = (await import('../config/config.local.js')).default ?? null;",
        '  } catch {',
        '    local = null;',
        '  }',
        "  return { text: a.text(), other: b.text(), className: 'feature-error', local };",
        '};',
        '',
      ].join('\n'),
    );
    await writeFile(join(root, 'styles/a.css'), '/* DROP_ME */\n.feature-error { color: red; }\n');
    await writeFile(join(root, 'data/note.json'), JSON.stringify({ note: '词'.repeat(2000) }));
    await writeFile(
      join(root, 'index.html'),
      '<!doctype html><html><head><link rel="stylesheet" href="./styles/a.css"></head><body><script type="module" src="./src/app.js"></script></body></html>\n',
    );

    const built = await buildRelease(root);
    const names = built.files.map((f) => f.replaceAll('\\', '/'));
    const js = names.filter((f) => f.startsWith('assets/') && f.endsWith('.js'));
    assert.ok(js.length >= 3, `应拆成入口加两个动态块，实际 ${js.join(', ')}`);
    for (const name of js) assert.match(name, /-[0-9A-Za-z_-]{8}\.js$/);

    const entry = await readFile(join(built.dist, built.entry), 'utf8');
    const css = await readFile(join(built.dist, built.css), 'utf8');
    const html = await readFile(join(built.dist, 'index.html'), 'utf8');
    const allJs = await Promise.all(js.map((n) => readFile(join(built.dist, n), 'utf8')));
    const joined = allJs.join('\n');
    assert.equal(joined.includes('DROP_ME'), false);
    assert.equal(joined.includes('SENTINEL_KEY_9f3a'), false);
    assert.equal(joined.includes('汉语分级改写器'), true);
    assert.equal(css.includes('DROP_ME'), false);
    assert.match(css, /\.feature-error/);
    assert.equal(html.includes('./src/app.js'), false);
    assert.match(html, new RegExp(`\\./${built.entry.replaceAll('\\', '/')}`));
    assert.match(html, new RegExp(`\\./${built.css.replaceAll('\\', '/')}`));
    assert.equal(cacheControl(built.entry), 'public, max-age=31536000, immutable');
    assert.equal(cacheControl('index.html'), 'no-cache');
    assert.equal(cacheControl('data/note.json'), 'no-cache');

    const gz = await readFile(join(built.dist, 'data/note.json.gz'));
    const raw = await readFile(join(built.dist, 'data/note.json'));
    const br = await readFile(join(built.dist, 'data/note.json.br'));
    assert.ok(gz.length < raw.length);
    assert.ok(br.length < raw.length);

    await import(pathToFileURL(join(built.dist, built.entry)).href);
    const got = await globalThis.__pengRun();
    assert.equal(got.text, '汉语分级改写器');
    assert.equal(got.other, 'B'.repeat(4000));
    assert.equal(got.className, 'feature-error');
    assert.equal(got.local.chat.apiKey, 'SENTINEL_KEY_9f3a');
  } finally {
    delete globalThis.__pengRun;
    await rm(root, { recursive: true, force: true });
  }
});
