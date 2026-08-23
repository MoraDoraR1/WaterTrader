import * as THREE from 'three';
import { createOcean } from '../entities/ocean.js';
import { buildShipMesh, ShipController } from '../entities/ship.js';
import { NpcShip } from '../entities/pirate.js';
import { CannonballPool } from '../entities/cannon.js';
import { makeLabelSprite } from '../entities/label.js';
import { resolveCameraCollision } from '../controls/cameraCollision.js';
import { getShip, COUNTRY_COLORS } from '../data/ships.js';
import { CITIES } from '../data/cities.js';
import { MAINLAND_POLY, BRITAIN_POLY, LAND_POLYGONS, pointOnAnyLand, distanceToPolygonEdge, pointInPolygon } from '../data/coastline.js';
import { seaRegionAt } from '../data/seaRegions.js';
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
    this._buildLandmasses();
    this._buildCityMarkers();
    this.moundColliders = CITIES.map((c) => ({ x: c.pos[0], z: c.pos[1], r: 30 }));

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

    const allPts = [...MAINLAND_POLY, ...BRITAIN_POLY, ...CITIES.map((c) => c.pos)];
    const xs = allPts.map((p) => p[0]), zs = allPts.map((p) => p[1]);
    const pad = 60;
    this.minimapBounds = {
      minX: Math.min(...xs) - pad, maxX: Math.max(...xs) + pad,
      minZ: Math.min(...zs) - pad, maxZ: Math.max(...zs) + pad,
    };
    hud.initMinimap(LAND_POLYGONS, this.minimapBounds);
    this.minimapCities = CITIES.map((c) => ({ x: c.pos[0], z: c.pos[1], color: COUNTRY_COLORS[c.country] || '#e6c15a' }));
  }

  setOnDock(fn) { this.onDock = fn; }

  handleLeftClick() {
    if (state.inCombat) {
      this.fireCannon();
    } else if (this.hoveredCity && this.onDock) {
      this.onDock(this.hoveredCity.id);
    }
  }

  _buildLandmasses() {
    // ExtrudeGeometry의 윗면(cap)은 폴리곤 테두리 점들로만 삼각분할되어
    // "내륙" 버텍스가 존재하지 않는다(버텍스 컬러로는 해안→내륙 그라데이션 표현 불가).
    // 대신 해안까지의 거리 기반 그라데이션을 캔버스에 구워 텍스처로 입힌다.
    const cliff = new THREE.Color('#8a7658');
    const cliffWet = new THREE.Color('#544736');
    const sideMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });

    this.landMeshes = this.landMeshes || [];
    for (const poly of [MAINLAND_POLY, BRITAIN_POLY]) {
      // rotateX(-90°) 매핑 (x,y,depth)->(x,depth,-y) 이므로, y에 -z를 넣어야
      // 최종 메시 좌표가 게임 좌표계(x,z)와 정확히 일치한다(면 뒤집힘/노멀 오류 없이).
      const shape = new THREE.Shape();
      poly.forEach(([x, z], i) => {
        if (i === 0) shape.moveTo(x, -z); else shape.lineTo(x, -z);
      });
      // 해안 절벽이 너무 높으면 뒤쪽 도시 미니어처(마운드+건물)를 가려버리므로 낮게 유지한다.
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 7, bevelEnabled: true, bevelThickness: 1.8, bevelSize: 3.5, bevelSegments: 3 });
      geo.rotateX(-Math.PI / 2);

      const posAttr = geo.attributes.position;
      let maxY = -Infinity;
      for (let i = 0; i < posAttr.count; i++) maxY = Math.max(maxY, posAttr.getY(i));

      const colors = new Float32Array(posAttr.count * 3);
      const tmp = new THREE.Color();
      for (let i = 0; i < posAttr.count; i++) {
        const y = posAttr.getY(i);
        const topness = (y - maxY * 0.55) / (maxY * 0.45);
        if (topness <= 0.05) {
          // 절벽면: 수면 근처는 짙게, 위로 갈수록 흙색 (측면은 버텍스가 촘촘해 자연스럽게 이어진다)
          tmp.copy(cliffWet).lerp(cliff, THREE.MathUtils.clamp(y / (maxY * 0.5), 0, 1));
        } else {
          tmp.copy(cliff); // 새 텍스처 윗면 메시에 가려질 아랫단 — 색은 크게 중요하지 않음
        }
        colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mesh = new THREE.Mesh(geo, sideMat);
      this.scene.add(mesh);
      this.cameraColliders.push(mesh);
      this.landMeshes.push(mesh);

      const capMesh = this._buildTerrainCap(shape, poly, maxY);
      this.scene.add(capMesh);
      this.cameraColliders.push(capMesh);

      this._scatterHills(poly, maxY);
    }
  }

  _buildTerrainCap(shape, poly, maxY) {
    const capGeo = new THREE.ShapeGeometry(shape);
    capGeo.rotateX(-Math.PI / 2);
    capGeo.translate(0, maxY + 0.15, 0);

    // ShapeGeometry의 기본 UV는 shape 로컬 바운딩 박스 기준이므로,
    // 같은 바운딩 박스로 캔버스를 구우면 좌표가 정확히 일치한다.
    let minLX = Infinity, maxLX = -Infinity, minLY = Infinity, maxLY = -Infinity;
    for (const [x, z] of poly) {
      minLX = Math.min(minLX, x); maxLX = Math.max(maxLX, x);
      minLY = Math.min(minLY, -z); maxLY = Math.max(maxLY, -z);
    }

    const beach = new THREE.Color('#e4d59c');
    const lowland = new THREE.Color('#6b8f4f');
    const highland = new THREE.Color('#3f5c37');
    const tmp = new THREE.Color();

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const lx = minLX + ((px + 0.5) / size) * (maxLX - minLX);
        const ly = minLY + ((py + 0.5) / size) * (maxLY - minLY);
        const wx = lx, wz = -ly;
        const idx = (py * size + px) * 4;
        if (!pointInPolygon(wx, wz, poly)) {
          img.data[idx + 3] = 0;
          continue;
        }
        const edgeDist = distanceToPolygonEdge(wx, wz, poly);
        const t = THREE.MathUtils.clamp(edgeDist / 26, 0, 1);
        if (t < 0.3) tmp.copy(beach).lerp(lowland, t / 0.3);
        else tmp.copy(lowland).lerp(highland, (t - 0.3) / 0.7);
        const n = 0.92 + (((wx * 12.9898 + wz * 78.233) % 1 + 1) % 1) * 0.16;
        tmp.multiplyScalar(n);
        // THREE.Color는 내부적으로 리니어 값을 갖고 있으므로, sRGB로 인코딩된
        // 캔버스 바이트로 구우려면 명시적으로 변환해야 한다(안 그러면 이중 감마 보정으로 새까맣게 보임).
        tmp.convertLinearToSRGB();
        img.data[idx] = Math.round(THREE.MathUtils.clamp(tmp.r, 0, 1) * 255);
        img.data[idx + 1] = Math.round(THREE.MathUtils.clamp(tmp.g, 0, 1) * 255);
        img.data[idx + 2] = Math.round(THREE.MathUtils.clamp(tmp.b, 0, 1) * 255);
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false; // ShapeGeometry의 기본 UV(v = (y-min)/(max-min))와 캔버스 row를 그대로 일치시킴
    tex.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
    return new THREE.Mesh(capGeo, mat);
  }

  _scatterHills(poly, topY) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of poly) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }

    let seed = 777;
    for (let i = 0; i < poly.length; i++) seed = (seed * 31 + Math.floor(poly[i][0])) >>> 0;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

    const area = (maxX - minX) * (maxZ - minZ);
    const targetCount = Math.round(THREE.MathUtils.clamp(area / 42000, 4, 26));
    const hillMat = new THREE.MeshStandardMaterial({ color: '#6d8259', roughness: 1, flatShading: true });
    let placed = 0, attempts = 0;
    while (placed < targetCount && attempts < targetCount * 25) {
      attempts++;
      const x = minX + rand() * (maxX - minX);
      const z = minZ + rand() * (maxZ - minZ);
      if (!pointInPolygon(x, z, poly)) continue;
      if (distanceToPolygonEdge(x, z, poly) < 35) continue;

      const r = 12 + rand() * 22;
      const h = 8 + rand() * 16;
      const hill = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7 + Math.floor(rand() * 3)), hillMat);
      hill.position.set(x, topY + h * 0.5 - 2, z);
      hill.rotation.y = rand() * Math.PI * 2;
      hill.scale.y *= 0.7 + rand() * 0.3;
      this.scene.add(hill);
      this.cameraColliders.push(hill);
      placed++;
    }
  }

  _isBlocked(x, z) {
    if (pointOnAnyLand(x, z)) return true;
    for (const m of this.moundColliders) {
      const dx = x - m.x, dz = z - m.z;
      if (dx * dx + dz * dz < m.r * m.r) return true;
    }
    return false;
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
    // heading 증가 방향은 반시계(좌현) 회전이므로, D(우현 회전)는 heading을 감소시켜야 한다.
    // 배의 방향은 오직 A/D 키로만 바뀐다 — 마우스는 시점 회전만 담당한다.
    this.ship.turnInput = (isDown('KeyA') ? 1 : 0) - (isDown('KeyD') ? 1 : 0);

    this.ship.update(delta, elapsed, (x, z) => this._isBlocked(x, z));
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

    // 카메라 시점은 오직 마우스 드래그로만 바뀐다 — 배의 진행/방향 전환에 따라
    // 자동으로 움직이거나 재정렬되지 않는다(사용자가 직접 놓은 각도를 그대로 유지).
    const camDist = 25, baseLift = 5;
    const anchor = new THREE.Vector3(this.ship.pos.x, this.ship.mesh.position.y + 3.5, this.ship.pos.y);
    const horizDist = camDist * Math.cos(pointerControls.pitch);
    let camX = anchor.x - Math.sin(pointerControls.yaw) * horizDist;
    let camZ = anchor.z - Math.cos(pointerControls.yaw) * horizDist;
    let camY = anchor.y + baseLift + Math.sin(pointerControls.pitch) * camDist;
    // 해수면 관통 방지: 카메라 목표 지점의 파고보다 항상 위에 있도록 하한선을 둔다
    const waveAtCam = this.ocean.heightAt(camX, camZ, elapsed);
    camY = Math.max(camY, waveAtCam + 3);

    const desired = new THREE.Vector3(camX, camY, camZ);
    const resolved = resolveCameraCollision(this.raycaster, this.cameraColliders, anchor, desired);
    camera.position.copy(resolved);
    camera.lookAt(anchor);

    // HUD
    hud.setThrottle(this.ship.notch, -3, 5);
    hud.setCompass(this.ship.heading);
    hud.setShipHp(state.shipHp / getShip(state.currentShipId).hp);
    hud.setGold(state.gold);

    const regionName = seaRegionAt(this.ship.pos.x, this.ship.pos.y);
    const nearest = this._findNearestCityMarker();
    if (nearest.marker && nearest.dist < 300) {
      const city = CITIES.find((c) => c.id === nearest.marker.userData.cityId);
      hud.setLocation(regionName, `가까운 항구: ${city.name}`);
    } else {
      hud.setLocation(regionName);
    }

    hud.updateMinimap(
      { x: this.ship.pos.x, z: this.ship.pos.y, heading: this.ship.heading },
      this.minimapCities,
      this.npcShips.filter((n) => !n.dead).map((n) => ({ x: n.pos.x, z: n.pos.y, hostile: n.def.hostile }))
    );
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
