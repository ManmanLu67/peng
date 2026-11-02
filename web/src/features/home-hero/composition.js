// 首页构图：左卡立足、中央学习者、右卡飞升。
// 卡片是直边矩形。位置是 0–1 的比例，渲染时乘以卡片像素，纸纹才不会被拉伸。

/** 窄屏断点，与工作台一致。 */
export const NARROW_MAX = 720;

/** 小人跟随的缓动系数，落在说明建议的 0.08–0.15。 */
export const FOLLOW = 0.09;

/** 指针偏移乘上这个增益再去跟随，避免 1:1 地贴着鼠标。 */
export const GAIN = 0.35;

/** 悬停：在静止朝向上再逆时针 90°，并放大。 */
export const HOVER_TURN = -90;
export const HOVER_SCALE = 1.28;

/** 两张近正方形色纸。turn 是顺时针角度。 */
export const CARDS = [
  { id: 'native', seed: 11, tone: 'var(--card-amber)', turn: -3 },
  { id: 'target', seed: 29, tone: 'var(--card-pumpkin)', turn: 3 },
];

/** 对角线上的鸟尖端朝右上。0 是朝上，正值顺时针。 */
export const FLOCK_AIM = 45;

const RUNGS = [
  ['en', '英语'],
  ['hsk1', 'HSK 1'],
  ['hsk2', 'HSK 2'],
  ['hsk3', 'HSK 3'],
  ['hsk4', 'HSK 4'],
  ['hsk5', 'HSK 5'],
  ['hsk6', 'HSK 6'],
];

/**
 * 右卡的鸟。前 7 只从左下到右上：英语，然后 HSK 1–6，由小到大，不可拖。
 * 最后一只尖端朝上，只可点。没点开时在右下，右缘留出空白，这里的 fx/fy 只是未测量前的占位。
 * 点开后飞到 “T” 对卡片中心的对称点。
 * 鸟上不写字，label 只进 aria-label。
 */
export const ARROWS = [
  ...RUNGS.map(([id, label], i) => {
    const t = i / (RUNGS.length - 1);
    return {
      id,
      label,
      fx: +(0.16 + t * 0.68).toFixed(3),
      fy: +(0.84 - t * 0.68).toFixed(3),
      s: +(0.55 + t * 0.6).toFixed(3),
      rot: FLOCK_AIM,
      tone: i < 4 ? 'paper' : 'navy',
      drag: false,
    };
  }),
  { id: 'mark', label: '飞鸟', fx: 0.9, fy: 0.84, s: 0.72, rot: 0, tone: 'paper', drag: false },
];

/**
 * 把鸟心限制在卡片内，使半宽半高也不出界。
 * 半宽大于卡片一半时无法两边都留住，退回卡片中心。
 */
/** 点 (x, y) 关于矩形中心的对称点。 */
export function mirrorThroughCenter(x, y, w, h) {
  return { x: w - x, y: h - y };
}

export function clampBird(x, y, halfW, halfH, cardW, cardH) {
  const axis = (v, half, card) => {
    if (!(card > 0)) return 0;
    const edge = Number.isFinite(half) && half > 0 ? half : 0;
    if (edge * 2 >= card) return card / 2;
    return Math.min(card - edge, Math.max(edge, v));
  };
  return { x: axis(x, halfW, cardW), y: axis(y, halfH, cardH) };
}

/** 《古诗十九首·行行重行行》。一行两句，八列，columns[0] 在右，竖排自右向左。 */
export const POEM = {
  columns: [
    ['行行重行行', '与君生别离'],
    ['相去万余里', '各在天一涯'],
    ['道路阻且长', '会面安可知'],
    ['胡马依北风', '越鸟巢南枝'],
    ['相去日已远', '衣带日已缓'],
    ['浮云蔽白日', '游子不顾返'],
    ['思君令人老', '岁月忽已晚'],
    ['弃捐勿复道', '努力加餐饭'],
  ],
  note: ['佚名《古诗十九首》', '东汉, 约公元 100–200'],
};

export const COPY = {
  tag: { left: 'Original Text', right: 'Adapted Text' },
  enter: '进入',
  footer: {
    left: 'Meet the language halfway.',
    right: 'Ctrl+Alt+Culture — PENG STUDIOS',
  },
  alt: '两张近正方形的色纸。左卡是芥黄，上面是竖排《古诗十九首·行行重行行》；右卡是南瓜橙，上面是向右上飞去的箭形鸟群。中间站着一个深藏青、没有五官的学习者。',
};
