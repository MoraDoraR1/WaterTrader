import { Vec2, clamp, lerp } from '../util/math2d.js';
import { Camera2D, IsoProjection } from '../render/canvas2d.js';
import { cityIconSprite } from '../render/pixelSprites.js';
import { drawShipIso } from '../render/shipIso.js';
import { ShipController } from '../entities/shipController.js';
import { worldSizeFor } from '../entities/shipSize.js';
import { NpcShip, getKillGold, rollCombatLoot, checkPirateRespawns, checkDailyEscalationReset, checkLegendaryUnlockAnnouncements } from '../entities/pirate.js';
import { EscortShip } from '../entities/escort.js';
import { CannonballPool } from '../entities/cannon.js';
import { WakeTrail } from '../entities/wake.js';
import { Wind } from '../entities/wind.js';
import { WeatherSystem, RainEffect } from '../entities/weather.js';
import { getShip, COUNTRY_COLORS, COUNTRY_NAMES } from '../data/ships.js';
import { getEffectiveShipDef, armorDamageMul } from '../data/shipParts.js';
import { getCombatants, getCombatPower, getNpcCombatPower } from '../systems/combatPower.js';
import { mulSkillEffect, sumSkillEffect } from '../data/shipSkills.js';
import { PLAYER_SKILLS } from '../data/playerSkills.js';
import { gainSkillExp, getSkillLevel, buffMul, buffAdd, castSkill, isLearned } from '../systems/skills.js';
import { CITIES } from '../data/cities.js';
import { LAND_POLYGONS, pointOnAnyLand, project, HARBOR_CLEAR_RADIUS } from '../data/coastline.js';
import { seaRegionAt, getSeaLockBucket } from '../data/seaRegions.js';
import { SEA_NPC_SHIPS, NAVY_RESPONDER_SHIP_BY_REGION } from '../data/seaEntities.js';
import { isDown, consumeJustPressed } from '../controls/keys.js';
import { state, initShipHp, initCrewCount, notify } from '../state.js';
import { hud } from '../ui/hud.js';
import { checkBountyKill, addReputation, checkQuestRespawns, checkInvestigateComplete, getExtraSkillReqs } from '../systems/quests.js';
import { ARCHAEOLOGY_SITES, GEOGRAPHY_SITES, ASTRONOMY_ENTRIES, rewardFor, rewardForRank } from '../data/compendium.js';
import { checkDiscoveryEvents } from '../systems/discoveryEvents.js';
import { checkCompendiumRewards } from '../systems/compendiumRewards.js';
import { addAdventureFame, addCombatFame, addInfamy, checkDiscoveryMilestone } from '../systems/fame.js';
import { ADVENTURE_FAME_PER_DISCOVERY, ADVENTURE_FAME_PER_EXPLORATION, COMBAT_FAME_BY_TIER, INFAMY_PER_CONVOY_KILL, NAVY_PURSUIT_RADIUS } from '../data/titles.js';
import { checkExplorationSite } from '../systems/exploration.js';
import { isRouteUnlocked, getRouteUnlockInfo } from '../systems/routeUnlock.js';
import { RANKS } from '../data/ranks.js';
import { loseMoraleFromCombat, getMoralePowerMul, getCrewSpeedMul, getCurrentMinCrew, loseCrewFromSupplies, rescueCrewFromVictory } from '../systems/crew.js';
import { audio } from '../systems/audio.js';
import { formatCityEventBadge, getCargoCapacity, getCargoUsed } from '../systems/market.js';
import { getGood } from '../data/goods.js';

const DOCK_RANGE = 55;
const SITE_INTERACT_RANGE = 32; // 고고학/지리학 사이트에 조사 판정이 뜨는 거리
const REINVESTIGATE_COOLDOWN = 45; // 같은 사이트(또는 관측) 재사용 사이 최소 대기시간(초)
const FIRE_COOLDOWN = 1.5;
const RESPAWN_CITY = 'lisboa'; // _findNearestCityMarker()가 실패하는 극단적 예외 상황에서만 쓰는 최후 폴백
const SHIPWRECK_GOLD_LOSS_PCT = 0.3; // 난파 시 휴대금(bankGold 제외) 손실 비율 — 은행에 맡길 이유를 만든다.
const SHIPWRECK_GOODS_LOSS_PCT = 0.7; // 난파 시 화물칸의 교역품(inventory) 손실 비율 — 식량/식수/자재/포탄은 별도 자원이라 영향 없음
const FOOD_PER_DAY = 1; // 항해일자 하루당 식량 소모(화물칸 공유 — systems/supplies.js)
const WATER_PER_DAY = 1; // 항해일자 하루당 식수 소모
// 폭풍(stormIntensity>0.5) 중 순풍을 타고(align>0.5) 빠르게(speedRatio>0.3) 달릴 때, 최대
// 조건(완전한 폭풍·정순풍·전속력)에서 초당 잃는 최대 내구도 비율 — "조금씩" 상하는 수준으로,
// 폭풍 지속시간(45~95초) 내내 최악의 조건으로만 달려도 완파에는 크게 못 미치게 잡았다.
const STORM_TAILWIND_DMG_PCT_PER_SEC = 0.002;
// 역풍으로 폭풍을 정면으로 거스를 때의 손상률 — 속도 이득이 전혀 없는데도 순풍보다 더
// 크게 잡아, "폭풍 속에서는 역풍으로 버티지 말고 방향을 바꿔라"는 실제 선택압을 준다.
const STORM_HEADWIND_DMG_PCT_PER_SEC = 0.0035;
// 벼락(lightning) — 아주 심한 폭풍(stormIntensity>0.7)에서만, 진행 방향과 무관하게
// 판정 주기마다 낮은 확률로 발동하는 목돈 피해 사고.
const LIGHTNING_CHECK_INTERVAL = 8; // 초 — 이 주기마다 한 번씩 확률을 굴린다
const LIGHTNING_CHANCE = 0.12; // 판정마다 실제로 발동할 확률
const LIGHTNING_DMG_PCT_MIN = 0.03, LIGHTNING_DMG_PCT_MAX = 0.06; // 최대 내구도 대비 피해 비율
// 좋은 날씨(weather.isFairWeather) — 폭풍/안개와 짝을 이루는 위험 없는 순수 보너스.
// 전투 회복 스킬(combatHpRegenPerSec)보다 훨씬 느려, "전투를 피하고 맑은 날 천천히 쉬어가는"
// 선택지일 뿐 주력 회복 수단이 되지는 않게 잡았다.
const FAIR_WEATHER_HP_REGEN_PCT_PER_SEC = 0.0006; // 최대 내구도의 0.06%/초
const FAIR_WEATHER_MORALE_REGEN_PER_SEC = 0.15; // 사기 +0.15/초(최대 100)
// 충돌 피해는 충돌 순간 속도에 비례한다 — 제자리에서 스치듯 부딪히면 가볍게, 전속력으로
// 들이받으면(충각 전술) 양측 모두 크게 상한다.
const COLLISION_DAMAGE_BASE = 18;
const COLLISION_DAMAGE_SPEED_BONUS = 24;
const COLLISION_COOLDOWN = 2.5;
const PEACEFUL_ATTACK_REP_PENALTY = 12; // 평화로운 상선/모험가/명사를 도발했을 때 그 소속국 평판 하락폭(배달 완료 1건의 +5보다 크게 잡아, 실제로 손해라고 느끼게 한다)
const ESCORT_SHOT_DMG = 10; // 함대(예비 선박)의 보조 사격 데미지 — 플레이어 자체 사격(고정 22)보다 낮게 잡아 "최소한의 기여"로만 남긴다
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

// 클릭으로 함선을 조준했을 때 화면상 판정 반경(논리 픽셀) — 배 스프라이트 크기가 작아도
// 최소한 이 정도는 클릭이 맞아야 한다.
const SHIP_PICK_MIN_PX = 11;
// NPC별 dialogue 필드가 없을 때 유형별로 쓰는 기본 대사.
const DEFAULT_NPC_DIALOGUE = {
  pirate: '거친 눈빛으로 노려볼 뿐, 대화가 통하지 않는 듯합니다.',
  merchant: '"이 근방 항구 시세가 심상치 않다던데... 조심해서 다니시게." 상인이 손을 흔들며 지나쳐 갑니다.',
  adventurer: '"신대륙 이야기 들었나? 나도 그쪽으로 가는 길일세!" 모험가가 활기차게 인사를 건넵니다.',
  notable: '위엄 있는 함대가 예를 갖춰 예포를 짧게 울리고는 항로를 계속합니다.',
  convoy: '"우리 화물이 탐나시오? 함부로 덤빌 생각은 마시게." 호송대 책임자가 경계하는 눈빛을 보냅니다.',
  navy: '정규 수군 함선이 항로를 순찰하고 있습니다. 죄를 짓지 않았다면 두려워할 것 없습니다.',
};

export class SeaScene {
  constructor(logicalW, logicalH) {
    this.logicalW = logicalW;
    this.logicalH = logicalH;
    this.camera = new Camera2D();
    this.iso = new IsoProjection(BASE_PX_PER_UNIT, 0.55);

    this.weather = new WeatherSystem(state.dayTimer);
    this.rain = new RainEffect(logicalW, logicalH);
    this.wind = new Wind();
    this._stormSailWarned = false; // 폭풍 속 순풍/역풍 항해 경고 토스트를 폭풍당 한 번만 띄우기 위한 플래그
    this._lightningTimer = LIGHTNING_CHECK_INTERVAL;
    this._lightningFlash = 0; // 벼락 발동 순간의 백색 스크린 플래시 잔여 강도(1→0으로 감쇠)
    this._lightningBolt = null; // 화면에 그릴 번개 줄기(짧은 수명의 지그재그 선)

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

    this.cannonPool = new CannonballPool(160); // 최상급 함선(140문급)의 일제사격(최대 36발)이 NPC 포화와 겹쳐도 조기 재활용(shift)되지 않도록 여유를 둔다.
    this.npcShips = SEA_NPC_SHIPS.map((d) => new NpcShip(d));
    this.escorts = [];
    this.rebuildEscorts();

    this.fireTimer = 0;
    this.hoveredCity = null;
    this.t = 0;
    this.onDock = null;
    this.collisionTimers = new Map();
    this.impactSparks = []; // 피격 지점에 잠깐 튀는 스파크 파편 — { x, y, dx, dy, life, maxLife }
    this.meleeState = null;
    this._boardable = null; // 충돌 직후 F로 승선(백병전)할 수 있는 짧은 창구 — { npc, timer }
    this.selectedTarget = null; // 클릭으로 지정한 NPC — 상호작용 범위 원 + 전투/대화/종료 메뉴
    this.shakeTrauma = 0;
    // 학문(고고학/지리학/천문학) 조사·관측 — 사이트별/관측 공용 재사용 쿨다운(초, 세션 한정).
    this._investigateCooldowns = {};
    this._astroCooldown = 0;
    this._nearbySite = null; // 매 프레임 _updateInvestigatePrompt가 갱신, G키 처리 시 참조
    this._astroReady = false;
    this.wakeTrail = new WakeTrail();
    this._wakeTimer = 0;
    this._routeWarnCooldown = 0; // 잠긴 항로 접근 경고 토스트 도배 방지

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

  // 피격 지점(포탄 명중/충돌/벼락)에 잠깐 튀는 파편 스파크 — 순수 시각 효과라 판정에는
  // 관여하지 않는다. 매번 4~6개를 무작위 방향으로 흩뿌리고, 수명이 다하면 _updateImpactSparks가 정리한다.
  _spawnImpactEffect(x, y) {
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 18 + Math.random() * 26;
      const maxLife = 0.22 + Math.random() * 0.16;
      this.impactSparks.push({ x, y, dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed, life: maxLife, maxLife });
    }
  }

  _updateImpactSparks(delta) {
    for (let i = this.impactSparks.length - 1; i >= 0; i--) {
      const s = this.impactSparks[i];
      s.life -= delta;
      if (s.life <= 0) { this.impactSparks.splice(i, 1); continue; }
      s.x += s.dx * delta;
      s.y += s.dy * delta;
    }
  }

  // 피격으로 바뀐 escort의 hp를 state.fleet의 해당 항목에 즉시 되써준다 — 세이브나 함대
  // 탭 교체(rebuildEscorts) 시에도 깎인 체력이 그대로 이어지게 하기 위해서다.
  _syncEscortHp(escort) {
    state.fleet = state.fleet.map((f) => (f.uid === escort.fleetUid ? { ...f, shipHp: escort.hp } : f));
  }

  // escort가 hp 0으로 격침되면 함대에서 영구히 사라진다(플레이어 자신의 난파와 달리
  // 되살아나지 않는다) — 함대에 실제 위험을 부여하는 핵심.
  _loseFleetShip(escort) {
    state.fleet = state.fleet.filter((f) => f.uid !== escort.fleetUid);
    this.escorts = this.escorts.filter((e) => e !== escort);
    hud.toast(`💥 예비 함대의 ${escort.shipDef.name}이(가) 격침되어 함대에서 사라졌습니다!`);
    notify({ fleetChanged: true });
  }

  rebuildEscorts() {
    this.escorts = state.fleet.map((f, i) => new EscortShip(getShip(f.shipId), i, f.uid, f.shipHp));
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

  // screenX/screenY(논리 좌표)가 주어지면 먼저 NPC 함선 클릭 여부를 판정한다 — 맞으면
  // 상호작용 범위 원 + 전투/대화/종료 메뉴를 띄우고, 다른 동작(포격/도킹)은 하지 않는다.
  handleLeftClick(screenX, screenY) {
    if (this.meleeState) { this._meleeMash(); return; }
    if (typeof screenX === 'number' && typeof screenY === 'number') {
      const picked = this._pickShipAt(screenX, screenY);
      if (picked) { this._selectTarget(picked); return; }
    }
    if (state.inCombat) this.fireCannon();
    else if (this.hoveredCity && this.onDock) this.onDock(this.hoveredCity.id);
  }

  // 화면(논리) 좌표 근처에 있는 NPC 함선을 찾는다 — 등각 투영으로 화면에 그려진 위치 기준.
  _pickShipAt(screenX, screenY) {
    const w = this.logicalW, h = this.logicalH;
    let best = null, bestD2 = Infinity;
    for (const npc of this.npcShips) {
      if (npc.dead || !npc.isActive()) continue;
      const p = this.iso.toScreen(this.camera, npc.pos.x, npc.pos.y, w, h);
      const dx = screenX - p.x, dy = screenY - p.y;
      const d2 = dx * dx + dy * dy;
      const hitR = Math.max(SHIP_PICK_MIN_PX, npc.radius * this.iso.scaleX * 1.3);
      if (d2 < hitR * hitR && d2 < bestD2) { bestD2 = d2; best = npc; }
    }
    return best;
  }

  _selectTarget(npc) {
    this.selectedTarget = npc;
    hud.showInteractionMenu(
      { name: npc.def.name, hostile: npc.isHostile() },
      {
        onCombat: () => this._engageTarget(),
        onTalk: () => this._talkTarget(),
        onCancel: () => this._cancelTarget(),
      }
    );
  }

  _engageTarget() {
    const npc = this.selectedTarget;
    if (!npc || npc.dead) return;
    // 원래 평화로운 상대(상인/모험가/명사)를 플레이어가 먼저 도발하는 경우에만, 그 배의
    // 소속국 평판에 실제 대가를 매긴다 — 이미 도발한 상태(hostileOverride)라면 중복 적용하지 않는다.
    const provoking = !npc.def.hostile && !npc.hostileOverride;
    npc.engage();
    if (provoking && npc.def.country) {
      addReputation(npc.def.country, -PEACEFUL_ATTACK_REP_PENALTY);
      const countryName = COUNTRY_NAMES[npc.def.country] || npc.def.country;
      hud.toast(`${npc.def.name}에 교전을 선포했습니다! (⚠ ${countryName} 평판 하락)`);
    } else {
      hud.toast(`${npc.def.name}에 교전을 선포했습니다!`);
    }
    this.selectedTarget = null;
    hud.hideInteractionMenu();
  }

  _talkTarget() {
    const npc = this.selectedTarget;
    if (!npc || npc.dead) return;
    const line = npc.def.dialogue || DEFAULT_NPC_DIALOGUE[npc.def.type] || '별다른 대화가 오가지 않았습니다.';
    hud.showDialogue(npc.def.name, line, [{ label: '닫기', onClick: () => hud.hideDialogue() }]);
  }

  _cancelTarget() {
    this.selectedTarget = null;
    hud.hideInteractionMenu();
  }

  // 상호작용 메뉴를 띄운 채(전투/대화를 아직 선택하지 않은 채) 도킹하면, SeaScene의 매 프레임
  // 갱신이 도시 화면에서는 멈추기 때문에 메뉴가 화면 위에 그대로 얼어붙은 채 남는다 — 이미
  // 죽었거나 화면에서 사라진 npc를 계속 참조하게 되므로 도킹 시점에 명시적으로 정리한다.
  clearSelection() {
    this.selectedTarget = null;
    hud.hideInteractionMenu();
  }

  // 충돌 후 짧은 승선 창구(this._boardable) 안에 F를 누르면 백병전이 시작된다.
  handleBoardKey() {
    if (!this._boardable || this.meleeState) return;
    const npc = this._boardable.npc;
    this._boardable = null;
    if (npc.dead) return;
    this._startMelee(npc);
  }

  // 미니맵(배 주변 국지 반경)에 표시할 학문 사이트 목록 — hud.updateMinimap이 화면 밖은
  // 알아서 잘라내므로 전체 목록을 그냥 넘긴다.
  _compendiumMinimapSites() {
    return [
      ...ARCHAEOLOGY_SITES.map((s) => ({ x: s.coords[0], z: s.coords[1], category: 'archaeology', found: !!state.compendium.archaeology[s.id] })),
      ...GEOGRAPHY_SITES.map((s) => ({ x: s.coords[0], z: s.coords[1], category: 'geography', found: !!state.compendium.geography[s.id] })),
    ];
  }

  // 가장 가까운 고고학/지리학 사이트를 찾는다(조사 판정 거리 안, 발견 여부 무관 — 재조사도 허용).
  _findNearbySite() {
    let best = null, bestD = SITE_INTERACT_RANGE;
    for (const site of ARCHAEOLOGY_SITES) {
      const d = Math.hypot(site.coords[0] - this.ship.pos.x, site.coords[1] - this.ship.pos.y);
      if (d < bestD) { bestD = d; best = { category: 'archaeology', site }; }
    }
    for (const site of GEOGRAPHY_SITES) {
      const d = Math.hypot(site.coords[0] - this.ship.pos.x, site.coords[1] - this.ship.pos.y);
      if (d < bestD) { bestD = d; best = { category: 'geography', site }; }
    }
    return best;
  }

  // 매 프레임(비-백병전 상태에서만) 조사/관측 가능 여부와 안내 문구를 갱신한다 — 승선(F)
  // 프롬프트가 떠 있는 동안은 그쪽이 우선이라 이 함수를 건너뛴다(호출부에서 이미 분기).
  _updateInvestigatePrompt() {
    this._nearbySite = this._findNearbySite();
    // 아주 심한 폭풍이 아니어도 안개·궂은 날씨면 별이 안 보인다는 느낌을 주기 위해
    // stormIntensity만 낮게(0.3 미만) 잡는다 — 완전히 잔잔할 필요까지는 없다.
    this._astroReady = this.weather.isNight && this.weather.stormIntensity < 0.3;

    if (this._nearbySite) {
      const { category, site } = this._nearbySite;
      const found = state.compendium[category][site.id];
      const icon = category === 'archaeology' ? '🏺' : '🗺️';
      const missingExtra = !found && this._missingExtraReq(site);
      if (!isLearned(category)) {
        hud.showInteractPrompt(true, `🔒 ${PLAYER_SKILLS[category].name}을(를) 배우지 않았습니다`);
      } else if (!found && getSkillLevel(category) < site.minSkillLevel) {
        hud.showInteractPrompt(true, `🔒 ${PLAYER_SKILLS[category].name} Lv.${site.minSkillLevel} 필요 (현재 Lv.${getSkillLevel(category)})`);
      } else if (missingExtra) {
        hud.showInteractPrompt(true, `🔒 ${missingExtra}도 함께 필요`);
      } else {
        const label = found ? site.name : '미확인 지점';
        hud.showInteractPrompt(true, `G: ${icon} ${label} 조사`);
      }
    } else if (this._astroReady) {
      if (!isLearned('astronomy')) {
        hud.showInteractPrompt(true, '🔒 천문학을 배우지 않았습니다');
      } else {
        hud.showInteractPrompt(true, '🔭 G: 별자리 관측');
      }
    } else {
      hud.showInteractPrompt(false);
    }
  }

  // G키 처리 — 근처 사이트가 있으면 조사, 없고 관측 조건이면 별자리 관측, 둘 다 아니면 안내만.
  handleInvestigateKey() {
    if (this.meleeState) return;
    if (this._nearbySite) { this._investigateSite(this._nearbySite); return; }
    if (this._astroReady) { this._observeSky(); return; }
    hud.toast('조사하거나 관측할 대상이 근처에 없습니다.');
  }

  // 두 학문을 병렬로 요구하는 사이트(예: 안티키테라 기계 = 천문학도 필요)의 extra 요구가
  // 충족됐는지 — 의뢰 게시판(isQuestChainReady)만 막고 G키 현장 발견을 안 막으면, 의뢰를
  // 아예 수락하지 않고 좌표로 직접 가서 그 요구를 통째로 우회할 수 있으므로 여기서도 검사한다.
  _missingExtraReq(site) {
    const reqs = getExtraSkillReqs(site.id);
    if (!reqs) return null;
    for (const req of reqs) {
      if (!isLearned(req.skillId) || getSkillLevel(req.skillId) < req.minLevel) {
        return `${PLAYER_SKILLS[req.skillId].name} Lv.${req.minLevel}`;
      }
    }
    return null;
  }

  _investigateSite({ category, site }) {
    // 학문 3종도 처음부터 갖고 있지 않다 — 도시의 학자에게 배우기 전엔 조사 자체가 불가능하다
    // (레벨 검사보다 먼저 걸어야 한다. 안 그러면 기본 레벨1로도 minSkillLevel1 사이트는
    // 발견돼버린다).
    if (!isLearned(category)) {
      hud.toast(`🔒 ${PLAYER_SKILLS[category].name}을(를) 배우지 않았습니다. 도시의 학자를 찾아 사사하세요.`);
      return;
    }
    if ((this._investigateCooldowns[site.id] || 0) > 0) {
      hud.toast('방금 조사했습니다. 잠시 후 다시 시도하세요.');
      return;
    }
    const already = !!state.compendium[category][site.id];
    // 아직 발견 못 한 곳은 minSkillLevel 미만이면 조사 자체가 막힌다 — 의뢰 게시판(수락) 쪽
    // 게이팅만 있고 현장 조사에는 게이팅이 없으면, 좌표만 알면 레벨과 무관하게 최상급 유적을
    // 곧바로 발견해버려 숙련도 곡선이 의미가 없어진다. 이미 발견한 곳을 다시 조사하는 것은
    // 레벨과 무관하게 항상 허용한다(소량 exp만 주므로 악용 여지가 없다).
    if (!already && getSkillLevel(category) < site.minSkillLevel) {
      hud.toast(`🔒 ${PLAYER_SKILLS[category].name} Lv.${site.minSkillLevel} 이상이어야 조사할 수 있습니다. (현재 Lv.${getSkillLevel(category)})`);
      return;
    }
    const missingExtra = !already && this._missingExtraReq(site);
    if (missingExtra) {
      hud.toast(`🔒 ${missingExtra}도 함께 필요합니다.`);
      return;
    }
    this._investigateCooldowns[site.id] = REINVESTIGATE_COOLDOWN;
    if (already) {
      gainSkillExp(category, 1);
      hud.toast(`${site.name}을(를) 다시 조사했습니다. (${PLAYER_SKILLS[category].name} 숙련도 +1)`);
      return;
    }
    state.compendium = { ...state.compendium, [category]: { ...state.compendium[category], [site.id]: true } };
    const { gold } = rewardFor(site.rarity);
    gainSkillExp(category, rewardForRank(site.minSkillLevel));
    const matches = checkInvestigateComplete(site.id);
    state.gold += gold;
    const icon = category === 'archaeology' ? '🏺' : '🗺️';
    const chainNote = matches.length ? ` + 연계 의뢰 완료(+${matches.reduce((a, q) => a + q.reward, 0).toLocaleString('ko-KR')})` : '';
    hud.toast(`${icon} 새로운 발견: '${site.name}'! 도감에 등록되었습니다. (+${gold.toLocaleString('ko-KR')} 두캇${chainNote})`);
    notify({ compendiumChanged: true });
    checkCompendiumRewards(category);
    addAdventureFame(ADVENTURE_FAME_PER_DISCOVERY);
    checkDiscoveryMilestone();
  }

  _observeSky() {
    if (!isLearned('astronomy')) {
      hud.toast('🔒 천문학을 배우지 않았습니다. 도시의 학자를 찾아 사사하세요.');
      return;
    }
    if (this._astroCooldown > 0) {
      hud.toast('방금 관측했습니다. 잠시 후 다시 시도하세요.');
      return;
    }
    this._astroCooldown = REINVESTIGATE_COOLDOWN;
    const found = state.compendium.astronomy;
    const level = getSkillLevel('astronomy');
    // 미발견 중에서도 현재 레벨로 관측 가능한(minSkillLevel 이하) 것만 후보로 삼는다 —
    // 안 그러면 레벨1에서도 최상급 별자리(플레이아데스 등)를 곧바로 관측해버려 숙련도
    // 곡선이 무의미해진다. 후보가 없으면(전부 발견했거나, 레벨이 못 미침) 재관측으로 취급.
    const next = ASTRONOMY_ENTRIES.find((s) => !found[s.id] && level >= s.minSkillLevel && !this._missingExtraReq(s));
    if (!next) {
      gainSkillExp('astronomy', 1);
      hud.toast('🔭 밤하늘을 다시 관측했습니다. (천문학 숙련도 +1)');
      return;
    }
    state.compendium = { ...state.compendium, astronomy: { ...found, [next.id]: true } };
    const { gold } = rewardFor(next.rarity);
    gainSkillExp('astronomy', rewardForRank(next.minSkillLevel));
    const matches = checkInvestigateComplete(next.id);
    state.gold += gold;
    const chainNote = matches.length ? ` + 연계 의뢰 완료(+${matches.reduce((a, q) => a + q.reward, 0).toLocaleString('ko-KR')})` : '';
    hud.toast(`🔭 새로운 별자리 관측: '${next.name}'! 도감에 등록되었습니다. (+${gold.toLocaleString('ko-KR')} 두캇${chainNote})`);
    notify({ compendiumChanged: true });
    checkCompendiumRewards('astronomy');
    addAdventureFame(ADVENTURE_FAME_PER_DISCOVERY);
    checkDiscoveryMilestone();
  }

  // 퀵슬롯 시전(숫자키 1~9) — 실제 엔진(쿨다운/지속시간/exp)은 systems/skills.js에 공용화돼
  // 있다(교역 스킬은 도시에서도 효과가 나야 하므로). 백병전 중엔 포격과 마찬가지로 스킬을 쓸
  // 수 없다는 바다 전투만의 제약을 canCast로 넘긴다.
  castQuickslot(slotIdx) {
    castSkill(slotIdx, {
      canCast: () => {
        if (this.meleeState) { hud.toast('백병전 중에는 스킬을 쓸 수 없습니다.'); return false; }
        return true;
      },
    });
  }

  // 활성 버프 중 key와 일치하는 효과를 곱/가산으로 모아 적용한다 — mulSkillEffect/sumSkillEffect
  // (배 자체의 고정 스킬)와 같은 계산식에 나란히 곱하거나 더해 쓴다.
  _buffMul(key, base) {
    return buffMul(key, base);
  }

  _buffAdd(key, base) {
    return buffAdd(key, base);
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
        // 항구 반경 안은 항상 열린 바다로 친다 — 그래야 도킹 지점 탐색이 실제 해안선의
        // 좁은 하구 모양에 휘둘리지 않고 도시 바로 앞의 넉넉한 만에서 곧장 자리를 찾는다.
        if (!this._isInHarborClearance(px, pz) && pointOnAnyLand(px, pz)) return false;
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
    // 아직 해금되지 않은 원양 항로는 항구 반경 예외보다도 우선한다 — 잠긴 항로 안의 항구를
    // 근해 우회로 슬쩍 정박하는 일이 없도록, 육지처럼 아예 못 들어가는 벽으로 막는다.
    if (!isRouteUnlocked(getSeaLockBucket(x, z))) return true;
    // 항구 반경(HARBOR_CLEAR_RADIUS) 안은 실제 해안선 모양과 무관하게 항상 바다로 취급한다
    // (테주강 하구의 리스본처럼, 실제 해안선을 그대로 쓰면 진입로가 배 한 척 폭으로 좁아지는
    // 항구가 있다 — 대신 도시 정중앙(moundColliders)만은 여전히 배가 못 들어가게 막는다).
    if (this._isInHarborClearance(x, z)) {
      for (const m of this.moundColliders) {
        const dx = x - m.x, dz = z - m.z;
        if (dx * dx + dz * dz < m.r * m.r) return true;
      }
      return false;
    }
    if (pointOnAnyLand(x, z)) return true;
    for (const m of this.moundColliders) {
      const dx = x - m.x, dz = z - m.z;
      if (dx * dx + dz * dz < m.r * m.r) return true;
    }
    return false;
  }

  // 진행 방향으로 조금 앞을 미리 살펴, 아직 안 열린 원양 항로 경계에 다가가고 있으면
  // (실제로 막히기 전에 미리) 왜 못 지나가는지 안내 토스트를 띄운다 — 그냥 육지처럼 조용히
  // 막히기만 하면 "잠긴 항로"라는 걸 알아채기 어렵다.
  _checkRouteLockWarning(delta) {
    this._routeWarnCooldown = Math.max(0, this._routeWarnCooldown - delta);
    if (this._routeWarnCooldown > 0) return;
    const LOOKAHEAD = 25;
    const ax = this.ship.pos.x + Math.sin(this.ship.heading) * LOOKAHEAD;
    const az = this.ship.pos.y + Math.cos(this.ship.heading) * LOOKAHEAD;
    const bucket = getSeaLockBucket(ax, az);
    if (!bucket || isRouteUnlocked(bucket)) return;
    if (isRouteUnlocked(getSeaLockBucket(this.ship.pos.x, this.ship.pos.y))) {
      // 지금 서 있는 곳은 열린 해역인데 진행 방향 바로 앞이 잠긴 항로일 때만 경고한다
      // (이미 잠긴 항로 한복판이면 _isBlocked가 애초에 못 들어오게 막았을 것이므로 해당 없음).
      const info = getRouteUnlockInfo(bucket);
      const rankLabel = info ? RANKS[info.unlock.rankIndex]?.label : null;
      hud.toast(`🔒 이 항로는 아직 열리지 않았습니다.${rankLabel ? ` (필요 랭크: ${rankLabel} 이상)` : ''}`, 2600);
      this._routeWarnCooldown = 4;
    }
  }

  // 자신이 받는 피해에 곱하는 총 배율 — 장갑판 부품(armor 스탯)과 전투 스킬(철갑 방어 등)의
  // incomingDamageMul은 서로 다른 감산원이라 곱연산으로 함께 적용한다.
  _incomingDamageMul() {
    return this._buffMul('incomingDamageMul', mulSkillEffect(this.ship.shipDef, 'incomingDamageMul', 1) * armorDamageMul(this.ship.shipDef.armor));
  }

  _isInHarborClearance(x, z) {
    for (const c of CITIES) {
      const dx = x - c.pos[0], dz = z - c.pos[1];
      if (dx * dx + dz * dz < HARBOR_CLEAR_RADIUS * HARBOR_CLEAR_RADIUS) return true;
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
      if (npc.dead || !npc.isHostile() || !npc.isActive()) continue;
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
      if (npc.dead || !npc.isHostile() || !npc.isActive()) continue;
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
      // 충각 강화(상대에게 더 큰 피해)와 철갑 방어(내가 받는 피해 감소)는 서로 다른 쪽에
      // 적용되는 별개의 배율이라, 같은 충돌이라도 자신이 받는 피해와 상대가 받는 피해를
      // 따로 계산한다.
      const selfDmg = Math.round(dmg * this._incomingDamageMul());
      const npcDmg = Math.round(dmg * mulSkillEffect(this.ship.shipDef, 'ramDamageMul', 1));
      state.shipHp = Math.max(0, state.shipHp - selfDmg);
      loseMoraleFromCombat();
      npc.takeDamage(npcDmg);
      audio.playHit();
      this.addShake(0.6);
      hud.flashShipHit();
      this._spawnImpactEffect((this.ship.pos.x + npc.pos.x) / 2, (this.ship.pos.y + npc.pos.y) / 2);
      hud.toast(`충돌! 선체가 ${selfDmg} 손상되고, 상대는 ${npcDmg} 손상되었습니다.`);
      if (npc.dead) {
        this._victoryToast(`${npc.def.name}을(를) 격침했습니다!`, npc);
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

    // 갤리형(노잡이 다수)은 정원 그대로가 아니라 실제 싸울 수 있는 전투원 수만 반영한다
    // (combatPower.js getCombatants — 표시되는 전투력 스탯과 실전 결과를 일치시킨다).
    const playerCrew = getCombatants(this.ship.shipDef, state.crewCount ?? this.ship.shipDef.crew ?? 20);
    const npcCrew = getCombatants(npc.shipDef, npc.shipDef.crew || 20);
    const clickBonus = 1 + Math.min(MELEE_CLICK_CAP, clicks || 0) * MELEE_CLICK_POWER;
    // 상대가 이미 포격으로 많이 상해 있었다면(내구도 비율 낮음) 백병전에서도 약하게 싸운다 —
    // 승선 전에 함포로 충분히 두들겨 놓는 게 실제로 이득이 되도록 한다.
    const npcHpRatio = npc.maxHp > 0 ? npc.hp / npc.maxHp : 1;
    const playerPower = playerCrew * (0.75 + Math.random() * 0.5) * getMoralePowerMul() * clickBonus
      * this._buffMul('meleePowerMul', mulSkillEffect(this.ship.shipDef, 'meleePowerMul', 1));
    const npcPower = npcCrew * (0.75 + Math.random() * 0.5) * (0.5 + 0.5 * npcHpRatio);
    this.collisionTimers.set(npc.owner, COLLISION_COOLDOWN);

    if (playerPower >= npcPower) {
      audio.playWinStinger();
      // 나포는 없다 — 백병전에서 이기면 항상 격침이다(배를 얻으려면 조선소에서 구매/건조).
      this._confirmSink(npc);
    } else {
      audio.playLoseStinger();
      hud.flashCombatText('패배!', 'lose');
      const dmg = Math.round((50 + Math.random() * 70) * this._incomingDamageMul());
      state.shipHp = Math.max(0, state.shipHp - dmg);
      loseMoraleFromCombat();
      hud.toast(`백병전에서 밀렸습니다! 선체 내구도 ${dmg} 손실.`);
    }
  }

  // 전투 승리(격침/나포/충돌격침/포격격침 어디서든) 메시지들을 한 토스트로 합쳐 띄운다 —
  // hud.toast()는 큐 없이 즉시 덮어써서 따로따로 부르면 마지막 것만 남으므로, 골드·노획물·
  // 구조 인원·의뢰 완료 문구가 묻히지 않게 항상 한 번에 합쳐서 보여준다. 나포는 없다 —
  // 백병전이든 포격이든 충돌이든, 격침은 전부 이 함수 하나로 귀결된다.
  // npc(NpcShip 인스턴스 그대로)를 받는다 — 골드는 실효 체력 기반으로 티어와 무관하게 하나의
  // 공식을 쓰고(entities/pirate.js getKillGold), 그 위에 지역 교역품·자재/포탄·건조 재료가
  // 티어별 확률로 얹힌다(rollCombatLoot). 현상금 의뢰가 그 npc를 노리고 있었다면 별도로 더 붙는다.
  _victoryToast(baseMsg, npc) {
    hud.flashCombatText('승리!', 'win');
    addCombatFame(COMBAT_FAME_BY_TIER[npc.tier] || COMBAT_FAME_BY_TIER.grunt);
    const rescued = rescueCrewFromVictory();
    const bounties = checkBountyKill(npc.owner);
    const moraleAdd = sumSkillEffect(this.ship.shipDef, 'victoryMoraleAdd', 0);
    if (moraleAdd > 0) state.crewMorale = Math.min(100, (state.crewMorale ?? 100) + moraleAdd);

    const gold = getKillGold(npc);
    state.gold += gold;
    const bits = [baseMsg, `+${gold.toLocaleString('ko-KR')} 두캇`];

    const loot = rollCombatLoot(npc);
    if (loot.cargoGoodId && loot.cargoQty > 0) {
      const space = Math.max(0, getCargoCapacity() - getCargoUsed());
      const boostedQty = Math.round(loot.cargoQty * this._buffMul('lootQtyMul', mulSkillEffect(this.ship.shipDef, 'lootQtyMul', 1)));
      const qty = Math.min(boostedQty, space);
      if (qty > 0) {
        const good = getGood(loot.cargoGoodId);
        const item = state.inventory.find((it) => it.id === loot.cargoGoodId);
        if (item) item.qty += qty; else state.inventory.push({ id: loot.cargoGoodId, name: good.name, qty });
        bits.push(`${good.name} ${qty}t 노획`);
        notify({ inventoryChanged: true });
      }
    }
    // 자재·포탄은 식량/식수와 같은 화물칸을 나눠 쓰는 자원이라(오크/철갑판과 달리), 노획도
    // 구매와 똑같이 남은 공간만큼만 실어야 한다 — 안 그러면 전투로만 화물칸 정원을 넘길 수 있었다.
    if (loot.materials > 0) {
      const space = Math.max(0, getCargoCapacity() - getCargoUsed());
      const qty = Math.min(loot.materials, space);
      if (qty > 0) { state.materials += qty; bits.push(`자재 +${qty}`); }
    }
    if (loot.cannonballs > 0) {
      const space = Math.max(0, getCargoCapacity() - getCargoUsed());
      const qty = Math.min(loot.cannonballs, space);
      if (qty > 0) { state.cannonballs += qty; bits.push(`포탄 +${qty}`); }
    }
    if (loot.oakTimber > 0) { state.oakTimber += loot.oakTimber; bits.push(`상급 조선용 참나무 +${loot.oakTimber}`); }
    if (loot.ironcladPlating > 0) { state.ironcladPlating += loot.ironcladPlating; bits.push(`전설 해적기함의 철갑판 +${loot.ironcladPlating}`); }
    if (loot.robertsRelic > 0) { state.robertsRelic += loot.robertsRelic; bits.push(`🏴‍☠️ 로열 포춘호의 파편 +${loot.robertsRelic}!`); }

    if (rescued > 0) bits.push(`표류하던 선원 ${rescued}명을 구조해 편입했습니다.`);
    for (const bounty of bounties) bits.push(`의뢰 완료: ${bounty.title} (+${bounty.reward.toLocaleString('ko-KR')} 두캇)`);

    // 상단(무역 호송대)을 약탈하면 골드·교역품과 별개로 악명이 쌓이고, 그 자리 근처에서
    // 해군 추격대가 곧바로 출동한다 — "전투"가 아니라 "약탈"이라는 성격을 이렇게 구분한다.
    if (npc.def.type === 'convoy') {
      const infamyGain = INFAMY_PER_CONVOY_KILL[npc.region] || INFAMY_PER_CONVOY_KILL[1];
      addInfamy(infamyGain);
      this._spawnNavyResponder(npc.pos, npc.region);
      bits.push(`😈 악명 +${infamyGain} — 인근 해군이 출동했습니다!`);
    }

    // 엘리트/보스를 처음 잡아보는 순간 딱 한 번만 리스폰·강화 시스템을 설명해준다.
    if ((npc.tier === 'elite' || npc.tier === 'boss' || npc.tier === 'legendary') && !state.seenRespawnIntro) {
      state.seenRespawnIntro = true;
      bits.push('📖 [엘리트/보스는 격침해도 며칠 뒤 이전보다 25% 강해진 채로 돌아옵니다(무한 누적). 강화는 매일 자정(이 기기의 현지 시각)에 초기화됩니다.]');
    }

    hud.toast(bits.join(' '));
  }

  _confirmSink(npc) {
    npc.takeDamage(npc.maxHp);
    this._victoryToast(`백병전 승리! ${npc.def.name}을(를) 격침했습니다.`, npc);
  }

  // 상단(convoy) 격침 직후 호출 — 플레이어 근처에 그 해역 소속 해군을 즉시 스폰해 곧바로
  // 추격을 시작하게 한다. 이 인스턴스는 스폰 목록(SEA_NPC_SHIPS)에 없는 런타임 전용 NPC라
  // 리스폰·강화 시스템(entities/pirate.js)과는 무관하며, 플레이어가 killPos(격침 지점)에서
  // NAVY_PURSUIT_RADIUS보다 멀어지면 조용히 물러난다(NpcShip.update의 pursuitCenter 검사).
  _spawnNavyResponder(killPos, region) {
    const ship = NAVY_RESPONDER_SHIP_BY_REGION[region] || NAVY_RESPONDER_SHIP_BY_REGION[1];
    const angle = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 60;
    const spawnPos = [this.ship.pos.x + Math.cos(angle) * dist, this.ship.pos.y + Math.sin(angle) * dist];
    const def = {
      id: `navy_response_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
      type: 'navy', name: ship.name, pos: spawnPos, shipId: ship.shipId,
      hp: getShip(ship.shipId)?.hp || 500, hostile: true, patrolRadius: 40, country: ship.country, region,
    };
    const responder = new NpcShip(def);
    responder.pursuitCenter = new Vec2(killPos.x, killPos.y);
    responder.pursuitRadius = NAVY_PURSUIT_RADIUS;
    responder.engage();
    this.npcShips.push(responder);
  }

  _updateWake(delta) {
    const size = worldSizeFor(this.ship.shipDef);
    const hl = size.length / 2;
    const speedRatio = this.meleeState ? 0 : Math.min(1, Math.abs(this.ship.curSpeed) / this.ship.maxSpeedMs);
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
    // 로마 데케레스처럼 대포가 아예 없는(cannons=0) 배는 애초에 포격 자체가 불가능하다 —
    // 예전엔 발사수 하한(2)에 걸려 대포 없는 배도 2발이 나가는 모순이 있었다(실측으로 확인).
    if (this.ship.shipDef.cannons <= 0) { hud.toast('이 배는 대포가 없습니다 — 충돌이나 백병전으로 싸우세요.'); return; }
    if (state.cannonballs <= 0) { hud.toast('포탄이 없습니다! 항구 관리인에게 보급받으세요.'); return; }
    const target = this._nearestHostile();
    // 정밀 포격 스킬은 이 사거리 판정 자체를 늘려준다 — 더 멀리서부터 교전을 걸 수 있다.
    // 안개(weather.fogVisMul)는 반대로 사거리를 줄인다 — 목표를 눈으로 봐야 겨냥할 수 있다.
    const range = 60 * this._buffMul('rangeMul', mulSkillEffect(this.ship.shipDef, 'rangeMul', 1)) * this.weather.fogVisMul;
    if (!target || target.pos.distanceTo(this.ship.pos) > range) {
      hud.toast('사거리 내에 목표가 없습니다.');
      return;
    }
    this.fireTimer = FIRE_COOLDOWN * this._buffMul('fireCooldownMul', mulSkillEffect(this.ship.shipDef, 'fireCooldownMul', 1));
    state.cannonballs -= 1; // 일제 사격(현측 포열 전체) 1회 = 포탄 1개 소모(게임적 추상화)
    audio.playCannon();
    const toTarget = { x: target.pos.x - this.ship.pos.x, y: target.pos.y - this.ship.pos.y };
    const len = Math.hypot(toTarget.x, toTarget.y) || 1;
    const dir = { x: toTarget.x / len, y: toTarget.y / len };
    // 상한을 9->36으로 올려(140문급 최상급 함선까지 대포 수가 그대로 발사 수에 반영되게)
    // 화력 투자가 낭비되지 않게 했다(실측: 예전엔 38문 이상인 7척이 전부 9발로 동일했음).
    // 다연장 포열 스킬의 +3은 이 상한 위에 얹힌다(상한도 함께 40으로 살짝 올려 낭비 방지).
    const shotCount = clamp(Math.round(this.ship.shipDef.cannons / 4) + sumSkillEffect(this.ship.shipDef, 'shotCountAdd', 0), 2, 40);
    // 다만 산탄 퍼짐 각도까지 발사수에 비례해 키우면(예전 방식) 36발일 때 부채꼴이 180도 가까이
    // 벌어져 옆·뒤로도 쏘는 꼴이 된다 — 총 퍼짐각에 상한(약 40도)을 둬서, 발사수가 많을수록
    // 그 안에 더 촘촘히 들어차도록만 한다.
    const spread = 0.09;
    const totalSpread = Math.min(0.7, spread * (shotCount - 1));
    for (let i = 0; i < shotCount; i++) {
      const tt = shotCount === 1 ? 0 : i / (shotCount - 1) - 0.5;
      const a = tt * totalSpread;
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
    // 절약 항해 스킬은 일일 소모량 자체를 줄여준다(소모가 아예 없던 걸로 치지 않고, 매일
    // 실제로 덜 쓰는 것이라 장기 항해일수록 누적 이득이 커진다).
    const consumeMul = mulSkillEffect(this.ship.shipDef, 'supplyConsumeMul', 1);
    for (let i = 0; i < daysPassed; i++) {
      state.food = Math.max(0, state.food - FOOD_PER_DAY * consumeMul);
      state.water = Math.max(0, state.water - WATER_PER_DAY * consumeMul);
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

  // 골드를 주는 발견 이벤트 대신, 날씨 자체가 위험과 보상을 함께 주는 "이벤트"다 — 폭풍
  // 중 순풍을 타고 달리면(entities/shipController.js의 바람 시스템이 이미 자연스럽게
  // 최대 +25%까지 속도를 올려준다) 그만큼 선체에도 무리가 간다. 반대로 역풍으로 폭풍을
  // 정면으로 거스르면 속도 이득은 전혀 없이(바람 시스템이 이미 감속시킨다) 파도에 뱃머리가
  // 부딪히는 손상만 더 크게 받는다 — 폭풍 중엔 "어느 방향이든 가만히 있을 수 없는" 위험이다.
  // 무풍(순풍/역풍 모두 아님)이거나 저속 항해, 폭풍이 아닐 때는 전혀 영향이 없다.
  _processStormSailing(delta) {
    if (this.weather.stormIntensity <= 0.5) { this._stormSailWarned = false; return; }
    const speedRatio = Math.min(1, Math.abs(this.ship.curSpeed) / (this.ship.maxSpeedMs || 1));
    const align = this.ship.windAlign || 0;
    if (speedRatio < 0.3) return;
    let dmgPct = 0;
    let warnMsg = null;
    if (align >= 0.5) {
      const alignExcess = clamp((align - 0.5) / 0.5, 0, 1);
      dmgPct = STORM_TAILWIND_DMG_PCT_PER_SEC * this.weather.stormIntensity * speedRatio * alignExcess;
      warnMsg = '⛈ 폭풍 속 순풍을 타고 있습니다 — 속도가 오르지만 선체가 서서히 상합니다!';
    } else if (align <= -0.5) {
      const alignExcess = clamp((-align - 0.5) / 0.5, 0, 1);
      dmgPct = STORM_HEADWIND_DMG_PCT_PER_SEC * this.weather.stormIntensity * speedRatio * alignExcess;
      warnMsg = '⛈ 폭풍을 정면으로 거스르고 있습니다 — 속도 이득 없이 선체만 상합니다. 뱃머리를 돌리세요!';
    } else {
      this._stormSailWarned = false;
      return;
    }
    state.shipHp = Math.max(0, state.shipHp - this.ship.shipDef.hp * dmgPct * delta);
    if (!this._stormSailWarned) {
      this._stormSailWarned = true;
      hud.toast(warnMsg);
    }
  }

  // 폭풍이 심할 때(stormIntensity>0.7)만 판정하는 희귀 사고 — 진행 방향/속도와 무관하게
  // 순전히 운으로 배에 벼락이 떨어져 목돈 피해를 준다. 위 순풍/역풍 피해와 달리 항해
  // 선택으로 피할 수 없는 "폭풍 자체의 위험"을 표현한다.
  _processLightning(delta) {
    if (this.weather.stormIntensity <= 0.7) { this._lightningTimer = LIGHTNING_CHECK_INTERVAL; return; }
    this._lightningTimer -= delta;
    if (this._lightningTimer > 0) return;
    this._lightningTimer = LIGHTNING_CHECK_INTERVAL;
    if (Math.random() >= LIGHTNING_CHANCE) return;
    const pct = LIGHTNING_DMG_PCT_MIN + Math.random() * (LIGHTNING_DMG_PCT_MAX - LIGHTNING_DMG_PCT_MIN);
    const dmg = Math.round(this.ship.shipDef.hp * pct);
    state.shipHp = Math.max(0, state.shipHp - dmg);
    this.addShake(0.5);
    audio.playHit();
    hud.flashShipHit();
    this._spawnImpactEffect(this.ship.pos.x, this.ship.pos.y);
    this._triggerLightningVisual();
    hud.toast(`⚡ 벼락이 배에 떨어졌습니다! 선체가 ${dmg} 손상되었습니다.`);
  }

  // 벼락 사고를 그동안 토스트 문구로만 알렸는데, 정작 화면에는 아무 시각 효과가 없어
  // 존재감이 없었다 — 백색 전체화면 플래시 + 하늘에서 배로 떨어지는 지그재그 번개 줄기를
  // 짧게(0.35초) 그려 실제로 "벼락이 쳤다"는 걸 눈으로 확인할 수 있게 한다.
  _triggerLightningVisual() {
    this._lightningFlash = 1;
    const shipScreen = this.iso.toScreen(this.camera, this.ship.pos.x, this.ship.pos.y, this.logicalW, this.logicalH);
    const segs = 6;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      pts.push({
        x: shipScreen.x + (Math.random() * 50 - 25) * (1 - t * 0.7),
        y: -40 + (shipScreen.y - 46 + 40) * t,
      });
    }
    this._lightningBolt = { pts, ttl: 0.35 };
  }

  _drawLightningBolt(ctx) {
    const { pts } = this._lightningBolt;
    ctx.save();
    ctx.strokeStyle = 'rgba(200,225,255,0.55)';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // 폭풍(위험+보상)·안개(트레이드오프)의 반대편 — 진짜로 잔잔한 날(weather.isFairWeather)에는
  // 위험 부담 없이 선체와 사기가 아주 천천히 회복된다. 토스트로 알리진 않는다(매초 반복될
  // 만큼 흔한 상태라 스팸이 된다) — HUD의 날씨 표시(☀ 맑음)만으로 충분하다.
  _processFairWeather(delta) {
    if (!this.weather.isFairWeather) return;
    const maxHp = this.ship.shipDef.hp;
    if (state.shipHp > 0 && state.shipHp < maxHp) {
      state.shipHp = Math.min(maxHp, state.shipHp + maxHp * FAIR_WEATHER_HP_REGEN_PCT_PER_SEC * delta);
    }
    const morale = state.crewMorale ?? 100;
    if (morale < 100) state.crewMorale = Math.min(100, morale + FAIR_WEATHER_MORALE_REGEN_PER_SEC * delta);
  }

  update(delta, elapsed) {
    this.t = elapsed;
    this.weather.update(delta);
    state.dayTimer = this.weather.dayTimer;
    this._processSupplies();
    this.wind.stormActive = this.weather.stormActive;
    this.wind.update(delta);

    // 응급 수리반 스킬 — 전투 중일 때만, 완전 침몰(0)까지 떨어진 상태가 아니면 초당 소량
    // 자동 회복한다(최대 내구도를 넘지는 않는다).
    if (state.inCombat && state.shipHp > 0) {
      const regen = this._buffAdd('combatHpRegenPerSec', sumSkillEffect(this.ship.shipDef, 'combatHpRegenPerSec', 0));
      if (regen > 0) state.shipHp = Math.min(this.ship.shipDef.hp, state.shipHp + regen * delta);
    }

    // 전투/교역 액티브 버프의 쿨다운/지속시간은 이제 systems/skills.js가 공용으로 관리한다
    // (main.js의 공용 프레임 루프가 tickSkillBuffs를 호출 — 바다·도시 어디서든 흐른다).
    for (const id of Object.keys(this._investigateCooldowns)) {
      const next = this._investigateCooldowns[id] - delta;
      if (next <= 0) delete this._investigateCooldowns[id]; else this._investigateCooldowns[id] = next;
    }
    if (this._astroCooldown > 0) this._astroCooldown = Math.max(0, this._astroCooldown - delta);

    if (this.meleeState) {
      if (consumeJustPressed('Space')) this._meleeMash();
      this.meleeState.timer -= delta;
      if (this.meleeState.timer <= 0) this._resolveMelee();
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
      if (!this._boardable) this._updateInvestigatePrompt();
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
      // 장착한 모험 칭호의 이동속도 버프 — 전투·평시 구분 없이 항상 적용된다.
      this.ship.titleSpeedMul = this._buffMul('titleSpeedMul', 1);
      // 전투 중에만 발동하는 스킬(신속 기동/돌격 항해술)과, 폭풍 중에만 발동하는 스킬
      // (침수 대비/폭풍 항해술)은 상태가 매 순간 바뀌므로 매 프레임 다시 계산해준다.
      this.ship.combatSpeedMul = state.inCombat ? mulSkillEffect(this.ship.shipDef, 'combatSpeedMul', 1) : 1;
      this.ship.combatTurnMul = state.inCombat
        ? this._buffMul('combatTurnMul', mulSkillEffect(this.ship.shipDef, 'combatTurnMul', 1))
        : this._buffMul('combatTurnMul', 1);
      this.ship.windSensitivity = this.weather.stormActive
        ? this.ship.baseWindSensitivity * mulSkillEffect(this.ship.shipDef, 'stormWindResistMul', 1)
        : this.ship.baseWindSensitivity;
      this.ship.update(delta, elapsed, (x, z) => this._isBlocked(x, z), this.wind);
      this._checkRouteLockWarning(delta);
      checkDiscoveryEvents(delta);
      this._processStormSailing(delta);
      this._processLightning(delta);
      this._processFairWeather(delta);
      checkExplorationSite(this.ship.pos);
    }
    this._updateWake(delta);
    this._updateImpactSparks(delta);
    const escortTarget = state.inCombat ? this._nearestHostile() : null;
    for (const escort of this.escorts) {
      escort.update(delta, this.ship);
      const dir = escort.tryFire(delta, escortTarget);
      if (dir) {
        audio.playCannon();
        this.cannonPool.fire(escort.pos, dir, 46, 'player', ESCORT_SHOT_DMG);
      }
    }
    this.rain.update(delta, this.weather.stormIntensity);
    hud.setWeather(`${this.weather.label} · 항해 ${this.weather.voyageDay}일차`, this.weather.stormIntensity > 0.1);
    audio.updateOcean(this.weather.stormIntensity);

    const hostileNear = this.npcShips.some((n) => !n.dead && n.isHostile() && n.state === 'attack');
    if (hostileNear !== state.inCombat) {
      state.inCombat = hostileNear;
      hud.showCombatBanner(hostileNear);
      // 강습으로 이미 전용 토스트/플래시를 띄운 경우엔 이 일반 문구가 한 프레임 뒤에 그걸
      // 덮어쓰지 않도록 한 번 건너뛴다(hud.toast()는 큐가 없어 마지막 호출만 화면에 남는다).
      if (hostileNear && !this._skipNextCombatToast) {
        hud.toast('전투 시작! 좌클릭/스페이스바로 포격하세요.');
        hud.flashCombatText('전투 개시!!');
      }
      this._skipNextCombatToast = false;
    }

    if (!this.meleeState) {
      for (const npc of this.npcShips) npc.update(delta, elapsed, this.ship.pos, this.cannonPool, this.weather.fogVisMul);
      checkDailyEscalationReset(this.npcShips);
      checkPirateRespawns(this.npcShips);
      checkLegendaryUnlockAnnouncements(this.npcShips);
      checkQuestRespawns();
      this._resolveShipCollisions(delta);
      // 해적의 확률적 강습(ambush) — 플레이어의 선택 없이 즉시 교전이 시작된 경우, 여기서
      // 한 번만 소비해 알림을 띄운다. 마침 그 배가 선택돼 메뉴가 떠 있었다면 메뉴를 닫는다
      // (더 이상 "고를 수 있는" 상황이 아니므로).
      for (const npc of this.npcShips) {
        if (!npc.ambushTriggered) continue;
        npc.ambushTriggered = false;
        hud.toast(`⚠ ${npc.def.name}이(가) 강습해왔습니다! 전투 돌입!`);
        hud.flashCombatText('강습!!', 'danger');
        this._skipNextCombatToast = true;
        if (this.selectedTarget === npc) { this.selectedTarget = null; hud.hideInteractionMenu(); }
      }
    }

    // 클릭으로 지정해둔 상호작용 타겟 — 매 프레임 범위/생존 여부를 갱신해 메뉴 버튼의
    // 활성/비활성을 최신 상태로 유지한다.
    if (this.selectedTarget) {
      const npc = this.selectedTarget;
      if (npc.dead) {
        this.selectedTarget = null;
        hud.hideInteractionMenu();
      } else {
        const dist = npc.pos.distanceTo(this.ship.pos);
        const inRange = dist < npc.interactionRange;
        const npcPower = getNpcCombatPower(npc).score;
        const myPower = getCombatPower(getShip(state.currentShipId), state.shipParts).score;
        // 엘리트/보스는 리스폰마다 강해지는 시스템이 있다는 걸 타겟팅할 때마다 알 수 있게
        // 현재 강화 단계를 항상 같이 보여준다(0단계면 표시하지 않는다 — 아직 안 강해진 상태).
        const escNote = npc.escalationLevel > 0 ? ` · 강화 Lv.${npc.escalationLevel}(+${npc.escalationLevel * 25}%)` : '';
        hud.updateInteractionMenu({
          inRange,
          hpRatio: npc.maxHp > 0 ? npc.hp / npc.maxHp : 1,
          combatText: `내 전투력 ${myPower} · 상대 전투력 ${npcPower}${escNote}`,
        });
      }
    }

    this.fireTimer = Math.max(0, this.fireTimer - delta);
    if (state.inCombat && isDown('Space') && this.fireTimer <= 0 && !this.meleeState) this.fireCannon();

    const targets = [
      { owner: 'player', position: this.ship.pos, radius: worldSizeFor(this.ship.shipDef).length * 0.55, ref: 'player' },
      ...this.npcShips.filter((n) => !n.dead && n.isActive()).map((n) => ({ owner: n.owner, position: n.pos, radius: n.radius, ref: n })),
      // 함대(예비 선박)도 owner를 'player'로 둔다 — 플레이어/함대 자신의 포탄과는 owner가
      // 같아 서로 맞지 않고(아군 오사 방지), 적 npc의 포탄(owner가 그 npc의 id)만 맞는다.
      ...this.escorts.filter((e) => !e.dead).map((e) => ({ owner: 'player', position: e.pos, radius: worldSizeFor(e.shipDef).length * 0.5, ref: e, isEscort: true })),
    ];
    this.cannonPool.update(delta, targets, (target, ball) => {
      audio.playHit();
      this._spawnImpactEffect(ball.x, ball.y);
      if (target.ref === 'player') {
        // 쏜 NPC의 shotDmg(배 종류별 위력)를 그대로 쓰고, 못 찾으면(이론상 없음) 18로 폴백한다.
        const hitDmg = Math.round((ball.dmg ?? 18) * this._incomingDamageMul());
        state.shipHp = Math.max(0, state.shipHp - hitDmg);
        loseMoraleFromCombat();
        this.addShake(0.45);
        hud.flashShipHit();
      } else if (target.isEscort) {
        this.addShake(0.12);
        target.ref.takeDamage(ball.dmg ?? 18);
        this._syncEscortHp(target.ref);
        if (target.ref.dead) this._loseFleetShip(target.ref);
      } else {
        this.addShake(0.18);
        // 아직 교전 중이 아니던 배(순찰 중 저격당한 해적, 혹은 플레이어가 먼저 도발한
        // 평화로운 상대)라도 포격을 맞으면 곧바로 맞대응(engage)한다 — 쏘기만 하고
        // 아무 반응이 없는 어색함을 막는다.
        target.ref.engage();
        target.ref.takeDamage(ball.dmg ?? 22);
        if (target.ref.dead) {
          this._victoryToast(`${target.ref.def.name}을(를) 격침했습니다!`, target.ref);
        }
      }
    });

    // 난파 조건: 선체 내구도 0 또는 선원 0 — 둘 중 하나만 충족돼도 즉시 난파한다(선체는
    // 멀쩡해도 배를 몰 사람이 아무도 없으면 항해 불능인 건 마찬가지). 최소 정원(50%) 밑으로만
    // 떨어진 상태는 속도 페널티로 끝나고, "선원이 완전히 0"이 됐을 때만 난파로 이어진다.
    if (state.shipHp <= 0 || state.crewCount === 0) {
      // 전투 중에 난파했다면(굶주림 등 다른 원인이 아니라) 이 조우전은 패배로 끝난 것이다.
      if (state.inCombat) hud.flashCombatText('패배!', 'lose');
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
    if (this._lightningFlash > 0) this._lightningFlash = Math.max(0, this._lightningFlash - delta * 2.2);
    if (this._lightningBolt) {
      this._lightningBolt.ttl -= delta;
      if (this._lightningBolt.ttl <= 0) this._lightningBolt = null;
    }
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
      this.npcShips.filter((n) => !n.dead && n.isActive()).map((n) => ({ x: n.pos.x, z: n.pos.y, hostile: n.isHostile(), kind: n.def.type })),
      this.wind.towardDirection,
      state.explorationSite,
      this._compendiumMinimapSites()
    );
    // 승선(백병전 돌입) 안내가 최우선, 그다음 정박 안내, 그다음 조사/관측 안내(_updateInvestigatePrompt가
    // 이미 이번 프레임에 세팅해둔 것) — 아무것도 해당 없을 때만 여기서 최종적으로 지운다.
    if (!this._boardable) {
      const dockRange = DOCK_RANGE + sumSkillEffect(this.ship.shipDef, 'dockRangeAdd', 0);
      if (nearest.marker && nearest.dist < dockRange) {
        const city = CITIES.find((c) => c.id === nearest.marker.cityId);
        hud.showInteractPrompt(true, `[좌클릭] ${city.name}에 정박하기`);
        this.hoveredCity = city;
      } else {
        this.hoveredCity = null;
        if (!this._nearbySite && !this._astroReady) hud.showInteractPrompt(false);
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
    this._drawHarborClearings(ctx, w, h);
    for (const m of this.cityMarkers) this._drawCityMarker(ctx, w, h, m);
    this._drawWake(ctx, w, h);
    if (this.waypoint) this._drawWaypoint(ctx, w, h);
    if (this.selectedTarget && !this.selectedTarget.dead) this._drawInteractionRange(ctx, w, h, this.selectedTarget);
    if (state.explorationSite) this._drawExplorationSite(ctx, w, h);
    this._drawCompendiumSites(ctx, w, h);

    // 화면 앞뒤 순서(페인터 알고리즘) — (x+z, 즉 스크린 y에 대응하는 값)가 클수록 앞쪽이라
    // 나중에 그려야 뒤 물체를 가리지 않는다.
    const drawables = [
      ...this.npcShips.filter((n) => n.isActive()).map((n) => ({ z: n.pos.x + n.pos.y, draw: () => this._drawShip(ctx, w, h, n.pos, n.heading, n.shipDef, n.dead ? 'wreck' : 'hostile', n.dead ? clamp(1 - n.sinkT / 1.5, 0, 1) : 1, n.tier) })),
      ...this.escorts.map((e) => ({ z: e.pos.x + e.pos.y, draw: () => this._drawShip(ctx, w, h, e.pos, e.heading, e.shipDef, 'friendly', 1) })),
      { z: this.ship.pos.x + this.ship.pos.y, draw: () => this._drawShip(ctx, w, h, this.ship.pos, this.ship.heading, this.ship.shipDef, 'player', 1) },
    ].sort((a, b) => a.z - b.z);
    for (const d of drawables) d.draw();

    for (const n of this.npcShips) {
      if (n.dead || n.hp >= n.maxHp || !n.isActive()) continue;
      this._drawWorldHpBar(ctx, w, h, n.pos, n.maxHp > 0 ? n.hp / n.maxHp : 1, 'hostile');
    }
    for (const e of this.escorts) {
      if (e.dead) continue;
      this._drawWorldHpBar(ctx, w, h, e.pos, e.maxHp > 0 ? e.hp / e.maxHp : 1, 'friendly');
    }
    // 상단(상행 NPC)/해군 라벨 — 손상 여부와 무관하게 항상 표시해 "🚩@@상단" 형식으로
    // 바다 위에서 한눈에 식별할 수 있게 한다.
    for (const n of this.npcShips) {
      if (n.dead || !n.isActive()) continue;
      if (n.def.type === 'convoy') this._drawNpcTag(ctx, w, h, n.pos, '🚩 상단', '#f3d98a');
      else if (n.def.type === 'navy') this._drawNpcTag(ctx, w, h, n.pos, '⚓ 해군', '#5fb8cc');
    }

    this._drawCannonballs(ctx, w, h);
    this._drawImpactSparks(ctx, w, h);
    this._drawWeatherOverlay(ctx, w, h);
    if (this.rain.visible) this._drawRain(ctx, w, h);
    if (this._lightningBolt) this._drawLightningBolt(ctx);
    if (this._lightningFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${(this._lightningFlash * 0.55).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }

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

  // _isBlocked()가 항구 반경 안을 항상 바다로 취급하는 것과 시각적으로 맞추기 위해, 그
  // 반경 안에 걸린 육지 위에 바닷물색 원을 덧그려 실제로 열린 만처럼 보이게 한다(등각
  // 투영이라 원이 화면에선 회전된 타원으로 보이므로, 월드 원을 여러 점으로 샘플링해
  // 각각 화면 좌표로 옮긴 다각형으로 그린다).
  _drawHarborClearings(ctx, w, h) {
    const SEGMENTS = 28;
    ctx.fillStyle = WATER_LIGHT;
    for (const city of CITIES) {
      const center = this.iso.toScreen(this.camera, city.pos[0], city.pos[1], w, h);
      const approxR = HARBOR_CLEAR_RADIUS * this.iso.scaleX;
      if (center.x < -approxR - 20 || center.x > w + approxR + 20 || center.y < -approxR - 20 || center.y > h + approxR + 20) continue;
      ctx.beginPath();
      for (let i = 0; i <= SEGMENTS; i++) {
        const a = (i / SEGMENTS) * Math.PI * 2;
        const wx = city.pos[0] + Math.sin(a) * HARBOR_CLEAR_RADIUS;
        const wz = city.pos[1] + Math.cos(a) * HARBOR_CLEAR_RADIUS;
        const p = this.iso.toScreen(this.camera, wx, wz, w, h);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  // 클릭으로 지정한 함선의 상호작용 범위 — 45% 불투명도 원으로 시각화한다. 평시 배는 푸른빛,
  // 적대적인 배는 위협 등급(잡몹=붉은빛/엘리트=주황빛/보스=보랏빛)에 따라 색을 달리해 클릭
  // 전에도 무엇을 상대하는지 한눈에 구분되게 한다. 등각 투영이라 원이 화면에선 타원으로
  // 보이므로, 항구 반경 표시와 같은 방식으로 월드 원을 여러 점으로 샘플링해 화면 좌표
  // 다각형으로 그린다.
  _drawInteractionRange(ctx, w, h, npc) {
    const SEGMENTS = 40;
    const hostile = npc.isHostile();
    const TIER_RANGE_COLORS = {
      boss: { fill: 'rgba(139,47,201,0.45)', stroke: 'rgba(186,104,235,0.9)' },
      elite: { fill: 'rgba(214,138,26,0.45)', stroke: 'rgba(240,175,80,0.9)' },
    };
    const tc = hostile && TIER_RANGE_COLORS[npc.tier];
    ctx.save();
    ctx.fillStyle = tc ? tc.fill : (hostile ? 'rgba(224,80,63,0.45)' : 'rgba(90,170,220,0.45)');
    ctx.strokeStyle = tc ? tc.stroke : (hostile ? 'rgba(224,80,63,0.85)' : 'rgba(120,195,235,0.85)');
    ctx.lineWidth = tc ? 2 : 1.4;
    ctx.beginPath();
    for (let i = 0; i <= SEGMENTS; i++) {
      const a = (i / SEGMENTS) * Math.PI * 2;
      const wx = npc.pos.x + Math.sin(a) * npc.interactionRange;
      const wz = npc.pos.y + Math.cos(a) * npc.interactionRange;
      const p = this.iso.toScreen(this.camera, wx, wz, w, h);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 모험 축 고유의 반복 콘텐츠(systems/exploration.js) — 미탐사 해역 좌표를 화면에서도
  // 눈에 띄게 펄스 링 + 아이콘으로 표시한다. 발견(근접) 판정 자체는 checkExplorationSite가
  // 처리하고, 여기서는 순수 표시만 담당한다.
  _drawExplorationSite(ctx, w, h) {
    const site = state.explorationSite;
    const p = this.iso.toScreen(this.camera, site.x, site.z, w, h);
    if (p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) return;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 2.4);
    ctx.save();
    ctx.strokeStyle = `rgba(255,215,110,${0.55 + pulse * 0.35})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 14 + pulse * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🗺️', p.x, p.y + 6);
    ctx.restore();
  }

  // 고고학/지리학 사이트 — 미탐사 해역과 달리 고정 좌표라 펄스 없이 조용한 아이콘만 띄운다.
  // 발견 여부와 무관하게 항상 보이되(육안으로 그 자리에 뭔가 있다는 것 자체는 알 수 있다),
  // 이름은 도감에 등록된 뒤에야 상호작용 프롬프트(G키)에서 드러난다.
  _drawCompendiumSites(ctx, w, h) {
    const draw = (site, category, icon) => {
      const p = this.iso.toScreen(this.camera, site.coords[0], site.coords[1], w, h);
      if (p.x < -30 || p.x > w + 30 || p.y < -30 || p.y > h + 30) return;
      const found = state.compendium[category][site.id];
      ctx.save();
      ctx.globalAlpha = found ? 0.95 : 0.65;
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(icon, p.x, p.y);
      ctx.restore();
    };
    for (const s of ARCHAEOLOGY_SITES) draw(s, 'archaeology', '🏺');
    for (const s of GEOGRAPHY_SITES) draw(s, 'geography', '🗺️');
  }

  _drawCityMarker(ctx, w, h, marker) {
    const p = this.iso.toScreen(this.camera, marker.pos.x, marker.pos.y, w, h);
    if (p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) return;
    const icon = cityIconSprite(marker.country);
    // 국가별 대도시는 바다에서도 아이콘을 더 크게 그려 눈에 띄게 한다.
    const s = marker.capital ? 1.9 : 1.3;
    ctx.drawImage(icon, p.x - (icon.width * s) / 2, p.y - icon.height * s + 6, icon.width * s, icon.height * s);
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

  _drawShip(ctx, w, h, pos, heading, shipDef, variant, alpha, tier) {
    const v = variant === 'player' ? 'n' : variant === 'friendly' ? 'n' : variant;
    drawShipIso(ctx, this.iso, this.camera, w, h, pos, heading, shipDef, v, alpha, tier);
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

  // 피격 스파크 — 수명(life/maxLife)이 줄수록 옅어지고 작아진다. 밝은 주황~노랑 계열로
  // 화약/파편이 튀는 느낌을 낸다.
  _drawImpactSparks(ctx, w, h) {
    for (const s of this.impactSparks) {
      const p = this.iso.toScreen(this.camera, s.x, s.y, w, h);
      const t = clamp(s.life / s.maxLife, 0, 1);
      ctx.fillStyle = `rgba(255,${180 + Math.round(50 * t)},${60 * t},${t})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1 + 1.6 * t, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 함대(예비 선박)와 손상 입은 적선 머리 위에 작은 내구도 바를 그린다 — 클릭 선택 없이도
  // 한눈에 상태를 알 수 있게 한다. 함대는 항상 표시(자체 UI가 따로 없어서), 적선은 만피가
  // 아닐 때만(평시엔 굳이 보여줄 필요 없음) 표시한다.
  _drawWorldHpBar(ctx, w, h, pos, hpRatio, variant) {
    const p = this.iso.toScreen(this.camera, pos.x, pos.y, w, h);
    const barW = 26, barH = 3.5, yOff = -30;
    const x = p.x - barW / 2, y = p.y + yOff;
    ctx.fillStyle = 'rgba(8,10,10,0.55)';
    ctx.fillRect(x - 1, y - 1, barW + 2, barH + 2);
    const ratio = clamp(hpRatio, 0, 1);
    ctx.fillStyle = variant === 'friendly'
      ? (ratio < 0.25 ? '#e0503f' : ratio < 0.5 ? '#e6c15a' : '#7fe0a0')
      : (ratio < 0.25 ? '#ff6a4a' : ratio < 0.5 ? '#e6c15a' : '#e0847a');
    ctx.fillRect(x, y, barW * ratio, barH);
  }

  // 상단(convoy)/해군(navy) 머리 위에 상시 표시하는 작은 라벨 — 손상 여부와 무관하게 항상
  // 그려져 바다 위에서 두 유형을 한눈에 구분할 수 있게 한다.
  _drawNpcTag(ctx, w, h, pos, text, color) {
    const p = this.iso.toScreen(this.camera, pos.x, pos.y, w, h);
    if (p.x < -60 || p.x > w + 60 || p.y < -60 || p.y > h + 60) return;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const tw = ctx.measureText(text).width;
    const x = p.x, y = p.y - 42;
    ctx.fillStyle = 'rgba(8,10,10,0.6)';
    ctx.fillRect(x - tw / 2 - 5, y - 12, tw + 10, 16);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
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
    if (this.weather.fogIntensity > 0.05) {
      ctx.fillStyle = `rgba(205,210,212,${this.weather.fogIntensity * 0.4})`;
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
