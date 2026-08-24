import * as THREE from 'three';

// 낮/밤 사이클 + 폭풍 상태를 함께 관리한다. 매 프레임 update()를 부르면
// 하늘/안개/조명 색상, 태양 위치, 폭풍 세기(0~1, 부드럽게 전환)를 갱신해 둔다 —
// seaScene은 이 값들을 읽어 scene.background/fog/light와 Wind(바람) 객체에 반영한다.
const DAY_CYCLE_SECONDS = 600; // 게임 내 하루 = 실제 10분
const STORM_CLEAR_MIN = 100, STORM_CLEAR_MAX = 220; // 맑은 날씨 지속 시간(초)
const STORM_DURATION_MIN = 45, STORM_DURATION_MAX = 95; // 폭풍 지속 시간(초)
const STORM_TRANSITION_RATE = 0.15; // stormIntensity가 목표치로 수렴하는 속도

// 태양 고도(sunY, -1~1)에 따른 색상 보간 기준점들 — 밤(어둡고 푸른)→여명/황혼(따뜻한 주황)→낮(밝은 하늘색)
const SKY_NIGHT = new THREE.Color('#0a1220');
const SKY_TWILIGHT = new THREE.Color('#e0906a');
const SKY_DAY = new THREE.Color('#bcd6e0');
const FOG_NIGHT = new THREE.Color('#060a14');
const FOG_TWILIGHT = new THREE.Color('#c97a52');
const FOG_DAY = new THREE.Color('#bcd6e0');
const SUN_NIGHT = new THREE.Color('#3a4a6a');
const SUN_TWILIGHT = new THREE.Color('#ffb774');
const SUN_DAY = new THREE.Color('#fff3d6');
const HEMI_SKY_NIGHT = new THREE.Color('#1a2438');
const HEMI_SKY_DAY = new THREE.Color('#dff0ff');
const HEMI_GROUND_NIGHT = new THREE.Color('#050a08');
const HEMI_GROUND_DAY = new THREE.Color('#1a3a2a');

const STORM_SKY = new THREE.Color('#3c454c');
const STORM_FOG = new THREE.Color('#3a4247');

function blend3(night, twilight, day, s) {
  // s: 0(자정) ~ 1(정오) ~ 0(자정) 형태가 아니라, 아래 sunY 기반 t(0~1, 0=한밤,0.5=여명/황혼,1=대낮)를 받는다.
  const c = new THREE.Color();
  if (s < 0.5) c.copy(night).lerp(twilight, s * 2);
  else c.copy(twilight).lerp(day, (s - 0.5) * 2);
  return c;
}

export class WeatherSystem {
  constructor() {
    this.dayTimer = DAY_CYCLE_SECONDS * 0.3; // 아침 시간대 근처에서 시작
    this.stormActive = false;
    this.stormIntensity = 0;
    this._stormTimer = STORM_CLEAR_MIN + Math.random() * (STORM_CLEAR_MAX - STORM_CLEAR_MIN);

    this.sunColor = SUN_DAY.clone();
    this.skyColor = SKY_DAY.clone();
    this.fogColor = FOG_DAY.clone();
    this.hemiSky = HEMI_SKY_DAY.clone();
    this.hemiGround = HEMI_GROUND_DAY.clone();
    this.sunIntensity = 1.2;
    this.hemiIntensity = 0.9;
    this.sunDir = new THREE.Vector3(0.4, 0.8, 0.3);
    this.fogNear = 300;
    this.fogFar = 2600;
  }

  get dayPhase() { return (this.dayTimer % DAY_CYCLE_SECONDS) / DAY_CYCLE_SECONDS; }
  get isNight() { return this.sunDir.y < 0.05; }

  update(delta) {
    this.dayTimer += delta;
    const angle = this.dayPhase * Math.PI * 2;
    const sunY = Math.sin(angle - Math.PI / 2);
    this.sunDir.set(Math.cos(angle - Math.PI / 2), Math.max(-0.15, sunY), Math.sin(angle * 0.7));

    // sunY(-1~1)를 0(한밤)~0.5(여명/황혼 부근)~1(대낮)로 리매핑
    const t = THREE.MathUtils.clamp((sunY + 1) / 1.5, 0, 1); // sunY=-1→0, sunY≈0.5→1(약간 빨리 낮이 됨)
    this.sunColor.copy(blend3(SUN_NIGHT, SUN_TWILIGHT, SUN_DAY, t));
    this.skyColor.copy(blend3(SKY_NIGHT, SKY_TWILIGHT, SKY_DAY, t));
    this.fogColor.copy(blend3(FOG_NIGHT, FOG_TWILIGHT, FOG_DAY, t));
    this.hemiSky.copy(HEMI_SKY_NIGHT).lerp(HEMI_SKY_DAY, t);
    this.hemiGround.copy(HEMI_GROUND_NIGHT).lerp(HEMI_GROUND_DAY, t);
    this.sunIntensity = THREE.MathUtils.lerp(0.12, 1.25, t);
    this.hemiIntensity = THREE.MathUtils.lerp(0.25, 0.95, t);

    // ---- 폭풍 상태 전이 ----
    this._stormTimer -= delta;
    if (this._stormTimer <= 0) {
      this.stormActive = !this.stormActive;
      this._stormTimer = this.stormActive
        ? STORM_DURATION_MIN + Math.random() * (STORM_DURATION_MAX - STORM_DURATION_MIN)
        : STORM_CLEAR_MIN + Math.random() * (STORM_CLEAR_MAX - STORM_CLEAR_MIN);
    }
    const stormTarget = this.stormActive ? 1 : 0;
    this.stormIntensity += (stormTarget - this.stormIntensity) * Math.min(1, delta * STORM_TRANSITION_RATE);

    // 폭풍이 심할수록 하늘/안개를 잿빛으로 덮고, 시야(fog far)를 크게 줄인다.
    this.skyColor.lerp(STORM_SKY, this.stormIntensity * 0.85);
    this.fogColor.lerp(STORM_FOG, this.stormIntensity * 0.85);
    this.sunIntensity *= THREE.MathUtils.lerp(1, 0.45, this.stormIntensity);
    this.hemiIntensity *= THREE.MathUtils.lerp(1, 0.6, this.stormIntensity);
    this.fogNear = THREE.MathUtils.lerp(300, 40, this.stormIntensity);
    this.fogFar = THREE.MathUtils.lerp(2600, 480, this.stormIntensity);
  }

  get label() {
    if (this.stormIntensity > 0.5) return '⛈ 폭풍';
    if (this.stormIntensity > 0.1) return '🌥 흐림';
    if (this.isNight) return '🌙 밤';
    return '☀ 맑음';
  }
}

// 폭풍 중에만 보이는 단순 비 파티클 — 카메라 주변 원통형 볼륨 안에서 계속 떨어지다가
// 바닥에 닿으면 위쪽으로 재배치되는 순환 구조.
const RAIN_COUNT = 800;
const RAIN_RADIUS = 60;
const RAIN_HEIGHT = 40;
const RAIN_FALL_SPEED = 38;

export class RainEffect {
  constructor() {
    const positions = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * RAIN_RADIUS * 2;
      positions[i * 3 + 1] = Math.random() * RAIN_HEIGHT;
      positions[i * 3 + 2] = (Math.random() - 0.5) * RAIN_RADIUS * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: '#cfe0ea', size: 0.28, transparent: true, opacity: 0.55, sizeAttenuation: true });
    this.points = new THREE.Points(geo, mat);
    this.points.visible = false;
    this.points.frustumCulled = false;
  }

  update(delta, intensity, cameraAnchor) {
    this.points.visible = intensity > 0.08;
    if (!this.points.visible) return;
    this.points.material.opacity = 0.15 + intensity * 0.5;
    this.points.position.set(cameraAnchor.x, 0, cameraAnchor.z);
    const posAttr = this.points.geometry.attributes.position;
    for (let i = 0; i < RAIN_COUNT; i++) {
      let y = posAttr.getY(i) - RAIN_FALL_SPEED * delta;
      if (y < 0) y = RAIN_HEIGHT;
      posAttr.setY(i, y);
    }
    posAttr.needsUpdate = true;
  }
}
