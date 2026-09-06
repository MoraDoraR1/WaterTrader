// 선장의 스킬 패널 — 전투 액티브 버프 4종(장착 슬롯 선택 포함)과 학문 3종(고고학/지리학/
// 천문학)의 레벨·숙련도 진행도를 한 화면에서 보여준다. 조선소/의뢰 게시판과 같은 카드
// 레이아웃·행 렌더러(hud.renderSkillPanel → renderRowList)를 그대로 재사용한다.
import { state } from '../state.js';
import { hud } from './hud.js';
import { getCombatActiveSkills, getAcademicSkills, SKILL_CATEGORIES, MAX_SKILL_LEVEL } from '../data/playerSkills.js';
import { getSkillProgress, getCombatSkillSlots, equipCombatSkill, unequipCombatSkill } from '../systems/skills.js';

function fmt(n) { return n.toLocaleString('ko-KR'); }

function progressBar(ratio, color) {
  return `<div class="bar-track" style="margin-top:5px;"><div class="bar-fill" style="width:${Math.max(2, ratio * 100)}%;background:linear-gradient(90deg, ${color}, ${color}cc)"></div></div>`;
}

function combatSkillRow(skill) {
  const prog = getSkillProgress(skill.id);
  const slots = getCombatSkillSlots();
  const slotIdx = slots.indexOf(skill.id);
  const equipped = slotIdx !== -1;
  const progLabel = prog.isMax ? '만렙' : `${prog.exp} / ${prog.need} 시전`;
  const sub = `${skill.desc}<br>쿨다운 ${skill.cooldown}초 · 지속 ${skill.duration}초 · Lv.${prog.level}${prog.isMax ? '(MAX)' : ''} — ${progLabel}`
    + progressBar(prog.ratio, SKILL_CATEGORIES.combat.color);
  const otherSlot = slots.findIndex((id, i) => id === null && i !== slotIdx);
  return {
    name: `${skill.icon} ${skill.name}`,
    sub,
    actionLabel: equipped ? `슬롯 ${slotIdx + 1}에 장착됨` : '장착',
    disabled: equipped,
    highlight: equipped,
    onAction: equipped ? null : () => {
      const target = otherSlot !== -1 ? otherSlot : 0;
      equipCombatSkill(skill.id, target);
      renderSkillTab();
    },
    secondaryLabel: equipped ? '해제' : null,
    onSecondary: equipped ? () => { unequipCombatSkill(slotIdx); renderSkillTab(); } : null,
  };
}

function academicSkillRow(skill) {
  const prog = getSkillProgress(skill.id);
  const progLabel = prog.isMax ? '만렙' : `${prog.exp} / ${prog.need} 조사·관측`;
  const sub = `${skill.desc}<br>Lv.${prog.level}${prog.isMax ? '(MAX)' : ''} — ${progLabel}`
    + progressBar(prog.ratio, SKILL_CATEGORIES[skill.category].color);
  return { name: `${skill.icon} ${skill.name}`, sub, disabled: true };
}

export function renderSkillTab() {
  const rows = [];
  rows.push({ name: '⚔ 전투 액티브 버프 (숫자키 1/2로 시전, 최대 2개 장착)', sub: '', disabled: true });
  for (const s of getCombatActiveSkills()) rows.push(combatSkillRow(s));
  rows.push({ name: '📚 학문 (모험 축) — 바다 위에서 조사·관측할수록 성장합니다', sub: '', disabled: true });
  for (const s of getAcademicSkills()) rows.push(academicSkillRow(s));
  hud.renderSkillPanel(rows);
}

export function openSkillPanel() {
  renderSkillTab();
  hud.showSkillPanel(true);
}
