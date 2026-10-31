// 深浅色：手动选择写在 localStorage，没有记录时跟随系统。
// 页面首次绘制前，index.html 头部用同一个键先设 data-theme，避免闪一下浅色。

export const THEME_KEY = 'peng-theme';

/** @param {string|null|undefined} saved @param {boolean} prefersDark */
export function resolveTheme(saved, prefersDark) {
  if (saved === 'light' || saved === 'dark') return saved;
  return prefersDark ? 'dark' : 'light';
}

function readSaved() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function systemDark() {
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches === true;
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
}

export function create() {
  apply(resolveTheme(readSaved(), systemDark()));
  return {
    get() {
      return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    },
    set(theme) {
      const next = theme === 'dark' ? 'dark' : 'light';
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // 隐私模式写不进存储时，这次切换仍然生效
      }
      apply(next);
    },
  };
}
