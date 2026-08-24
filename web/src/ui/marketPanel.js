// 시장(향신료 상인 NPC) 패널의 화면 구성 로직 — 한 번 클릭에 STEP톤씩 사고판다.
import { state } from '../state.js';
import { hud } from './hud.js';
import { getCity } from '../data/cities.js';
import { COUNTRY_NAMES } from '../data/ships.js';
import { getMarketRows, buyGood, sellGood, getCargoCapacity, getCargoUsed } from '../systems/market.js';
import { getReputation } from '../systems/quests.js';

const STEP = 10;

function renderMarket(cityId) {
  const city = getCity(cityId);
  const trendLabel = { up: ' ▲시세상승', down: ' ▼시세하락', flat: '' };
  const rows = getMarketRows(cityId).map(({ good, price, heldQty, trend }) => ({
    name: good.name,
    sub: `매입가 ${price.buy} · 매도가 ${price.sell} 두캇/t · 보유 ${heldQty}t${trendLabel[trend] || ''}`,
    actions: [
      {
        label: `${STEP}t 구매`,
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
    ],
  }));
  const rep = getReputation(city.country);
  hud.renderMarket({
    title: `${city.name} 시장 · ${COUNTRY_NAMES[city.country] || city.country} 우호도 ${rep >= 0 ? '+' : ''}${rep}`,
    gold: state.gold,
    cargo: `${getCargoUsed()} / ${getCargoCapacity()} t`,
    rows,
  });
}

export function openMarket(cityId) {
  renderMarket(cityId);
  hud.showMarket(true);
}
