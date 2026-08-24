import { SHIPS, getShip } from './data/ships.js';
import { getEffectiveShipDef } from './data/shipParts.js';

const listeners = new Set();

export const state = {
  screen: 'title', // title | sea | city
  gender: 'male', // male | female
  playerName: '항해사',
  gold: 1500,
  currentShipId: 'caravela_lateen',
  shipHp: null,
  shipParts: {}, // { cannon, armor, sail, hull } — 슬롯별 장착 부품 id (조선소에서 구매/장착)
  shipPos: [-560, 300],
  shipHeading: 0,
  dockedCityId: null,
  inCombat: false,
  playerHp: 100,
  // 시작 시점에 실제로 사고파는(둘 중 아무 항구에서나) 품목만 들려 보낸다 — 아직 어느
  // 항구도 취급하지 않는 품목(비단 등)을 쥐고 시작하면 팔 곳이 없어 죽은 짐이 된다.
  inventory: [
    { id: 'pepper', name: '후추', qty: 10 },
    { id: 'wine', name: '포도주', qty: 6 },
  ],
  quests: {}, // questId -> 'accepted' | 'completed' (없으면 'available'로 취급)
  reputation: {}, // 국가코드 -> 우호도(시장 가격에 반영)
  pirateBounty: 0, // 완료한 해적 토벌 의뢰 수
  crewMorale: 100, // 0~100 — 백병전 전투력에 반영
  fleet: [], // 예비 함대 — { uid, shipId, shipHp, shipParts, name } — 항구에 정박해 있는(현재 조종 중이 아닌) 배들
  captureCount: 0, // 나포 성공 횟수(랭크 산정에 반영)
};

export function initShipHp() {
  const shipDef = getEffectiveShipDef(getShip(state.currentShipId), state.shipParts);
  state.shipHp = shipDef ? shipDef.hp : 500;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify(patch) {
  for (const fn of listeners) fn(patch);
}

export function setScreen(screen) {
  state.screen = screen;
  notify({ screen });
}
