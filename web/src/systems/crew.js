// 승무원 급여/사기 시스템 — 입항할 때마다 급여를 떼고(못 내면 사기가 크게 깎인다),
// 전투에서 피격당할 때마다 사기가 조금씩 깎이며, 입항 시 일부 회복된다.
// 사기는 백병전 전투력에 직접 곱해져(getMoralePowerMul) 방치하면 실제로 손해가 나게 만든다.
import { state, notify } from '../state.js';
import { getShip } from '../data/ships.js';

const WAGE_PER_CREW = 0.5; // 승무원 1명당 입항 시 지급하는 급여
const MORALE_DOCK_RECOVER = 15;
const MORALE_COMBAT_HIT_LOSS = 4;
const MORALE_UNPAID_PENALTY = 20;

export function payWagesOnDock() {
  const shipDef = getShip(state.currentShipId);
  const crew = shipDef?.crew || 20;
  const wage = Math.round(crew * WAGE_PER_CREW);
  const morale = state.crewMorale ?? 100;
  let paid;
  if (state.gold >= wage) {
    state.gold -= wage;
    state.crewMorale = Math.min(100, morale + MORALE_DOCK_RECOVER);
    paid = true;
  } else {
    state.gold = 0;
    state.crewMorale = Math.max(0, morale - MORALE_UNPAID_PENALTY);
    paid = false;
  }
  notify({ crewChanged: true });
  return { wage, paid };
}

export function loseMoraleFromCombat() {
  state.crewMorale = Math.max(0, (state.crewMorale ?? 100) - MORALE_COMBAT_HIT_LOSS);
}

// 백병전 전투력 배율 — 사기 0%면 절반, 100%면 그대로.
export function getMoralePowerMul() {
  const m = state.crewMorale ?? 100;
  return 0.5 + (m / 100) * 0.5;
}
