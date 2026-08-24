// 의뢰 게시판(항구관리인 NPC) 패널의 화면 구성 로직.
import { state } from '../state.js';
import { hud } from './hud.js';
import { getCity } from '../data/cities.js';
import { getGood } from '../data/goods.js';
import {
  getQuestsForCity, getTurnInableAt, getActiveQuests, getQuestStatus,
  acceptQuest, turnInDelivery,
} from '../systems/quests.js';

function questSub(q) {
  if (q.type === 'delivery') {
    const good = getGood(q.goodId);
    const destCity = getCity(q.destCityId);
    return `${q.desc} · ${good.name} ${q.qty}t → ${destCity.name}`;
  }
  return q.desc;
}

function renderBoard(cityId) {
  const city = getCity(cityId);

  const available = getQuestsForCity(cityId).filter((q) => getQuestStatus(q.id) === 'available');
  const availableRows = available.map((q) => ({
    name: q.title,
    sub: questSub(q),
    priceLabel: `보상 ${q.reward.toLocaleString('ko-KR')} 두캇`,
    actionLabel: '수락',
    onAction: () => {
      const res = acceptQuest(q.id);
      if (res.ok) { hud.toast(`의뢰를 수락했습니다: ${q.title}`); renderBoard(cityId); }
      else hud.toast(res.reason);
    },
  }));

  const turnIn = getTurnInableAt(cityId);
  const turnInRows = turnIn.map((q) => {
    const good = getGood(q.goodId);
    const held = state.inventory.find((it) => it.id === q.goodId)?.qty || 0;
    const ready = held >= q.qty;
    return {
      name: q.title,
      sub: `${good.name} ${q.qty}t 필요 (보유 ${held}t) · 보상 ${q.reward.toLocaleString('ko-KR')} 두캇`,
      actionLabel: ready ? '납품' : '물량 부족',
      disabled: !ready,
      highlight: ready,
      onAction: ready ? () => {
        const res = turnInDelivery(q.id);
        if (res.ok) { hud.toast(`납품 완료! +${res.reward.toLocaleString('ko-KR')} 두캇`); renderBoard(cityId); }
        else hud.toast(res.reason);
      } : null,
    };
  });

  const active = getActiveQuests().filter((q) => !(q.type === 'delivery' && q.destCityId === cityId));
  const activeRows = active.map((q) => ({
    name: q.title,
    sub: q.type === 'delivery' ? `${questSub(q)} (진행 중)` : `${q.desc} (진행 중 — 격침하면 자동 완료)`,
    priceLabel: `보상 ${q.reward.toLocaleString('ko-KR')} 두캇`,
    actionLabel: '진행 중',
    disabled: true,
  }));

  hud.renderQuestBoard({
    title: `${city.name} 의뢰 게시판`,
    sections: [
      { heading: '수락 가능한 의뢰', rows: availableRows, empty: '지금 이 항구에 새로운 의뢰가 없습니다.' },
      { heading: '이 항구에 납품', rows: turnInRows, empty: '납품할 의뢰가 없습니다.' },
      { heading: '진행 중인 의뢰 (다른 곳)', rows: activeRows, empty: '진행 중인 의뢰가 없습니다.' },
    ],
  });
}

export function openQuestBoard(cityId) {
  renderBoard(cityId);
  hud.showQuestBoard(true);
}
