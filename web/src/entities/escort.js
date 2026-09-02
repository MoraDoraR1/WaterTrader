// 함대의 예비 선박을 플레이어 뒤쪽 대형(편대) 위치를 따라오는 시각적 호위선으로 표현한다.
// 전투/충돌에는 관여하지 않는 순수 연출용 개체 — 목표 지점을 향해 단순히 보간(lerp)한다.
import { Vec2, clamp } from '../util/math2d.js';

const FORMATION_SLOTS = [
  [-13, -16],
  [13, -16],
  [0, -30],
];

export class EscortShip {
  constructor(shipDef, slotIndex) {
    this.shipDef = shipDef;
    this.pos = new Vec2(0, 0);
    this.heading = 0;
    this.slot = FORMATION_SLOTS[slotIndex % FORMATION_SLOTS.length];
    this._initialized = false;
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
}
