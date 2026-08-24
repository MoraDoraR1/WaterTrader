// 향신료 상인(merchant) NPC의 매매 로직 — state.inventory/state.gold를 직접 바꾸고
// UI(hud/marketPanel)에는 결과({ok, reason, ...})만 돌려준다.
import { state, notify } from '../state.js';
import { getShip } from '../data/ships.js';
import { getEffectiveShipDef } from '../data/shipParts.js';
import { CITY_MARKET, getGood } from '../data/goods.js';
import { getCity } from '../data/cities.js';
import { getReputation } from './quests.js';

const REP_PRICE_EFFECT_MAX = 0.10; // 우호도가 REP_CAP에 도달하면 매입가 -10%/매도가 +10%
const REP_CAP = 200;

// 그 도시가 속한 국가와의 우호도를 -1..1로 정규화한 값 — 매입/매도가에 대칭으로 반영한다.
function repFactor(cityId) {
  const country = getCity(cityId)?.country;
  if (!country) return 0;
  const rep = getReputation(country);
  return Math.max(-REP_CAP, Math.min(REP_CAP, rep)) / REP_CAP;
}

export function getCargoCapacity() {
  return getEffectiveShipDef(getShip(state.currentShipId), state.shipParts).cargo;
}

export function getCargoUsed() {
  return state.inventory.reduce((sum, it) => sum + it.qty, 0);
}

export function getMarketRows(cityId) {
  const market = CITY_MARKET[cityId];
  if (!market) return [];
  const f = repFactor(cityId);
  return Object.entries(market).map(([goodId, price]) => {
    const held = state.inventory.find((it) => it.id === goodId);
    const effBuy = Math.max(1, Math.round(price.buy * (1 - f * REP_PRICE_EFFECT_MAX)));
    const effSell = Math.round(price.sell * (1 + f * REP_PRICE_EFFECT_MAX));
    return { good: getGood(goodId), price: { buy: effBuy, sell: effSell }, heldQty: held ? held.qty : 0 };
  });
}

export function buyGood(cityId, goodId, qty) {
  const rows = getMarketRows(cityId);
  const row = rows.find((r) => r.good.id === goodId);
  if (!row) return { ok: false, reason: '이 도시에서는 거래할 수 없는 품목입니다.' };
  const spaceLeft = getCargoCapacity() - getCargoUsed();
  const affordable = Math.floor(state.gold / row.price.buy);
  const actualQty = Math.max(0, Math.min(qty, spaceLeft, affordable));
  if (actualQty <= 0) {
    if (spaceLeft <= 0) return { ok: false, reason: '화물칸이 가득 찼습니다.' };
    return { ok: false, reason: '골드가 부족합니다.' };
  }
  const cost = actualQty * row.price.buy;
  state.gold -= cost;
  const item = state.inventory.find((it) => it.id === goodId);
  if (item) item.qty += actualQty;
  else state.inventory.push({ id: goodId, name: getGood(goodId).name, qty: actualQty });
  notify({ inventoryChanged: true });
  return { ok: true, qty: actualQty, cost };
}

export function sellGood(cityId, goodId, qty) {
  const rows = getMarketRows(cityId);
  const row = rows.find((r) => r.good.id === goodId);
  if (!row) return { ok: false, reason: '이 도시에서는 거래할 수 없는 품목입니다.' };
  const item = state.inventory.find((it) => it.id === goodId);
  const held = item ? item.qty : 0;
  const actualQty = Math.min(qty, held);
  if (actualQty <= 0) return { ok: false, reason: '보유한 물량이 없습니다.' };
  const revenue = actualQty * row.price.sell;
  state.gold += revenue;
  item.qty -= actualQty;
  if (item.qty <= 0) state.inventory = state.inventory.filter((it) => it.id !== goodId);
  notify({ inventoryChanged: true });
  return { ok: true, qty: actualQty, revenue };
}
