// 실제 경위도를 게임 좌표로 투영하는 간이 등장방형(equirectangular) 투영.
// refLon/refLat을 원점으로 두고 도(度)당 SCALE 유닛만큼 배치한다.
// (정밀 지도 제작용이 아닌, "실제 유럽 대륙과 배치가 동일한" 스타일화된 항해 맵을 위한 근사치)
const SCALE = 45;
const REF_LON = 1.5;
const REF_LAT = 45;

export function project(lon, lat) {
  const x = (lon - REF_LON) * SCALE;
  const z = -(lat - REF_LAT) * SCALE; // 위도가 높을수록(북쪽) z가 음수
  return [x, z];
}

function projectAll(pairs) {
  return pairs.map(([lon, lat]) => project(lon, lat));
}

// 유럽 대륙(이베리아~프랑스~독일 북해안~이탈리아 반도) 단순화 해안선.
// 실제 좌표를 그대로 쓰지 않고 스타일화했지만, 각 도시의 실제 경위도와 같은
// 투영식을 공유하므로 상대적 배치(동서남북, 거리감)는 실제 지도와 일치한다.
export const MAINLAND_LONLAT = [
  [10.5, 54.0], // 함부르크 부근 북독일 해안
  [4.5, 53.2], // 네덜란드(암스테르담)
  [2.5, 51.3], // 벨기에
  [1.5, 51.0], // 칼레
  [-1.5, 49.5], // 노르망디
  [-4.5, 48.4], // 브르타뉴 끝
  [-1.5, 46.0], // 비스케이만
  [-1.8, 43.5], // 비스케이만 남단(스페인 국경)
  [-8.9, 41.8], // 포르투갈 북부
  [-9.4, 38.7], // 리스본 서안
  [-8.9, 37.0], // 알가르브
  [-5.4, 36.1], // 지브롤터
  [-3.5, 36.5], // 스페인 남부 지중해
  [-0.3, 38.3], // 알리칸테
  [2.2, 41.4], // 바르셀로나
  [3.1, 42.5], // 스페인-프랑스 국경
  [5.0, 43.3], // 마르세유
  [7.3, 43.7], // 니스
  [8.9, 44.2], // 제노바
  [10.5, 42.0], // 이탈리아 서안(투스카니)
  [11.5, 40.5], // 이탈리아 서안 남부
  [14.0, 40.3], // 이탈리아 남부(단순화된 발끝)
  [13.0, 42.5], // 이탈리아 동안(아드리아해)
  [12.3, 45.4], // 베네치아
  [13.6, 45.7], // 북아드리아(트리에스테 부근)
  [12.0, 47.5], // 알프스(내륙 경계 시작)
  [8.0, 48.5], // 독일 내륙(지도를 닫기 위한 임의 경계)
];

export const BRITAIN_LONLAT = [
  [-5.7, 50.0], // 콘월
  [-4.0, 50.2],
  [-1.5, 50.7],
  [0.7, 50.9], // 도버 해협
  [1.4, 52.6], // 이스트 앵글리아
  [-0.2, 53.7],
  [-1.2, 54.6],
  [-3.0, 55.8], // 잉글랜드 북부(스코틀랜드 이북은 생략)
  [-5.2, 55.0],
  [-6.5, 53.3], // 웨일스
  [-4.8, 51.5],
];

// 시드 기반 의사난수 — 매번 동일한 해안선 형태가 나오도록 결정적으로 생성
function makeRand(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// 각 변을 여러 구간으로 나누고 수직 방향으로 흔들어 자연스러운 굴곡을 만든다.
// 원래 꼭짓점(각 도시 인근의 기준점)에서는 흔들림이 0이 되도록 테이퍼링해
// 지리적 배치(투영 좌표)는 그대로 유지한 채 해안선만 다듬는다.
function jitterEdges(poly, segments, amount, rand) {
  const out = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const [ax, az] = poly[i];
    const [bx, bz] = poly[(i + 1) % n];
    const dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len, nz = dx / len;
    out.push([ax, az]);
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      const px = ax + dx * t, pz = az + dz * t;
      const taper = Math.sin(t * Math.PI); // 양 끝(원래 꼭짓점)에서 0
      const j = (rand() - 0.5) * 2 * amount * taper;
      out.push([px + nx * j, pz + nz * j]);
    }
  }
  return out;
}

function fractalCoastline(lonlatPairs, seed) {
  const rand = makeRand(seed);
  let poly = projectAll(lonlatPairs);
  poly = jitterEdges(poly, 5, 16, rand); // 큰 굴곡(만·곶)
  poly = jitterEdges(poly, 3, 5, rand); // 잔물결 같은 잔 디테일
  return poly;
}

export const MAINLAND_POLY = fractalCoastline(MAINLAND_LONLAT, 20260823);
export const BRITAIN_POLY = fractalCoastline(BRITAIN_LONLAT, 19470101);
export const LAND_POLYGONS = [MAINLAND_POLY, BRITAIN_POLY];

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
