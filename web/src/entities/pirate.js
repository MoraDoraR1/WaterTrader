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

export class NpcShip {
  constructor(def) {
    this.def = def;
    this.shipDef = getShip(def.shipId);
    this.spawn = new Vec2(def.pos[0], def.pos[1]);
    this.pos = this.spawn.clone();
    this.heading = Math.random() * Math.PI * 2;
    this.tier = def.tier || 'grunt';
    this.region = def.region || 1;
    const tm = TIER_MULS[this.tier] || TIER_MULS.grunt;
    const isBoss = this.tier === 'boss';
    const rm = isBoss
      ? { ...(BOSS_REGION_MULS[this.region] || BOSS_REGION_MULS[1]), fireIntervalMul: 1 }
      : (REGION_MULS[this.region] || REGION_MULS[1]);
    this.hp = Math.round(def.hp * tm.hp * rm.hp);
    this.maxHp = this.hp;
    this.state = 'patrol';
    this.patrolTarget = this._randomPatrolPoint();
    // 원거리 공격력은 이 NPC의 shipId가 가진 cannons(대포 최대치) 스탯에 비례해 정해진다 —
    // 예전엔 모든 NPC가 shipId와 무관하게 똑같이 쐈는데(2.6초당 18데미지 고정), 큰 함선일수록
    // 더 위협적이어야 실제로 "어떤 배를 상대하는지"가 전투 난이도에 의미를 갖는다.
    // cannons=5(소형) 기준 dps~5.2, cannons=18(카라벨라 데 아르마다급) 기준 dps~9.9 정도로
    // 완만하게 벌어지도록 잡았다 — 플레이어 화력 스케일(수십~수백 dps)에 비하면 여전히
    // NPC는 전반적으로 약하지만, 배 종류별 차이는 확실히 드러난다. 위협 등급(tier)과 해역
    // 난이도(region)는 이 기준선 위에 곱연산으로 함께 얹혀, 같은 잡몹이라도 먼바다로 갈수록
    // 눈에 띄게 더 위협적이다.
    const cannons = this.shipDef?.cannons || 0;
    this.fireInterval = Math.max(1.6, Math.min(3.0, 3.0 - cannons * 0.06)) * tm.fireIntervalMul * rm.fireIntervalMul;
    this.shotDmg = Math.round(Math.min(30, Math.round(12 + cannons * 0.4)) * tm.dmg * rm.dmg);
    this.fireTimer = this.fireInterval * Math.random();
    this.dead = false;
    this.sinkT = 0; // 격침 후 가라앉는 연출용 타이머
    this.owner = def.id;
    this.radius = 6 * ((getShip(def.shipId)?.class === 'xlarge' && 1.8) || 1);
    // 상호작용 범위 — 이 거리 안에 들어와야 플레이어가 클릭으로 전투/대화/종료를 선택할 수
    // 있다(seaScene이 원으로 시각화). 큰 배일수록, 위협 등급이 높을수록 범위도 넓다.
    this.interactionRange = Math.round((55 + this.radius * 3) * tm.rangeMul);
    this.engaged = false; // 플레이어의 "전투" 선택 또는 강습으로만 true가 되며, attack 상태 진입 조건이다
    this.hostileOverride = false; // 원래 평화로운 NPC를 플레이어가 먼저 공격했을 때만 true
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
    }
  }

  update(delta, t, playerPos2, cannonPool) {
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
      if (distToPlayer < this.interactionRange) {
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
      if (this.state === 'patrol' && distToPlayer < AGGRO_RANGE) this.state = 'chase';
      if (this.engaged && this.state === 'chase' && distToPlayer < ATTACK_RANGE) this.state = 'attack';
      if (this.state !== 'patrol' && distToPlayer > AGGRO_RANGE * 1.6) {
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
