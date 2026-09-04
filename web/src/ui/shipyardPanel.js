// 조선소 패널(구매/수리/부품)의 화면 구성 로직. state와 systems/shipyard.js의 액션을 이용해
// hud.renderShipyard()에 넘길 행(row) 데이터를 만든다 — hud.js 자체는 이 데이터의 의미를 모른다.
import { state } from '../state.js';
import { hud } from './hud.js';
import { SHIPS, SHIP_ROLES, SHIP_CLASSES, COUNTRY_NAMES, getShip } from '../data/ships.js';
import { PART_SLOTS, partsBySlot, getPart, getEffectiveShipDef } from '../data/shipParts.js';
import {
  buyShip, repairShip, repairCost, tradeInValue, equipPart, unequipPart, getCurrentEffectiveShipDef,
  setActiveShip, sellFleetShip, FLEET_CAP,
} from '../systems/shipyard.js';

function fmt(n) { return n.toLocaleString('ko-KR'); }

function effectSummary(part) {
  const e = part.effects;
  const bits = [];
  if (e.cannonsAdd) bits.push(`화력 +${e.cannonsAdd}`);
  if (e.hpAdd) bits.push(`내구 +${e.hpAdd}`);
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
  const filtered = buyRoleFilter === 'all' ? SHIPS : SHIPS.filter((s) => s.role === buyRoleFilter);
  const rows = [...filtered].sort(SORT_MODES[buySortMode].cmp).map((s) => {
    const isOwned = owned.has(s.id);
    const role = SHIP_ROLES[s.role];
    const cls = SHIP_CLASSES[s.class];
    const disabled = isOwned || fleetFull;
    return {
      name: s.name,
      badge: role.label, badgeColor: role.color,
      sub: `${cls.label} · ${COUNTRY_NAMES[s.country]} · ${s.era} · 내구 ${s.hp} · 화력 ${s.cannons} · 적재 ${s.cargo}t · 속도 ${s.speed}`,
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

function renderPartsOverview() {
  const rows = Object.entries(PART_SLOTS).map(([slot, meta]) => {
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

const TAB_RENDERERS = { buy: renderBuyTab, fleet: renderFleetTab, repair: renderRepairTab, parts: renderPartsOverview };

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
