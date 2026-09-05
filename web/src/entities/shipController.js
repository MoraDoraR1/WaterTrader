// 배 조작 물리 로직 — 기존 ship.js의 ShipController를 3D 메시 결합 없이 순수 로직으로 뗀 버전.
// pos/heading만 갱신하고, 실제 그리기는 seaScene의 렌더 패스가 이 값을 읽어 스프라이트를 돌린다.
import { Vec2, clamp } from '../util/math2d.js';
import { SHIP_CLASSES } from '../data/ships.js';
import { mulSkillEffect } from '../data/shipSkills.js';

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
    this.baseWindSensitivity = shipDef.type === 'galley' ? 0.25 : 1;
    this.windSensitivity = this.baseWindSensitivity;
    // 역풍 극복 스킬(headwindPenaltyMul) — 배 고유 특성이라 장비처럼 바뀌지 않으므로 생성 시
    // 한 번만 계산해둔다(전투/폭풍 여부와 무관하게 항상 적용).
    this.headwindPenaltyMul = mulSkillEffect(shipDef, 'headwindPenaltyMul', 1);
    this.windMul = 1;
    // 선원이 최소 정원에 못 미치면 곱해지는 배율(1=정상) — seaScene이 매 프레임 crew.js의
    // getCrewSpeedMul()로 갱신해준다(선원 수는 게임 상태라 이 순수 물리 클래스는 직접 모른다).
    this.crewSpeedMul = 1;
    // 전투 중에만 발동하는 스킬(신속 기동/돌격 항해술) 배율 — seaScene이 매 프레임
    // state.inCombat 여부를 보고 갱신해준다(평시엔 항상 1).
    this.combatSpeedMul = 1;
    this.combatTurnMul = 1;
  }

  throttleUp() { this.notch = Math.min(MAX_FWD, this.notch + 1); }
  throttleDown() { this.notch = Math.max(MAX_REV, this.notch - 1); }

  get speedRatio() { return this.notch >= 0 ? this.notch / MAX_FWD : this.notch / Math.abs(MAX_REV); }
  get notchSpeed() { return this.shipDef.speed * SPEED_STAT_TO_UNIT; }
  get maxSpeedMs() { return this.notchSpeed * MAX_FWD * this.speedMul * this.windMul * this.crewSpeedMul * this.combatSpeedMul; }

  update(delta, t, isBlocked, wind) {
    if (wind) {
      let diff = this.heading - wind.towardDirection;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      const align = Math.cos(diff);
      // 역풍(align<0)일 때만 headwindPenaltyMul을 곱해 역풍 페널티를 완화한다 — 순풍 보너스는
      // 그대로 둔다(역풍 극복 스킬은 "거슬러 갈 때"만 도와주는 게 맞다).
      const bonus = (align >= 0 ? align * 0.25 : align * 0.35 * this.headwindPenaltyMul) * wind.strength * this.windSensitivity;
      this.windMul = 1 + bonus;
    } else {
      this.windMul = 1;
    }

    const notchSpeed = this.notchSpeed;
    const turnRateBase = degToRad(this.shipDef.turnRate) * this.combatTurnMul;
    const maxSpeed = notchSpeed * MAX_FWD * this.speedMul * this.windMul * this.crewSpeedMul * this.combatSpeedMul;
    const speedFactor = 0.35 + 0.65 * Math.min(1, Math.abs(this.curSpeed) / maxSpeed);
    const dir = this.curSpeed < 0 ? -1 : 1;
    const targetTurnRate = this.turnInput * turnRateBase * speedFactor * dir;
    const maxTurnStep = this.turnAccel * delta;
    this.curTurnRate += clamp(targetTurnRate - this.curTurnRate, -maxTurnStep, maxTurnStep);
    this.heading += this.curTurnRate * delta;

    const targetSpeed = this.notch * notchSpeed * this.speedMul * this.windMul * this.crewSpeedMul * this.combatSpeedMul;
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
