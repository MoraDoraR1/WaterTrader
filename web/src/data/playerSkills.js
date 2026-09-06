// 선장 개인 스킬 & 숙련도 시스템 — 배에 내재된 SHIP_SKILLS(교체 불가 고정 특성)와 달리,
// 플레이어가 "사용할수록" 숙련도(경험치)가 쌓여 성장하는 별도의 시스템이다.
// 전투 카테고리는 액티브 캐스트(핫키로 직접 시전, 쿨다운+지속시간이 있는 버프),
// 학문 카테고리(고고학/지리학/천문학)는 조사·관측 행위 자체가 "사용"이며 성장할수록
// 더 희귀한 유적/지형/별자리 관련 의뢰가 게시판에 뜬다(data/compendium.js, data/quests.js).
export const SKILL_CATEGORIES = {
  combat: { label: '전투 술기', color: '#e0645a' },
  archaeology: { label: '고고학', color: '#c9a876' },
  geography: { label: '지리학', color: '#6fc8e0' },
  astronomy: { label: '천문학', color: '#8f7fe0' },
};

export const MAX_SKILL_LEVEL = 15;

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

// effects: [{ key, mode: 'mul'|'add', v1, v15 }] — key는 seaScene.js의 기존
// mulSkillEffect/sumSkillEffect 호출부와 같은 이름을 그대로 재사용해, 버프가 켜져 있는 동안
// 그 계산식에 곱/가산으로 얹힌다(systems/skills.js의 buffMul/buffAdd).
export const PLAYER_SKILLS = {
  // ---- 전투 액티브 버프(핫키 시전, 슬롯 2개까지 장착) ----
  battle_cry: {
    id: 'battle_cry', name: '전투 함성', category: 'combat', type: 'active', icon: '📯',
    desc: '일정 시간 백병전 전투력이 크게 오른다.',
    cooldown: 60, duration: 20,
    effects: [{ key: 'meleePowerMul', mode: 'mul', v1: 1.15, v15: 1.5 }],
  },
  rapid_fire_stance: {
    id: 'rapid_fire_stance', name: '속사 태세', category: 'combat', type: 'active', icon: '🔥',
    desc: '일정 시간 포격 재장전 속도가 크게 빨라진다.',
    cooldown: 70, duration: 25,
    effects: [{ key: 'fireCooldownMul', mode: 'mul', v1: 0.85, v15: 0.55 }],
  },
  evasive_maneuver: {
    id: 'evasive_maneuver', name: '회피 기동', category: 'combat', type: 'active', icon: '🌀',
    desc: '일정 시간 피격 피해가 줄고 선회가 빨라진다.',
    cooldown: 60, duration: 20,
    effects: [
      { key: 'incomingDamageMul', mode: 'mul', v1: 0.9, v15: 0.6 },
      { key: 'combatTurnMul', mode: 'mul', v1: 1.1, v15: 1.35 },
    ],
  },
  combat_medic: {
    id: 'combat_medic', name: '응급 처치', category: 'combat', type: 'active', icon: '⚕️',
    desc: '일정 시간 초당 선체 자동 회복량이 크게 늘어난다.',
    cooldown: 90, duration: 15,
    effects: [{ key: 'combatHpRegenPerSec', mode: 'add', v1: 2, v15: 10 }],
  },

  // ---- 학문(모험 축 고유 성장 콘텐츠) — 조사/관측 행위 자체가 사용이다 ----
  archaeology: {
    id: 'archaeology', name: '고고학', category: 'archaeology', type: 'passive', icon: '🏺',
    desc: '해저 유적과 난파선을 조사해 잊힌 역사를 되짚는 학문.',
  },
  geography: {
    id: 'geography', name: '지리학', category: 'geography', type: 'passive', icon: '🗺️',
    desc: '세계 각지의 지형과 그 이면의 역사를 탐구하는 학문.',
  },
  astronomy: {
    id: 'astronomy', name: '천문학', category: 'astronomy', type: 'passive', icon: '🔭',
    desc: '밤하늘의 별자리를 관측하고 그 신화를 기록하는 학문.',
  },
};

export function getSkillDef(id) {
  return PLAYER_SKILLS[id];
}

// 전투 액티브 버프 4종 — 스킬 패널의 장착 UI가 순회할 목록.
export function getCombatActiveSkills() {
  return Object.values(PLAYER_SKILLS).filter((s) => s.category === 'combat' && s.type === 'active');
}

// 학문 스킬 3종.
export function getAcademicSkills() {
  return Object.values(PLAYER_SKILLS).filter((s) => s.type === 'passive');
}

// 스킬의 특정 effect key가 현재 레벨에서 갖는 실제 수치 — 없으면 null.
export function skillEffectValueAt(skillId, key, level) {
  const skill = PLAYER_SKILLS[skillId];
  const eff = skill?.effects?.find((e) => e.key === key);
  if (!eff) return null;
  return lerpByLevel(eff.v1, eff.v15, level);
}
