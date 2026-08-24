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
  inventory: [
    { id: 'pepper', name: '후추', qty: 12 },
    { id: 'silk', name: '비단', qty: 4 },
    { id: 'wine', name: '포도주', qty: 8 },
  ],
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
