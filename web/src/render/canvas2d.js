// 고해상도 Canvas2D 렌더링 공용 인프라.
// - Camera2D: 플레이어를 따라가는 탑뷰 카메라(위치 + 줌). 회전 없음(항상 북쪽이 위).
// - HighResolutionSurface: 게임 좌표계는 유지하면서 실제 디스플레이 해상도로 렌더링한다.

export const LOGICAL_W = 480;
export const LOGICAL_H = 270;

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

// 480×270 논리 좌표계를 유지하되 백킹 캔버스는 실제 디스플레이 픽셀에 맞춘다.
// 따라서 게임의 시야·충돌·입력 좌표는 그대로이고, 선·곡선·텍스트·이미지만 고해상도로 그려진다.
export class HighResolutionSurface {
  constructor(logicalW, logicalH) {
    this.logicalW = logicalW;
    this.logicalH = logicalH;
    this.canvas = document.createElement('canvas');
    this.ctx = null;
    this.resizeForDisplay(logicalW, logicalH);
  }

  resizeForDisplay(displayW, displayH) {
    // 초고해상도 모니터에서도 두 캔버스가 과도한 메모리를 점유하지 않도록 약 4K 픽셀 수로 제한한다.
    const safeW = Math.max(this.logicalW, Math.round(displayW));
    const safeH = Math.max(this.logicalH, Math.round(displayH));
    const maxPixels = 3840 * 2160;
    const fit = Math.min(1, Math.sqrt(maxPixels / (safeW * safeH)));
    const backingW = Math.max(this.logicalW, Math.round(safeW * fit));
    const backingH = Math.max(this.logicalH, Math.round(safeH * fit));
    if (this.canvas.width === backingW && this.canvas.height === backingH && this.ctx) return;

    this.canvas.width = backingW;
    this.canvas.height = backingH;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.setTransform(backingW / this.logicalW, 0, 0, backingH / this.logicalH, 0, 0);
  }

  blitTo(displayCtx, dw, dh) {
    displayCtx.save();
    displayCtx.setTransform(1, 0, 0, 1, 0, 0);
    displayCtx.clearRect(0, 0, dw, dh);
    displayCtx.imageSmoothingEnabled = true;
    displayCtx.imageSmoothingQuality = 'high';
    displayCtx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height, 0, 0, dw, dh);
    displayCtx.restore();
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
  // 스프라이트 자체를 찌그러뜨리지 않고 회전만 시켜 아이소메트릭 방향을 근사한다.
  facingAngle(heading) {
    const wx = Math.sin(heading), wz = Math.cos(heading);
    const fx = (wx - wz) * this.scaleX;
    const fy = (wx + wz) * this.scaleY;
    return Math.atan2(-fx, fy);
  }
}
