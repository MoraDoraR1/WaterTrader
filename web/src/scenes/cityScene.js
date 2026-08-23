import * as THREE from 'three';
import { buildCharacterMesh, CharacterController } from '../entities/character.js';
import { makeLabelSprite } from '../entities/label.js';
import { getCity, NPC_ROLE_COLORS, NPC_ROLE_LABELS } from '../data/cities.js';
import { COUNTRY_COLORS, COUNTRY_NAMES } from '../data/ships.js';
import { isDown } from '../controls/keys.js';
import { state } from '../state.js';
import { hud } from '../ui/hud.js';

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

    this._buildPlaza(tint);
    this._buildBuildings(tint);
    this._buildDock();

    this.npcObjects = [];
    this._buildNpcs();

    this.gender = state.gender;
    this.characterMesh = buildCharacterMesh(this.gender);
    this.scene.add(this.characterMesh);
    this.character = new CharacterController(this.characterMesh);
    this.character.setPosition(0, 40);

    this.raycaster = new THREE.Raycaster();
    this.activeDialogueTarget = null;
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
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
    if (hud.isInventoryOpen()) return;
    const target = this._findInteractable(camera);
    if (!target) { hud.toast('상호작용할 대상이 없습니다.'); return; }

    if (target.userData.exitMarker) {
      this.onExit();
      return;
    }
    const npc = target.userData.npc;
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

    this.character.update(delta, inputVec, pointerControls.yaw, BOUNDS);

    const camDist = 8.5, camHeight = 3.4;
    const camX = this.character.pos.x - Math.sin(pointerControls.yaw) * Math.cos(pointerControls.pitch) * camDist;
    const camZ = this.character.pos.z - Math.cos(pointerControls.yaw) * Math.cos(pointerControls.pitch) * camDist;
    const camY = camHeight + Math.sin(pointerControls.pitch) * camDist + 1.2;
    camera.position.set(camX, Math.max(0.6, camY), camZ);
    camera.lookAt(this.character.pos.x, 1.5, this.character.pos.z);

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
