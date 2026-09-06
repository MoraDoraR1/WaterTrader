// 모험 축 고유의 반복 콘텐츠 — 전투 축(리스폰 엘리트 재탕)이나 교역 축(의뢰 순환제)과 달리,
// "미지의 해역"을 실제로 찾아가 발견하는 탐사 행위 자체를 반복 목표로 삼는다. 항로 개척
// 3부작을 다 끝내도 할 일이 남도록, 소진되지 않고 계속 새 좌표가 나타난다.
import { state, notify } from '../state.js';
import { pointOnAnyLand } from '../data/coastline.js';
import { hud } from '../ui/hud.js';

const FIRST_DELAY = 90; // 항해를 시작하고 1분 30초 안에는 뜨지 않는다
const COOLDOWN_MIN = 240, COOLDOWN_RANGE = 180; // 발견 후 다음 사이트까지 4~7분
const SPAWN_DIST_MIN = 300, SPAWN_DIST_RANGE = 600; // 현재 위치에서 300~900유닛 거리에 생성
const SPAWN_ATTEMPTS = 8; // 육지에 걸리면 각도를 바꿔 재시도하는 횟수
const RETRY_DELAY = 10; // 8번 다 육지면 잠시 후 다시 시도
const DISCOVER_RADIUS = 35; // 이 거리 안에 들어오면 자동으로 발견 처리된다
const REWARD_GOLD_MIN = 150, REWARD_GOLD_RANGE = 200;

function tryPickSite(originX, originZ) {
  for (let i = 0; i < SPAWN_ATTEMPTS; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = SPAWN_DIST_MIN + Math.random() * SPAWN_DIST_RANGE;
    const x = originX + Math.cos(angle) * dist;
    const z = originZ + Math.sin(angle) * dist;
    if (!pointOnAnyLand(x, z)) return { x, z };
  }
  return null;
}

// 매 프레임 불러도 부담 없다 — 사이트가 있으면 발견 판정만, 없으면 생성 판정만 한다.
// shipPos: {x, y} 형태(entities/shipController.js의 Vec2 — z축을 y로 쓴다).
export function checkExplorationSite(shipPos) {
  if (state.explorationSite) {
    const dx = state.explorationSite.x - shipPos.x, dz = state.explorationSite.z - shipPos.y;
    if (Math.hypot(dx, dz) >= DISCOVER_RADIUS) return;
    const gold = Math.round(REWARD_GOLD_MIN + Math.random() * REWARD_GOLD_RANGE);
    state.gold += gold;
    state.explorationCount = (state.explorationCount || 0) + 1;
    state.explorationSite = null;
    state.nextExplorationSiteAt = state.dayTimer + COOLDOWN_MIN + Math.random() * COOLDOWN_RANGE;
    hud.toast(`🗺️ 미지의 해역을 탐사했습니다! (+${gold.toLocaleString('ko-KR')} 두캇)`);
    notify({ explorationChanged: true });
    return;
  }
  if (state.nextExplorationSiteAt == null) {
    state.nextExplorationSiteAt = state.dayTimer + FIRST_DELAY;
    return;
  }
  if (state.dayTimer < state.nextExplorationSiteAt) return;
  const site = tryPickSite(shipPos.x, shipPos.y);
  if (!site) { state.nextExplorationSiteAt = state.dayTimer + RETRY_DELAY; return; }
  state.explorationSite = site;
  hud.toast('🗺️ 미지의 해역이 발견됐습니다 — 미니맵에 표시된 곳으로 항해해보세요.');
  notify({ explorationChanged: true });
}
