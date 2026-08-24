import * as THREE from 'three';

const VERT = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  // 3개 사인파를 합성한 간이 거스트너 파도 — 뱃멀미/해안 절벽 밑 빈공간 노출을 막기 위해
  // 진폭을 크게 낮춘 잔잔한 바다(파고 합 최대 약 2.0, 이전 대비 1/3 수준).
  vec3 wave(vec2 p) {
    float h = 0.0;
    h += sin(p.x * 0.012 + uTime * 1.1) * 0.7;
    h += sin(p.y * 0.018 - uTime * 0.8) * 0.45;
    h += sin((p.x + p.y) * 0.007 + uTime * 0.5) * 0.6;
    h += sin((p.x - p.y * 0.6) * 0.03 + uTime * 1.7) * 0.18;
    return vec3(0.0, h, 0.0);
  }

  void main() {
    vec3 pos = position;
    vec2 wp = (modelMatrix * vec4(pos, 1.0)).xz;
    vec3 disp = wave(wp);
    pos.y += disp.y;

    float e = 2.0;
    float hL = wave(wp + vec2(-e, 0.0)).y;
    float hR = wave(wp + vec2(e, 0.0)).y;
    float hD = wave(wp + vec2(0.0, -e)).y;
    float hU = wave(wp + vec2(0.0, e)).y;
    vec3 n = normalize(vec3(hL - hR, 2.0 * e, hD - hU));

    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    vNormal = normalize(mat3(modelMatrix) * n);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uCameraPos;
  uniform vec3 uSunDir;
  uniform float uLightMul;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  void main() {
    vec3 deep = vec3(0.02, 0.12, 0.24);
    vec3 shallow = vec3(0.08, 0.42, 0.5);
    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    float fresnel = pow(1.0 - clamp(dot(viewDir, vNormal), 0.0, 1.0), 3.0);

    float diff = clamp(dot(vNormal, uSunDir), 0.0, 1.0);
    vec3 base = mix(deep, shallow, diff * 0.6 + 0.25);

    vec3 halfV = normalize(uSunDir + viewDir);
    float spec = pow(clamp(dot(vNormal, halfV), 0.0, 1.0), 60.0) * clamp(uSunDir.y, 0.0, 1.0);

    vec3 skyTint = vec3(0.55, 0.72, 0.82);
    vec3 color = (mix(base, skyTint, fresnel * 0.55) + spec * 0.9) * uLightMul;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createOcean(size = 6000, segments = 220) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const uniforms = {
    uTime: { value: 0 },
    uCameraPos: { value: new THREE.Vector3() },
    uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
    uLightMul: { value: 1 },
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();

  function update(t, camera, sunDir, lightMul) {
    uniforms.uTime.value = t;
    uniforms.uCameraPos.value.copy(camera.position);
    if (sunDir) uniforms.uSunDir.value.copy(sunDir).normalize();
    if (lightMul != null) uniforms.uLightMul.value = lightMul;
  }

  // CPU측 파고 샘플링(배 흔들림/부표 계산용) — 셰이더와 동일한 함수(진폭도 동일하게 낮춤)
  function heightAt(x, z, t) {
    let h = 0;
    h += Math.sin(x * 0.012 + t * 1.1) * 0.7;
    h += Math.sin(z * 0.018 - t * 0.8) * 0.45;
    h += Math.sin((x + z) * 0.007 + t * 0.5) * 0.6;
    h += Math.sin((x - z * 0.6) * 0.03 + t * 1.7) * 0.18;
    return h;
  }

  return { mesh, update, heightAt };
}
