import { SHIPS, getShip } from './data/ships.js';
import { getEffectiveShipDef } from './data/shipParts.js';
import { project } from './data/coastline.js';

const listeners = new Set();

export const state = {
  screen: 'title', // title | sea | city
  gender: 'male', // male | female
  playerName: '항해사',
  gold: 1500,
  currentShipId: 'caravela_lateen',
  shipHp: null,
  crewCount: null, // 현재 배에 실제로 타고 있는 선원 수(정원 shipDef.crew 이하) — 전투/기아로 줄고, 입항 시 일부 충원된다.
  shipParts: {}, // { cannon, armor, sail, hull } — 슬롯별 장착 부품 id (조선소에서 구매/장착)
  shipPos: project(-11.0, 38.5), // 리스본 서쪽 대서양 공해 — 실제 경위도 기반이라 지도 축척이 바뀌어도 항상 안전한 시작 위치
  shipHeading: 0,
  dayTimer: 0, // 가상 항해 시간(초) — WeatherSystem이 갱신, 항해일자(voyageDay) 계산에 쓰인다.
  bankGold: 0, // 대도시 은행에 맡겨둔 두캇 — 휴대금(gold)과 분리되어 난파해도 잃지 않는다.
  // 배의 창고(화물칸)는 교역품과 함께 이 넷도 같은 적재량을 나눠 쓴다 — 각각 역할이 다르다:
  // food/water(생존 물품, 매일 소모되며 떨어지면 사기·선체가 상한다) / materials(수리 1회당 1 소모)
  // / cannonballs(포격 1회당 1 소모).
  food: 10,
  water: 10,
  materials: 3,
  cannonballs: 18, // 시작 화력 3~5회 교전분 — 초기 배(포 4문)는 일제사격 1회에 2발을 쏘지만 소모는 1개뿐이다.
  suppliesLastDay: 1, // 마지막으로 식량/식수 소모를 처리한 항해일자 — 날짜가 넘어갈 때마다 갱신.
  dockedCityId: null,
  inCombat: false,
  // 시작 시점에 실제로 사고파는(둘 중 아무 항구에서나) 품목만 들려 보낸다 — 아직 어느
  // 항구도 취급하지 않는 품목(비단 등)을 쥐고 시작하면 팔 곳이 없어 죽은 짐이 된다.
  inventory: [
    { id: 'pepper', name: '후추', qty: 10 },
    { id: 'wine', name: '포도주', qty: 6 },
  ],
  quests: {}, // questId -> 'accepted' | 'completed' (없으면 'available'로 취급)
  // questId -> 다음 재발행 시각(state.dayTimer 기준) — 완료된 배달 의뢰가 소진형으로
  // 끝나지 않도록, 리스폰 시스템과 같은 절대 시각 방식으로 저장한다(systems/quests.js
  // checkQuestRespawns). 항로 개척 3부작(chain_ 접두)은 스토리 게이트라 대상에서 제외.
  questRespawnAt: {},
  reputation: {}, // 국가코드 -> 우호도(시장 가격에 반영)
  pirateBounty: 0, // 완료한 해적 토벌 의뢰 수
  crewMorale: 100, // 0~100 — 백병전 전투력에 반영
  visitedCities: {}, // cityId -> true — 한 번이라도 정박한 항구(랭크 점수의 탐험 지표로 쓰인다)
  fleet: [], // 예비 함대 — { uid, shipId, shipHp, shipParts, name } — 항구에 정박해 있는(현재 조종 중이 아닌) 배들
  // ---- 건조 전용 재료 ----
  // 화물칸을 차지하지 않는 별도 자원(골드처럼 취급) — 오직 조선소 "건조" 탭에서만 소모된다.
  oakTimber: 0, // 상급 조선용 참나무 — 대형/초대형 건조 재료. 엘리트 격침 시 확률 드랍.
  ironcladPlating: 0, // 전설 해적기함의 철갑판 — 초대형 전용 재료. 보스 격침 시 확정 드랍.
  robertsRelic: 0, // 로열 포춘호의 파편 — "바르톨로뮤" 엔드 컨텐츠 함선 3종 전용 재료. 레전더리 해적(바르톨로뮤 로버츠) 격침 시 15% 확률 드랍.
  // ---- 엘리트/보스 리스폰·강화 ----
  // id -> { level, respawnAt } — level은 지금까지 누적된 강화 단계(회당 +25%, 무한 누적),
  // respawnAt은 다음 리스폰 시각(state.dayTimer 기준, 아직 죽어있지 않다면 null).
  // 매일 자정(로컬 현실 시각)에 level만 0으로 초기화된다(entities/pirate.js checkDailyEscalationReset).
  pirateEscalation: {},
  pirateEscalationResetDate: null, // 마지막으로 자정 초기화를 처리한 날짜 문자열(Date#toDateString)
  seenRespawnIntro: false, // 엘리트/보스 리스폰·강화 시스템 설명을 한 번이라도 봤는지
  marketState: {}, // cityId -> goodId -> { mul, updatedAt } — 플레이어 매매로 흔들린 뒤 시간이 지나며 되돌아오는 시세 배율
  marketCycle: {}, // cityId -> goodId -> { mul, bucket } — 항해일자 5일 주기로 한 걸음씩 오르내리는 시세 사이클(주식 종가 개념)
  marketVolume: {}, // cityId -> goodId -> { remaining, updatedAt } — 한 항구에서 한 번에 소화 가능한 거래량 상한(VOLUME_CAP), 시간이 지나며 회복
  cityEvents: {}, // cityId -> { type: 'boom'|'crash'|null, mul, endBucket, checkedBucket } — 도시 전체에 걸리는 대호황(150~170%)/대폭락(40~50%) 사건
  marketStock: {}, // cityId -> goodId -> { qty, resetAt } — 항구가 "매입" 방향으로 실제 보유한 한정 재고. 플레이어 구매로만 소진되고,
  // 항해일자 기준 절대 시각(resetAt, state.dayTimer 기준)에 도달하면 새 물량으로 재입고된다 — 구매 시점 기준 타이머가 아니라
  // 도시·품목별로 독립적으로 흘러가는 절대 시각이라 재입고 직전에 사재기해 타이머를 늦추는 식의 편법이 통하지 않는다.
  audioMuted: false,
  endingShown: false, // 최고 랭크(바다의 제독) 도달 엔딩 화면을 이미 본 적 있는지
  // 원양 항로 해금 여부 — systems/routeUnlock.js가 랭크에 따라 true로 바꾼다(한 번 열리면
  // 이후 랭크 점수가 일시적으로 내려가도 다시 잠기지 않는다). 서유럽/북해·발트해/지중해는
  // 이 목록에 없이 항상 열려 있다.
  unlockedRoutes: { west_africa: false, new_world: false, indian_ocean: false },
  // ---- 모험 축 고유의 반복 콘텐츠(전투/교역 축 재탕이 아닌) ----
  // explorationSite: 현재 존재하는 미탐사 해역 좌표({x,z}) — 없으면 null. 발견하면 골드를
  // 주고 사라지며, nextExplorationSiteAt 이후 새 좌표가 다시 생긴다(systems/exploration.js).
  explorationSite: null,
  nextExplorationSiteAt: null,
  explorationCount: 0, // 지금까지 발견한 미탐사 해역 수
};

export function initShipHp() {
  const shipDef = getEffectiveShipDef(getShip(state.currentShipId), state.shipParts);
  state.shipHp = shipDef ? shipDef.hp : 500;
}

export function initCrewCount() {
  const shipDef = getShip(state.currentShipId);
  state.crewCount = shipDef ? shipDef.crew : 20;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify(patch) {
  for (const fn of listeners) fn(patch);
}

export function setScreen(screen) {
  state.screen = screen;
  notify({ screen });
}
