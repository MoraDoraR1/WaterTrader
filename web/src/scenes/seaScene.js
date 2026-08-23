import * as THREE from 'three';
import { createOcean } from '../entities/ocean.js';
import { buildShipMesh, ShipController } from '../entities/ship.js';
import { NpcShip } from '../entities/pirate.js';
import { CannonballPool } from '../entities/cannon.js';
import { makeLabelSprite } from '../entities/label.js';
import { resolveCameraCollision } from '../controls/cameraCollision.js';
import { getShip, COUNTRY_COLORS } from '../data/ships.js';
import { CITIES } from '../data/cities.js';
import { SEA_NPC_SHIPS } from '../data/seaEntities.js';
import { isDown, consumeJustPressed } from '../controls/keys.js';
import { state, initShipHp, notify } from '../state.js';
import { hud } from '../ui/hud.js';

const DOCK_RANGE = 55;
const FIRE_COOLDOWN = 1.5;
const RESPAWN_CITY = 'lisboa';

export class SeaScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#bcd6e0');
    this.scene.fog = new THREE.Fog('#bcd6e0', 300, 2600);

    const hemi = new THREE.HemisphereLight('#dff0ff', '#1a3a2a', 0.9);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff3d6', 1.2);
    sun.position.set(400, 600, 200);
    this.scene.add(sun);

    this.ocean = createOcean();
    this.scene.add(this.ocean.mesh);

    this.cityMarkers = [];
    this.cameraColliders = [];
    this._buildCityMarkers();

    if (!state.shipHp) initShipHp();
    const shipDef = getShip(state.currentShipId);
    this.playerMesh = buildShipMesh(shipDef);
    this.scene.add(this.playerMesh);
    this.ship = new ShipController(this.playerMesh, shipDef, this.ocean.heightAt);
    this.ship.pos.set(state.shipPos[0], state.shipPos[1]);
    this.ship.heading = state.shipHeading || 0;

    this.cannonPool = new CannonballPool(this.scene);
    this.npcShips = SEA_NPC_SHIPS.map((d) => new NpcShip(this.scene, d));

    this.fireTimer = 0;
    this.hoveredCity = null;
    this.combatTarget = null;
    this.t = 0;
    this.onDock = null;
    this.raycaster = new THREE.Raycaster();

    this.scene.updateMatrixWorld(true);
    hud.initThrottle(-3, 5);
  }

  setOnDock(fn) { this.onDock = fn; }

  handleLeftClick() {
    if (state.inCombat) {
      this.fireCannon();
    } else if (this.hoveredCity && this.onDock) {
      this.onDock(this.hoveredCity.id);
    }
  }

  _buildCityMarkers() {
    // 도시는 바다 위에서 잘 보이는 작은 "미니어처 마을" 모형으로 표시한다.
    // (거대한 대륙 벽을 세우지 않음 — 카메라 클리핑과 시야를 가리는 문제를 피하기 위함)
    const cx = CITIES.reduce((s, c) => s + c.pos[0], 0) / CITIES.length;
    const cz = CITIES.reduce((s, c) => s + c.pos[1], 0) / CITIES.length;

    for (const city of CITIES) {
      const group = new THREE.Group();
      const dir = new THREE.Vector2(city.pos[0] - cx, city.pos[1] - cz);
      if (dir.lengthSq() < 1) dir.set(0, 1);
      dir.normalize();

      let seed = 0;
      for (let i = 0; i < city.id.length; i++) seed = (seed * 31 + city.id.charCodeAt(i)) >>> 0;
      const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

      const moundRadius = 26;
      const mound = new THREE.Mesh(
        new THREE.CylinderGeometry(moundRadius, moundRadius * 1.08, 5, 12),
        new THREE.MeshStandardMaterial({ color: '#8a9c72', roughness: 1 })
      );
      mound.position.y = 2.5;
      group.add(mound);
      this.cameraColliders.push(mound);

      const buildingCount = 4;
      let tallestY = 0, tallestX = 0, tallestZ = 0;
      for (let i = 0; i < buildingCount; i++) {
        const a = (i / buildingCount) * Math.PI * 2 + rand() * 0.6;
        const r = moundRadius * (0.25 + rand() * 0.4);
        const bx = Math.cos(a) * r, bz = Math.sin(a) * r;
        const w = 4 + rand() * 2.5, d = 4 + rand() * 2.5, h = 4.5 + rand() * 3;
        const bGroup = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          new THREE.MeshStandardMaterial({ color: '#e4dcc3', roughness: 0.95 })
        );
        body.position.y = h / 2;
        bGroup.add(body);
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(Math.max(w, d) * 0.75, 3.2, 4),
          new THREE.MeshStandardMaterial({ color: COUNTRY_COLORS[city.country] || '#7a5c3a' })
        );
        roof.rotation.y = Math.PI / 4;
        roof.position.y = h + 1.6;
        bGroup.add(roof);
        bGroup.position.set(bx, 5, bz);
        group.add(bGroup);
        this.cameraColliders.push(body);
        if (h > tallestY) { tallestY = h; tallestX = bx; tallestZ = bz; }
      }

      // 부두 — 바다(지도 중심) 방향으로 짧게 뻗어 정박 지점 역할
      const pierLen = 18;
      const pier = new THREE.Mesh(
        new THREE.BoxGeometry(6, 1.2, pierLen),
        new THREE.MeshStandardMaterial({ color: '#5a4326', roughness: 0.9 })
      );
      pier.rotation.y = Math.atan2(dir.x, dir.y);
      pier.position.set(-dir.x * (moundRadius * 0.7 + pierLen * 0.5), 0.6, -dir.y * (moundRadius * 0.7 + pierLen * 0.5));
      group.add(pier);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 9, 6), new THREE.MeshStandardMaterial({ color: '#4a3826' }));
      pole.position.set(tallestX, 5 + tallestY + 4.5, tallestZ);
      group.add(pole);

      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 3.6),
        new THREE.MeshStandardMaterial({ color: COUNTRY_COLORS[city.country] || '#999', side: THREE.DoubleSide })
      );
      flag.position.set(tallestX + 3, 5 + tallestY + 8, tallestZ);
      group.add(flag);

      const label = makeLabelSprite(city.name);
      label.position.set(tallestX, 5 + tallestY + 12, tallestZ);
      group.add(label);

      group.position.set(city.pos[0], 0, city.pos[1]);
      group.userData.cityId = city.id;
      const dockDist = moundRadius * 0.7 + pierLen * 0.9;
      group.userData.dockPos = new THREE.Vector2(
        city.pos[0] - dir.x * dockDist,
        city.pos[1] - dir.y * dockDist
      );
      this.scene.add(group);
      this.cityMarkers.push(group);
    }
  }

  dispose() {}

  _findNearestCityMarker() {
    let best = null, bestD = Infinity;
    for (const m of this.cityMarkers) {
      const d = m.userData.dockPos.distanceTo(this.ship.pos);
      if (d < bestD) { bestD = d; best = m; }
    }
    return { marker: best, dist: bestD };
  }

  _nearestHostile() {
    let best = null, bestD = Infinity;
    for (const npc of this.npcShips) {
      if (npc.dead || !npc.def.hostile) continue;
      const d = npc.pos.distanceTo(this.ship.pos);
      if (d < bestD) { bestD = d; best = npc; }
    }
    return best;
  }

  fireCannon() {
    if (this.fireTimer > 0) return;
    const target = this._nearestHostile();
    if (!target || target.pos.distanceTo(this.ship.pos) > 60) {
      hud.toast('사거리 내에 목표가 없습니다.');
      return;
    }
    this.fireTimer = FIRE_COOLDOWN;
    const toTarget = new THREE.Vector2(target.pos.x - this.ship.pos.x, target.pos.y - this.ship.pos.y);
    const relAngle = Math.atan2(toTarget.x, toTarget.y) - this.ship.heading;
    const side = Math.sin(relAngle) >= 0 ? 1 : -1;
    const sideDir = new THREE.Vector3(Math.cos(this.ship.heading) * side, 0, -Math.sin(this.ship.heading) * side);
    const origin = new THREE.Vector3(this.ship.pos.x, 3.4, this.ship.pos.y).addScaledVector(sideDir, this.playerMesh.userData.width * 0.5);
    for (let i = -1; i <= 1; i++) {
      const dir3 = new THREE.Vector3(toTarget.x, 0.22, toTarget.y).normalize();
      dir3.applyAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.06);
      this.cannonPool.fire(origin, dir3, 40, 'player');
    }
  }

  update(delta, elapsed, camera, pointerControls) {
    this.t = elapsed;

    if (consumeJustPressed('KeyW')) this.ship.throttleUp();
    if (consumeJustPressed('KeyS')) this.ship.throttleDown();
    this.ship.turnInput = (isDown('KeyD') ? 1 : 0) - (isDown('KeyA') ? 1 : 0);

    if (pointerControls.rightDown) {
      let diff = pointerControls.yaw - this.ship.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.ship.helmInput = THREE.MathUtils.clamp(diff * 1.6, -1, 1);
    } else {
      this.ship.helmInput = 0;
    }

    this.ship.update(delta, elapsed);
    this.ocean.update(elapsed, camera);

    const hostileNear = this.npcShips.some((n) => !n.dead && n.def.hostile && n.state === 'attack');
    if (hostileNear !== state.inCombat) {
      state.inCombat = hostileNear;
      hud.showCombatBanner(hostileNear);
      if (hostileNear) hud.toast('전투 시작! 좌클릭/스페이스바로 포격하세요.');
    }

    for (const npc of this.npcShips) {
      npc.update(delta, elapsed, this.ship.pos, this.ocean.heightAt, this.cannonPool);
    }

    this.fireTimer = Math.max(0, this.fireTimer - delta);
    if (state.inCombat && isDown('Space') && this.fireTimer <= 0) {
      this.fireCannon();
    }

    const targets = [
      { owner: 'player', position: new THREE.Vector3(this.ship.pos.x, 0, this.ship.pos.y), radius: this.playerMesh.userData.length * 0.55, ref: 'player' },
      ...this.npcShips.filter((n) => !n.dead).map((n) => ({ owner: n.owner, position: n.position, radius: n.radius, ref: n })),
    ];
    this.cannonPool.update(delta, targets, (target, ball) => {
      if (target.ref === 'player') {
        state.shipHp = Math.max(0, state.shipHp - 18);
      } else {
        target.ref.takeDamage(22);
        if (target.ref.dead) hud.toast(`${target.ref.def.name}을(를) 격침했습니다!`);
      }
    });

    if (state.shipHp <= 0) {
      hud.toast('배가 침몰했습니다! 항구로 예인됩니다.');
      const home = CITIES.find((c) => c.id === RESPAWN_CITY);
      this.ship.pos.set(home.pos[0] - 70, home.pos[1]);
      this.ship.notch = 0;
      state.gold = Math.max(0, state.gold - 100);
      initShipHp();
    }

    state.shipPos = [this.ship.pos.x, this.ship.pos.y];
    state.shipHeading = this.ship.heading;

    // 카메라: 드래그 중이 아니면 배 후방으로 서서히 재정렬(체이스캠)
    if (!pointerControls.dragging) {
      const targetYaw = this.ship.heading + Math.PI;
      let diff = targetYaw - pointerControls.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      pointerControls.yaw += diff * Math.min(1, delta * 2.5);
    }

    const camDist = 26, camHeight = 11;
    const anchor = new THREE.Vector3(this.ship.pos.x, this.ship.mesh.position.y + 4, this.ship.pos.y);
    let camX = this.ship.pos.x - Math.sin(pointerControls.yaw) * Math.cos(pointerControls.pitch) * camDist;
    let camZ = this.ship.pos.y - Math.cos(pointerControls.yaw) * Math.cos(pointerControls.pitch) * camDist;
    let camY = this.ship.mesh.position.y + camHeight + Math.sin(pointerControls.pitch) * camDist;
    // 해수면 관통 방지: 카메라 목표 지점의 파고보다 항상 위에 있도록 하한선을 둔다
    const waveAtCam = this.ocean.heightAt(camX, camZ, elapsed);
    camY = Math.max(camY, waveAtCam + 2.5);

    const desired = new THREE.Vector3(camX, camY, camZ);
    const resolved = resolveCameraCollision(this.raycaster, this.cameraColliders, anchor, desired);
    camera.position.copy(resolved);
    camera.lookAt(anchor);

    // HUD
    hud.setThrottle(this.ship.notch, -3, 5);
    hud.setCompass(this.ship.heading);
    hud.setShipHp(state.shipHp / getShip(state.currentShipId).hp);
    hud.setGold(state.gold);

    const nearest = this._findNearestCityMarker();
    if (nearest.marker && nearest.dist < 300) {
      const city = CITIES.find((c) => c.id === nearest.marker.userData.cityId);
      hud.setLocation('망망대해', `가까운 항구: ${city.name}`);
    } else {
      hud.setLocation('망망대해');
    }
    if (nearest.marker && nearest.dist < DOCK_RANGE) {
      const city = CITIES.find((c) => c.id === nearest.marker.userData.cityId);
      hud.showInteractPrompt(true, `[좌클릭] ${city.name}에 정박하기`);
      this.hoveredCity = city;
    } else {
      hud.showInteractPrompt(false);
      this.hoveredCity = null;
    }

    const combatTarget = this._nearestHostile();
    if (combatTarget && combatTarget.pos.distanceTo(this.ship.pos) < 90) {
      hud.showTargetHp(true);
      hud.setTargetHp(combatTarget.def.name, combatTarget.hp / combatTarget.maxHp);
    } else {
      hud.showTargetHp(false);
    }
  }
}
