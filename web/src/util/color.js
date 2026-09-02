// THREE.Color를 대신하는 초소형 RGB 보간 유틸(0~255 정수 채널, CSS 문자열로 변환).
export class Color {
  constructor(hex) { this.r = 0; this.g = 0; this.b = 0; if (hex) this.set(hex); }
  set(hex) {
    const h = hex.replace('#', '');
    this.r = parseInt(h.slice(0, 2), 16);
    this.g = parseInt(h.slice(2, 4), 16);
    this.b = parseInt(h.slice(4, 6), 16);
    return this;
  }
  copy(c) { this.r = c.r; this.g = c.g; this.b = c.b; return this; }
  clone() { return new Color().copy(this); }
  lerp(c, t) { this.r += (c.r - this.r) * t; this.g += (c.g - this.g) * t; this.b += (c.b - this.b) * t; return this; }
  toCss(alpha) {
    const r = Math.round(this.r), g = Math.round(this.g), b = Math.round(this.b);
    return alpha != null ? `rgba(${r},${g},${b},${alpha})` : `rgb(${r},${g},${b})`;
  }
}

export function blend3Colors(night, twilight, day, s) {
  const c = new Color();
  if (s < 0.5) c.copy(night).lerp(twilight, s * 2);
  else c.copy(twilight).lerp(day, (s - 0.5) * 2);
  return c;
}
