// 鹊桥节点条：宣纸底上一条下垂赭石弧线、4 个固定月相。
// 鸟是原来那 4 只共用喜鹊，每颗月相上方一只；末只镜像仰头。没有月间鸟群。
// 序号和标签读 data/nodes.json。状态只改颜色，不改月相形状。
// P1 预留：节点详情弹窗（点击节点 → 输入 / 输出 / 耗时）在 bindNode 里接入。
import { h, svg, ensureSymbols } from '../../ui/index.js';
import { quadCurveAt, moonPhasePath } from '../../core/geometry.js';

const P0 = [36, 64];
const C = [500, 188];
const P1 = [964, 64];
const MOON_T = [0.1, 0.3667, 0.6333, 0.9];
const MOON_F = [0.2, 0.46, 0.72, 1];
const MOON_R = 18;
const LABEL_Y = 176;
const VB = `0 0 1000 220`;

const STATE_TEXT = {
  idle: '未执行',
  running: '执行中',
  done: '已完成',
  skipped: '已跳过',
  error: '出错',
};

export default {
  id: 'bridge',
  mount(el, ctx) {
    const { store, data } = ctx;
    ensureSymbols();
    const nodes = data.nodes.nodes;
    const moons = MOON_T.map((t) => quadCurveAt(P0, C, P1, t));

    const arc = svg('path', {
      class: 'brg__arc',
      d: `M${P0[0]} ${P0[1]} Q${C[0]} ${C[1]} ${P1[0]} ${P1[1]}`,
      fill: 'none',
    });

    const lis = [];
    const g = svg('g', { class: 'brg__nodes' });
    nodes.forEach((node, i) => {
      const pt = moons[i];
      const f = MOON_F[i];
      const last = i === nodes.length - 1;
      const grp = svg('g', {
        class: 'brg__node',
        'data-node': node.id,
        'data-state': 'idle',
        'data-f': String(f),
        transform: `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`,
      });
      const ly = LABEL_Y - pt.y;
      grp.append(
        svg('circle', { class: 'brg__halo', r: MOON_R + 8 }),
        svg('circle', { class: 'brg__disk', r: MOON_R }),
        svg('circle', { class: 'brg__ring', r: MOON_R }),
        svg('path', { class: 'brg__moon-lit', d: moonPhasePath(MOON_R, f) }),
        svg('path', { class: 'brg__cross', d: 'M-5 -5 L5 5 M5 -5 L-5 5' }),
        svg('svg', {
          class: 'brg__bird',
          x: -22,
          y: -MOON_R - 30,
          width: 44,
          height: 26,
          viewBox: '0 0 48 28',
          'aria-hidden': 'true',
        }, svg('g', last ? { transform: 'translate(48 0) scale(-1 1) rotate(-14 24 14)' } : null,
          svg('use', { href: '#magpie' }))),
        svg('text', { class: 'brg__no', y: ly.toFixed(1), 'text-anchor': 'middle' }, node.no),
        svg('text', { class: 'brg__label', y: (ly + 16).toFixed(1), 'text-anchor': 'middle' }, node.label.en),
        svg('text', { class: 'brg__zh', y: (ly + 32).toFixed(1), 'text-anchor': 'middle' }, node.label.zh),
      );
      g.append(grp);
      lis.push({ node, grp });
    });

    const board = svg('svg', {
      class: 'brg__svg',
      viewBox: VB,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img',
      'aria-label': '鹊桥：改写、没看懂、降档、结束四个步骤 · Magpie bridge: four workflow steps',
    }, arc, g);

    const sr = h('ol', { class: 'sr-only', 'aria-label': '处理步骤 · Steps' },
      ...nodes.map((node, i) => h('li', { 'data-node': node.id }, `步骤 ${i + 1}：${node.label.zh}`)));
    const tag = h('p', { class: 'brg__tag label', role: 'status', 'aria-live': 'polite' });
    const text = h('p', { class: 'brg__result', role: 'status', 'aria-live': 'polite' });

    el.append(h('section', { class: 'brg', 'aria-label': '工作流节点 · Workflow' },
      h('div', { class: 'brg__scroll' }, board), sr, tag, text));

    function render(s) {
      const done = s.understood || (s.nodes[nodes.at(-1).id] === 'done');
      lis.forEach(({ node, grp }, i) => {
        const st = s.nodes[node.id] ?? 'idle';
        grp.dataset.state = st;
        if (st === 'running') grp.setAttribute('aria-current', 'step');
        else grp.removeAttribute('aria-current');
        sr.children[i].textContent = `步骤 ${i + 1}：${node.label.zh}，${STATE_TEXT[st] ?? st}`;
      });
      tag.textContent = '';
      text.textContent = done ? '读懂了 · Understood' : '';
      text.classList.toggle('is-on', done);
    }

    render(store.get());
    const off = store.subscribe(
      (s) => ({ n: s.nodes, u: s.understood, st: s.status, t: s.traceSimulated, m: s.messages.length }),
      () => render(store.get()),
    );
    return () => { off(); el.replaceChildren(); };
  },
};
