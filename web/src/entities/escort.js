// 함대의 예비 선박을 플레이어 뒤쪽 대형(편대) 위치를 따라오는 시각적 호위선으로 표현한다.
// 전투 중 최소한의 화력만 보탠다(hp·피격은 여전히 모델링하지 않는 의도적으로 좁은 범위의
// 개선 — "함대 사령관" 랭크명에 완전히 걸맞으려면 더 큰 재작업이 필요하지만, 예비 선박이
// 완전히 구경만 하는 것보다는 낫다는 판단).
import { Vec2, clamp } from '../util/math2d.js';

const FORMATION_SLOTS = [
  [-13, -16],
  [13, -16],
  [0, -30],
];

const ESCORT_FIRE_INTERVAL = 4.5; // 플레이어(FIRE_COOLDOWN 1.5초)보다 훨씬 뜸하게 쏘는 보조 화력
const ESCORT_FIRE_RANGE = 90; // 편대 위치(플레이어 후방 최대 30유닛)를 감안해 약간 넉넉하게

export class EscortShip {
  constructor(shipDef, slotIndex) {
    this.shipDef = shipDef;
    this.pos = new Vec2(0, 0);
    this.heading = 0;
    this.slot = FORMATION_SLOTS[slotIndex % FORMATION_SLOTS.length];
    this._initialized = false;
    this.fireTimer = ESCORT_FIRE_INTERVAL * (0.4 + Math.random() * 0.6);
  }

  update(delta, playerShip) {
    const fwd = { x: Math.sin(playerShip.heading), y: Math.cos(playerShip.heading) };
    const right = { x: fwd.y, y: -fwd.x };
    const [lat, back] = this.slot;
    const desired = new Vec2(
      playerShip.pos.x + right.x * lat + fwd.x * back,
      playerShip.pos.y + right.y * lat + fwd.y * back
    );

    if (!this._initialized) {
      this.pos.copy(desired);
      this.heading = playerShip.heading;
      this._initialized = true;
      return;
    }

    const toDesired = new Vec2(desired.x - this.pos.x, desired.y - this.pos.y);
    const dist = toDesired.length();
    const catchUp = clamp(dist * 0.9, 1.5, 14);
    if (dist > 0.001) this.pos.addScaledVector({ x: toDesired.x / dist, y: toDesired.y / dist }, Math.min(dist, catchUp * delta));

    if (dist > 0.6) {
      const targetHeading = Math.atan2(toDesired.x, toDesired.y);
      let diff = targetHeading - this.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.heading += clamp(diff, -1, 1) * delta * 1.6;
    } else {
      let diff = playerShip.heading - this.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.heading += diff * Math.min(1, delta * 1.6);
    }
  }

  // 사거리 안에 target(가장 가까운 적대 npc)이 있고 쿨다운이 다 됐으면 발사 방향을 반환한다
  // (없거나 아직이면 null). 실제 포탄 생성/피해는 호출부(seaScene)가 cannonPool로 처리한다.
  tryFire(delta, target) {
    this.fireTimer -= delta;
    if (!target || this.fireTimer > 0) return null;
    const dx = target.pos.x - this.pos.x, dz = target.pos.y - this.pos.y;
    const dist = Math.hypot(dx, dz);
    if (dist > ESCORT_FIRE_RANGE) return null;
    this.fireTimer = ESCORT_FIRE_INTERVAL;
    const len = dist || 1;
    return { x: dx / len, y: dz / len };
  }
}
