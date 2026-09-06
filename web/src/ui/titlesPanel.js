// 칭호 패널 — 교역/모험/전투/악명 네 축을 섹션으로 나눠 보여준다. 각 축에서 "지금 이 순간"의
// 칭호뿐 아니라 이미 지나온 낮은 단계까지 전부 나열하고, 그중 하나를 "장착"해 상단바에
// 내걸 수 있다(장착한 칭호는 그 자체의 소량 버프도 함께 받는다 — systems/fame.js 참고).
import { hud } from './hud.js';
import {
  getTradeTitle, getAdventureTitle, getCombatTitle, getInfamyTitle,
  getAllTitleEntries, getEquippedTitleEntry, equipTitle, unequipTitle,
} from '../systems/fame.js';

const AXIS_MIN_LABEL = { trade: '명성', adventure: '명성', combat: '명성', infamy: '악명' };

function effectLabel(effect) {
  const pct = Math.round((effect.value - 1) * 100);
  const sign = pct >= 0 ? '+' : '';
  switch (effect.key) {
    case 'sellPriceMul': return `매도가 ${sign}${pct}%`;
    case 'distancePremiumMul': return `거리 프리미엄 획득량 ${sign}${pct}%`;
    case 'incomingDamageMul': return `피격 데미지 ${sign}${pct}%`;
    case 'lootQtyMul': return `전투 노획량 ${sign}${pct}%`;
    default: return `${effect.key} ${sign}${pct}%`;
  }
}

function progressLabel(info) {
  if (info.isMax) return `${Math.round(info.value)} (최고 칭호)`;
  return `${Math.round(info.value)} / ${info.next.minFame} — 다음: "${info.next.label}"`;
}

// 축 헤더 행 — 진행도만 보여주는 순수 정보 행(장착 액션 없음).
function summaryRow(icon, axisLabel, info) {
  return { name: `${icon} 현재: ${info.tier.label}`, sub: progressLabel(info), disabled: true };
}

export function renderTitlesPanel() {
  const equipped = getEquippedTitleEntry();
  const entries = getAllTitleEntries();
  const summaries = { trade: getTradeTitle(), adventure: getAdventureTitle(), combat: getCombatTitle(), infamy: getInfamyTitle() };
  const icons = { trade: '💰', adventure: '🧭', combat: '⚔', infamy: '🏴‍☠️' };
  const labels = { trade: '교역', adventure: '모험', combat: '전투', infamy: '악명' };

  const sections = ['trade', 'adventure', 'combat', 'infamy'].map((axisKey) => {
    const rows = [summaryRow(icons[axisKey], labels[axisKey], summaries[axisKey])];
    for (const e of entries.filter((x) => x.axisKey === axisKey)) {
      const isEquipped = equipped?.id === e.id;
      rows.push({
        name: `${e.tier.label}`,
        sub: e.unlocked
          ? effectLabel(e.tier.effect)
          : `🔒 ${AXIS_MIN_LABEL[axisKey]} ${e.tier.minFame} 필요`,
        actionLabel: isEquipped ? '장착됨' : e.unlocked ? '장착' : '잠김',
        disabled: isEquipped || !e.unlocked,
        highlight: isEquipped,
        onAction: () => {
          const res = equipTitle(e.id);
          if (res.ok) { hud.toast(`🎖 "${e.tier.label}" 칭호를 장착했습니다.`); renderTitlesPanel(); }
        },
      });
    }
    return { heading: `${icons[axisKey]} ${labels[axisKey]}`, rows };
  });

  if (equipped) {
    sections.push({
      heading: '해제',
      rows: [{
        name: '칭호 해제', sub: '상단바에 아무 칭호도 표시하지 않습니다.',
        actionLabel: '해제', onAction: () => { unequipTitle(); hud.toast('칭호를 해제했습니다.'); renderTitlesPanel(); },
      }],
    });
  }

  hud.renderTitlesPanel(sections);
}

export function openTitlesPanel() {
  renderTitlesPanel();
  hud.showTitlesPanel(true);
}
