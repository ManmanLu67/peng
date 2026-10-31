// 首页视觉：大色域 + 鹊桥 + 微场景。纸本拼贴质感用 SVG feTurbulence（低频浓淡 + 高频横向纤维）。
// 构图数据在 composition.js；几何在 core/geometry.js（固定 seed）。只动 opacity / transform。
// P1 预留：墨渍入场动画 —— 给 .hero 加 data-ink="on" 并实现 startInk(birds, lamp)，本次元素静态全显。
import { h, svg, ensureSymbols } from '../../ui/index.js';
import { tornPolygon, toPathD, scalePoints, quadCurvePoints } from '../../core/geometry.js';
import { VIEW, BLOCKS, BRIDGE, LAMP, SCENE, TEXT, COPY } from './composition.js';

const SVGNS_ID = 'paper-fiber';

/** 纸张滤镜（原型 v2）：低频浓淡转灰度不偏色 + 高频横向短纤维，normal 叠白，不用 soft-light。 */
function paperFilter() {
  return svg('filter', { id: SVGNS_ID, x: 0, y: 0, width: '100%', height: '100%', 'color-interpolation-filters': 'sRGB' },
    svg('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.006 0.010', numOctaves: 2, seed: 3, result: 'washRGB' }),
    svg('feColorMatrix', { in: 'washRGB', type: 'matrix', values: '.33 .33 .33 0 0  .33 .33 .33 0 0  .33 .33 .33 0 0  0 0 0 0 1', result: 'wash' }),
    svg('feComposite', { in: 'SourceGraphic', in2: 'wash', operator: 'arithmetic', k1: 0, k2: 1, k3: 0.16, k4: -0.08, result: 'toned' }),
    svg('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.025 0.75', numOctaves: 2, seed: 8, result: 'fiber' }),
    svg('feColorMatrix', { in: 'fiber', type: 'matrix', values: '0 0 0 0 1  0 0 0 0 .98  0 0 0 0 .92  0 0 0 1 0', result: 'fiberW' }),
    svg('feComponentTransfer', { in: 'fiberW', result: 'fiberA' }, svg('feFuncA', { type: 'linear', slope: 0.75, intercept: -0.42 })),
    svg('feBlend', { in: 'fiberA', in2: 'toned', mode: 'normal' }));
}

function paperBlocks() {
  const g = svg('g', { class: 'hero__papers' });
  for (const b of BLOCKS) {
    const pts = tornPolygon(scalePoints(b.pct, VIEW.w, VIEW.h), { step: b.step, amp: b.amp, seed: b.seed });
    const d = toPathD(pts);
    // 撕开后的浅色纤维白边：同一轮廓描边，叠在纸块下面
    g.append(svg('path', { class: 'hero__fringe', d }));
    g.append(svg('path', {
      class: ['hero__paper', b.textured && 'is-textured', b.bright && 'is-bright'],
      d, style: `fill: var(${b.tone})`, 'data-block': b.id,
    }));
  }
  return g;
}

/** 剪影：人物（侧身仰头，手端水杯）、小石头、停在石头上的喜鹊。单色，整体很小。 */
function microScene() {
  const { x, y } = SCENE;
  return svg('g', { class: 'hero__scene', transform: `translate(${x} ${y})`, 'aria-hidden': 'true' },
    // 石头
    svg('path', { class: 'hero__stone', d: 'M70 118 q8 -14 24 -12 q14 2 18 12 z' }),
    // 石头上的喜鹊
    svg('svg', { x: 84, y: 82, width: 34, height: 20, viewBox: '0 0 48 28', class: 'hero__scene-bird' }, svg('use', { href: '#magpie' })),
    // 人物：身体（侧身）、头（仰角约 25°）、手臂与水杯
    svg('g', { class: 'hero__person' },
      svg('path', { d: 'M20 118 L24 60 Q28 44 38 42 L46 44 Q52 50 50 64 L46 118 Z' }),
      svg('g', { transform: 'rotate(-25 40 34)' }, svg('ellipse', { cx: 42, cy: 30, rx: 9, ry: 11 })),
      svg('path', { d: 'M46 66 L64 56', stroke: 'currentColor', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }),
      svg('path', { class: 'hero__cup', d: 'M62 48 h12 l-2 14 h-8 z' })));
}

export default {
  id: 'home-hero',
  mount(el) {
    ensureSymbols();
    const { w, h: H } = VIEW;

    // ---- 桥：14 只喜鹊沿下垂曲线首尾相接 ----
    const pts = quadCurvePoints(BRIDGE.from, BRIDGE.ctrl, BRIDGE.to, BRIDGE.count);
    const birds = pts.map((p, i) => svg('g', {
      class: 'hero__bird', 'data-i': i,
      transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.angle.toFixed(1)})`,
    }, svg('svg', { x: -BRIDGE.size.w / 2, y: -BRIDGE.size.h / 2, width: BRIDGE.size.w, height: BRIDGE.size.h, viewBox: '0 0 48 28' }, svg('use', { href: '#magpie' }))));
    const bridge = svg('g', { class: 'hero__bridge', 'data-count': BRIDGE.count }, ...birds);
    // 桥 + 一块透明热区（比桥略大，好点）包进 SVG 链接：点击桥进入工作台
    const hit = svg('rect', { class: 'hero__bridge-hit', x: BRIDGE.from[0] - 30, y: BRIDGE.from[1] - 60, width: BRIDGE.to[0] - BRIDGE.from[0] + 60, height: 150 });
    const bridgeLink = svg('a', { class: 'hero__bridge-a', href: '#/app', tabindex: '-1', 'aria-hidden': 'true' }, hit, bridge);

    // ---- 朱砂小灯（光晕 + 灯芯）----
    const lamp = svg('g', { class: 'hero__lamp', transform: `translate(${LAMP.x} ${LAMP.y})`, 'aria-hidden': 'true' },
      svg('circle', { class: 'hero__lamp-glow', r: LAMP.r * 2.6 }),
      svg('circle', { class: 'hero__lamp-core', r: LAMP.r }));

    // ---- 桥下 01–04 序号，细线引出 ----
    const numbers = svg('g', { class: 'hero__numbers', 'aria-hidden': 'true' },
      ...TEXT.numbersX.flatMap((x, i) => [
        svg('line', { x1: x, y1: BRIDGE.to[1] + 40, x2: x, y2: TEXT.numbersY - 46, class: 'hero__lead' }),
        svg('text', { x, y: TEXT.numbersY, 'text-anchor': 'middle', class: 'hero__no' }, `0${i + 1}`),
        svg('text', { x, y: TEXT.numbersY + 30, 'text-anchor': 'middle', class: 'hero__nolabel' }, COPY.labels[i]),
      ]));

    const art = svg('svg', {
      class: 'hero__art', viewBox: `0 0 ${w} ${H}`, preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true', focusable: 'false',
    }, svg('defs', null, paperFilter()), paperBlocks(), bridgeLink, lamp, numbers, microScene());

    // ---- 文字层（HTML，可读、可聚焦）----
    const start = h('a', { class: 'hero__start', href: '#/app', 'aria-label': '开始，进入工作台 · Start, open the workbench' },
      h('span', { class: 'hero__start-zh' }, COPY.start.zh),
      h('span', { class: 'hero__start-en', lang: 'en' }, COPY.start.en));

    const text = h('div', { class: 'hero__text' },
      h('h1', { id: 'home-title', class: 'hero__title' }, ...COPY.title.flatMap((line, i) => (i ? [h('br'), line] : [line]))),
      h('p', { class: 'hero__sub', lang: 'en' }, COPY.subtitle));

    const entry = h('div', { class: 'hero__entry' }, start, h('span', { class: 'hero__entry-rule', 'aria-hidden': 'true' }));

    el.append(h('section', { class: 'hero', 'aria-labelledby': 'home-title' }, art, text, entry));
    return () => el.replaceChildren();
  },
};
