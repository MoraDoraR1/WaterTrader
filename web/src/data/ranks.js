// 선장 랭크 — 재산·해적 토벌·의뢰 완료·함대 규모·각국 우호도를 합산한 "명성 점수"로 승급한다.
// 마지막 랭크(바다의 제독)에 도달하면 한 번, 엔딩(결산) 화면이 뜬다 — 게임을 강제로
// 끝내지는 않고 그 뒤로도 계속 항해할 수 있다(자산/명성 결승선형 엔딩).
export const RANKS = [
  { id: 'novice', label: '신참 선장', minScore: 0 },
  { id: 'trader', label: '상선 선장', minScore: 2500 },
  { id: 'navigator', label: '노련한 항해사', minScore: 7000 },
  { id: 'commodore', label: '함대 사령관', minScore: 16000 },
  { id: 'overlord', label: '대양의 지배자', minScore: 32000 },
  { id: 'admiral', label: '바다의 제독', minScore: 60000 },
];
