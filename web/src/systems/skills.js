// 선장 개인 스킬의 숙련도(경험치) 획득/레벨업과 장착 슬롯 관리 — 순수 데이터 계산만 담당하고,
// 전투 버프의 쿨다운/지속시간처럼 매 프레임 흐르는 타이머는 seaScene.js가 자신의 다른
// 타이머(fireTimer 등)와 같은 방식(delta 감산)으로 직접 들고 있는다(여기서는 다루지 않는다).
import { state, notify } from '../state.js';
import { PLAYER_SKILLS, MAX_SKILL_LEVEL, SKILL_EXP_CURVE, getSkillDef } from '../data/playerSkills.js';
import { hud } from '../ui/hud.js';

export function getSkillState(id) {
  return state.playerSkills[id] || { level: 1, exp: 0 };
}

export function getSkillLevel(id) {
  return getSkillState(id).level;
}

// 레벨(1~14)에서 다음 레벨까지 필요한 사용 횟수 — 이미 만렙(15)이면 null.
export function expToNext(level) {
  if (level >= MAX_SKILL_LEVEL) return null;
  return SKILL_EXP_CURVE[level - 1];
}

// 스킬을 "사용"할 때마다 호출 — amount는 보통 1(고정 소량), 도감 신규 등록처럼 큰 성과에는
// amount를 키워서 넘긴다. 레벨업 시 자동으로 토스트를 띄운다.
export function gainSkillExp(id, amount = 1) {
  const skill = getSkillDef(id);
  if (!skill) return { level: 1, leveledUp: false };
  const cur = getSkillState(id);
  let { level, exp } = cur;
  if (level >= MAX_SKILL_LEVEL) return { level, leveledUp: false };
  exp += amount;
  let leveledUp = false;
  while (level < MAX_SKILL_LEVEL) {
    const need = expToNext(level);
    if (exp < need) break;
    exp -= need;
    level += 1;
    leveledUp = true;
  }
  if (level >= MAX_SKILL_LEVEL) exp = 0;
  state.playerSkills = { ...state.playerSkills, [id]: { level, exp } };
  if (leveledUp) {
    hud.toast(`${skill.icon || ''} '${skill.name}' 숙련도가 Lv.${level}(으)로 올랐습니다!`);
  }
  notify({ skillsChanged: true });
  return { level, leveledUp };
}

// 스킬 패널의 진행도 바 — { level, exp, need(null이면 만렙), ratio(0~1) }
export function getSkillProgress(id) {
  const { level, exp } = getSkillState(id);
  const need = expToNext(level);
  return { level, exp, need, ratio: need ? Math.min(1, exp / need) : 1, isMax: need == null };
}

// ---- 전투 액티브 버프 장착 슬롯(최대 2개) ----
export function getCombatSkillSlots() {
  return state.combatSkillSlots || [null, null];
}

export function equipCombatSkill(id, slotIdx) {
  const slots = [null, null].map((_, i) => getCombatSkillSlots()[i] ?? null);
  const existing = slots.indexOf(id);
  if (existing !== -1) slots[existing] = null;
  slots[slotIdx] = id;
  state.combatSkillSlots = slots;
  notify({ skillsChanged: true });
}

export function unequipCombatSkill(slotIdx) {
  const slots = [null, null].map((_, i) => getCombatSkillSlots()[i] ?? null);
  slots[slotIdx] = null;
  state.combatSkillSlots = slots;
  notify({ skillsChanged: true });
}
