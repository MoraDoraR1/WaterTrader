import { SHIPS } from './data/ships.js';

const listeners = new Set();

export const state = {
  screen: 'title', // title | sea | city
  gender: 'male', // male | female
  playerName: '항해사',
  gold: 1500,
  currentShipId: 'caravela_lateen',
  shipHp: null,
  shipPaint: null, // null = 국가 기본 도색. {hull, stripe, trim} 지정 시 플레이어 커스텀 도색 적용.
  shipPos: [-560, 300],
  shipHeading: 0,
  dockedCityId: null,
  inCombat: false,
  playerHp: 100,
  inventory: [
    { id: 'pepper', name: '후추', qty: 12 },
    { id: 'silk', name: '비단', qty: 4 },
    { id: 'wine', name: '포도주', qty: 8 },
  ],
};

export function initShipHp() {
  const ship = SHIPS.find((s) => s.id === state.currentShipId);
  state.shipHp = ship ? ship.hp : 500;
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
