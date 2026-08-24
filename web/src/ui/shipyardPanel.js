// 조선소 패널(구매/수리/부품)의 화면 구성 로직. state와 systems/shipyard.js의 액션을 이용해
// hud.renderShipyard()에 넘길 행(row) 데이터를 만든다 — hud.js 자체는 이 데이터의 의미를 모른다.
import { state } from '../state.js';
import { hud } from './hud.js';
import { SHIPS, SHIP_ROLES, SHIP_CLASSES, COUNTRY_NAMES, getShip } from '../data/ships.js';
import { PART_SLOTS, partsBySlot, getPart } from '../data/shipParts.js';
import { buyShip, repairShip, repairCost, tradeInValue, equipPart, unequipPart, getCurrentEffectiveShipDef } from '../systems/shipyard.js';

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

function renderBuyTab() {
  const currentId = state.currentShipId;
  const credit = tradeInValue();
  const rows = [...SHIPS].sort((a, b) => a.price - b.price).map((s) => {
    const isCurrent = s.id === currentId;
    const netCost = Math.max(0, s.price - credit);
    const role = SHIP_ROLES[s.role];
    const cls = SHIP_CLASSES[s.class];
    return {
      name: s.name,
      badge: role.label, badgeColor: role.color,
      sub: `${cls.label} · ${COUNTRY_NAMES[s.country]} · ${s.era} · 내구 ${s.hp} · 화력 ${s.cannons} · 적재 ${s.cargo}t`,
      priceLabel: isCurrent ? '보유 중' : `${fmt(netCost)} 두캇`,
      actionLabel: isCurrent ? '현재 배' : '구매',
      disabled: isCurrent,
      highlight: isCurrent,
      onAction: isCurrent ? null : () => {
        const res = buyShip(s.id);
        if (res.ok) {
          hud.toast(`${s.name}을(를) 인수했습니다.${res.hadParts ? ' 기존에 장착했던 부품은 새 배로 옮겨지지 않았습니다.' : ''}`);
          renderBuyTab();
        } else {
          hud.toast(res.reason);
        }
      },
    };
  });
  hud.renderShipyard({ title: `조선소 — 배 구매 (하선가 ${fmt(credit)} 두캇 인정)`, gold: state.gold, rows });
}

function renderRepairTab() {
  const shipDef = getCurrentEffectiveShipDef();
  const cost = repairCost();
  const full = state.shipHp >= shipDef.hp;
  const rows = [{
    name: getShip(state.currentShipId).name,
    sub: `현재 내구도 ${Math.round(state.shipHp)} / ${shipDef.hp}`,
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

const TAB_RENDERERS = { buy: renderBuyTab, repair: renderRepairTab, parts: renderPartsOverview };

export function openShipyard(tab) {
  hud.setShipyardActiveTab(tab);
  (TAB_RENDERERS[tab] || renderBuyTab)();
  hud.showShipyard(true);
}

export function wireShipyardTabs() {
  document.querySelectorAll('#shipyard-tabs .sy-tab').forEach((btn) => {
    btn.addEventListener('click', () => openShipyard(btn.dataset.tab));
  });
}
