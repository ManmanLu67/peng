// 依赖检查：按技术文档 14.2 的表，扫描 src/**/*.js 的静态 import，违规则非零退出。
// 局限（14.11）：动态 import() 与拼接路径拦不住，只能挡常见违规。
// 用法：node scripts/check-deps.mjs
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SRC = join(WEB, 'src');

// 各层允许 import 的层。同层同目录内部引用另行放行（features 之间除外）。
const ALLOW = {
  core: ['core'],
  ports: [],
  adapters: ['core', 'ports'],
  ui: ['core'],
  features: ['core', 'ui', 'ports'],
  pages: [],
  shell: ['core', 'ui'],
  app: ['core', 'ports', 'adapters', 'ui', 'features', 'pages', 'shell'],
};

// 兜底：这些字样只允许出现在 core（无）与 adapters
const FORBIDDEN_GLOBALS = [
  { re: /\bfetch\s*\(/, name: 'fetch(', allowIn: ['adapters', 'app'] },
  { re: /\bnew\s+(?:webkit)?SpeechRecognition\b|\bwebkitSpeechRecognition\b/, name: 'SpeechRecognition', allowIn: ['adapters'] },
  { re: /\blocalStorage\b/, name: 'localStorage', allowIn: ['adapters'] },
  { re: /\bspeechSynthesis\b/, name: 'speechSynthesis', allowIn: ['adapters'] },
];

// core 内不能出现浏览器全局
const CORE_GLOBALS = /\b(?:document|window|navigator|location|localStorage|alert)\b/;

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

/** 返回 { layer, feature }；src/app.js 的 layer 是 'app' */
function classify(file) {
  const parts = relative(SRC, file).split(sep);
  if (parts.length === 1) return { layer: parts[0] === 'app.js' ? 'app' : 'app', feature: null };
  const layer = parts[0];
  return { layer, feature: layer === 'features' && parts.length > 2 ? parts[1] : null };
}

/** 去掉注释，保留行号 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;

async function main() {
  const files = await walk(SRC);
  const problems = [];

  for (const file of files) {
    const rel = relative(WEB, file).split(sep).join('/');
    const { layer, feature } = classify(file);
    const raw = await readFile(file, 'utf8');
    const code = stripComments(raw);
    const lineOf = (idx) => code.slice(0, idx).split('\n').length;

    if (!(layer in ALLOW)) {
      problems.push(`${rel}: 未知层 "${layer}"`);
      continue;
    }

    // 1) import 方向
    for (const m of code.matchAll(IMPORT_RE)) {
      const spec = m[1] ?? m[2];
      if (!spec.startsWith('.')) {
        problems.push(`${rel}:${lineOf(m.index)} 不允许引入外部依赖 "${spec}"（零依赖）`);
        continue;
      }
      const target = resolve(dirname(file), spec);
      // 组装根是唯一允许读 config/ 的地方
      if (layer === 'app' && target.startsWith(join(WEB, 'config') + sep)) continue;
      const tRel = relative(SRC, target);
      if (tRel.startsWith('..')) {
        problems.push(`${rel}:${lineOf(m.index)} import 越出 src/："${spec}"`);
        continue;
      }
      const tParts = tRel.split(sep);
      const tLayer = tParts.length === 1 ? 'app' : tParts[0];
      const tFeature = tLayer === 'features' && tParts.length > 2 ? tParts[1] : null;

      if (tLayer === layer) {
        if (layer === 'features' && feature !== tFeature) {
          problems.push(`${rel}:${lineOf(m.index)} 功能 "${feature}" 不得 import 功能 "${tFeature ?? 'registry'}"`);
        }
        continue;
      }
      if (!ALLOW[layer].includes(tLayer)) {
        problems.push(`${rel}:${lineOf(m.index)} ${layer} 层不得 import ${tLayer} 层（"${spec}"）`);
      }
    }

    // 2) 禁用全局
    for (const g of FORBIDDEN_GLOBALS) {
      if (g.allowIn.includes(layer)) continue;
      const hit = g.re.exec(code);
      if (hit) problems.push(`${rel}:${lineOf(hit.index)} ${layer} 层不得使用 ${g.name}`);
    }
    if (layer === 'core') {
      const hit = CORE_GLOBALS.exec(code);
      if (hit) problems.push(`${rel}:${lineOf(hit.index)} core 不得使用浏览器全局 "${hit[0]}"`);
    }
  }

  if (problems.length) {
    console.error(`依赖检查未通过（${problems.length} 处）：`);
    for (const p of problems) console.error('  ✗ ' + p);
    process.exit(1);
  }
  console.log(`依赖检查通过（${files.length} 个文件）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
