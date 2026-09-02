// 실제 해역명과 대략적 경계(위경도 사각형)를 coastline.js와 같은 투영식으로 변환해 정의.
// 좁고 특정된 해역을 먼저 검사하고, 마지막에 넓은 대양/바다로 대체(fallback)한다.
import { project, pointInPolygon } from './coastline.js';

function box(lonMin, lonMax, latMin, latMax) {
  return [
    project(lonMin, latMin), project(lonMax, latMin),
    project(lonMax, latMax), project(lonMin, latMax),
  ];
}

// [이름, 폴리곤] — 배열 순서가 곧 판정 우선순위(좁은 해역이 먼저)
const REGIONS = [
  ['도버 해협', box(1.0, 2.2, 50.6, 51.3)],
  ['영국 해협', box(-5.2, 1.0, 48.9, 50.9)],
  ['비스케이만', box(-5.2, -1.0, 43.3, 48.4)],
  ['지브롤터 해협', box(-6.3, -5.0, 35.7, 36.3)],
  ['북해', box(-2.0, 10.8, 51.0, 56.5)],
  ['리구리아해', box(6.5, 10.2, 42.9, 44.7)],
  ['북아드리아해', box(12.0, 16.5, 43.4, 46.2)],
  ['지중해', box(-5.3, 16.5, 34.8, 43.4)],
  ['북대서양', box(-13.0, -1.0, 34.8, 56.5)],
  // ---- 전세계 항로 확장 ----
  ['발트해', box(9.0, 30.0, 53.5, 66.0)],
  ['에게해', box(23.0, 29.5, 35.0, 41.0)],
  ['흑해', box(27.0, 42.0, 41.0, 47.0)],
  ['멕시코만', box(-98.0, -80.0, 18.0, 30.5)],
  ['카리브해', box(-88.0, -60.0, 9.0, 23.5)],
  ['기니만', box(-10.0, 10.0, -3.0, 6.0)],
  ['남중국해', box(99.0, 121.0, -3.0, 23.0)],
  ['동중국해', box(122.0, 132.0, 24.0, 34.0)],
  ['인도양', box(40.0, 100.0, -35.0, 25.0)],
  ['남대서양', box(-45.0, -10.0, -35.0, 4.5)],
  ['대서양', box(-70.0, 20.0, -40.0, 65.0)],
  ['태평양', box(120.0, 179.0, -50.0, 50.0)],
];

// 전체 지도(월드맵)에 해역 이름 라벨을 그릴 때 재사용
export const SEA_REGION_BOXES = REGIONS;

export function seaRegionAt(x, z) {
  for (const [name, poly] of REGIONS) {
    if (pointInPolygon(x, z, poly)) return name;
  }
  return '공해';
}
