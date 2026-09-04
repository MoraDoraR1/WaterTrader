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
import { state, initShipHp, initCrewCount, notify } from '../state.js';
import { hud } from '../ui/hud.js';
import { checkBountyKill } from '../systems/quests.js';
import { loseMoraleFromCombat, getMoralePowerMul, getCrewSpeedMul, getCurrentMinCrew, loseCrewFromSupplies, rescueCrewFromVictory } from '../systems/crew.js';
import { FLEET_CAP } from '../systems/shipyard.js';
import { audio } from '../systems/audio.js';
import { formatCityEventBadge } from '../systems/market.js';

const DOCK_RANGE = 55;
const FIRE_COOLDOWN = 1.5;
const RESPAWN_CITY = 'lisboa'; // _findNearestCityMarker()가 실패하는 극단적 예외 상황에서만 쓰는 최후 폴백
const SHIPWRECK_GOLD_LOSS_PCT = 0.3; // 난파 시 휴대금(bankGold 제외) 손실 비율 — 은행에 맡길 이유를 만든다.
const SHIPWRECK_GOODS_LOSS_PCT = 0.7; // 난파 시 화물칸의 교역품(inventory) 손실 비율 — 식량/식수/자재/포탄은 별도 자원이라 영향 없음
const FOOD_PER_DAY = 1; // 항해일자 하루당 식량 소모(화물칸 공유 — systems/supplies.js)
const WATER_PER_DAY = 1; // 항해일자 하루당 식수 소모
// 충돌 피해는 충돌 순간 속도에 비례한다 — 제자리에서 스치듯 부딪히면 가볍게, 전속력으로
// 들이받으면(충각 전술) 양측 모두 크게 상한다.
const COLLISION_DAMAGE_BASE = 18;
const COLLISION_DAMAGE_SPEED_BONUS = 24;
const COLLISION_COOLDOWN = 2.5;
// 충돌해도 곧바로 백병전으로 이어지지 않는다 — 이 시간 안에 F를 눌러야 승선(백병전 돌입)한다
// (예전엔 25% 확률로 자동 발생해 플레이어가 개입할 여지가 전혀 없었다).
const BOARDING_WINDOW = 3.0;
const MELEE_DURATION = 4.5;
const MELEE_CLICK_CAP = 24; // 백병전 중 연타로 얻는 최대 기세 횟수
const MELEE_CLICK_POWER = 0.02; // 연타 1회당 전투력 +2%(최대 시 +48%)
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

    this.weather = new WeatherSystem(state.dayTimer);
    this.rain = new RainEffect(logicalW, logicalH);
    this.wind = new Wind();

    this.moundColliders = CITIES.map((c) => ({ x: c.pos[0], z: c.pos[1], r: 30 }));
    this.cityMarkers = this._computeCityMarkers();

    if (!state.shipHp) initShipHp();
    if (state.crewCount == null) initCrewCount();
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
    this._boardable = null; // 충돌 직후 F로 승선(백병전)할 수 있는 짧은 창구 — { npc, timer }
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
    if (this.meleeState) { this._meleeMash(); return; }
    if (state.inCombat) this.fireCannon();
    else if (this.hoveredCity && this.onDock) this.onDock(this.hoveredCity.id);
  }

  // 충돌 후 짧은 승선 창구(this._boardable) 안에 F를 누르면 백병전이 시작된다.
  handleBoardKey() {
    if (!this._boardable || this.meleeState || this.pendingCapture) return;
    const npc = this._boardable.npc;
    this._boardable = null;
    if (npc.dead) return;
    this._startMelee(npc);
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
        capital: !!city.capital,
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
      const speedRatio = Math.min(1, Math.abs(this.ship.curSpeed) / this.ship.maxSpeedMs);
      const dmg = Math.round(COLLISION_DAMAGE_BASE + COLLISION_DAMAGE_SPEED_BONUS * speedRatio);
      state.shipHp = Math.max(0, state.shipHp - dmg);
      loseMoraleFromCombat();
      npc.takeDamage(dmg);
      audio.playHit();
      this.addShake(0.6);
      hud.toast(`충돌! 양측 선체가 ${dmg} 손상되었습니다.`);
      if (npc.dead) {
        this._victoryToast(`${npc.def.name}을(를) 격침했습니다!`, npc.owner);
        continue;
      }
      // 충돌 즉시 백병전으로 이어지지 않는다 — F를 눌러야 승선한다(플레이어의 선택).
      this._boardable = { npc, timer: BOARDING_WINDOW };
      break;
    }
  }

  _startMelee(npc) {
    this._boardable = null;
    hud.showInteractPrompt(false);
    this.meleeState = { npc, timer: MELEE_DURATION, clicks: 0 };
    hud.setCombatBannerText(`⚔ 백병전 중! 스페이스바 연타로 기세를 올리세요 (0/${MELEE_CLICK_CAP})`);
    hud.toast(`${npc.def.name}에 승선했습니다! 백병전 시작!`);
  }

  // 백병전 중 스페이스바(또는 좌클릭)를 누를 때마다 호출 — 플레이어의 실제 입력이 승패에 반영된다.
  _meleeMash() {
    if (!this.meleeState) return;
    this.meleeState.clicks = Math.min(MELEE_CLICK_CAP, this.meleeState.clicks + 1);
    hud.setCombatBannerText(`⚔ 백병전 중! 스페이스바 연타로 기세를 올리세요 (${this.meleeState.clicks}/${MELEE_CLICK_CAP})`);
  }

  _resolveMelee() {
    const { npc, clicks } = this.meleeState;
    this.meleeState = null;
    hud.setCombatBannerText('⚔ 전투 상황');
    if (npc.dead) return;

    const playerCrew = state.crewCount ?? this.ship.shipDef.crew ?? 20;
    const npcCrew = npc.shipDef.crew || 20;
    const clickBonus = 1 + Math.min(MELEE_CLICK_CAP, clicks || 0) * MELEE_CLICK_POWER;
    // 상대가 이미 포격으로 많이 상해 있었다면(내구도 비율 낮음) 백병전에서도 약하게 싸운다 —
    // 승선 전에 함포로 충분히 두들겨 놓는 게 실제로 이득이 되도록 한다.
    const npcHpRatio = npc.maxHp > 0 ? npc.hp / npc.maxHp : 1;
    const playerPower = playerCrew * (0.75 + Math.random() * 0.5) * getMoralePowerMul() * clickBonus;
    const npcPower = npcCrew * (0.75 + Math.random() * 0.5) * (0.5 + 0.5 * npcHpRatio);
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

  // 전투 승리(격침/나포/충돌격침/포격격침 어디서든) 메시지들을 한 토스트로 합쳐 띄운다 —
  // hud.toast()는 큐 없이 즉시 덮어써서 따로따로 부르면 마지막 것만 남으므로, 구조 인원·
  // 의뢰 완료 문구가 묻히지 않게 항상 한 번에 합쳐서 보여준다.
  _victoryToast(baseMsg, npcOwner) {
    const rescued = rescueCrewFromVictory();
    const bounty = checkBountyKill(npcOwner);
    const bits = [baseMsg];
    if (rescued > 0) bits.push(`표류하던 선원 ${rescued}명을 구조해 편입했습니다.`);
    if (bounty) bits.push(`의뢰 완료: ${bounty.title} (+${bounty.reward.toLocaleString('ko-KR')} 두캇)`);
    hud.toast(bits.join(' '));
  }

  _confirmSink(npc, prefix = '') {
    this.pendingCapture = null;
    hud.hideDialogue();
    const loot = Math.round(80 + Math.random() * 160);
    state.gold += loot;
    npc.takeDamage(npc.maxHp);
    this._victoryToast(`${prefix}백병전 승리! 적선을 격침하고 ${loot.toLocaleString('ko-KR')} 두캇을 노획했습니다.`, npc.owner);
  }

  _confirmCapture(npc) {
    this.pendingCapture = null;
    hud.hideDialogue();
    audio.playCaptureFanfare();
    const capturedHp = Math.round(npc.shipDef.hp * (0.3 + Math.random() * 0.25));
    const capturedCrew = Math.round((npc.shipDef.crew || 20) * (0.3 + Math.random() * 0.25));
    state.fleet = [...state.fleet, { uid: `fleet_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`, shipId: npc.shipDef.id, shipHp: capturedHp, crewCount: capturedCrew, shipParts: {}, name: null }];
    state.captureCount = (state.captureCount || 0) + 1;
    npc.takeDamage(npc.maxHp);
    notify({ fleetChanged: true });
    this._victoryToast(`나포 성공! ${npc.def.name}을(를) 함대에 편입했습니다 (손상 상태 — 조선소에서 수리 필요).`, npc.owner);
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
    if (state.cannonballs <= 0) { hud.toast('포탄이 없습니다! 항구 관리인에게 보급받으세요.'); return; }
    const target = this._nearestHostile();
    if (!target || target.pos.distanceTo(this.ship.pos) > 60) {
      hud.toast('사거리 내에 목표가 없습니다.');
      return;
    }
    this.fireTimer = FIRE_COOLDOWN;
    state.cannonballs -= 1; // 일제 사격(현측 포열 전체) 1회 = 포탄 1개 소모(게임적 추상화)
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

  // 항해일자가 넘어갈 때마다(voyageDay 증가) 식량·식수를 소모한다. 둘 중 하나라도 바닥나면
  // 선원이 지쳐 사기가 크게 깎이고 선체도 상한다 — 방치하면 결국 state.shipHp<=0(침몰) 분기로
  // 이어져, 전투로 인한 침몰과 똑같이 휴대금 손실 페널티를 받는다(은행에 맡겨둔 돈은 안전하다).
  _processSupplies() {
    const day = this.weather.voyageDay;
    if (day <= state.suppliesLastDay) return;
    const daysPassed = day - state.suppliesLastDay;
    state.suppliesLastDay = day;
    let starvedDays = 0, dehydratedDays = 0;
    for (let i = 0; i < daysPassed; i++) {
      state.food = Math.max(0, state.food - FOOD_PER_DAY);
      state.water = Math.max(0, state.water - WATER_PER_DAY);
      if (state.food <= 0) starvedDays++;
      if (state.water <= 0) dehydratedDays++;
    }
    if (starvedDays <= 0 && dehydratedDays <= 0) return;
    const starved = starvedDays > 0, dehydrated = dehydratedDays > 0;
    const maxHp = this.ship.shipDef.hp;
    let dmgPct = 0;
    if (starved) { state.crewMorale = Math.max(0, (state.crewMorale ?? 100) - 15); dmgPct += 0.08; }
    if (dehydrated) { state.crewMorale = Math.max(0, (state.crewMorale ?? 100) - 20); dmgPct += 0.12; }
    state.shipHp = Math.max(0, state.shipHp - Math.round(maxHp * dmgPct));
    // 식량/식수가 완전히 떨어진 날수만큼 선원도 실제로 줄어든다(아사·탈영) — 사기/선체 손상과
    // 별개로, 방치할수록 배를 몰 사람 자체가 부족해져 속도가 깎이는 실질적 페널티로 이어진다.
    loseCrewFromSupplies(starvedDays, dehydratedDays);
    const reason = starved && dehydrated ? '식량과 식수가' : starved ? '식량이' : '식수가';
    hud.toast(`${reason} 바닥나 선원들이 지쳐갑니다! 선체가 상하고 선원이 줄어듭니다. (항구에서 보급하세요)`);
  }

  update(delta, elapsed) {
    this.t = elapsed;
    this.weather.update(delta);
    state.dayTimer = this.weather.dayTimer;
    this._processSupplies();
    this.wind.stormActive = this.weather.stormActive;
    this.wind.update(delta);

    if (this.meleeState) {
      if (consumeJustPressed('Space')) this._meleeMash();
      this.meleeState.timer -= delta;
      if (this.meleeState.timer <= 0) this._resolveMelee();
    } else if (this.pendingCapture) {
      // 대기
    } else {
      if (this._boardable) {
        this._boardable.timer -= delta;
        if (this._boardable.timer <= 0 || this._boardable.npc.dead) {
          this._boardable = null;
          hud.showInteractPrompt(false);
        } else {
          hud.showInteractPrompt(true, `F: ${this._boardable.npc.def.name}에 승선(백병전 돌입)`);
        }
      }
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
      this.ship.crewSpeedMul = getCrewSpeedMul();
      this.ship.update(delta, elapsed, (x, z) => this._isBlocked(x, z), this.wind);
    }
    this._updateWake(delta);
    for (const escort of this.escorts) escort.update(delta, this.ship);
    this.rain.update(delta, this.weather.stormIntensity);
    hud.setWeather(`${this.weather.label} · 항해 ${this.weather.voyageDay}일차`, this.weather.stormIntensity > 0.1);
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
    if (state.inCombat && isDown('Space') && this.fireTimer <= 0 && !this.pendingCapture && !this.meleeState) this.fireCannon();

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
          this._victoryToast(`${target.ref.def.name}을(를) 격침했습니다!`, target.ref.owner);
        }
      }
    });

    // 난파 조건: 선체 내구도 0 또는 선원 0 — 둘 중 하나만 충족돼도 즉시 난파한다(선체는
    // 멀쩡해도 배를 몰 사람이 아무도 없으면 항해 불능인 건 마찬가지). 최소 정원(50%) 밑으로만
    // 떨어진 상태는 속도 페널티로 끝나고, "선원이 완전히 0"이 됐을 때만 난파로 이어진다.
    if (state.shipHp <= 0 || state.crewCount === 0) {
      const wreckedByCrew = state.crewCount === 0;
      const wreckedByHull = state.shipHp <= 0;
      const nearest = this._findNearestCityMarker();
      const destCity = (nearest.marker && CITIES.find((c) => c.id === nearest.marker.cityId)) || CITIES.find((c) => c.id === RESPAWN_CITY);

      // 휴대 중인 두캇 일부를 잃는다(은행에 맡긴 돈은 안전).
      const goldLost = Math.round(state.gold * SHIPWRECK_GOLD_LOSS_PCT);
      state.gold = Math.max(0, state.gold - goldLost);

      // 화물칸의 교역품도 70%를 잃는다(30%만 건짐) — 식량/식수/자재/포탄은 별도 자원이라 그대로 남는다.
      let goodsLostTons = 0;
      state.inventory = state.inventory
        .map((it) => {
          const kept = Math.floor(it.qty * (1 - SHIPWRECK_GOODS_LOSS_PCT));
          goodsLostTons += it.qty - kept;
          return { ...it, qty: kept };
        })
        .filter((it) => it.qty > 0);

      const reason = wreckedByCrew && wreckedByHull ? '선원을 모두 잃고 선체마저 완전히 부서져'
        : wreckedByCrew ? '선원을 모두 잃어 더 이상 배를 몰 수 없어져'
        : '선체가 완전히 부서져';
      const lossBits = [];
      if (goldLost > 0) lossBits.push(`휴대금 ${goldLost.toLocaleString('ko-KR')} 두캇`);
      if (goodsLostTons > 0) lossBits.push(`교역품 ${goodsLostTons}t`);
      const lossNote = lossBits.length ? `${lossBits.join('과 ')}을 잃고 ` : '';
      const wreckMsg = `${reason} 난파했습니다! ${lossNote}가장 가까운 항구 ${destCity.name}(으)로 옮겨졌습니다. (은행 예치금은 안전합니다)`;

      initShipHp();
      initCrewCount();
      if (this.meleeState) { this.meleeState = null; hud.setCombatBannerText('⚔ 전투 상황'); }
      if (this._boardable) { this._boardable = null; hud.showInteractPrompt(false); }
      notify({ inventoryChanged: true });

      // 배를 그 도시 근처로 옮겨두고(다음에 다시 바다로 나올 때의 위치), 곧바로 도시 내부로
      // 이동시킨다 — 도킹 버튼을 눌러야 하는 절차 없이 난파와 동시에 항구에 옮겨진 것으로 처리.
      this.ship.pos.set(destCity.pos[0] - 70, destCity.pos[1]);
      this.ship.notch = 0;
      if (this.onDock) {
        // onDock(goToCity)이 내부에서 "OO에 정박했습니다" 토스트를 자체적으로 띄운다 —
        // toast()는 큐 없이 즉시 덮어쓰므로, 난파 메시지를 그 뒤에 불러야 화면에 남는다.
        this.onDock(destCity.id);
        hud.toast(wreckMsg);
        return;
      }
      hud.toast(wreckMsg);
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
    hud.setCrewCount(state.crewCount ?? this.ship.shipDef.crew, this.ship.shipDef.crew, getCurrentMinCrew());
    // low: 아직 바닥나진 않았어도 미리 경고(식량/식수 3일분, 자재 1개=수리 1회분, 포탄 3발 미만).
    hud.setSupplies([
      { icon: '🍖', qty: state.food, low: state.food <= 3 },
      { icon: '💧', qty: state.water, low: state.water <= 3 },
      { icon: '🪵', qty: state.materials, low: state.materials < 1 },
      { icon: '💣', qty: state.cannonballs, low: state.cannonballs <= 2 },
    ]);

    const windPct = Math.round((this.ship.windMul - 1) * 100);
    const windLabel = windPct > 3 ? `순풍 +${windPct}%` : windPct < -3 ? `역풍 ${windPct}%` : `무풍 ${windPct >= 0 ? '+' : ''}${windPct}%`;
    hud.setWind(this.wind.towardDirection, windLabel);

    const regionName = seaRegionAt(this.ship.pos.x, this.ship.pos.y);
    const nearest = this._findNearestCityMarker();
    if (nearest.marker && nearest.dist < 300) {
      const city = CITIES.find((c) => c.id === nearest.marker.cityId);
      const eventBadge = formatCityEventBadge(city.id);
      hud.setLocation(regionName, `가까운 항구: ${city.name}${eventBadge ? ' · ' + eventBadge : ''}`);
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
    // 승선(백병전 돌입) 안내가 떠 있는 동안은 정박 안내가 매 프레임 덮어쓰지 않도록 양보한다.
    if (!this._boardable) {
      if (nearest.marker && nearest.dist < DOCK_RANGE) {
        const city = CITIES.find((c) => c.id === nearest.marker.cityId);
        hud.showInteractPrompt(true, `[좌클릭] ${city.name}에 정박하기`);
        this.hoveredCity = city;
      } else {
        hud.showInteractPrompt(false);
        this.hoveredCity = null;
      }
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
    // 국가별 대도시는 바다에서도 아이콘을 더 크게 그려 눈에 띄게 한다.
    const s = marker.capital ? 1.5 : 1;
    ctx.drawImage(icon, p.x - (icon.width * s) / 2, p.y - icon.height * s + 4, icon.width * s, icon.height * s);
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
