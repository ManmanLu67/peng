// 首页构图数据（v2）：所有坐标、seed、文案集中在这里，调构图只改这个文件。
// 主参考 reference/主视觉.jpg：左下行人仰望，鸟群沿拱形地层相向飞向拱顶，右侧地层攀向右上。
// 坐标是 2000×1116 viewBox 里的像素。固定 seed → 刷新后构图不变。
// v1（鹊桥 + 靛蓝大色块）已封存：docs/archive/home-v1/，git tag home-v1。
import { ribbon } from '../../core/geometry.js';

export const VIEW = { w: 2000, h: 1116 };

/** 竖屏（≤720px）：只取 x 0–NARROW.w，底对齐，保留行人 + 拱的左半 + 左岸鸟群。 */
export const NARROW = { w: 1100, minH: 700 };

// 拱线：左脚在画外下方，过拱顶，右半继续下行并伸出画外右缘（右半比左半平缓，不对称）。
const ARCH = [[380, 1190], [500, 930], [650, 772], [850, 655], [1060, 592], [1260, 572],
  [1460, 602], [1680, 682], [1900, 778], [2160, 890]];
// 右侧山脊：起点就在拱顶的线上（与 ARCH 的 [1260, 572] 重合），先贴着拱的外沿走一小段，再抬升到右上角、伸出画外。
// 这样右山体的各条带子不是悬空的“手指”，而是从拱顶长出来的同一套地层。
const RIDGE = [[1260, 572], [1400, 556], [1540, 484], [1660, 372], [1780, 252], [1900, 132], [2030, 10], [2130, -70]];

const arch = (o) => ribbon(ARCH, { gap: 64, ...o });
const ridge = (o) => ribbon(RIDGE, { gap: 56, ...o });

/**
 * 纸块，按 z 从后到前分组：far 远景山 → strata 中景地层带（左坡 + 拱）→ right 右侧山体 → fore 前景坡。
 * tone 是 CSS 色值；tex 是否上纸张滤镜；wash:false 不加水彩晕染；bright 是压在底纸上的米白穿插块。
 * 插画补色（--charcoal 等）在 paper.css 的 .hero 里局部声明，不进全局 token。
 */
export const LAYERS = {
  far: [
    { id: 'rust-hill', tone: 'var(--rust)', seed: 11, step: 30, amp: 14, tex: true,
      pts: [[40, 492], [260, 484], [410, 494], [455, 560], [600, 615], [700, 650], [430, 722], [40, 566]] },
  ],
  strata: [
    { id: 'l-charcoal', tone: 'var(--charcoal)', seed: 21, step: 34, amp: 16, tex: true,
      pts: [[-60, 555], [250, 610], [470, 690], [360, 760], [-60, 790]] },
    { id: 'l-sand', tone: 'var(--sand)', seed: 22, step: 30, amp: 14, tex: true,
      pts: [[-60, 870], [240, 845], [420, 730], [560, 700], [650, 820], [560, 945], [380, 1030], [-60, 1030]] },
    { id: 'l-graphite', tone: 'var(--graphite)', seed: 23, step: 34, amp: 16, tex: true,
      pts: [[-60, 776], [330, 768], [440, 880], [210, 965], [-60, 935]] },
    { id: 'l-slate', tone: 'var(--slate)', seed: 24, step: 26, amp: 12, tex: true,
      pts: [[545, 800], [655, 700], [730, 745], [690, 880], [600, 935]] },
    { id: 'l-tan', tone: 'var(--tan)', seed: 25, step: 26, amp: 10, tex: true,
      pts: [[470, 945], [545, 845], [625, 1000], [520, 1010]] },
    // 拱：由外到内。外层长、宽、伸出画外；内层短，起止错开，在画内尖灭，像地层透镜。
    { id: 'a-sand', tone: 'var(--sand)', seed: 31, step: 30, amp: 12, tex: true,
      pts: arch({ a: [-10, -4], b: [150, 96], wob: 20, seed: 31 }) },
    { id: 'a-graphite', tone: 'var(--graphite)', seed: 32, step: 30, amp: 12, tex: true,
      pts: arch({ a: [2, 6], b: [84, 50], t0: 0.02, t1: 0.98, pinch: [true, false], wob: 18, seed: 32 }) },
    { id: 'a-seam', tone: 'var(--paper)', seed: 33, step: 28, amp: 8, tex: true, bright: true,
      pts: arch({ a: [64, 52], b: [88, 70], t0: 0.12, t1: 0.86, pinch: [true, true], wob: 10, seed: 33 }) },
    { id: 'a-indigo', tone: 'var(--indigo)', seed: 34, step: 28, amp: 12, tex: true,
      pts: arch({ a: [78, 64], b: [158, 126], t0: 0.1, t1: 0.9, pinch: [true, true], wob: 22, seed: 34 }) },
    // 主视觉.jpg 的拱带靛蓝偏灰蓝，用 --teal 在靛蓝内侧收一道，冷色仍然克制
    { id: 'a-teal', tone: 'var(--teal)', seed: 37, step: 28, amp: 10, tex: true, wash: false,
      pts: arch({ a: [122, 108], b: [158, 134], t0: 0.18, t1: 0.7, pinch: [true, true], wob: 10, seed: 37 }) },
    { id: 'a-tan', tone: 'var(--tan)', seed: 35, step: 28, amp: 12, tex: true,
      pts: arch({ a: [140, 120], b: [236, 168], t0: 0.04, t1: 0.82, pinch: [true, true], wob: 22, seed: 35 }) },
    { id: 'a-ochre', tone: 'var(--ochre)', seed: 36, step: 28, amp: 10, tex: false,
      pts: arch({ a: [190, 164], b: [236, 188], t0: 0.04, t1: 0.72, pinch: [true, true], wob: 12, seed: 36 }) },
  ],
  right: [
    // 右山体：从拱顶长出的几条地层带，攀向右上，与拱同一个 ribbon()。
    // 在 index.js 里先于拱绘制：拱的外层压住这些带子的起端，所以看起来是从拱后面长出来的。
    // 法线朝右手侧（沿路径向右上走时指向右下）：负偏移在天空一侧，正偏移在地面一侧。
    // 起点处所有带子的偏移都接近 0（贴着拱的外沿），向右上才逐渐张开。
    // 由天空到地面依次是 沙 → 赭 → 石墨 → 靛蓝 → 炭灰 → 深灰。
    { id: 'r-sand', tone: 'var(--sand)', seed: 12, step: 34, amp: 16, tex: true,
      pts: ridge({ a: [-50, -250], b: [-6, -110], pinch: [true, false], wob: 18, seed: 12 }) },
    { id: 'r-rust', tone: 'var(--rust)', seed: 14, step: 30, amp: 14, tex: true,
      pts: ridge({ a: [-30, -130], b: [0, -20], t0: 0.04, t1: 0.9, pinch: [true, true], wob: 14, seed: 14 }) },
    { id: 'r-graphite', tone: 'var(--graphite)', seed: 13, step: 32, amp: 14, tex: true,
      pts: ridge({ a: [-14, -30], b: [20, 80], t0: 0.02, pinch: [true, false], wob: 14, seed: 13 }) },
    { id: 'r-indigo', tone: 'var(--indigo)', seed: 15, step: 28, amp: 12, tex: true,
      pts: ridge({ a: [4, 40], b: [40, 150], t0: 0.1, t1: 0.96, pinch: [true, true], wob: 12, seed: 15 }) },
    { id: 'r-charcoal', tone: 'var(--charcoal)', seed: 16, step: 34, amp: 14, tex: true,
      pts: ridge({ a: [20, 120], b: [90, 250], t0: 0.12, pinch: [true, false], wob: 18, seed: 16 }) },
    { id: 'r-dark', tone: 'var(--soot)', seed: 17, step: 34, amp: 14, tex: true,
      pts: ridge({ a: [60, 220], b: [160, 420], t0: 0.2, pinch: [true, false], wob: 22, seed: 17 }) },
  ],
  fore: [
    // 前景暗坡：人物脚下。不用纯黑，纯黑只留给鸟、头发、裤子。
    { id: 'fg-1', tone: 'var(--soot)', seed: 41, step: 34, amp: 14, tex: true,
      pts: [[-60, 950], [170, 1000], [300, 1015], [520, 1070], [700, 1140], [-60, 1140]] },
    { id: 'fg-2', tone: 'var(--soot-deep)', seed: 42, step: 34, amp: 12, tex: true,
      pts: [[-60, 1062], [150, 1052], [300, 1080], [440, 1140], [-60, 1140]] },
  ],
};

/**
 * 鸟群，共 49 只，相向而飞：行人一侧朝右（r），右侧山体一侧朝左（l），沿拱线抬升，在拱顶相会。
 * [形态, 朝向, x, y, 爬升角°（沿飞行方向，正 = 机头朝上）, 缩放, 不透明度]
 * 节奏：左侧少而大 → 拱顶密 → 右上散开。拱顶 x≈1230–1300 留一道窄缝，两股鸟不重叠、不相撞。
 * 三种形态：spread 展翅 / glide 滑翔 / far 远处小鸟。
 */
export const FLOCK = [
  // 左岸 · 行人上方，少而大，舒展
  ['spread', 'r', 340, 360, 14, 1.1], ['glide', 'r', 520, 410, 4, .8], ['spread', 'r', 800, 515, 18, 1.25],
  ['far', 'r', 575, 515, 0, .55, .55], ['far', 'r', 670, 487, 6, .45, .5], ['glide', 'r', 480, 805, 6, .7, .55],
  // 左岸 · 坡上起飞
  ['glide', 'r', 425, 712, 22, .85], ['spread', 'r', 650, 708, 8, .8], ['glide', 'r', 725, 650, 14, .7],
  ['glide', 'r', 750, 700, 24, .65], ['glide', 'r', 585, 738, 4, .7], ['far', 'r', 728, 748, 0, .6, .8],
  ['far', 'r', 565, 792, 14, .6], ['far', 'r', 640, 770, 2, .5], ['spread', 'r', 838, 688, 6, .6],
  // 拱顶左半 · 密。相邻两只错开高度、间距 ≥ 一个身长，尾巴不首尾相连成链
  ['spread', 'r', 872, 596, 8, .66], ['glide', 'r', 940, 612, 8, .62], ['glide', 'r', 1000, 566, 6, .64],
  ['glide', 'r', 1062, 580, 4, .62], ['spread', 'r', 1112, 536, 2, .64], ['glide', 'r', 1170, 552, 3, .62],
  ['far', 'r', 1215, 516, 2, .5],
  // 拱顶右半 · 密（朝左）
  ['far', 'l', 1318, 514, 2, .5], ['glide', 'l', 1362, 548, 2, .62], ['spread', 'l', 1415, 524, 2, .64],
  ['glide', 'l', 1472, 570, 6, .62], ['glide', 'l', 1530, 596, 8, .6], ['spread', 'l', 1578, 636, 10, .6],
  ['far', 'l', 1625, 660, 6, .5, .8], ['glide', 'l', 1668, 690, 10, .56],
  // 拱顶上方 · 一大一小相向，是相会的中心
  ['spread', 'r', 1160, 455, 10, .95], ['spread', 'l', 1395, 415, 12, 1.2],
  // 右岸 · 山体上，朝拱顶下压的曲线
  ['glide', 'l', 1545, 470, 14, .85], ['spread', 'l', 1610, 505, 10, .72], ['glide', 'l', 1668, 470, 16, .72],
  ['glide', 'l', 1722, 452, 12, .7], ['spread', 'l', 1700, 370, 18, .62], ['glide', 'l', 1778, 352, 20, .66],
  ['glide', 'l', 1805, 408, 24, .6], ['far', 'l', 1525, 585, 4, .58],
  // 右上 · 散开
  ['spread', 'l', 1442, 242, 10, .95], ['glide', 'r', 1302, 197, 14, .72], ['glide', 'l', 1527, 297, 12, .68],
  ['glide', 'l', 1607, 327, 18, .7], ['far', 'l', 1577, 140, 10, .5, .75], ['far', 'l', 1745, 134, 8, .42, .85],
  ['far', 'l', 1665, 58, 6, .38, .75], ['far', 'r', 1230, 330, 10, .4, .7], ['far', 'r', 980, 430, 14, .5, .7],
];

/** 飘散的小黑点（右上象限，x ≥ 1250 且 y ≤ 480，不进拱顶和人物区）：[cx, cy, r] */
export const SPECKS = [[1650, 308, 4], [1745, 360, 3], [1345, 333, 3], [1480, 268, 3.5], [1595, 170, 2.5],
  [1325, 266, 2], [1290, 405, 2], [1410, 340, 2], [1530, 205, 2.5], [1700, 250, 2]];

/** 三颗淡星：[x, y, 大小系数, 动画延迟 s]。延迟错开，减少动态效果时由 CSS 关闭。 */
export const STARS = [[1452, 128, 1, 0], [1567, 229, 1, -1.3], [1338, 168, 0.6, -2.6]];

/** 行人：左下暗坡上，约 x 185–235。 */
export const SCENE = { x: 205, y: 905 };

/**
 * 文字框，viewBox 坐标：左缘 x、宽度 w、底边 bottom。放在拱下右下空白（拱内沿在 x 1100–1500 处约 y 780–830）。
 * 按底边定位而不是按顶边：文字块里有按钮和字号下限，小视口下块会比按比例缩放的更高，
 * 按顶边定位会让按钮被视口下沿裁掉；按底边定位则永远贴着画面底部往上长。
 * 页面运行时按画面缩放换算成像素（见 index.js 的 fit()），保证随视口比例一起走。
 */
export const TEXT = { x: 1170, bottom: 1084, w: 400 };

/**
 * 横版布局需要的最小宽高比：画面按左下对齐、cover 铺满，可见宽度 = 视口宽高比 × 1116。
 * 要让文字框右缘（TEXT.x + TEXT.w）连同 40 的余量都落在画内，宽高比至少 (1170+400+40)/1116 ≈ 1.44。
 * 低于它（竖屏、4:3 平板等）改用竖版布局：只取左侧，标题放上方。
 */
export const WIDE_MIN_ASPECT = (TEXT.x + TEXT.w + 40) / VIEW.h;

/** 页面文案 */
export const COPY = {
  title: ['难懂的话，', '走成一座桥。'],
  subtitle: 'Meet the language halfway.',
  start: { zh: '开始', en: 'Start' },
  alt: '撕纸拼贴风格的插画。一位背包的行人站在左下角的暗色山坡上仰望。两岸的喜鹊沿着撕纸地层搭成的拱形相向飞来，在拱顶相会，右上方的天空里散落着几颗星。',
};
