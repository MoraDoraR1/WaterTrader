// 조선소 NPC 상호작용의 실제 비즈니스 로직(구매/수리/부품 장착/함대 편성) — state를 직접
// 변경하고 UI(hud/cityScene)에는 결과({ok, reason})만 돌려준다. 화면 렌더링은 관여하지 않는다.
import { state, notify, initShipHp } from '../state.js';
import { getShip } from '../data/ships.js';
import { getPart, getEffectiveShipDef } from '../data/shipParts.js';
import { mulSkillEffect } from '../data/shipSkills.js';
import { SUPPLY_DEFS } from './supplies.js';

const TRADE_IN_RATE = 0.4; // 기존 배를 넘길 때 받는 가치 비율(조선비 대비)
const REPAIR_RATE = 0.6; // 완전 파손 상태에서 전액 수리할 때 드는 비용 = 조선비 * 이 비율
export const FLEET_CAP = 4; // 기함(현재 조종 중인 배) 포함 최대 보유 척수

export function getCurrentEffectiveShipDef() {
  return getEffectiveShipDef(getShip(state.currentShipId), state.shipParts);
}

export function tradeInValue() {
  const shipDef = getShip(state.currentShipId);
  return shipDef ? Math.round(shipDef.price * TRADE_IN_RATE) : 0;
}

function makeUid() {
  return `fleet_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// 함대가 가득 차지 않았다면 새 배를 "구매해서 바로 갈아탐"이 아니라 예비 함대에
// 추가한다 — 지금 조종 중인 배는 그대로 유지되고, 함대 탭에서 원할 때 교체한다.
export function buyShip(shipId) {
  const target = getShip(shipId);
  if (!target) return { ok: false, reason: '존재하지 않는 배입니다.' };
  if (state.fleet.length + 1 >= FLEET_CAP) return { ok: false, reason: `함대가 가득 찼습니다 (최대 ${FLEET_CAP}척).` };
  if (state.gold < target.price) return { ok: false, reason: '골드가 부족합니다.' };

  state.gold -= target.price;
  // 새로 산 배는 정원 그대로(선원 만실) 함대에 합류한다.
  state.fleet = [...state.fleet, { uid: makeUid(), shipId, shipHp: target.hp, crewCount: target.crew, shipParts: {}, name: null }];
  notify({ fleetChanged: true });
  return { ok: true };
}

// 예비 함대의 배를 지금 조종 중인 기함과 맞바꾼다(비용 없음, 즉시 전환).
export function setActiveShip(uid) {
  const idx = state.fleet.findIndex((f) => f.uid === uid);
  if (idx < 0) return { ok: false, reason: '함대에 없는 배입니다.' };
  const incoming = state.fleet[idx];
  const outgoing = { uid: makeUid(), shipId: state.currentShipId, shipHp: state.shipHp, crewCount: state.crewCount, shipParts: state.shipParts, name: null };

  const nextFleet = state.fleet.filter((f) => f.uid !== uid);
  nextFleet.push(outgoing);
  state.fleet = nextFleet;

  state.currentShipId = incoming.shipId;
  state.shipParts = incoming.shipParts || {};
  state.shipHp = incoming.shipHp;
  // 예전 세이브 등 crewCount가 없던 함대 항목은 그 배의 정원 그대로 채워 갈아탄다.
  state.crewCount = incoming.crewCount != null ? incoming.crewCount : (getShip(incoming.shipId)?.crew || 20);
  notify({ shipChanged: true, fleetChanged: true });
  return { ok: true };
}

// 예비 함대의 배(현재 조종 중인 기함은 대상이 아님 — 먼저 함대 탭에서 교체해야 함)를 판다.
export function sellFleetShip(uid) {
  const idx = state.fleet.findIndex((f) => f.uid === uid);
  if (idx < 0) return { ok: false, reason: '함대에 없는 배입니다.' };
  const entry = state.fleet[idx];
  const def = getShip(entry.shipId);
  const credit = def ? Math.round(def.price * TRADE_IN_RATE) : 0;

  state.gold += credit;
  state.fleet = state.fleet.filter((f) => f.uid !== uid);
  notify({ fleetChanged: true });
  return { ok: true, credit };
}

export function repairCost() {
  const shipDef = getCurrentEffectiveShipDef();
  const missing = Math.max(0, shipDef.hp - state.shipHp);
  const base = (missing / shipDef.hp) * shipDef.price * REPAIR_RATE;
  // 유능한 목수 스킬 — 항구 조선소 수리비 자체를 깎아준다(바다 위 응급수리와는 별개).
  return Math.round(base * mulSkillEffect(getShip(state.currentShipId), 'repairCostMul', 1));
}

// 항구 조선소 수리 — 골드만 들고(자재는 안 씀), 대신 항상 전액(100%)까지 완전히 고친다.
// 바다 위에서 자재로 하는 응급 수리(repairAtSea, 아래)와 역할을 나눴다: 조선소는 목수를
// 고용해 제대로 뜯어고치는 것이라 자재 소모가 없고, 대신 항구에 있어야만 가능하다.
export function repairShip() {
  const shipDef = getCurrentEffectiveShipDef();
  if (state.shipHp >= shipDef.hp) return { ok: false, reason: '이미 완전한 상태입니다.' };
  const cost = repairCost();
  if (state.gold < cost) return { ok: false, reason: '골드가 부족합니다.' };
  state.gold -= cost;
  state.shipHp = shipDef.hp;
  notify({ hpChanged: true });
  return { ok: true };
}

// 자재 1골드어치가 갖는 수리 "가치"를 조선소 수리 단가 대비 이 비율로만 쳐준다(<1). 자재를
// 아무리 사재기해도 조선소 전액 수리보다 항상 비싸게 먹히도록 만드는 핵심 값 — 예전엔 배
// 최대 내구도의 고정 비율(예: 10%)을 자재 1개당 채웠는데, 그러면 배가 커도 항상 "자재
// 10개=완전 수리"가 성립해 화물칸 10칸(80골드)이면 22,000골드짜리 전함도 다 고쳐지는
// 심각한 구멍이 있었다(실측 확인). 조선소 수리비는 배 값에 비례해 커지는데 자재는 배 크기와
// 무관한 정액이라, 큰 배일수록 자재의 상대적 가성비가 터무니없이 좋아졌던 것 — 자재의
// 수리 가치를 "조선소 hp당 단가"에 연동시켜 배가 크든 작든 조선소가 항상 더 싸게 유지된다.
export const SEA_REPAIR_VALUE_MUL = 0.7;

// 바다 위에서 화물칸의 자재를 소모해 응급 수리한다 — 항구까지 갈 여유가 없을 때 쓰는 부분
// 수리 수단이라 조선소처럼 골드는 안 들지만, 위 이유로 완전 수리는 사실상 불가능한 정도로만
// 채워진다(작은 배는 그럭저럭 쓸 만하고, 큰 배일수록 자재 몇 개로는 티도 안 난다). 한 번에
// 부족분을 다 채우는 데 필요한 만큼만(보유량 한도 내에서) 자재를 소모한다.
export function repairAtSea() {
  const shipDef = getCurrentEffectiveShipDef();
  const missing = shipDef.hp - state.shipHp;
  if (missing <= 0) return { ok: false, reason: '이미 완전한 상태입니다.' };
  if (state.materials < 1) return { ok: false, reason: '자재가 부족합니다 (항구 관리인에게 보급받으세요).' };
  const shipyardRatePerHp = (shipDef.price * REPAIR_RATE) / shipDef.hp; // 조선소라면 이 배 1hp를 고치는 데 드는 골드
  // 자재 활용술 스킬 — 자재 1개가 갖는 수리 "가치" 자체를 키워, 같은 자재량으로 더 많이 고친다.
  const valuePerMaterial = SUPPLY_DEFS.materials.price * SEA_REPAIR_VALUE_MUL
    * mulSkillEffect(getShip(state.currentShipId), 'seaRepairEfficiencyMul', 1);
  const materialsNeeded = Math.max(1, Math.ceil((missing * shipyardRatePerHp) / valuePerMaterial));
  const materialsUsed = Math.min(state.materials, materialsNeeded);
  const healed = Math.min(missing, Math.floor((materialsUsed * valuePerMaterial) / shipyardRatePerHp));
  state.materials -= materialsUsed;
  state.shipHp += healed;
  notify({ hpChanged: true });
  return { ok: true, healed, materialsUsed };
}

// 대포는 조선소에서 부품(SHIP_PARTS의 cannon 슬롯 부품)을 사서 직접 장착해야만 화력이
// 생긴다 — 배를 구매한 시점의 shipParts는 항상 빈 채로 시작하므로(buyShip 참고), 대포를
// 하나도 안 달면 cannons가 0이 되어 포격 자체가 불가능하다(seaScene.js fireCannon 참고).
// 대포 슬롯 수·슬롯별 최대 등급은 배마다 data/ships.js의 cannonSlotTiers 배열이 직접 정한다
// (배열 길이 = 슬롯 수, 각 원소 = 그 슬롯에 허용되는 최대 부품 등급). 이 배열 값들의 합이 곧
// shipDef.cannons(그 배가 대포로 도달할 수 있는 절대 최대치)와 정확히 일치하도록 데이터가
// 짜여 있다 — 슬롯을 전부 채워도 고증 화력을 벗어나지 않는다. 대포 슬롯이 아예 없는 배(로마
// 데케레스)는 cannonSlotTiers가 빈 배열이라 슬롯 수 0을 돌려준다.
export function getCannonSlotCount(shipDef) {
  return Array.isArray(shipDef?.cannonSlotTiers) ? shipDef.cannonSlotTiers.length : 0;
}

export function getCannonSlotMaxTier(shipDef, slotIndex) {
  return shipDef?.cannonSlotTiers?.[slotIndex] ?? 0;
}

function cannonSlotsArray() {
  return Array.isArray(state.shipParts.cannon) ? state.shipParts.cannon : (state.shipParts.cannon ? [state.shipParts.cannon] : []);
}

// slotIndex는 cannon 슬롯에서만 쓰인다(armor/sail/hull은 여전히 슬롯당 1개뿐이라 무시).
export function equipPart(slot, partId, slotIndex = 0) {
  const part = getPart(partId);
  if (!part || part.slot !== slot) return { ok: false, reason: '장착할 수 없는 부품입니다.' };

  if (slot === 'cannon') {
    const shipDef = getShip(state.currentShipId);
    const slotCount = getCannonSlotCount(shipDef);
    if (slotIndex < 0 || slotIndex >= slotCount) return { ok: false, reason: '이 배에는 그 자리에 대포 슬롯이 없습니다.' };
    if (part.tier > getCannonSlotMaxTier(shipDef, slotIndex)) return { ok: false, reason: '이 슬롯에는 장착할 수 없는 등급입니다.' };
    const current = cannonSlotsArray();
    if (current[slotIndex] === partId) return { ok: false, reason: '이미 장착 중입니다.' };
    if (state.gold < part.price) return { ok: false, reason: '골드가 부족합니다.' };
    state.gold -= part.price;
    const next = current.slice();
    next[slotIndex] = partId;
    state.shipParts = { ...state.shipParts, cannon: next };
  } else {
    if (state.shipParts[slot] === partId) return { ok: false, reason: '이미 장착 중입니다.' };
    if (state.gold < part.price) return { ok: false, reason: '골드가 부족합니다.' };
    state.gold -= part.price;
    state.shipParts = { ...state.shipParts, [slot]: partId };
  }
  const newMax = getCurrentEffectiveShipDef().hp;
  state.shipHp = state.shipHp == null ? newMax : Math.min(state.shipHp, newMax);
  notify({ shipChanged: true });
  return { ok: true };
}

export function unequipPart(slot, slotIndex = 0) {
  if (slot === 'cannon') {
    const current = cannonSlotsArray();
    if (!current[slotIndex]) return { ok: false, reason: '장착된 부품이 없습니다.' };
    const next = current.slice();
    next[slotIndex] = null;
    state.shipParts = { ...state.shipParts, cannon: next };
  } else {
    if (!state.shipParts[slot]) return { ok: false, reason: '장착된 부품이 없습니다.' };
    state.shipParts = { ...state.shipParts, [slot]: null };
  }
  const newMax = getCurrentEffectiveShipDef().hp;
  state.shipHp = state.shipHp == null ? newMax : Math.min(state.shipHp, newMax);
  notify({ shipChanged: true });
  return { ok: true };
}
