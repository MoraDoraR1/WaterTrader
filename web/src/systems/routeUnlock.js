// 원양 항로 해금 — data/worldRegions.js의 세 항로(아프리카/신대륙/인도양·극동)를 랭크
// 순서대로 하나씩 연다. 서유럽/북해·발트해/지중해는 이 시스템과 무관하게 항상 열려 있다.
// "한 번 열리면 다시 안 잠긴다"가 핵심 — 랭크 점수는 골드 지출 등으로 오르내릴 수 있어서,
// 매번 실시간으로 재판정하면 배를 사거나 하는 순간 이미 밟아본 항로가 도로 잠기는 사고가
// 난다. 그래서 state.unlockedRoutes에 한 번 true가 되면 영구히 저장해둔다.
import { state, notify } from '../state.js';
import { WORLD_REGIONS } from '../data/worldRegions.js';
import { getRankInfo } from './rank.js';
import { hud } from '../ui/hud.js';

// id -> { rankIndex } — WORLD_REGIONS 자체에 이미 있는 unlock 필드를 그대로 재사용한다.
const LOCKED_ROUTES = WORLD_REGIONS.filter((r) => r.unlock);

export function isRouteUnlocked(bucketId) {
  if (!bucketId) return true; // 잠금 구역이 아예 아님(서유럽/북해·발트해/지중해/미분류 공해)
  return !!state.unlockedRoutes[bucketId];
}

export function getRouteUnlockInfo(bucketId) {
  return LOCKED_ROUTES.find((r) => r.id === bucketId) || null;
}

// 매 프레임 불러도 부담 없을 만큼 가볍다(랭크 계산 1회 + 배열 3개 순회). 새로 해금된 항로가
// 있으면 그 목록을 반환해 호출부(main.js)가 축하 토스트를 띄울 수 있게 한다.
export function checkRouteUnlocks() {
  const { index } = getRankInfo();
  const newlyUnlocked = [];
  for (const route of LOCKED_ROUTES) {
    if (state.unlockedRoutes[route.id]) continue;
    if (index >= route.unlock.rankIndex) {
      state.unlockedRoutes = { ...state.unlockedRoutes, [route.id]: true };
      newlyUnlocked.push(route);
    }
  }
  if (newlyUnlocked.length > 0) {
    notify({ routesUnlocked: newlyUnlocked.map((r) => r.id) });
    for (const route of newlyUnlocked) {
      hud.toast(`🧭 새로운 항로가 열렸습니다: ${route.name}!`, 3200);
    }
  }
  return newlyUnlocked;
}
