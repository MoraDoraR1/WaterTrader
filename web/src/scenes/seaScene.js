import * as THREE from 'three';
import { createOcean } from '../entities/ocean.js';
import { buildShipMesh, ShipController } from '../entities/ship.js';
import { NpcShip } from '../entities/pirate.js';
import { EscortShip } from '../entities/escort.js';
import { CannonballPool } from '../entities/cannon.js';
import { WakeTrail, BowWave } from '../entities/wake.js';
import { Wind } from '../entities/wind.js';
import { makeLabelSprite } from '../entities/label.js';
import { resolveCameraCollision } from '../controls/cameraCollision.js';
import { getShip, COUNTRY_COLORS } from '../data/ships.js';
import { getEffectiveShipDef } from '../data/shipParts.js';
import { CITIES } from '../data/cities.js';
import { MAINLAND_POLY, BRITAIN_POLY, LAND_POLYGONS, pointOnAnyLand, distanceToPolygonEdge, pointInPolygon } from '../data/coastline.js';
import { seaRegionAt } from '../data/seaRegions.js';
import { SEA_NPC_SHIPS } from '../data/seaEntities.js';
import { isDown, consumeJustPressed } from '../controls/keys.js';
import { state, initShipHp, notify } from '../state.js';
import { hud } from '../ui/hud.js';
import { checkBountyKill } from '../systems/quests.js';
import { loseMoraleFromCombat, getMoralePowerMul } from '../systems/crew.js';
import { FLEET_CAP } from '../systems/shipyard.js';

const DOCK_RANGE = 55;
const FIRE_COOLDOWN = 1.5;
const RESPAWN_CITY = 'lisboa';
const COLLISION_DAMAGE = 30; // 선체 충돌 시 양측이 함께 받는 피해
const COLLISION_COOLDOWN = 2.5; // 같은 적선과 연속으로 충돌 피해를 받지 않도록 하는 쿨다운(초)
const MELEE_CHANCE = 0.25; // 충돌 시 백병전으로 번질 확률
const MELEE_DURATION = 4.5; // 백병전 지속 시간(초) — 이 동안 양측 모두 포격/이동이 멈춘다

// 국가/지역별 건물 팔레트 — 남유럽은 따뜻한 회벽+테라코타, 북유럽은 벽돌/석회+슬레이트 톤
const REGION_PALETTE = {
  PT: { wall: '#e8ddb5', roof: '#b5573a' },
  ES: { wall: '#e3d4a8', roof: '#a8492f' },
  IT: { wall: '#e0c9a0', roof: '#9c4630' },
  EN: { wall: '#cfc9bd', roof: '#4a5560' },
  NL: { wall: '#c9beae', roof: '#7a3f2e' },
  HAN: { wall: '#b8ada0', roof: '#4a4038' },
  FR: { wall: '#e6ddc8', roof: '#5c6470' },
};

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
    const shipDef = getEffectiveShipDef(getShip(state.currentShipId), state.shipParts);
    this.playerMesh = buildShipMesh(shipDef);
    this.scene.add(this.playerMesh);
    this.ship = new ShipController(this.playerMesh, shipDef, this.ocean.heightAt);
    this.ship.pos.set(state.shipPos[0], state.shipPos[1]);
    this.ship.heading = state.shipHeading || 0;

    this.cannonPool = new CannonballPool(this.scene);
    this.npcShips = SEA_NPC_SHIPS.map((d) => new NpcShip(this.scene, d));
    this.escorts = [];
    this.rebuildEscorts();

    this.fireTimer = 0;
    this.hoveredCity = null;
    this.combatTarget = null;
    this.t = 0;
    this.onDock = null;
    this.raycaster = new THREE.Raycaster();
    this.collisionTimers = new Map(); // npc.owner -> 남은 충돌 쿨다운(초)
    this.meleeState = null; // { npc, timer } — 백병전 중일 때만 존재
    this.pendingCapture = null; // 백병전 승리 후 격침/나포를 고르는 동안 npc를 잡아둠(그동안 시뮬레이션 정지)
    this.wakeTrail = new WakeTrail(this.scene);
    this.bowWave = new BowWave(this.scene);
    this._wakeTimer = 0;
    this.wind = new Wind();

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

  // 함대 구성(구매/판매/기함 교체)이 바뀌면 예비 함대의 호위선 메시를 다시 만든다.
  rebuildEscorts() {
    for (const e of this.escorts) e.dispose(this.scene);
    this.escorts = state.fleet.map((f, i) => new EscortShip(this.scene, getShip(f.shipId), i));
  }

  // 조선소에서 배를 구매하거나 부품을 장착/해제하면(state.currentShipId, state.shipParts 변경)
  // 이미 떠 있는 배 메시/컨트롤러를 새 스탯 기준으로 다시 만든다. 위치/방향/스로틀은 유지한다.
  rebuildShip() {
    const shipDef = getEffectiveShipDef(getShip(state.currentShipId), state.shipParts);
    const prevPos = this.ship.pos.clone();
    const prevHeading = this.ship.heading;
    const prevNotch = this.ship.notch;

    this.scene.remove(this.playerMesh);
    this.playerMesh = buildShipMesh(shipDef);
    this.scene.add(this.playerMesh);

    this.ship = new ShipController(this.playerMesh, shipDef, this.ocean.heightAt);
    this.ship.pos.copy(prevPos);
    this.ship.heading = prevHeading;
    this.ship.notch = prevNotch;
  }

  handleLeftClick() {
    if (this.pendingCapture) return; // 격침/나포 선택 대기 중에는 클릭으로 포격/정박할 수 없다
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
    // 도시는 바다 위에서 잘 보이는 작은 "미니어처 유럽 항구마을" 모형으로 표시한다.
    // (거대한 대륙 벽을 세우지 않음 — 카메라 클리핑과 시야를 가리는 문제를 피하기 위함)
    const cx = CITIES.reduce((s, c) => s + c.pos[0], 0) / CITIES.length;
    const cz = CITIES.reduce((s, c) => s + c.pos[1], 0) / CITIES.length;

    const moundRadius = 27;
    const pierLen = 19;
    const MOUND_COLLIDER_R = 30; // this.moundColliders(생성자)의 반경과 동일하게 유지
    const baseDockDist = moundRadius * 0.7 + pierLen * 0.9;
    // 부두/정박지가 향할 "방향"을 반드시 열린 바다로만 잡기 위한 탐색 각도 오프셋
    // (0, +Δ, -Δ, +2Δ, -2Δ, ... 순서로 원래 추정 방향에 가까운 각도부터 검사)
    const ANGLE_STEP = (Math.PI * 2) / 64;
    const ANGLE_OFFSETS = [0];
    for (let i = 1; i <= 32; i++) { ANGLE_OFFSETS.push(i * ANGLE_STEP, -i * ANGLE_STEP); }

    for (const city of CITIES) {
      const group = new THREE.Group();
      // 전체 도시 무게중심에서 먼 방향 — 대략적인 "대륙 바깥쪽" 추정치일 뿐, 해안선이
      // 프랙탈 지터로 굴곡져 있어 이 방향이 실제로는 육지를 가리킬 수도 있다.
      const heuristicDir = new THREE.Vector2(city.pos[0] - cx, city.pos[1] - cz);
      if (heuristicDir.lengthSq() < 1) heuristicDir.set(0, 1);
      heuristicDir.normalize();
      const heuristicAngle = Math.atan2(heuristicDir.x, heuristicDir.y);

      // 실제 해안선을 검사해 "확실히 뭍이 아닌" 방향/거리를 찾는다. dir 관례상 부두/정박지는
      // -dir 방향에 위치하므로, 바깥(바다) 방향 벡터는 (sin(angle), cos(angle))의 반대(-)다.
      // 다른 도시의 마운드 충돌 범위(생성자의 moundColliders와 동일한 반경)도 함께 피해야
      // 실제 플레이 중 _isBlocked() 판정과 어긋나지 않는다.
      const clearOfLandAndMounds = (px, pz) => {
        if (pointOnAnyLand(px, pz)) return false;
        for (const c2 of CITIES) {
          const dx = px - c2.pos[0], dz = pz - c2.pos[1];
          if (dx * dx + dz * dz < MOUND_COLLIDER_R * MOUND_COLLIDER_R) return false;
        }
        return true;
      };
      const isOpenSeaward = (angle, dist) => {
        const ox = -Math.sin(angle), oz = -Math.cos(angle);
        if (!clearOfLandAndMounds(city.pos[0] + ox * dist, city.pos[1] + oz * dist)) return false;
        return clearOfLandAndMounds(city.pos[0] + ox * (dist + 18), city.pos[1] + oz * (dist + 18));
      };
      let outAngle = null;
      let outDist = baseDockDist;
      for (let ring = baseDockDist; ring <= baseDockDist + 260 && outAngle === null; ring += 6) {
        for (const off of ANGLE_OFFSETS) {
          if (isOpenSeaward(heuristicAngle + off, ring)) { outAngle = heuristicAngle + off; outDist = ring; break; }
        }
      }
      if (outAngle === null) outAngle = heuristicAngle; // 이론상 도달하지 않는 안전망
      const dir = new THREE.Vector2(Math.sin(outAngle), Math.cos(outAngle));
      // 정박지가 열린 바다인지 확인된 실제 거리(outDist) — 탐색 시작값(baseDockDist)보다
      // 멀어졌을 수 있으므로 부두/정박지 배치에 그대로 사용한다.
      const dockDist = outDist;

      let seed = 0;
      for (let i = 0; i < city.id.length; i++) seed = (seed * 31 + city.id.charCodeAt(i)) >>> 0;
      const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

      const palette = REGION_PALETTE[city.country] || REGION_PALETTE.FR;
      const flagColor = COUNTRY_COLORS[city.country] || '#999';

      const mound = new THREE.Mesh(
        new THREE.CylinderGeometry(moundRadius, moundRadius * 1.08, 5, 14),
        new THREE.MeshStandardMaterial({ color: '#8a9c72', roughness: 1 })
      );
      mound.position.y = 2.5;
      group.add(mound);
      this.cameraColliders.push(mound);

      // 석축 옹벽 — 마운드 기단을 두르는 낮은 돌담(항구 요새 느낌)
      const quay = new THREE.Mesh(
        new THREE.TorusGeometry(moundRadius * 1.02, 0.9, 6, 24),
        new THREE.MeshStandardMaterial({ color: '#8a8478', roughness: 1 })
      );
      quay.rotation.x = Math.PI / 2;
      quay.position.y = 0.6;
      group.add(quay);

      const wallMat = new THREE.MeshStandardMaterial({ color: palette.wall, roughness: 0.95 });
      const roofMat = new THREE.MeshStandardMaterial({ color: palette.roof, roughness: 0.85 });

      // 랜드마크 첨탑(교회/시계탑) — 마을 중심에 두어 유럽 항구도시 특유의 스카이라인을 만든다
      const towerH = 13 + rand() * 3;
      const towerGroup = new THREE.Group();
      const towerBody = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.4, towerH, 8), wallMat);
      towerBody.position.y = towerH / 2;
      towerGroup.add(towerBody);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(2.5, 5.5, 8), roofMat);
      spire.position.y = towerH + 2.75;
      towerGroup.add(spire);
      for (let f = 0; f < 4; f++) {
        const face = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), new THREE.MeshStandardMaterial({ color: '#1c1610' }));
        face.position.set(Math.sin(f * Math.PI / 2) * 2.15, towerH * 0.75, Math.cos(f * Math.PI / 2) * 2.15);
        face.rotation.y = f * Math.PI / 2;
        towerGroup.add(face);
      }
      towerGroup.position.set(0, 5, -moundRadius * 0.12);
      group.add(towerGroup);
      this.cameraColliders.push(towerBody);
      const tallestY = towerH, tallestX = towerGroup.position.x, tallestZ = towerGroup.position.z;

      // 일반 가옥들 — 지붕 형태를 섞어 스카이라인에 변화를 준다
      const buildingCount = 6;
      for (let i = 0; i < buildingCount; i++) {
        const a = (i / buildingCount) * Math.PI * 2 + rand() * 0.5;
        const r = moundRadius * (0.4 + rand() * 0.42);
        const bx = Math.cos(a) * r, bz = Math.sin(a) * r;
        const w = 4.2 + rand() * 2.6, d = 4.2 + rand() * 2.6, h = 4.2 + rand() * 2.6;
        const bGroup = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        body.position.y = h / 2;
        bGroup.add(body);
        const roofStyle = i % 3;
        let roof;
        if (roofStyle === 0) {
          roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.76, 3.4, 4), roofMat);
          roof.rotation.y = Math.PI / 4;
        } else if (roofStyle === 1) {
          roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.68, 2.2, 4), roofMat);
          roof.rotation.y = Math.PI / 4;
        } else {
          roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.06, 1.1, d * 1.06), roofMat);
        }
        roof.position.y = h + (roofStyle === 2 ? 0.55 : 1.6);
        bGroup.add(roof);
        bGroup.position.set(bx, 5, bz);
        group.add(bGroup);
        this.cameraColliders.push(body);
      }

      // 부두 — 검증된 열린 바다 방향(dir)으로 짧게 뻗어 정박 지점 역할
      const pier = new THREE.Mesh(
        new THREE.BoxGeometry(6, 1.2, pierLen),
        new THREE.MeshStandardMaterial({ color: '#5a4326', roughness: 0.9 })
      );
      pier.rotation.y = Math.atan2(dir.x, dir.y);
      pier.position.set(-dir.x * (moundRadius * 0.7 + pierLen * 0.5), 0.6, -dir.y * (moundRadius * 0.7 + pierLen * 0.5));
      group.add(pier);

      // 부두 옆에 정박한 소형 보트
      const dinghy = new THREE.Group();
      const dinghyHull = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.9, 3.2, 6),
        new THREE.MeshStandardMaterial({ color: '#5a4326', roughness: 0.9 })
      );
      dinghyHull.rotation.x = Math.PI / 2;
      dinghyHull.scale.set(0.55, 0.55, 1);
      dinghy.add(dinghyHull);
      const perp = new THREE.Vector2(-dir.y, dir.x);
      const pierBaseX = -dir.x * (moundRadius * 0.7 + 6);
      const pierBaseZ = -dir.y * (moundRadius * 0.7 + 6);
      dinghy.position.set(pierBaseX + perp.x * 4.5, 0.3, pierBaseZ + perp.y * 4.5);
      dinghy.rotation.y = Math.atan2(dir.x, dir.y) + 0.3;
      group.add(dinghy);

      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 3.6),
        new THREE.MeshStandardMaterial({ color: flagColor, side: THREE.DoubleSide })
      );
      flag.position.set(tallestX + 3.2, 5 + tallestY - 2, tallestZ);
      group.add(flag);

      const label = makeLabelSprite(city.name);
      label.position.set(tallestX, 5 + tallestY + 6, tallestZ);
      group.add(label);

      group.position.set(city.pos[0], 0, city.pos[1]);
      group.userData.cityId = city.id;
      // dir/dockDist 조합은 이미 위에서 열린 바다임이 검증된 지점이다.
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

  // 적대적인 배와 실제로 선체가 맞닿으면(레이캐스트 없이 2D 원 겹침으로 근사) 서로 밀어내면서
  // 함께 피해를 입힌다. 같은 상대와는 쿨다운 동안 반복 피해를 주지 않는다. 매 충돌마다
  // 일정 확률로 백병전(승선전)으로 전환된다.
  _resolveShipCollisions(delta) {
    for (const [owner, timer] of this.collisionTimers) {
      const next = timer - delta;
      if (next <= 0) this.collisionTimers.delete(owner);
      else this.collisionTimers.set(owner, next);
    }
    if (this.meleeState) return; // 백병전 중에는 다른 충돌 판정을 하지 않는다

    const playerR = this.playerMesh.userData.length * 0.5;
    for (const npc of this.npcShips) {
      if (npc.dead || !npc.def.hostile) continue;
      const dx = this.ship.pos.x - npc.pos.x, dz = this.ship.pos.y - npc.pos.y;
      const dist = Math.hypot(dx, dz);
      const minDist = playerR + npc.radius;
      if (dist >= minDist) continue;

      const nx = dist > 0.001 ? dx / dist : 1, nz = dist > 0.001 ? dz / dist : 0;
      const overlap = minDist - dist;
      this.ship.pos.x += nx * overlap * 0.5;
      this.ship.pos.y += nz * overlap * 0.5;
      npc.pos.x -= nx * overlap * 0.5;
      npc.pos.y -= nz * overlap * 0.5;

      if (this.collisionTimers.has(npc.owner)) continue;
      this.collisionTimers.set(npc.owner, COLLISION_COOLDOWN);
      state.shipHp = Math.max(0, state.shipHp - COLLISION_DAMAGE);
      loseMoraleFromCombat();
      npc.takeDamage(COLLISION_DAMAGE);
      hud.toast('충돌! 양측 선체가 손상되었습니다.');
      if (npc.dead) {
        hud.toast(`${npc.def.name}을(를) 격침했습니다!`);
        const bounty = checkBountyKill(npc.owner);
        if (bounty) hud.toast(`의뢰 완료: ${bounty.title} (+${bounty.reward.toLocaleString('ko-KR')} 두캇)`);
        continue;
      }
      if (Math.random() < MELEE_CHANCE) this._startMelee(npc);
      break; // 한 프레임에 하나의 충돌만 처리
    }
  }

  _startMelee(npc) {
    this.meleeState = { npc, timer: MELEE_DURATION };
    hud.setCombatBannerText('⚔ 백병전 중!');
    hud.toast(`${npc.def.name}과(와) 백병전이 시작되었습니다!`);
  }

  _resolveMelee() {
    const { npc } = this.meleeState;
    this.meleeState = null;
    hud.setCombatBannerText('⚔ 전투 상황');
    if (npc.dead) return; // 백병전 중 다른 수단으로 이미 격침된 경우

    const playerCrew = this.ship.shipDef.crew || 20;
    const npcCrew = npc.shipDef.crew || 20;
    // 사기가 낮으면(급여를 못 받았거나 전투를 오래 겪었으면) 백병전 전투력도 함께 떨어진다.
    const playerPower = playerCrew * (0.75 + Math.random() * 0.5) * getMoralePowerMul();
    const npcPower = npcCrew * (0.75 + Math.random() * 0.5);
    // 충돌 쿨다운을 새로 걸어 백병전 직후 곧바로 다시 충돌 피해가 겹치지 않게 한다.
    this.collisionTimers.set(npc.owner, COLLISION_COOLDOWN);

    if (playerPower >= npcPower) {
      const fleetHasRoom = state.fleet.length + 1 < FLEET_CAP;
      if (fleetHasRoom && npc.shipDef) {
        this.pendingCapture = npc;
        hud.showDialogue(
          npc.def.name,
          '백병전에서 승리했습니다! 이 배를 격침하시겠습니까, 나포해 함대에 편입하시겠습니까?',
          [
            { label: '나포', onClick: () => this._confirmCapture(npc) },
            { label: '격침', onClick: () => this._confirmSink(npc) },
          ]
        );
      } else {
        this._confirmSink(npc, fleetHasRoom ? null : '함대가 가득 차 나포할 수 없었습니다. ');
      }
    } else {
      const dmg = Math.round(50 + Math.random() * 70);
      state.shipHp = Math.max(0, state.shipHp - dmg);
      loseMoraleFromCombat();
      hud.toast(`백병전에서 밀렸습니다! 선체 내구도 ${dmg} 손실.`);
    }
  }

  _confirmSink(npc, prefix = '') {
    this.pendingCapture = null;
    hud.hideDialogue();
    const loot = Math.round(80 + Math.random() * 160);
    state.gold += loot;
    npc.takeDamage(npc.maxHp);
    hud.toast(`${prefix}백병전 승리! 적선을 격침하고 ${loot.toLocaleString('ko-KR')} 두캇을 노획했습니다.`);
    const bounty = checkBountyKill(npc.owner);
    if (bounty) hud.toast(`의뢰 완료: ${bounty.title} (+${bounty.reward.toLocaleString('ko-KR')} 두캇)`);
  }

  _confirmCapture(npc) {
    this.pendingCapture = null;
    hud.hideDialogue();
    // 격전 끝에 나포한 배라 만신창이 상태로 함대에 들어온다 — 항구에서 수리해야 온전히 쓸 수 있다.
    const capturedHp = Math.round(npc.shipDef.hp * (0.3 + Math.random() * 0.25));
    state.fleet = [...state.fleet, { uid: `fleet_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`, shipId: npc.shipDef.id, shipHp: capturedHp, shipParts: {}, name: null }];
    state.captureCount = (state.captureCount || 0) + 1;
    npc.takeDamage(npc.maxHp); // 나포된 배는 바다에서 사라진다(예인되어 함대로 편입)
    notify({ fleetChanged: true });
    hud.toast(`나포 성공! ${npc.def.name}을(를) 함대에 편입했습니다 (손상 상태 — 조선소에서 수리 필요).`);
    const bounty = checkBountyKill(npc.owner);
    if (bounty) hud.toast(`의뢰 완료: ${bounty.title} (+${bounty.reward.toLocaleString('ko-KR')} 두캇)`);
  }

  // 배가 물살을 가르는 느낌 — 이물 양옆으로 갈라지는 파도(BowWave, 매 프레임 재계산되는
  // 동적 지오메트리)와 고물 뒤로 남는 거품 항적(WakeTrail, 주기적으로 뿌리는 원판들) 두 가지로 구성.
  // 속도가 붙을수록 더 자주/크게 뿜어져 정지 시엔 자연스럽게 잦아든다.
  _updateWake(delta, elapsed) {
    const hl = (this.playerMesh.userData.length || 20) / 2;
    const hw = (this.playerMesh.userData.width || 6) / 2;
    const speedRatio = (this.meleeState || this.pendingCapture) ? 0 : Math.min(1, Math.abs(this.ship.curSpeed) / this.ship.maxSpeedMs);
    // 후진 중엔 물을 가르는 쪽이 고물이므로, 이동 방향에 따라 파도가 뜨는 지점도 바뀐다.
    const dir = this.ship.curSpeed < 0 ? -1 : 1;
    const leadX = this.ship.pos.x + Math.sin(this.ship.heading) * dir * hl;
    const leadZ = this.ship.pos.y + Math.cos(this.ship.heading) * dir * hl;
    const bowWaveY = this.ocean.heightAt(leadX, leadZ, elapsed) + 0.08;
    this.bowWave.update(this.ship.pos, this.ship.heading, hw, hl, speedRatio, bowWaveY, dir);

    if (!this.meleeState && speedRatio > 0.12) {
      this._wakeTimer -= delta;
      if (this._wakeTimer <= 0) {
        this._wakeTimer = THREE.MathUtils.lerp(0.32, 0.09, speedRatio);
        const sternX = this.ship.pos.x - Math.sin(this.ship.heading) * dir * hl * 0.95;
        const sternZ = this.ship.pos.y - Math.cos(this.ship.heading) * dir * hl * 0.95;
        const sternY = this.ocean.heightAt(sternX, sternZ, elapsed) + 0.05;
        this.wakeTrail.spawn(sternX, sternY, sternZ, hw * (0.7 + speedRatio * 0.6), 2.2 + speedRatio * 1.2);
      }
    }
    this.wakeTrail.update(delta, elapsed, this.ocean.heightAt);
  }

  fireCannon() {
    if (this.meleeState) { hud.toast('백병전 중에는 포격할 수 없습니다.'); return; }
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
    // 한 번의 포격에서 나가는 포탄 수는 배(+부품)의 실효 화력에 비례한다 — 대포 부품을
    // 달수록 일제사격이 두꺼워진다(기본 4~6문급 배는 3발, 데미캐논까지 단 배는 그 이상).
    const shotCount = THREE.MathUtils.clamp(Math.round(this.ship.shipDef.cannons / 4), 2, 9);
    const spread = 0.06;
    for (let i = 0; i < shotCount; i++) {
      const t = shotCount === 1 ? 0 : i / (shotCount - 1) - 0.5;
      const dir3 = new THREE.Vector3(toTarget.x, 0.22, toTarget.y).normalize();
      dir3.applyAxisAngle(new THREE.Vector3(0, 1, 0), t * spread * (shotCount - 1));
      this.cannonPool.fire(origin, dir3, 40, 'player');
    }
  }

  update(delta, elapsed, camera, pointerControls) {
    this.t = elapsed;
    this.wind.update(delta);

    // 백병전 중이거나(양쪽 배 모두 그 자리에 붙들림) 격침/나포 선택을 기다리는 동안에는
    // 조작/이동/포격이 모두 정지된다 — 결판/선택이 나면 자동으로 재개된다.
    if (this.meleeState) {
      this.meleeState.timer -= delta;
      if (this.meleeState.timer <= 0) this._resolveMelee();
    } else if (this.pendingCapture) {
      // 대기 — 플레이어가 격침/나포 다이얼로그에서 선택할 때까지 시뮬레이션을 멈춘다.
    } else {
      if (consumeJustPressed('KeyW')) this.ship.throttleUp();
      if (consumeJustPressed('KeyS')) this.ship.throttleDown();
      // heading 증가 방향은 반시계(좌현) 회전이므로, D(우현 회전)는 heading을 감소시켜야 한다.
      // 배의 방향은 오직 A/D 키로만 바뀐다 — 마우스는 시점 회전만 담당한다.
      this.ship.turnInput = (isDown('KeyA') ? 1 : 0) - (isDown('KeyD') ? 1 : 0);
      this.ship.update(delta, elapsed, (x, z) => this._isBlocked(x, z), this.wind);
    }
    this.ocean.update(elapsed, camera);
    this._updateWake(delta, elapsed);
    for (const escort of this.escorts) escort.update(delta, elapsed, this.ship, this.ocean.heightAt);

    const hostileNear = this.npcShips.some((n) => !n.dead && n.def.hostile && n.state === 'attack');
    if (hostileNear !== state.inCombat) {
      state.inCombat = hostileNear;
      hud.showCombatBanner(hostileNear);
      if (hostileNear) hud.toast('전투 시작! 좌클릭/스페이스바로 포격하세요.');
    }

    if (!this.meleeState && !this.pendingCapture) {
      for (const npc of this.npcShips) {
        npc.update(delta, elapsed, this.ship.pos, this.ocean.heightAt, this.cannonPool);
      }
      this._resolveShipCollisions(delta);
    }

    this.fireTimer = Math.max(0, this.fireTimer - delta);
    if (state.inCombat && isDown('Space') && this.fireTimer <= 0 && !this.pendingCapture) {
      this.fireCannon();
    }

    const targets = [
      { owner: 'player', position: new THREE.Vector3(this.ship.pos.x, 0, this.ship.pos.y), radius: this.playerMesh.userData.length * 0.55, ref: 'player' },
      ...this.npcShips.filter((n) => !n.dead).map((n) => ({ owner: n.owner, position: n.position, radius: n.radius, ref: n })),
    ];
    this.cannonPool.update(delta, targets, (target, ball) => {
      if (target.ref === 'player') {
        state.shipHp = Math.max(0, state.shipHp - 18);
        loseMoraleFromCombat();
      } else {
        target.ref.takeDamage(22);
        if (target.ref.dead) {
          hud.toast(`${target.ref.def.name}을(를) 격침했습니다!`);
          const bounty = checkBountyKill(target.ref.owner);
          if (bounty) hud.toast(`의뢰 완료: ${bounty.title} (+${bounty.reward.toLocaleString('ko-KR')} 두캇)`);
        }
      }
    });

    if (state.shipHp <= 0) {
      hud.toast('배가 침몰했습니다! 항구로 예인됩니다.');
      const home = CITIES.find((c) => c.id === RESPAWN_CITY);
      this.ship.pos.set(home.pos[0] - 70, home.pos[1]);
      this.ship.notch = 0;
      state.gold = Math.max(0, state.gold - 100);
      initShipHp();
      if (this.meleeState) { this.meleeState = null; hud.setCombatBannerText('⚔ 전투 상황'); }
    }

    state.shipPos = [this.ship.pos.x, this.ship.pos.y];
    state.shipHeading = this.ship.heading;

    // 카메라 시점은 오직 마우스 드래그로만 바뀐다 — 배의 진행/방향 전환에 따라
    // 자동으로 움직이거나 재정렬되지 않는다(사용자가 직접 놓은 각도를 그대로 유지).
    const camDist = 25 * pointerControls.zoom, baseLift = 5;
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
    hud.setShipHp(state.shipHp / this.ship.shipDef.hp);
    hud.setGold(state.gold);
    hud.setCrewMorale(state.crewMorale ?? 100);

    const windPct = Math.round((this.ship.windMul - 1) * 100);
    const windLabel = windPct > 3 ? `순풍 +${windPct}%` : windPct < -3 ? `역풍 ${windPct}%` : `무풍 ${windPct >= 0 ? '+' : ''}${windPct}%`;
    hud.setWind(this.wind.towardDirection, windLabel);

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
