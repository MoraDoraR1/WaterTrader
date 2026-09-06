// 칭호 시스템 — 이 게임에는 정해진 엔딩이 없다. "바다의 제독"은 도달하면 게임이 끝나는
// 최종 목표가 아니라, 전투 축에서 오를 수 있는 여러 칭호 중 가장 높은 하나일 뿐이다.
// 교역/모험/전투 세 축의 명성(fame)을 완전히 독립적으로 관리하고, 각 축마다 자기 칭호
// 사다리를 오른다 — 한 축의 활동은 다른 축의 칭호에 전혀 영향을 주지 않는다. 여기에 더해
// 악명(infamy)이라는 네 번째, 성격이 다른 트랙이 있다 — 상단(무역 호송대)을 약탈해야만
// 오르고, 시간이 지나면 저절로 가라앉으며, 해적 관련 칭호로 이어진다.
//
// 참고: systems/rank.js의 RANKS는 이 칭호 시스템과 별개다 — 항로 개척 퀘스트 게이팅
// (data/quests.js minRankIndex) 등 내부 진행도 판정에만 쓰이는 숨은 점수이며, 플레이어에게
// "칭호"로 보여주지 않는다(더 이상 rank-box에 표시되지 않는다).

export const TRADE_TITLES = [
  { id: 'trade_0', label: '무역 견습생', minFame: 0 },
  { id: 'trade_1', label: '행상인', minFame: 100 },
  { id: 'trade_2', label: '물자 상인', minFame: 400 },
  { id: 'trade_3', label: '거상', minFame: 1200 },
  { id: 'trade_4', label: '상단주', minFame: 3000 },
  { id: 'trade_5', label: '바다의 대상인', minFame: 6000 },
];

export const ADVENTURE_TITLES = [
  { id: 'adv_0', label: '풋내기 항해사', minFame: 0 },
  { id: 'adv_1', label: '견습 탐험가', minFame: 80 },
  { id: 'adv_2', label: '항로 탐사자', minFame: 300 },
  { id: 'adv_3', label: '대항해가', minFame: 700 },
  { id: 'adv_4', label: '세계를 그린 자', minFame: 1400 },
  { id: 'adv_5', label: '전설의 탐험가', minFame: 2500 },
];

export const COMBAT_TITLES = [
  { id: 'combat_0', label: '신참 선원', minFame: 0 },
  { id: 'combat_1', label: '사략선원', minFame: 150 },
  { id: 'combat_2', label: '전투함장', minFame: 600 },
  { id: 'combat_3', label: '해상 사령관', minFame: 1500 },
  { id: 'combat_4', label: '대양의 검', minFame: 3200 },
  { id: 'combat_5', label: '바다의 제독', minFame: 6000 },
];

// 평판이 깨끗한 상태(0)에도 이름을 붙여, "칭호 없음"이 아니라 명시적인 트랙의 시작점으로 보이게 한다.
export const INFAMY_TITLES = [
  { id: 'infamy_0', label: '평판 깨끗함', minFame: 0 },
  { id: 'infamy_1', label: '소문난 무법자', minFame: 30 },
  { id: 'infamy_2', label: '현상수배범', minFame: 100 },
  { id: 'infamy_3', label: '악명 높은 해적', minFame: 250 },
  { id: 'infamy_4', label: '바다의 공포', minFame: 500 },
  { id: 'infamy_5', label: '전설의 해적왕', minFame: 900 },
];

// ---- 명성 획득량 ----
// 전투: 격침할 때마다 위협 등급(entities/pirate.js tier)에 비례해 얻는다. 상단(convoy)은
// 전투 대상이긴 해도 "위협"이 아니라 "약탈"이라 낮은 고정값만 준다(진짜 보상은 악명+노획물).
export const COMBAT_FAME_BY_TIER = { grunt: 5, elite: 15, boss: 40, legendary: 80, convoy: 6 };

// 모험: 도감 발견 1건, 미탐사 해역 발견 1건마다 고정값.
export const ADVENTURE_FAME_PER_DISCOVERY = 5;
export const ADVENTURE_FAME_PER_EXPLORATION = 2;

// 모험: 3개 학문 도감 총 발견 개수(최대 69)가 이 구간을 처음 넘을 때마다 한 번씩 보너스.
export const ADVENTURE_DISCOVERY_MILESTONES = [
  { count: 10, fame: 40 },
  { count: 25, fame: 100 },
  { count: 45, fame: 250 },
  { count: 69, fame: 500 },
];

// 교역: 매매(구매/판매/물물교환) 1건마다 고정값.
export const TRADE_FAME_PER_TRADE = 1;

// 교역: 누적 자산(휴대금+은행)이 이 구간을 처음 넘을 때마다 한 번씩 보너스.
export const TRADE_WEALTH_MILESTONES = [
  { amount: 2000, fame: 50 },
  { amount: 10000, fame: 150 },
  { amount: 30000, fame: 400 },
  { amount: 80000, fame: 900 },
  { amount: 200000, fame: 2000 },
];

// 악명: 상단(convoy) 격침 시 해역(region)별로 얻는 악명 — 더 위험하고 귀한 항로일수록 크다.
export const INFAMY_PER_CONVOY_KILL = { 1: 20, 2: 28, 3: 36, 4: 45 };

// 악명은 시간이 지나면 저절로 가라앉는다(초당 감소량) — 상단 1척 분(20~45)이 대략 1~2분
// 안에 자연 소멸하는 속도다. 여러 척을 연달아 약탈하면 그만큼 오래 해군의 표적이 된다.
export const INFAMY_DECAY_PER_SEC = 0.4;

// 상단을 격침한 순간 스폰되는 해군 추격대가 플레이어를 쫓는 반경(월드 단위, 격침 지점
// 기준) — 플레이어가 이 반경 밖으로 벗어나면 추격대는 조용히 물러난다.
export const NAVY_PURSUIT_RADIUS = 300;
