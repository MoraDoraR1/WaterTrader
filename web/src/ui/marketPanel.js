// 시장(향신료 상인 NPC) 패널의 화면 구성 로직 — 한 번 클릭에 STEP톤씩 사고판다.
import { state } from '../state.js';
import { hud } from './hud.js';
import { getCity } from '../data/cities.js';
import { COUNTRY_NAMES } from '../data/ships.js';
import { CITY_MARKET, getGood, GOOD_CATEGORY_LABELS } from '../data/goods.js';
import { getMarketRows, buyGood, sellGood, getCargoCapacity, getCargoUsed, isBarterCity, barterGoods, goodValue, formatCityEventBadge, findOrigin } from '../systems/market.js';
import { getReputation } from '../systems/quests.js';
import { itemTip } from './tooltip.js';

const STEP = 10;
let barterGiveGood = null;

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

function renderMarket(cityId) {
  const city = getCity(cityId);
  // 한국 주식창처럼 상승은 빨강, 하락은 파랑으로 — 원래 설정된(도시별 기본) 가격을 100%로 두고
  // 항해일자 5일 사이클로 지금 몇 %인지를 그대로 보여준다(systems/market.js의 pct).
  const trendColor = { up: '#e0645a', down: '#6fc8e0', flat: '#9fb8c9' };
  const trendArrow = { up: '▲', down: '▼', flat: '' };
  const rows = getMarketRows(cityId).map(({ good, price, heldQty, trend, pct, stock }) => {
    const marginPct = Math.round((price.sell / good.basePrice - 1) * 100);
    const marginLabel = ` · 기준가대비 ${marginPct >= 0 ? '+' : ''}${marginPct}%`;
    const cycleLabel = ` · <span style="color:${trendColor[trend]}">시세 ${pct}% ${trendArrow[trend]}</span>`;
    const stockLabel = stock.qty > 0
      ? ` · <span style="color:${stock.qty <= 15 ? '#e0645a' : '#9fb8c9'}">재고 ${stock.qty}t</span>`
      : ` · <span style="color:#e0645a">품절 (${stock.resetInDays}일 후 재입고)</span>`;
    return {
      name: goodTip(good),
      sub: `매입가 ${price.buy} · 매도가 ${price.sell} 두캇/t · 보유 ${heldQty}t${cycleLabel}${marginLabel}${stockLabel}`,
      actions: [
        {
          label: `${STEP}t 구매`,
          disabled: stock.qty <= 0,
          onAction: () => {
            const res = buyGood(cityId, good.id, STEP);
            if (res.ok) { hud.toast(`${good.name} ${res.qty}t 구매 (-${res.cost.toLocaleString('ko-KR')} 두캇)`); renderMarket(cityId); }
            else hud.toast(res.reason);
          },
        },
        {
          label: `${STEP}t 판매`,
          disabled: heldQty <= 0,
          onAction: () => {
            const res = sellGood(cityId, good.id, STEP);
            if (res.ok) { hud.toast(`${good.name} ${res.qty}t 판매 (+${res.revenue.toLocaleString('ko-KR')} 두캇)`); renderMarket(cityId); }
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
            if (res.ok) { hud.toast(`${good.name} ${res.qty}t 판매 (+${res.revenue.toLocaleString('ko-KR')} 두캇)`); renderMarket(cityId); }
            else hud.toast(res.reason);
          },
        },
      ],
    };
  });
  const rep = getReputation(city.country);
  const eventBadge = formatCityEventBadge(cityId);
  hud.renderMarket({
    title: `${city.name} 시장 · ${COUNTRY_NAMES[city.country] || city.country} 우호도 ${rep >= 0 ? '+' : ''}${rep}${eventBadge ? ' · ' + eventBadge : ''}`,
    gold: state.gold,
    cargo: `${getCargoUsed()} / ${getCargoCapacity()} t`,
    rows,
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
    renderBarter(cityId);
  } else {
    renderMarket(cityId);
  }
  hud.showMarket(true);
}
