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
    questRespawnAt: state.questRespawnAt,
    reputation: state.reputation,
    pirateBounty: state.pirateBounty,
    crewMorale: state.crewMorale,
    crewCount: state.crewCount,
    visitedCities: state.visitedCities,
    fleet: state.fleet,
    oakTimber: state.oakTimber,
    ironcladPlating: state.ironcladPlating,
    robertsRelic: state.robertsRelic,
    pirateEscalation: state.pirateEscalation,
    pirateEscalationResetDate: state.pirateEscalationResetDate,
    seenRespawnIntro: state.seenRespawnIntro,
    marketState: state.marketState,
    marketCycle: state.marketCycle,
    marketVolume: state.marketVolume,
    cityEvents: state.cityEvents,
    marketStock: state.marketStock,
    audioMuted: state.audioMuted,
    explorationSite: state.explorationSite,
    nextExplorationSiteAt: state.nextExplorationSiteAt,
    explorationCount: state.explorationCount,
    playerSkills: state.playerSkills,
    learnedSkills: state.learnedSkills,
    skillSlots: state.skillSlots,
    compendium: state.compendium,
    compendiumRewards: state.compendiumRewards,
    tradeFame: state.tradeFame,
    adventureFame: state.adventureFame,
    combatFame: state.combatFame,
    tradeWealthMilestone: state.tradeWealthMilestone,
    adventureDiscoveryMilestone: state.adventureDiscoveryMilestone,
    infamy: state.infamy,
    equippedTitleId: state.equippedTitleId,
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
  state.questRespawnAt = data.questRespawnAt && typeof data.questRespawnAt === 'object' ? data.questRespawnAt : {};
  state.reputation = data.reputation || {};
  if (typeof data.pirateBounty === 'number') state.pirateBounty = data.pirateBounty;
  if (typeof data.crewMorale === 'number') state.crewMorale = data.crewMorale;
  if (typeof data.crewCount === 'number') state.crewCount = data.crewCount;
  state.visitedCities = data.visitedCities && typeof data.visitedCities === 'object' ? data.visitedCities : {};
  state.fleet = Array.isArray(data.fleet) ? data.fleet : [];
  state.oakTimber = typeof data.oakTimber === 'number' ? data.oakTimber : 0;
  state.ironcladPlating = typeof data.ironcladPlating === 'number' ? data.ironcladPlating : 0;
  state.robertsRelic = typeof data.robertsRelic === 'number' ? data.robertsRelic : 0;
  state.pirateEscalation = data.pirateEscalation && typeof data.pirateEscalation === 'object' ? data.pirateEscalation : {};
  state.pirateEscalationResetDate = typeof data.pirateEscalationResetDate === 'string' ? data.pirateEscalationResetDate : null;
  state.seenRespawnIntro = !!data.seenRespawnIntro;
  state.marketState = data.marketState && typeof data.marketState === 'object' ? data.marketState : {};
  state.marketCycle = data.marketCycle && typeof data.marketCycle === 'object' ? data.marketCycle : {};
  state.marketVolume = data.marketVolume && typeof data.marketVolume === 'object' ? data.marketVolume : {};
  state.cityEvents = data.cityEvents && typeof data.cityEvents === 'object' ? data.cityEvents : {};
  state.marketStock = data.marketStock && typeof data.marketStock === 'object' ? data.marketStock : {};
  state.audioMuted = !!data.audioMuted;
  state.explorationSite = data.explorationSite && typeof data.explorationSite === 'object' ? data.explorationSite : null;
  state.nextExplorationSiteAt = typeof data.nextExplorationSiteAt === 'number' ? data.nextExplorationSiteAt : null;
  state.explorationCount = typeof data.explorationCount === 'number' ? data.explorationCount : 0;
  state.playerSkills = data.playerSkills && typeof data.playerSkills === 'object' ? data.playerSkills : {};
  // 구버전 세이브(combatSkillSlots, 2칸, "배우기" 없이 바로 장착 가능하던 시절)를 새 9칸
  // skillSlots로 옮긴다 — 그때 장착돼 있던 스킬은 이미 쓰고 있었으니 learnedSkills에도 함께
  // 넣어줘야 "장착엔 학습이 선행돼야 한다"는 새 규칙에서도 계속 장착 상태로 남는다.
  const legacySlots = Array.isArray(data.combatSkillSlots) ? data.combatSkillSlots.filter(Boolean) : [];
  state.learnedSkills = Array.isArray(data.learnedSkills)
    ? [...new Set([...data.learnedSkills, ...legacySlots])]
    : [...new Set(legacySlots)];
  if (Array.isArray(data.skillSlots)) {
    state.skillSlots = Array(9).fill(null).map((_, i) => data.skillSlots[i] ?? null);
  } else {
    state.skillSlots = Array(9).fill(null).map((_, i) => legacySlots[i] ?? null);
  }
  state.compendium = data.compendium && typeof data.compendium === 'object'
    ? { archaeology: data.compendium.archaeology || {}, geography: data.compendium.geography || {}, astronomy: data.compendium.astronomy || {} }
    : { archaeology: {}, geography: {}, astronomy: {} };
  state.compendiumRewards = Array.isArray(data.compendiumRewards) ? data.compendiumRewards : [];
  state.tradeFame = typeof data.tradeFame === 'number' ? data.tradeFame : 0;
  state.adventureFame = typeof data.adventureFame === 'number' ? data.adventureFame : 0;
  state.combatFame = typeof data.combatFame === 'number' ? data.combatFame : 0;
  state.tradeWealthMilestone = typeof data.tradeWealthMilestone === 'number' ? data.tradeWealthMilestone : 0;
  state.adventureDiscoveryMilestone = typeof data.adventureDiscoveryMilestone === 'number' ? data.adventureDiscoveryMilestone : 0;
  state.infamy = typeof data.infamy === 'number' ? data.infamy : 0;
  state.equippedTitleId = typeof data.equippedTitleId === 'string' ? data.equippedTitleId : null;
}

export function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // no-op
  }
}
