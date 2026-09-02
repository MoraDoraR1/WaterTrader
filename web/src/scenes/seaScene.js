import { Vec2, clamp, lerp } from '../util/math2d.js';
import { Camera2D, IsoProjection } from '../render/canvas2d.js';
import { cityIconSprite } from '../render/pixelSprites.js';
import { drawShipIso } from '../render/shipIso.js';
import { ShipController } from '../entities/shipController.js';
import { worldSizeFor } from '../entities/shipSize.js';
import { NpcShip } from '../entities/pirate.js';
import { EscortShip } from '../entities/escort.js';
import { CannonballPool } from '../entities/cannon.js';
import { WakeTrail } from '../entities/wake.js';
import { Wind } from '../entities/wind.js';
import { WeatherSystem, RainEffect } from '../entities/weather.js';
import { getShip, COUNTRY_COLORS } from '../data/ships.js';
import { getEffectiveShipDef } from '../data/shipParts.js';
import { CITIES } from '../data/cities.js';
import { LAND_POLYGONS, pointOnAnyLand, project } from '../data/coastline.js';
import { seaRegionAt } from '../data/seaRegions.js';
import { SEA_NPC_SHIPS } from '../data/seaEntities.js';
import { isDown, consumeJustPressed } from '../controls/keys.js';
import { state, initShipHp, notify } from '../state.js';
import { hud } from '../ui/hud.js';
import { checkBountyKill } from '../systems/quests.js';
import { loseMoraleFromCombat, getMoralePowerMul } from '../systems/crew.js';
import { FLEET_CAP } from '../systems/shipyard.js';
import { audio } from '../systems/audio.js';

const DOCK_RANGE = 55;
const FIRE_COOLDOWN = 1.5;
const RESPAWN_CITY = 'lisboa';
const COLLISION_DAMAGE = 30;
const COLLISION_COOLDOWN = 2.5;
const MELEE_CHANCE = 0.25;
const MELEE_DURATION = 4.5;
const BASE_PX_PER_UNIT = 3.2; // 줌 1배 기준, 월드 1단위당 논리 픽셀 수
const MINIMAP_RADIUS = 260; // 미니맵이 배 주위로 항상 보여주는 반경(월드 단위)
const WAYPOINT_ARRIVE_DIST = 12;
const CRUISE_NOTCH = 4;
const SAFE_FALLBACK_POS = project(-11.0, 38.5); // 리스본 서쪽 대서양 공해 — 저장 데이터가 무효할 때의 안전 지점

const WATER_DEEP = '#0d4256';
const WATER_LIGHT = '#155a78';
const LAND_COLOR = '#7a9c5a';
const LAND_EDGE = '#5c7a42';

export class SeaScene {
  constructor(logicalW, logicalH) {
    this.logicalW = logicalW;
    this.logicalH = logicalH;
    this.camera = new Camera2D();
    this.iso = new IsoProjection(BASE_PX_PER_UNIT, 0.55);

    this.weather = new WeatherSystem();
    this.rain = new RainEffect(logicalW, logicalH);
    this.wind = new Wind();

    this.moundColliders = CITIES.map((c) => ({ x: c.pos[0], z: c.pos[1], r: 30 }));
    this.cityMarkers = this._computeCityMarkers();

    if (!state.shipHp) initShipHp();
    const shipDef = getEffectiveShipDef(getShip(state.currentShipId), state.shipParts);
    this.ship = new ShipController(shipDef);
    // 저장 데이터의 shipPos가 예전 지도 축척(또는 이후 지형 변경) 기준이라 지금은 뭍/마운드에
    // 파묻혀 있을 수 있다 — 그대로 두면 배가 한 발짝도 움직이지 못하니, 안전한 근해로 되돌린다.
    let [sx, sz] = state.shipPos;
    if (this._isBlocked(sx, sz)) {
      [sx, sz] = SAFE_FALLBACK_POS;
      state.shipPos = [sx, sz];
      hud.toast('저장된 정박 위치가 유효하지 않아 안전한 해역으로 이동했습니다.');
    }
    this.ship.pos.set(sx, sz);
    this.ship.heading = state.shipHeading || 0;
    this.camera.snapTo(this.ship.pos.x, this.ship.pos.y);

    this.cannonPool = new CannonballPool();
    this.npcShips = SEA_NPC_SHIPS.map((d) => new NpcShip(d));
    this.escorts = [];
    this.rebuildEscorts();

    this.fireTimer = 0;
    this.hoveredCity = null;
    this.t = 0;
    this.onDock = null;
    this.collisionTimers = new Map();
    this.meleeState = null;
    this.pendingCapture = null;
    this.shakeTrauma = 0;
    this.wakeTrail = new WakeTrail();
    this._wakeTimer = 0;

    hud.initThrottle(-3, 5);

    hud.initMinimap(LAND_POLYGONS);
    this.minimapCities = CITIES.map((c) => ({ x: c.pos[0], z: c.pos[1], color: COUNTRY_COLORS[c.country] || '#e6c15a' }));
    this.waypoint = null;
  }

  // 미니맵은 배를 중심으로 한 국지 반경만 보여준다(전세계 축척이면 배가 거의 안 움직여 보임).
  _minimapBounds() {
    const r = MINIMAP_RADIUS;
    return {
      minX: this.ship.pos.x - r, maxX: this.ship.pos.x + r,
      minZ: this.ship.pos.y - r, maxZ: this.ship.pos.y + r,
    };
  }

  // 우클릭으로 먼 목적지를 찍으면 자동으로 그 방향으로 조향·가속한다(세계 지도가 커지면서
  // 장거리 항해를 매 순간 손으로 조작하지 않아도 되도록). WASD를 직접 누르면 즉시 해제된다.
  setWaypointAt(screenX, screenY) {
    const w = this.iso.toWorld(this.camera, screenX, screenY, this.logicalW, this.logicalH);
    this.waypoint = { x: w.x, z: w.z };
    hud.toast('자동 항해를 시작합니다. (방향키 입력 시 해제)');
  }
  clearWaypoint() { this.waypoint = null; }

  setOnDock(fn) { this.onDock = fn; }
  addShake(amount) { this.shakeTrauma = Math.min(1, this.shakeTrauma + amount); }
  onWheelZoom(deltaY) { this.camera.zoom = clamp(this.camera.zoom - deltaY * 0.0011, this.camera.minZoom, this.camera.maxZoom); }

  rebuildEscorts() {
    this.escorts = state.fleet.map((f, i) => new EscortShip(getShip(f.shipId), i));
  }

  rebuildShip() {
    const shipDef = getEffectiveShipDef(getShip(state.currentShipId), state.shipParts);
    const prevPos = this.ship.pos.clone();
    const prevHeading = this.ship.heading;
    const prevNotch = this.ship.notch;
    this.ship = new ShipController(shipDef);
    this.ship.pos.copy(prevPos);
    this.ship.heading = prevHeading;
    this.ship.notch = prevNotch;
  }

  handleLeftClick() {
    if (this.pendingCapture) return;
    if (state.inCombat) this.fireCannon();
    else if (this.hoveredCity && this.onDock) this.onDock(this.hoveredCity.id);
  }

  // 실제 해안선(coastline.js)을 검사해 "확실히 뭍이 아닌" 방향으로 정박지를 찾는다 — 3D 시절과
  // 동일한 알고리즘(메시 생성 부분만 제거).
  _computeCityMarkers() {
    const cx = CITIES.reduce((s, c) => s + c.pos[0], 0) / CITIES.length;
    const cz = CITIES.reduce((s, c) => s + c.pos[1], 0) / CITIES.length;
    const moundRadius = 27, pierLen = 19;
    const MOUND_COLLIDER_R = 30;
    const baseDockDist = moundRadius * 0.7 + pierLen * 0.9;
    const ANGLE_STEP = (Math.PI * 2) / 64;
    const ANGLE_OFFSETS = [0];
    for (let i = 1; i <= 32; i++) ANGLE_OFFSETS.push(i * ANGLE_STEP, -i * ANGLE_STEP);

    const markers = [];
    for (const city of CITIES) {
      let hx = city.pos[0] - cx, hz = city.pos[1] - cz;
      const hlen = Math.hypot(hx, hz) || 1;
      hx /= hlen; hz /= hlen;
      const heuristicAngle = Math.atan2(hx, hz);

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
      let outAngle = null, outDist = baseDockDist;
      for (let ring = baseDockDist; ring <= baseDockDist + 260 && outAngle === null; ring += 6) {
        for (const off of ANGLE_OFFSETS) {
          if (isOpenSeaward(heuristicAngle + off, ring)) { outAngle = heuristicAngle + off; outDist = ring; break; }
        }
      }
      if (outAngle === null) outAngle = heuristicAngle;
      const dirX = Math.sin(outAngle), dirZ = Math.cos(outAngle);
      markers.push({
        cityId: city.id,
        pos: new Vec2(city.pos[0], city.pos[1]),
        dockPos: new Vec2(city.pos[0] - dirX * outDist, city.pos[1] - dirZ * outDist),
        country: city.country,
      });
    }
    return markers;
  }

  _isBlocked(x, z) {
    if (pointOnAnyLand(x, z)) return true;
    for (const m of this.moundColliders) {
      const dx = x - m.x, dz = z - m.z;
      if (dx * dx + dz * dz < m.r * m.r) return true;
    }
    return false;
  }

  _findNearestCityMarker() {
    let best = null, bestD = Infinity;
    for (const m of this.cityMarkers) {
      const d = m.dockPos.distanceTo(this.ship.pos);
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

  _resolveShipCollisions(delta) {
    for (const [owner, timer] of this.collisionTimers) {
      const next = timer - delta;
      if (next <= 0) this.collisionTimers.delete(owner);
      else this.collisionTimers.set(owner, next);
    }
    if (this.meleeState) return;

    const playerR = worldSizeFor(this.ship.shipDef).length * 0.5;
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
      audio.playHit();
      this.addShake(0.6);
      hud.toast('충돌! 양측 선체가 손상되었습니다.');
      if (npc.dead) {
        hud.toast(`${npc.def.name}을(를) 격침했습니다!`);
        const bounty = checkBountyKill(npc.owner);
        if (bounty) hud.toast(`의뢰 완료: ${bounty.title} (+${bounty.reward.toLocaleString('ko-KR')} 두캇)`);
        continue;
      }
      if (Math.random() < MELEE_CHANCE) this._startMelee(npc);
      break;
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
    if (npc.dead) return;

    const playerCrew = this.ship.shipDef.crew || 20;
    const npcCrew = npc.shipDef.crew || 20;
    const playerPower = playerCrew * (0.75 + Math.random() * 0.5) * getMoralePowerMul();
    const npcPower = npcCrew * (0.75 + Math.random() * 0.5);
    this.collisionTimers.set(npc.owner, COLLISION_COOLDOWN);

    if (playerPower >= npcPower) {
      audio.playWinStinger();
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
      audio.playLoseStinger();
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
    audio.playCaptureFanfare();
    const capturedHp = Math.round(npc.shipDef.hp * (0.3 + Math.random() * 0.25));
    state.fleet = [...state.fleet, { uid: `fleet_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`, shipId: npc.shipDef.id, shipHp: capturedHp, shipParts: {}, name: null }];
    state.captureCount = (state.captureCount || 0) + 1;
    npc.takeDamage(npc.maxHp);
    notify({ fleetChanged: true });
    hud.toast(`나포 성공! ${npc.def.name}을(를) 함대에 편입했습니다 (손상 상태 — 조선소에서 수리 필요).`);
    const bounty = checkBountyKill(npc.owner);
    if (bounty) hud.toast(`의뢰 완료: ${bounty.title} (+${bounty.reward.toLocaleString('ko-KR')} 두캇)`);
  }

  _updateWake(delta) {
    const size = worldSizeFor(this.ship.shipDef);
    const hl = size.length / 2;
    const speedRatio = (this.meleeState || this.pendingCapture) ? 0 : Math.min(1, Math.abs(this.ship.curSpeed) / this.ship.maxSpeedMs);
    const dir = this.ship.curSpeed < 0 ? -1 : 1;
    if (!this.meleeState && speedRatio > 0.12) {
      this._wakeTimer -= delta;
      if (this._wakeTimer <= 0) {
        this._wakeTimer = lerp(0.32, 0.09, speedRatio);
        const sternX = this.ship.pos.x - Math.sin(this.ship.heading) * dir * hl * 0.95;
        const sternZ = this.ship.pos.y - Math.cos(this.ship.heading) * dir * hl * 0.95;
        this.wakeTrail.spawn(sternX, sternZ, size.width * (0.7 + speedRatio * 0.6), 2.2 + speedRatio * 1.2);
      }
    }
    this.wakeTrail.update(delta);
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
    audio.playCannon();
    const toTarget = { x: target.pos.x - this.ship.pos.x, y: target.pos.y - this.ship.pos.y };
    const len = Math.hypot(toTarget.x, toTarget.y) || 1;
    const dir = { x: toTarget.x / len, y: toTarget.y / len };
    const shotCount = clamp(Math.round(this.ship.shipDef.cannons / 4), 2, 9);
    const spread = 0.09;
    for (let i = 0; i < shotCount; i++) {
      const tt = shotCount === 1 ? 0 : i / (shotCount - 1) - 0.5;
      const a = tt * spread * (shotCount - 1);
      const cos = Math.cos(a), sin = Math.sin(a);
      const rd = { x: dir.x * cos - dir.y * sin, y: dir.x * sin + dir.y * cos };
      this.cannonPool.fire(this.ship.pos, rd, 46, 'player');
    }
  }

  update(delta, elapsed) {
    this.t = elapsed;
    this.weather.update(delta);
    this.wind.stormActive = this.weather.stormActive;
    this.wind.update(delta);

    if (this.meleeState) {
      this.meleeState.timer -= delta;
      if (this.meleeState.timer <= 0) this._resolveMelee();
    } else if (this.pendingCapture) {
      // 대기
    } else {
      const wPressed = consumeJustPressed('KeyW');
      const sPressed = consumeJustPressed('KeyS');
      const manualTurn = (isDown('KeyA') ? 1 : 0) - (isDown('KeyD') ? 1 : 0);
      if (this.waypoint && (wPressed || sPressed || manualTurn !== 0)) this.waypoint = null;
      if (wPressed) this.ship.throttleUp();
      if (sPressed) this.ship.throttleDown();

      if (this.waypoint) {
        // 자동 항해: 목적지 방향으로 조향하고 순항 노치까지 자동 가속한다.
        const dx = this.waypoint.x - this.ship.pos.x, dz = this.waypoint.z - this.ship.pos.y;
        const dist = Math.hypot(dx, dz);
        if (dist < WAYPOINT_ARRIVE_DIST) {
          this.waypoint = null;
        } else {
          const desiredHeading = Math.atan2(dx, dz);
          let diff = desiredHeading - this.ship.heading;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          this.ship.turnInput = clamp(diff * 2.2, -1, 1);
          if (this.ship.notch < CRUISE_NOTCH) this.ship.throttleUp();
          else if (this.ship.notch > CRUISE_NOTCH) this.ship.throttleDown();
        }
      } else {
        this.ship.turnInput = manualTurn;
      }
      this.ship.update(delta, elapsed, (x, z) => this._isBlocked(x, z), this.wind);
    }
    this._updateWake(delta);
    for (const escort of this.escorts) escort.update(delta, this.ship);
    this.rain.update(delta, this.weather.stormIntensity);
    hud.setWeather(this.weather.label, this.weather.stormIntensity > 0.1);
    audio.updateOcean(this.weather.stormIntensity);

    const hostileNear = this.npcShips.some((n) => !n.dead && n.def.hostile && n.state === 'attack');
    if (hostileNear !== state.inCombat) {
      state.inCombat = hostileNear;
      hud.showCombatBanner(hostileNear);
      if (hostileNear) hud.toast('전투 시작! 좌클릭/스페이스바로 포격하세요.');
    }

    if (!this.meleeState && !this.pendingCapture) {
      for (const npc of this.npcShips) npc.update(delta, elapsed, this.ship.pos, this.cannonPool);
      this._resolveShipCollisions(delta);
    }

    this.fireTimer = Math.max(0, this.fireTimer - delta);
    if (state.inCombat && isDown('Space') && this.fireTimer <= 0 && !this.pendingCapture) this.fireCannon();

    const targets = [
      { owner: 'player', position: this.ship.pos, radius: worldSizeFor(this.ship.shipDef).length * 0.55, ref: 'player' },
      ...this.npcShips.filter((n) => !n.dead).map((n) => ({ owner: n.owner, position: n.pos, radius: n.radius, ref: n })),
    ];
    this.cannonPool.update(delta, targets, (target) => {
      audio.playHit();
      if (target.ref === 'player') {
        state.shipHp = Math.max(0, state.shipHp - 18);
        loseMoraleFromCombat();
        this.addShake(0.45);
      } else {
        this.addShake(0.18);
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

    this.shakeTrauma = Math.max(0, this.shakeTrauma - delta * 1.6);
    this.camera.follow(this.ship.pos.x, this.ship.pos.y, delta, 5);

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
      const city = CITIES.find((c) => c.id === nearest.marker.cityId);
      hud.setLocation(regionName, `가까운 항구: ${city.name}`);
    } else {
      hud.setLocation(regionName);
    }

    hud.updateMinimap(
      this._minimapBounds(),
      { x: this.ship.pos.x, z: this.ship.pos.y, heading: this.ship.heading },
      this.minimapCities,
      this.npcShips.filter((n) => !n.dead).map((n) => ({ x: n.pos.x, z: n.pos.y, hostile: n.def.hostile })),
      this.wind.towardDirection
    );
    if (nearest.marker && nearest.dist < DOCK_RANGE) {
      const city = CITIES.find((c) => c.id === nearest.marker.cityId);
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

  // ---- 렌더링(대각선/아이소메트릭풍 투영) ----
  render(ctx) {
    const w = this.logicalW, h = this.logicalH;
    this.iso.scaleX = BASE_PX_PER_UNIT * this.camera.zoom;
    this.iso.scaleY = this.iso.scaleX * 0.55;

    ctx.save();
    const shakeAmt = this.shakeTrauma * this.shakeTrauma;
    if (shakeAmt > 0.001) {
      const mag = shakeAmt * 10;
      ctx.translate((Math.random() * 2 - 1) * mag, (Math.random() * 2 - 1) * mag);
    }

    this._drawWater(ctx, w, h);
    this._drawLand(ctx, w, h);
    for (const m of this.cityMarkers) this._drawCityMarker(ctx, w, h, m);
    this._drawWake(ctx, w, h);
    if (this.waypoint) this._drawWaypoint(ctx, w, h);

    // 화면 앞뒤 순서(페인터 알고리즘) — (x+z, 즉 스크린 y에 대응하는 값)가 클수록 앞쪽이라
    // 나중에 그려야 뒤 물체를 가리지 않는다.
    const drawables = [
      ...this.npcShips.map((n) => ({ z: n.pos.x + n.pos.y, draw: () => this._drawShip(ctx, w, h, n.pos, n.heading, n.shipDef, n.dead ? 'wreck' : 'hostile', n.dead ? clamp(1 - n.sinkT / 1.5, 0, 1) : 1) })),
      ...this.escorts.map((e) => ({ z: e.pos.x + e.pos.y, draw: () => this._drawShip(ctx, w, h, e.pos, e.heading, e.shipDef, 'friendly', 1) })),
      { z: this.ship.pos.x + this.ship.pos.y, draw: () => this._drawShip(ctx, w, h, this.ship.pos, this.ship.heading, this.ship.shipDef, 'player', 1) },
    ].sort((a, b) => a.z - b.z);
    for (const d of drawables) d.draw();

    this._drawCannonballs(ctx, w, h);
    this._drawWeatherOverlay(ctx, w, h);
    if (this.rain.visible) this._drawRain(ctx, w, h);

    ctx.restore();
  }

  _drawWater(ctx, w, h) {
    const TILE = 10;
    const corners = [[0, 0], [w, 0], [0, h], [w, h]].map(([sx, sy]) => this.iso.toWorld(this.camera, sx, sy, w, h));
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const c of corners) { minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x); minZ = Math.min(minZ, c.z); maxZ = Math.max(maxZ, c.z); }
    const pad = TILE * 2;
    const x0 = Math.floor((minX - pad) / TILE) * TILE, x1 = Math.ceil((maxX + pad) / TILE) * TILE;
    const z0 = Math.floor((minZ - pad) / TILE) * TILE, z1 = Math.ceil((maxZ + pad) / TILE) * TILE;
    const t = this.t;
    for (let wz = z0; wz < z1; wz += TILE) {
      for (let wx = x0; wx < x1; wx += TILE) {
        const wave = Math.sin(wx * 0.05 + t * 0.8) + Math.sin(wz * 0.045 - t * 0.6);
        ctx.fillStyle = wave > 0.25 ? WATER_LIGHT : WATER_DEEP;
        const p0 = this.iso.toScreen(this.camera, wx, wz, w, h);
        const p1 = this.iso.toScreen(this.camera, wx + TILE, wz, w, h);
        const p2 = this.iso.toScreen(this.camera, wx + TILE, wz + TILE, w, h);
        const p3 = this.iso.toScreen(this.camera, wx, wz + TILE, w, h);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  _drawLand(ctx, w, h) {
    ctx.fillStyle = LAND_COLOR;
    ctx.strokeStyle = LAND_EDGE;
    ctx.lineWidth = 1.5;
    for (const poly of LAND_POLYGONS) {
      ctx.beginPath();
      poly.forEach(([wx, wz], i) => {
        const p = this.iso.toScreen(this.camera, wx, wz, w, h);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  _drawCityMarker(ctx, w, h, marker) {
    const p = this.iso.toScreen(this.camera, marker.pos.x, marker.pos.y, w, h);
    if (p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) return;
    const icon = cityIconSprite(marker.country);
    ctx.drawImage(icon, p.x - icon.width / 2, p.y - icon.height + 4);
  }

  _drawWake(ctx, w, h) {
    for (const puff of this.wakeTrail.puffs) {
      const p = this.iso.toScreen(this.camera, puff.x, puff.y, w, h);
      ctx.fillStyle = `rgba(238,246,242,${(puff.opacity ?? 0.3).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, puff.scale * this.iso.scaleY * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 자동 항해 목적지 — 수면 위 작은 깃발 표식 + 배에서 이어지는 점선 항로.
  _drawWaypoint(ctx, w, h) {
    const p = this.iso.toScreen(this.camera, this.waypoint.x, this.waypoint.z, w, h);
    const s = this.iso.toScreen(this.camera, this.ship.pos.x, this.ship.pos.y, w, h);
    ctx.save();
    ctx.strokeStyle = 'rgba(246,220,140,0.55)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(p.x, p.y + 1); ctx.lineTo(p.x, p.y - 9); ctx.stroke();
    ctx.fillStyle = '#e0503f';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 9); ctx.lineTo(p.x + 6, p.y - 6.5); ctx.lineTo(p.x, p.y - 4);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  _drawShip(ctx, w, h, pos, heading, shipDef, variant, alpha) {
    const v = variant === 'player' ? 'n' : variant === 'friendly' ? 'n' : variant;
    drawShipIso(ctx, this.iso, this.camera, w, h, pos, heading, shipDef, v, alpha);
  }

  _drawCannonballs(ctx, w, h) {
    ctx.fillStyle = '#181614';
    for (const b of this.cannonPool.balls) {
      const p = this.iso.toScreen(this.camera, b.x, b.y, w, h);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawWeatherOverlay(ctx, w, h) {
    const dark = 1 - clamp(this.weather.brightness, 0, 1.2);
    if (dark > 0.02) {
      ctx.fillStyle = `rgba(6,10,20,${clamp(dark * 0.62, 0, 0.72)})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (this.weather.stormIntensity > 0.05) {
      ctx.fillStyle = `rgba(50,58,64,${this.weather.stormIntensity * 0.32})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  _drawRain(ctx, w, h) {
    ctx.strokeStyle = `rgba(207,224,234,${this.rain.opacity.toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of this.rain.drops) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 2, d.y - d.len);
    }
    ctx.stroke();
  }
}
