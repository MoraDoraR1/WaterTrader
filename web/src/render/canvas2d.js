// 2D 픽셀아트 렌더링 공용 인프라.
// - makeSprite: 작은 오프스크린 캔버스에 한 번만 그려두고 매 프레임 재사용하는 스프라이트 캐시.
// - Camera2D: 플레이어를 따라가는 탑뷰 카메라(위치 + 줌). 회전 없음(항상 북쪽이 위).
// - PixelSurface: "논리 해상도"로 그린 뒤 화면 크기로 확대 블릿해 도트 특유의 계단현상을 낸다.

export const LOGICAL_W = 480;
export const LOGICAL_H = 270;

export function makeSprite(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  draw(ctx, w, h);
  return canvas;
}

const spriteCache = new Map();
export function cachedSprite(key, w, h, draw) {
  let s = spriteCache.get(key);
  if (!s) { s = makeSprite(w, h, draw); spriteCache.set(key, s); }
  return s;
}

export class Camera2D {
  constructor() {
    this.x = 0; this.y = 0;
    this.zoom = 1; // 논리 픽셀당 월드 단위 축척 배율(1 = 기준)
    this.minZoom = 0.5; this.maxZoom = 2.4;
  }
  follow(targetX, targetY, delta, speed = 6) {
    const t = Math.min(1, delta * speed);
    this.x += (targetX - this.x) * t;
    this.y += (targetY - this.y) * t;
  }
  snapTo(x, y) { this.x = x; this.y = y; }
}

// 논리 해상도 캔버스를 만들고, 실제 화면 캔버스로 확대(스무딩 없이) 그려주는 헬퍼.
export class PixelSurface {
  constructor(logicalW, logicalH) {
    this.logicalW = logicalW;
    this.logicalH = logicalH;
    this.canvas = document.createElement('canvas');
    this.canvas.width = logicalW;
    this.canvas.height = logicalH;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
  }
  blitTo(displayCtx, dw, dh) {
    displayCtx.imageSmoothingEnabled = false;
    displayCtx.drawImage(this.canvas, 0, 0, this.logicalW, this.logicalH, 0, 0, dw, dh);
  }
}

// world(x,y) -> 논리 화면 좌표(정투영, 위에서 수직으로 내려다보는 탑뷰). 더 이상 씬 렌더링에는
// 쓰이지 않지만(대각선 뷰로 교체) 다른 용도(월드맵 등)를 위해 남겨둔다.
export function worldToScreen(camera, pxPerUnit, wx, wy, screenW, screenH) {
  return {
    x: (wx - camera.x) * pxPerUnit + screenW / 2,
    y: (wy - camera.y) * pxPerUnit + screenH / 2,
  };
}

// ---- 대각선(2:1 아이소메트릭풍) 투영 ----
// world(x,z) 평면을 45° 돌려 내려다보되 세로를 절반으로 눌러 마름모 격자로 만든다.
// screenX = (x - z) * scaleX, screenY = (x + z) * scaleY (scaleY < scaleX)
export class IsoProjection {
  constructor(scaleX = 3.0, scaleYRatio = 0.55) {
    this.scaleX = scaleX;
    this.scaleY = scaleX * scaleYRatio;
  }
  toScreen(camera, wx, wz, screenW, screenH) {
    const dx = wx - camera.x, dz = wz - camera.y;
    return {
      x: (dx - dz) * this.scaleX + screenW / 2,
      y: (dx + dz) * this.scaleY + screenH / 2,
    };
  }
  // 화면(스크린) 좌표 -> world(x,z) 역변환 — 클릭 좌표를 월드로 되돌릴 때 쓴다.
  toWorld(camera, sx, sy, screenW, screenH) {
    const lx = (sx - screenW / 2) / this.scaleX;
    const ly = (sy - screenH / 2) / this.scaleY;
    // lx = dx - dz, ly = dx + dz  =>  dx = (lx+ly)/2, dz = (ly-lx)/2
    const dx = (lx + ly) / 2, dz = (ly - lx) / 2;
    return { x: dx + camera.x, z: dz + camera.y };
  }
  // 월드 heading(순수 탑뷰 기준 회전각)을 이 투영에서 실제로 보이는 화면상 각도로 근사 변환한다.
  // 스프라이트 자체를 찌그러뜨리지 않고 "회전"만 시켜 근사하는 픽셀아트 아이소메트릭 관례.
  facingAngle(heading) {
    const wx = Math.sin(heading), wz = Math.cos(heading);
    const fx = (wx - wz) * this.scaleX;
    const fy = (wx + wz) * this.scaleY;
    return Math.atan2(-fx, fy);
  }
}
