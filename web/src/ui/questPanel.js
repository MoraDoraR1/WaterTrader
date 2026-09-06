// 의뢰 게시판(항구관리인 NPC) 패널의 화면 구성 로직.
import { state } from '../state.js';
import { hud } from './hud.js';
import { getCity } from '../data/cities.js';
import { getGood } from '../data/goods.js';
import {
  getQuestsForCity, getTurnInableAt, getActiveQuests, getQuestStatus,
  acceptQuest, turnInDelivery, isQuestChainReady,
} from '../systems/quests.js';

function questSub(q) {
  if (q.type === 'delivery') {
    const good = getGood(q.goodId);
    const destCity = getCity(q.destCityId);
    return `${q.desc} · ${good.name} ${q.qty}t → ${destCity.name}`;
  }
  if (q.type === 'voyage') {
    const destCity = getCity(q.targetCityId);
    return `${q.desc} · 목적지: ${destCity.name}`;
  }
  return q.desc;
}

function activeSub(q, cityId) {
  if (q.type === 'delivery') return `${questSub(q)} (진행 중)`;
  if (q.type === 'voyage') return `${q.desc} · 목적지: ${getCity(q.targetCityId).name} (진행 중 — 도착하면 자동 완료)`;
  if (q.type === 'investigate') return `${q.desc} (진행 중 — 현장에서 G키로 조사·관측하면 자동 완료)`;
  return `${q.desc} (진행 중 — 격침하면 자동 완료)`;
}

function renderBoard(cityId) {
  const city = getCity(cityId);

  // 항로 개척 연계 의뢰(배달→토벌→항해)는 requires/minRankIndex/routePrereq 조건을
  // 채우기 전까지 게시판에 아예 보이지 않는다 — isQuestChainReady가 그 가시성을 판정한다.
  const available = getQuestsForCity(cityId).filter((q) => getQuestStatus(q.id) === 'available' && isQuestChainReady(q));
  const availableRows = available.map((q) => ({
    name: q.title,
    sub: questSub(q),
    priceLabel: `보상 ${q.reward.toLocaleString('ko-KR')} 두캇`,
    actionLabel: '수락',
    onAction: () => {
      const res = acceptQuest(q.id);
      if (!res.ok) { hud.toast(res.reason); return; }
      renderBoard(cityId);
      if (q.acceptLine) {
        hud.showDialogue('항구 관리인', q.acceptLine, [{ label: '확인', onClick: () => hud.hideDialogue() }]);
      } else {
        hud.toast(`의뢰를 수락했습니다: ${q.title}`);
      }
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
    sub: activeSub(q, cityId),
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
