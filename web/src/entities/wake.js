// 항적 거품 자국 — 순수 데이터만 들고 있고(위치/수명/크기), 그리기는 seaScene 렌더 패스가 맡는다.
export class WakeTrail {
  constructor(maxPuffs = 60) {
    this.maxPuffs = maxPuffs;
    this.puffs = [];
  }

  spawn(x, y, baseScale = 1, life = 2.4) {
    if (this.puffs.length >= this.maxPuffs) this.puffs.shift();
    this.puffs.push({ x, y, life, maxLife: life, baseScale });
  }

  update(delta) {
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.life -= delta;
      if (p.life <= 0) { this.puffs.splice(i, 1); continue; }
      const t = 1 - p.life / p.maxLife;
      p.scale = p.baseScale * (0.4 + t * 1.5);
      p.opacity = 0.42 * (1 - t) * (1 - t * 0.25);
    }
  }
}
