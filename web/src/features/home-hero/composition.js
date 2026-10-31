// 首页构图数据：所有坐标、颜色、seed 集中在这里，调构图只改这个文件。
// 坐标是 1600×1000 viewBox 里的百分比（技术文档 5.3 的起点值，已按原型实测调整：
// 左右靛蓝块不重叠，中间留出银河窄缝）。固定 seed → 刷新后构图不变。

export const VIEW = { w: 1600, h: 1000 };

/** 色块，按 z 从后到前。pct 是顶点（x%, y%），tone 是 CSS 变量名。 */
export const BLOCKS = [
  { id: 'indigo-left',  tone: '--indigo', textured: true,  seed: 11, step: 34, amp: 16,
    pct: [[-3, -3], [47, -3], [48.5, 31], [46.5, 62], [26, 64], [-3, 60]] },
  { id: 'indigo-right', tone: '--indigo', textured: true,  seed: 12, step: 34, amp: 16,
    pct: [[50.6, 4], [103, -3], [103, 56], [88, 59], [70, 57], [51.4, 58]] },
  { id: 'teal',         tone: '--teal',   textured: true,  seed: 13, step: 30, amp: 14,
    pct: [[34, 47], [88, 46], [87, 80], [60, 82], [34, 79]] },
  { id: 'cream',        tone: '--paper',  textured: true,  seed: 14, step: 30, amp: 14, bright: true,
    pct: [[-3, 56], [38, 55], [37, 103], [-3, 103]] },
  { id: 'ochre',        tone: '--ochre',  textured: false, seed: 15, step: 22, amp: 8,
    pct: [[86, 70], [103, 69], [103, 76], [87, 77]] },
];

/** 鹊桥：二次曲线，横跨两块靛蓝之间的窄缝（缝在 x≈48.5%–50.6%）。 */
export const BRIDGE = {
  from: [575, 250], ctrl: [793, 330], to: [1011, 250],   // 436 宽，两端离竖屏可见窗口边缘各留 ~40
  count: 14,                // 12–16 只
  size: { w: 40, h: 23 },   // 每只喜鹊的显示尺寸（viewBox 单位）；相邻间距约 34，略压叠、首尾相接
};

/** 桥中央的朱砂小灯 */
export const LAMP = { x: 793, y: 218, r: 9 };

/** 微场景：左下米白块边缘（人、杯、石头、喜鹊），整体占画面 2%–5% */
export const SCENE = { x: 150, y: 590, scale: 1 };

/** 文字层位置：左上靛蓝块内的标题组、节点序号、右缘竖排标签、入口、底部小字 */
export const TEXT = {
  numbersY: 430,   // 桥下方 01–04 的 y
  numbersX: [610, 700, 886, 976],    // 避开 x≈778–808 的窄缝，左右各两个，全部落在竖屏可见窗口内
};

/** 首页文案（待确认项见逻辑文档第 8 节，这里用文档给的默认值） */
export const COPY = {
  title: ['难懂的话，', '走成一座桥。'],
  subtitle: 'Meet the language halfway.',
  start: { zh: '开始', en: 'Start' },
  labels: ['改写', '没看懂', '降档', '结束'],
};
