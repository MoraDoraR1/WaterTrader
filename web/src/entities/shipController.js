// 배 조작 물리 로직 — 기존 ship.js의 ShipController를 3D 메시 결합 없이 순수 로직으로 뗀 버전.
// pos/heading만 갱신하고, 실제 그리기는 seaScene의 렌더 패스가 이 값을 읽어 스프라이트를 돌린다.
import { Vec2, clamp } from '../util/math2d.js';
import { SHIP_CLASSES } from '../data/ships.js';

// 전세계 지도로 확장하며 SCALE(coastline.js)을 45→140으로 키웠다. 순항 속도도 어느 정도
// 함께 올리되(4.2→7.0) 거리만큼 다 따라가진 않게 해, 인접 항구는 적당히 길어지고
// 대륙을 넘나드는 항로는 확실히 "긴 항해"로 느껴지도록 했다.
const NOTCH_SPEED = 7.0;
const MAX_FWD = 5;
const MAX_REV = -3;
const ACCEL_BASE = 4.5;
const TURN_ACCEL_BASE = 0.6;

function degToRad(d) { return (d * Math.PI) / 180; }

export class ShipController {
  constructor(shipDef) {
    this.shipDef = shipDef;
    this.notch = 0;
    this.curSpeed = 0;
    this.curTurnRate = 0;
    this.heading = 0;
    this.pos = new Vec2(0, 0);
    this.turnInput = 0;
    this.bobPhase = 0; // 렌더 쪽에서 살짝 흔들리는 표현에 쓰는 위상값

    const cls = SHIP_CLASSES[shipDef.class] || SHIP_CLASSES.medium;
    const [csx, , csz] = cls.hullScale;
    const inertia = 1 + (csx * csz - 1) * 0.35;
    this.accel = ACCEL_BASE / inertia;
    this.turnAccel = TURN_ACCEL_BASE / inertia;
    this.speedMul = shipDef.speedMul || 1;
    this.windSensitivity = shipDef.type === 'galley' ? 0.25 : 1;
    this.windMul = 1;
  }

  throttleUp() { this.notch = Math.min(MAX_FWD, this.notch + 1); }
  throttleDown() { this.notch = Math.max(MAX_REV, this.notch - 1); }

  get speedRatio() { return this.notch >= 0 ? this.notch / MAX_FWD : this.notch / Math.abs(MAX_REV); }
  get maxSpeedMs() { return NOTCH_SPEED * MAX_FWD * this.speedMul * this.windMul; }

  update(delta, t, isBlocked, wind) {
    if (wind) {
      let diff = this.heading - wind.towardDirection;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      const align = Math.cos(diff);
      const bonus = (align >= 0 ? align * 0.25 : align * 0.35) * wind.strength * this.windSensitivity;
      this.windMul = 1 + bonus;
    } else {
      this.windMul = 1;
    }

    const turnRateBase = degToRad(this.shipDef.turnRate);
    const maxSpeed = NOTCH_SPEED * MAX_FWD * this.speedMul * this.windMul;
    const speedFactor = 0.35 + 0.65 * Math.min(1, Math.abs(this.curSpeed) / maxSpeed);
    const dir = this.curSpeed < 0 ? -1 : 1;
    const targetTurnRate = this.turnInput * turnRateBase * speedFactor * dir;
    const maxTurnStep = this.turnAccel * delta;
    this.curTurnRate += clamp(targetTurnRate - this.curTurnRate, -maxTurnStep, maxTurnStep);
    this.heading += this.curTurnRate * delta;

    const targetSpeed = this.notch * NOTCH_SPEED * this.speedMul * this.windMul;
    const maxSpeedStep = this.accel * delta;
    this.curSpeed += clamp(targetSpeed - this.curSpeed, -maxSpeedStep, maxSpeedStep);

    const vx = Math.sin(this.heading) * this.curSpeed;
    const vy = Math.cos(this.heading) * this.curSpeed;
    const prevX = this.pos.x, prevY = this.pos.y;
    let nx = prevX + vx * delta, ny = prevY + vy * delta;

    if (isBlocked && isBlocked(nx, ny)) {
      if (!isBlocked(nx, prevY)) ny = prevY;
      else if (!isBlocked(prevX, ny)) nx = prevX;
      else { nx = prevX; ny = prevY; }
    }
    this.pos.x = nx;
    this.pos.y = ny;
    this.bobPhase = t;
  }
}
