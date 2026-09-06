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
import { hud } from '../ui/hud.js';
import { getSkillLevel, buffMul, isLearned } from './skills.js';

// 완료한 배달 의뢰가 다시 게시되기까지(항해일자 기준) — 항로 개척 3부작(id가 'chain_'로
// 시작)은 스토리 게이트라 순환 대상에서 제외한다.
const DELIVERY_QUEST_RESPAWN_DAYS = 5;
const VOYAGE_DAY_SECONDS = 60; // entities/weather.js DAY_CYCLE_SECONDS와 동일 기준

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
  // 학문(고고학/지리학/천문학) 조사·관측 의뢰 — 해당 학문을 배우지 않았으면(스승에게 사사하기
  // 전) 아예 게시판에 뜨지 않고, 배웠어도 skillId 스킬이 minSkillLevel 이상이어야 뜬다.
  if (q.minSkillLevel != null && !isLearned(q.skillId)) return false;
  if (q.minSkillLevel != null && getSkillLevel(q.skillId) < q.minSkillLevel) return false;
  return true;
}

export function addReputation(country, amount) {
  if (!country) return;
  // 항구 친화(선박 고정 스킬) + 사교술(선장 개인 액티브 스킬)은 평판이 오르는 속도 자체를
  // 키운다(음수 방향/페널티에는 손대지 않는다 — "친화력"이 나쁜 평판까지 완화해주는 건 어색하다).
  const gain = amount > 0
    ? amount * mulSkillEffect(getShip(state.currentShipId), 'reputationGainMul', 1) * buffMul('reputationGainMul', 1)
    : amount;
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
  if (state.questRespawnAt[id] != null) {
    const next = { ...state.questRespawnAt };
    delete next[id];
    state.questRespawnAt = next;
  }
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
  // 항로 개척 3부작(chain_ 접두)은 스토리 게이트라 순환에서 제외 — 나머지 배달 의뢰는
  // 며칠 뒤 다시 게시돼 소진형으로 끝나지 않는다(checkQuestRespawns가 매 프레임 확인).
  if (!id.startsWith('chain_')) {
    state.questRespawnAt = { ...state.questRespawnAt, [id]: state.dayTimer + DELIVERY_QUEST_RESPAWN_DAYS * VOYAGE_DAY_SECONDS };
  }
  addReputation(getCity(q.destCityId)?.country, 5);
  notify({ questChanged: true, inventoryChanged: true });
  return { ok: true, reward: q.reward };
}

// 전투/충돌/백병전 등 어떤 수단으로든 npc가 격침됐을 때 호출 — 그 배를 노리는 토벌 의뢰가
// 수락 상태였다면 자동으로 완료 처리한다(항구로 돌아가 보고할 필요 없음). 같은 npc를
// 노리는 의뢰가 동시에 여러 개(예: 항로 개척 3부작의 토벌 + 그 항로가 열린 뒤의 반복
// 토벌 의뢰) 수락 상태일 수 있으므로 전부 찾아 함께 완료 처리한다.
export function checkBountyKill(npcOwnerId) {
  const matches = QUESTS.filter((x) => x.type === 'bounty' && x.targetId === npcOwnerId
    && getQuestStatus(x.id) === 'accepted' && isQuestChainReady(x));
  if (matches.length === 0) return [];
  let totalReward = 0;
  const nextQuests = { ...state.quests };
  for (const q of matches) { nextQuests[q.id] = 'completed'; totalReward += q.reward; }
  state.quests = nextQuests;
  state.gold += totalReward;
  state.pirateBounty = (state.pirateBounty || 0) + 1;
  notify({ questChanged: true });
  return matches;
}

// 반복(repeatable) 토벌 의뢰가 노리는 npc가 리스폰했을 때(entities/pirate.js
// checkPirateRespawns) 호출 — 완료 상태였던 반복 의뢰를 다시 게시판에 올린다. 항로 개척
// 3부작의 토벌은 repeatable이 아니므로 여기서 다시 열리지 않는다(영구 완료 유지).
export function reactivateRepeatableBounties(npcOwnerId) {
  const matches = QUESTS.filter((q) => q.type === 'bounty' && q.repeatable
    && q.targetId === npcOwnerId && getQuestStatus(q.id) === 'completed');
  if (matches.length === 0) return matches;
  const nextQuests = { ...state.quests };
  for (const q of matches) delete nextQuests[q.id];
  state.quests = nextQuests;
  notify({ questChanged: true });
  return matches;
}

// 냉각 시간이 지난 배달 의뢰를 다시 'available'로 되돌린다 — 엘리트/보스 리스폰과 같은
// 방식(절대 시각 비교)으로 매 프레임 확인한다(seaScene.update()에서 호출).
export function checkQuestRespawns() {
  for (const [id, respawnAt] of Object.entries(state.questRespawnAt)) {
    if (state.dayTimer < respawnAt) continue;
    const nextRespawn = { ...state.questRespawnAt };
    delete nextRespawn[id];
    state.questRespawnAt = nextRespawn;
    if (getQuestStatus(id) !== 'completed') continue; // 이미 다시 수락한 경우 등은 건너뛴다
    const nextQuests = { ...state.quests };
    delete nextQuests[id];
    state.quests = nextQuests;
    const q = getQuest(id);
    hud.toast(`📜 '${q?.title || id}' 의뢰가 다시 게시됐습니다.`);
    notify({ questChanged: true });
  }
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

// 학문(고고학/지리학/천문학) 조사·관측 의뢰(type: 'investigate') 완료 처리 — 격침 의뢰의
// checkBountyKill과 같은 구조다. seaScene이 도감에 새 항목을 등록하는 바로 그 순간 호출해,
// 그 siteId를 노리는 수락 상태 의뢰가 있으면 함께 완료 처리하고 추가 보상을 얹는다.
export function checkInvestigateComplete(siteId) {
  const matches = QUESTS.filter((x) => x.type === 'investigate' && x.siteId === siteId
    && getQuestStatus(x.id) === 'accepted' && isQuestChainReady(x));
  if (matches.length === 0) return [];
  const nextQuests = { ...state.quests };
  let totalReward = 0;
  for (const q of matches) { nextQuests[q.id] = 'completed'; totalReward += q.reward; }
  state.quests = nextQuests;
  state.gold += totalReward;
  notify({ questChanged: true });
  return matches;
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
