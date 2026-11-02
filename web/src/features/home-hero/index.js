// 首页主视觉：手工纸底、两张一样大的近正方形色纸、中央深藏青小人、「进入」。
// 左卡逆时针约 3°，右卡顺时针约 3°。纸纹是很轻的染色不匀。
// 对角线上 7 只鸟可拖，点开后落到底部并在右卡横排显示该档静态改写。最右下角一只尖端朝上。双击小人和「进入」去工作台。
import { h, svg } from '../../ui/index.js';
import {
  CARDS, ARROWS, POEM, COPY, FOLLOW, GAIN, NARROW_MAX,
  HOVER_TURN, HOVER_SCALE, clampBird,
} from './composition.js';

const ID = { fiber: 'paper-fiber', arrow: 'hero-arrow' };
const ARROW_PTS = [[0, -22], [18, 16], [0, 6], [-18, 16]];
const fe = (tag, props, ...kids) => svg(tag, props, ...kids);

/** 色纸：很轻的染色不匀，再加很少的细纤维。不用混合模式，最后裁回矩形。 */
function feltFilter() {
  const speck = (r, g, b, slope, intercept) => `0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  ${slope} 0 0 0 ${intercept}`;
  return svg('filter', { id: ID.fiber, x: '0', y: '0', width: '100%', height: '100%', 'color-interpolation-filters': 'sRGB' },
    fe('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.012', numOctaves: 2, seed: 4, result: 'cloud' }),
    fe('feGaussianBlur', { in: 'cloud', stdDeviation: 2, result: 'cloudB' }),
    fe('feColorMatrix', { in: 'cloudB', type: 'matrix', values: '.33 .33 .33 0 0  .33 .33 .33 0 0  .33 .33 .33 0 0  0 0 0 0 1', result: 'cloudG' }),
    fe('feComposite', { in: 'SourceGraphic', in2: 'cloudG', operator: 'arithmetic', k1: 0, k2: 0.94, k3: 0.08, k4: 0, result: 'dyed' }),
    fe('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.035 0.45', numOctaves: 1, seed: 7, result: 'fib' }),
    fe('feColorMatrix', { in: 'fib', type: 'matrix', values: speck(0.18, 0.1, 0.04, 7, -5.6), result: 'fibA' }),
    svg('feMerge', { result: 'stacked' },
      svg('feMergeNode', { in: 'dyed' }),
      svg('feMergeNode', { in: 'fibA' })),
    fe('feComposite', { in: 'stacked', in2: 'SourceGraphic', operator: 'in' }));
}

function defsSvg() {
  return svg('svg', { class: 'hero__defs', 'aria-hidden': 'true', focusable: 'false', width: 0, height: 0 },
    svg('defs', null, feltFilter(),
      svg('path', { id: ID.arrow, d: 'M0 -22 L18 16 L0 6 L-18 16 Z' })));
}

/** 直边矩形。viewBox 跟元素像素走，纸纹不被拉伸。子图层用 layout(w, h) 定位。 */
function cardSvg(card, layers = [], hidden = true) {
  const paper = svg('rect', {
    class: 'hero__paper', 'data-block': card.id, fill: card.tone, filter: `url(#${ID.fiber})`,
  });
  const art = svg('svg', {
    class: 'hero__card-svg', 'aria-hidden': hidden ? 'true' : null, focusable: 'false',
  }, paper, ...layers.map((l) => l.node));
  let last = '';
  function resize(w, h) {
    if (!(w > 0 && h > 0)) return;
    const key = `${Math.round(w)}x${Math.round(h)}`;
    if (key === last) return;
    last = key;
    art.setAttribute('viewBox', `0 0 ${w} ${h}`);
    paper.setAttribute('width', w);
    paper.setAttribute('height', h);
    for (const l of layers) l.layout(w, h);
  }
  return { art, resize };
}

/** 一行两句：上句和下句分成两截，中间留空。 */
function poemColumn(lines) {
  return h('div', { class: 'poem__col' }, ...lines.map((line) => h('span', { class: 'poem__phrase' }, line)));
}

function leftCard() {
  const { art, resize } = cardSvg(CARDS[0]);
  const root = h('div', {
    class: 'hero__card hero__card--left', role: 'group',
    'aria-label': '左卡，古诗十九首·行行重行行',
    style: `transform: rotate(${CARDS[0].turn}deg)`,
  },
  art,
  h('div', { class: 'hero__lift' },
    h('div', { class: 'poem' },
      ...POEM.columns.map((col) => poemColumn(col)),
      h('div', { class: 'poem__note' },
        ...POEM.note.map((line) => h('span', { class: 'poem__phrase' }, line)))),
    h('p', { class: 'hero__tag' }, COPY.tag.left)));
  return { root, resize };
}

/** 箭形在当前缩放下的半宽半高，旋转后的轴对齐包围盒。 */
function birdExtent(scale, rotDeg) {
  const rad = (rotDeg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  let halfW = 0;
  let halfH = 0;
  for (const [px, py] of ARROW_PTS) {
    halfW = Math.max(halfW, Math.abs((px * c - py * s) * scale));
    halfH = Math.max(halfH, Math.abs((px * s + py * c) * scale));
  }
  return { halfW, halfH };
}

/** 鸟 id 对上 rungs.json 的 n，再取 home-poem.json 里写好的那一档。 */
function levelText(ctx) {
  const poem = ctx?.data?.['home-poem']?.rungs ?? {};
  const byId = new Map((ctx?.data?.rungs ?? []).map((r) => [r.id, r]));
  return (id) => {
    const rung = byId.get(id);
    const entry = rung ? poem[String(rung.n)] : null;
    if (!entry || typeof entry.text !== 'string' || entry.text.trim() === '') return null;
    return { lang: entry.lang === 'en' ? 'en' : 'zh', text: entry.text };
  };
}

function rightCard(lookup) {
  const textFor = typeof lookup === 'function' ? lookup : () => null;
  const DOCK_AIM = 90;
  const CLICK_PX = 6;
  const card = CARDS[1];
  let shown = null;
  let size = { w: 1, h: 1 };
  let glideRaf = 0;
  let glideLast = 0;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const arrows = ARROWS.map((a) => {
    const hit = svg('g', { class: 'hero__arrow-hit' }, svg('use', { href: `#${ID.arrow}` }));
    const g = svg('g', {
      class: a.drag ? 'hero__arrow' : 'hero__arrow hero__arrow--still',
      'data-tone': a.tone,
      tabindex: '0',
      role: 'button',
      'aria-pressed': 'false',
      'aria-label': a.label,
    }, hit);
    g._place = a;
    g._hit = hit;
    g._fx = null;
    g._rot = a.rot;
    g._rotTo = a.rot;
    g._sc = a.s;
    g._scTo = a.s;
    g._x = 0;
    g._y = 0;
    g._big = false;
    g._spin = false;
    g._drag = false;
    g._pressed = false;
    g._suppress = false;
    return g;
  });

  const flock = svg('g', { class: 'hero__flock' }, ...arrows);

  const paintHit = (g) => {
    const press = g._pressed ? 0.92 : 1;
    g._hit.setAttribute('transform', `rotate(${g._rot.toFixed(2)}) scale(${(g._sc * press).toFixed(3)})`);
  };
  const paintPos = (g) => {
    g.setAttribute('transform', `translate(${g._x.toFixed(1)} ${g._y.toFixed(1)})`);
  };
  const baseK = () => Math.min(size.w, size.h) / 780;

  const pose = (g) => {
    if (g._place.drag === false || shown) return;
    g._scTo = g._place.s * baseK() * (g._big ? HOVER_SCALE : 1);
    if (!g._drag) g._rotTo = g._place.rot + (g._spin ? HOVER_TURN : 0);
    kickGlide();
  };

  const frame = (now) => {
    glideRaf = 0;
    const dt = glideLast ? Math.min(48, now - glideLast) : 16.7;
    glideLast = now;
    const alpha = motion.matches ? 1 : 1 - (0.85 ** (dt / 16.7));
    let again = false;
    for (const g of arrows) {
      if (g._fx == null) continue;
      const tx = g._fx * size.w;
      const ty = g._fy * size.h;
      const dx = tx - g._x;
      const dy = ty - g._y;
      const dr = g._rotTo - g._rot;
      const ds = g._scTo - g._sc;
      const settled = Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4 && Math.abs(dr) < 0.2 && Math.abs(ds) < 0.002;
      if (settled || motion.matches) {
        g._x = tx;
        g._y = ty;
        g._rot = g._rotTo;
        g._sc = g._scTo;
      } else {
        g._x += dx * alpha;
        g._y += dy * alpha;
        g._rot += dr * alpha;
        g._sc += ds * alpha;
        again = true;
      }
      paintHit(g);
      paintPos(g);
    }
    if (again) glideRaf = requestAnimationFrame(frame);
    else glideLast = 0;
  };
  const kickGlide = () => { if (!glideRaf) glideRaf = requestAnimationFrame(frame); };

  const moveBird = (g, x, y) => {
    const ext = birdExtent(g._sc, g._rot);
    const next = clampBird(x, y, ext.halfW, ext.halfH, size.w, size.h);
    g._x = next.x;
    g._y = next.y;
    g._fx = next.x / size.w;
    g._fy = next.y / size.h;
    paintPos(g);
  };

  const localPoint = (art, e) => {
    const pt = art.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = art.getScreenCTM();
    if (!m) return null;
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  const { art, resize } = cardSvg(card, [
    { node: flock, layout: (w, h) => layoutFlock(w, h) },
  ], false);

  const rewrite = h('p', { class: 'hero__rewrite', hidden: true, 'aria-live': 'polite' });
  const tag = h('p', { class: 'hero__tag' }, COPY.tag.right);
  const root = h('div', {
    class: 'hero__card hero__card--right', role: 'group',
    'aria-label': '右卡，箭形鸟群',
    style: `transform: rotate(${card.turn}deg)`,
  }, art, h('div', { class: 'hero__lift' }, rewrite, tag));

  function placeDockTargets() {
    const flockBirds = arrows.filter((g) => g._place.drag !== false);
    const mark = arrows.find((g) => g._place.drag === false);
    const k = baseK();
    const bigHalf = birdExtent(flockBirds.at(-1)._place.s * k, DOCK_AIM).halfH;
    const markHalf = birdExtent(mark._place.s * k, 0).halfH;
    const markY = (mark._fy ?? mark._place.fy) * size.h;
    const belowMark = markY + markHalf + bigHalf + 6;
    const tagBottom = tag.offsetHeight > 0 ? tag.offsetTop + tag.offsetHeight : size.h * 0.94;
    const belowTag = tagBottom + bigHalf;
    const rowY = Math.min(size.h - bigHalf - 2, Math.max(belowMark, belowTag));
    const startX = tag.offsetWidth > 0 ? tag.offsetLeft : size.w * 0.07;
    const endX = (mark._fx ?? mark._place.fx) * size.w;
    flockBirds.forEach((g, i) => {
      const t = flockBirds.length === 1 ? 0 : i / (flockBirds.length - 1);
      const ext = birdExtent(g._place.s * k, DOCK_AIM);
      const next = clampBird(startX + (endX - startX) * t, rowY, ext.halfW, ext.halfH, size.w, size.h);
      g._fx = next.x / size.w;
      g._fy = next.y / size.h;
      g._rotTo = DOCK_AIM;
      g._scTo = g._place.s * k;
    });
  }

  function showLevel(id) {
    const entry = textFor(id);
    if (!entry) return;
    const first = shown == null;
    shown = id;
    flock.classList.add('is-open');
    rewrite.hidden = false;
    rewrite.lang = entry.lang;
    rewrite.textContent = entry.text;
    for (const g of arrows) {
      g.setAttribute('aria-pressed', g._place.id === id ? 'true' : 'false');
      if (!first || g._place.drag === false) continue;
      g._spin = false;
      g._big = false;
      g._drag = false;
      g._dragArmed = false;
      g.classList.remove('is-dragging');
    }
    if (!first) return;
    placeDockTargets();
    kickGlide();
  }

  function closeLevel() {
    shown = null;
    flock.classList.remove('is-open');
    rewrite.hidden = true;
    rewrite.textContent = '';
    const k = baseK();
    for (const g of arrows) {
      g.setAttribute('aria-pressed', 'false');
      if (g._place.drag === false) continue;
      g._fx = g._place.fx;
      g._fy = g._place.fy;
      g._rotTo = g._place.rot;
      g._scTo = g._place.s * k;
      g._spin = false;
      g._big = false;
    }
    kickGlide();
  }

  function activate(g) {
    if (g._place.drag === false) {
      if (shown) closeLevel();
      return;
    }
    if (shown === g._place.id) closeLevel();
    else showLevel(g._place.id);
  }

  function layoutFlock(w, h) {
    size = { w, h };
    const k = baseK();
    if (shown) placeDockTargets();
    for (const g of arrows) {
      if (g._fx == null) {
        g._fx = g._place.fx;
        g._fy = g._place.fy;
        g._rot = g._place.rot;
        g._rotTo = g._place.rot;
        g._sc = g._place.s * k;
        g._scTo = g._sc;
      }
      const docked = shown && g._place.drag !== false;
      if (docked) {
        g._rotTo = DOCK_AIM;
        g._scTo = g._place.s * k;
      } else {
        g._scTo = g._place.drag === false ? g._place.s * k : g._place.s * k * (g._big ? HOVER_SCALE : 1);
        if (!g._drag && g._place.drag !== false) g._rotTo = g._place.rot + (g._spin ? HOVER_TURN : 0);
      }
      g._x = g._fx * w;
      g._y = g._fy * h;
      g._sc = g._scTo;
      g._rot = g._rotTo;
      paintHit(g);
      paintPos(g);
    }
  }

  const keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const canDrag = (g) => g._place.drag !== false && shown == null;
  const press = (g) => { g._pressed = true; paintHit(g); };
  const release = (g) => { if (!g._pressed) return; g._pressed = false; paintHit(g); };
  for (const g of arrows) {
    g.addEventListener('pointerenter', () => {
      if (!canDrag(g) || g._drag) return;
      g._big = true;
      if (!g._suppress) g._spin = true;
      pose(g);
    });
    g.addEventListener('pointerleave', () => {
      if (!canDrag(g) || g._drag) return;
      g._big = false;
      g._spin = false;
      g._suppress = false;
      pose(g);
    });
    g.addEventListener('focus', () => {
      if (!canDrag(g)) return;
      g._big = true;
      if (!g._suppress) g._spin = true;
      pose(g);
    });
    g.addEventListener('blur', () => {
      if (!canDrag(g)) return;
      g._big = g.matches(':hover');
      if (!g._big) {
        g._spin = false;
        g._suppress = false;
      }
      pose(g);
    });
    g.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      g._px = e.clientX;
      g._py = e.clientY;
      g._dragArmed = false;
      if (!canDrag(g)) {
        press(g);
        try { g.setPointerCapture(e.pointerId); } catch { /* 捕获失败时仍由 pointerup 弹回 */ }
        e.preventDefault();
        return;
      }
      const p = localPoint(art, e);
      if (!p) return;
      g._grabX = p.x - g._x;
      g._grabY = p.y - g._y;
      g._dragArmed = true;
      try { g.setPointerCapture(e.pointerId); } catch { /* 非可信事件时捕获会失败，拖动仍由本元素上的 pointermove 继续 */ }
      e.preventDefault();
    });
    g.addEventListener('pointermove', (e) => {
      if (g._dragArmed && !g._drag && Math.hypot(e.clientX - g._px, e.clientY - g._py) >= CLICK_PX) {
        g._drag = true;
        g.classList.add('is-dragging');
      }
      if (!g._drag) return;
      const p = localPoint(art, e);
      if (!p) return;
      moveBird(g, p.x - g._grabX, p.y - g._grabY);
    });
    const finish = (e, cancel) => {
      const moved = Math.hypot((e.clientX ?? g._px) - g._px, (e.clientY ?? g._py) - g._py);
      if (!canDrag(g)) {
        release(g);
        if (!cancel && moved < CLICK_PX) activate(g);
        return;
      }
      const wasDrag = g._drag;
      g._dragArmed = false;
      if (!wasDrag) {
        if (!cancel && moved < CLICK_PX) activate(g);
        return;
      }
      g._drag = false;
      g.classList.remove('is-dragging');
      g._spin = false;
      g._suppress = true;
      g._big = g.matches(':hover') || g.matches(':focus');
      pose(g);
    };
    g.addEventListener('pointerup', (e) => finish(e, false));
    g.addEventListener('pointercancel', (e) => finish(e, true));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!g._keyHold) { g._keyHold = true; press(g); }
        return;
      }
      if (!canDrag(g)) return;
      const d = keys[e.key];
      if (!d) return;
      e.preventDefault();
      moveBird(g, g._x + d[0] * size.w * 0.02, g._y + d[1] * size.h * 0.02);
    });
    g.addEventListener('keyup', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (!g._keyHold) return;
      g._keyHold = false;
      release(g);
      activate(g);
    });
  }

  return {
    root,
    resize,
    destroy() { if (glideRaf) cancelAnimationFrame(glideRaf); },
  };
}

function learnerMark() {
  return svg('svg', { class: 'hero__learner-svg', viewBox: '0 0 80 100', 'aria-hidden': 'true' },
    svg('circle', { cx: 40, cy: 16, r: 13 }),
    svg('path', { d: 'M22 40 H58 L68 96 H12 Z' }));
}

function soften(offset, limit) {
  if (!(limit > 0)) return 0;
  return limit * Math.tanh(offset / limit);
}

function center(hero) {
  const followEl = h('div', { class: 'hero__follow' });
  const learner = h('button', {
    type: 'button', class: 'hero__learner', 'aria-pressed': 'true',
    'aria-label': '学习者。单击停在原地，双击进入工作台',
  },
  learnerMark());
  followEl.append(learner);
  const enter = h('a', { class: 'hero__enter', href: '#/app', 'aria-label': '进入工作台' },
    h('span', { class: 'hero__enter-zh' }, COPY.enter),
    svg('svg', { class: 'hero__enter-arrow', viewBox: '0 0 16 10', 'aria-hidden': 'true' },
      svg('path', { d: 'M0 5 H12 M8 1 L14 5 L8 9', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.2 })));
  const mid = h('div', { class: 'hero__mid' }, followEl, enter);

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const narrow = window.matchMedia(`(max-width: ${NARROW_MAX}px)`);
  let on = true;
  let tx = 0;
  let ty = 0;
  let sx = 0;
  let sy = 0;
  let x = 0;
  let y = 0;
  let raf = 0;
  let last = 0;
  let limits = { x: 0, up: 0, down: 0 };

  const canFollow = () => on && !motion.matches && fine.matches && !narrow.matches;

  // 以未位移时的位置量边界：只在尺寸变化时量，不在指针事件里量，免得边量边动
  const measure = () => {
    const prev = followEl.style.transform;
    followEl.style.transform = 'none';
    const base = followEl.getBoundingClientRect();
    const box = mid.getBoundingClientRect();
    const btn = enter.getBoundingClientRect();
    followEl.style.transform = prev;
    limits = {
      x: Math.max(0, Math.min(base.left - box.left, box.right - base.right) - 8),
      up: Math.max(0, base.top - box.top - 8),
      down: Math.max(0, btn.top - base.bottom - 12),
    };
  };

  const paint = () => { followEl.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`; };
  const frame = (now) => {
    raf = 0;
    const dt = last ? Math.min(48, now - last) : 16.7;
    last = now;
    const alpha = 1 - ((1 - FOLLOW) ** (dt / 16.7));
    const dsx = tx - sx;
    const dsy = ty - sy;
    const dx = sx - x;
    const dy = sy - y;
    if (Math.hypot(dsx, dsy) < 0.1 && Math.hypot(dx, dy) < 0.1) {
      sx = tx;
      sy = ty;
      x = sx;
      y = sy;
      paint();
      last = 0;
      return;
    }
    sx += dsx * alpha;
    sy += dsy * alpha;
    x += (sx - x) * alpha;
    y += (sy - y) * alpha;
    paint();
    raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const home = () => { tx = 0; ty = 0; kick(); };

  const aim = (px, py) => {
    const box = mid.getBoundingClientRect();
    tx = soften((px - (box.left + box.width / 2)) * GAIN, limits.x);
    ty = soften((py - (box.top + box.height / 2)) * GAIN, limits.y);
  };

  mid.addEventListener('pointermove', (e) => {
    if (!canFollow() || enter.contains(e.target)) return;
    aim(e.clientX, e.clientY);
    kick();
  });
  mid.addEventListener('pointerleave', () => { if (canFollow()) home(); });
  learner.addEventListener('click', () => {
    on = !on;
    learner.setAttribute('aria-pressed', on ? 'true' : 'false');
    home();
  });
  learner.addEventListener('dblclick', () => { location.hash = '#/app'; });

  const settle = () => {
    hero.dataset.fit = narrow.matches ? 'narrow' : 'wide';
    if (!canFollow()) home();
    measure();
  };
  const offs = [motion, fine, narrow].map((mq) => {
    mq.addEventListener('change', settle);
    return () => mq.removeEventListener('change', settle);
  });
  return {
    mid,
    settle,
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      offs.forEach((off) => off());
    },
  };
}

export default {
  id: 'home-hero',
  mount(el, ctx) {
    const hero = h('section', { class: 'hero', 'aria-label': '首页主视觉' });
    const left = leftCard();
    const right = rightCard(levelText(ctx));
    const { mid, settle, destroy } = center(hero);
    const stage = h('div', { class: 'hero__stage' }, left.root, mid, right.root);
    const line = COPY.footer.left;
    const mark = line.endsWith('.') ? line.slice(-1) : '';
    const body = mark ? line.slice(0, -1) : line;
    const foot = h('footer', { class: 'hero__foot' },
      h('p', { class: 'hero__motto' }, body, mark ? h('span', { class: 'hero__motto-mark' }, mark) : null),
      h('p', { class: 'hero__sign' }, COPY.footer.right));
    hero.append(defsSvg(), h('p', { class: 'sr-only' }, COPY.alt), stage, foot);
    el.append(hero);

    let pending = 0;
    const layout = () => {
      pending = 0;
      left.resize(left.root.clientWidth, left.root.clientHeight);
      right.resize(right.root.clientWidth, right.root.clientHeight);
      settle();
    };
    const schedule = () => { if (!pending) pending = requestAnimationFrame(layout); };
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    if (ro) { ro.observe(left.root); ro.observe(right.root); ro.observe(mid); } else window.addEventListener('resize', schedule);
    schedule();

    return () => {
      if (pending) cancelAnimationFrame(pending);
      ro ? ro.disconnect() : window.removeEventListener('resize', schedule);
      right.destroy();
      destroy();
      el.replaceChildren();
    };
  },
};
