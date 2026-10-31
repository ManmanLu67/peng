import { session } from './probe-lib.mjs';
const BASE = process.argv[2]; const SHOTS = process.argv[3];
await session(9500, async ({ ev, view, go, shot, sleep, check }) => {
  for (const [w, h, name] of [[1440, 800, 'home-1440'], [400, 800, 'home-400'], [400, 250, 'home-400x250']]) {
    await view(w, h);
    await go(`${BASE}/#/`, 1800);
    await shot(`${SHOTS}/${name}.png`);
  }
  check('首页无 JS 报错、h1 存在', (await ev(`!!document.getElementById('home-title')`)) === true);
});
