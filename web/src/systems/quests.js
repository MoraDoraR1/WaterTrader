// 항구관리인 NPC의 의뢰(배달/토벌) 로직 — state.quests에 id -> 'accepted'|'completed'만 저장하고
// (기본은 'available', 저장 공간을 아끼려 굳이 명시하지 않는다) 나머지는 QUESTS 정적 데이터에서 읽는다.
import { state, notify } from '../state.js';
import { QUESTS, getQuest } from '../data/quests.js';
import { getCity } from '../data/cities.js';
import { getGood } from '../data/goods.js';

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

export function addReputation(country, amount) {
  if (!country) return;
  state.reputation = { ...state.reputation, [country]: (state.reputation[country] || 0) + amount };
}

export function getReputation(country) {
  return state.reputation?.[country] || 0;
}

export function acceptQuest(id) {
  const q = getQuest(id);
  if (!q) return { ok: false, reason: '존재하지 않는 의뢰입니다.' };
  if (getQuestStatus(id) !== 'available') return { ok: false, reason: '이미 수락했거나 완료한 의뢰입니다.' };
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
  if (!q || getQuestStatus(q.id) !== 'accepted') return null;
  state.gold += q.reward;
  state.quests = { ...state.quests, [q.id]: 'completed' };
  state.pirateBounty = (state.pirateBounty || 0) + 1;
  notify({ questChanged: true });
  return q;
}
