// 식량/식수/자재/포탄 — 교역품과 같은 화물칸을 나눠 쓰는 소모품. 모든 항구(항구 관리인)에서
// 같은 값으로 살 수 있다(원산지가 있는 사치품이 아니라 어디서나 조달 가능한 생필품/군수품이라
// 도시마다 값을 달리 매기지 않는다).
import { state, notify } from '../state.js';
import { getCargoCapacity, getCargoUsed } from './market.js';
import { getShip } from '../data/ships.js';
import { mulSkillEffect } from '../data/shipSkills.js';

export const SUPPLY_DEFS = {
  food: { id: 'food', name: '식량', icon: '🍖', price: 2 },
  water: { id: 'water', name: '식수', icon: '💧', price: 1 },
  materials: { id: 'materials', name: '자재', icon: '🪵', price: 8 },
  cannonballs: { id: 'cannonballs', name: '포탄', icon: '💣', price: 4 },
};

export function buySupply(type, qty) {
  const def = SUPPLY_DEFS[type];
  if (!def) return { ok: false, reason: '알 수 없는 물자입니다.' };
  // 대량 구매 스킬 — 식량/식수/자재/포탄 등 모든 보급품 구매가를 일괄로 깎아준다.
  const unitPrice = def.price * mulSkillEffect(getShip(state.currentShipId), 'supplyBuyPriceMul', 1);
  const spaceLeft = getCargoCapacity() - getCargoUsed();
  const affordable = Math.floor(state.gold / unitPrice);
  const actualQty = Math.max(0, Math.min(qty, spaceLeft, affordable));
  if (actualQty <= 0) {
    if (spaceLeft <= 0) return { ok: false, reason: '화물칸이 가득 찼습니다.' };
    return { ok: false, reason: '골드가 부족합니다.' };
  }
  const cost = Math.round(actualQty * unitPrice);
  state.gold -= cost;
  state[type] += actualQty;
  notify({ suppliesChanged: true });
  return { ok: true, qty: actualQty, cost };
}

export function sellSupply(type, qty) {
  const def = SUPPLY_DEFS[type];
  if (!def) return { ok: false, reason: '알 수 없는 물자입니다.' };
  const held = state[type];
  const actualQty = Math.max(0, Math.min(qty, held));
  if (actualQty <= 0) return { ok: false, reason: '보유한 물량이 없습니다.' };
  const revenue = Math.round(actualQty * def.price * 0.5); // 되팔 때는 절반값(생필품은 마진이 없다)
  state.gold += revenue;
  state[type] -= actualQty;
  notify({ suppliesChanged: true });
  return { ok: true, qty: actualQty, revenue };
}
