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

/** 矩形撕纸边，返回 CSS clip-path: polygon(...) 字符串（百分比，随容器缩放）。 */
export function tornEdge(w, h, o = {}) {
  const pts = tornPolygon([[0, 0], [w, 0], [w, h], [0, h]], o);
  return toClipPath(pts, w, h);
}

/** 点列 → clip-path: polygon(...)，坐标换算成相对 w×h 的百分比。 */
export function toClipPath(points, w, h) {
  const body = points
    .map(([x, y]) => `${(x / w * 100).toFixed(2)}% ${(y / h * 100).toFixed(2)}%`)
    .join(',');
  return `polygon(${body})`;
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

/**
 * n 个落在 (0,1) 的参数，向 0.5 聚密，关于 0.5 对称。
 * power 越大，中间越密。
 */
export function clusteredParams(n, power = 2) {
  if (!Number.isInteger(n) || n < 1) throw new Error('clusteredParams: n 至少为 1');
  if (!(power > 0)) throw new Error('clusteredParams: power 须为正');
  return Array.from({ length: n }, (_, i) => {
    const s = (i + 0.5) / n;
    const d = (s - 0.5) * 2;
    const shaped = Math.sign(d) * Math.abs(d) ** power;
    return 0.5 + shaped / 2;
  });
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
