import { Color, blend3Colors } from '../util/color.js';
import { clamp, lerp } from '../util/math2d.js';

// 낮/밤 사이클 + 폭풍 상태를 함께 관리한다. 매 프레임 update()를 부르면 하늘/바다 틴트 색상과
// 밝기, 폭풍 세기(0~1, 부드럽게 전환)를 갱신해 둔다 — seaScene은 이 값을 화면 오버레이/틴트로 쓴다.
const DAY_CYCLE_SECONDS = 600; // 게임 내 하루 = 실제 10분
const STORM_CLEAR_MIN = 100, STORM_CLEAR_MAX = 220;
const STORM_DURATION_MIN = 45, STORM_DURATION_MAX = 95;
const STORM_TRANSITION_RATE = 0.15;

const SKY_NIGHT = new Color('#0a1220');
const SKY_TWILIGHT = new Color('#e0906a');
const SKY_DAY = new Color('#bcd6e0');
const STORM_SKY = new Color('#3c454c');

export class WeatherSystem {
  constructor() {
    this.dayTimer = DAY_CYCLE_SECONDS * 0.3; // 아침 시간대 근처에서 시작
    this.stormActive = false;
    this.stormIntensity = 0;
    this._stormTimer = STORM_CLEAR_MIN + Math.random() * (STORM_CLEAR_MAX - STORM_CLEAR_MIN);

    this.skyColor = SKY_DAY.clone();
    this.brightness = 1; // 0(한밤)~1(대낮) — 스프라이트/바다 밝기 곱연산에 쓴다
    this.sunElevation = 0.6; // -1..1, 예전 sunDir.y 역할
    this.visRange = 1; // 폭풍일수록 줄어드는 시야 배율(안개 반경 대용)
  }

  get dayPhase() { return (this.dayTimer % DAY_CYCLE_SECONDS) / DAY_CYCLE_SECONDS; }
  get isNight() { return this.sunElevation < 0.05; }

  update(delta) {
    this.dayTimer += delta;
    const angle = this.dayPhase * Math.PI * 2;
    const sunY = Math.sin(angle - Math.PI / 2);
    this.sunElevation = sunY;

    const t = clamp((sunY + 1) / 1.5, 0, 1);
    this.skyColor.copy(blend3Colors(SKY_NIGHT, SKY_TWILIGHT, SKY_DAY, t));
    this.brightness = lerp(0.32, 1.15, t);

    this._stormTimer -= delta;
    if (this._stormTimer <= 0) {
      this.stormActive = !this.stormActive;
      this._stormTimer = this.stormActive
        ? STORM_DURATION_MIN + Math.random() * (STORM_DURATION_MAX - STORM_DURATION_MIN)
        : STORM_CLEAR_MIN + Math.random() * (STORM_CLEAR_MAX - STORM_CLEAR_MIN);
    }
    const stormTarget = this.stormActive ? 1 : 0;
    this.stormIntensity += (stormTarget - this.stormIntensity) * Math.min(1, delta * STORM_TRANSITION_RATE);

    this.skyColor.lerp(STORM_SKY, this.stormIntensity * 0.85);
    this.brightness *= lerp(1, 0.55, this.stormIntensity);
    this.visRange = lerp(1, 0.4, this.stormIntensity);
  }

  get label() {
    if (this.stormIntensity > 0.5) return '⛈ 폭풍';
    if (this.stormIntensity > 0.1) return '🌥 흐림';
    if (this.isNight) return '🌙 밤';
    return '☀ 맑음';
  }
}

// 폭풍 중에만 보이는 빗방울 — 화면 기준 좌표계에서 떨어지다 바닥에 닿으면 위로 재배치.
const RAIN_COUNT = 140;

export class RainEffect {
  constructor(logicalW, logicalH) {
    this.w = logicalW; this.h = logicalH;
    this.drops = Array.from({ length: RAIN_COUNT }, () => ({
      x: Math.random() * logicalW, y: Math.random() * logicalH, len: 3 + Math.random() * 4,
    }));
    this.visible = false;
    this.opacity = 0;
  }

  update(delta, intensity) {
    this.visible = intensity > 0.08;
    this.opacity = 0.15 + intensity * 0.55;
    if (!this.visible) return;
    const speed = 220 * (0.7 + intensity * 0.6);
    for (const d of this.drops) {
      d.y += speed * delta;
      d.x -= speed * 0.25 * delta;
      if (d.y > this.h) { d.y = -5; d.x = Math.random() * this.w; }
      if (d.x < 0) d.x = this.w;
    }
  }
}
