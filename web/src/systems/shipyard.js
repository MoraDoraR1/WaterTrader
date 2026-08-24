// 조선소 NPC 상호작용의 실제 비즈니스 로직(구매/수리/부품 장착) — state를 직접 변경하고
// UI(hud/cityScene)에는 결과({ok, reason})만 돌려준다. 화면 렌더링은 이 모듈이 관여하지 않는다.
import { state, notify, initShipHp } from '../state.js';
import { getShip } from '../data/ships.js';
import { getPart, getEffectiveShipDef } from '../data/shipParts.js';

const TRADE_IN_RATE = 0.4; // 기존 배를 넘길 때 받는 가치 비율(조선비 대비)
const REPAIR_RATE = 0.6; // 완전 파손 상태에서 전액 수리할 때 드는 비용 = 조선비 * 이 비율

export function getCurrentEffectiveShipDef() {
  return getEffectiveShipDef(getShip(state.currentShipId), state.shipParts);
}

export function tradeInValue() {
  const shipDef = getShip(state.currentShipId);
  return shipDef ? Math.round(shipDef.price * TRADE_IN_RATE) : 0;
}

export function buyShip(shipId) {
  if (shipId === state.currentShipId) return { ok: false, reason: '이미 보유한 배입니다.' };
  const target = getShip(shipId);
  if (!target) return { ok: false, reason: '존재하지 않는 배입니다.' };
  const netCost = Math.max(0, target.price - tradeInValue());
  if (state.gold < netCost) return { ok: false, reason: '골드가 부족합니다.' };
  const hadParts = Object.values(state.shipParts || {}).some(Boolean);

  state.gold -= netCost;
  state.currentShipId = shipId;
  state.shipParts = {};
  initShipHp();
  notify({ shipChanged: true });
  return { ok: true, hadParts };
}

export function repairCost() {
  const shipDef = getCurrentEffectiveShipDef();
  const missing = Math.max(0, shipDef.hp - state.shipHp);
  return Math.round((missing / shipDef.hp) * shipDef.price * REPAIR_RATE);
}

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
