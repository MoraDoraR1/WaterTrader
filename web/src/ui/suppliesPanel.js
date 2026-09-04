// 보급창고 패널 — 시장 패널(#market-panel)을 재사용해 식량/식수/자재/포탄을 사고판다.
// 모든 항구의 항구 관리인이 취급한다(교역품은 상인의 시장에서만 거래).
import { state } from '../state.js';
import { hud } from './hud.js';
import { getCity } from '../data/cities.js';
import { getCargoCapacity, getCargoUsed } from '../systems/market.js';
import { buySupply, sellSupply, SUPPLY_DEFS } from '../systems/supplies.js';

const STEP = 10;

function renderSupplies(cityId) {
  const city = getCity(cityId);
  const rows = Object.values(SUPPLY_DEFS).map((def) => ({
    name: `${def.icon} ${def.name}`,
    sub: `구매가 ${def.price} · 판매가 ${Math.round(def.price * 0.5)} 두캇/개 · 보유 ${state[def.id]}개`,
    actions: [
      {
        label: `${STEP}개 구매`,
        onAction: () => {
          const res = buySupply(def.id, STEP);
          if (res.ok) { hud.toast(`${def.name} ${res.qty}개 구매 (-${res.cost.toLocaleString('ko-KR')} 두캇)`); renderSupplies(cityId); }
          else hud.toast(res.reason);
        },
      },
      {
        label: `${STEP}개 판매`,
        disabled: state[def.id] <= 0,
        onAction: () => {
          const res = sellSupply(def.id, STEP);
          if (res.ok) { hud.toast(`${def.name} ${res.qty}개 판매 (+${res.revenue.toLocaleString('ko-KR')} 두캇)`); renderSupplies(cityId); }
          else hud.toast(res.reason);
        },
      },
    ],
  }));
  hud.renderMarket({
    headerTitle: '⚓ 보급창고',
    title: `${city.name} 보급 · 식량·식수·자재·포탄은 화물칸을 함께 씁니다`,
    gold: state.gold,
    cargo: `${getCargoUsed()} / ${getCargoCapacity()} t`,
    rows,
  });
}

export function openSupplies(cityId) {
  renderSupplies(cityId);
  hud.showMarket(true);
}
