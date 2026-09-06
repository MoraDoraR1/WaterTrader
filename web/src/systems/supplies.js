// 식량/식수/자재/포탄 — 교역품과 같은 화물칸을 나눠 쓰는 소모품. 모든 항구(항구 관리인)에서
// 같은 값으로 살 수 있다(원산지가 있는 사치품이 아니라 어디서나 조달 가능한 생필품/군수품이라
// 도시마다 값을 달리 매기지 않는다).
import { state, notify } from '../state.js';
import { getCargoCapacity, getCargoUsed } from './market.js';
import { getShip } from '../data/ships.js';
import { mulSkillEffect } from '../data/shipSkills.js';

// desc/effect: ui/suppliesPanel.js가 이름 툴팁(ui/tooltip.js)을 만들 때 쓰는 설명·효과 텍스트.
export const SUPPLY_DEFS = {
  food: { id: 'food', name: '식량', icon: '🍖', price: 2,
    desc: '선원들이 매일 먹는 양식.', effect: '항해일자 1일당 선원 1인분 소모 — 바닥나면 사기·선체가 상하고 선원 수까지 줄어든다' },
  water: { id: 'water', name: '식수', icon: '💧', price: 1,
    desc: '선원들의 갈증을 달래는 식수 — 식량보다 값은 싸지만 부족했을 때 피해는 더 크다.', effect: '항해일자 1일당 1개 소모 — 바닥나면 사기·선체가 상하고 선원 수까지 줄어든다' },
  materials: { id: 'materials', name: '자재', icon: '🪵', price: 8,
    desc: '선체 응급 수리와 일부 함선 건조에 두루 쓰이는 목재·철물 등 잡다한 조선 자재.', effect: '바다 위 응급 수리 소모품 + 일부 함선의 건조 재료' },
  cannonballs: { id: 'cannonballs', name: '포탄', icon: '💣', price: 4,
    desc: '함포 발사에 쓰는 포탄 — 대포를 아무리 장착해도 이게 없으면 발사 자체가 불가능하다.', effect: '일제사격 1회당 1개 소모' },
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
