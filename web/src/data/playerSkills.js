// 선장 개인 스킬 & 숙련도 시스템.
//
// 전투/교역 스킬 — 도시의 스승(NPC, data/skillMentors.js)에게 골드를 내고 "배워야" 보유하게
// 되며(게임 시작 시엔 하나도 없다), 배운 스킬은 최대 MAX_LEARNED_SKILLS(30)개까지 보유할 수
// 있고 그중 QUICKSLOT_COUNT(9)개까지 퀵슬롯에 장착해 숫자키 1~9로 직접 시전한다(쿨다운+
// 지속시간이 있는 버프, 랭크가 오를수록 효과가 커짐). 시전할 때마다 숙련도(경험치)가 오르고
// 그 획득량 자체도 랭크가 높을수록 castExpFor()만큼 소폭 늘어난다.
//
// 학문(고고학/지리학/천문학)도 처음부터 갖고 있지 않다 — 전투/교역과 똑같이 도시의 학자에게
// 배워야 하지만, 그 다음부터는 완전히 다른 성격이다: 쿨다운·지속시간·퀵슬롯 장착·시전 개념이
// 전혀 없고, 오직 "발견"(조사·관측, G키) 시에만 성장하며 그 성장 폭은 발견물 자체의 랭크
// (=minSkillLevel)에 비례한다(data/compendium.js rewardForRank 참고). 이 랭크는 순수하게
// (1) 퀘스트 수주 조건과 (2) 발견 가능 조건 수치로만 쓰이고, 어떤 능동 효과도 갖지 않는다.
export const SKILL_CATEGORIES = {
  combat: { label: '전투', color: '#e0645a' },
  trade: { label: '교역', color: '#d9a34f' },
  archaeology: { label: '고고학', color: '#c9a876' },
  geography: { label: '지리학', color: '#6fc8e0' },
  astronomy: { label: '천문학', color: '#8f7fe0' },
};

export const MAX_SKILL_LEVEL = 15;
export const MAX_LEARNED_SKILLS = 30;
export const QUICKSLOT_COUNT = 9;

// 레벨업에 필요한 "사용 횟수"(인덱스 0 = 레벨1→2, ... 인덱스13 = 레벨14→15).
// 1~8은 빠르게(작은 값), 9~11은 점점 느리게, 12~13은 더 느리게, 14~15는 매우 느리게 —
// 총 14단계로 15레벨을 구성한다.
export const SKILL_EXP_CURVE = [
  5, 7, 10, 14, 19, 26, 35, // 레벨 1→8 (7단계, 빠르게)
  55, 85, 130,              // 레벨 8→11 (3단계, 점점 느리게)
  200, 300,                 // 레벨 11→13 (2단계, 더 느리게)
  500, 850,                 // 레벨 13→15 (2단계, 매우 느리게)
];

// 레벨(1~15)에 따라 v1(레벨1 수치)~v15(레벨15 수치) 사이를 선형 보간한다.
export function lerpByLevel(v1, v15, level) {
  const t = (Math.min(MAX_SKILL_LEVEL, Math.max(1, level)) - 1) / (MAX_SKILL_LEVEL - 1);
  return v1 + (v15 - v1) * t;
}

// 전투/교역 액티브 스킬을 "시전"할 때마다 얻는 숙련도 — 랭크가 높을수록 소폭 더 받는다
// (5레벨마다 +1: 1~4는 1, 5~9는 2, 10~14는 3, 15는 4).
export function castExpFor(level) {
  return 1 + Math.floor((Math.min(MAX_SKILL_LEVEL, Math.max(1, level)) - 1) / 5);
}

// effects: [{ key, mode: 'mul'|'add', v1, v15 }] — key는 seaScene.js/market.js/supplies.js/
// systems/quests.js의 기존 mulSkillEffect/sumSkillEffect 호출부와 같은 이름을 그대로
// 재사용해, 버프가 켜져 있는 동안 그 계산식에 곱/가산으로 얹힌다(systems/skills.js의
// buffMul/buffAdd — 바다·도시 양쪽에서 공용으로 작동).
export const PLAYER_SKILLS = {
  // ---- 전투 액티브 버프 ----
  battle_cry: {
    id: 'battle_cry', name: '전투 함성', category: 'combat', icon: '📯',
    desc: '일정 시간 백병전 전투력이 크게 오른다.',
    cooldown: 60, duration: 20,
    effects: [{ key: 'meleePowerMul', mode: 'mul', v1: 1.15, v15: 1.5 }],
  },
  rapid_fire_stance: {
    id: 'rapid_fire_stance', name: '속사 태세', category: 'combat', icon: '🔥',
    desc: '일정 시간 포격 재장전 속도가 크게 빨라진다.',
    cooldown: 70, duration: 25,
    effects: [{ key: 'fireCooldownMul', mode: 'mul', v1: 0.85, v15: 0.55 }],
  },
  evasive_maneuver: {
    id: 'evasive_maneuver', name: '회피 기동', category: 'combat', icon: '🌀',
    desc: '일정 시간 피격 피해가 줄고 선회가 빨라진다.',
    cooldown: 60, duration: 20,
    effects: [
      { key: 'incomingDamageMul', mode: 'mul', v1: 0.9, v15: 0.6 },
      { key: 'combatTurnMul', mode: 'mul', v1: 1.1, v15: 1.35 },
    ],
  },
  combat_medic: {
    id: 'combat_medic', name: '응급 처치', category: 'combat', icon: '⚕️',
    desc: '일정 시간 초당 선체 자동 회복량이 크게 늘어난다.',
    cooldown: 90, duration: 15,
    effects: [{ key: 'combatHpRegenPerSec', mode: 'add', v1: 2, v15: 10 }],
  },

  // ---- 교역 액티브 버프 ----
  haggling: {
    id: 'haggling', name: '흥정술', category: 'trade', icon: '💰',
    desc: '일정 시간 매도가가 오른다.',
    cooldown: 45, duration: 30,
    effects: [{ key: 'sellPriceMul', mode: 'mul', v1: 1.05, v15: 1.25 }],
  },
  bulk_buying: {
    id: 'bulk_buying', name: '대량 매입', category: 'trade', icon: '📦',
    desc: '일정 시간 항구 보급품 구매가가 내려간다.',
    cooldown: 60, duration: 30,
    effects: [{ key: 'supplyBuyPriceMul', mode: 'mul', v1: 0.95, v15: 0.75 }],
  },
  route_intel: {
    id: 'route_intel', name: '신항로 정보통', category: 'trade', icon: '🧭',
    desc: '일정 시간 거리 프리미엄(원산지에서 멀수록 붙는 웃돈) 획득량이 늘어난다.',
    cooldown: 60, duration: 30,
    effects: [{ key: 'distancePremiumMul', mode: 'mul', v1: 1.05, v15: 1.3 }],
  },
  diplomacy: {
    id: 'diplomacy', name: '사교술', category: 'trade', icon: '🤝',
    desc: '일정 시간 평판 상승 속도가 크게 늘어난다.',
    cooldown: 90, duration: 40,
    effects: [{ key: 'reputationGainMul', mode: 'mul', v1: 1.2, v15: 2.0 }],
  },

  // ---- 학문(모험 축 고유 성장 콘텐츠) — 조사/관측 자체가 성장이며, 시전·장착 개념이 없다 ----
  archaeology: {
    id: 'archaeology', name: '고고학', category: 'archaeology', icon: '🏺',
    desc: '해저 유적과 난파선을 조사해 잊힌 역사를 되짚는 학문.',
  },
  geography: {
    id: 'geography', name: '지리학', category: 'geography', icon: '🗺️',
    desc: '세계 각지의 지형과 그 이면의 역사를 탐구하는 학문.',
  },
  astronomy: {
    id: 'astronomy', name: '천문학', category: 'astronomy', icon: '🔭',
    desc: '밤하늘의 별자리를 관측하고 그 신화를 기록하는 학문.',
  },
};

export function getSkillDef(id) {
  return PLAYER_SKILLS[id];
}

// 퀵슬롯 장착·시전 대상(전투+교역) — cooldown이 있는 스킬만 해당한다.
export function isQuickslotSkill(id) {
  return PLAYER_SKILLS[id]?.cooldown != null;
}

export function getLearnableSkills() {
  return Object.values(PLAYER_SKILLS).filter((s) => s.cooldown != null);
}

// 학문 스킬 3종(퀵슬롯 대상 아님, 항상 보유).
export function getAcademicSkills() {
  return Object.values(PLAYER_SKILLS).filter((s) => s.cooldown == null);
}

// 스킬의 특정 effect key가 현재 레벨에서 갖는 실제 수치 — 없으면 null.
export function skillEffectValueAt(skillId, key, level) {
  const skill = PLAYER_SKILLS[skillId];
  const eff = skill?.effects?.find((e) => e.key === key);
  if (!eff) return null;
  return lerpByLevel(eff.v1, eff.v15, level);
}
