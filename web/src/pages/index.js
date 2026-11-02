export const pages = {
  '/': () => import('./home.js').then((m) => m.default),
  '/app': () => import('./app.js').then((m) => m.default),
  '/team': () => import('./team.js').then((m) => m.default),
};
