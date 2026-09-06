// 선장 개인 스킬의 숙련도(경험치)/랭크업, 학습(스승에게 배우기), 퀵슬롯 장착, 그리고 전투/
// 교역 액티브 버프의 쿨다운·지속시간 엔진까지 전부 여기서 관리한다. 예전엔 버프 타이머가
// seaScene.js 인스턴스에만 있어 바다에서만 작동했지만, 교역 스킬은 도시(시장)에서도 효과가
// 나야 하므로 모듈 상태로 공용화했다(activeBuffs/skillCooldowns는 세션 한정 — 세이브하지
// 않는다, 기존 fireTimer 등과 같은 관례). main.js의 공용 프레임 루프가 매 틱 tickSkillBuffs를
// 호출해 바다·도시 화면 어느 쪽에 있든 항상 흐르게 한다.
import { state, notify } from '../state.js';
import {
  PLAYER_SKILLS, MAX_SKILL_LEVEL, MAX_LEARNED_SKILLS, QUICKSLOT_COUNT,
  getSkillDef, castExpFor, lerpByLevel, curveFor,
} from '../data/playerSkills.js';
import { hud } from '../ui/hud.js';

export function getSkillState(id) {
  return state.playerSkills[id] || { level: 1, exp: 0 };
}

export function getSkillLevel(id) {
  return getSkillState(id).level;
}

// 레벨(1~14)에서 다음 레벨까지 필요한 사용 횟수 — 이미 만렙(15)이면 null. 스킬마다 곡선이
// 다르므로(전투/교역은 SKILL_EXP_CURVE, 학문은 ACADEMIC_EXP_CURVE) id가 반드시 필요하다.
export function expToNext(level, id) {
  if (level >= MAX_SKILL_LEVEL) return null;
  return curveFor(id)[level - 1];
}

// 스킬을 "사용"할 때마다 호출 — amount는 보통 castExpFor(level)(전투/교역) 또는 도감 발견
// 보상(학문, rewardForRank)처럼 상황에 맞게 넘긴다. 레벨업 시 자동으로 토스트를 띄운다.
export function gainSkillExp(id, amount = 1) {
  const skill = getSkillDef(id);
  if (!skill) return { level: 1, leveledUp: false };
  const cur = getSkillState(id);
  let { level, exp } = cur;
  if (level >= MAX_SKILL_LEVEL) return { level, leveledUp: false };
  exp += amount;
  let leveledUp = false;
  while (level < MAX_SKILL_LEVEL) {
    const need = expToNext(level, id);
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
  const need = expToNext(level, id);
  return { level, exp, need, ratio: need ? Math.min(1, exp / need) : 1, isMax: need == null };
}

// ---- 스킬 학습(스승에게 배우기) ----
export function isLearned(id) {
  return (state.learnedSkills || []).includes(id);
}

export function getLearnedSkills() {
  return state.learnedSkills || [];
}

export function learnSkill(id, cost) {
  const skill = getSkillDef(id);
  if (!skill) return { ok: false, reason: '존재하지 않는 스킬입니다.' };
  if (isLearned(id)) return { ok: false, reason: '이미 배운 스킬입니다.' };
  if ((state.learnedSkills || []).length >= MAX_LEARNED_SKILLS) {
    return { ok: false, reason: `배울 수 있는 스킬은 최대 ${MAX_LEARNED_SKILLS}개입니다.` };
  }
  if (state.gold < cost) return { ok: false, reason: '골드가 부족합니다.' };
  state.gold -= cost;
  state.learnedSkills = [...(state.learnedSkills || []), id];
  notify({ skillsChanged: true, goldChanged: true });
  return { ok: true };
}

// ---- 퀵슬롯 장착(최대 9개, 배운 스킬만 장착 가능) ----
export function getSkillSlots() {
  const slots = state.skillSlots || [];
  return Array(QUICKSLOT_COUNT).fill(null).map((_, i) => slots[i] ?? null);
}

export function equipSkill(id, slotIdx) {
  if (!isLearned(id)) return { ok: false, reason: '배우지 않은 스킬은 장착할 수 없습니다.' };
  const slots = getSkillSlots();
  const existing = slots.indexOf(id);
  if (existing !== -1) slots[existing] = null;
  slots[slotIdx] = id;
  state.skillSlots = slots;
  notify({ skillsChanged: true });
  return { ok: true };
}

export function unequipSkill(slotIdx) {
  const slots = getSkillSlots();
  slots[slotIdx] = null;
  state.skillSlots = slots;
  notify({ skillsChanged: true });
}

// ---- 액티브 버프 엔진(공용, 바다·도시 어디서든 동작) ----
// { [skillId]: { timer, level } } — 세션 한정(세이브하지 않음, 새로고침하면 사라짐).
const activeBuffs = {};
const skillCooldowns = {};

export function getActiveBuffs() {
  return activeBuffs;
}

export function getSkillCooldown(id) {
  return skillCooldowns[id] || 0;
}

// main.js의 공용 프레임 루프(바다·도시 공통)에서 매 프레임 호출 — fireTimer 등 다른 타이머와
// 같은 방식(delta 감산)으로 흐른다.
export function tickSkillBuffs(delta) {
  for (const id of Object.keys(skillCooldowns)) {
    const next = skillCooldowns[id] - delta;
    if (next <= 0) delete skillCooldowns[id]; else skillCooldowns[id] = next;
  }
  for (const id of Object.keys(activeBuffs)) {
    const b = activeBuffs[id];
    b.timer -= delta;
    if (b.timer <= 0) delete activeBuffs[id];
  }
}

// 활성 버프 중 key와 일치하는 효과를 곱/가산으로 모아 적용 — mulSkillEffect/sumSkillEffect
// (배 자체의 고정 스킬)와 같은 계산식에 나란히 곱하거나 더해 쓴다.
export function buffMul(key, base) {
  let total = base;
  for (const [id, b] of Object.entries(activeBuffs)) {
    if (b.timer <= 0) continue;
    for (const eff of PLAYER_SKILLS[id]?.effects || []) {
      if (eff.key === key && eff.mode === 'mul') total *= lerpByLevel(eff.v1, eff.v15, b.level);
    }
  }
  return total;
}

export function buffAdd(key, base) {
  let total = base;
  for (const [id, b] of Object.entries(activeBuffs)) {
    if (b.timer <= 0) continue;
    for (const eff of PLAYER_SKILLS[id]?.effects || []) {
      if (eff.key === key && eff.mode === 'add') total += lerpByLevel(eff.v1, eff.v15, b.level);
    }
  }
  return total;
}

// 퀵슬롯 시전(숫자키 1~9) — 배워서 장착된 스킬만, 쿨다운이 끝났을 때만 발동한다.
// canCast는 씬별 특수 제약(예: 백병전 중엔 전투 스킬 시전 불가)을 호출부에서 넘긴다.
export function castSkill(slotIdx, { canCast } = {}) {
  const skillId = getSkillSlots()[slotIdx];
  if (!skillId) { hud.toast('장착된 스킬이 없습니다. (K: 스킬 패널)'); return; }
  const skill = PLAYER_SKILLS[skillId];
  if (!skill) return;
  if (canCast && !canCast()) return;
  if (getSkillCooldown(skillId) > 0) {
    hud.toast(`재사용 대기 중입니다. (${Math.ceil(getSkillCooldown(skillId))}초)`);
    return;
  }
  const level = getSkillLevel(skillId);
  activeBuffs[skillId] = { timer: skill.duration, level };
  skillCooldowns[skillId] = skill.cooldown;
  gainSkillExp(skillId, castExpFor(level));
  hud.toast(`${skill.icon} '${skill.name}' 발동! (Lv.${level}, ${skill.duration}초)`);
}
