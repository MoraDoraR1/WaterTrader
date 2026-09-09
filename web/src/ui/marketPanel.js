// 시장(향신료 상인 NPC) 패널의 화면 구성 로직 — 한 번 클릭에 STEP톤씩 사고판다.
import { state } from '../state.js';
import { hud } from './hud.js';
import { getCity } from '../data/cities.js';
import { COUNTRY_NAMES } from '../data/ships.js';
import { CITY_MARKET, getGood, GOOD_CATEGORY_LABELS } from '../data/goods.js';
import { getMarketRows, buyGood, sellGood, getCargoCapacity, getCargoUsed, isBarterCity, barterGoods, goodValue, formatCityEventBadge, findOrigin, isOriginCity } from '../systems/market.js';
import { getReputation } from '../systems/quests.js';
import { itemTip } from './tooltip.js';

const STEP = 10;
let barterGiveGood = null;
let currentMarketCityId = null;
let marketTab = 'buy';

// 교역품 이름 툴팁 — "효과" 자리에는 분류(향신료/사치품/일반 물자)를, "획득처" 자리에는
// 이 품목이 실제로 가장 싼(=원산지) 항구를 동적으로 계산해 보여준다(데이터 하드코딩 없이
// CITY_MARKET을 그대로 재사용 — systems/market.js findOrigin, 거리 프리미엄 계산과 동일한 기준).
function goodTip(good) {
  const originCity = getCity(findOrigin(good.id));
  return itemTip(good.name, {
    desc: good.desc,
    effect: GOOD_CATEGORY_LABELS[good.category] || good.category,
    effectLabel: '분류',
    source: originCity ? `최저가 산지: ${originCity.name}` : '여러 항구에서 취급',
  });
}

// 한국 주식창처럼 상승은 빨강, 하락은 파랑으로 — 원래 설정된(도시별 기본) 가격을 100%로 두고
// 항해일자 5일 사이클로 지금 몇 %인지를 그대로 보여준다(systems/market.js의 pct).
const TREND_COLOR = { up: '#e0645a', down: '#6fc8e0', flat: '#9fb8c9' };
const TREND_ARROW = { up: '▲', down: '▼', flat: '' };

// 구매/판매 페이지가 공통으로 쓰는 가격·시세·재고 정보 한 줄 — canBuy/원산지 문구는 각
// 페이지가 필요할 때만 따로 붙인다(구매 페이지는 이미 원산지 품목만 걸러서 보여주므로 불필요).
function priceInfoLabel({ price, heldQty, trend, pct, stock }, good) {
  const marginPct = Math.round((price.sell / good.basePrice - 1) * 100);
  const marginLabel = ` · 기준가대비 ${marginPct >= 0 ? '+' : ''}${marginPct}%`;
  const cycleLabel = ` · <span style="color:${TREND_COLOR[trend]}">시세 ${pct}% ${TREND_ARROW[trend]}</span>`;
  const stockLabel = stock.qty > 0
    ? ` · <span style="color:${stock.qty <= 15 ? '#e0645a' : '#9fb8c9'}">재고 ${stock.qty}t</span>`
    : ` · <span style="color:#e0645a">품절 (${stock.resetInDays}일 후 재입고)</span>`;
  return `매입가 ${price.buy} · 매도가 ${price.sell} 두캇/t · 보유 ${heldQty}t${cycleLabel}${marginLabel}${stockLabel}`;
}

// ---- 구매 페이지 — 이 항구가 실제로 원산지인 품목만 보여준다(원산지 아닌 품목은 아예
// 목록에서 빠진다 — 비활성 버튼으로 걸어두는 게 아니라 "지정된 항목"만 노출). ----
function renderBuyPage(cityId) {
  const rows = getMarketRows(cityId).filter((r) => r.canBuy).map((r) => {
    const { good, price, stock } = r;
    return {
      name: goodTip(good),
      sub: priceInfoLabel(r, good),
      actions: [{
        label: `${STEP}t 구매`,
        disabled: stock.qty <= 0,
        onAction: () => {
          const res = buyGood(cityId, good.id, STEP);
          if (res.ok) { hud.toast(`${good.name} ${res.qty}t 구매 (-${res.cost.toLocaleString('ko-KR')} 두캇)`); renderBuyPage(cityId); }
          else hud.toast(res.reason);
        },
      }],
    };
  });
  if (rows.length === 0) {
    rows.push({ name: '구매 가능한 품목이 없습니다', sub: '이 항구는 어떤 교역품의 원산지도 아닙니다 — 다른 곳에서 사 온 물건을 여기서 파세요.', actions: [] });
  }
  renderMarketFrame(cityId, rows);
}

// ---- 판매 페이지 — 지금 화물칸에 실제로 들고 있는 품목만 보여준다. ----
function renderSellPage(cityId) {
  const rows = getMarketRows(cityId).filter((r) => r.heldQty > 0).map((r) => {
    const { good, heldQty } = r;
    return {
      name: goodTip(good),
      sub: priceInfoLabel(r, good),
      actions: [
        {
          label: `${STEP}t 판매`,
          disabled: heldQty <= 0,
          onAction: () => {
            const res = sellGood(cityId, good.id, STEP);
            if (res.ok) { hud.toast(`${good.name} ${res.qty}t 판매 (+${res.revenue.toLocaleString('ko-KR')} 두캇)`); renderSellPage(cityId); }
            else hud.toast(res.reason);
          },
        },
        {
          // 보유량 전체를 한 번에 판다 — sellGood 자체가 이미 항구의 남은 매입 여력(한정
          // 재고)만큼만 실제로 처리하므로, 여기서는 그냥 보유량 전체를 요청하면 된다.
          label: '전량 판매',
          disabled: heldQty <= 0,
          onAction: () => {
            const res = sellGood(cityId, good.id, heldQty);
            if (res.ok) { hud.toast(`${good.name} ${res.qty}t 판매 (+${res.revenue.toLocaleString('ko-KR')} 두캇)`); renderSellPage(cityId); }
            else hud.toast(res.reason);
          },
        },
      ],
    };
  });
  if (rows.length === 0) {
    rows.push({ name: '판매할 물품이 없습니다', sub: '화물칸에 이 항구가 취급하는 교역품을 싣고 오세요.', actions: [] });
  }
  renderMarketFrame(cityId, rows);
}

function renderMarketFrame(cityId, rows) {
  const city = getCity(cityId);
  const rep = getReputation(city.country);
  const eventBadge = formatCityEventBadge(cityId);
  const tabLabel = marketTab === 'buy' ? '구매' : '판매';
  hud.renderMarket({
    title: `${city.name} 시장 · ${tabLabel} · ${COUNTRY_NAMES[city.country] || city.country} 우호도 ${rep >= 0 ? '+' : ''}${rep}${eventBadge ? ' · ' + eventBadge : ''}`,
    gold: state.gold,
    cargo: `${getCargoUsed()} / ${getCargoCapacity()} t`,
    rows,
  });
}

function renderMarket(cityId) {
  currentMarketCityId = cityId;
  hud.showMarketTabs(true);
  hud.setMarketActiveTab(marketTab);
  if (marketTab === 'sell') renderSellPage(cityId);
  else renderBuyPage(cityId);
}

// 구매/판매 탭 버튼(index.html #market-tabs) 클릭 배선 — main.js에서 앱 시작 시 한 번 호출한다.
export function wireMarketTabs() {
  document.querySelectorAll('#market-tabs .sy-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      marketTab = btn.dataset.marketTab;
      if (currentMarketCityId) renderMarket(currentMarketCityId);
    });
  });
}

// ---- 한국·일본·중국 항구의 물물교환 패널 ----
// 현금 매매 대신, 먼저 화물칸의 어떤 물품을 "내어줄지" 고른 뒤 그 가치만큼
// 이 항구가 취급하는 물품으로 맞바꾼다. 두캇으로 바뀌는 건 이 물건을 아시아 밖에서 팔 때다.
function renderBarter(cityId) {
  const city = getCity(cityId);
  const cargo = `${getCargoUsed()} / ${getCargoCapacity()} t`;
  if (!barterGiveGood) {
    const rows = state.inventory.map((it) => ({
      name: getGood(it.id) ? goodTip(getGood(it.id)) : it.name,
      sub: `보유 ${it.qty}t · 환산 가치 ${goodValue(it.id)}/t`,
      actions: [{ label: '이 물품 내어주기', onAction: () => { barterGiveGood = it.id; renderBarter(cityId); } }],
    }));
    if (rows.length === 0) rows.push({ name: '내어줄 물품이 없습니다', sub: '화물칸에 교역품을 싣고 오세요.', actions: [] });
    hud.renderMarket({ title: `${city.name} 물물교환 · 내어줄 물품 선택`, gold: state.gold, cargo, rows });
    return;
  }
  const giveGood = getGood(barterGiveGood);
  const heldQty = state.inventory.find((it) => it.id === barterGiveGood)?.qty || 0;
  const market = CITY_MARKET[cityId] || {};
  const rows = [{
    name: `◀ ${giveGood.name} 선택 취소`,
    sub: `보유 ${heldQty}t`,
    actions: [{ label: '다시 고르기', onAction: () => { barterGiveGood = null; renderBarter(cityId); } }],
  }];
  for (const goodId of Object.keys(market)) {
    if (goodId === barterGiveGood) continue;
    if (!isOriginCity(cityId, goodId)) continue; // 물물교환도 결국 이 항구 상인에게서 "사는" 것 — 원산지 품목만 내어준다
    const good = getGood(goodId);
    const qty = Math.min(STEP, heldQty);
    const receiveQty = Math.floor((qty * goodValue(barterGiveGood)) / goodValue(goodId));
    rows.push({
      name: goodTip(good),
      sub: `${giveGood.name} ${qty}t → ${good.name} 약 ${receiveQty}t`,
      actions: [{
        label: '교환하기',
        disabled: heldQty <= 0,
        onAction: () => {
          const res = barterGoods(cityId, barterGiveGood, STEP, goodId);
          if (res.ok) hud.toast(`${giveGood.name} ${res.giveQty}t → ${good.name} ${res.receiveQty}t 교환`);
          else hud.toast(res.reason);
          renderBarter(cityId);
        },
      }],
    });
  }
  hud.renderMarket({ title: `${city.name} 물물교환 · 받을 물품 선택`, gold: state.gold, cargo, rows });
}

export function openMarket(cityId) {
  if (isBarterCity(cityId)) {
    barterGiveGood = null;
    hud.showMarketTabs(false);
    renderBarter(cityId);
  } else {
    marketTab = 'buy'; // 항구를 새로 열 때마다 구매 탭부터 보여준다
    renderMarket(cityId);
  }
  hud.showMarket(true);
}
