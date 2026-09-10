// 승무원 급여/사기/머릿수 시스템.
// - 사기(crewMorale, 0~100)는 백병전 전투력에 곱연산(getMoralePowerMul)되는 "컨디션" 지표로,
//   급여를 낼 때마다 일부 회복되고 못 내면 크게 깎인다 — 예전부터 있던 기능.
// - 선원 수(state.crewCount)는 실제 "머릿수" 자원이다. 배마다 정원(shipDef.crew)이 있고,
//   전투 피격이나 식량/식수 고갈로 실제로 줄어든다(부상·이탈·아사). 정원의 MIN_CREW_RATIO
//   미만으로 떨어지면 항구에서 출항 자체가 막히고, 항해 중에 그 밑으로 떨어지면(전투/기아로
//   바다 한복판에서) 속도가 부족 비율만큼 깎인다 — 사기와 달리 "탈 수 있는 인원이 없어서
//   물리적으로 배를 못 몬다"는 의미다. 급여를 낼 수 있으면 입항 시에 한해 일부 재충원된다.
// - 급여 지급(사용자 요청)은 예전엔 입항할 때만 일어났다 — 오래 항구에 안 들르고 바다에
//   머물면 사기가 오를 기회 자체가 없었다. 이제 항해일자(state.dayTimer)가 하루 넘어갈
//   때마다 위치와 무관하게(바다 위에서도) 자동으로 한 번 지급되도록 했다 — state.wagesLastDay로
//   하루 한 번만 나가게 가드해, 입항 직후 또 하루가 넘어가는 순간이 겹쳐도 이중으로 빠져나가지
//   않는다. 항구 도착 시 추가로 붙는 신규 선원 충원·순환 보급 보너스는 "그 방문에서 실제로
//   새 급여가 나갔을 때"만 함께 준다(같은 날 이미 바다에서 냈다면 입항 자체는 공짜).
import { state, notify } from '../state.js';
import { getShip } from '../data/ships.js';
import { sumSkillEffect, mulSkillEffect } from '../data/shipSkills.js';

const VOYAGE_DAY_SECONDS = 60; // entities/weather.js DAY_CYCLE_SECONDS와 동일 기준
const WAGE_PER_CREW = 0.25; // 승무원 1명당 하루치 급여(사용자 요청으로 0.5→0.25 인하)
const MORALE_WAGE_RECOVER = 15;
const MORALE_COMBAT_HIT_LOSS = 4;
const MORALE_UNPAID_PENALTY = 20;

export const MIN_CREW_RATIO = 0.5; // 정원의 이 비율 밑으로 떨어지면 출항 불가 + 속도 페널티 시작
const CREW_SPEED_FLOOR = 0.2; // 선원이 0이어도 최소 이 배율(20%)의 속도는 남아 항구로는 돌아올 수 있다(완전 좌초 방지)
const CREW_LOSS_PCT_PER_HIT = 0.03; // 전투 피격(포격 피탄/백병전 패배/충돌) 1회당 정원의 3%가 사상·이탈
const CREW_LOSS_PCT_STARVED = 0.05; // 식량 고갈 1일당 정원의 5%
const CREW_LOSS_PCT_DEHYDRATED = 0.07; // 식수 고갈 1일당 정원의 7%(갈증이 더 치명적)
const CREW_RECOVER_PCT_ON_DOCK = 0.2; // 급여를 낼 수 있으면 입항할 때마다 정원의 20%만큼 새로 충원
const HIRE_COST_PER_CREW = 4; // 항구에서 선원을 새로 고용할 때 1명당 드는 두캇(항해 전 정원을 채우는 용도)
export const RESCUE_CREW_MIN = 1, RESCUE_CREW_MAX = 3; // 전투 승리(격침) 시 적선에서 구조/편입되는 인원 — 항구 없이도 바다에서 소폭 보충 가능

// 지금 배의 정원 대비 최소 필요 선원 수(반올림 올림 — 최소 1명). 소수 정예 승조 스킬은
// 이 비율 자체를 낮춰(minCrewRatioAdd는 음수) 더 적은 인원으로도 출항할 수 있게 해준다.
export function getMinCrew(shipDef) {
  const ratio = Math.max(0.1, sumSkillEffect(shipDef, 'minCrewRatioAdd', MIN_CREW_RATIO));
  return Math.max(1, Math.ceil((shipDef?.crew || 20) * ratio));
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

function settleWage(shipDef) {
  const crew = shipDef?.crew || 20;
  const wage = Math.round(crew * WAGE_PER_CREW);
  const morale = state.crewMorale ?? 100;
  let paid;
  if (state.gold >= wage) {
    state.gold -= wage;
    state.crewMorale = Math.min(100, morale + MORALE_WAGE_RECOVER);
    paid = true;
  } else {
    state.gold = 0;
    state.crewMorale = Math.max(0, morale - MORALE_UNPAID_PENALTY);
    paid = false;
  }
  notify({ crewChanged: true });
  return { wage, paid };
}

// 항해일자가 넘어갈 때마다(위치 무관 — 항구든 바다든) 하루 한 번만 급여를 지급한다.
// 이미 오늘치를 냈다면 null을 반환해 아무 것도 하지 않는다(중복 지급 방지).
export function payDailyWages() {
  const day = 1 + Math.floor((state.dayTimer || 0) / VOYAGE_DAY_SECONDS);
  if (day <= (state.wagesLastDay ?? 1)) return null;
  state.wagesLastDay = day;
  return settleWage(getShip(state.currentShipId));
}

// 입항 시 호출 — 오늘치 급여가 아직 안 나갔다면 payDailyWages()로 지급하고, 그 자리에서
// 실제로 새로 지급됐을 때만(=이미 바다에서 그날 치를 냈다면 제외) 항구 전용 보너스인
// 신규 선원 충원과 순환 보급 스킬 식량/식수를 함께 얹어준다.
export function payWagesOnDock() {
  const result = payDailyWages();
  if (!result) return { wage: 0, paid: true };
  if (result.paid) {
    const shipDef = getShip(state.currentShipId);
    const crew = shipDef?.crew || 20;
    const recruited = Math.max(0, Math.round(crew * CREW_RECOVER_PCT_ON_DOCK));
    state.crewCount = Math.min(crew, (state.crewCount ?? crew) + recruited);
    // 순환 보급 스킬 — 급여를 낼 수 있었을 때만(=정상적으로 입항 처리됐을 때만) 식량·식수를
    // 추가로 얹어준다.
    const supplyBonus = sumSkillEffect(shipDef, 'dockSupplyBonusAdd', 0);
    if (supplyBonus > 0) { state.food += supplyBonus; state.water += supplyBonus; }
    notify({ crewChanged: true });
  }
  return result;
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
  const loss = Math.round(maxCrew * (starvedDays * CREW_LOSS_PCT_STARVED + dehydratedDays * CREW_LOSS_PCT_DEHYDRATED)
    * mulSkillEffect(shipDef, 'starvationLossMul', 1));
  if (loss <= 0) return;
  state.crewCount = Math.max(0, (state.crewCount ?? maxCrew) - loss);
  notify({ crewChanged: true });
}

// 항구에서 두캇을 내고 선원을 고용해 정원까지 채운다 — 출항 전 부족한 선원을 능동적으로
// 보충하는 수단(급여 지급 시 자동으로 조금씩 차는 것과 별개). 정원을 넘겨 고용할 순 없고,
// 요청한 수보다 빈자리가 적으면 빈자리만큼만 고용해 그만큼만 돈을 받는다.
export function getHireCost(count) {
  return Math.round(Math.max(0, count) * HIRE_COST_PER_CREW);
}

export function hireCrew(count) {
  const shipDef = getShip(state.currentShipId);
  const maxCrew = shipDef?.crew || 20;
  const cur = state.crewCount ?? maxCrew;
  const room = maxCrew - cur;
  if (room <= 0) return { ok: false, reason: '이미 선원이 정원까지 가득 찼습니다.' };
  const actualCount = Math.max(0, Math.min(count, room));
  if (actualCount <= 0) return { ok: false, reason: '고용할 인원을 확인해주세요.' };
  const cost = getHireCost(actualCount);
  if (state.gold < cost) return { ok: false, reason: '골드가 부족합니다.' };
  state.gold -= cost;
  state.crewCount = cur + actualCount;
  notify({ crewChanged: true });
  return { ok: true, count: actualCount, cost };
}

// 전투에서 이겼을 때(격침) 적선에서 소수의 선원을 구조/편입한다 — 항구까지 가지
// 않고도 바다 한복판에서 소폭 보충할 수 있는 유일한 수단이라, 일부러 다수가 아니라
// 1~3명으로 작게 잡았다(요청한 대로 대량 보충 수단은 아님).
export function rescueCrewFromVictory() {
  const shipDef = getShip(state.currentShipId);
  const maxCrew = shipDef?.crew || 20;
  const before = state.crewCount ?? maxCrew;
  if (before >= maxCrew) return 0;
  const gain = Math.floor(Math.random() * (RESCUE_CREW_MAX - RESCUE_CREW_MIN + 1)) + RESCUE_CREW_MIN
    + sumSkillEffect(shipDef, 'rescueBonusAdd', 0);
  state.crewCount = Math.min(maxCrew, before + gain);
  const actual = state.crewCount - before;
  if (actual > 0) notify({ crewChanged: true });
  return actual;
}

// 백병전 전투력 배율 — 사기 0%면 절반, 100%면 그대로.
export function getMoralePowerMul() {
  const m = state.crewMorale ?? 100;
  return 0.5 + (m / 100) * 0.5;
}
