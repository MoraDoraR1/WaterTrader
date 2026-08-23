import * as THREE from 'three';
import { PointerLookControls } from './controls/pointerLook.js';
import { consumeJustPressed, clearFrame } from './controls/keys.js';
import { SeaScene } from './scenes/seaScene.js';
import { CityScene } from './scenes/cityScene.js';
import { state, setScreen, initShipHp } from './state.js';
import { hud } from './ui/hud.js';

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
  hud.showActionHints(true, ['드래그 시점회전', 'W/S 속도', 'A/D 선회', '좌클릭 정박/포격', '스페이스 포격']);
}

function goToCity(cityId) {
  hud.showSeaHud(false);
  hud.showTargetHp(false);
  hud.showCombatBanner(false);
  citySceneObj = new CityScene(cityId, () => goToSea(cityId));
  setScreen('city');
  hud.showActionHints(true, ['드래그 시점회전', 'WASD 이동', '우클릭 지점이동', 'F/좌클릭 상호작용', 'E 인벤토리']);
  hud.toast(`${citySceneObj.city.name}에 정박했습니다.`);
}

document.querySelectorAll('.gender-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.gender-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.gender = btn.dataset.gender;
  });
});

document.getElementById('start-btn').addEventListener('click', () => {
  hud.showTitle(false);
  hud.showTopBar(true);
  hud.showLocationBanner(true);
  hud.showCrosshair(true);
  initShipHp();
  goToSea();
});

let lastTime = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  const elapsed = now / 1000;

  if (state.screen !== 'title') {
    if (consumeJustPressed('KeyF')) {
      if (state.screen === 'city') citySceneObj?.handleInteract(camera);
    }
    if (consumeJustPressed('KeyE')) {
      hud.toggleInventory(state.inventory);
    }
    if (consumeJustPressed('Escape')) {
      hud.hideDialogue();
      hud.closeInventory();
    }
  }

  if (state.screen === 'sea' && seaScene) {
    seaScene.update(delta, elapsed, camera, pointerControls);
    renderer.render(seaScene.scene, camera);
  } else if (state.screen === 'city' && citySceneObj) {
    citySceneObj.update(delta, elapsed, camera, pointerControls);
    renderer.render(citySceneObj.scene, camera);
  }

  clearFrame();
}

hud.showLoading(false);
requestAnimationFrame(animate);

window.__debug = { get seaScene() { return seaScene; }, get citySceneObj() { return citySceneObj; }, camera, state };
