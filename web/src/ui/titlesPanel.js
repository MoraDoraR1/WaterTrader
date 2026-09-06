// 칭호 패널 — 교역/모험/전투/악명 네 축을 탭 없이 한 목록으로 보여준다. 값을 바꾸는 액션이
// 없는 순수 조회 패널이라(조선소/도감처럼 disabled 행만 사용) compendiumPanel.js와 같은
// 가벼운 구조를 그대로 따른다.
import { hud } from './hud.js';
import { getTradeTitle, getAdventureTitle, getCombatTitle, getInfamyTitle } from '../systems/fame.js';

function progressLabel(info) {
  if (info.isMax) return `${Math.round(info.value)} (최고 칭호)`;
  return `${Math.round(info.value)} / ${info.next.minFame} — 다음: "${info.next.label}"`;
}

function trackRow(icon, axisLabel, info) {
  return {
    name: `${icon} [${axisLabel}] ${info.tier.label}`,
    sub: progressLabel(info),
    disabled: true,
    highlight: axisLabel === '악명' && info.index > 0,
  };
}

export function renderTitlesPanel() {
  const rows = [
    trackRow('💰', '교역', getTradeTitle()),
    trackRow('🧭', '모험', getAdventureTitle()),
    trackRow('⚔', '전투', getCombatTitle()),
    trackRow('🏴‍☠️', '악명', getInfamyTitle()),
  ];
  hud.renderTitlesPanel(rows);
}

export function openTitlesPanel() {
  renderTitlesPanel();
  hud.showTitlesPanel(true);
}
