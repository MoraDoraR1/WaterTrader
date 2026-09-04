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
  playerHp: 100,
  // 시작 시점에 실제로 사고파는(둘 중 아무 항구에서나) 품목만 들려 보낸다 — 아직 어느
  // 항구도 취급하지 않는 품목(비단 등)을 쥐고 시작하면 팔 곳이 없어 죽은 짐이 된다.
  inventory: [
    { id: 'pepper', name: '후추', qty: 10 },
    { id: 'wine', name: '포도주', qty: 6 },
  ],
  quests: {}, // questId -> 'accepted' | 'completed' (없으면 'available'로 취급)
  reputation: {}, // 국가코드 -> 우호도(시장 가격에 반영)
  pirateBounty: 0, // 완료한 해적 토벌 의뢰 수
  crewMorale: 100, // 0~100 — 백병전 전투력에 반영
  fleet: [], // 예비 함대 — { uid, shipId, shipHp, shipParts, name } — 항구에 정박해 있는(현재 조종 중이 아닌) 배들
  captureCount: 0, // 나포 성공 횟수(랭크 산정에 반영)
  marketState: {}, // cityId -> goodId -> { mul, updatedAt } — 플레이어 매매로 흔들린 뒤 시간이 지나며 되돌아오는 시세 배율
  marketCycle: {}, // cityId -> goodId -> { mul, bucket } — 항해일자 5일 주기로 한 걸음씩 오르내리는 시세 사이클(주식 종가 개념)
  cityEvents: {}, // cityId -> { type: 'boom'|'crash'|null, mul, endBucket, checkedBucket } — 도시 전체에 걸리는 대호황(150~170%)/대폭락(40~50%) 사건
  audioMuted: false,
  endingShown: false, // 최고 랭크(바다의 제독) 도달 엔딩 화면을 이미 본 적 있는지
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
