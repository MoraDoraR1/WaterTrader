// 배 조작 물리 로직 — 기존 ship.js의 ShipController를 3D 메시 결합 없이 순수 로직으로 뗀 버전.
// pos/heading만 갱신하고, 실제 그리기는 seaScene의 렌더 패스가 이 값을 읽어 스프라이트를 돌린다.
import { Vec2, clamp } from '../util/math2d.js';
import { SHIP_CLASSES } from '../data/ships.js';

// 선박마다 다른 ships.js의 speed 스탯(7~19)이 실제 항해 속도에 그대로 비례하도록 계산한다
// (예전엔 speed가 조선소 비교용 표시값일 뿐 실제 이동 물리에는 전혀 반영되지 않았다).
// 가장 빠른 배(클리퍼 테르모필레, speed 19)가 최대속력으로 리스본↔나가사키 직선거리
// (project() 기준 약 19,480유닛)를 약 12분(720초)에 주파하도록 역산한 상수 —
// SPEED_STAT_TO_UNIT = (거리/720초) / (MAX_FWD * 19).
const SPEED_STAT_TO_UNIT = 0.2848;
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
  get notchSpeed() { return this.shipDef.speed * SPEED_STAT_TO_UNIT; }
  get maxSpeedMs() { return this.notchSpeed * MAX_FWD * this.speedMul * this.windMul; }

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

    const notchSpeed = this.notchSpeed;
    const turnRateBase = degToRad(this.shipDef.turnRate);
    const maxSpeed = notchSpeed * MAX_FWD * this.speedMul * this.windMul;
    const speedFactor = 0.35 + 0.65 * Math.min(1, Math.abs(this.curSpeed) / maxSpeed);
    const dir = this.curSpeed < 0 ? -1 : 1;
    const targetTurnRate = this.turnInput * turnRateBase * speedFactor * dir;
    const maxTurnStep = this.turnAccel * delta;
    this.curTurnRate += clamp(targetTurnRate - this.curTurnRate, -maxTurnStep, maxTurnStep);
    this.heading += this.curTurnRate * delta;

    const targetSpeed = this.notch * notchSpeed * this.speedMul * this.windMul;
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
