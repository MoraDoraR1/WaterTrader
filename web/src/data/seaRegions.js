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
];

export function seaRegionAt(x, z) {
  for (const [name, poly] of REGIONS) {
    if (pointInPolygon(x, z, poly)) return name;
  }
  return '공해';
}
