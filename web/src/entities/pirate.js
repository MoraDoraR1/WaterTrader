// NPC 선박 AI — 순찰/추격/공격 상태기계. 렌더링(스프라이트 회전/위치)은 seaScene의 그리기
// 패스가 이 인스턴스의 pos/heading을 읽어서 처리한다(엔티티 자체는 화면에 아무것도 그리지 않음).
//
// 전투 진입 방식(개편): 예전엔 플레이어가 AGGRO_RANGE 안에 들어오기만 하면 자동으로
// chase→attack까지 이어져 강제로 포격전이 시작됐다. 지금은 chase(추격 연출)까지는 거리로
// 자동 전이하지만, 실제 attack(발포) 상태로 넘어가는 건 this.engaged가 true일 때뿐이다.
// engaged는 두 가지 경로로만 켜진다 — (1) 플레이어가 seaScene의 상호작용 메뉴에서 "전투"를
// 선택, (2) 해적(hostile) 한정으로 플레이어가 interactionRange 안에 있을 때 일정 확률로
// 발동하는 강습(ambush). 상인/모험가/명사 함대(hostile=false)는 플레이어가 직접 "전투"를
// 선택해 도발하지 않는 한 절대 먼저 싸움을 걸지 않는다.
import { Vec2 } from '../util/math2d.js';
import { getShip } from '../data/ships.js';
import { state } from '../state.js';
import { hud } from '../ui/hud.js';
import { reactivateRepeatableBounties } from '../systems/quests.js';

const AGGRO_RANGE = 90;
const ATTACK_RANGE = 55;
const STANDOFF = 40;
const AMBUSH_CHECK_INTERVAL = 4.0; // 강습 확률 판정 주기(초) — 해적 한정
const AMBUSH_CHANCE = 0.18; // 판정마다 강습이 실제로 발동할 확률

// 해적 위협 등급 — spawn 데이터(seaEntities.js)의 tier 필드로 정해진다(생략 시 grunt).
// 같은 배(shipId)라도 등장 지역에 따라 이 배율만큼 더 강해질 수 있다 — 전용 보스 함선을
// 새로 그릴 필요 없이, 기존 배에 위협 등급만 얹어 지역별 난이도차를 낼 수 있게 한다.
const TIER_MULS = {
  grunt: { hp: 1, dmg: 1, fireIntervalMul: 1, rangeMul: 1 },
  elite: { hp: 1.4, dmg: 1.3, fireIntervalMul: 0.85, rangeMul: 1.15 },
  boss: { hp: 2.2, dmg: 1.7, fireIntervalMul: 0.7, rangeMul: 1.35 },
};

// 해역별 난이도(레벨 디자인) — spawn 데이터의 region 필드(1~4, 생략 시 1)로 정해진다.
// 상인 유저의 전형적인 항로를 그대로 따른다: 유럽 근해(초심자) → 대서양 횡단·카리브해
// (담배 무역) → 인도양·동남아 향신료 항로(캘리컷 이후 육두구 등) → 극동·남만 무역로(가장
// 위험한 원거리 항로). tier(잡몹/엘리트/보스)가 "이 배가 어떤 성격의 위협인가"를 정한다면,
// region은 "이 바다 자체가 얼마나 위험한가"를 곱연산으로 얹는다 — 같은 잡몹이라도 극동
// 해역에서는 유럽 엘리트급 위협이 된다. 보스는 이미 개별적으로 밸런스를 맞춘 유일 개체라
// region 배율을 중복 적용하지 않는다(무한정 부풀어 오르는 것을 막는다).
const REGION_MULS = {
  1: { hp: 1, dmg: 1, fireIntervalMul: 1 }, // 유럽 근해 — 초심자 해역
  2: { hp: 1.25, dmg: 1.15, fireIntervalMul: 0.95 }, // 대서양 횡단·카리브해(담배 무역로)
  3: { hp: 1.6, dmg: 1.35, fireIntervalMul: 0.88 }, // 인도양·동남아 향신료 항로
  4: { hp: 2.0, dmg: 1.6, fireIntervalMul: 0.8 }, // 극동·남만 무역로 — 가장 위험한 원거리 항로
};
// 보스는 위 REGION_MULS를 그대로 곱하면 체력이 통제 불능으로 부풀어 오르므로(예: 잡몹
// 기준 2배가 보스의 2.2배 위에 또 곱해짐) 훨씬 완만한 전용 배율을 쓴다 — 그래도 "카리브해
// 보스(2구간)보다 극동 보스(4구간)가 더 강해야 한다"는 최종 관문으로서의 위계는 지킨다.
const BOSS_REGION_MULS = {
  1: { hp: 1, dmg: 1 },
  2: { hp: 1, dmg: 1 },
  3: { hp: 1.1, dmg: 1.08 },
  4: { hp: 1.22, dmg: 1.15 },
};

// ---- 전투 보상 재설계(나포 폐지 이후) ----
// 나포가 사라지면서(항상 격침) 골드는 "실효 최대체력(hp) × 계수" 하나의 공식으로 통일된다
// — 잡몹이든 방금 만든 엘리트든 똑같이 80~240만 주던 예전 방식과 달리, 상대가 강할수록
// 자연히 보상도 커진다. 보스는 그 위에 고정 보너스(정부/상회의 별도 포상금 명목)가 더 붙는다.
const GOLD_PER_HP = 0.35;
const BOSS_FLAT_BONUS = 1200;

export function getKillGold(npc) {
  const base = Math.round(npc.maxHp * GOLD_PER_HP);
  return npc.tier === 'boss' ? base + BOSS_FLAT_BONUS : base;
}

// 해역별 교역품 노획 — 신규 품목을 만들지 않고 그 해역 특산품(data/goods.js)을 그대로
// 화물칸에 채워준다. 잡을수록 그 항로 무역이 실감 나도록 지역색을 살렸다.
const CARGO_LOOT_POOL = {
  1: ['wine', 'olive_oil', 'wool', 'amber'],
  2: ['sugar', 'cacao', 'silver'],
  3: ['pepper', 'cinnamon', 'clove', 'nutmeg', 'silk'],
  4: ['silk', 'porcelain', 'tea', 'ginseng'],
};
const CARGO_LOOT_CHANCE = { grunt: 0.25, elite: 0.55, boss: 1 };
const CARGO_LOOT_QTY = { grunt: [1, 3], elite: [3, 6], boss: [8, 15] };

// 자재·포탄 소량 노획 — 잡몹/엘리트만 해당(보스는 대신 초대형 건조 전용 재료를 확정으로
// 준다 — 아래 참고). 자재는 바다 위 응급수리, 포탄은 포격 자체의 필수 소모품이라 어떤
// 상황에서도 쓸모가 확실하다.
const SUPPLY_LOOT_CHANCE = { grunt: 0.3, elite: 0.3, boss: 0 };

// ---- 건조 재료 드랍 ----
// 상급 조선용 참나무 — 대형/초대형 건조에 쓰이는 오래 묵은 원목(엘리트 전용 드랍).
// 전설 해적기함의 철갑판 — 격침한 전설적 해적 기함에서 노획한 보강 철물(보스 전용, 확정).
// 수치는 실측 페이싱 플레이테스트로 보정됨 — 지역4(중국 연안) 파밍 거점을 실제 항해 거리로
// 넓게 재배치한 뒤(쏠림 완화), 그로 인해 늘어난 이동시간만큼 드랍량을 올려 대형~30분·
// 초대형~35~55분대의 원래 체감 페이싱을 유지한다(자세한 실측치는 로드맵 문서 참고).
const OAK_DROP_CHANCE = 0.6;
const OAK_DROP_QTY = [1, 2];
const IRONCLAD_DROP_QTY = [1, 2];

function randInt([lo, hi]) {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

// 격침 시 골드를 뺀 나머지 전리품(교역품/자재·포탄/건조 재료)을 한 번에 판정한다 —
// 실제 state 반영과 토스트 문구 조립은 seaScene._victoryToast가 담당한다.
export function rollCombatLoot(npc) {
  const tier = npc.tier || 'grunt';
  const loot = { cargoGoodId: null, cargoQty: 0, materials: 0, cannonballs: 0, oakTimber: 0, ironcladPlating: 0 };

  if (Math.random() < (CARGO_LOOT_CHANCE[tier] ?? 0)) {
    const pool = CARGO_LOOT_POOL[npc.region] || CARGO_LOOT_POOL[1];
    loot.cargoGoodId = pool[Math.floor(Math.random() * pool.length)];
    loot.cargoQty = randInt(CARGO_LOOT_QTY[tier] || [1, 1]);
  }

  if (Math.random() < (SUPPLY_LOOT_CHANCE[tier] ?? 0)) {
    if (Math.random() < 0.5) loot.materials = randInt([2, 5]);
    else loot.cannonballs = randInt([5, 15]);
  }

  if (tier === 'elite' && Math.random() < OAK_DROP_CHANCE) {
    loot.oakTimber = randInt(OAK_DROP_QTY);
  }
  if (tier === 'boss') {
    loot.ironcladPlating = randInt(IRONCLAD_DROP_QTY);
  }
  return loot;
}

// ---- 엘리트/보스 리스폰 + 회당 25% 무한 누적 강화 ----
// 격침해도 영구히 사라지지 않고, 일정 항해일 뒤 "이전보다 강해져서" 돌아온다 — 건조 재료
// (참나무/철갑판)를 반복해서 파밍할 수 있어야 초대형 함선 건조가 실제로 가능해지기 때문이다.
// 강화는 하루 안에서는 상한 없이 계속 누적되지만, 매일 자정(로컬 현실 시각)에 전부 0으로
// 되돌아간다(checkDailyEscalationReset) — 그래야 하루 이상 묵혀둔 파밍이 통제 불능으로
// 커지는 사고를 막는다.
const ESCALATION_STEP = 0.25;
const RESPAWN_DELAY_VOYAGE_DAYS = { elite: 3, boss: 10 };
const VOYAGE_DAY_SECONDS = 60; // entities/weather.js DAY_CYCLE_SECONDS와 동일 기준

function getEscalationLevel(ownerId) {
  return state.pirateEscalation[ownerId]?.level || 0;
}

export class NpcShip {
  constructor(def) {
    this.def = def;
    this.shipDef = getShip(def.shipId);
    this.spawn = new Vec2(def.pos[0], def.pos[1]);
    this.pos = this.spawn.clone();
    this.heading = Math.random() * Math.PI * 2;
    this.tier = def.tier || 'grunt';
    this.region = def.region || 1;
    this.owner = def.id;
    this.state = 'patrol';
    this.patrolTarget = this._randomPatrolPoint();
    this._computeStats();
    this.hp = this.maxHp;
    this.fireTimer = this.fireInterval * Math.random();
    this.dead = false;
    this.sinkT = 0; // 격침 후 가라앉는 연출용 타이머
    this.radius = 6 * ((getShip(def.shipId)?.class === 'xlarge' && 1.8) || 1);
    // 상호작용 범위 — 이 거리 안에 들어와야 플레이어가 클릭으로 전투/대화/종료를 선택할 수
    // 있다(seaScene이 원으로 시각화). 큰 배일수록, 위협 등급이 높을수록 범위도 넓다.
    const tmForRange = TIER_MULS[this.tier] || TIER_MULS.grunt;
    this.interactionRange = Math.round((55 + this.radius * 3) * tmForRange.rangeMul);
    this.engaged = false; // 플레이어의 "전투" 선택 또는 강습으로만 true가 되며, attack 상태 진입 조건이다
    this.hostileOverride = false; // 원래 평화로운 NPC를 플레이어가 먼저 공격했을 때만 true
    this.ambushTimer = AMBUSH_CHECK_INTERVAL * (0.5 + Math.random());
  }

  // hp/화력을 티어·지역·강화(escalation) 배율로 (재)계산한다 — 최초 생성 시는 물론, 리스폰
  // 시(더 강해진 레벨 반영)와 자정 초기화 시(레벨 0으로 되돌림)에도 그대로 재사용된다.
  // 원거리 공격력은 이 NPC의 shipId가 가진 cannons(대포 최대치) 스탯에 비례해 정해진다 —
  // 예전엔 모든 NPC가 shipId와 무관하게 똑같이 쐈는데(2.6초당 18데미지 고정), 큰 함선일수록
  // 더 위협적이어야 실제로 "어떤 배를 상대하는지"가 전투 난이도에 의미를 갖는다.
  // cannons=5(소형) 기준 dps~5.2, cannons=18(카라벨라 데 아르마다급) 기준 dps~9.9 정도로
  // 완만하게 벌어지도록 잡았다 — 플레이어 화력 스케일(수십~수백 dps)에 비하면 여전히
  // NPC는 전반적으로 약하지만, 배 종류별 차이는 확실히 드러난다. 위협 등급(tier)과 해역
  // 난이도(region)는 이 기준선 위에 곱연산으로 함께 얹혀, 같은 잡몹이라도 먼바다로 갈수록
  // 눈에 띄게 더 위협적이다. 강화(escalation)는 체력·화력에만 얹는다 — 발사 속도까지
  // 얹으면 배율이 겹쳐 무한 누적 특성상 순식간에 감당 불가능해진다.
  _computeStats() {
    const tm = TIER_MULS[this.tier] || TIER_MULS.grunt;
    const isBoss = this.tier === 'boss';
    const rm = isBoss
      ? { ...(BOSS_REGION_MULS[this.region] || BOSS_REGION_MULS[1]), fireIntervalMul: 1 }
      : (REGION_MULS[this.region] || REGION_MULS[1]);
    this.escalationLevel = (this.tier === 'elite' || this.tier === 'boss') ? getEscalationLevel(this.owner) : 0;
    const esc = 1 + this.escalationLevel * ESCALATION_STEP;
    this.maxHp = Math.round(this.def.hp * tm.hp * rm.hp * esc);
    const cannons = this.shipDef?.cannons || 0;
    this.fireInterval = Math.max(1.6, Math.min(3.0, 3.0 - cannons * 0.06)) * tm.fireIntervalMul * rm.fireIntervalMul;
    this.shotDmg = Math.round(Math.min(30, Math.round(12 + cannons * 0.4)) * tm.dmg * rm.dmg * esc);
  }

  // 격침된 엘리트/보스가 리스폰 타이머를 채운 뒤 원래 자리에서 다시 살아난다 — 이번엔
  // 누적된 강화 레벨이 반영된 스탯으로(checkPirateRespawns가 호출).
  respawn() {
    this._computeStats();
    this.hp = this.maxHp;
    this.dead = false;
    this.sinkT = 0;
    this.pos = this.spawn.clone();
    this.heading = Math.random() * Math.PI * 2;
    this.state = 'patrol';
    this.patrolTarget = this._randomPatrolPoint();
    this.fireTimer = this.fireInterval * Math.random();
    this.engaged = false;
    this.hostileOverride = false;
    this.ambushTimer = AMBUSH_CHECK_INTERVAL * (0.5 + Math.random());
  }

  isHostile() { return this.def.hostile || this.hostileOverride; }

  // 플레이어가 상호작용 메뉴에서 "전투"를 선택했을 때 seaScene이 호출한다.
  engage() {
    if (!this.def.hostile) this.hostileOverride = true;
    this.engaged = true;
    if (this.state === 'patrol') this.state = 'chase';
  }

  _randomPatrolPoint() {
    const r = this.def.patrolRadius || 100;
    const a = Math.random() * Math.PI * 2;
    return new Vec2(this.spawn.x + Math.cos(a) * r, this.spawn.y + Math.sin(a) * r);
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0 && !this.dead) {
      this.dead = true;
      this.state = 'sunk';
      if (this.tier === 'elite' || this.tier === 'boss') {
        const prev = state.pirateEscalation[this.owner] || { level: 0, respawnAt: null };
        const level = prev.level + 1;
        const respawnAt = state.dayTimer + RESPAWN_DELAY_VOYAGE_DAYS[this.tier] * VOYAGE_DAY_SECONDS;
        state.pirateEscalation = { ...state.pirateEscalation, [this.owner]: { level, respawnAt } };
      } else if (this.def.respawnDays) {
        // 잡몹 중 반복 토벌 의뢰가 걸린 개체만, 강화 없이(level 항상 0) 단순 리스폰한다 —
        // pirateEscalation 저장소를 그대로 재사용해 checkPirateRespawns 로직을 공유한다.
        const respawnAt = state.dayTimer + this.def.respawnDays * VOYAGE_DAY_SECONDS;
        state.pirateEscalation = { ...state.pirateEscalation, [this.owner]: { level: 0, respawnAt } };
      }
    }
  }

  // visMul: 안개 시야 배율(entities/weather.js fogVisMul, 1=평시·짙은 안개일수록 작아짐) —
  // 아직 교전하지 않은 순찰 중 상대를 서로 알아채는 거리에만 적용한다(이미 교전 중이면
  // 안개와 무관하게 알고 있는 것으로 취급 — ATTACK_RANGE·standoff 로직은 그대로 둔다).
  update(delta, t, playerPos2, cannonPool, visMul = 1) {
    if (this.dead) {
      this.sinkT += delta;
      return;
    }

    const toPlayer = new Vec2(playerPos2.x - this.pos.x, playerPos2.y - this.pos.y);
    const distToPlayer = toPlayer.length();
    const hostile = this.isHostile();

    // 해적(원래 hostile)만 강습 대상이다 — 상호작용 범위 안에 플레이어가 있으면 주기적으로
    // 확률 판정을 굴려, 성공하면 플레이어의 선택과 무관하게 즉시 engaged가 된다.
    if (this.def.hostile && !this.engaged && this.state !== 'sunk') {
      if (distToPlayer < this.interactionRange * visMul) {
        this.ambushTimer -= delta;
        if (this.ambushTimer <= 0) {
          this.ambushTimer = AMBUSH_CHECK_INTERVAL;
          if (Math.random() < AMBUSH_CHANCE) {
            this.engaged = true;
            this.ambushTriggered = true; // seaScene이 한 번 읽고 나서 꺼준다(토스트/배너 표시용)
            if (this.state === 'patrol') this.state = 'chase';
          }
        }
      } else {
        this.ambushTimer = AMBUSH_CHECK_INTERVAL * (0.6 + Math.random() * 0.4);
      }
    }

    if (hostile) {
      if (this.state === 'patrol' && distToPlayer < AGGRO_RANGE * visMul) this.state = 'chase';
      if (this.engaged && this.state === 'chase' && distToPlayer < ATTACK_RANGE) this.state = 'attack';
      if (this.state !== 'patrol' && distToPlayer > AGGRO_RANGE * 1.6 * visMul) {
        this.state = 'patrol';
        this.engaged = false;
      }
    }

    let targetDir;
    let speed;
    if (this.state === 'patrol') {
      const toTarget = new Vec2(this.patrolTarget.x - this.pos.x, this.patrolTarget.y - this.pos.y);
      if (toTarget.length() < 8) this.patrolTarget = this._randomPatrolPoint();
      targetDir = toTarget.normalize();
      speed = 5;
    } else if (this.state === 'chase') {
      targetDir = toPlayer.clone().normalize();
      speed = 8;
    } else {
      const standoffVec = toPlayer.clone().normalize();
      const desired = distToPlayer < STANDOFF ? { x: -standoffVec.x, y: -standoffVec.y } : standoffVec;
      targetDir = { x: -standoffVec.y, y: standoffVec.x };
      if (distToPlayer < STANDOFF * 0.7) targetDir = desired;
      speed = 4;

      this.fireTimer -= delta;
      if (this.fireTimer <= 0 && distToPlayer < ATTACK_RANGE) {
        this.fireTimer = this.fireInterval;
        const len = Math.hypot(toPlayer.x, toPlayer.y) || 1;
        const dir = { x: toPlayer.x / len, y: toPlayer.y / len };
        const origin = { x: this.pos.x + dir.x * this.radius * 0.6, y: this.pos.y + dir.y * this.radius * 0.6 };
        cannonPool.fire(origin, dir, 34, this.owner, this.shotDmg);
      }
    }

    const targetHeading = Math.atan2(targetDir.x, targetDir.y);
    let diff = targetHeading - this.heading;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.heading += Math.max(-1, Math.min(1, diff)) * delta * 1.4;

    this.pos.x += Math.sin(this.heading) * speed * delta;
    this.pos.y += Math.cos(this.heading) * speed * delta;
  }
}

// 매 프레임 불러도 부담 없다(죽어있는 엘리트/보스만 골라 리스폰 시각을 비교). seaScene의
// 메인 루프에서 checkDailyEscalationReset 다음에 호출한다 — 자정이 막 지나 레벨이 0으로
// 돌아온 바로 그 프레임에 리스폰되는 개체가 있다면 이미 초기화된 레벨로 살아나게 하기 위해서다.
export function checkPirateRespawns(npcShips) {
  for (const npc of npcShips) {
    if (!npc.dead) continue;
    const entry = state.pirateEscalation[npc.owner];
    if (!entry || entry.respawnAt == null || state.dayTimer < entry.respawnAt) continue;
    state.pirateEscalation = { ...state.pirateEscalation, [npc.owner]: { ...entry, respawnAt: null } };
    npc.respawn();
    const reactivated = reactivateRepeatableBounties(npc.owner);
    const repeatNote = reactivated.length > 0 ? ' 관련 반복 토벌 의뢰가 다시 게시됐습니다.' : '';
    // 잡몹 단순 리스폰(respawnDays)은 강화가 없으므로(escalationLevel 항상 0) 그 문구를 뺀다.
    const escalationNote = (npc.tier === 'elite' || npc.tier === 'boss')
      ? ` (강화 Lv.${npc.escalationLevel} · 이전 대비 +${npc.escalationLevel * 25}%)` : '';
    hud.toast(`⚔ ${npc.def.name}이(가) 다시 나타났습니다!${escalationNote}${repeatNote}`);
  }
}

// 로컬 기기 시각 기준 자정이 지날 때마다 딱 한 번, 그날까지 쌓인 강화 레벨을 전부 0으로
// 되돌린다 — 대기 중인(아직 안 잡힌) 리스폰 타이머 자체는 건드리지 않는다(그것까지 지우면
// 죽은 채로 영원히 안 돌아오는 개체가 생긴다). 이미 필드에 살아 있는 엘리트/보스는 그
// 자리에서 즉시 기본 스탯으로 재계산된다(전투 중이었더라도 예외 없음).
export function checkDailyEscalationReset(npcShips) {
  const today = new Date().toDateString();
  if (state.pirateEscalationResetDate === today) return;
  const isFirstRun = state.pirateEscalationResetDate == null;
  state.pirateEscalationResetDate = today;

  let hadEscalation = false;
  const next = {};
  for (const [id, entry] of Object.entries(state.pirateEscalation)) {
    if (entry.level > 0) hadEscalation = true;
    next[id] = { level: 0, respawnAt: entry.respawnAt };
  }
  state.pirateEscalation = next;
  if (isFirstRun || !hadEscalation) return;

  for (const npc of npcShips) {
    if (!npc.dead && (npc.tier === 'elite' || npc.tier === 'boss')) {
      npc._computeStats();
      npc.hp = npc.maxHp;
    }
  }
  hud.toast('🌅 자정이 지나 강화됐던 해적들의 위세가 원래대로 돌아왔습니다.');
}
