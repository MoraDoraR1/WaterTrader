// 명성/악명 시스템 — 교역·모험·전투 세 축의 명성을 완전히 독립적으로 쌓고 조회한다.
// 각 축은 자기 활동으로만 오른다(교역은 매매·재화, 모험은 발견·도감, 전투는 격침) — 서로
// 전혀 간섭하지 않는다. 악명(infamy)은 이들과 별개로, 상단(무역 호송대) 약탈로만 오르고
// 시간이 지나면 저절로 가라앉는 네 번째 트랙이다(entities/pirate.js가 악명 유무로 해군의
// 강제 교전 여부를 판정할 때 이 값을 직접 읽는다).
import { state, notify } from '../state.js';
import { hud } from '../ui/hud.js';
import { audio } from './audio.js';
import {
  TRADE_TITLES, ADVENTURE_TITLES, COMBAT_TITLES, INFAMY_TITLES,
  TRADE_WEALTH_MILESTONES, ADVENTURE_DISCOVERY_MILESTONES, INFAMY_DECAY_PER_SEC,
} from '../data/titles.js';

function titleFor(tiers, value) {
  let index = 0;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (value >= tiers[i].minFame) { index = i; break; }
  }
  const tier = tiers[index];
  const next = tiers[index + 1] || null;
  const progress = next ? Math.min(1, (value - tier.minFame) / (next.minFame - tier.minFame)) : 1;
  return { tier, index, next, progress, isMax: !next, value };
}

export function getTradeTitle() { return titleFor(TRADE_TITLES, state.tradeFame || 0); }
export function getAdventureTitle() { return titleFor(ADVENTURE_TITLES, state.adventureFame || 0); }
export function getCombatTitle() { return titleFor(COMBAT_TITLES, state.combatFame || 0); }
export function getInfamyTitle() { return titleFor(INFAMY_TITLES, state.infamy || 0); }

function bumpToast(prevIndex, nextInfo, icon, axisLabel) {
  if (nextInfo.index > prevIndex) {
    hud.toast(`${icon} [${axisLabel}] 새로운 칭호 "${nextInfo.tier.label}"을(를) 얻었습니다!`);
    if (nextInfo.isMax) audio.playTitleFanfare();
  }
}

export function addTradeFame(amount) {
  if (!amount) return;
  const prevIndex = getTradeTitle().index;
  state.tradeFame = (state.tradeFame || 0) + amount;
  bumpToast(prevIndex, getTradeTitle(), '💰', '교역');
  notify({ fameChanged: true });
}

export function addAdventureFame(amount) {
  if (!amount) return;
  const prevIndex = getAdventureTitle().index;
  state.adventureFame = (state.adventureFame || 0) + amount;
  bumpToast(prevIndex, getAdventureTitle(), '🧭', '모험');
  notify({ fameChanged: true });
}

export function addCombatFame(amount) {
  if (!amount) return;
  const prevIndex = getCombatTitle().index;
  state.combatFame = (state.combatFame || 0) + amount;
  bumpToast(prevIndex, getCombatTitle(), '⚔', '전투');
  notify({ fameChanged: true });
}

export function addInfamy(amount) {
  if (!amount) return;
  const prevIndex = getInfamyTitle().index;
  state.infamy = Math.max(0, (state.infamy || 0) + amount);
  const next = getInfamyTitle();
  // 악명은 시간이 지나면 줄어들지만(decayInfamy), 한 번 밟은 단계는 잃지 않도록 최댓값만
  // 갱신되는 별도 필드에 남겨둔다 — 장착 가능한 칭호 목록은 이 peak 기준으로 판단한다.
  state.infamyPeakTier = Math.max(state.infamyPeakTier || 0, next.index);
  if (next.index > prevIndex) {
    hud.toast(`🏴‍☠️ 악명이 퍼져 "${next.tier.label}"(으)로 불리기 시작했습니다!`);
  }
  notify({ fameChanged: true });
}

// 매 프레임(화면 무관, main.js 공용 루프) 호출 — 악명이 있을 때만 조금씩 가라앉는다.
export function decayInfamy(delta) {
  if (!state.infamy) return;
  state.infamy = Math.max(0, state.infamy - INFAMY_DECAY_PER_SEC * delta);
  notify({ fameChanged: true });
}

// 누적 자산(휴대금+은행)이 새 구간을 넘을 때마다 한 번씩 교역 명성을 더한다 — 이미 지나친
// 구간은 state.tradeWealthMilestone(다음에 검사할 인덱스)로 기억해 중복 지급을 막는다.
// 한 번에 여러 구간을 건너뛴 경우(큰 목돈이 한꺼번에 들어온 경우) 전부 몰아서 지급한다.
export function checkWealthMilestone() {
  const total = (state.gold || 0) + (state.bankGold || 0);
  let idx = state.tradeWealthMilestone || 0;
  let gained = 0;
  while (idx < TRADE_WEALTH_MILESTONES.length && total >= TRADE_WEALTH_MILESTONES[idx].amount) {
    gained += TRADE_WEALTH_MILESTONES[idx].fame;
    idx += 1;
  }
  if (gained <= 0) return;
  state.tradeWealthMilestone = idx;
  const reached = TRADE_WEALTH_MILESTONES[idx - 1].amount;
  addTradeFame(gained);
  hud.toast(`💰 누적 자산 ${reached.toLocaleString('ko-KR')} 두캇 달성 — 교역 명성 +${gained}!`);
}

// 3개 학문 도감 총 발견 개수가 새 구간을 넘을 때마다 한 번씩 모험 명성을 더한다.
export function checkDiscoveryMilestone() {
  const total = ['archaeology', 'geography', 'astronomy']
    .reduce((sum, c) => sum + Object.keys(state.compendium[c] || {}).length, 0);
  let idx = state.adventureDiscoveryMilestone || 0;
  let gained = 0;
  while (idx < ADVENTURE_DISCOVERY_MILESTONES.length && total >= ADVENTURE_DISCOVERY_MILESTONES[idx].count) {
    gained += ADVENTURE_DISCOVERY_MILESTONES[idx].fame;
    idx += 1;
  }
  if (gained <= 0) return;
  state.adventureDiscoveryMilestone = idx;
  addAdventureFame(gained);
  hud.toast(`🧭 항해 도감 ${total}건 발견 — 모험 명성 +${gained}!`);
}

// ---- 장착 칭호(진열용 + 소량 버프) ----
// 축 하나당 "지금 이 순간의 칭호"만 있는 게 아니라, 그 축에서 이미 지나온 낮은 단계까지
// 전부 선택지가 된다 — 취향대로 아무 단계나 골라 상단바에 내걸고 그 단계의 소량 버프를
// 받는다(데이터 자체는 data/titles.js effect 필드, 실제 적용은 systems/skills.js buffMul).
const AXES = [
  { key: 'trade', label: '교역', icon: '💰', tiers: TRADE_TITLES, getInfo: getTradeTitle },
  { key: 'adventure', label: '모험', icon: '🧭', tiers: ADVENTURE_TITLES, getInfo: getAdventureTitle },
  { key: 'combat', label: '전투', icon: '⚔', tiers: COMBAT_TITLES, getInfo: getCombatTitle },
  { key: 'infamy', label: '악명', icon: '🏴‍☠️', tiers: INFAMY_TITLES, getInfo: getInfamyTitle },
];

// 그 축에서 지금까지 도달한 최고 단계 인덱스 — 교역/모험/전투는 명성이 줄지 않으므로 현재
// 칭호 인덱스와 같고, 악명만 감쇠를 우회하기 위해 별도로 기록해둔 peak를 쓴다.
function unlockedIndexFor(axis) {
  if (axis.key === 'infamy') return state.infamyPeakTier || 0;
  return axis.getInfo().index;
}

// 전체 축을 훑어 { axisKey, axisLabel, icon, tier, tierIndex, unlocked } 평면 목록으로 반환.
export function getAllTitleEntries() {
  const entries = [];
  for (const axis of AXES) {
    const unlockedIdx = unlockedIndexFor(axis);
    axis.tiers.forEach((tier, i) => {
      entries.push({
        id: tier.id, axisKey: axis.key, axisLabel: axis.label, icon: axis.icon,
        tier, tierIndex: i, unlocked: i <= unlockedIdx,
      });
    });
  }
  return entries;
}

export function isTitleUnlocked(id) {
  const entry = getAllTitleEntries().find((e) => e.id === id);
  return !!entry?.unlocked;
}

export function getEquippedTitleEntry() {
  if (!state.equippedTitleId) return null;
  const entry = getAllTitleEntries().find((e) => e.id === state.equippedTitleId);
  return entry?.unlocked ? entry : null;
}

export function equipTitle(id) {
  if (!isTitleUnlocked(id)) return { ok: false, reason: '아직 달성하지 못한 칭호입니다.' };
  state.equippedTitleId = id;
  notify({ fameChanged: true });
  return { ok: true };
}

export function unequipTitle() {
  state.equippedTitleId = null;
  notify({ fameChanged: true });
}

// systems/skills.js의 buffMul(key, base)에서 호출 — 장착한 칭호의 effect.key가 일치할 때만
// 곱연산으로 얹는다. 일치하지 않으면 base를 그대로 돌려줘 다른 계산식엔 전혀 영향을 주지 않는다.
export function getTitleEffectMul(key, base) {
  const entry = getEquippedTitleEntry();
  const effect = entry?.tier.effect;
  if (effect && effect.mode === 'mul' && effect.key === key) return base * effect.value;
  return base;
}
