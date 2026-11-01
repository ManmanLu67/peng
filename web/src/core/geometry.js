// 撕纸边几何：纯函数，固定 seed → 同输入同输出（刷新后构图不变）。
// 首页色块（clip-path）与工作台鹊桥节点条（SVG path）共用。

/** 可复现的伪随机，返回 [0,1) */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 沿一个多边形（顶点按顺序，自动闭合）的每条边每隔 step 取一点并加随机扰动，
 * 得到大形不规则、边缘细碎的撕纸轮廓。
 * @param {[number, number][]} vertices
 * @param {{ step?: number, amp?: number, seed?: number }} [o]
 * @returns {[number, number][]}
 */
export function tornPolygon(vertices, { step = 18, amp = 6, seed = 1 } = {}) {
  if (!Array.isArray(vertices) || vertices.length < 3) throw new Error('tornPolygon: 至少需要 3 个顶点');
  const rnd = mulberry32(seed);
  const pts = [];
  for (let i = 0; i < vertices.length; i++) {
    const [x0, y0] = vertices[i];
    const [x1, y1] = vertices[(i + 1) % vertices.length];
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      pts.push([
        x0 + (x1 - x0) * t + (rnd() - 0.5) * amp,
        y0 + (y1 - y0) * t + (rnd() - 0.5) * amp,
      ]);
    }
  }
  return pts;
}

/** 点列 → SVG path 的 d（闭合）。 */
export function toPathD(points) {
  return `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
}

/** 百分比顶点 → viewBox 坐标。pct 的每个点是 [x%, y%]。 */
export function scalePoints(pct, w, h) {
  return pct.map(([x, y]) => [(x * w) / 100, (y * h) / 100]);
}

/**
 * 沿二次贝塞尔曲线 p0 → p1（控制点 c）取 n 个等参数点，并给出每点切线方向的角度（度）。
 * 首页的鹊桥用它排 12–16 只喜鹊：曲线下垂，两端喜鹊略微俯仰，中间水平。
 * @returns {{ x: number, y: number, angle: number }[]}
 */
export function quadCurveAt(p0, c, p1, t) {
  if (!(t >= 0 && t <= 1)) throw new Error('quadCurveAt: t 在 0–1');
  const u = 1 - t;
  const x = u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0];
  const y = u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1];
  const dx = 2 * u * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0]);
  const dy = 2 * u * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1]);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

export function quadCurvePoints(p0, c, p1, n) {
  if (!Number.isInteger(n) || n < 2) throw new Error('quadCurvePoints: n 至少为 2');
  return Array.from({ length: n }, (_, i) => quadCurveAt(p0, c, p1, i / (n - 1)));
}

function fmt(n) {
  const v = Math.abs(n) < 1e-9 ? 0 : n;
  return String(Math.round(v * 1000) / 1000);
}

/**
 * 月相亮面，圆心在原点，半径 r。f 为照亮比例：0 新月、0.5 上弦、1 满月。
 * 亮面在右侧（蛾眉 → 上弦 → 凸月 → 满月），形状只由 f 决定。
 * @returns {string} SVG path d
 */
export function moonPhasePath(r, f) {
  if (!(r > 0) || !(f >= 0 && f <= 1)) throw new Error('moonPhasePath: r>0 且 f 在 0–1');
  if (f === 0) return '';
  const rx = r * Math.cos(Math.PI * f);
  const sweep = rx >= 0 ? 0 : 1;
  const R = fmt(r);
  // 右缘：上 → 下；明暗界：下 → 上。f≤0.5 界线留在右侧（蛾眉/上弦），f>0.5 界线绕到左侧（凸月/满月）。
  return `M0 ${fmt(-r)} A${R} ${R} 0 0 1 0 ${R} A${fmt(Math.abs(rx))} ${R} 0 0 ${sweep} 0 ${fmt(-r)}Z`;
}

// ---------- 地层带（首页的拱与山体共用）----------
// 拱与两侧山体都由 ribbon() 生成，边缘语言一致：同样的锯齿间距、同样的低频起伏。

/**
 * Catmull-Rom 样条：把控制点平滑成折线（曲线经过每个控制点），每段取 per 个点。
 * @param {[number, number][]} pts
 * @returns {[number, number][]}
 */
export function catmullRom(pts, per = 10) {
  if (!Array.isArray(pts) || pts.length < 2) throw new Error('catmullRom: 至少需要 2 个控制点');
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([0, 1].map((d) => 0.5 * (
        2 * p1[d] + (-p0[d] + p2[d]) * t
        + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2
        + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** 按弧长重采样：相邻点间距约 step（首尾点保留）。 */
export function resample(pts, step) {
  if (!(step > 0)) throw new Error('resample: step 必须大于 0');
  const out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    let seg = Math.hypot(x1 - x0, y1 - y0);
    while (acc + seg >= step) {
      const r = (step - acc) / seg;
      x0 += (x1 - x0) * r;
      y0 += (y1 - y0) * r;
      out.push([x0, y0]);
      seg = Math.hypot(x1 - x0, y1 - y0);
      acc = 0;
    }
    acc += seg;
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function smoothstep(x) {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

/**
 * 地层带：沿控制点连成的路径取法线偏移，得到一条宽窄有变化、可在画内尖灭的带子（闭合点列）。
 * 法线朝 (-dy, dx)，即沿路径前进时的右手侧（svg 里 y 向下）。
 * @param {[number, number][]} ctrl  路径控制点
 * @param {object} o
 * @param {[number, number]} o.a     上沿相对路径的法向偏移 [起, 止]
 * @param {[number, number]} o.b     下沿相对路径的法向偏移 [起, 止]
 * @param {number} [o.t0]            带子占路径的起点（0–1）
 * @param {number} [o.t1]            带子占路径的终点（0–1）
 * @param {[boolean, boolean]} [o.pinch] 起 / 止端是否收尖
 * @param {number} [o.wob]           边缘低频起伏的幅度（像素）
 * @param {number} [o.seed]
 * @param {number} [o.gap]           采样间距（像素），决定边缘锯齿的疏密
 * @returns {[number, number][]}
 */
export function ribbon(ctrl, { a, b, t0 = 0, t1 = 1, pinch = [false, false], wob = 14, seed = 1, gap = 56 } = {}) {
  if (!Array.isArray(a) || !Array.isArray(b)) throw new Error('ribbon: 需要 a 和 b（各为 [起, 止]）');
  if (!(t0 >= 0 && t1 <= 1 && t0 < t1)) throw new Error('ribbon: t0 < t1，且都在 0–1');
  const P = resample(catmullRom(ctrl, 10), gap);
  const n = P.length;
  const rnd = mulberry32(seed);
  const ph = [0, 1, 2, 3].map(() => rnd() * Math.PI * 2);
  const f1 = 24 + rnd() * 8;
  const f2 = 46 + rnd() * 12;
  const top = [];
  const bot = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    if (t < t0 || t > t1) continue;
    const u = (t - t0) / (t1 - t0);
    const p = P[i];
    const q = P[Math.min(n - 1, i + 1)];
    const o = P[Math.max(0, i - 1)];
    const dx = q[0] - o[0];
    const dy = q[1] - o[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    // 先按端点收尖算出宽度，再加起伏。起伏同样乘 k：尖灭处两条边的相位不同，
    // 若起伏不跟着收，两条边会交叉成细针。收尖到 8% 为止，不收成一个点。
    const k = 0.08 + 0.92
      * (pinch[0] ? smoothstep(u / 0.3) : 1)
      * (pinch[1] ? smoothstep((1 - u) / 0.3) : 1);
    const A0 = a[0] + (a[1] - a[0]) * u;
    const B0 = b[0] + (b[1] - b[0]) * u;
    const mid = (A0 + B0) / 2;
    const half = ((B0 - A0) / 2) * k;
    const wa = wob * k * (Math.sin(t * f1 + ph[0]) * 0.6 + Math.sin(t * f2 + ph[1]) * 0.4);
    const wb = wob * k * (Math.sin(t * f1 + ph[2]) * 0.6 + Math.sin(t * f2 + ph[3]) * 0.4);
    const A = mid - half + wa;
    const B = mid + half + wb;
    top.push([p[0] + nx * A, p[1] + ny * A]);
    bot.push([p[0] + nx * B, p[1] + ny * B]);
  }
  if (top.length < 2) throw new Error('ribbon: 取到的路径太短，放大 t1 - t0 或减小 gap');
  return top.concat(bot.reverse());
}
