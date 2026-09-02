import { LOGICAL_W, LOGICAL_H, PixelSurface } from './render/canvas2d.js';
import { consumeJustPressed, clearFrame } from './controls/keys.js';
import { SeaScene } from './scenes/seaScene.js';
import { CityScene } from './scenes/cityScene.js';
import { state, setScreen, initShipHp, subscribe, notify } from './state.js';
import { hud } from './ui/hud.js';
import { wireShipyardTabs } from './ui/shipyardPanel.js';
import { WORLD_REGIONS } from './data/worldRegions.js';
import { LAND_POLYGONS, project } from './data/coastline.js';
import { CITIES } from './data/cities.js';
import { SHIPS, SHIP_ROLES, SHIP_CLASSES, COUNTRY_COLORS, COUNTRY_NAMES, getShip } from './data/ships.js';
import { getEffectiveShipDef, PART_SLOTS, getPart } from './data/shipParts.js';
import { SEA_REGION_BOXES } from './data/seaRegions.js';
import { hasSave, saveGame, loadSaveData, applySave, deleteSave } from './systems/save.js';
import { payWagesOnDock } from './systems/crew.js';
import { audio } from './systems/audio.js';
import { getRankInfo } from './systems/rank.js';
import { getMarketRows } from './systems/market.js';

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
    if (state.screen === 'sea') seaScene?.handleLeftClick();
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
  hud.showActionHints(true, ['휠 확대/축소', 'W/S 속도', 'A/D 선회', '우클릭 자동항해', '좌클릭 정박/포격', '스페이스 포격', 'M 전체지도', 'T 선박정보']);
}

function goToCity(cityId) {
  hud.showSeaHud(false);
  hud.showTargetHp(false);
  hud.showCombatBanner(false);
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
  hud.toast(`${citySceneObj.city.name}에 정박했습니다.${wageNote}`);
}

// ---- 전체 지도(월드맵): M키로 토글, 화살표로 해역 페이지 전환 ----
// 이제 모든 페이지가 전세계 대륙/도시 데이터를 공유하고, 페이지별 위경도 범위(bounds)만
// 다르게 잡아 확대해 보여주는 "지도책" 방식이다(placeholder 페이지는 더 이상 없음).
const worldMapCities = CITIES.map((c) => ({ x: c.pos[0], z: c.pos[1], name: c.name, color: COUNTRY_COLORS[c.country] || '#e6c15a' }));
let worldMapIndex = 0;

function regionBoundsToWorld(b) {
  const [x0, z0] = project(b.lonMin, b.latMin);
  const [x1, z1] = project(b.lonMax, b.latMax);
  return { minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) };
}

function renderWorldMapPage() {
  const region = WORLD_REGIONS[worldMapIndex];
  hud.setWorldMapHeader(region.name, region.subtitle, worldMapIndex, WORLD_REGIONS.length);
  const ship = seaScene ? { x: seaScene.ship.pos.x, z: seaScene.ship.pos.y, heading: seaScene.ship.heading } : null;
  hud.renderWorldMapReal({ landPolygons: LAND_POLYGONS, bounds: regionBoundsToWorld(region.bounds), cities: worldMapCities, regionBoxes: SEA_REGION_BOXES, ship });
}

function openWorldMap() {
  if (state.screen === 'title') return;
  hud.showWorldMap(true);
  renderWorldMapPage();
}
function closeWorldMap() { hud.showWorldMap(false); }
function cycleWorldMap(dir) {
  worldMapIndex = (worldMapIndex + dir + WORLD_REGIONS.length) % WORLD_REGIONS.length;
  renderWorldMapPage();
}

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

function refreshRank() {
  if (state.screen === 'title') return;
  const info = getRankInfo();
  hud.setRank(info.rank.label);
  if (info.isMax && !state.endingShown) {
    state.endingShown = true;
    audio.playCaptureFanfare();
    const completedQuests = Object.values(state.quests || {}).filter((v) => v === 'completed').length;
    hud.showEnding([
      { val: `${state.gold.toLocaleString('ko-KR')} 두캇`, label: '재산' },
      { val: `${state.fleet.length + 1}척`, label: '함대 규모' },
      { val: `${state.captureCount || 0}회`, label: '나포 성공' },
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
};

function openShipInfo() {
  const shipDef = getEffectiveShipDef(getShip(state.currentShipId), state.shipParts);
  if (!shipDef) return;
  const role = SHIP_ROLES[shipDef.role] || SHIP_ROLES.trade;
  const cls = SHIP_CLASSES[shipDef.class];
  hud.renderShipInfo({
    name: shipDef.name,
    roleLabel: role.label,
    roleColor: role.color,
    sub: `${COUNTRY_NAMES[shipDef.country] || shipDef.country} · ${cls.label} · ${shipDef.era}`,
    desc: shipDef.desc,
    hpRatio: shipDef.hp / STAT_MAX.hp, hpVal: shipDef.hp,
    cargoRatio: shipDef.cargo / STAT_MAX.cargo, cargoVal: `${shipDef.cargo}t`,
    cannonsRatio: shipDef.cannons / STAT_MAX.cannons, cannonsVal: `${shipDef.cannons}문`,
    turnRatio: shipDef.turnRate / STAT_MAX.turnRate, turnVal: `${shipDef.turnRate}°/s`,
    speedRatio: shipDef.speed / STAT_MAX.speed, speedVal: `${shipDef.speed}`,
    parts: Object.entries(PART_SLOTS).map(([slot, meta]) => {
      const part = state.shipParts[slot] ? getPart(state.shipParts[slot]) : null;
      return { icon: meta.icon, label: meta.label, name: part?.name };
    }),
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
    }
    if (consumeJustPressed('KeyE') && !hud.isShipyardOpen() && !hud.isMarketOpen() && !hud.isQuestBoardOpen()) {
      const priceMap = state.screen === 'city' && citySceneObj
        ? Object.fromEntries(getMarketRows(citySceneObj.city.id).map((r) => [r.good.id, r.price]))
        : null;
      hud.toggleInventory(state.inventory, priceMap);
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
};
