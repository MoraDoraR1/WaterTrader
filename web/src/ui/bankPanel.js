// 대도시 은행 패널 — 시장 패널(#market-panel)을 그대로 재사용하되 문구만 은행에 맞게 바꾼다.
// 교역품은 다루지 않고, 오직 두캇을 휴대금 ↔ 보관금 사이에서 옮긴다.
import { state } from '../state.js';
import { hud } from './hud.js';
import { getCity } from '../data/cities.js';
import { depositGold, withdrawGold } from '../systems/bank.js';

const STEP = 100;

function renderBank(cityId) {
  const city = getCity(cityId);
  const rows = [
    {
      name: `두캇 예금 (${STEP})`,
      sub: '휴대금을 은행에 맡깁니다 — 배가 침몰해도 잃지 않습니다.',
      actions: [{
        label: `${STEP} 예금`,
        disabled: state.gold < STEP,
        onAction: () => { const r = depositGold(STEP); if (r.ok) hud.toast(`${r.amount.toLocaleString('ko-KR')} 두캇 예금`); renderBank(cityId); },
      }, {
        label: '전액 예금',
        disabled: state.gold <= 0,
        onAction: () => { const r = depositGold(state.gold); if (r.ok) hud.toast(`${r.amount.toLocaleString('ko-KR')} 두캇 전액 예금`); renderBank(cityId); },
      }],
    },
    {
      name: `두캇 인출 (${STEP})`,
      sub: '보관금을 휴대금으로 찾습니다.',
      actions: [{
        label: `${STEP} 인출`,
        disabled: state.bankGold < STEP,
        onAction: () => { const r = withdrawGold(STEP); if (r.ok) hud.toast(`${r.amount.toLocaleString('ko-KR')} 두캇 인출`); renderBank(cityId); },
      }, {
        label: '전액 인출',
        disabled: state.bankGold <= 0,
        onAction: () => { const r = withdrawGold(state.bankGold); if (r.ok) hud.toast(`${r.amount.toLocaleString('ko-KR')} 두캇 전액 인출`); renderBank(cityId); },
      }],
    },
  ];
  hud.renderMarket({
    headerTitle: '🏦 은행',
    cargoLabel: '보관액',
    title: `${city.name} 은행 · 교역품은 취급하지 않습니다`,
    gold: state.gold,
    cargo: `${state.bankGold.toLocaleString('ko-KR')} 두캇`,
    rows,
  });
}

export function openBank(cityId) {
  renderBank(cityId);
  hud.showMarketTabs(false);
  hud.showMarket(true);
}
