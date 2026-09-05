// 실제 경위도를 게임 좌표로 투영하는 간이 등장방형(equirectangular) 투영.
// refLon/refLat을 원점으로 두고 도(度)당 SCALE 유닛만큼 배치한다.
// (항해가 너무 짧다는 피드백으로 45→90→140까지 키웠다 — shipController.js의 순항 속도도
//  함께 조정해, 인접 항구는 적당히, 대륙 간 항로는 확실히 "긴 항해"로 느껴지게 했다.)
const SCALE = 140;
const REF_LON = 1.5;
const REF_LAT = 45;

export function project(lon, lat) {
  const x = (lon - REF_LON) * SCALE;
  const z = -(lat - REF_LAT) * SCALE; // 위도가 높을수록(북쪽) z가 음수
  return [x, z];
}

// project()의 역함수 — 게임 좌표 -> 경위도(월드맵 격자선 라벨 등에 사용).
export function unproject(x, z) {
  const lon = x / SCALE + REF_LON;
  const lat = REF_LAT - z / SCALE;
  return [lon, lat];
}

function projectAll(pairs) {
  return pairs.map(([lon, lat]) => project(lon, lat));
}

// ---- 대륙/섬 윤곽 — 실제 세계 해안선(data/realCoastlineData.js 참고) ----
// Natural Earth 1:50m Land(공개 도메인) 데이터를 게임 세계 범위(대서양~인도양 권역)로 잘라내고
// Douglas-Peucker로 단순화한 것 — 손으로 그린 근사 도형이 아니라 실제 지구 해안선 좌표다.
import { REAL_COASTLINE_LONLAT } from './realCoastlineData.js';

export const LAND_POLYGONS = REAL_COASTLINE_LONLAT.map(projectAll);

// 모든 도시 주변에 배가 항상 안전하게 접근할 수 있는 원형 개방 수역을 보장하는 반경 —
// 실제 해안선(Natural Earth)을 그대로 쓰면 강 하구 항구(리스본의 테주강 하구 등)는 게임
// 축척에서 진입로가 배 한 척 겨우 지날 폭으로 좁아진다(지리적으로는 사실이지만 게임플레이로는
// "육지가 항구를 막고 있다"는 느낌만 준다). 폴리곤 좌표 자체를 깎는 대신(복잡한 만 지형에서
// 변이 스스로 교차하는 등 부작용 위험이 크다) seaScene.js가 이 반경 안을 충돌 판정·렌더링
// 양쪽에서 통째로 "항상 바다"로 취급해 도시마다 확실히 열린 만을 보장한다.
export const HARBOR_CLEAR_RADIUS = 60; // 도시 간 최소 거리(125유닛)의 절반 미만이라 서로 겹치지 않는다.

// 레이 캐스팅 알고리즘 기반 점-폴리곤 내부 판정 (x,z 평면)
export function pointInPolygon(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    const intersect = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointOnAnyLand(x, z) {
  return LAND_POLYGONS.some((poly) => pointInPolygon(x, z, poly));
}

function pointToSegmentDistance(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  let t = lenSq > 0 ? ((px - ax) * dx + (pz - az) * dz) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + dx * t, cz = az + dz * t;
  return Math.hypot(px - cx, pz - cz);
}

// 해안선까지의 최단 거리(버텍스 컬러 그라데이션, 언덕 배치 여백 확보 등에 사용)
export function distanceToPolygonEdge(x, z, poly) {
  let minD = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const d = pointToSegmentDistance(x, z, poly[j][0], poly[j][1], poly[i][0], poly[i][1]);
    if (d < minD) minD = d;
  }
  return minD;
}
