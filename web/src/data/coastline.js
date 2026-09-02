// 실제 경위도를 게임 좌표로 투영하는 간이 등장방형(equirectangular) 투영.
// refLon/refLat을 원점으로 두고 도(度)당 SCALE 유닛만큼 배치한다.
// (정밀 지도 제작용이 아닌, "실제 지구와 배치가 동일한" 스타일화된 항해 맵을 위한 근사치.
//  전세계로 확장하면서 SCALE을 키워 도시간 항해 거리를 늘렸다 — 45→90.)
const SCALE = 90;
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

// ---- 대륙/섬 윤곽(경위도, 단순화) ----
// 실제 좌표를 그대로 쓰지 않고 스타일화했지만, 모든 도시와 같은 투영식을 공유하므로
// 상대적 배치(동서남북, 거리감)는 실제 지구본과 일치한다.

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

// 스칸디나비아 남부(발트해 폐곡을 위한 단순화 — 함부르크 항로의 북쪽 경계)
export const SCANDINAVIA_LONLAT = [
  [8.0, 58.0], // 오슬로피오르 입구
  [11.0, 59.0],
  [18.0, 59.5], // 스톡홀름 부근
  [23.0, 60.0], // 발트해 동안
  [24.5, 65.0], // 보스니아만 안쪽
  [21.0, 65.5],
  [11.0, 64.0], // 노르웨이 서안
  [5.5, 61.0],
  [8.0, 58.0],
];

// 북아프리카(모로코 대서양안 ~ 이집트 지중해안) — 지중해 남쪽 해안선.
export const NORTH_AFRICA_LONLAT = [
  [-9.7, 32.6], // 카사블랑카 부근
  [-6.8, 35.9], // 탕헤르
  [-5.3, 35.9], // 세우타(지브롤터 해협 남안)
  [-1.0, 36.8], // 오랑 부근
  [3.06, 36.77], // 알제
  [10.0, 36.8], // 튀니스 부근
  [11.2, 33.9], // 트리폴리 부근
  [20.0, 32.6], // 리비아 동부
  [25.1, 31.2], // 이집트 서부 해안
  [30.0, 31.4], // 나일 삼각주
  [34.0, 31.2], // 레반트 접경
  [34.5, 27.0], // 홍해 입구(단순화)
  [24.0, 22.0], // 내륙 사막 경계 시작
  [10.0, 22.0],
  [-4.0, 25.0],
  [-9.7, 32.6],
];

// 서아프리카(북아프리카 남쪽 ~ 기니만) — 희망봉 항로/엘미나 항 배경.
export const WEST_AFRICA_LONLAT = [
  [-16.9, 20.8], // 서사하라
  [-17.4, 14.7], // 다카르 부근
  [-16.0, 12.4], // 기니 해안
  [-11.5, 8.4], // 시에라리온
  [-7.6, 5.0], // 코트디부아르
  [-1.35, 5.08], // 엘미나(황금해안)
  [2.3, 6.4], // 베냉
  [8.3, 4.3], // 니제르 삼각주
  [9.5, 2.0], // 기니만 안쪽
  [12.0, -2.0], // 콩고 해안(단순화)
  [8.0, 15.0], // 내륙 경계
  [-8.0, 22.0],
  [-16.9, 20.8],
];

// 희망봉(남아프리카 남단) — 항로의 상징적 랜드마크, 포구 없이 지형만.
export const CAPE_LONLAT = [
  [16.0, -29.0],
  [18.4, -34.4], // 희망봉
  [22.0, -34.2],
  [27.9, -32.6], // 남아공 동안
  [32.5, -27.0], // 모잠비크 방향
  [30.0, -20.0],
  [16.0, -20.0], // 내륙 경계
  [16.0, -29.0],
];

// 북아메리카 동안(노바스코샤 ~ 플로리다) — 뉴암스테르담 배경.
export const NORTH_AMERICA_EAST_LONLAT = [
  [-64.0, 45.0], // 노바스코샤
  [-70.0, 43.5], // 보스턴 부근
  [-74.0, 40.7], // 뉴암스테르담(뉴욕)
  [-75.3, 38.8], // 델라웨어만
  [-76.3, 36.9], // 체서피크
  [-79.0, 33.8], // 캐롤라이나
  [-81.2, 30.3], // 조지아
  [-80.3, 25.8], // 플로리다 동안
  [-81.8, 24.6], // 플로리다 키스
  [-83.0, 27.5], // 플로리다 서안
  [-84.5, 30.5], // 멕시코만 연안
  [-88.0, 30.5],
  [-90.0, 41.0], // 내륙 경계
  [-72.0, 46.0],
  [-64.0, 45.0],
];

export const CUBA_LONLAT = [
  [-84.9, 21.8],
  [-82.4, 23.13], // 아바나
  [-79.5, 22.7],
  [-77.0, 20.9],
  [-74.5, 20.2],
  [-77.5, 19.9],
  [-81.0, 19.8],
  [-84.0, 21.5],
  [-84.9, 21.8],
];

export const HISPANIOLA_LONLAT = [
  [-74.4, 19.9],
  [-72.0, 19.9],
  [-69.9, 18.2],
  [-71.7, 17.6],
  [-73.5, 18.4],
  [-74.4, 19.9],
];

// 남아메리카 동안(아마존 하구 ~ 리우 남쪽) — 사우바도르(바이아) 배경.
export const SOUTH_AMERICA_EAST_LONLAT = [
  [-50.0, 4.5], // 아마존 하구
  [-44.5, -2.5], // 브라질 동북단
  [-38.5, -12.97], // 사우바도르
  [-39.5, -17.0],
  [-40.5, -20.3],
  [-43.2, -22.9], // 리우 부근
  [-48.5, -27.0], // 남부 브라질
  [-58.0, -34.0], // 라플라타 하구(단순화)
  [-64.0, -30.0], // 내륙 경계
  [-62.0, -5.0],
  [-50.0, 4.5],
];

// 인도 서안(고아 배경).
export const INDIA_WEST_LONLAT = [
  [72.8, 21.1], // 구자라트
  [72.8, 19.0], // 뭄바이 부근
  [73.83, 15.30], // 고아
  [75.3, 11.9], // 망갈로르 부근
  [76.9, 8.3], // 코모린곶
  [79.8, 9.3], // 동안으로 전환
  [78.5, 17.0], // 내륙 경계
  [76.0, 22.0],
  [72.8, 21.1],
];

// 말레이 반도 남단(믈라카 배경).
export const MALAY_LONLAT = [
  [100.4, 7.0],
  [100.2, 5.4],
  [102.25, 2.20], // 믈라카
  [103.8, 1.4],
  [104.2, 1.3],
  [103.5, 3.8],
  [101.0, 6.0],
  [100.4, 7.0],
];

// 규슈 서안(나가사키 배경).
export const JAPAN_LONLAT = [
  [129.4, 33.9],
  [130.4, 33.6],
  [130.9, 32.9],
  [130.2, 32.0],
  [129.87, 32.75], // 나가사키
  [129.3, 32.7],
  [129.2, 33.3],
  [129.4, 33.9],
];

// 지중해 동부(아나톨리아/에게해) — 이스탄불 배경.
export const ANATOLIA_LONLAT = [
  [23.5, 40.0], // 에게해 서안(그리스 단순화)
  [25.0, 41.0],
  [27.0, 40.9],
  [28.98, 41.01], // 이스탄불(보스포루스)
  [29.5, 41.2],
  [35.0, 42.0], // 흑해 남안(단순화)
  [40.0, 41.0],
  [36.0, 36.5], // 아나톨리아 남안
  [28.0, 36.7], // 에게해 남안
  [23.5, 37.0],
  [22.0, 39.0], // 내륙 경계
  [23.5, 40.0],
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

function fractalCoastline(lonlatPairs, seed, big = 16, small = 5) {
  const rand = makeRand(seed);
  let poly = projectAll(lonlatPairs);
  poly = jitterEdges(poly, 5, big, rand); // 큰 굴곡(만·곶)
  poly = jitterEdges(poly, 3, small, rand); // 잔물결 같은 잔 디테일
  return poly;
}

export const MAINLAND_POLY = fractalCoastline(MAINLAND_LONLAT, 20260823);
export const BRITAIN_POLY = fractalCoastline(BRITAIN_LONLAT, 19470101);
export const SCANDINAVIA_POLY = fractalCoastline(SCANDINAVIA_LONLAT, 17920101);
export const NORTH_AFRICA_POLY = fractalCoastline(NORTH_AFRICA_LONLAT, 14920101);
export const WEST_AFRICA_POLY = fractalCoastline(WEST_AFRICA_LONLAT, 14880101, 20, 6);
export const CAPE_POLY = fractalCoastline(CAPE_LONLAT, 14970101, 20, 6);
export const NORTH_AMERICA_EAST_POLY = fractalCoastline(NORTH_AMERICA_EAST_LONLAT, 16200101, 22, 7);
export const CUBA_POLY = fractalCoastline(CUBA_LONLAT, 15150101, 10, 3);
export const HISPANIOLA_POLY = fractalCoastline(HISPANIOLA_LONLAT, 14930101, 8, 3);
export const SOUTH_AMERICA_EAST_POLY = fractalCoastline(SOUTH_AMERICA_EAST_LONLAT, 15000101, 20, 6);
export const INDIA_WEST_POLY = fractalCoastline(INDIA_WEST_LONLAT, 14980101, 14, 4);
export const MALAY_POLY = fractalCoastline(MALAY_LONLAT, 15110101, 8, 3);
export const JAPAN_POLY = fractalCoastline(JAPAN_LONLAT, 15430101, 6, 2);
export const ANATOLIA_POLY = fractalCoastline(ANATOLIA_LONLAT, 14530101, 14, 4);

// 소형 섬(잔글리처 없이 그대로 사용 — 너무 작아서 큰 굴곡을 주면 형태가 무너진다)
export const AZORES_POLY = projectAll([
  [-25.9, 37.85], [-25.6, 37.85], [-25.5, 37.7], [-25.7, 37.6], [-25.95, 37.68],
]);
export const CANARY_POLY = projectAll([
  [-15.6, 28.2], [-15.35, 28.25], [-15.35, 27.9], [-15.6, 27.9],
]);
export const CAPE_VERDE_POLY = projectAll([
  [-23.6, 15.15], [-23.4, 15.1], [-23.45, 14.9], [-23.65, 14.95],
]);
export const SICILY_POLY = projectAll([
  [12.4, 38.2], [15.6, 38.2], [15.1, 36.7], [12.9, 37.2],
]);
export const SARDINIA_CORSICA_POLY = projectAll([
  [8.5, 41.0], [9.5, 41.0], [9.7, 39.1], [8.4, 38.9], [8.1, 40.0],
]);
export const CRETE_POLY = projectAll([
  [23.5, 35.5], [26.3, 35.3], [25.7, 34.9], [23.6, 35.0],
]);
export const SRI_LANKA_POLY = projectAll([
  [79.7, 9.8], [81.9, 9.5], [81.6, 6.0], [79.9, 6.8],
]);

export const LAND_POLYGONS = [
  MAINLAND_POLY, BRITAIN_POLY, SCANDINAVIA_POLY, NORTH_AFRICA_POLY, WEST_AFRICA_POLY, CAPE_POLY,
  NORTH_AMERICA_EAST_POLY, CUBA_POLY, HISPANIOLA_POLY, SOUTH_AMERICA_EAST_POLY,
  INDIA_WEST_POLY, MALAY_POLY, JAPAN_POLY, ANATOLIA_POLY,
  AZORES_POLY, CANARY_POLY, CAPE_VERDE_POLY, SICILY_POLY, SARDINIA_CORSICA_POLY, CRETE_POLY, SRI_LANKA_POLY,
];

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
