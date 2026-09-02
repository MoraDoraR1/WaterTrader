// NPC 선박 AI — 순찰/추격/공격 상태기계. 렌더링(스프라이트 회전/위치)은 seaScene의 그리기
// 패스가 이 인스턴스의 pos/heading을 읽어서 처리한다(엔티티 자체는 화면에 아무것도 그리지 않음).
import { Vec2 } from '../util/math2d.js';
import { getShip } from '../data/ships.js';

const AGGRO_RANGE = 90;
const ATTACK_RANGE = 55;
const STANDOFF = 40;
const FIRE_INTERVAL = 2.6;

export class NpcShip {
  constructor(def) {
    this.def = def;
    this.shipDef = getShip(def.shipId);
    this.spawn = new Vec2(def.pos[0], def.pos[1]);
    this.pos = this.spawn.clone();
    this.heading = Math.random() * Math.PI * 2;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.state = 'patrol';
    this.patrolTarget = this._randomPatrolPoint();
    this.fireTimer = FIRE_INTERVAL * Math.random();
    this.dead = false;
    this.sinkT = 0; // 격침 후 가라앉는 연출용 타이머
    this.owner = def.id;
    this.radius = 6 * ((getShip(def.shipId)?.class === 'xlarge' && 1.8) || 1);
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

    if (this.def.hostile) {
      if (this.state === 'patrol' && distToPlayer < AGGRO_RANGE) this.state = 'chase';
      if (this.state === 'chase' && distToPlayer < ATTACK_RANGE) this.state = 'attack';
      if (this.state !== 'patrol' && distToPlayer > AGGRO_RANGE * 1.6) this.state = 'patrol';
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
        this.fireTimer = FIRE_INTERVAL;
        const len = Math.hypot(toPlayer.x, toPlayer.y) || 1;
        const dir = { x: toPlayer.x / len, y: toPlayer.y / len };
        const origin = { x: this.pos.x + dir.x * this.radius * 0.6, y: this.pos.y + dir.y * this.radius * 0.6 };
        cannonPool.fire(origin, dir, 34, this.owner);
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
