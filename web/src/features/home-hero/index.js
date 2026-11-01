// 首页视觉（v2）：撕纸地层拱 + 相向而飞的鸟群 + 仰望的行人。主参考 reference/主视觉.jpg。
// 构图数据在 composition.js；几何在 core/geometry.js（固定 seed，刷新后构图不变）。
// 只动 opacity（星的闪烁）。哑光、无投影、不用混合模式。
// v1（鹊桥）已封存：docs/archive/home-v1/，git tag home-v1。
import { h, svg } from '../../ui/index.js';
import { mulberry32, tornPolygon, toPathD } from '../../core/geometry.js';
import { VIEW, NARROW, LAYERS, FLOCK, SPECKS, STARS, SCENE, TEXT, COPY, WIDE_MIN_ASPECT } from './composition.js';

const ID = { fiber: 'paper-fiber', base: 'paper-base' };

// ---------- 滤镜 ----------
const fe = (tag, props, ...kids) => svg(tag, props, ...kids);

/** 纸块：低频浓淡转灰度不偏色 + 高频横向白纤维，normal 叠白；最后用 SourceGraphic 裁回纸块自己的轮廓。 */
function fiberFilter() {
  return svg('filter', { id: ID.fiber, x: 0, y: 0, width: '100%', height: '100%', 'color-interpolation-filters': 'sRGB' },
    fe('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.006 0.010', numOctaves: 2, seed: 3, result: 'washRGB' }),
    fe('feColorMatrix', { in: 'washRGB', type: 'matrix', values: '.33 .33 .33 0 0  .33 .33 .33 0 0  .33 .33 .33 0 0  0 0 0 0 1', result: 'wash' }),
    fe('feComposite', { in: 'SourceGraphic', in2: 'wash', operator: 'arithmetic', k1: 0, k2: 1, k3: 0.16, k4: -0.08, result: 'toned' }),
    fe('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.025 0.75', numOctaves: 2, seed: 8, result: 'fiber' }),
    fe('feColorMatrix', { in: 'fiber', type: 'matrix', values: '0 0 0 0 1  0 0 0 0 .98  0 0 0 0 .92  0 0 0 1 0', result: 'fiberW' }),
    fe('feComponentTransfer', { in: 'fiberW', result: 'fiberA' }, fe('feFuncA', { type: 'linear', slope: 0.75, intercept: -0.42 })),
    fe('feBlend', { in: 'fiberA', in2: 'toned', mode: 'normal', result: 'paper' }),
    fe('feComposite', { in: 'paper', in2: 'SourceGraphic', operator: 'in' }));
}

/** 底纸：米色上白纤维看不见，改用褐色横竖短纤维 + 稀疏墨点 + 大片浓淡。 */
function baseFilter() {
  const tint = (r, g, b, a, c) => `0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  ${a} 0 0 0 ${c}`;
  return svg('filter', { id: ID.base, x: 0, y: 0, width: '100%', height: '100%', 'color-interpolation-filters': 'sRGB' },
    fe('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.0035 0.006', numOctaves: 3, seed: 5, result: 'cloud' }),
    fe('feColorMatrix', { in: 'cloud', type: 'matrix', values: '.33 .33 .33 0 0  .33 .33 .33 0 0  .33 .33 .33 0 0  0 0 0 0 1', result: 'cloudG' }),
    fe('feComposite', { in: 'SourceGraphic', in2: 'cloudG', operator: 'arithmetic', k1: 0, k2: 1, k3: 0.2, k4: -0.1, result: 'toned' }),
    fe('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.035 0.42', numOctaves: 2, seed: 21, result: 'fa' }),
    fe('feColorMatrix', { in: 'fa', type: 'matrix', values: tint(.55, .4, .24, 5, -3.3), result: 'fibA' }),
    fe('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.42 0.035', numOctaves: 2, seed: 33, result: 'fb' }),
    fe('feColorMatrix', { in: 'fb', type: 'matrix', values: tint(.6, .46, .28, 4, -2.75), result: 'fibB' }),
    fe('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.16', numOctaves: 1, seed: 40, result: 'fc' }),
    fe('feColorMatrix', { in: 'fc', type: 'matrix', values: tint(.4, .28, .16, 14, -10.8), result: 'fleck' }),
    svg('feMerge', null, ...['toned', 'fibA', 'fibB', 'fleck'].map((r) => svg('feMergeNode', { in: r }))));
}

// ---------- 喜鹊：三种形态（展翅 / 滑翔 / 远处小鸟），朝右，原点在身体中心 ----------
// 朝左的鸟在 flock() 里用 scale(-s, s) 水平翻转，不另画。不用 innerHTML，逐个节点建。
function birdDefs() {
  const body = svg('g', { id: 'hb-body' },
    svg('path', { d: 'M-9 -4 C-24 -3 -40 1 -56 7 C-56 11 -52 13 -46 12 C-32 10 -18 9 -6 7 Z' }),
    svg('path', { d: 'M-12 1 C-8 -6 6 -9 18 -8 C25 -8 28 -4 25 0 C22 4 14 8 4 8 C-3 8 -9 5 -12 1 Z' }),
    svg('circle', { cx: 24, cy: -4.5, r: 5.2 }),
    svg('path', { d: 'M28 -7 L40 -3.5 L28 -1.5 Z' }));
  const wing = svg('path', { id: 'hb-wing', d: 'M12 -4 C13 -20 6 -34 -8 -46 C-9 -41 -12 -39 -15 -39 C-14 -35 -17 -33 -21 -33 C-19 -29 -22 -26 -26 -25 C-22 -21 -22 -17 -20 -14 C-16 -9 -13 -6 -10 -3 Z' });
  const sweep = svg('path', { id: 'hb-sweep', d: 'M12 -5 C4 -13 -12 -20 -36 -25 C-33 -21 -35 -19 -39 -18 C-34 -15 -35 -12 -39 -10 C-30 -8 -20 -5 -8 -1 Z' });
  const use = (href, transform) => svg('use', { href, transform });
  return [
    body, wing, sweep,
    svg('g', { id: 'hb-spread' }, use('#hb-body'), use('#hb-wing'), use('#hb-wing', 'translate(7 -1) rotate(16 8 -4) scale(.8)')),
    svg('g', { id: 'hb-glide' }, use('#hb-body'), use('#hb-sweep'), use('#hb-sweep', 'translate(5 -1) rotate(-14 8 -4) scale(.85)')),
    svg('g', { id: 'hb-far' }, use('#hb-body'), use('#hb-sweep', 'scale(.9)')),
  ];
}

// ---------- 纸块 ----------
let clipSeq = 0;

/** 水彩晕染：纸块之上的低透明度层次，被纸块自己的轮廓裁住。内缘积色 + 3 个内部色斑，位置由 seed 决定。 */
function washLayer(b, d) {
  const id = `hero-wash-${clipSeq++}`;
  const xs = b.pts.map((p) => p[0]);
  const ys = b.pts.map((p) => p[1]);
  const x0 = Math.max(0, Math.min(...xs));
  const x1 = Math.min(VIEW.w, Math.max(...xs));
  const y0 = Math.max(0, Math.min(...ys));
  const y1 = Math.min(VIEW.h, Math.max(...ys));
  const rnd = mulberry32(b.seed * 7 + 3);
  const dark = /sand|tan/.test(b.tone) ? 'var(--ochre)' : 'var(--ink)';   // 浅纸积赭色，深纸积墨色
  const g = svg('g', { class: 'hero__wash', 'clip-path': `url(#${id})`, 'data-wash': b.id },
    svg('clipPath', { id }, svg('path', { d })),
    svg('path', { d, fill: 'none', stroke: dark, 'stroke-width': 16, 'stroke-linejoin': 'round', opacity: 0.16 }));
  for (let i = 0; i < 3; i++) {
    g.append(svg('ellipse', {
      cx: x0 + (x1 - x0) * (0.15 + rnd() * 0.7),
      cy: y0 + (y1 - y0) * (0.15 + rnd() * 0.7),
      rx: Math.max(30, (x1 - x0) * (0.18 + rnd() * 0.22)),
      ry: Math.max(24, (y1 - y0) * (0.2 + rnd() * 0.25)),
      transform: `rotate(${(rnd() * 40 - 20).toFixed(1)})`,
      fill: i % 2 ? dark : 'var(--paper)',
      opacity: i % 2 ? 0.1 : 0.13,
    }));
  }
  return g;
}

function paperBlocks(list) {
  const g = svg('g');
  for (const b of list) {
    const d = toPathD(tornPolygon(b.pts, { step: b.step, amp: b.amp, seed: b.seed }));
    // 撕开后的浅色纤维白边：同一轮廓描边，叠在纸块下面
    g.append(svg('path', { class: 'hero__fringe', d }));
    g.append(svg('path', {
      class: ['hero__paper', b.tex && 'is-textured', b.bright && 'is-bright'],
      d, style: `fill: ${b.tone}`, 'data-block': b.id,
    }));
    if (!b.bright && b.wash !== false) g.append(washLayer(b, d));
  }
  return g;
}

// ---------- 鸟群 / 点缀 / 行人 ----------
function flock() {
  const g = svg('g', { class: 'hero__birds', 'data-count': FLOCK.length });
  for (const [kind, dir, x, y, climb, s, o] of FLOCK) {
    // 朝左 = 先水平翻转再旋转，爬升角的符号要反过来
    const rot = dir === 'r' ? -climb : climb;
    g.append(svg('use', {
      href: `#hb-${kind}`, opacity: o, 'data-dir': dir,
      transform: `translate(${x} ${y}) rotate(${rot}) scale(${dir === 'r' ? s : -s} ${s})`,
    }));
  }
  return g;
}

function sky() {
  const g = svg('g', { class: 'hero__sky' },
    svg('g', { class: 'hero__speck' }, ...SPECKS.map(([cx, cy, r]) => svg('circle', { cx, cy, r }))));
  for (const [x, y, k, delay] of STARS) {
    g.append(svg('path', {
      class: 'hero__star', style: `animation-delay: ${delay}s`,
      d: `M${x} ${y - 5 * k}v${10 * k}M${x - 5 * k} ${y}h${10 * k}M${x - 3 * k} ${y - 3 * k}l${6 * k} ${6 * k}M${x + 3 * k} ${y - 3 * k}l${-6 * k} ${6 * k}`,
    }));
  }
  return g;
}

/** 行人：左下暗坡上，背包，仰头望天。黑只给头发和裤子；上衣、背包、脸走补色。 */
function wanderer() {
  const p = (cls, d, extra) => svg('path', { class: cls, d, ...extra });
  return svg('g', { class: 'hero__person', transform: `translate(${SCENE.x} ${SCENE.y})`, 'aria-hidden': 'true' },
    svg('ellipse', { class: 'hero__shadow', cx: 2, cy: 107, rx: 26, ry: 5 }),
    p('hero__trousers', 'M-14 62 L-18 100 L-6 100 L0 68Z M4 66 L8 100 L20 100 L20 62Z'),
    p('hero__boots', 'M-22 98 h18 l2 8 h-22Z M5 98 h18 l2 8 h-20Z'),
    p('hero__coat', 'M-16 8 C-6 0 12 0 20 10 L26 70 C14 74 -4 74 -20 68Z'),
    p('hero__coat-light', 'M-8 14 C0 10 10 10 16 14 L18 40 L-6 40Z'),
    p('hero__arm', 'M-14 12 L-24 52 L-14 54 L-6 22Z'),
    p('hero__pack', 'M-30 30 C-42 32 -46 52 -40 66 C-32 72 -22 68 -20 56 L-18 34Z'),
    p('hero__strap', 'M-30 30 C-24 26 -18 28 -14 22'),
    p('hero__skin', 'M-2 -2 L14 -2 L14 10 L-2 10Z'),
    svg('ellipse', { class: 'hero__skin', cx: 9, cy: -12, rx: 12, ry: 14, transform: 'rotate(14 9 -12)' }),
    p('hero__hair', 'M-3 -16 C-4 -30 12 -34 20 -24 C22 -18 18 -22 12 -22 C6 -22 2 -18 -3 -16Z'));
}

// ---------- 响应式（设计说明 11）----------
// 横版（宽高比 ≥ WIDE_MIN_ASPECT）：完整构图，左下对齐 + cover 铺满。左下对齐是因为行人在左下角，
// 居中裁切会在偏方的窗口里把他裁掉；被裁掉的只会是右侧山体和天空。文字框按同一个缩放换算成像素。
// 竖版（竖屏、4:3 平板等）：只取 x 0–NARROW.w，底对齐，保留行人 + 拱的左半 + 左岸鸟群；
// 上方多出来的只是纸，底纸矩形跟着 viewBox 走，标题放在那里。
function fit(hero, art, base) {
  const cw = art.clientWidth || window.innerWidth;
  const ch = art.clientHeight || window.innerHeight;
  const wide = cw / ch >= WIDE_MIN_ASPECT && cw > 720;
  let x = 0;
  let y = 0;
  let w = VIEW.w;
  let hh = VIEW.h;
  if (wide) {
    const s = Math.max(cw / VIEW.w, ch / VIEW.h);
    hero.style.setProperty('--ts', s.toFixed(4));
    hero.style.setProperty('--tx', `${(TEXT.x * s).toFixed(1)}px`);
    hero.style.setProperty('--tb', `${((VIEW.h - TEXT.bottom) * s).toFixed(1)}px`);
  } else {
    w = NARROW.w;
    hh = Math.max(NARROW.minH, w * (ch / cw));
    y = VIEW.h - hh;
    for (const k of ['--ts', '--tx', '--tb']) hero.style.removeProperty(k);
  }
  hero.dataset.fit = wide ? 'wide' : 'narrow';
  art.setAttribute('viewBox', `${x} ${y} ${w} ${hh}`);
  art.setAttribute('preserveAspectRatio', wide ? 'xMinYMax slice' : 'xMinYMax meet');
  for (const [k, v] of Object.entries({ x, y, width: w, height: hh })) base.setAttribute(k, v);
}

export default {
  id: 'home-hero',
  mount(el) {
    const base = svg('rect', { class: 'hero__base', filter: `url(#${ID.base})` });
    const art = svg('svg', {
      class: 'hero__art', viewBox: `0 0 ${VIEW.w} ${VIEW.h}`, preserveAspectRatio: 'xMidYMid slice',
      role: 'img', 'aria-labelledby': 'hero-t hero-d', focusable: 'false',
    },
    svg('title', { id: 'hero-t' }, '随身孔子学院主视觉'),
    svg('desc', { id: 'hero-d' }, COPY.alt),
    svg('defs', null, fiberFilter(), baseFilter(), ...birdDefs()),
    base,
    // 叠放顺序：底纸 → 远景山 → 右侧山体 → 中景地层带（左坡 + 拱）→ 前景坡 → 鸟群 → 点缀 → 行人
    // 右山体放在拱之前：拱的外层压住山体带子的起端，山体读成从拱顶后面长出来的同一套地层。
    paperBlocks(LAYERS.far), paperBlocks(LAYERS.right), paperBlocks(LAYERS.strata), paperBlocks(LAYERS.fore),
    flock(), sky(), wanderer());

    // ---- 文字层（HTML，可读、可聚焦）。放进拱下右下空白 ----
    const start = h('a', { class: 'hero__start', href: '#/app', 'aria-label': '开始，进入工作台 · Start, open the workbench' },
      h('span', { class: 'hero__start-zh' }, COPY.start.zh),
      h('span', { class: 'hero__start-en', lang: 'en' }, COPY.start.en));
    const text = h('div', { class: 'hero__text' },
      h('h1', { id: 'home-title', class: 'hero__title' }, ...COPY.title.flatMap((line, i) => (i ? [h('br'), line] : [line]))),
      h('p', { class: 'hero__sub', lang: 'en' }, COPY.subtitle),
      start);

    const hero = h('section', { class: 'hero', 'aria-labelledby': 'home-title' }, art, text);
    el.append(hero);

    const refit = () => fit(hero, art, base);
    refit();
    window.addEventListener('resize', refit);
    return () => {
      window.removeEventListener('resize', refit);
      el.replaceChildren();
    };
  },
};
