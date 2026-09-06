import { LOGICAL_W, LOGICAL_H, PixelSurface } from './render/canvas2d.js';
import { consumeJustPressed, clearFrame } from './controls/keys.js';
import { SeaScene } from './scenes/seaScene.js';
import { CityScene } from './scenes/cityScene.js';
import { state, setScreen, initShipHp, initCrewCount, subscribe, notify } from './state.js';
import { hud } from './ui/hud.js';
import { wireShipyardTabs } from './ui/shipyardPanel.js';
import { openQuestBoard } from './ui/questPanel.js';
import { WORLD_REGIONS } from './data/worldRegions.js';
import { LAND_POLYGONS, project } from './data/coastline.js';
import { CITIES } from './data/cities.js';
import { SHIPS, SHIP_ROLES, SHIP_CLASSES, COUNTRY_COLORS, COUNTRY_NAMES, getShip } from './data/ships.js';
import { getEffectiveShipDef, PART_SLOTS, getPart, partsBySlot, getBaseArmor } from './data/shipParts.js';
import { getCombatPower } from './systems/combatPower.js';
import { getShipSkills } from './data/shipSkills.js';
import { SEA_REGION_BOXES } from './data/seaRegions.js';
import { hasSave, saveGame, loadSaveData, applySave, deleteSave } from './systems/save.js';
import { payWagesOnDock, getCurrentMinCrew } from './systems/crew.js';
import { openCrew } from './ui/crewPanel.js';
import { repairAtSea, getCannonSlotCount, buyShip, buildShip } from './systems/shipyard.js';
import { audio } from './systems/audio.js';
import { getRankInfo, computeScore } from './systems/rank.js';
import { getMarketRows, getCargoCapacity, getCargoUsed, getCityEvent, buyGood } from './systems/market.js';
import { SUPPLY_DEFS } from './systems/supplies.js';
import { checkQuestChainAnnouncements, isRouteUnlocked } from './systems/routeUnlock.js';
import { checkDiscoveryEvents } from './systems/discoveryEvents.js';
import { checkExplorationSite } from './systems/exploration.js';
import { RANKS } from './data/ranks.js';
import {
  checkVoyageArrival, getRouteChainName, acceptQuest, turnInDelivery, checkBountyKill,
  getQuestStatus, isQuestChainReady, syncUnlockedRoutes, checkQuestRespawns, addReputation,
} from './systems/quests.js';

const wrap = document.getElementById('canvas-wrap');
const displayCanvas = document.createElement('canvas');
displayCanvas.id = 'game-canvas';
wrap.appendChild(displayCanvas);
const displayCtx = displayCanvas.getContext('2d');
const surface = new PixelSurface(LOGICAL_W, LOGICAL_H);

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  displayCanvas.width = Math.round(window.innerWidth * dpr);
  displayCanvas.height = Math.round(window.innerHeight * dpr);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 논리 해상도 좌표(480x270 기준)로 변환한 클릭 좌표 — 씬의 화면 클릭 판정에 쓴다.
function toLogicalXY(clientX, clientY) {
  const rect = displayCanvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * LOGICAL_W,
    y: ((clientY - rect.top) / rect.height) * LOGICAL_H,
  };
}

let seaScene = null;
let citySceneObj = null;

// 짧은 클릭(드래그 아님)만 상호작용/이동으로 처리 — 화면을 눌러 살짝 드래그하는 것과 구분한다.
const CLICK_THRESHOLD = 6;
let downX = 0, downY = 0, moved = 0, dragging = false;
displayCanvas.addEventListener('mousedown', (e) => {
  dragging = true; moved = 0; downX = e.clientX; downY = e.clientY;
});
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  moved += Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY);
  downX = e.clientX; downY = e.clientY;
});
window.addEventListener('mouseup', (e) => {
  if (!dragging) return;
  dragging = false;
  if (moved >= CLICK_THRESHOLD) return;
  const { x, y } = toLogicalXY(e.clientX, e.clientY);
  if (e.button === 0) {
    if (state.screen === 'sea') seaScene?.handleLeftClick(x, y);
    else if (state.screen === 'city') citySceneObj?.handleInteract();
  } else if (e.button === 2) {
    if (state.screen === 'city') citySceneObj?.handleRightClickAt(x, y);
    else if (state.screen === 'sea') seaScene?.setWaypointAt(x, y);
  }
});
displayCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
displayCanvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (state.screen === 'sea') seaScene?.onWheelZoom(e.deltaY);
  else if (state.screen === 'city') citySceneObj?.onWheelZoom(e.deltaY);
}, { passive: false });

function goToSea(fromCityId) {
  // 최소 선원 정원(정원의 50%)을 못 채우면 항구에서 출항 자체가 막힌다 — fromCityId가 없는
  // 최초 게임 시작 호출(타이틀 화면 -> 첫 항해)은 아직 도시가 없으니 대상에서 제외한다.
  if (fromCityId) {
    const minCrew = getCurrentMinCrew();
    const crew = state.crewCount ?? minCrew;
    if (crew < minCrew) {
      hud.showDialogue(
        '항구 관리인',
        `선원이 부족해 출항할 수 없습니다! 최소 ${minCrew}명 필요한데 지금은 ${crew}명뿐입니다. 항구에서 선원을 고용해 채우시겠습니까?`,
        [
          { label: '선원 고용하기', onClick: () => { hud.hideDialogue(); openCrew(fromCityId); } },
          { label: '닫기', onClick: () => hud.hideDialogue() },
        ]
      );
      return;
    }
  }
  hud.hideDialogue();
  hud.closeInventory();
  if (!seaScene) { seaScene = new SeaScene(LOGICAL_W, LOGICAL_H); seaScene.setOnDock(goToCity); }
  citySceneObj = null;
  setScreen('sea');
  audio.startOcean();
  audio.stopHarbor();
  hud.showSeaHud(true);
  const role = SHIP_ROLES[seaScene.ship.shipDef.role] || SHIP_ROLES.trade;
  hud.setShipRoleBadge(role.label, role.color);
  hud.showActionHints(true, ['휠 확대/축소', 'W/S 속도', 'A/D 선회', '우클릭 자동항해', '좌클릭 정박/포격', '스페이스 포격', '충돌 후 F 승선', 'R 자재로 응급수리', 'M 전체지도', 'T 선박정보']);
}

function goToCity(cityId) {
  hud.showSeaHud(false);
  hud.showTargetHp(false);
  hud.showCombatBanner(false);
  hud.showInteractPrompt(false);
  seaScene?.clearSelection();
  citySceneObj = new CityScene(cityId, () => goToSea(cityId), LOGICAL_W, LOGICAL_H);
  setScreen('city');
  audio.startHarbor();
  audio.stopOcean();
  hud.showActionHints(true, ['휠 확대/축소', 'WASD 이동', '우클릭 지점이동', 'F/좌클릭 상호작용', 'E 인벤토리', 'M 전체지도', 'T 선박정보']);

  const { wage, paid } = payWagesOnDock();
  hud.setGold(state.gold);
  hud.setCrewMorale(state.crewMorale ?? 100);
  const wageNote = wage <= 0 ? '' : paid
    ? ` (승무원 급여 ${wage.toLocaleString('ko-KR')} 두캇 지급)`
    : ' (급여를 지급하지 못해 사기가 크게 떨어졌습니다!)';

  // 입항한 도시가 대호황/대폭락 중이면 정박 토스트에 이어붙여 한 번에 강조한다(toast()는
  // 메시지를 큐 없이 즉시 덮어써서, 따로 두 번 부르면 앞 메시지가 화면에 뜨지도 못하고
  // 사라진다) — 운으로 맞이하는 기대(도파민)와 실망의 순간을 놓치지 않게 한다.
  const event = getCityEvent(cityId);
  const eventNote = !event.active ? '' : event.type === 'boom'
    ? ` 🔥 대호황! 전 품목 시세 ${Math.round(event.mul * 100)}% (${event.daysLeft}일 후 종료)`
    : ` 💥 대폭락! 전 품목 시세 ${Math.round(event.mul * 100)}% (${event.daysLeft}일 후 종료)`;
  // 소형 항구는 조선소(조선소 기사 NPC)가 아예 없다 — 배 구매·건조·수리·부품 전부 불가능하니
  // 직접 걸어다니며 헤매기 전에 미리 알려준다.
  const hasShipyard = citySceneObj.city.npcs.some((n) => n.role === 'shipwright');
  const shipyardNote = hasShipyard ? '' : ' 🔨 이 항구엔 조선소가 없습니다.';
  // 처음 와보는 항구면 방문 기록에 남긴다(랭크 점수의 탐험 지표) — 완료한 의뢰·함대
  // 규모처럼 명성에 직접 기여하니, 첫 방문임을 알려준다.
  const isFirstVisit = !state.visitedCities[cityId];
  if (isFirstVisit) { state.visitedCities = { ...state.visitedCities, [cityId]: true }; notify({ visitedCitiesChanged: true }); }
  const firstVisitNote = isFirstVisit ? ' 🧭 첫 방문!' : '';
  hud.toast(`${citySceneObj.city.name}에 정박했습니다.${wageNote}${eventNote}${shipyardNote}${firstVisitNote}`);

  // 항로 개척 3부작의 마지막 단계(항해)는 여기, 목적지 항구에 정박하는 순간 자동 완료된다.
  const voyageQuest = checkVoyageArrival(cityId);
  if (voyageQuest) {
    const routeNote = voyageQuest.unlocksRoute
      ? `\n\n🧭 "${getRouteChainName(voyageQuest.unlocksRoute)}" 항로가 열렸습니다!`
      : '';
    hud.showDialogue(
      '항구 관리인',
      `${voyageQuest.arriveLine}${routeNote}\n\n보상: ${voyageQuest.reward.toLocaleString('ko-KR')} 두캇`,
      [{ label: '확인', onClick: () => hud.hideDialogue() }]
    );
  }
}

// ---- 전체 지도(월드맵): M키로 토글, 화살표로 해역 페이지 전환 ----
// 이제 모든 페이지가 전세계 대륙/도시 데이터를 공유하고, 페이지별 위경도 범위(bounds)만
// 다르게 잡아 확대해 보여주는 "지도책" 방식이다(placeholder 페이지는 더 이상 없음).
const worldMapCityBase = CITIES.map((c) => ({ id: c.id, x: c.pos[0], z: c.pos[1], name: c.name, color: COUNTRY_COLORS[c.country] || '#e6c15a', capital: !!c.capital }));
let worldMapIndex = 0;

function regionBoundsToWorld(b) {
  const [x0, z0] = project(b.lonMin, b.latMin);
  const [x1, z1] = project(b.lonMax, b.latMax);
  return { minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) };
}

function renderWorldMapPage() {
  const region = WORLD_REGIONS[worldMapIndex];
  const locked = !!region.unlock && !isRouteUnlocked(region.id);
  const lockInfo = locked ? { rankLabel: RANKS[region.unlock.rankIndex]?.label } : null;
  hud.setWorldMapHeader(region.name, region.subtitle, worldMapIndex, WORLD_REGIONS.length, locked);
  const ship = seaScene ? { x: seaScene.ship.pos.x, z: seaScene.ship.pos.y, heading: seaScene.ship.heading } : null;
  // 대호황/대폭락은 실시간으로 바뀌므로 지도를 열 때마다(페이지 넘길 때도) 매번 새로 조회한다.
  const worldMapCities = worldMapCityBase.map((c) => ({ ...c, event: getCityEvent(c.id) }));
  hud.renderWorldMapReal({ landPolygons: LAND_POLYGONS, bounds: regionBoundsToWorld(region.bounds), cities: worldMapCities, regionBoxes: SEA_REGION_BOXES, ship, locked, lockInfo });
}

// 캔버스 width/height 속성을 뷰포트에 맞춰 직접 키운다(= 내부 해상도와 표시 크기가 항상
// 1:1로 맞아 흐릿해지지 않는다 — CSS로 늘리면 고정 해상도를 억지로 스트레치해서 깨져 보인다).
function resizeWorldMapCanvas() {
  const canvas = document.getElementById('world-map-canvas');
  const w = Math.round(Math.min(Math.max(window.innerWidth * 0.86, 640), 1500));
  const h = Math.round(Math.min(Math.max(window.innerHeight * 0.78, 480), 980));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
}

function openWorldMap() {
  if (state.screen === 'title') return;
  resizeWorldMapCanvas();
  hud.showWorldMap(true);
  renderWorldMapPage();
}
function closeWorldMap() { hud.showWorldMap(false); }
function cycleWorldMap(dir) {
  worldMapIndex = (worldMapIndex + dir + WORLD_REGIONS.length) % WORLD_REGIONS.length;
  renderWorldMapPage();
}
window.addEventListener('resize', () => {
  if (hud.isWorldMapOpen()) { resizeWorldMapCanvas(); renderWorldMapPage(); }
});

document.getElementById('mute-btn').addEventListener('click', () => {
  state.audioMuted = !state.audioMuted;
  audio.setMuted(state.audioMuted);
  const btn = document.getElementById('mute-btn');
  btn.textContent = state.audioMuted ? '🔇' : '🔊';
  btn.classList.toggle('muted', state.audioMuted);
  notify({ audioMutedChanged: true });
});

document.getElementById('world-map-prev').addEventListener('click', () => cycleWorldMap(-1));
document.getElementById('world-map-next').addEventListener('click', () => cycleWorldMap(1));

wireShipyardTabs();
subscribe((patch) => {
  if (patch.shipChanged) seaScene?.rebuildShip();
  if (patch.fleetChanged) seaScene?.rebuildEscorts();
});

// 항구(도시 화면)에 있는 동안엔 seaScene의 매 프레임 갱신이 멈추기 때문에, 시장 거래·의뢰
// 완료·은행·선원 고용처럼 항구에서만 가능한 행동들이 골드/선원 수를 바꿔도 상단 바(top-bar)가
// 갱신되지 않고 도킹 순간 값에 멈춰 있었다. 관련 변화가 있을 때마다 화면과 무관하게 새로고침.
subscribe((patch) => {
  if (state.screen === 'title') return;
  if (!(patch.goldChanged || patch.inventoryChanged || patch.questChanged || patch.crewChanged)) return;
  hud.setGold(state.gold);
  const shipDef = getShip(state.currentShipId);
  if (shipDef) hud.setCrewCount(state.crewCount ?? shipDef.crew, shipDef.crew, getCurrentMinCrew());
});

function refreshRank() {
  if (state.screen === 'title') return;
  const info = getRankInfo();
  hud.setRank(info.rank.label);
  if (info.isMax && !state.endingShown) {
    state.endingShown = true;
    audio.playEndingFanfare();
    const completedQuests = Object.values(state.quests || {}).filter((v) => v === 'completed').length;
    hud.showEnding([
      { val: `${state.gold.toLocaleString('ko-KR')} 두캇`, label: '재산' },
      { val: `${state.fleet.length + 1}척`, label: '함대 규모' },
      { val: `${state.pirateBounty || 0}회`, label: '해적 토벌' },
      { val: `${completedQuests}건`, label: '완료한 의뢰' },
    ]);
  }
}
subscribe(refreshRank);
document.getElementById('ending-close-btn').addEventListener('click', () => hud.hideEnding());

// ---- 선박 정보 카드 ----
const STAT_MAX = {
  hp: Math.max(...SHIPS.map((s) => s.hp)),
  cargo: Math.max(...SHIPS.map((s) => s.cargo)),
  cannons: Math.max(...SHIPS.map((s) => s.cannons)),
  turnRate: Math.max(...SHIPS.map((s) => s.turnRate)),
  speed: Math.max(...SHIPS.map((s) => s.speed)),
  // armor 최댓값 = 등급별 기본 방어력(가장 높은 건 초대형+전투용) + 최고 등급 장갑판 하나
  // (슬롯이 1개뿐이라 여러 개를 겹쳐 낄 수 없다).
  armor: Math.max(...SHIPS.map(getBaseArmor)) + Math.max(...partsBySlot('armor').map((p) => p.effects.armorAdd || 0)),
};

function openShipInfo() {
  const baseShipDef = getShip(state.currentShipId);
  const shipDef = getEffectiveShipDef(baseShipDef, state.shipParts);
  if (!shipDef) return;
  const role = SHIP_ROLES[shipDef.role] || SHIP_ROLES.trade;
  const cls = SHIP_CLASSES[shipDef.class];
  // 전투력은 "지금 실제 장착된 부품" 기준으로만 계산한다(완전무장 가정치 아님) — 대포를
  // 하나도 안 달았으면 화력 점수가 그대로 0으로 나온다.
  const combatPower = getCombatPower(baseShipDef, state.shipParts);
  hud.renderShipInfo({
    name: shipDef.name,
    roleLabel: role.label,
    roleColor: role.color,
    sub: `${COUNTRY_NAMES[shipDef.country] || shipDef.country} · ${cls.label} · ${shipDef.era}`,
    desc: shipDef.desc,
    combatVal: combatPower.score,
    hpRatio: shipDef.hp / STAT_MAX.hp, hpVal: shipDef.hp,
    armorRatio: (shipDef.armor || 0) / STAT_MAX.armor, armorVal: `${shipDef.armor || 0}%`,
    cargoRatio: shipDef.cargo / STAT_MAX.cargo, cargoVal: `${shipDef.cargo}t`,
    cannonsRatio: shipDef.cannons / STAT_MAX.cannons, cannonsVal: `${shipDef.cannons}문`,
    turnRatio: shipDef.turnRate / STAT_MAX.turnRate, turnVal: `${shipDef.turnRate}°/s`,
    speedRatio: shipDef.speed / STAT_MAX.speed, speedVal: `${shipDef.speed}`,
    parts: Object.entries(PART_SLOTS).map(([slot, meta]) => {
      if (slot === 'cannon') {
        const arr = Array.isArray(state.shipParts.cannon) ? state.shipParts.cannon : (state.shipParts.cannon ? [state.shipParts.cannon] : []);
        const names = arr.filter(Boolean).map((id) => getPart(id)?.name).filter(Boolean);
        const slotCount = getCannonSlotCount(getShip(state.currentShipId));
        return { icon: meta.icon, label: `${meta.label} (${names.length}/${slotCount})`, name: names.join(', ') || undefined };
      }
      const part = state.shipParts[slot] ? getPart(state.shipParts[slot]) : null;
      return { icon: meta.icon, label: meta.label, name: part?.name };
    }),
    skills: getShipSkills(getShip(state.currentShipId)).map((s) => ({ name: s.name, desc: s.desc })),
  });
  hud.showShipInfo(true);
}
function closeShipInfo() { hud.showShipInfo(false); }

document.querySelectorAll('.gender-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.gender-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.gender = btn.dataset.gender;
  });
});

function timeAgo(ts) {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return '방금 전';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

function enterGame() {
  hud.showTitle(false);
  hud.showTopBar(true);
  hud.showLocationBanner(true);
  if (state.shipHp == null) initShipHp();
  if (state.crewCount == null) initCrewCount();
  audio.ensureContext();
  audio.resume();
  audio.setMuted(!!state.audioMuted);
  goToSea();
  refreshRank();
}

const savedGame = hasSave() ? loadSaveData() : null;
if (savedGame) {
  document.getElementById('continue-wrap').classList.remove('hidden');
  const shipName = getShip(savedGame.currentShipId)?.name || savedGame.currentShipId;
  document.getElementById('continue-summary').textContent =
    `${(savedGame.gold ?? 0).toLocaleString('ko-KR')} 두캇 · ${shipName} · ${timeAgo(savedGame.savedAt)} 저장됨`;
}

document.getElementById('continue-btn').addEventListener('click', () => {
  applySave(savedGame);
  syncUnlockedRoutes();
  document.querySelectorAll('.gender-btn').forEach((b) => b.classList.toggle('active', b.dataset.gender === state.gender));
  const muteBtn = document.getElementById('mute-btn');
  muteBtn.textContent = state.audioMuted ? '🔇' : '🔊';
  muteBtn.classList.toggle('muted', !!state.audioMuted);
  enterGame();
});

document.getElementById('start-btn').addEventListener('click', () => {
  if (hasSave() && !confirm('새로 시작하면 기존 저장 데이터가 사라집니다. 계속할까요?')) return;
  deleteSave();
  enterGame();
});

subscribe(() => { if (state.screen !== 'title') saveGame(); });
setInterval(() => { if (state.screen !== 'title') saveGame(); }, 15000);
window.addEventListener('beforeunload', () => { if (state.screen !== 'title') saveGame(); });

let lastTime = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  const elapsed = now / 1000;

  if (state.screen !== 'title') {
    checkQuestChainAnnouncements();
    const anyBigPanelOpen = hud.isShipInfoOpen() || hud.isShipyardOpen() || hud.isMarketOpen() || hud.isQuestBoardOpen();
    if (consumeJustPressed('KeyM') && !anyBigPanelOpen) {
      hud.isWorldMapOpen() ? closeWorldMap() : openWorldMap();
    }
    if (hud.isWorldMapOpen()) {
      if (consumeJustPressed('ArrowLeft')) cycleWorldMap(-1);
      if (consumeJustPressed('ArrowRight')) cycleWorldMap(1);
    }
    if (consumeJustPressed('KeyT') && !hud.isWorldMapOpen() && !hud.isShipyardOpen() && !hud.isMarketOpen() && !hud.isQuestBoardOpen()) {
      hud.isShipInfoOpen() ? closeShipInfo() : openShipInfo();
    }
    if (consumeJustPressed('KeyF')) {
      if (state.screen === 'city') citySceneObj?.handleInteract();
      else if (state.screen === 'sea') seaScene?.handleBoardKey();
    }
    // 바다 위 응급 수리 — 보유한 자재를(부족분을 채우는 데 필요한 만큼만) 소모해 내구도를
    // 채운다. 항구 조선소의 즉시 전액 수리보다 항상 비효율적이라 완전 수리는 사실상 안 되고,
    // 부족하면 계속 눌러 남은 자재를 더 쓸 수 있다.
    if (consumeJustPressed('KeyR') && state.screen === 'sea' && seaScene) {
      const res = repairAtSea();
      if (res.ok) hud.toast(`자재 ${res.materialsUsed}개로 선체를 ${res.healed} 복구했습니다. (내구도 ${Math.round(state.shipHp)}/${seaScene.ship.shipDef.hp})`);
      else hud.toast(res.reason);
    }
    if (consumeJustPressed('KeyE') && !hud.isShipyardOpen() && !hud.isMarketOpen() && !hud.isQuestBoardOpen()) {
      const priceMap = state.screen === 'city' && citySceneObj
        ? Object.fromEntries(getMarketRows(citySceneObj.city.id).map((r) => [r.good.id, r.price]))
        : null;
      const supplies = Object.values(SUPPLY_DEFS).map((def) => ({ icon: def.icon, name: def.name, qty: state[def.id] }));
      hud.toggleInventory(state.inventory, priceMap, supplies, { used: getCargoUsed(), cap: getCargoCapacity() });
    }
    if (consumeJustPressed('Escape')) {
      hud.hideDialogue();
      hud.closeInventory();
      closeWorldMap();
      closeShipInfo();
      hud.hideShipyard();
      hud.hideMarket();
      hud.hideQuestBoard();
    }
  }

  if (!hud.isWorldMapOpen() && !hud.isShipInfoOpen() && !hud.isShipyardOpen() && !hud.isMarketOpen() && !hud.isQuestBoardOpen()) {
    const ctx = surface.ctx;
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
    if (state.screen === 'sea' && seaScene) {
      seaScene.update(delta, elapsed);
      seaScene.render(ctx);
    } else if (state.screen === 'city' && citySceneObj) {
      citySceneObj.update(delta);
      citySceneObj.render(ctx);
    }
    surface.blitTo(displayCtx, displayCanvas.width, displayCanvas.height);
  }

  clearFrame();
}

hud.showLoading(false);
requestAnimationFrame(animate);

window.__debug = {
  get seaScene() { return seaScene; },
  get citySceneObj() { return citySceneObj; },
  state, notify,
  acceptQuest, turnInDelivery, checkBountyKill, checkVoyageArrival, getQuestStatus, isQuestChainReady,
  checkDiscoveryEvents, checkQuestRespawns, addReputation, openQuestBoard, buyGood, getCargoCapacity, getCargoUsed,
  buyShip, buildShip, saveGame, loadSaveData, applySave, SHIPS, CITIES, goToCity, computeScore, checkExplorationSite,
};
