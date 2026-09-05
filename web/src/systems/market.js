// 향신료 상인(merchant) NPC의 매매 로직 — state.inventory/state.gold를 직접 바꾸고
// UI(hud/marketPanel)에는 결과({ok, reason, ...})만 돌려준다.
import { state, notify } from '../state.js';
import { getShip } from '../data/ships.js';
import { getEffectiveShipDef } from '../data/shipParts.js';
import { mulSkillEffect } from '../data/shipSkills.js';
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
const SUPPLY_ELASTICITY = 0.006; // 거래 1t당 배율 변화 — 시간에 따라 되돌아오는 "체감" 변동용
const SUPPLY_MUL_MIN = 0.75, SUPPLY_MUL_MAX = 1.3;
// 한 번의 매매를 이 단위로 잘게 쪼개 체결한다 — 매 조각마다 직전 조각이 반영된 최신 가격을
// 다시 조회한다(화물칸 전체를 단일가로 후려치듯 사고파는 걸 막는다).
const TRADE_CHUNK_SIZE = 5;

// ---- 항해일자 기반 시세 사이클("주식처럼") ----
// 예전엔 실시간 초 단위 사인파(ambientMul)로 시세가 늘 미세하게 흔들렸는데, 그러면 "왜
// 지금 가격이 바뀌었는지"를 플레이어가 납득할 기준이 없었다. 대신 이미 화면에 표시되는
// 항해일자(voyageDay, 1일=실제 1분)를 그대로 시세 갱신 주기로 쓴다 — 5항해일(=실제 5분)이
// 지날 때마다 도시·품목별로 "한 걸음"씩만 오르내리고, 그 사이엔 값이 고정된다(주식 종가
// 개념). 걸음의 크기는 품목 카테고리별로 달리해서(향신료·명품은 원래도 흉작/원산지 정세에
// 따라 값이 크게 출렁였다는 고증), 실제 대항해시대 무역품의 가격 변동성 차이를 재현한다.
// 다만 완전 랜덤워크로 두면 여러 사이클이 지나며 한쪽으로 계속 쏠려(디플레/인플레) 밸런스가
// 무너지므로, 매 걸음마다 100%(원래 시세) 쪽으로 살짝 되돌리는 평균회귀 항을 더하고 상하한
// (85%~120%)을 하드 클램프한다 — 거래량 자체엔 이미 VOLUME_CAP이 별도의 하드 상한을
// 걸어두었으니, 이 사이클은 절대적 이득 규모가 아니라 "가격이 오르내리는 재미"만 담당한다.
const CYCLE_DAYS = 5;
const CYCLE_SECONDS = CYCLE_DAYS * 60; // 항해일자 1일 = 실제 60초(weather.js DAY_CYCLE_SECONDS와 동일 기준)
const CYCLE_STEP_BASE = 0.045; // 사이클 1회당 기본 변동폭(±4.5%) — 아래 카테고리 배율로 조정
const CYCLE_REVERSION = 0.25; // 매 걸음마다 100% 쪽으로 되돌리는 비율 — 상하한에 오래 눌러붙지 않고 계속 출렁이도록(디플레/인플레 누적 방지 겸용)
const CYCLE_MUL_MIN = 0.85, CYCLE_MUL_MAX = 1.2;
// 향신료(후추·정향·육두구 등)는 흉작·산지 정세로 값이 크게 뛰던 실제 사료를 반영해 가장
// 변동성이 크고, 포도주·모직물·주석 같은 대량 생산 벌크 상품(goods)은 가장 안정적이다.
const CATEGORY_VOLATILITY = { spice: 1.3, luxury: 1.1, goods: 0.7 };

// ---- 항구별 즉시 소화 물량 한도("시장 깊이") ----
// 위의 supply-mul은 "값이 서서히 변한다"는 체감용이지, 그 자체로는 배가 커질수록 무제한으로
// 퍼갈 수 있는 문제를 못 막는다(마진이 아무리 낮아져도 톤수를 늘리면 절대 이문은 그대로 비례
// 해서 커진다 — 실측: 700t급 배로 리스본↔세비야만 반복했더니 30분 만에 30만 두캇, 최고가
// 배(22,000두캇)의 13배). 그래서 "이 항구가 이 품목을 한 번에 소화할 수 있는 물량" 자체에
// 하드캡을 둔다 — 배가 아무리 커도 한 항구·한 품목에서 이 이상은 거래가 안 되고, 시간이
// 지나야(다른 도시를 돌고 오는 정도) 다시 채워진다. 큰 배는 여러 품목·여러 항구로 분산해야
// 화물칾을 다 채울 수 있게 되어, "한 항로만 무한 반복"이 성립하지 않는다.
const VOLUME_CAP = 70; // 항구 1곳·품목 1개당 한 번에 소화 가능한 최대 물량(t)
const VOLUME_REGEN_SEC = 480; // 이 시간에 걸쳐 물량이 완전히 다시 찬다(선형 회복)

function getVolumeEntry(cityId, goodId) {
  state.marketVolume = state.marketVolume || {};
  const cityState = state.marketVolume[cityId] || (state.marketVolume[cityId] = {});
  return cityState[goodId] || (cityState[goodId] = { remaining: VOLUME_CAP, updatedAt: Date.now() });
}

// 지난 시간만큼 회복시킨 뒤 현재 남은 소화 물량을 돌려준다(다른 물량은 전부 정수 톤이라
// 여기도 내림해서 맞춘다 — 안 그러면 "0.017t 구매" 같은 부스러기 거래가 생긴다).
function availableVolume(cityId, goodId) {
  const entry = getVolumeEntry(cityId, goodId);
  const elapsedSec = Math.max(0, (Date.now() - entry.updatedAt) / 1000);
  entry.remaining = Math.min(VOLUME_CAP, entry.remaining + elapsedSec * (VOLUME_CAP / VOLUME_REGEN_SEC));
  entry.updatedAt = Date.now();
  return Math.floor(entry.remaining);
}

function consumeVolume(cityId, goodId, qty) {
  const entry = getVolumeEntry(cityId, goodId);
  entry.remaining = Math.max(0, entry.remaining - qty);
  entry.updatedAt = Date.now();
}

// 문자열 -> [0,1) 결정적 의사난수. 대호황/대폭락처럼 "1.2% 확률" 같은 희귀 이벤트를 이
// 값 하나로 판정하다 보니, 단순 다항 해시(* 31 + charCode)는 "event:도시명:연속된정수" 같은
// 비슷한 입력에서 눈사태 효과(avalanche)가 약해 도시별로 당첨 버킷이 심하게 뭉치거나
// 아예 안 나오는 문제가 실측으로 확인됐다(세비야·이스탄불이 3000항해일 동안 단 한 번도
// 이벤트가 안 뜸). murmur3 fmix32 마무리 단계를 더해 입력이 조금만 달라져도 출력이 크게
// 흩어지게 했다 — cycleMul 등 기존 호출부는 그대로 두되 결과 품질만 개선된다.
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x9e3779b1);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296; // 0..1
}

function cycleBucket() {
  return Math.floor(state.dayTimer / CYCLE_SECONDS);
}

function getCycleEntry(cityId, goodId) {
  state.marketCycle = state.marketCycle || {};
  const cityState = state.marketCycle[cityId] || (state.marketCycle[cityId] = {});
  return cityState[goodId] || (cityState[goodId] = { mul: 1, bucket: cycleBucket() });
}

// 사이클(5항해일)이 넘어간 만큼만 걸음을 걷는다 — 같은 사이클 안에서 몇 번을 조회하든
// 값은 그대로다(종가 개념). 오래 항해해 여러 사이클을 한 번에 건너뛰어도(예: 장시간 항해)
// 지나간 사이클 수만큼 순차로 걸어가되, 과도한 연산을 막기 위해 최대 24걸음(120항해일)까지만
// 반영한다 — 그 이상은 어차피 상하한에 수렴해 있을 값이라 결과가 같다.
function cycleMul(cityId, goodId) {
  const entry = getCycleEntry(cityId, goodId);
  const bucket = cycleBucket();
  const steps = Math.min(24, Math.max(0, bucket - entry.bucket));
  if (steps > 0) {
    const vol = CATEGORY_VOLATILITY[getGood(goodId)?.category] || 1;
    for (let i = 0; i < steps; i++) {
      const stepBucket = entry.bucket + i + 1;
      const seed = hashSeed(`${cityId}:${goodId}:${stepBucket}`);
      const randStep = (seed * 2 - 1) * CYCLE_STEP_BASE * vol;
      const reversion = (1 - entry.mul) * CYCLE_REVERSION;
      entry.mul = Math.max(CYCLE_MUL_MIN, Math.min(CYCLE_MUL_MAX, entry.mul + randStep + reversion));
    }
    entry.bucket = bucket;
  }
  return entry.mul;
}

// ---- 도시 대호황/대폭락 이벤트 ----
// 위의 5일 사이클이 "일상적인 시세 출렁임"이라면 이건 훨씬 드물고 훨씬 극단적인 "사건"이다.
// 도시 하나가 통째로 대호황(전 품목 매입/매도가 150~170%)이나 대폭락(40~50%)에 빠져, 그
// 도시에서 사고파는 모든 품목에 동일하게 걸린다 — 실제로 그 항구에 풍작/흉작 같은 큰 사건이
// 터진 셈이다. 항해일자 1일마다 아주 낮은 확률로 새로 발생하고, 며칠 지속되다 사라진다.
// 도시에 직접 있어야만 알 수 있는 게 아니라 항해 중 근처를 지나거나 전체지도를 볼 때도
// 눈에 띄게 해서(getCityEvent), "지금 저기가 대호황이라던데 가볼까" 하는 운에 따른 기대
// (도파민)와 "다 팔고 왔더니 폭락 중이었네" 하는 실망(리스크)을 함께 만든다.
const EVENT_DAY_SECONDS = 60; // 항해일자 1일마다 새 이벤트 발생 여부를 굴린다
const EVENT_TRIGGER_CHANCE = 0.012; // 이벤트가 없는 도시가 하루에 새로 이벤트를 맞을 확률(69개 항구 기준 상시 3~4곳 정도가 진행 중인 빈도)
const EVENT_DURATION_MIN_DAYS = 3, EVENT_DURATION_MAX_DAYS = 6;
const EVENT_CRASH_MUL_MIN = 0.40, EVENT_CRASH_MUL_MAX = 0.50;
const EVENT_BOOM_MUL_MIN = 1.50, EVENT_BOOM_MUL_MAX = 1.70;

function eventDayBucket() {
  return Math.floor(state.dayTimer / EVENT_DAY_SECONDS);
}

function getCityEventEntry(cityId) {
  state.cityEvents = state.cityEvents || {};
  return state.cityEvents[cityId] || (state.cityEvents[cityId] = { type: null, mul: 1, endBucket: 0, checkedBucket: eventDayBucket() });
}

// 진행 중인 이벤트가 있으면 만료 여부만 확인하고, 없으면 지난 하루하루에 대해(최대 30일치)
// 발생 여부를 결정적 시드로 굴려서 첫 발생을 찾는다 — cycleMul과 같은 방식이라 Math.random()
// 없이도 재현 가능하고 저장/불러오기에도 자연스럽게 이어진다.
function cityEventMul(cityId) {
  const entry = getCityEventEntry(cityId);
  const bucket = eventDayBucket();
  if (entry.type && bucket >= entry.endBucket) {
    entry.type = null;
    entry.mul = 1;
  }
  if (!entry.type) {
    const steps = Math.min(30, Math.max(0, bucket - entry.checkedBucket));
    for (let i = 0; i < steps; i++) {
      const b = entry.checkedBucket + i + 1;
      const rollSeed = hashSeed(`event:${cityId}:${b}`);
      if (rollSeed < EVENT_TRIGGER_CHANCE) {
        const typeSeed = hashSeed(`eventtype:${cityId}:${b}`);
        const magSeed = hashSeed(`eventmag:${cityId}:${b}`);
        const durSeed = hashSeed(`eventdur:${cityId}:${b}`);
        const isBoom = typeSeed >= 0.5;
        entry.type = isBoom ? 'boom' : 'crash';
        entry.mul = isBoom
          ? EVENT_BOOM_MUL_MIN + magSeed * (EVENT_BOOM_MUL_MAX - EVENT_BOOM_MUL_MIN)
          : EVENT_CRASH_MUL_MIN + magSeed * (EVENT_CRASH_MUL_MAX - EVENT_CRASH_MUL_MIN);
        const duration = Math.round(EVENT_DURATION_MIN_DAYS + durSeed * (EVENT_DURATION_MAX_DAYS - EVENT_DURATION_MIN_DAYS));
        entry.endBucket = b + duration;
        break; // 이미 발생했으니 나머지 날짜는 다음 조회 때(만료 이후) 이어서 굴린다
      }
    }
    entry.checkedBucket = bucket;
  }
  return entry.mul;
}

// UI(월드맵/입항 배너/시장창)에서 쓰는 조회용 — 이 도시가 지금 대호황/대폭락 중인지, 며칠
// 남았는지. 호출할 때마다 만료 판정과 새 발생 롤을 함께 갱신하므로 어디서 불러도 최신값이다.
export function getCityEvent(cityId) {
  const mul = cityEventMul(cityId);
  const entry = state.cityEvents?.[cityId];
  if (!entry || !entry.type) return { active: false };
  const daysLeft = Math.max(1, entry.endBucket - eventDayBucket());
  return { active: true, type: entry.type, mul, daysLeft };
}

// 여러 UI(시장창/입항 배너/전체지도)에서 같은 문구를 그대로 재사용하기 위한 포맷터.
export function formatCityEventBadge(cityId) {
  const ev = getCityEvent(cityId);
  if (!ev.active) return '';
  const pct = Math.round(ev.mul * 100);
  return ev.type === 'boom' ? `🔥 대호황 ${pct}% (${ev.daysLeft}일 후 종료)` : `💥 대폭락 ${pct}% (${ev.daysLeft}일 후 종료)`;
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

// 화물칸은 교역품뿐 아니라 식량·식수·자재·포탄도 함께 나눠 쓴다(systems/supplies.js).
export function getCargoUsed() {
  const goodsQty = state.inventory.reduce((sum, it) => sum + it.qty, 0);
  return goodsQty + state.food + state.water + state.materials + state.cannonballs;
}

// ---- 원산지 거리 프리미엄 ----
// 실제 교역이 그랬듯, 원산지에서 멀리 떨어질수록 매도가에 프리미엄이 붙는다 — 다만 그 크기는
// 반드시 "원산지 매입가에 비례한 배율"이어야 한다. 예전엔 거리만으로 정해지는 정액 보너스라,
// 후추·포도주 같은 값싼 벌크 상품의 마진률(300%대)이 정향·육두구 같은 진짜 귀중품(60~130%대)
// 보다 오히려 커지는 역전 현상이 실측으로 확인됐다(가격 밸런스 폴리싱의 의도와 정반대).
// 배율 기반으로 바꾸면 "비싼 물건일수록 멀리 실어 날랐을 때 절대 이문도 크다"가 자연히 성립한다.
const DISTANCE_PREMIUM_K = 1.8; // 배율 = K * sqrt(거리) / 100
const DISTANCE_PREMIUM_MAX_MUL = 3.0; // 아무리 멀어도 원산지 매입가의 이 배수를 넘지 않는다

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
  const originBuy = CITY_MARKET[origin]?.[goodId]?.buy || 1;
  const mul = Math.min(DISTANCE_PREMIUM_MAX_MUL, (DISTANCE_PREMIUM_K * Math.sqrt(dist)) / 100);
  return Math.round(originBuy * mul);
}

export function getMarketRows(cityId) {
  const market = CITY_MARKET[cityId];
  if (!market) return [];
  const f = repFactor(cityId);
  const eventMul = cityEventMul(cityId); // 대호황/대폭락 — 도시 전체에 한 번만 굴리고 모든 품목에 동일 적용
  return Object.entries(market).map(([goodId, price]) => {
    const held = state.inventory.find((it) => it.id === goodId);
    const dynMul = decayedSupplyMul(cityId, goodId) * cycleMul(cityId, goodId) * eventMul;
    const effBuy = Math.max(1, Math.round(price.buy * (1 - f * REP_PRICE_EFFECT_MAX) * dynMul));
    const myShipDef = getShip(state.currentShipId);
    // 장거리 물류/신항로 개척 스킬은 거리 프리미엄 자체를 키워준다(멀리서 실어온 물건일수록
    // 이 배로는 더 큰 웃돈이 붙는다). 능숙한 흥정 스킬은 매도가 전체에 고정 배율로 붙는다.
    const premium = distancePremium(cityId, goodId) * mulSkillEffect(myShipDef, 'distancePremiumMul', 1);
    // 거리 프리미엄도 dynMul(공급/수요 압박 + 항해일자 사이클)에 함께 물린다 — 예전엔 프리미엄을
    // dynMul 적용 "이후"에 더해서 아무리 대량으로 팔아 시세를 짓눌러도 프리미엄만큼은 절대 안
    // 깎이는 구멍이 있었다(실측: 팔면 팔수록 마진률이 바닥을 쳐야 하는데 79→67로 15%밖에 안 빠짐).
    const effSell = Math.max(1, Math.round((price.sell + premium) * (1 + f * REP_PRICE_EFFECT_MAX) * dynMul
      * mulSkillEffect(myShipDef, 'sellPriceMul', 1)));
    // pct: "원래 설정된 가격(도시별 매입/매도가)을 100%로 뒀을 때 지금이 몇 %인지" — 주식
    // 현재가/기준가처럼, 이 도시 이 품목의 시세가 그동안 얼마나 오르내렸는지 그대로 보여준다.
    const pct = Math.round(dynMul * 100);
    const trend = pct > 100 ? 'up' : pct < 100 ? 'down' : 'flat';
    return { good: getGood(goodId), price: { buy: effBuy, sell: effSell }, heldQty: held ? held.qty : 0, trend, pct };
  });
}

export function buyGood(cityId, goodId, qty) {
  if (!CITY_MARKET[cityId]?.[goodId]) return { ok: false, reason: '이 도시에서는 거래할 수 없는 품목입니다.' };
  let remaining = Math.max(0, qty);
  let totalQty = 0, totalCost = 0;
  while (remaining > 0) {
    const row = getMarketRows(cityId).find((r) => r.good.id === goodId);
    const spaceLeft = getCargoCapacity() - getCargoUsed();
    const affordable = Math.floor(state.gold / row.price.buy);
    const volumeLeft = availableVolume(cityId, goodId);
    const chunk = Math.max(0, Math.min(remaining, TRADE_CHUNK_SIZE, spaceLeft, affordable, volumeLeft));
    if (chunk <= 0) break;
    const cost = chunk * row.price.buy;
    state.gold -= cost;
    const item = state.inventory.find((it) => it.id === goodId);
    if (item) item.qty += chunk;
    else state.inventory.push({ id: goodId, name: getGood(goodId).name, qty: chunk });
    nudgeSupply(cityId, goodId, chunk, 1);
    consumeVolume(cityId, goodId, chunk);
    totalQty += chunk;
    totalCost += cost;
    remaining -= chunk;
  }
  if (totalQty <= 0) {
    if (getCargoCapacity() - getCargoUsed() <= 0) return { ok: false, reason: '화물칸이 가득 찼습니다.' };
    if (availableVolume(cityId, goodId) <= 0) return { ok: false, reason: '이 항구에 남은 물량이 없습니다. 시간이 지나면 다시 채워집니다.' };
    return { ok: false, reason: '골드가 부족합니다.' };
  }
  notify({ inventoryChanged: true });
  return { ok: true, qty: totalQty, cost: totalCost };
}

// ---- 아시아(한국·일본·중국) 물물교환 ----
// 이 세 나라 항구는 두캇 현금이 아니라 "가져온 무역품의 가치"를 그 항구가 취급하는
// 다른 물품으로 맞바꾼다. 가치 기준은 GOODS.basePrice(품목 고유의 절대 기준가)로 고정해
// 어느 항구를 거치든 같은 물건은 같은 가치로 쳐준다. 이렇게 얻은 물품을 아시아 밖 항구에서
// 팔아야 비로소 두캇으로 바뀐다.
export function isBarterCity(cityId) {
  return !!getCity(cityId)?.barter;
}

export function goodValue(goodId) {
  return getGood(goodId)?.basePrice || 1;
}

export function barterGoods(cityId, giveGoodId, giveQty, receiveGoodId) {
  const market = CITY_MARKET[cityId];
  if (!market || !market[receiveGoodId]) return { ok: false, reason: '이 항구에서 취급하지 않는 물품입니다.' };
  if (giveGoodId === receiveGoodId) return { ok: false, reason: '같은 물품끼리는 교환할 수 없습니다.' };
  const item = state.inventory.find((it) => it.id === giveGoodId);
  const held = item ? item.qty : 0;
  const actualGiveQty = Math.min(giveQty, held);
  if (actualGiveQty <= 0) return { ok: false, reason: '내어줄 물량이 없습니다.' };
  const value = actualGiveQty * goodValue(giveGoodId);
  const spaceLeft = getCargoCapacity() - getCargoUsed() + actualGiveQty;
  const receiveQty = Math.min(Math.floor(value / goodValue(receiveGoodId)), spaceLeft);
  if (receiveQty <= 0) return { ok: false, reason: '교환할 만큼 가치가 부족합니다.' };
  item.qty -= actualGiveQty;
  if (item.qty <= 0) state.inventory = state.inventory.filter((it) => it.id !== giveGoodId);
  const recv = state.inventory.find((it) => it.id === receiveGoodId);
  if (recv) recv.qty += receiveQty;
  else state.inventory.push({ id: receiveGoodId, name: getGood(receiveGoodId).name, qty: receiveQty });
  notify({ inventoryChanged: true });
  return { ok: true, giveQty: actualGiveQty, receiveQty };
}

export function sellGood(cityId, goodId, qty) {
  if (!CITY_MARKET[cityId]?.[goodId]) return { ok: false, reason: '이 도시에서는 거래할 수 없는 품목입니다.' };
  let remaining = Math.max(0, qty);
  let totalQty = 0, totalRevenue = 0;
  while (remaining > 0) {
    const item = state.inventory.find((it) => it.id === goodId);
    const held = item ? item.qty : 0;
    const volumeLeft = availableVolume(cityId, goodId);
    const chunk = Math.min(remaining, TRADE_CHUNK_SIZE, held, volumeLeft);
    if (chunk <= 0) break;
    const row = getMarketRows(cityId).find((r) => r.good.id === goodId);
    const revenue = chunk * row.price.sell;
    state.gold += revenue;
    item.qty -= chunk;
    if (item.qty <= 0) state.inventory = state.inventory.filter((it) => it.id !== goodId);
    nudgeSupply(cityId, goodId, chunk, -1);
    consumeVolume(cityId, goodId, chunk);
    totalQty += chunk;
    totalRevenue += revenue;
    remaining -= chunk;
  }
  if (totalQty <= 0) {
    if (state.inventory.find((it) => it.id === goodId)?.qty > 0 && availableVolume(cityId, goodId) <= 0) {
      return { ok: false, reason: '이 항구가 더 받아줄 수 없습니다. 시간이 지나면 다시 받아줍니다.' };
    }
    return { ok: false, reason: '보유한 물량이 없습니다.' };
  }
  notify({ inventoryChanged: true });
  return { ok: true, qty: totalQty, revenue: totalRevenue };
}
