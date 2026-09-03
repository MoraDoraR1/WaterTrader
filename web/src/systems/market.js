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

// ---- 동적 시세 ----
// (1) 시간 기반: 도시·품목마다 위상이 다른 완만한 사인파(실시간 기준)로 항상 약간씩 흔들린다
//     — 플레이어가 손대지 않아도 "시장이 살아있다"는 느낌을 준다.
// (2) 공급/수요 기반: 플레이어가 같은 품목을 사들이면(공급 감소) 값이 오르고, 팔면(공급 증가)
//     값이 내린다. 이 변동은 시간이 지나며(반감기 기준) 원래 시세로 서서히 되돌아온다.
const SUPPLY_HALF_LIFE_SEC = 90;
const SUPPLY_ELASTICITY = 0.006; // 거래 1t당 배율 변화
const SUPPLY_MUL_MIN = 0.7, SUPPLY_MUL_MAX = 1.5;
const AMBIENT_AMPLITUDE = 0.06;

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return (((h % 1000) + 1000) % 1000) / 1000; // 0..1
}

function ambientMul(cityId, goodId) {
  const seed = hashSeed(`${cityId}:${goodId}`);
  const periodMs = 240000 + seed * 180000; // 4~6분 주기
  const phase = seed * Math.PI * 2;
  return 1 + Math.sin(((Date.now() / periodMs) * Math.PI * 2) + phase) * AMBIENT_AMPLITUDE;
}

function getSupplyEntry(cityId, goodId) {
  state.marketState = state.marketState || {};
  const cityState = state.marketState[cityId] || (state.marketState[cityId] = {});
  return cityState[goodId] || (cityState[goodId] = { mul: 1, updatedAt: Date.now() });
}

// 마지막 조정 이후 지난 시간만큼 1.0(기준 시세)을 향해 되돌린 현재 배율을 반환하고, 그 결과를 저장해둔다.
function decayedSupplyMul(cityId, goodId) {
  const entry = getSupplyEntry(cityId, goodId);
  const elapsedSec = Math.max(0, (Date.now() - entry.updatedAt) / 1000);
  const decay = Math.pow(0.5, elapsedSec / SUPPLY_HALF_LIFE_SEC);
  entry.mul = 1 + (entry.mul - 1) * decay;
  entry.updatedAt = Date.now();
  return entry.mul;
}

// 매매 후 호출 — direction: 구매 +1(공급 감소→값 상승), 판매 -1(공급 증가→값 하락)
function nudgeSupply(cityId, goodId, qty, direction) {
  decayedSupplyMul(cityId, goodId); // 먼저 그동안의 감쇠를 반영
  const entry = getSupplyEntry(cityId, goodId);
  const delta = direction * Math.min(0.35, qty * SUPPLY_ELASTICITY);
  entry.mul = Math.max(SUPPLY_MUL_MIN, Math.min(SUPPLY_MUL_MAX, entry.mul + delta));
  entry.updatedAt = Date.now();
}

export function getCargoCapacity() {
  return getEffectiveShipDef(getShip(state.currentShipId), state.shipParts).cargo;
}

export function getCargoUsed() {
  return state.inventory.reduce((sum, it) => sum + it.qty, 0);
}

// ---- 원산지 거리 프리미엄 ----
// 실제 교역이 그랬듯, 어떤 상품이든 그 상품을 가장 싸게 파는(=원산지) 항구에서 멀리 떨어질수록
// 매도가가 자연히 더 붙는다. 수작업 가격표가 아니라 실제 지도 좌표 간 거리에서 그대로 계산되므로,
// 새 항구를 추가해도 "먼 곳까지 실어 나를수록 남는다"는 구조가 저절로 성립한다.
const DISTANCE_PREMIUM_K = 1.6; // 두캇 = K * sqrt(원산지까지 거리)

let originCache = null;
function findOrigin(goodId) {
  if (!originCache) originCache = {};
  if (goodId in originCache) return originCache[goodId];
  let bestCity = null, bestBuy = Infinity;
  for (const [cid, market] of Object.entries(CITY_MARKET)) {
    const p = market[goodId];
    if (p && p.buy < bestBuy) { bestBuy = p.buy; bestCity = cid; }
  }
  originCache[goodId] = bestCity;
  return bestCity;
}

function distancePremium(cityId, goodId) {
  const origin = findOrigin(goodId);
  if (!origin || origin === cityId) return 0;
  const a = getCity(cityId)?.pos, b = getCity(origin)?.pos;
  if (!a || !b) return 0;
  const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
  return Math.round(DISTANCE_PREMIUM_K * Math.sqrt(dist));
}

export function getMarketRows(cityId) {
  const market = CITY_MARKET[cityId];
  if (!market) return [];
  const f = repFactor(cityId);
  return Object.entries(market).map(([goodId, price]) => {
    const held = state.inventory.find((it) => it.id === goodId);
    const dynMul = decayedSupplyMul(cityId, goodId) * ambientMul(cityId, goodId);
    const effBuy = Math.max(1, Math.round(price.buy * (1 - f * REP_PRICE_EFFECT_MAX) * dynMul));
    const premium = distancePremium(cityId, goodId);
    const effSell = Math.max(1, Math.round(price.sell * (1 + f * REP_PRICE_EFFECT_MAX) * dynMul) + premium);
    const trend = dynMul > 1.04 ? 'up' : dynMul < 0.96 ? 'down' : 'flat';
    return { good: getGood(goodId), price: { buy: effBuy, sell: effSell }, heldQty: held ? held.qty : 0, trend };
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
  nudgeSupply(cityId, goodId, actualQty, 1);
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
  nudgeSupply(cityId, goodId, actualQty, -1);
  notify({ inventoryChanged: true });
  return { ok: true, qty: actualQty, revenue };
}
