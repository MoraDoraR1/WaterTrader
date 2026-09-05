// 항구관리인 NPC의 의뢰(배달/토벌) 로직 — state.quests에 id -> 'accepted'|'completed'만 저장하고
// (기본은 'available', 저장 공간을 아끼려 굳이 명시하지 않는다) 나머지는 QUESTS 정적 데이터에서 읽는다.
import { state, notify } from '../state.js';
import { QUESTS, getQuest } from '../data/quests.js';
import { getCity } from '../data/cities.js';
import { getGood } from '../data/goods.js';
import { getShip } from '../data/ships.js';
import { mulSkillEffect } from '../data/shipSkills.js';
import { getRankInfo } from './rank.js';
import { WORLD_REGIONS } from '../data/worldRegions.js';

export function getQuestStatus(id) {
  return state.quests[id] || 'available';
}

export function getQuestsForCity(cityId) {
  return QUESTS.filter((q) => q.cityId === cityId);
}

// 이 도시에서 납품 가능한(=수락됐고 목적지가 이 도시인) 배달 의뢰
export function getTurnInableAt(cityId) {
  return QUESTS.filter((q) => q.type === 'delivery' && q.destCityId === cityId && getQuestStatus(q.id) === 'accepted');
}

export function getActiveQuests() {
  return QUESTS.filter((q) => getQuestStatus(q.id) === 'accepted');
}

// 항로 개척 연계 의뢰(배달→토벌→항해)가 지금 게시판에 뜰 준비가 됐는지 — 일반 의뢰는
// 이런 조건이 아예 없으므로 항상 true를 반환한다.
export function isQuestChainReady(q) {
  if (q.requires && getQuestStatus(q.requires) !== 'completed') return false;
  if (q.minRankIndex != null && getRankInfo().index < q.minRankIndex) return false;
  if (q.routePrereq && !state.unlockedRoutes[q.routePrereq]) return false;
  return true;
}

export function addReputation(country, amount) {
  if (!country) return;
  // 항구 친화 스킬은 평판이 오르는 속도 자체를 키운다(음수 방향/페널티에는 손대지 않는다 —
  // "친화력"이 나쁜 평판까지 완화해주는 건 어색하다).
  const gain = amount > 0 ? amount * mulSkillEffect(getShip(state.currentShipId), 'reputationGainMul', 1) : amount;
  state.reputation = { ...state.reputation, [country]: (state.reputation[country] || 0) + gain };
}

export function getReputation(country) {
  return state.reputation?.[country] || 0;
}

export function acceptQuest(id) {
  const q = getQuest(id);
  if (!q) return { ok: false, reason: '존재하지 않는 의뢰입니다.' };
  if (getQuestStatus(id) !== 'available') return { ok: false, reason: '이미 수락했거나 완료한 의뢰입니다.' };
  if (!isQuestChainReady(q)) return { ok: false, reason: '아직 수락할 수 없는 의뢰입니다.' };
  state.quests = { ...state.quests, [id]: 'accepted' };
  notify({ questChanged: true });
  return { ok: true };
}

export function turnInDelivery(id) {
  const q = getQuest(id);
  if (!q || q.type !== 'delivery') return { ok: false, reason: '배달 의뢰가 아닙니다.' };
  if (getQuestStatus(id) !== 'accepted') return { ok: false, reason: '수락하지 않은 의뢰입니다.' };
  const item = state.inventory.find((it) => it.id === q.goodId);
  if (!item || item.qty < q.qty) {
    return { ok: false, reason: `${getGood(q.goodId)?.name || q.goodId} ${q.qty}t이 부족합니다.` };
  }
  item.qty -= q.qty;
  if (item.qty <= 0) state.inventory = state.inventory.filter((it) => it.id !== q.goodId);
  state.gold += q.reward;
  state.quests = { ...state.quests, [id]: 'completed' };
  addReputation(getCity(q.destCityId)?.country, 5);
  notify({ questChanged: true, inventoryChanged: true });
  return { ok: true, reward: q.reward };
}

// 전투/충돌/백병전 등 어떤 수단으로든 npc가 격침됐을 때 호출 — 그 배를 노리는 토벌 의뢰가
// 수락 상태였다면 자동으로 완료 처리한다(항구로 돌아가 보고할 필요 없음).
export function checkBountyKill(npcOwnerId) {
  const q = QUESTS.find((x) => x.type === 'bounty' && x.targetId === npcOwnerId);
  if (!q || getQuestStatus(q.id) !== 'accepted' || !isQuestChainReady(q)) return null;
  state.gold += q.reward;
  state.quests = { ...state.quests, [q.id]: 'completed' };
  state.pirateBounty = (state.pirateBounty || 0) + 1;
  notify({ questChanged: true });
  return q;
}

// 항해(voyage) 의뢰는 항구에 정박하는 순간 자동 완료된다 — 목적지에 직접 가는 것 자체가
// 의뢰의 완수이므로 게시판에 따로 납품/보고할 필요가 없다. unlocksRoute가 있으면(항로 개척
// 3부작의 마지막 단계) 그 항로를 영구히 연다 — state.unlockedRoutes는 이 시점 이후로만
// true가 되며, 세이브에 저장된 완료 상태(state.quests)만으로 재접속 시에도 그대로 복원된다.
export function checkVoyageArrival(cityId) {
  const q = QUESTS.find((x) => x.type === 'voyage' && x.targetCityId === cityId);
  if (!q || getQuestStatus(q.id) !== 'accepted' || !isQuestChainReady(q)) return null;
  state.gold += q.reward;
  state.quests = { ...state.quests, [q.id]: 'completed' };
  if (q.unlocksRoute) {
    state.unlockedRoutes = { ...state.unlockedRoutes, [q.unlocksRoute]: true };
  }
  addReputation(getCity(cityId)?.country, 8);
  notify({ questChanged: true, routesUnlocked: q.unlocksRoute ? [q.unlocksRoute] : undefined });
  return q;
}

export function getRouteChainName(routeId) {
  return WORLD_REGIONS.find((r) => r.id === routeId)?.name || routeId;
}

// state.unlockedRoutes 자체는 세이브에 포함되지 않는다(항로 3개뿐이라 굳이 별도 저장하지
// 않고, 이미 저장되는 state.quests의 완료 기록에서 매번 다시 계산한다). 그래서 저장된 게임을
// 불러온 직후에는 반드시 이 함수를 한 번 호출해, 이미 항해(voyage) 3부를 끝낸 항로를
// 도로 잠긴 상태로 되돌리지 않게 복원해야 한다.
export function syncUnlockedRoutes() {
  for (const q of QUESTS) {
    if (q.type === 'voyage' && q.unlocksRoute && getQuestStatus(q.id) === 'completed' && !state.unlockedRoutes[q.unlocksRoute]) {
      state.unlockedRoutes = { ...state.unlockedRoutes, [q.unlocksRoute]: true };
    }
  }
}
