// 학문 도감 완주 보상 — 고고학/지리학/천문학마다 발견 개수가 requiredCount(약 1/3·2/3·전체
// 지점)에 닿을 때마다 data/shipParts.js의 전용 부품(source:'compendium') 하나씩을 무료로
// 해금한다. 실제 발견 처리(state.compendium 갱신) 직후 seaScene.js의 _investigateSite/
// _observeSky가 호출한다 — 이 파일 자체는 카운트만 세고 부품 장착 가능 여부 판정(가격 대신
// 해금 목록 검사)은 systems/shipyard.js equipPart가 담당한다.
import { state, notify } from '../state.js';
import { hud } from '../ui/hud.js';
import { getRewardParts, PART_SLOTS } from '../data/shipParts.js';

export function isRewardUnlocked(partId) {
  return (state.compendiumRewards || []).includes(partId);
}

export function checkCompendiumRewards(category) {
  const count = Object.keys(state.compendium[category] || {}).length;
  let unlockedAny = false;
  for (const part of getRewardParts(category)) {
    if (count < part.requiredCount || isRewardUnlocked(part.id)) continue;
    state.compendiumRewards = [...(state.compendiumRewards || []), part.id];
    unlockedAny = true;
    hud.toast(`🏅 도감 보상 해금! ${PART_SLOTS[part.slot].icon} '${part.name}' — 조선소 '부품' 탭에서 무료로 장착할 수 있습니다.`);
  }
  if (unlockedAny) notify({ compendiumRewardsChanged: true });
}
