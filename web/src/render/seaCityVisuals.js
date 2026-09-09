import { Vec2 } from '../util/math2d.js';
import { pointOnAnyLand } from '../data/coastline.js';

export const CITY_MOUND_RADIUS = 30;
export const HARBOR_CHANNEL_HALF_WIDTH = 12;
export const HARBOR_BASIN_RADIUS = 22;

const STYLE_BY_COUNTRY = {
  PT: 'iberian', ES: 'iberian',
  EN: 'north_sea', NL: 'north_sea', HAN: 'north_sea', DK: 'north_sea', SE: 'north_sea', SC: 'north_sea',
  FR: 'mediterranean', IT: 'mediterranean', MT: 'mediterranean', RG: 'mediterranean',
  OT: 'ottoman', OM: 'ottoman',
  AC: 'tropical', BN: 'tropical', BU: 'tropical', SM: 'tropical', VN: 'tropical',
  CN: 'chinese', JP: 'japanese', KR: 'korean',
};

export const CITY_MARKER_STYLES = {
  iberian: { land: '#aa965e', edge: '#6f7044', wall: '#eee1b7', wallShade: '#cdbb8d', roof: '#9d452d', accent: '#2e6f8b' },
  north_sea: { land: '#71856b', edge: '#4e654f', wall: '#a97958', wallShade: '#765543', roof: '#39474d', accent: '#d2c7a6' },
  mediterranean: { land: '#ab945f', edge: '#6e7145', wall: '#e4c999', wallShade: '#bd9968', roof: '#a54e31', accent: '#55766e' },
  ottoman: { land: '#b39258', edge: '#776640', wall: '#ddb170', wallShade: '#bd874e', roof: '#32777c', accent: '#d5a24c' },
  tropical: { land: '#66805a', edge: '#476447', wall: '#98704a', wallShade: '#6f4f35', roof: '#463421', accent: '#c0934a' },
  chinese: { land: '#7f8d68', edge: '#526349', wall: '#d2c39b', wallShade: '#a99a75', roof: '#34423e', accent: '#a43b2d' },
  japanese: { land: '#7b896d', edge: '#52624e', wall: '#e0d8c0', wallShade: '#968975', roof: '#303737', accent: '#71372c' },
  korean: { land: '#8d9570', edge: '#59664f', wall: '#eee5c8', wallShade: '#b4a985', roof: '#2d3231', accent: '#7d3e2e' },
};

export function cityMarkerStyle(country) {
  const styleId = STYLE_BY_COUNTRY[country] || 'iberian';
  return { id: styleId, ...CITY_MARKER_STYLES[styleId] };
}

function findNearestNaturalLand(x, z, maxRadius = 96) {
  if (pointOnAnyLand(x, z)) return { x, z, found: true };
  const steps = 48;
  for (let radius = 4; radius <= maxRadius; radius += 4) {
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const px = x + Math.sin(angle) * radius;
      const pz = z + Math.cos(angle) * radius;
      if (pointOnAnyLand(px, pz)) return { x: px, z: pz, found: true };
    }
  }
  // Natural Earth의 소축척 데이터에서 사라진 작은 섬은 실제 도시 좌표를 유지하고,
  // 런타임이 CITY_MOUND_RADIUS 크기의 지역 지반을 그려 섬/해안 정착지로 복원한다.
  return { x, z, found: false };
}

export function computeCityMarkers(cities) {
  const cx = cities.reduce((sum, city) => sum + city.pos[0], 0) / Math.max(1, cities.length);
  const cz = cities.reduce((sum, city) => sum + city.pos[1], 0) / Math.max(1, cities.length);
  const placements = cities.map((city) => {
    const land = findNearestNaturalLand(city.pos[0], city.pos[1]);
    return { city, land };
  });
  const angleStep = (Math.PI * 2) / 64;
  const angleOffsets = [0];
  for (let i = 1; i <= 32; i++) angleOffsets.push(i * angleStep, -i * angleStep);

  const isOpenWater = (px, pz) => {
    if (pointOnAnyLand(px, pz)) return false;
    for (const placement of placements) {
      const dx = px - placement.land.x;
      const dz = pz - placement.land.z;
      if (dx * dx + dz * dz < CITY_MOUND_RADIUS * CITY_MOUND_RADIUS) return false;
    }
    return true;
  };

  return placements.map(({ city, land }) => {
    let hx = land.x - cx;
    let hz = land.z - cz;
    const hlen = Math.hypot(hx, hz) || 1;
    hx /= hlen;
    hz /= hlen;
    const heuristicAngle = Math.atan2(hx, hz);
    let dockX = land.x + hx * 42;
    let dockZ = land.z + hz * 42;
    let foundDock = false;

    for (let radius = CITY_MOUND_RADIUS + 10; radius <= CITY_MOUND_RADIUS + 330 && !foundDock; radius += 6) {
      for (const offset of angleOffsets) {
        const angle = heuristicAngle + offset;
        const dx = Math.sin(angle);
        const dz = Math.cos(angle);
        const px = land.x + dx * radius;
        const pz = land.z + dz * radius;
        if (isOpenWater(px, pz) && isOpenWater(px + dx * 18, pz + dz * 18)) {
          dockX = px;
          dockZ = pz;
          foundDock = true;
          break;
        }
      }
    }

    const style = cityMarkerStyle(city.country);
    return {
      cityId: city.id,
      pos: new Vec2(land.x, land.z),
      sourcePos: new Vec2(city.pos[0], city.pos[1]),
      dockPos: new Vec2(dockX, dockZ),
      country: city.country,
      capital: !!city.capital,
      naturalLand: land.found,
      syntheticLand: !land.found,
      styleId: style.id,
    };
  });
}

function pointToSegmentDistance(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  const t = lenSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq)) : 0;
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

export function isPointInHarborChannel(x, z, marker) {
  const basinDistance = Math.hypot(x - marker.dockPos.x, z - marker.dockPos.y);
  if (basinDistance <= HARBOR_BASIN_RADIUS) return true;
  return pointToSegmentDistance(x, z, marker.pos.x, marker.pos.y, marker.dockPos.x, marker.dockPos.y) <= HARBOR_CHANNEL_HALF_WIDTH;
}
