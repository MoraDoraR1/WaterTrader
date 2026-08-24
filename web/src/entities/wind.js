import * as THREE from 'three';

// 세계 전역에 적용되는 바람 — 방향(rad, ship.heading과 동일한 관례)과 세기(0..1)를
// 목표치를 향해 아주 천천히 수렴시켜(급변 없이) 시간이 지나며 자연스럽게 바뀌게 한다.
// direction은 "바람이 불어오는 쪽"을 가리킨다(기상학 관례) — 배가 그 반대(불어가는 쪽,
// direction + PI)로 나아가면 순풍, 정반대로 나아가면 역풍이다.
const RETARGET_MIN = 25, RETARGET_MAX = 55; // 초 — 다음 변화까지 대기 시간
const DIR_DRIFT = 0.05; // 방향이 목표치로 수렴하는 속도(1/s에 가까운 스무딩 계수)
const STR_DRIFT = 0.06;

export class Wind {
  constructor() {
    this.direction = Math.random() * Math.PI * 2;
    this.strength = 0.35 + Math.random() * 0.5;
    this._targetDir = this.direction;
    this._targetStr = this.strength;
    this._timer = 6 + Math.random() * 10; // 시작하고 얼마 안 지나 첫 변화가 오도록
  }

  update(delta) {
    this._timer -= delta;
    if (this._timer <= 0) {
      this._timer = RETARGET_MIN + Math.random() * (RETARGET_MAX - RETARGET_MIN);
      this._targetDir = this.direction + (Math.random() - 0.5) * Math.PI * 1.1;
      this._targetStr = THREE.MathUtils.clamp(this.strength + (Math.random() - 0.5) * 0.7, 0.1, 1);
    }
    let diff = this._targetDir - this.direction;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.direction += diff * Math.min(1, delta * DIR_DRIFT);
    this.strength += (this._targetStr - this.strength) * Math.min(1, delta * STR_DRIFT);
  }

  // 바람이 불어가는(=배를 밀어주는) 절대 방향
  get towardDirection() { return this.direction + Math.PI; }
}
