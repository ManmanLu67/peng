// 功能注册表：id → feature。页面组合在 src/pages/*.js，两者分离。
// 新增功能：建 features/<id>/index.js，在这里登记一行。
import appPlaceholder from './app-placeholder/index.js';
import homeHero from './home-hero/index.js';
import teamGrid from './team-grid/index.js';

export const featureRegistry = {
  [appPlaceholder.id]: appPlaceholder,
  [homeHero.id]: homeHero,
  [teamGrid.id]: teamGrid,
};
