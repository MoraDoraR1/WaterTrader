// 포탄 풀 — 2D 탑뷰라 포물선(중력) 대신 등속 직선 이동 + 사거리(life)로 근사한다.
// 렌더링은 하지 않는다(순수 시뮬레이션); seaScene의 그리기 패스가 this.balls를 순회해 점으로 그린다.
export class CannonballPool {
  constructor(maxBalls = 60) {
    this.maxBalls = maxBalls;
    this.balls = [];
  }

  // origin/dir: {x,y} — dir은 정규화되어 있어야 한다. dmg는 옵션 — 쏜 쪽이 자기만의
  // 데미지 값을 싣고 싶을 때만 넘긴다(예: NPC마다 배 종류별로 다른 위력). 안 넘기면
  // null로 남아, 맞은 쪽이 자기 기본값을 쓰면 된다.
  fire(origin, dir, speed, owner, dmg = null) {
    if (this.balls.length >= this.maxBalls) this.balls.shift();
    this.balls.push({
      x: origin.x, y: origin.y,
      vx: dir.x * speed, vy: dir.y * speed,
      life: 1.6,
      owner,
      dmg,
    });
  }

  update(delta, targets, onHit) {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.x += b.vx * delta;
      b.y += b.vy * delta;
      b.life -= delta;

      let dead = b.life <= 0;
      if (!dead) {
        for (const target of targets) {
          if (target.owner === b.owner || target.dead) continue;
          const d = Math.hypot(target.position.x - b.x, target.position.y - b.y);
          if (d < target.radius) {
            onHit(target, b);
            dead = true;
            break;
          }
        }
      }
      if (dead) this.balls.splice(i, 1);
    }
  }
}
