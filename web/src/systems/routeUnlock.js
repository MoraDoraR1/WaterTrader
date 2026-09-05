// 원양 항로 해금 — data/worldRegions.js의 세 항로(아프리카/신대륙/인도양·극동)는 더 이상
// 랭크만으로 자동으로 열리지 않는다. 각 항로는 data/quests.js의 3부작 연계 의뢰(배달→토벌→
// 항해)를 끝까지 완료해야 열리며, 실제로 state.unlockedRoutes를 true로 바꾸는 코드는
// systems/quests.js의 checkVoyageArrival(항해 3부 완료 시점)에 있다. 이 파일은 그 항로가
// "잠겼는지"만 읽는 순수 조회 기능과, 랭크가 충족돼 연계 의뢰 1부가 리스본 게시판에 새로
// 올라왔음을 알려주는 안내 기능만 담당한다.
// "한 번 열리면 다시 안 잠긴다"는 여전히 핵심이다 — state.quests에 항해 3부 완료 기록이
// 세이브에 남으므로, 재접속 시에도 완료한 항로는 그대로 열려 있다(항로 자체를 별도로
// 저장할 필요가 없다).
import { state } from '../state.js';
import { WORLD_REGIONS } from '../data/worldRegions.js';
import { getQuest } from '../data/quests.js';
import { getCity } from '../data/cities.js';
import { getQuestStatus, isQuestChainReady } from './quests.js';
import { hud } from '../ui/hud.js';

// id -> { rankIndex, questId } — WORLD_REGIONS 자체에 이미 있는 unlock 필드를 그대로 재사용한다.
const LOCKED_ROUTES = WORLD_REGIONS.filter((r) => r.unlock);

export function isRouteUnlocked(bucketId) {
  if (!bucketId) return true; // 잠금 구역이 아예 아님(서유럽/북해·발트해/지중해/미분류 공해)
  return !!state.unlockedRoutes[bucketId];
}

export function getRouteUnlockInfo(bucketId) {
  return LOCKED_ROUTES.find((r) => r.id === bucketId) || null;
}

// 매 프레임 불러도 부담 없을 만큼 가볍다(랭크 계산 1회 + 배열 3개 순회 + 퀘스트 상태 조회).
// announcedThisSession은 일부러 state에 저장하지 않는다 — 매 프레임 조건이 계속 참인 동안
// 토스트가 깜빡이며 반복 출력되는 것만 막으면 되는 세션 한정 가드이고, 새로고침 후 한 번 더
// 뜨는 정도는(의뢰를 아직 안 받았다면) 오히려 놓치지 않게 도와준다.
const announcedThisSession = new Set();

export function checkQuestChainAnnouncements() {
  for (const route of LOCKED_ROUTES) {
    if (state.unlockedRoutes[route.id] || announcedThisSession.has(route.id)) continue;
    const q = getQuest(route.unlock.questId);
    // isQuestChainReady가 랭크(minRankIndex)뿐 아니라 routePrereq(예: 인도양은 아프리카
    // 항로가 먼저 열려 있어야 함)까지 함께 확인한다 — 이걸 빼먹으면 아직 게시판에 뜨지도
    // 않은 의뢰를 "새로 올라왔다"고 잘못 알리는 사고가 난다(실제로 한 번 발견된 버그).
    if (!q || getQuestStatus(q.id) !== 'available' || !isQuestChainReady(q)) continue;
    announcedThisSession.add(route.id);
    // 1부(배달) 의뢰는 리스본이 아니라 물품 원산지 도시(세비야/런던/베네치아)에서 뜬다 —
    // q.cityId로 실제 위치를 가리켜야 플레이어가 엉뚱하게 리스본만 뒤지는 일이 없다.
    const cityName = getCity(q.cityId)?.name || '항구';
    hud.toast(`📜 ${cityName} 항구관리인에게 "${route.name} 개척" 의뢰가 새로 올라왔습니다!`, 3600);
  }
}
