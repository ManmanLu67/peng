import { session } from './probe-lib.mjs';
const BASE = process.argv[2]; const SHOTS = process.argv[3];
await session(9490, async ({ ev, view, go, shot, sleep }) => {
  await view(1440, 800);
  await go(`${BASE}/#/app`);
  await ev(`document.querySelector('.demo__start').click()`);
  await sleep(6500);
  await shot(`${SHOTS}/demo-running-1440.png`);
  await view(1100, 800); await sleep(300);
  await shot(`${SHOTS}/demo-running-1100.png`);
  await view(800, 800); await sleep(300);
  await shot(`${SHOTS}/demo-running-800.png`);
});
