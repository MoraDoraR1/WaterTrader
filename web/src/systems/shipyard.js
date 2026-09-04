// 조선소 NPC 상호작용의 실제 비즈니스 로직(구매/수리/부품 장착/함대 편성) — state를 직접
// 변경하고 UI(hud/cityScene)에는 결과({ok, reason})만 돌려준다. 화면 렌더링은 관여하지 않는다.
import { state, notify, initShipHp } from '../state.js';
import { getShip } from '../data/ships.js';
import { getPart, getEffectiveShipDef } from '../data/shipParts.js';

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
  return Math.round((missing / shipDef.hp) * shipDef.price * REPAIR_RATE);
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

export const SEA_REPAIR_PCT_PER_MATERIAL = 0.10; // 자재 1개당 채워지는 내구도 비율(그 배의 최대 내구도 기준)

// 바다 위에서 화물칸의 자재를 소모해 응급 수리한다 — 항구까지 갈 여유가 없을 때 쓰는 부분
// 수리 수단이라, 조선소처럼 골드는 안 들지만 한 번에 자재 1개당 최대 내구도의 10%만 채운다
// (조선소의 "골드만으로 즉시 전액 수리"와 역할이 겹치지 않게 일부러 완전 수리는 못 하게 뒀다).
export function repairAtSea() {
  const shipDef = getCurrentEffectiveShipDef();
  if (state.shipHp >= shipDef.hp) return { ok: false, reason: '이미 완전한 상태입니다.' };
  if (state.materials < 1) return { ok: false, reason: '자재가 부족합니다 (항구 관리인에게 보급받으세요).' };
  state.materials -= 1;
  const healed = Math.min(shipDef.hp - state.shipHp, Math.round(shipDef.hp * SEA_REPAIR_PCT_PER_MATERIAL));
  state.shipHp += healed;
  notify({ hpChanged: true });
  return { ok: true, healed };
}

export function equipPart(slot, partId) {
  const part = getPart(partId);
  if (!part || part.slot !== slot) return { ok: false, reason: '장착할 수 없는 부품입니다.' };
  if (state.shipParts[slot] === partId) return { ok: false, reason: '이미 장착 중입니다.' };
  if (state.gold < part.price) return { ok: false, reason: '골드가 부족합니다.' };

  state.gold -= part.price;
  state.shipParts = { ...state.shipParts, [slot]: partId };
  const newMax = getCurrentEffectiveShipDef().hp;
  state.shipHp = state.shipHp == null ? newMax : Math.min(state.shipHp, newMax);
  notify({ shipChanged: true });
  return { ok: true };
}

export function unequipPart(slot) {
  if (!state.shipParts[slot]) return { ok: false, reason: '장착된 부품이 없습니다.' };
  state.shipParts = { ...state.shipParts, [slot]: null };
  const newMax = getCurrentEffectiveShipDef().hp;
  state.shipHp = state.shipHp == null ? newMax : Math.min(state.shipHp, newMax);
  notify({ shipChanged: true });
  return { ok: true };
}
