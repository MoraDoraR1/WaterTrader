// localStorage 기반 저장/불러오기 — 브라우저를 닫거나 새로고침해도 진행 상황이 남게 한다.
// 저장 대상은 "다시 켰을 때 이어서 항해할 수 있는 데 필요한 것"만으로 좁힌다
// (전투 중 여부 같은 세션 한정 상태는 저장하지 않는다).
import { state } from '../state.js';

const SAVE_KEY = 'badasangin_save_v1';

export function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export function saveGame() {
  const data = {
    version: 1,
    savedAt: Date.now(),
    gender: state.gender,
    playerName: state.playerName,
    gold: state.gold,
    currentShipId: state.currentShipId,
    shipHp: state.shipHp,
    shipParts: state.shipParts,
    shipPos: state.shipPos,
    shipHeading: state.shipHeading,
    dayTimer: state.dayTimer,
    bankGold: state.bankGold,
    food: state.food,
    water: state.water,
    materials: state.materials,
    cannonballs: state.cannonballs,
    suppliesLastDay: state.suppliesLastDay,
    inventory: state.inventory,
    quests: state.quests,
    reputation: state.reputation,
    pirateBounty: state.pirateBounty,
    crewMorale: state.crewMorale,
    fleet: state.fleet,
    captureCount: state.captureCount,
    marketState: state.marketState,
    audioMuted: state.audioMuted,
    endingShown: state.endingShown,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // 저장 공간이 꽉 찼거나 프라이빗 모드 등으로 쓰기 실패 — 조용히 무시(자동저장이라 재시도가 자연스럽게 이루어짐)
  }
}

export function loadSaveData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function applySave(data) {
  if (!data) return;
  if (data.gender) state.gender = data.gender;
  if (data.playerName) state.playerName = data.playerName;
  if (typeof data.gold === 'number') state.gold = data.gold;
  if (data.currentShipId) state.currentShipId = data.currentShipId;
  state.shipParts = data.shipParts || {};
  if (typeof data.shipHp === 'number') state.shipHp = data.shipHp;
  if (Array.isArray(data.shipPos)) state.shipPos = data.shipPos;
  if (typeof data.shipHeading === 'number') state.shipHeading = data.shipHeading;
  if (typeof data.dayTimer === 'number') state.dayTimer = data.dayTimer;
  if (typeof data.bankGold === 'number') state.bankGold = data.bankGold;
  if (typeof data.food === 'number') state.food = data.food;
  if (typeof data.water === 'number') state.water = data.water;
  if (typeof data.materials === 'number') state.materials = data.materials;
  if (typeof data.cannonballs === 'number') state.cannonballs = data.cannonballs;
  if (typeof data.suppliesLastDay === 'number') state.suppliesLastDay = data.suppliesLastDay;
  if (Array.isArray(data.inventory)) state.inventory = data.inventory;
  state.quests = data.quests || {};
  state.reputation = data.reputation || {};
  if (typeof data.pirateBounty === 'number') state.pirateBounty = data.pirateBounty;
  if (typeof data.crewMorale === 'number') state.crewMorale = data.crewMorale;
  state.fleet = Array.isArray(data.fleet) ? data.fleet : [];
  state.captureCount = typeof data.captureCount === 'number' ? data.captureCount : 0;
  state.marketState = data.marketState && typeof data.marketState === 'object' ? data.marketState : {};
  state.audioMuted = !!data.audioMuted;
  state.endingShown = !!data.endingShown;
}

export function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // no-op
  }
}
