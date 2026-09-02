import { Vec2, clamp, lerp } from '../util/math2d.js';
import { Camera2D, worldToScreen } from '../render/canvas2d.js';
import { shipSprite, shipSpriteSize, cityIconSprite } from '../render/pixelSprites.js';
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
import { MAINLAND_POLY, BRITAIN_POLY, LAND_POLYGONS, pointOnAnyLand } from '../data/coastline.js';
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

const WATER_DEEP = '#0d4256';
const WATER_LIGHT = '#155a78';
const LAND_COLOR = '#7a9c5a';
const LAND_EDGE = '#5c7a42';

export class SeaScene {
  constructor(logicalW, logicalH) {
    this.logicalW = logicalW;
    this.logicalH = logicalH;
    this.camera = new Camera2D();

    this.weather = new WeatherSystem();
    this.rain = new RainEffect(logicalW, logicalH);
    this.wind = new Wind();

    this.moundColliders = CITIES.map((c) => ({ x: c.pos[0], z: c.pos[1], r: 30 }));
    this.cityMarkers = this._computeCityMarkers();

    if (!state.shipHp) initShipHp();
    const shipDef = getEffectiveShipDef(getShip(state.currentShipId), state.shipParts);
    this.ship = new ShipController(shipDef);
    this.ship.pos.set(state.shipPos[0], state.shipPos[1]);
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
      if (consumeJustPressed('KeyW')) this.ship.throttleUp();
      if (consumeJustPressed('KeyS')) this.ship.throttleDown();
      this.ship.turnInput = (isDown('KeyA') ? 1 : 0) - (isDown('KeyD') ? 1 : 0);
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

  // ---- 렌더링 ----
  render(ctx) {
    const w = this.logicalW, h = this.logicalH;
    const px = BASE_PX_PER_UNIT * this.camera.zoom;

    ctx.save();
    const shakeAmt = this.shakeTrauma * this.shakeTrauma;
    if (shakeAmt > 0.001) {
      const mag = shakeAmt * 10;
      ctx.translate((Math.random() * 2 - 1) * mag, (Math.random() * 2 - 1) * mag);
    }

    this._drawWater(ctx, px, w, h);
    this._drawLand(ctx, px, w, h);
    for (const m of this.cityMarkers) this._drawCityMarker(ctx, px, w, h, m);
    this._drawWake(ctx, px, w, h);
    for (const n of this.npcShips) this._drawShip(ctx, px, w, h, n.pos, n.heading, n.shipDef, n.dead ? 'wreck' : 'hostile', n.dead ? clamp(1 - n.sinkT / 1.5, 0, 1) : 1);
    for (const e of this.escorts) this._drawShip(ctx, px, w, h, e.pos, e.heading, e.shipDef, 'friendly', 1);
    this._drawShip(ctx, px, w, h, this.ship.pos, this.ship.heading, this.ship.shipDef, 'player', 1);
    this._drawCannonballs(ctx, px, w, h);
    this._drawWeatherOverlay(ctx, w, h);
    if (this.rain.visible) this._drawRain(ctx, w, h);

    ctx.restore();
  }

  _drawWater(ctx, px, w, h) {
    const tile = 8;
    const t = this.t;
    for (let sy = 0; sy < h; sy += tile) {
      for (let sx = 0; sx < w; sx += tile) {
        const wx = (sx - w / 2) / px + this.camera.x;
        const wy = (sy - h / 2) / px + this.camera.y;
        const wave = Math.sin(wx * 0.05 + t * 0.8) + Math.sin(wy * 0.045 - t * 0.6);
        ctx.fillStyle = wave > 0.25 ? WATER_LIGHT : WATER_DEEP;
        ctx.fillRect(sx, sy, tile, tile);
      }
    }
  }

  _drawLand(ctx, px, w, h) {
    ctx.fillStyle = LAND_COLOR;
    ctx.strokeStyle = LAND_EDGE;
    ctx.lineWidth = 1.5;
    for (const poly of LAND_POLYGONS) {
      ctx.beginPath();
      poly.forEach(([wx, wz], i) => {
        const p = worldToScreen(this.camera, px, wx, wz, w, h);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  _drawCityMarker(ctx, px, w, h, marker) {
    const p = worldToScreen(this.camera, px, marker.pos.x, marker.pos.y, w, h);
    if (p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) return;
    const icon = cityIconSprite(marker.country);
    ctx.drawImage(icon, p.x - icon.width / 2, p.y - icon.height + 4);
  }

  _drawWake(ctx, px, w, h) {
    for (const puff of this.wakeTrail.puffs) {
      const p = worldToScreen(this.camera, px, puff.x, puff.y, w, h);
      ctx.fillStyle = `rgba(238,246,242,${(puff.opacity ?? 0.3).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, puff.scale * px * 0.3), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawShip(ctx, px, w, h, pos, heading, shipDef, variant, alpha) {
    const p = worldToScreen(this.camera, px, pos.x, pos.y, w, h);
    if (p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) return;
    const sprite = shipSprite(shipDef, variant === 'player' ? 'n' : variant === 'friendly' ? 'n' : variant);
    const scale = px / BASE_PX_PER_UNIT * 1.15;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(-heading);
    ctx.scale(scale, scale);
    ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
    ctx.restore();
  }

  _drawCannonballs(ctx, px, w, h) {
    ctx.fillStyle = '#181614';
    for (const b of this.cannonPool.balls) {
      const p = worldToScreen(this.camera, px, b.x, b.y, w, h);
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
