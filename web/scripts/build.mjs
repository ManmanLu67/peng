// 发布用打包。不改 web/src 的运行方式：npm start 仍直接提供源码。
// 产物在 web/dist：minify、按动态 import 拆包、内容哈希、gzip 与 brotli。
// config.local.js 保持在包外。
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import * as esbuild from 'esbuild';

const WEB = resolve(fileURLToPath(new URL('..', import.meta.url)));
const TEXT = new Set(['.js', '.mjs', '.css', '.html', '.json', '.svg']);

function absPath(p) {
  return isAbsolute(p) ? p : resolve(p);
}

function relPosix(from, file) {
  return relative(from, file).split(sep).join('/');
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

async function assertKeyNotInlined(webRoot, dist) {
  let src;
  try {
    src = await readFile(join(webRoot, 'config/config.local.js'), 'utf8');
  } catch {
    return;
  }
  const matched = src.match(/apiKey:\s*(['"])([^'"]+)\1/);
  const key = matched?.[2]?.trim();
  if (!key) return;
  for (const file of await walk(dist)) {
    if (extname(file) !== '.js') continue;
    if ((await readFile(file, 'utf8')).includes(key)) {
      await rm(dist, { recursive: true, force: true });
      throw new Error('发布包含有 config.local.js 里的密钥，已中止');
    }
  }
}

async function compressTree(dist) {
  for (const file of await walk(dist)) {
    const ext = extname(file).toLowerCase();
    if (!TEXT.has(ext)) continue;
    const buf = await readFile(file);
    const gz = gzipSync(buf, { level: 9 });
    const br = brotliCompressSync(buf, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    });
    if (gz.length < buf.length) await writeFile(`${file}.gz`, gz);
    if (br.length < buf.length) await writeFile(`${file}.br`, br);
  }
}

/** 写出 web/dist。返回入口、样式和相对 dist 的文件列表。 */
export async function buildRelease(webRoot = WEB) {
  const dist = join(webRoot, 'dist');
  const assets = join(dist, 'assets');
  await rm(dist, { recursive: true, force: true });
  await mkdir(assets, { recursive: true });

  const result = await esbuild.build({
    entryPoints: [join(webRoot, 'src/app.js')],
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2022'],
    outdir: assets,
    entryNames: '[name]-[hash]',
    chunkNames: '[name]-[hash]',
    minify: true,
    charset: 'utf8',
    legalComments: 'none',
    metafile: true,
    sourcemap: false,
    plugins: [{
      name: 'local-config',
      setup(build) {
        const spec = relative(join(webRoot, 'dist/assets'), join(webRoot, 'config/config.local.js')).split(sep).join('/');
        build.onResolve({ filter: /config\.local\.js$/ }, () => ({
          path: spec,
          external: true,
        }));
      },
    }],
  });

  let entryAbs = null;
  for (const [out, meta] of Object.entries(result.metafile.outputs)) {
    const ep = meta.entryPoint?.replaceAll('\\', '/');
    if (ep?.endsWith('src/app.js')) entryAbs = absPath(out);
  }
  if (!entryAbs) throw new Error('没有找到 app.js 入口产物');
  const entry = relPosix(dist, entryAbs);

  const htmlSrc = await readFile(join(webRoot, 'index.html'), 'utf8');
  if (!htmlSrc.includes('./src/app.js')) throw new Error('index.html 里没有 ./src/app.js');
  const hrefs = [...htmlSrc.matchAll(/<link rel="stylesheet" href="(\.\/[^"]+)">/g)].map((m) => m[1]);
  let css = null;
  let html = htmlSrc.replace(/\s*<link rel="stylesheet" href="\.\/[^"]+">/g, '');
  html = html.replace('./src/app.js', `./${entry}`);
  if (hrefs.length) {
    const parts = await Promise.all(hrefs.map((href) => readFile(join(webRoot, href.slice(2)), 'utf8')));
    const min = await esbuild.transform(parts.join('\n'), { loader: 'css', minify: true });
    const digest = createHash('sha256').update(min.code).digest('hex').slice(0, 8);
    css = `assets/app-${digest}.css`;
    await writeFile(join(dist, css), min.code);
    html = html.replace('</head>', `  <link rel="stylesheet" href="./${css}">\n</head>`);
  }
  await writeFile(join(dist, 'index.html'), html);

  try {
    await cp(join(webRoot, 'data'), join(dist, 'data'), { recursive: true });
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  await assertKeyNotInlined(webRoot, dist);
  const jsFiles = (await walk(assets)).filter((f) => f.endsWith('.js'));
  for (const file of jsFiles) {
    const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (check.status !== 0) {
      await rm(dist, { recursive: true, force: true });
      throw new Error(check.stderr || `语法检查失败：${file}`);
    }
  }
  await compressTree(dist);

  const files = (await walk(dist))
    .filter((f) => !f.endsWith('.gz') && !f.endsWith('.br'))
    .map((f) => relPosix(dist, f));
  return { dist, entry, css, files };
}

const isMain = process.argv[1]
  && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (isMain) {
  buildRelease().then(
    (built) => console.log(`发布包：${built.dist}`),
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}
