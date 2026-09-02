// Three.js를 걷어낸 뒤 이전에 THREE.Vector2/THREE.MathUtils가 하던 역할을 대신하는
// 아주 작은 2D 벡터/수학 유틸. world 좌표는 항상 (x, y)로 표기하며, 기존 3D 시절의
// "world x, world z"를 그대로 이 (x, y)에 대응시킨다(관례만 유지, 값은 동일).
export class Vec2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  set(x, y) { this.x = x; this.y = y; return this; }
  copy(v) { this.x = v.x; this.y = v.y; return this; }
  clone() { return new Vec2(this.x, this.y); }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  length() { return Math.hypot(this.x, this.y); }
  lengthSq() { return this.x * this.x + this.y * this.y; }
  normalize() { const l = this.length() || 1; this.x /= l; this.y /= l; return this; }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y); }
}

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }

// 각도(라디안) 보간 — 최단 경로로 도는 방향을 자동으로 고른다.
export function lerpAngle(a, b, t) {
  let diff = b - a;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  return a + diff * t;
}
