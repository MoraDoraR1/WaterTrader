// 조선소 패널(구매/수리/부품)의 화면 구성 로직. state와 systems/shipyard.js의 액션을 이용해
// hud.renderShipyard()에 넘길 행(row) 데이터를 만든다 — hud.js 자체는 이 데이터의 의미를 모른다.
import { state } from '../state.js';
import { hud } from './hud.js';
import { SHIPS, SHIP_ROLES, SHIP_CLASSES, COUNTRY_NAMES, getShip } from '../data/ships.js';
import { PART_SLOTS, partsBySlot, getPart, getEffectiveShipDef, getBaseArmor } from '../data/shipParts.js';
import { getShipSkills } from '../data/shipSkills.js';
import { getCombatPower } from '../systems/combatPower.js';
import { getBuildMaterial } from '../data/buildMaterials.js';
import {
  buyShip, buildShip, repairShip, repairCost, tradeInValue, equipPart, unequipPart, getCurrentEffectiveShipDef,
  setActiveShip, sellFleetShip, FLEET_CAP, getCannonSlotCount, getCannonSlotMaxTier,
} from '../systems/shipyard.js';

function fmt(n) { return n.toLocaleString('ko-KR'); }

function effectSummary(part) {
  const e = part.effects;
  const bits = [];
  if (e.cannonsAdd) bits.push(`화력 +${e.cannonsAdd}`);
  if (e.hpAdd) bits.push(`내구 +${e.hpAdd}`);
  if (e.armorAdd) bits.push(`방어 +${e.armorAdd}%`);
  if (e.cargoAdd) bits.push(`적재 +${e.cargoAdd}t`);
  if (e.speedMul) bits.push(`속도 ${e.speedMul > 1 ? '+' : ''}${Math.round((e.speedMul - 1) * 100)}%`);
  if (e.turnRateMul) bits.push(`선회 ${e.turnRateMul > 1 ? '+' : ''}${Math.round((e.turnRateMul - 1) * 100)}%`);
  return bits.join(' · ');
}

let buyRoleFilter = 'all';
let buySortMode = 'price_asc';
const SORT_MODES = {
  price_asc: { label: '가격↑', cmp: (a, b) => a.price - b.price },
  price_desc: { label: '가격↓', cmp: (a, b) => b.price - a.price },
  hp_desc: { label: '내구↓', cmp: (a, b) => b.hp - a.hp },
  cargo_desc: { label: '적재↓', cmp: (a, b) => b.cargo - a.cargo },
  speed_desc: { label: '속도↓', cmp: (a, b) => b.speed - a.speed },
};

function renderBuyFilterRow() {
  const row = document.getElementById('buy-filter-row');
  row.classList.remove('hidden');
  const roleChip = (id, label) => `<button class="buy-filter-chip${buyRoleFilter === id ? ' active' : ''}" data-role="${id}">${label}</button>`;
  const sortChip = (id) => `<button class="buy-filter-chip${buySortMode === id ? ' active' : ''}" data-sort="${id}">${SORT_MODES[id].label}</button>`;
  row.innerHTML = [
    roleChip('all', '전체'),
    ...Object.entries(SHIP_ROLES).map(([id, r]) => roleChip(id, r.label)),
    ...Object.keys(SORT_MODES).map(sortChip),
  ].join('');
  row.querySelectorAll('[data-role]').forEach((btn) => {
    btn.onclick = () => { buyRoleFilter = btn.dataset.role; renderBuyTab(); };
  });
  row.querySelectorAll('[data-sort]').forEach((btn) => {
    btn.onclick = () => { buySortMode = btn.dataset.sort; renderBuyTab(); };
  });
}

function renderBuyTab() {
  renderBuyFilterRow();
  const owned = new Set([state.currentShipId, ...state.fleet.map((f) => f.shipId)]);
  const fleetFull = state.fleet.length + 1 >= FLEET_CAP;
  // 해적 전용 선박(purchasable: false)은 조선소에서 살 수 없다 — 오직 해적 NPC로만 등장.
  // 건조 전용 선박(acquire: 'build')도 여기서는 제외 — '건조' 탭에서만 만들 수 있다.
  const purchasableShips = SHIPS.filter((s) => s.purchasable !== false && s.acquire !== 'build');
  const filtered = buyRoleFilter === 'all' ? purchasableShips : purchasableShips.filter((s) => s.role === buyRoleFilter);
  const rows = [...filtered].sort(SORT_MODES[buySortMode].cmp).map((s) => {
    const isOwned = owned.has(s.id);
    const role = SHIP_ROLES[s.role];
    const cls = SHIP_CLASSES[s.class];
    const disabled = isOwned || fleetFull;
    const skillNames = getShipSkills(s).map((sk) => sk.name).join(', ');
    // 구매 직후(부품 하나도 없는 상태) 기준 전투력 — 대포가 없어 화력 점수는 0이지만
    // 기본 방어력·정원(백병전력)은 이미 반영된다. 부품을 달면 더 오른다.
    const combatPower = getCombatPower(s, {}).score;
    return {
      name: s.name,
      badge: role.label, badgeColor: role.color,
      sub: `${cls.label} · ${COUNTRY_NAMES[s.country]} · ${s.era} · 내구 ${s.hp} · 기본 방어 ${getBaseArmor(s)}% · 최대 화력 ${s.cannons}(부품 장착 필요) · 적재 ${s.cargo}t · 속도 ${s.speed} · 전투력 ${combatPower}(구매 직후) · 스킬: ${skillNames}`,
      priceLabel: isOwned ? '보유 중' : `${fmt(s.price)} 두캇`,
      actionLabel: isOwned ? '보유 중' : fleetFull ? '함대 만석' : '구매',
      disabled,
      highlight: isOwned,
      onAction: disabled ? null : () => {
        const res = buyShip(s.id);
        if (res.ok) {
          hud.toast(`${s.name}을(를) 함대에 편입했습니다. '함대' 탭에서 기함으로 교체할 수 있습니다.`);
          renderBuyTab();
        } else {
          hud.toast(res.reason);
        }
      },
    };
  });
  hud.renderShipyard({ title: `조선소 — 배 구매 (구매한 배는 함대에 예비로 편입됩니다, 최대 ${FLEET_CAP}척)`, gold: state.gold, rows });
}

// 재료 이름에 마우스를 올리면 설명/효과/획득처가 뜨는 툴팁 span을 만든다 — index.html의
// .item-tip/.tip-box CSS가 실제 표시를 담당한다(순수 CSS :hover, 별도 JS 이벤트 불필요).
function materialTip(id, qtyLabel) {
  const m = getBuildMaterial(id);
  if (!m) return qtyLabel != null ? `${id} ${qtyLabel}` : id;
  const label = qtyLabel != null ? `${m.name} ${qtyLabel}` : m.name;
  return `<span class="item-tip">${label}<span class="tip-box"><b>${m.name}</b>${m.desc}`
    + `<span class="tip-effect">효과: ${m.effect}</span>`
    + `<span class="tip-source">획득처: ${m.source}</span></span></span>`;
}

// buildCostLabel: priceLabel(우측, textContent로만 렌더)에 쓸 축약 텍스트 — 툴팁 마크업 없음.
function buildCostLabel(cost) {
  const bits = [`${fmt(cost.gold || 0)} 두캇`];
  if (cost.materials) bits.push(`자재 ${cost.materials}`);
  if (cost.oakTimber) bits.push(`상급 조선용 참나무 ${cost.oakTimber}`);
  if (cost.ironcladPlating) bits.push(`전설 해적기함의 철갑판 ${cost.ironcladPlating}`);
  if (cost.robertsRelic) bits.push(`로열 포춘호의 파편 ${cost.robertsRelic}`);
  return bits.join(' + ');
}

// buildCostTipLabel: sub(innerHTML로 렌더)에 쓸 재료 목록 — 재료 이름마다 툴팁이 붙는다.
function buildCostTipLabel(cost) {
  const bits = [`${fmt(cost.gold || 0)} 두캇`];
  if (cost.materials) bits.push(materialTip('materials', cost.materials));
  if (cost.oakTimber) bits.push(materialTip('oakTimber', cost.oakTimber));
  if (cost.ironcladPlating) bits.push(materialTip('ironcladPlating', cost.ironcladPlating));
  if (cost.robertsRelic) bits.push(materialTip('robertsRelic', cost.robertsRelic));
  return bits.join(' + ');
}

function canAffordBuild(cost) {
  return state.gold >= (cost.gold || 0)
    && state.materials >= (cost.materials || 0)
    && state.oakTimber >= (cost.oakTimber || 0)
    && state.ironcladPlating >= (cost.ironcladPlating || 0)
    && state.robertsRelic >= (cost.robertsRelic || 0);
}

// 건조 전용 선박(data/ships.js의 acquire:'build') 목록 — 구매가 아니라 골드+재료(자재/
// 상급 조선용 참나무/전설 해적기함의 철갑판)를 소모해 만든다. 재료는 전투 노획으로만 얻는다.
function renderBuildTab() {
  const owned = new Set([state.currentShipId, ...state.fleet.map((f) => f.shipId)]);
  const fleetFull = state.fleet.length + 1 >= FLEET_CAP;
  const buildableShips = SHIPS.filter((s) => s.acquire === 'build' && s.buildCost);
  // 목록 맨 위에 보유 재료 요약을 눌러도 아무 동작 없는 안내 행으로 얹는다 — title은
  // textContent로만 렌더되어 툴팁 마크업이 안 먹으므로, innerHTML로 렌더되는 행의 sub를 쓴다.
  const heldRow = {
    name: '📦 보유 재료',
    sub: [
      materialTip('materials', state.materials),
      materialTip('oakTimber', state.oakTimber),
      materialTip('ironcladPlating', state.ironcladPlating),
      materialTip('robertsRelic', state.robertsRelic),
    ].join(' · '),
    disabled: true,
  };
  const rows = [...buildableShips].sort((a, b) => (a.buildCost.gold || 0) - (b.buildCost.gold || 0)).map((s) => {
    const isOwned = owned.has(s.id);
    const role = SHIP_ROLES[s.role];
    const cls = SHIP_CLASSES[s.class];
    const afford = canAffordBuild(s.buildCost);
    const disabled = isOwned || fleetFull || !afford;
    const skillNames = getShipSkills(s).map((sk) => sk.name).join(', ');
    const combatPower = getCombatPower(s, {}).score;
    return {
      name: s.name,
      badge: role.label, badgeColor: role.color,
      sub: `${cls.label} · ${COUNTRY_NAMES[s.country]} · ${s.era} · 내구 ${s.hp} · 기본 방어 ${getBaseArmor(s)}% · 최대 화력 ${s.cannons}(부품 장착 필요) · 적재 ${s.cargo}t · 속도 ${s.speed} · 전투력 ${combatPower}(건조 직후) · 스킬: ${skillNames}`
        + `<br>필요 재료: ${buildCostTipLabel(s.buildCost)}`,
      priceLabel: isOwned ? '보유 중' : buildCostLabel(s.buildCost),
      actionLabel: isOwned ? '보유 중' : fleetFull ? '함대 만석' : afford ? '건조' : '재료 부족',
      disabled,
      highlight: isOwned,
      onAction: disabled ? null : () => {
        const res = buildShip(s.id);
        if (res.ok) {
          hud.toast(`${s.name}을(를) 건조해 함대에 편입했습니다. '함대' 탭에서 기함으로 교체할 수 있습니다.`);
          renderBuildTab();
        } else {
          hud.toast(res.reason);
        }
      },
    };
  });
  hud.renderShipyard({
    title: `조선소 — 건조 (재료는 엘리트·보스·레전더리 해적 격침으로 노획 — 구매 불가 최상위 함선, 최대 ${FLEET_CAP}척)`,
    gold: state.gold,
    rows: [heldRow, ...rows],
  });
}

function renderFleetTab() {
  const currentDef = getShip(state.currentShipId);
  const rows = [{
    name: `⚑ ${currentDef.name} (기함)`,
    badge: '조종 중', badgeColor: '#f3d98a',
    sub: `내구 ${Math.round(state.shipHp)} / ${getCurrentEffectiveShipDef().hp} · 속도 ${getCurrentEffectiveShipDef().speed}`,
    actionLabel: '조종 중',
    disabled: true,
    highlight: true,
  }];
  for (const f of state.fleet) {
    const def = getShip(f.shipId);
    const effDef = getEffectiveShipDef(def, f.shipParts);
    const credit = Math.round(def.price * 0.4);
    rows.push({
      name: def.name,
      badge: '예비', badgeColor: '#8fa8b8',
      sub: `내구 ${Math.round(f.shipHp)} / ${effDef.hp} · 속도 ${effDef.speed} · 항구에 정박 중`,
      priceLabel: `판매가 ${fmt(credit)} 두캇`,
      actionLabel: '기함으로 교체',
      onAction: () => {
        const res = setActiveShip(f.uid);
        if (res.ok) { hud.toast(`${def.name}(으)로 갈아탔습니다.`); renderFleetTab(); }
        else hud.toast(res.reason);
      },
      secondaryLabel: '판매',
      onSecondary: () => {
        const res = sellFleetShip(f.uid);
        if (res.ok) { hud.toast(`${def.name}을(를) ${fmt(res.credit)} 두캇에 팔았습니다.`); renderFleetTab(); }
        else hud.toast(res.reason);
      },
    });
  }
  hud.renderShipyard({
    title: `조선소 — 함대 편성 (${state.fleet.length + 1} / ${FLEET_CAP}척)`,
    gold: state.gold,
    rows,
  });
}

function renderRepairTab() {
  const shipDef = getCurrentEffectiveShipDef();
  const cost = repairCost();
  const full = state.shipHp >= shipDef.hp;
  const rows = [{
    name: getShip(state.currentShipId).name,
    sub: `현재 내구도 ${Math.round(state.shipHp)} / ${shipDef.hp} · 목수를 고용해 전액 수리(자재 소모 없음)`,
    priceLabel: full ? '-' : `${fmt(cost)} 두캇`,
    actionLabel: full ? '완전한 상태' : '수리',
    disabled: full,
    highlight: full,
    onAction: full ? null : () => {
      const res = repairShip();
      if (res.ok) { hud.toast('선체를 완전히 수리했습니다.'); renderRepairTab(); }
      else hud.toast(res.reason);
    },
  }];
  hud.renderShipyard({ title: '조선소 — 수리', gold: state.gold, rows });
}

function cannonSlotsArray() {
  return Array.isArray(state.shipParts.cannon) ? state.shipParts.cannon : (state.shipParts.cannon ? [state.shipParts.cannon] : []);
}

function renderPartsOverview() {
  const baseShip = getShip(state.currentShipId);
  const rows = Object.entries(PART_SLOTS).map(([slot, meta]) => {
    if (slot === 'cannon') {
      const slotCount = getCannonSlotCount(baseShip);
      const equipped = cannonSlotsArray().filter(Boolean).map(getPart).filter(Boolean);
      if (slotCount === 0) {
        return {
          name: `${meta.icon} ${meta.label} (장착 불가)`,
          sub: '이 배는 대포 슬롯이 없습니다 — 충각·백병전으로 싸우는 함종입니다.',
          actionLabel: '변경',
          disabled: true,
          onAction: null,
        };
      }
      return {
        name: `${meta.icon} ${meta.label} (${equipped.length}/${slotCount}칸, 최대 화력 ${baseShip.cannons})`,
        sub: equipped.length ? equipped.map((p) => p.name).join(', ') : '미장착 — 대포가 없으면 포격할 수 없습니다.',
        actionLabel: '변경',
        onAction: () => (slotCount === 1 ? renderCannonSlot(0) : renderCannonSlots()),
      };
    }
    const equippedId = state.shipParts[slot];
    const equipped = equippedId ? getPart(equippedId) : null;
    return {
      name: `${meta.icon} ${meta.label}`,
      sub: equipped ? `${equipped.name} — ${effectSummary(equipped)}` : '미장착',
      actionLabel: '변경',
      onAction: () => renderPartsSlot(slot),
    };
  });
  hud.renderShipyard({ title: '조선소 — 부품', gold: state.gold, rows });
}

// 대포는 배 등급(class)에 따라 슬롯이 1~6개다 — 2개 이상이면 먼저 슬롯 목록을 보여주고,
// 슬롯 하나를 고르면(renderCannonSlot) 그 슬롯에 낄 부품을 고르는 기존 화면으로 들어간다.
function renderCannonSlots() {
  const baseShip = getShip(state.currentShipId);
  const slotCount = getCannonSlotCount(baseShip);
  const equipped = cannonSlotsArray();
  const rows = [{ name: '← 목록으로', sub: '', actionLabel: '뒤로', onAction: renderPartsOverview }];
  for (let i = 0; i < slotCount; i++) {
    const part = equipped[i] ? getPart(equipped[i]) : null;
    rows.push({
      name: `대포 슬롯 ${i + 1} (최대 Tier ${getCannonSlotMaxTier(baseShip, i)})`,
      sub: part ? `${part.name} — ${effectSummary(part)}` : '미장착',
      actionLabel: '선택',
      onAction: () => renderCannonSlot(i),
    });
  }
  hud.renderShipyard({ title: `조선소 — 부품 · 대포 (${baseShip.name}, 슬롯 ${slotCount}개)`, gold: state.gold, rows });
}

function renderCannonSlot(slotIndex) {
  const baseShip = getShip(state.currentShipId);
  const slotCount = getCannonSlotCount(baseShip);
  const maxTier = getCannonSlotMaxTier(baseShip, slotIndex);
  const backTarget = slotCount === 1 ? renderPartsOverview : renderCannonSlots;
  const equippedId = cannonSlotsArray()[slotIndex];
  const rows = [{ name: '← 뒤로', sub: '', actionLabel: '뒤로', onAction: backTarget }];
  for (const p of partsBySlot('cannon')) {
    const isEquipped = equippedId === p.id;
    const overCap = p.tier > maxTier;
    rows.push({
      name: `${p.name} (Tier ${p.tier})`,
      sub: overCap ? `이 슬롯은 Tier ${maxTier}까지만 장착 가능합니다.` : `${p.desc} · ${effectSummary(p)}`,
      priceLabel: `${fmt(p.price)} 두캇`,
      actionLabel: isEquipped ? '장착됨' : overCap ? '장착 불가' : '장착',
      disabled: isEquipped || overCap,
      highlight: isEquipped,
      onAction: (isEquipped || overCap) ? null : () => {
        const res = equipPart('cannon', p.id, slotIndex);
        if (res.ok) { hud.toast(`${p.name} 장착 완료 (슬롯 ${slotIndex + 1}).`); renderCannonSlot(slotIndex); }
        else hud.toast(res.reason);
      },
    });
  }
  if (equippedId) {
    rows.push({
      name: '부품 해제',
      sub: '이 슬롯에 장착된 부품을 제거합니다(환불 없음).',
      actionLabel: '해제',
      onAction: () => {
        const res = unequipPart('cannon', slotIndex);
        if (res.ok) { hud.toast('부품을 해제했습니다.'); renderCannonSlot(slotIndex); }
        else hud.toast(res.reason);
      },
    });
  }
  const title = slotCount === 1 ? '조선소 — 부품 · 대포' : `조선소 — 부품 · 대포 슬롯 ${slotIndex + 1}`;
  hud.renderShipyard({ title, gold: state.gold, rows });
}

function renderPartsSlot(slot) {
  const meta = PART_SLOTS[slot];
  const equippedId = state.shipParts[slot];
  const rows = [{ name: '← 목록으로', sub: '', actionLabel: '뒤로', onAction: renderPartsOverview }];
  for (const p of partsBySlot(slot)) {
    const isEquipped = equippedId === p.id;
    rows.push({
      name: `${p.name} (Tier ${p.tier})`,
      sub: `${p.desc} · ${effectSummary(p)}`,
      priceLabel: `${fmt(p.price)} 두캇`,
      actionLabel: isEquipped ? '장착됨' : '장착',
      disabled: isEquipped,
      highlight: isEquipped,
      onAction: isEquipped ? null : () => {
        const res = equipPart(slot, p.id);
        if (res.ok) { hud.toast(`${p.name} 장착 완료.`); renderPartsSlot(slot); }
        else hud.toast(res.reason);
      },
    });
  }
  if (equippedId) {
    rows.push({
      name: '부품 해제',
      sub: '현재 장착된 부품을 제거합니다(환불 없음).',
      actionLabel: '해제',
      onAction: () => {
        const res = unequipPart(slot);
        if (res.ok) { hud.toast('부품을 해제했습니다.'); renderPartsSlot(slot); }
        else hud.toast(res.reason);
      },
    });
  }
  hud.renderShipyard({ title: `조선소 — 부품 · ${meta.label}`, gold: state.gold, rows });
}

const TAB_RENDERERS = { buy: renderBuyTab, build: renderBuildTab, fleet: renderFleetTab, repair: renderRepairTab, parts: renderPartsOverview };

export function openShipyard(tab) {
  hud.setShipyardActiveTab(tab);
  if (tab !== 'buy') document.getElementById('buy-filter-row').classList.add('hidden');
  (TAB_RENDERERS[tab] || renderBuyTab)();
  hud.showShipyard(true);
}

export function wireShipyardTabs() {
  document.querySelectorAll('#shipyard-tabs .sy-tab').forEach((btn) => {
    btn.addEventListener('click', () => openShipyard(btn.dataset.tab));
  });
}
