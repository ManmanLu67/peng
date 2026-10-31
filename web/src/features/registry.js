// 功能注册表：id → feature。页面组合在 src/pages/*.js，两者分离。
// 新增功能：建 features/<id>/index.js，在这里登记一行。
import apiBadge from './api-badge/index.js';
import appPlaceholder from './app-placeholder/index.js';
import homeHero from './home-hero/index.js';
import hskSelect from './hsk-select/index.js';
import logo from './logo/index.js';
import nav from './nav/index.js';
import teamGrid from './team-grid/index.js';
import themeToggle from './theme-toggle/index.js';
import topbar from './topbar/index.js';

const all = [apiBadge, appPlaceholder, homeHero, hskSelect, logo, nav, teamGrid, themeToggle, topbar];

export const featureRegistry = Object.fromEntries(all.map((f) => [f.id, f]));
