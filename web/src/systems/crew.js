// 승무원 급여/사기/머릿수 시스템.
// - 사기(crewMorale, 0~100)는 백병전 전투력에 곱연산(getMoralePowerMul)되는 "컨디션" 지표로,
//   입항 시 일부 회복되고 못 내면 크게 깎인다 — 예전부터 있던 기능.
// - 선원 수(state.crewCount)는 실제 "머릿수" 자원이다. 배마다 정원(shipDef.crew)이 있고,
//   전투 피격이나 식량/식수 고갈로 실제로 줄어든다(부상·이탈·아사). 정원의 MIN_CREW_RATIO
//   미만으로 떨어지면 항구에서 출항 자체가 막히고, 항해 중에 그 밑으로 떨어지면(전투/기아로
//   바다 한복판에서) 속도가 부족 비율만큼 깎인다 — 사기와 달리 "탈 수 있는 인원이 없어서
//   물리적으로 배를 못 몬다"는 의미다. 입항해서 급여를 낼 수 있으면 일부 재충원된다.
import { state, notify } from '../state.js';
import { getShip } from '../data/ships.js';

const WAGE_PER_CREW = 0.5; // 승무원 1명당 입항 시 지급하는 급여
const MORALE_DOCK_RECOVER = 15;
const MORALE_COMBAT_HIT_LOSS = 4;
const MORALE_UNPAID_PENALTY = 20;

export const MIN_CREW_RATIO = 0.5; // 정원의 이 비율 밑으로 떨어지면 출항 불가 + 속도 페널티 시작
const CREW_SPEED_FLOOR = 0.2; // 선원이 0이어도 최소 이 배율(20%)의 속도는 남아 항구로는 돌아올 수 있다(완전 좌초 방지)
const CREW_LOSS_PCT_PER_HIT = 0.03; // 전투 피격(포격 피탄/백병전 패배/충돌) 1회당 정원의 3%가 사상·이탈
const CREW_LOSS_PCT_STARVED = 0.05; // 식량 고갈 1일당 정원의 5%
const CREW_LOSS_PCT_DEHYDRATED = 0.07; // 식수 고갈 1일당 정원의 7%(갈증이 더 치명적)
const CREW_RECOVER_PCT_ON_DOCK = 0.2; // 급여를 낼 수 있으면 입항할 때마다 정원의 20%만큼 새로 충원

// 지금 배의 정원 대비 최소 필요 선원 수(반올림 올림 — 최소 1명).
export function getMinCrew(shipDef) {
  return Math.max(1, Math.ceil((shipDef?.crew || 20) * MIN_CREW_RATIO));
}

export function getCurrentMinCrew() {
  return getMinCrew(getShip(state.currentShipId));
}

// 지금 선원 수가 최소 정원에 못 미치는 만큼 배 속도에 곱할 배율(1이면 정상, 그 밑이면 감속).
export function getCrewSpeedMul() {
  const shipDef = getShip(state.currentShipId);
  const minCrew = getMinCrew(shipDef);
  const crew = state.crewCount ?? shipDef?.crew ?? minCrew;
  if (crew >= minCrew) return 1;
  return Math.max(CREW_SPEED_FLOOR, crew / minCrew);
}

export function payWagesOnDock() {
  const shipDef = getShip(state.currentShipId);
  const crew = shipDef?.crew || 20;
  const wage = Math.round(crew * WAGE_PER_CREW);
  const morale = state.crewMorale ?? 100;
  let paid;
  if (state.gold >= wage) {
    state.gold -= wage;
    state.crewMorale = Math.min(100, morale + MORALE_DOCK_RECOVER);
    const recruited = Math.max(0, Math.round(crew * CREW_RECOVER_PCT_ON_DOCK));
    state.crewCount = Math.min(crew, (state.crewCount ?? crew) + recruited);
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
  const shipDef = getShip(state.currentShipId);
  const maxCrew = shipDef?.crew || 20;
  const loss = Math.max(1, Math.round(maxCrew * CREW_LOSS_PCT_PER_HIT));
  state.crewCount = Math.max(0, (state.crewCount ?? maxCrew) - loss);
  notify({ crewChanged: true });
}

// 식량/식수 고갈로 인한 선원 손실 — seaScene._processSupplies()가 하루씩 넘어갈 때마다 부른다.
export function loseCrewFromSupplies(starvedDays, dehydratedDays) {
  if (starvedDays <= 0 && dehydratedDays <= 0) return;
  const shipDef = getShip(state.currentShipId);
  const maxCrew = shipDef?.crew || 20;
  const loss = Math.round(maxCrew * (starvedDays * CREW_LOSS_PCT_STARVED + dehydratedDays * CREW_LOSS_PCT_DEHYDRATED));
  if (loss <= 0) return;
  state.crewCount = Math.max(0, (state.crewCount ?? maxCrew) - loss);
  notify({ crewChanged: true });
}

// 백병전 전투력 배율 — 사기 0%면 절반, 100%면 그대로.
export function getMoralePowerMul() {
  const m = state.crewMorale ?? 100;
  return 0.5 + (m / 100) * 0.5;
}
