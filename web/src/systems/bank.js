// 대도시 은행 — 휴대금(state.gold)과 분리된 보관금(state.bankGold)을 오간다.
// 교역품은 다루지 않는다(시장/물물교환의 영역). 은행에 맡긴 돈은 배가 침몰해도 잃지 않는다
// (seaScene.js의 침몰 패널티는 state.gold만 깎는다).
import { state, notify } from '../state.js';

export function depositGold(amount) {
  const amt = Math.max(0, Math.min(Math.floor(amount), state.gold));
  if (amt <= 0) return { ok: false, reason: '예치할 두캇이 없습니다.' };
  state.gold -= amt;
  state.bankGold += amt;
  notify({ goldChanged: true });
  return { ok: true, amount: amt };
}

export function withdrawGold(amount) {
  const amt = Math.max(0, Math.min(Math.floor(amount), state.bankGold));
  if (amt <= 0) return { ok: false, reason: '인출할 두캇이 없습니다.' };
  state.bankGold -= amt;
  state.gold += amt;
  notify({ goldChanged: true });
  return { ok: true, amount: amt };
}
