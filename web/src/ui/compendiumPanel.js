// 항해 도감 패널 — 고고학/지리학/천문학 3개 탭, 발견한 항목만 이름·설명을 보여주고
// 미발견 항목은 "???"로 가려 보여준다(수집 동기를 주기 위해). 조선소 탭 전환과 같은 방식
// (hud.setShipyardActiveTab 패턴)을 그대로 재사용한다.
import { state } from '../state.js';
import { hud } from './hud.js';
import { SKILL_CATEGORIES } from '../data/playerSkills.js';
import { getSiteList } from '../data/compendium.js';

const CATEGORY_LABEL = { archaeology: '고고학', geography: '지리학', astronomy: '천문학' };

let activeTab = 'archaeology';

function renderTab(category) {
  activeTab = category;
  hud.setCompendiumActiveTab(category);
  const found = state.compendium[category] || {};
  const list = getSiteList(category);
  const foundCount = list.filter((s) => found[s.id]).length;
  const rows = list.length
    ? list.map((s) => {
      const isFound = !!found[s.id];
      return {
        name: isFound ? s.name : '❓ 미발견',
        sub: isFound ? `${s.era ? `${s.era} · ` : ''}${s.desc}` : '조사하면 이름과 사연이 밝혀집니다.',
        disabled: true,
        highlight: isFound,
      };
    })
    : [{ name: '아직 등록된 항목이 없습니다.', sub: '', disabled: true }];
  hud.renderCompendiumPanel({
    title: `${SKILL_CATEGORIES[category]?.label || CATEGORY_LABEL[category]} 도감 — ${foundCount} / ${list.length} 발견`,
    rows,
  });
}

export function openCompendiumPanel() {
  renderTab(activeTab);
  hud.showCompendiumPanel(true);
}

export function wireCompendiumTabs() {
  document.querySelectorAll('#compendium-tabs .sy-tab').forEach((btn) => {
    btn.addEventListener('click', () => renderTab(btn.dataset.tab));
  });
}
