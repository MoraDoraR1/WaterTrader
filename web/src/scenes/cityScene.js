import * as THREE from 'three';
import { buildCharacterMesh, CharacterController } from '../entities/character.js';
import { makeLabelSprite } from '../entities/label.js';
import { resolveCameraCollision } from '../controls/cameraCollision.js';
import { getCity, NPC_ROLE_COLORS, NPC_ROLE_LABELS } from '../data/cities.js';
import { COUNTRY_COLORS, COUNTRY_NAMES } from '../data/ships.js';
import { isDown } from '../controls/keys.js';
import { state } from '../state.js';
import { hud } from '../ui/hud.js';
import { openShipyard } from '../ui/shipyardPanel.js';
import { openMarket } from '../ui/marketPanel.js';
import { openQuestBoard } from '../ui/questPanel.js';

const BOUNDS = { minX: -85, maxX: 85, minZ: -85, maxZ: 85 };
const INTERACT_RANGE = 6.5;

function defaultNpcs() {
  return [
    { role: 'harbormaster', name: '항구 관리인', line: '아직 이 항구는 정비가 덜 되었습니다. 곧 상단이 들어올 예정입니다.' },
    { role: 'citizen', name: '부두 노동자', line: '이 항구는 아직 조용하지만, 언젠가 번성할 겁니다.' },
  ];
}

export class CityScene {
  constructor(cityId, onExit) {
    const city = getCity(cityId);
    this.city = { ...city, npcs: city.npcs && city.npcs.length ? city.npcs : defaultNpcs() };
    this.onExit = onExit;
    this.scene = new THREE.Scene();
    const tint = new THREE.Color(COUNTRY_COLORS[this.city.country] || '#888');
    this.scene.background = new THREE.Color('#cfe3ea');
    this.scene.fog = new THREE.Fog('#cfe3ea', 90, 420);

    const hemi = new THREE.HemisphereLight('#fff3d6', '#5a4a34', 1.0);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff3d6', 1.15);
    sun.position.set(80, 140, 60);
    sun.castShadow = false;
    this.scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshStandardMaterial({ color: '#c9b896', roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    this.ground = ground;

    this.buildingColliders = [];
    this._buildPlaza(tint);
    this._buildBuildings(tint);
    this._buildDock();

    this.npcObjects = [];
    this._buildNpcs();

    this.gender = state.gender;
    this.characterMesh = buildCharacterMesh(this.gender);
    this.scene.add(this.characterMesh);
    this.character = new CharacterController(this.characterMesh);

    // 입항하면 광장 한복판이 아니라 항구관리인 바로 앞에서 시작한다 — 원형 배치의 중심(0,-10)
    // 쪽으로 몇 걸음 다가선 지점에 세우고, spawnFacing에 그 관리인을 바라보는 각도를 저장해
    // main.js가 카메라 시점(yaw)도 같이 맞추게 한다.
    const harbormaster = this.npcObjects.find((o) => o.userData.npc.role === 'harbormaster');
    if (harbormaster) {
      const centerX = 0, centerZ = -10;
      const hx = harbormaster.position.x, hz = harbormaster.position.z;
      let dx = centerX - hx, dz = centerZ - hz;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
      const spawnX = hx + dx * 3.5, spawnZ = hz + dz * 3.5;
      this.character.setPosition(spawnX, spawnZ);
      this.spawnFacing = Math.atan2(hx - spawnX, hz - spawnZ);
    } else {
      this.character.setPosition(0, 40);
      this.spawnFacing = Math.PI;
    }

    this.raycaster = new THREE.Raycaster();
    this.activeDialogueTarget = null;
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.scene.updateMatrixWorld(true);
    this.buildingBoxes = this.buildingColliders.map((mesh) => new THREE.Box3().setFromObject(mesh));
  }

  _buildPlaza(tint) {
    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(30, 30, 0.3, 24),
      new THREE.MeshStandardMaterial({ color: '#d8cba3' })
    );
    plaza.position.y = 0.15;
    this.scene.add(plaza);

    const fountain = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 4.4, 1.4, 16),
      new THREE.MeshStandardMaterial({ color: '#9aa5a0' })
    );
    fountain.position.y = 0.7;
    this.scene.add(fountain);

    const banner = makeLabelSprite(`${this.city.name} (${COUNTRY_NAMES[this.city.country]})`, { scale: 1.3 });
    banner.position.set(0, 14, 0);
    this.scene.add(banner);
  }

  _buildBuildings(tint) {
    const positions = [
      [-46, -20, 0], [46, -20, Math.PI], [-46, 20, 0], [46, 20, Math.PI],
      [0, -55, 0], [-60, -55, 0.3], [60, -55, -0.3],
    ];
    const wallMat = new THREE.MeshStandardMaterial({ color: '#e4dcc3', roughness: 0.95 });
    const roofMat = new THREE.MeshStandardMaterial({ color: tint.clone().lerp(new THREE.Color('#2a2016'), 0.35) });

    for (const [x, z, ry] of positions) {
      const g = new THREE.Group();
      const w = 16 + Math.random() * 6, d = 14 + Math.random() * 5, h = 10 + Math.random() * 4;
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      body.position.y = h / 2;
      g.add(body);
      this.buildingColliders.push(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, 6, 4), roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = h + 3;
      g.add(roof);
      g.position.set(x, 0, z);
      g.rotation.y = ry;
      this.scene.add(g);
    }

    // 플라자 경계 파티션(느낌만) — 담장
    const wallRing = new THREE.Mesh(
      new THREE.TorusGeometry(88, 1.2, 6, 32),
      new THREE.MeshStandardMaterial({ color: '#a99a78' })
    );
    wallRing.rotation.x = Math.PI / 2;
    wallRing.position.y = 0.6;
    this.scene.add(wallRing);
  }

  _buildDock() {
    const dock = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.6, 40),
      new THREE.MeshStandardMaterial({ color: '#5a4326' })
    );
    dock.position.set(0, 0.3, 78);
    this.scene.add(dock);

    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 90),
      new THREE.MeshStandardMaterial({ color: '#0f4a63' })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.05, 130);
    this.scene.add(water);

    const marker = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 5, 8),
      new THREE.MeshStandardMaterial({ color: '#e6c15a', emissive: '#3a2e10' })
    );
    marker.position.set(0, 2.5, 92);
    marker.userData.exitMarker = true;
    this.scene.add(marker);

    const label = makeLabelSprite('배로 돌아가기', { scale: 0.8 });
    label.position.set(0, 7, 92);
    this.scene.add(label);

    this.exitMarker = marker;
    this.exitPos = new THREE.Vector3(0, 0, 92);
  }

  _buildNpcs() {
    const angleStep = (Math.PI * 2) / Math.max(1, this.city.npcs.length);
    this.city.npcs.forEach((npc, i) => {
      const gender = npc.role === 'merchant' && i % 2 === 0 ? 'female' : 'male';
      const mesh = buildCharacterMesh(gender);
      const color = new THREE.Color(NPC_ROLE_COLORS[npc.role] || '#999');
      mesh.traverse((o) => { if (o.isMesh && o.geometry.type === 'CapsuleGeometry') o.material = o.material.clone(); });

      const marker = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.4, 20), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      marker.rotation.x = -Math.PI / 2;
      marker.position.y = 0.05;
      mesh.add(marker);

      const angle = angleStep * i - Math.PI / 2;
      const r = 18;
      mesh.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r - 10);
      mesh.rotation.y = angle + Math.PI;
      this.scene.add(mesh);

      const tag = makeLabelSprite(`${NPC_ROLE_LABELS[npc.role]}`, { scale: 0.55, bg: 'rgba(30,20,10,0.7)' });
      tag.position.set(0, mesh.userData.height + 0.6, 0);
      mesh.add(tag);

      mesh.userData.npc = npc;
      this.npcObjects.push(mesh);
    });
  }

  _raycastFromCenter(camera, objects) {
    // update()의 카메라 충돌 처리(resolveCameraCollision)가 같은 raycaster의
    // near/far를 임시로 좁혀 쓰고 복원하지 않으므로, 상호작용 판정 전에 항상 원상복구한다.
    this.raycaster.near = 0;
    this.raycaster.far = Infinity;
    this.raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    return this.raycaster.intersectObjects(objects, true);
  }

  _findInteractable(camera) {
    const objs = [...this.npcObjects, this.exitMarker];
    const hits = this._raycastFromCenter(camera, objs);
    if (!hits.length) return null;
    let obj = hits[0].object;
    while (obj && !obj.userData.npc && !obj.userData.exitMarker) obj = obj.parent;
    if (!obj) return null;
    const dist = obj.userData.exitMarker
      ? this.character.pos.distanceTo(this.exitPos)
      : this.character.pos.distanceTo(obj.position);
    if (dist > INTERACT_RANGE + 3) return null;
    return obj;
  }

  handleInteract(camera) {
    if (hud.isInventoryOpen() || hud.isShipyardOpen() || hud.isMarketOpen() || hud.isQuestBoardOpen()) return;
    const target = this._findInteractable(camera);
    if (!target) { hud.toast('상호작용할 대상이 없습니다.'); return; }

    if (target.userData.exitMarker) {
      this.onExit();
      return;
    }
    const npc = target.userData.npc;
    if (npc.role === 'shipwright') {
      hud.showDialogue(npc.name, npc.line, [
        { label: '배 구매', onClick: () => { hud.hideDialogue(); openShipyard('buy'); } },
        { label: '수리', onClick: () => { hud.hideDialogue(); openShipyard('repair'); } },
        { label: '부품', onClick: () => { hud.hideDialogue(); openShipyard('parts'); } },
        { label: '닫기', onClick: () => hud.hideDialogue() },
      ]);
      return;
    }
    if (npc.role === 'merchant') {
      hud.showDialogue(npc.name, npc.line, [
        { label: '거래', onClick: () => { hud.hideDialogue(); openMarket(this.city.id); } },
        { label: '닫기', onClick: () => hud.hideDialogue() },
      ]);
      return;
    }
    if (npc.role === 'harbormaster') {
      hud.showDialogue(npc.name, npc.line, [
        { label: '출항', onClick: () => { hud.hideDialogue(); this.onExit(); } },
        { label: '의뢰', onClick: () => { hud.hideDialogue(); openQuestBoard(this.city.id); } },
        { label: '닫기', onClick: () => hud.hideDialogue() },
      ]);
      return;
    }
    hud.showDialogue(npc.name, npc.line, [
      { label: '닫기', onClick: () => hud.hideDialogue() },
    ]);
  }

  handleRightClick(camera) {
    this.raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const point = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.groundPlane, point)) {
      this.character.moveTo(
        THREE.MathUtils.clamp(point.x, BOUNDS.minX, BOUNDS.maxX),
        THREE.MathUtils.clamp(point.z, BOUNDS.minZ, BOUNDS.maxZ)
      );
    }
  }

  update(delta, elapsed, camera, pointerControls) {
    const forward = (isDown('KeyW') ? 1 : 0) - (isDown('KeyS') ? 1 : 0);
    const strafe = (isDown('KeyD') ? 1 : 0) - (isDown('KeyA') ? 1 : 0);
    const inputVec = new THREE.Vector2(strafe, forward);

    this.character.update(delta, inputVec, pointerControls.yaw, BOUNDS, this.buildingBoxes);

    const camDist = 9.5 * pointerControls.zoom, baseLift = 1.8;
    const anchor = new THREE.Vector3(this.character.pos.x, 1.5, this.character.pos.z);
    const horizDist = camDist * Math.cos(pointerControls.pitch);
    const camX = anchor.x - Math.sin(pointerControls.yaw) * horizDist;
    const camZ = anchor.z - Math.cos(pointerControls.yaw) * horizDist;
    const camY = Math.max(0.6, anchor.y + baseLift + Math.sin(pointerControls.pitch) * camDist);
    const desired = new THREE.Vector3(camX, camY, camZ);
    const resolved = resolveCameraCollision(this.raycaster, this.buildingColliders, anchor, desired);
    resolved.y = Math.max(0.6, resolved.y);
    camera.position.copy(resolved);
    camera.lookAt(anchor);

    const interactable = this._findInteractable(camera);
    if (interactable) {
      const name = interactable.userData.exitMarker ? '배로 돌아가기' : interactable.userData.npc.name;
      hud.showInteractPrompt(true, `[F 또는 좌클릭] ${name}과 상호작용`);
    } else {
      hud.showInteractPrompt(false);
    }

    hud.setLocation(this.city.name, `${COUNTRY_NAMES[this.city.country]} 항구도시`);
  }
}
