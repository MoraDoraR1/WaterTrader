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
pointerControls.onLockChange = (locked) => {
  hud.showLockPrompt(!locked && state.screen !== 'title');
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
  citySceneObj = null;
  setScreen('sea');
  hud.showSeaHud(true);
  hud.showActionHints(true, ['W/S 속도', 'A/D 선회', '우클릭 홀드 방향조정', '좌클릭 정박/포격', '스페이스 포격']);
}

function goToCity(cityId) {
  hud.showSeaHud(false);
  hud.showTargetHp(false);
  hud.showCombatBanner(false);
  citySceneObj = new CityScene(cityId, () => goToSea(cityId));
  setScreen('city');
  hud.showActionHints(true, ['WASD 이동', '우클릭 지점이동', 'F/좌클릭 상호작용', 'E 인벤토리']);
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
  hud.showCrosshair(true);
  initShipHp();
  goToSea();
  pointerControls.requestLock();
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
      const open = hud.toggleInventory(state.inventory);
      if (open && document.pointerLockElement) document.exitPointerLock();
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
