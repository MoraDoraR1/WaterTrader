// 향신료 상인(merchant) NPC의 매매 로직 — state.inventory/state.gold를 직접 바꾸고
// UI(hud/marketPanel)에는 결과({ok, reason, ...})만 돌려준다.
import { state, notify } from '../state.js';
import { getShip } from '../data/ships.js';
import { getEffectiveShipDef } from '../data/shipParts.js';
import { CITY_MARKET, getGood } from '../data/goods.js';

export function getCargoCapacity() {
  return getEffectiveShipDef(getShip(state.currentShipId), state.shipParts).cargo;
}

export function getCargoUsed() {
  return state.inventory.reduce((sum, it) => sum + it.qty, 0);
}

export function getMarketRows(cityId) {
  const market = CITY_MARKET[cityId];
  if (!market) return [];
  return Object.entries(market).map(([goodId, price]) => {
    const held = state.inventory.find((it) => it.id === goodId);
    return { good: getGood(goodId), price, heldQty: held ? held.qty : 0 };
  });
}

export function buyGood(cityId, goodId, qty) {
  const price = CITY_MARKET[cityId]?.[goodId];
  if (!price) return { ok: false, reason: '이 도시에서는 거래할 수 없는 품목입니다.' };
  const spaceLeft = getCargoCapacity() - getCargoUsed();
  const affordable = Math.floor(state.gold / price.buy);
  const actualQty = Math.max(0, Math.min(qty, spaceLeft, affordable));
  if (actualQty <= 0) {
    if (spaceLeft <= 0) return { ok: false, reason: '화물칸이 가득 찼습니다.' };
    return { ok: false, reason: '골드가 부족합니다.' };
  }
  const cost = actualQty * price.buy;
  state.gold -= cost;
  const item = state.inventory.find((it) => it.id === goodId);
  if (item) item.qty += actualQty;
  else state.inventory.push({ id: goodId, name: getGood(goodId).name, qty: actualQty });
  notify({ inventoryChanged: true });
  return { ok: true, qty: actualQty, cost };
}

export function sellGood(cityId, goodId, qty) {
  const price = CITY_MARKET[cityId]?.[goodId];
  if (!price) return { ok: false, reason: '이 도시에서는 거래할 수 없는 품목입니다.' };
  const item = state.inventory.find((it) => it.id === goodId);
  const held = item ? item.qty : 0;
  const actualQty = Math.min(qty, held);
  if (actualQty <= 0) return { ok: false, reason: '보유한 물량이 없습니다.' };
  const revenue = actualQty * price.sell;
  state.gold += revenue;
  item.qty -= actualQty;
  if (item.qty <= 0) state.inventory = state.inventory.filter((it) => it.id !== goodId);
  notify({ inventoryChanged: true });
  return { ok: true, qty: actualQty, revenue };
}
