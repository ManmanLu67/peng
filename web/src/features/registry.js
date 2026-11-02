// 功能注册表：id → feature。页面组合在 src/pages/*.js，两者分离。
// 新增功能：建 features/<id>/index.js，在这里登记一行。
import actions from './actions/index.js';
import apiBadge from './api-badge/index.js';
import bridge from './bridge/index.js';
import chat from './chat/index.js';
import compare from './compare/index.js';
import demo from './demo/index.js';
import homeHero from './home-hero/index.js';
import ladderBar from './ladder-bar/index.js';
import logo from './logo/index.js';
import nav from './nav/index.js';
import teamGrid from './team-grid/index.js';
import themeToggle from './theme-toggle/index.js';
import topbar from './topbar/index.js';

const all = [actions, apiBadge, bridge, chat, compare, demo, homeHero, ladderBar, logo, nav, teamGrid, themeToggle, topbar];

export const featureRegistry = Object.fromEntries(all.map((f) => [f.id, f]));
