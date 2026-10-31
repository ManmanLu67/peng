// 鹊桥节点条：两块靛蓝撕纸 + 一条贯穿线 + 4 个节点（4 只喜鹊）+ 小灯。
// 节点序号、标签、数量都读 data/nodes.json；状态读 store.nodes（由 commands 按 paths 点亮）。
// 动画只动 opacity / transform；减少动态效果由 base.css 全局归零。
// P1 预留：节点详情弹窗（点击节点 → 输入 / 输出 / 耗时）在 bindNode 里接入；
//         首页墨渍渐显的 mask 版本不在这里做。
import { h, svg, ensureSymbols } from '../../ui/index.js';
import { tornPolygon, toPathD } from '../../core/geometry.js';

const W = 1000;          // viewBox 宽
const H = 200;           // viewBox 高
const GAP = 10;          // 两块纸之间的窄缝
const LEFT_EDGE = 490;   // 左纸右缘 x
const RIGHT_EDGE = 490 + GAP;   // 右纸左缘 x

// 两块纸的大轮廓（手写顶点，再沿边加扰动；固定 seed，刷新不变）
const LEFT = [[20, 40], [120, 14], [470, 22], [490, 36], [486, 168], [440, 186], [110, 176], [20, 150]];
const RIGHT = LEFT.map(([x, y]) => [x + 490 + GAP, y]).map(([x, y], i) => [Math.min(x, W - 12), y + (i % 3) * 2]);

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
    ensureSymbols();          // 喜鹊 <use href="#magpie"> 依赖共用 symbol，没注入就是空白
    const nodes = data.nodes.nodes;
    const n = nodes.length;
    // 节点沿线等分，避开两块纸的缝（缝在 x=500 附近）
    const xs = nodes.map((_, i) => 120 + ((W - 240) * i) / Math.max(1, n - 1));
    const LINE_Y = 100;

    const paper = (pts, seed) => svg('path', {
      class: 'brg__paper',
      d: toPathD(tornPolygon(pts, { step: 22, amp: 5, seed })),
    });

    const lis = [];
    const g = svg('g', { class: 'brg__nodes' });
    nodes.forEach((node, i) => {
      const x = xs[i];
      const last = i === n - 1;
      const bird = svg('svg', { class: 'brg__bird', x: x - 22, y: LINE_Y - 62, width: 44, height: 26, viewBox: '0 0 48 28', 'aria-hidden': 'true' },
        svg('g', last ? { transform: 'translate(48 0) scale(-1 1) rotate(-14 24 14)' } : null,
          svg('use', { href: '#magpie' })));
      const dot = svg('circle', { class: 'brg__dot', cx: x, cy: LINE_Y, r: 7 });
      const halo = svg('circle', { class: 'brg__halo', cx: x, cy: LINE_Y, r: 15 });
      const cross = svg('path', { class: 'brg__cross', d: `M${x - 5} ${LINE_Y - 5}L${x + 5} ${LINE_Y + 5}M${x + 5} ${LINE_Y - 5}L${x - 5} ${LINE_Y + 5}` });
      const no = svg('text', { class: 'brg__no', x, y: LINE_Y + 30, 'text-anchor': 'middle' }, node.no);
      const label = svg('text', { class: 'brg__label', x, y: LINE_Y + 50, 'text-anchor': 'middle' }, node.label.en);
      const zh = svg('text', { class: 'brg__zh', x, y: LINE_Y + 68, 'text-anchor': 'middle' }, node.label.zh);
      const grp = svg('g', { class: 'brg__node', 'data-node': node.id, 'data-state': 'idle' }, halo, bird, dot, cross, no, label, zh);
      g.append(grp);
      lis.push({ node, grp });
    });

    // 小灯：桥中央，看懂（最后一个节点完成）后亮起
    const lamp = svg('g', { class: 'brg__lamp', transform: `translate(${W / 2} ${LINE_Y - 44})`, 'aria-hidden': 'true' },
      svg('circle', { class: 'brg__lamp-glow', r: 16 }), svg('circle', { class: 'brg__lamp-core', r: 5 }));

    // 流程线：节点之间各一段，随两端节点状态变化（走过的亮、没走的暗）。
    // 两块纸之间的缝里线色会和页面底色相同而消失，所以在缝处另画一小段朱砂桥板。
    const segs = [];
    for (let i = 0; i < n - 1; i += 1) {
      const seg = svg('line', { class: 'brg__seg', x1: xs[i], y1: LINE_Y, x2: xs[i + 1], y2: LINE_Y, 'data-from': nodes[i].id, 'data-to': nodes[i + 1].id });
      segs.push({ seg, from: nodes[i].id, to: nodes[i + 1].id });
    }
    const plank = svg('line', { class: 'brg__plank', x1: LEFT_EDGE - 6, y1: LINE_Y, x2: RIGHT_EDGE + 6, y2: LINE_Y });
    const lines = svg('g', { class: 'brg__lines' }, ...segs.map((x) => x.seg), plank);

    const board = svg('svg', { class: 'brg__svg', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', role: 'img',
      'aria-label': '鹊桥：改写、没看懂、降档、结束四个步骤 · Magpie bridge: four workflow steps' },
    paper(LEFT, 11), paper(RIGHT, 12),
    lines, g, lamp);

    // 读屏友好的步骤列表（视觉隐藏）：“步骤 2：没看懂，执行中”
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
        if (st === 'running') grp.setAttribute('aria-current', 'step'); else grp.removeAttribute('aria-current');
        const li = sr.children[i];
        li.textContent = `步骤 ${i + 1}：${node.label.zh}，${STATE_TEXT[st] ?? st}`;
      });
      // 线段：两端都已完成 = 走过（亮）；前一端完成、后一端执行中 = 正在走（朱砂）；否则暗
      segs.forEach(({ seg, from, to }) => {
        const a = s.nodes[from]; const b = s.nodes[to];
        let st = 'idle';
        if (a === 'done' && (b === 'done' || b === 'skipped')) st = 'done';
        else if (a === 'done' && b === 'running') st = 'running';
        else if (a === 'error' || b === 'error') st = 'error';
        seg.dataset.state = st;
      });
      plank.dataset.state = s.nodes[nodes[1]?.id] === 'idle' ? 'idle' : 'on';
      lamp.classList.toggle('is-lit', done);
      // 模拟回放：没有真实 trace 时标注（SCOPE：清楚区分模拟与真实）
      const showTag = s.status !== 'idle' && s.traceSimulated !== false && s.messages.length > 0;
      tag.textContent = showTag ? '模拟回放 · Simulated replay' : '';
      text.textContent = done ? '读懂了 · Understood' : '';
      text.classList.toggle('is-on', done);
    }

    render(store.get());
    const off = store.subscribe((s) => ({ n: s.nodes, u: s.understood, st: s.status, t: s.traceSimulated, m: s.messages.length }), () => render(store.get()));
    return () => { off(); el.replaceChildren(); };
  },
};
