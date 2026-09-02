// 도시 씬 캐릭터 이동 로직 — 메시 결합 없는 순수 로직판. 탑뷰라 카메라 회전이 없으므로
// WASD는 항상 월드 절대 방향(북/남/동/서)이다(예전처럼 카메라 yaw를 더하지 않는다).
import { Vec2, clamp, lerpAngle } from '../util/math2d.js';

export class CharacterController {
  constructor() {
    this.pos = new Vec2(0, 0);
    this.facing = 0;
    this.moveTarget = null;
    this.speed = 4.6;
    this.turnSpeed = 10;
    this.walking = false;
    this.radius = 0.6;
  }

  setPosition(x, z) { this.pos.set(x, z); }
  moveTo(x, z) { this.moveTarget = new Vec2(x, z); }
  cancelMoveTarget() { this.moveTarget = null; }

  update(delta, inputVec, bounds, obstacles) {
    let moveX = 0, moveZ = 0;
    this.walking = false;

    if (inputVec.x * inputVec.x + inputVec.y * inputVec.y > 0.0001) {
      this.moveTarget = null;
      const angle = Math.atan2(inputVec.x, inputVec.y);
      moveX = Math.sin(angle);
      moveZ = Math.cos(angle);
      this.walking = true;
    } else if (this.moveTarget) {
      const dx = this.moveTarget.x - this.pos.x;
      const dz = this.moveTarget.y - this.pos.y;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.3) {
        moveX = dx / dist;
        moveZ = dz / dist;
        this.walking = true;
      } else {
        this.moveTarget = null;
      }
    }

    if (this.walking) {
      this.pos.x += moveX * this.speed * delta;
      this.pos.y += moveZ * this.speed * delta;
      if (bounds) {
        this.pos.x = clamp(this.pos.x, bounds.minX, bounds.maxX);
        this.pos.y = clamp(this.pos.y, bounds.minZ, bounds.maxZ);
      }
      if (obstacles) this._resolveObstacles(obstacles);
      const targetFacing = Math.atan2(moveX, moveZ);
      this.facing = lerpAngle(this.facing, targetFacing, Math.min(1, this.turnSpeed * delta));
    }
  }

  // obstacles: { minX, maxX, minZ, maxZ } 사각형 배열(건물) — 원-사각형 충돌로 밀어낸다.
  _resolveObstacles(boxes) {
    const r = this.radius || 0.5;
    for (const box of boxes) {
      const closestX = clamp(this.pos.x, box.minX, box.maxX);
      const closestZ = clamp(this.pos.y, box.minZ, box.maxZ);
      let dx = this.pos.x - closestX;
      let dz = this.pos.y - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq >= r * r) continue;
      if (distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        this.pos.x = closestX + (dx / dist) * r;
        this.pos.y = closestZ + (dz / dist) * r;
      } else {
        const cx = (box.minX + box.maxX) / 2, cz = (box.minZ + box.maxZ) / 2;
        const penX = box.maxX - box.minX, penZ = box.maxZ - box.minZ;
        if (penX < penZ) this.pos.x = this.pos.x < cx ? box.minX - r : box.maxX + r;
        else this.pos.y = this.pos.y < cz ? box.minZ - r : box.maxZ + r;
      }
    }
  }
}
