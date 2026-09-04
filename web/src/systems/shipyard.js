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
  state.fleet = [...state.fleet, { uid: makeUid(), shipId, shipHp: target.hp, shipParts: {}, name: null }];
  notify({ fleetChanged: true });
  return { ok: true };
}

// 예비 함대의 배를 지금 조종 중인 기함과 맞바꾼다(비용 없음, 즉시 전환).
export function setActiveShip(uid) {
  const idx = state.fleet.findIndex((f) => f.uid === uid);
  if (idx < 0) return { ok: false, reason: '함대에 없는 배입니다.' };
  const incoming = state.fleet[idx];
  const outgoing = { uid: makeUid(), shipId: state.currentShipId, shipHp: state.shipHp, shipParts: state.shipParts, name: null };

  const nextFleet = state.fleet.filter((f) => f.uid !== uid);
  nextFleet.push(outgoing);
  state.fleet = nextFleet;

  state.currentShipId = incoming.shipId;
  state.shipParts = incoming.shipParts || {};
  state.shipHp = incoming.shipHp;
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

export const REPAIR_MATERIAL_COST = 1; // 수리 1회(완전 수리)당 자재 소모량 — 배의 창고(화물칸)에서 차감된다.

export function repairCost() {
  const shipDef = getCurrentEffectiveShipDef();
  const missing = Math.max(0, shipDef.hp - state.shipHp);
  return Math.round((missing / shipDef.hp) * shipDef.price * REPAIR_RATE);
}

export function repairShip() {
  const shipDef = getCurrentEffectiveShipDef();
  if (state.shipHp >= shipDef.hp) return { ok: false, reason: '이미 완전한 상태입니다.' };
  if (state.materials < REPAIR_MATERIAL_COST) return { ok: false, reason: `자재가 부족합니다 (${REPAIR_MATERIAL_COST}개 필요 — 항구 관리인에게 보급받으세요).` };
  const cost = repairCost();
  if (state.gold < cost) return { ok: false, reason: '골드가 부족합니다.' };
  state.gold -= cost;
  state.materials -= REPAIR_MATERIAL_COST;
  state.shipHp = shipDef.hp;
  notify({ hpChanged: true });
  return { ok: true };
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
