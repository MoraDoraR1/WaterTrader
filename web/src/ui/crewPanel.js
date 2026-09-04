// 선원 고용 패널 — 시장 패널(#market-panel)을 재사용해 항구에서 두캇을 내고 선원을 채운다.
// 항구 관리인이 취급한다(급여 지급 시 자동으로 조금씩 차는 것과 별개로, 능동적으로 정원을
// 채우고 싶을 때 — 특히 출항이 막혔을 때 — 쓰는 창구).
import { state } from '../state.js';
import { hud } from './hud.js';
import { getCity } from '../data/cities.js';
import { getShip } from '../data/ships.js';
import { hireCrew, getHireCost, getCurrentMinCrew } from '../systems/crew.js';

const STEP = 5;

function renderCrew(cityId) {
  const city = getCity(cityId);
  const shipDef = getShip(state.currentShipId);
  const maxCrew = shipDef?.crew || 20;
  const cur = state.crewCount ?? maxCrew;
  const room = maxCrew - cur;
  const stepCount = Math.max(1, Math.min(STEP, room));

  const rows = [
    {
      name: `선원 ${STEP}명 고용`,
      sub: `1명당 ${getHireCost(1)}두캇 · ${STEP}명 고용 시 ${getHireCost(stepCount)}두캇`,
      actions: [{
        label: `${stepCount}명 고용`,
        disabled: room <= 0 || state.gold < getHireCost(stepCount),
        onAction: () => {
          const res = hireCrew(STEP);
          if (res.ok) hud.toast(`선원 ${res.count}명 고용 (-${res.cost.toLocaleString('ko-KR')} 두캇)`);
          else hud.toast(res.reason);
          renderCrew(cityId);
        },
      }],
    },
    {
      name: '부족한 인원 전원 고용',
      sub: room > 0 ? `${room}명을 한 번에 채웁니다 · ${getHireCost(room)}두캇` : '이미 정원이 가득 찼습니다.',
      actions: [{
        label: '전원 고용',
        disabled: room <= 0 || state.gold < getHireCost(room),
        onAction: () => {
          const res = hireCrew(room);
          if (res.ok) hud.toast(`선원 ${res.count}명 고용 (-${res.cost.toLocaleString('ko-KR')} 두캇)`);
          else hud.toast(res.reason);
          renderCrew(cityId);
        },
      }],
    },
  ];

  hud.renderMarket({
    headerTitle: '👥 선원 고용',
    cargoLabel: '선원',
    title: `${city.name} · 선원 ${cur}/${maxCrew}명 · 최소 출항 정원 ${getCurrentMinCrew()}명`,
    gold: state.gold,
    cargo: `${cur} / ${maxCrew}명`,
    rows,
  });
}

export function openCrew(cityId) {
  renderCrew(cityId);
  hud.showMarket(true);
}
