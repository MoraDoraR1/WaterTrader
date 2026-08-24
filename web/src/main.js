import * as THREE from 'three';
import { PointerLookControls } from './controls/pointerLook.js';
import { consumeJustPressed, clearFrame } from './controls/keys.js';
import { SeaScene } from './scenes/seaScene.js';
import { CityScene } from './scenes/cityScene.js';
import { state, setScreen, initShipHp, subscribe } from './state.js';
import { hud } from './ui/hud.js';
import { wireShipyardTabs } from './ui/shipyardPanel.js';
import { WORLD_REGIONS } from './data/worldRegions.js';
import { LAND_POLYGONS, MAINLAND_POLY, BRITAIN_POLY } from './data/coastline.js';
import { CITIES } from './data/cities.js';
import { SHIPS, SHIP_ROLES, SHIP_CLASSES, COUNTRY_COLORS, COUNTRY_NAMES, getShip } from './data/ships.js';
import { getEffectiveShipDef, PART_SLOTS, getPart } from './data/shipParts.js';
import { SEA_REGION_BOXES } from './data/seaRegions.js';
import { hasSave, saveGame, loadSaveData, applySave, deleteSave } from './systems/save.js';
import { payWagesOnDock } from './systems/crew.js';

const wrap = document.getElementById('canvas-wrap');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
wrap.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 4000);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const pointerControls = new PointerLookControls(renderer.domElement);
pointerControls.onLeftClick = () => {
  if (state.screen === 'sea') seaScene?.handleLeftClick();
  else if (state.screen === 'city') citySceneObj?.handleInteract(camera);
};
pointerControls.onRightClick = () => {
  if (state.screen === 'city') citySceneObj?.handleRightClick(camera);
};

let seaScene = null;
let citySceneObj = null;

function goToSea(fromCityId) {
  hud.hideDialogue();
  hud.closeInventory();
  if (!seaScene) { seaScene = new SeaScene(); seaScene.setOnDock(goToCity); }
  if (fromCityId) {
    // 도시에서 나올 때는 정박했던 위치 그대로 유지
  }
  // 배 진행 방향 기준으로 "뒤에서 바라보는" 기본 시점으로 초기화(yaw == heading일 때 배 후방)
  pointerControls.yaw = seaScene.ship.heading;
  citySceneObj = null;
  setScreen('sea');
  hud.showSeaHud(true);
  const role = SHIP_ROLES[seaScene.ship.shipDef.role] || SHIP_ROLES.trade;
  hud.setShipRoleBadge(role.label, role.color);
  hud.showActionHints(true, ['드래그 시점회전', 'W/S 속도', 'A/D 선회', '좌클릭 정박/포격', '스페이스 포격', 'M 전체지도', 'T 선박정보']);
}

function goToCity(cityId) {
  hud.showSeaHud(false);
  hud.showTargetHp(false);
  hud.showCombatBanner(false);
  citySceneObj = new CityScene(cityId, () => goToSea(cityId));
  // 항구관리인을 마주보는 상태로 입항하도록, 배 쪽에서 쓰던 "시점=진행방향" 관례와 동일하게
  // 카메라 시점(yaw)도 스폰 시 그 방향으로 맞춘다. pitch도 눈높이 근처로 낮춰야
  // 체이스캠 특유의 내려다보는 각도 때문에 화면 중앙 레이가 관리인 발밑 아래로 빗나가지 않는다.
  pointerControls.yaw = citySceneObj.spawnFacing;
  pointerControls.pitch = 0.05;
  setScreen('city');
  hud.showActionHints(true, ['드래그 시점회전', 'WASD 이동', '우클릭 지점이동', 'F/좌클릭 상호작용', 'E 인벤토리', 'M 전체지도', 'T 선박정보']);

  const { wage, paid } = payWagesOnDock();
  hud.setGold(state.gold);
  hud.setCrewMorale(state.crewMorale ?? 100);
  const wageNote = wage <= 0 ? '' : paid
    ? ` (승무원 급여 ${wage.toLocaleString('ko-KR')} 두캇 지급)`
    : ' (급여를 지급하지 못해 사기가 크게 떨어졌습니다!)';
  hud.toast(`${citySceneObj.city.name}에 정박했습니다.${wageNote}`);
}

// ---- 전체 지도(월드맵): M키로 토글, 화살표로 해역 페이지 전환 ----
// 열람 전용 기능이며 플레이어의 실제 이동/조작과는 무관하다. 열려있는 동안은
// 게임 시뮬레이션 갱신을 멈춰(스냅샷처럼) 조작이 새지 않도록 한다.
const worldMapAllPts = [...MAINLAND_POLY, ...BRITAIN_POLY, ...CITIES.map((c) => c.pos)];
const wmXs = worldMapAllPts.map((p) => p[0]), wmZs = worldMapAllPts.map((p) => p[1]);
const wmPad = 60;
const worldMapBounds = {
  minX: Math.min(...wmXs) - wmPad, maxX: Math.max(...wmXs) + wmPad,
  minZ: Math.min(...wmZs) - wmPad, maxZ: Math.max(...wmZs) + wmPad,
};
const worldMapCities = CITIES.map((c) => ({ x: c.pos[0], z: c.pos[1], name: c.name, color: COUNTRY_COLORS[c.country] || '#e6c15a' }));
let worldMapIndex = 0;

function renderWorldMapPage() {
  const region = WORLD_REGIONS[worldMapIndex];
  hud.setWorldMapHeader(region.name, region.subtitle, worldMapIndex, WORLD_REGIONS.length);
  if (region.kind === 'real') {
    const ship = seaScene ? { x: seaScene.ship.pos.x, z: seaScene.ship.pos.y, heading: seaScene.ship.heading } : null;
    hud.renderWorldMapReal({ landPolygons: LAND_POLYGONS, bounds: worldMapBounds, cities: worldMapCities, regionBoxes: SEA_REGION_BOXES, ship });
  } else {
    hud.renderWorldMapPlaceholder();
  }
}

function openWorldMap() {
  if (state.screen === 'title') return;
  hud.showWorldMap(true);
  renderWorldMapPage();
}

function closeWorldMap() {
  hud.showWorldMap(false);
}

function cycleWorldMap(dir) {
  worldMapIndex = (worldMapIndex + dir + WORLD_REGIONS.length) % WORLD_REGIONS.length;
  renderWorldMapPage();
}

document.getElementById('world-map-prev').addEventListener('click', () => cycleWorldMap(-1));
document.getElementById('world-map-next').addEventListener('click', () => cycleWorldMap(1));

wireShipyardTabs();
// 조선소에서 배를 구매하거나 부품을 장착/해제하면(state.currentShipId, state.shipParts 변경)
// 이미 떠 있는 바다 씬의 배 메시/스탯을 새로 반영해야 한다. 아직 바다에 나간 적이 없다면
// seaScene이 없으므로(첫 SeaScene 생성 시 이미 최신 상태를 읽어가므로) 별도 처리가 필요없다.
subscribe((patch) => {
  if (patch.shipChanged) seaScene?.rebuildShip();
  if (patch.fleetChanged) seaScene?.rebuildEscorts();
});

// ---- 선박 정보 카드: T키로 토글, 현재 탑승 중인 배의 능력치를 참고 지표(동급 최대치) 대비 막대로 표시 ----
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
  hud.showCrosshair(true);
  if (state.shipHp == null) initShipHp();
  goToSea();
}

// ---- 타이틀 화면: 저장 데이터가 있으면 "이어하기" 버튼과 요약을 보여준다 ----
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
  enterGame();
});

document.getElementById('start-btn').addEventListener('click', () => {
  if (hasSave() && !confirm('새로 시작하면 기존 저장 데이터가 사라집니다. 계속할까요?')) return;
  deleteSave();
  enterGame();
});

// ---- 자동 저장: 조선소/시장 등 의미 있는 변화가 생길 때(notify) + 주기적으로(항해 중 위치/골드/내구도 변화 포착) ----
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
      if (state.screen === 'city') citySceneObj?.handleInteract(camera);
    }
    if (consumeJustPressed('KeyE') && !hud.isShipyardOpen() && !hud.isMarketOpen() && !hud.isQuestBoardOpen()) {
      hud.toggleInventory(state.inventory);
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

  // 월드맵/선박정보/조선소/시장/의뢰 게시판 열람 중에는 시뮬레이션을 멈춰(스냅샷) 조작이 뒤에서 새지 않게 한다.
  if (!hud.isWorldMapOpen() && !hud.isShipInfoOpen() && !hud.isShipyardOpen() && !hud.isMarketOpen() && !hud.isQuestBoardOpen()) {
    if (state.screen === 'sea' && seaScene) {
      seaScene.update(delta, elapsed, camera, pointerControls);
      renderer.render(seaScene.scene, camera);
    } else if (state.screen === 'city' && citySceneObj) {
      citySceneObj.update(delta, elapsed, camera, pointerControls);
      renderer.render(citySceneObj.scene, camera);
    }
  }

  clearFrame();
}

hud.showLoading(false);
requestAnimationFrame(animate);

window.__debug = { get seaScene() { return seaScene; }, get citySceneObj() { return citySceneObj; }, camera, state };
