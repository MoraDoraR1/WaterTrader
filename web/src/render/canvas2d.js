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

// world(x,y) -> 논리 화면 좌표. pxPerUnit은 줌이 반영된 실제 축척.
export function worldToScreen(camera, pxPerUnit, wx, wy, screenW, screenH) {
  return {
    x: (wx - camera.x) * pxPerUnit + screenW / 2,
    y: (wy - camera.y) * pxPerUnit + screenH / 2,
  };
}
