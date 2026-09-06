import { Color, blend3Colors } from '../util/color.js';
import { clamp, lerp } from '../util/math2d.js';

// 낮/밤 사이클 + 폭풍 상태를 함께 관리한다. 매 프레임 update()를 부르면 하늘/바다 틴트 색상과
// 밝기, 폭풍 세기(0~1, 부드럽게 전환)를 갱신해 둔다 — seaScene은 이 값을 화면 오버레이/틴트로 쓴다.
const DAY_CYCLE_SECONDS = 60; // 게임 내 하루(항해일자 1일) = 실제 1분
const STORM_CLEAR_MIN = 100, STORM_CLEAR_MAX = 220;
const STORM_DURATION_MIN = 45, STORM_DURATION_MAX = 95;
const STORM_TRANSITION_RATE = 0.15;
// 안개는 폭풍과 독립된 별도의 기상 상태다(폭풍처럼 시야를 줄이지만, 위험이 아니라 은신
// 기회를 준다 — 아래 fogVisMul 참고). 폭풍과 동시에 존재하면 의미가 흐려지므로 폭풍
// 중에는 안개 판정을 건너뛰고, 폭풍이 시작되면 안개는 즉시 걷힌다.
const FOG_CLEAR_MIN = 90, FOG_CLEAR_MAX = 210;
const FOG_DURATION_MIN = 30, FOG_DURATION_MAX = 70;
const FOG_TRANSITION_RATE = 0.2;

const SKY_NIGHT = new Color('#0a1220');
const SKY_TWILIGHT = new Color('#e0906a');
const SKY_DAY = new Color('#bcd6e0');
const STORM_SKY = new Color('#3c454c');
const FOG_SKY = new Color('#ccd2d4');

export class WeatherSystem {
  constructor(initialDayTimer) {
    // 저장된 값이 있으면 이어서(세이브에 담긴 state.dayTimer), 없으면 아침 시간대 근처에서 시작.
    this.dayTimer = typeof initialDayTimer === 'number' ? initialDayTimer : DAY_CYCLE_SECONDS * 0.3;
    this.stormActive = false;
    this.stormIntensity = 0;
    this._stormTimer = STORM_CLEAR_MIN + Math.random() * (STORM_CLEAR_MAX - STORM_CLEAR_MIN);
    this.fogActive = false;
    this.fogIntensity = 0;
    this._fogTimer = FOG_CLEAR_MIN + Math.random() * (FOG_CLEAR_MAX - FOG_CLEAR_MIN);

    this.skyColor = SKY_DAY.clone();
    this.brightness = 1; // 0(한밤)~1(대낮) — 스프라이트/바다 밝기 곱연산에 쓴다
    this.sunElevation = 0.6; // -1..1, 예전 sunDir.y 역할
    this.visRange = 1; // 폭풍·안개일수록 줄어드는 시야 배율(렌더용)
  }

  get dayPhase() { return (this.dayTimer % DAY_CYCLE_SECONDS) / DAY_CYCLE_SECONDS; }
  get isNight() { return this.sunElevation < 0.05; }
  // 항해일자 — 정수로 1일차부터 표시(가상 시간, 1일 = 실제 1분).
  get voyageDay() { return 1 + Math.floor(this.dayTimer / DAY_CYCLE_SECONDS); }

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

    // 안개는 폭풍과 겹치지 않는다 — 폭풍 중엔 판정을 건너뛰고, 폭풍이 막 시작됐다면 즉시 걷는다.
    if (this.stormActive) {
      if (this.fogActive) this.fogActive = false;
    } else {
      this._fogTimer -= delta;
      if (this._fogTimer <= 0) {
        this.fogActive = !this.fogActive;
        this._fogTimer = this.fogActive
          ? FOG_DURATION_MIN + Math.random() * (FOG_DURATION_MAX - FOG_DURATION_MIN)
          : FOG_CLEAR_MIN + Math.random() * (FOG_CLEAR_MAX - FOG_CLEAR_MIN);
      }
    }
    const fogTarget = this.fogActive ? 1 : 0;
    this.fogIntensity += (fogTarget - this.fogIntensity) * Math.min(1, delta * FOG_TRANSITION_RATE);

    this.skyColor.lerp(STORM_SKY, this.stormIntensity * 0.85);
    this.skyColor.lerp(FOG_SKY, this.fogIntensity * 0.6);
    this.brightness *= lerp(1, 0.55, this.stormIntensity);
    this.brightness *= lerp(1, 0.82, this.fogIntensity); // 안개는 폭풍만큼 어둡진 않고 뿌옇기만 하다
    this.visRange = lerp(1, 0.4, this.stormIntensity) * lerp(1, 0.55, this.fogIntensity);
  }

  // 전투/항해 판정용 시야 배율 — 안개가 짙을수록 서로를 늦게 알아챈다(폭풍은 시야보다는
  // 파도·바람이 문제이므로 이 배율에는 관여하지 않는다). 1=평시, 낮을수록 더 안 보인다.
  get fogVisMul() { return lerp(1, 0.45, this.fogIntensity); }

  // 폭풍(위험+보상)·안개(트레이드오프)와 짝을 이루는 "좋은 날씨" — 둘 다 거의 없을 때만
  // true. 위험 없는 순수 회복 보너스(scenes/seaScene.js _processFairWeather)의 조건이다.
  get isFairWeather() { return this.stormIntensity < 0.1 && this.fogIntensity < 0.1; }

  get label() {
    if (this.stormIntensity > 0.5) return '⛈ 폭풍';
    if (this.fogIntensity > 0.5) return '🌫 안개';
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
