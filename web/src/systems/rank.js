import { state } from '../state.js';
import { RANKS } from '../data/ranks.js';

// 재산 + 해적 토벌/의뢰 완료 실적 + 함대 규모 + 각국 우호도 + 방문 항구 수 총합을
// 하나의 "명성 점수"로 합산한다.
export function computeScore() {
  const completedQuests = Object.values(state.quests || {}).filter((v) => v === 'completed').length;
  const repSum = Object.values(state.reputation || {}).reduce((a, b) => a + b, 0);
  const visitedCount = Object.keys(state.visitedCities || {}).length;
  return Math.round(
    (state.gold || 0)
    + (state.pirateBounty || 0) * 400
    + completedQuests * 300
    + (state.fleet || []).length * 600
    + repSum * 8
    + visitedCount * 150
  );
}

// { rank, index, score, next, progress(0..1, 마지막 랭크면 1) }
export function getRankInfo() {
  const score = computeScore();
  let index = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].minScore) { index = i; break; }
  }
  const rank = RANKS[index];
  const next = RANKS[index + 1] || null;
  const progress = next ? Math.min(1, (score - rank.minScore) / (next.minScore - rank.minScore)) : 1;
  return { rank, index, score, next, progress, isMax: !next };
}
