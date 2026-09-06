// 선장의 스킬 패널 — 3개 탭(퀵슬롯/보유 스킬/학문)으로 구성된다.
// 퀵슬롯: 9칸 그리드, 장착된 스킬의 쿨다운/랭크를 보여주고 클릭하면 해제된다.
// 보유 스킬: 스승에게 배운 전투/교역 스킬(최대 30개) 목록 — 랭크 진행도 + 장착/해제 버튼.
// 학문: 고고학/지리학/천문학 3종 — 이들도 도시의 학자에게 배워야 하며, 배운 뒤로는 조사·
// 관측(G키)으로만 성장하는 순수 게이팅용 랭크라 퀵슬롯 장착 개념은 없다(읽기 전용).
import { hud } from './hud.js';
import { getAcademicSkills, SKILL_CATEGORIES, MAX_LEARNED_SKILLS, getSkillDef } from '../data/playerSkills.js';
import { getSkillProgress, getSkillSlots, equipSkill, unequipSkill, getLearnedSkills, getSkillCooldown, getActiveBuffs, isLearned } from '../systems/skills.js';

function progressBar(ratio, color) {
  return `<div class="bar-track" style="margin-top:5px;"><div class="bar-fill" style="width:${Math.max(2, ratio * 100)}%;background:linear-gradient(90deg, ${color}, ${color}cc)"></div></div>`;
}

let activeTab = 'quickslots';

function renderQuickslotsTab() {
  const slots = getSkillSlots();
  const activeBuffs = getActiveBuffs();
  hud.renderQuickslotGrid(slots.map((id, i) => {
    if (!id) return { label: '비어있음', filled: false };
    const skill = getSkillDef(id);
    const buff = activeBuffs[id];
    const cd = getSkillCooldown(id);
    const status = buff && buff.timer > 0 ? `발동 중 (${Math.ceil(buff.timer)}초)` : cd > 0 ? `대기 ${Math.ceil(cd)}초` : '준비됨';
    return { label: `${skill.icon} ${skill.name}`, sub: status, filled: true, onClick: () => { unequipSkill(i); renderQuickslotsTab(); } };
  }));
  hud.renderSkillPanel([{
    name: '슬롯을 비우려면 채워진 칸을 클릭하세요.',
    sub: '장착은 "보유 스킬" 탭에서 합니다.',
    disabled: true,
  }]);
}

function learnedSkillRow(id) {
  const skill = getSkillDef(id);
  const prog = getSkillProgress(id);
  const slots = getSkillSlots();
  const slotIdx = slots.indexOf(id);
  const equipped = slotIdx !== -1;
  const progLabel = prog.isMax ? '만렙' : `${prog.exp} / ${prog.need} 시전`;
  const catLabel = SKILL_CATEGORIES[skill.category]?.label || skill.category;
  const sub = `[${catLabel}] ${skill.desc}<br>쿨다운 ${skill.cooldown}초 · 지속 ${skill.duration}초 · Lv.${prog.level}${prog.isMax ? '(MAX)' : ''} — ${progLabel}`
    + progressBar(prog.ratio, SKILL_CATEGORIES[skill.category]?.color || '#e6c15a');
  const firstEmpty = slots.indexOf(null);
  return {
    name: `${skill.icon} ${skill.name}`,
    sub,
    actionLabel: equipped ? `슬롯 ${slotIdx + 1}에 장착됨` : (firstEmpty === -1 ? '퀵슬롯이 가득참' : '장착'),
    disabled: equipped || firstEmpty === -1,
    highlight: equipped,
    onAction: (!equipped && firstEmpty !== -1) ? () => { equipSkill(id, firstEmpty); renderLearnedTab(); } : null,
    secondaryLabel: equipped ? '해제' : null,
    onSecondary: equipped ? () => { unequipSkill(slotIdx); renderLearnedTab(); } : null,
  };
}

function renderLearnedTab() {
  hud.hideQuickslotGrid();
  const learned = getLearnedSkills();
  const rows = learned.length
    ? learned.map(learnedSkillRow)
    : [{ name: '아직 배운 스킬이 없습니다.', sub: '도시를 돌아다니며 스승·스킬북 상인을 찾아 사사하세요.', disabled: true }];
  rows.unshift({ name: `보유 스킬 ${learned.length} / ${MAX_LEARNED_SKILLS}`, sub: '', disabled: true });
  hud.renderSkillPanel(rows);
}

function academicSkillRow(skill) {
  if (!isLearned(skill.id)) {
    return {
      name: `🔒 ${skill.icon} ${skill.name}`,
      sub: `${skill.desc}<br>도시의 학자에게 배우지 않았습니다 — 사사하기 전엔 조사·관측 자체가 불가능합니다.`,
      disabled: true,
    };
  }
  const prog = getSkillProgress(skill.id);
  const progLabel = prog.isMax ? '만렙' : `${prog.exp} / ${prog.need} 발견`;
  const sub = `${skill.desc}<br>Lv.${prog.level}${prog.isMax ? '(MAX)' : ''} — ${progLabel} (퀘스트 수주·발견 조건으로만 쓰입니다)`
    + progressBar(prog.ratio, SKILL_CATEGORIES[skill.category].color);
  return { name: `${skill.icon} ${skill.name}`, sub, disabled: true };
}

function renderAcademicTab() {
  hud.hideQuickslotGrid();
  hud.renderSkillPanel(getAcademicSkills().map(academicSkillRow));
}

export function renderSkillTab(tab = activeTab) {
  activeTab = tab;
  hud.setSkillActiveTab(tab);
  if (tab === 'quickslots') renderQuickslotsTab();
  else if (tab === 'learned') renderLearnedTab();
  else renderAcademicTab();
}

export function openSkillPanel() {
  renderSkillTab(activeTab);
  hud.showSkillPanel(true);
}

export function wireSkillTabs() {
  document.querySelectorAll('#skill-tabs .sy-tab').forEach((btn) => {
    btn.addEventListener('click', () => renderSkillTab(btn.dataset.tab));
  });
}
