// 항로 개척 연계 의뢰의 3부(항해) 구간에 재미를 더하는 발견 이벤트 — 실제 보상은 없는
// 순수 분위기 연출용 토스트다. 목적지가 정해진 항해 의뢰가 수락 상태일 때만, 일정 간격으로
// 그 항로에 맞는 플레이버 텍스트를 하나씩 순서대로 보여준다. market.js의 결정적 해시
// (hashSeed) 패턴을 재사용해 간격에 자연스러운 편차를 준다(항상 똑같은 초에 뜨면 어색하다).
import { getActiveQuests } from './quests.js';
import { hud } from '../ui/hud.js';

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x9e3779b1);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296; // 0..1
}

const FLAVOR_BY_ROUTE = {
  west_africa: [
    '수평선 너머로 낯선 계절풍이 느껴집니다. 아프리카 해안이 가까워지는 모양입니다.',
    '갑판원이 처음 보는 모양의 물고기 떼를 발견했다며 소리칩니다.',
    '먼 곳에서 북소리 같은 것이 바람에 실려 옵니다 — 착각일까요.',
    '부서진 난파선의 잔해가 파도 위를 떠다니는 것을 발견했습니다.',
  ],
  new_world: [
    '서쪽 하늘의 구름이 심상치 않게 두꺼워집니다. 신대륙이 가깝다는 신호일까요.',
    '선원들이 처음 보는 해초 더미 사이를 항해 중이라며 술렁입니다.',
    '수평선에서 낯선 깃발을 단 배 한 척이 스쳐 지나갑니다.',
    '갈매기 떼가 부쩍 늘었습니다 — 육지가 머지않았다는 뜻입니다.',
  ],
  indian_ocean: [
    '희망봉의 거센 너울이 뱃머리를 뒤흔듭니다. 선원들의 표정이 굳습니다.',
    '멀리 물기둥을 뿜는 고래 무리가 보입니다.',
    '남쪽 하늘에 낯선 별자리가 떠오르기 시작했습니다.',
    '항해사가 나침반이 미세하게 요동친다며 고개를 갸웃거립니다.',
  ],
};

let cooldown = 0;
let lastQuestId = null;
let shownCount = 0;

// 매 프레임 불러도 부담 없다 — 진행 중인 항해 의뢰가 없으면 즉시 반환한다.
export function checkDiscoveryEvents(delta) {
  const voyage = getActiveQuests().find((q) => q.type === 'voyage' && FLAVOR_BY_ROUTE[q.unlocksRoute]);
  if (!voyage) { lastQuestId = null; shownCount = 0; return; }
  if (voyage.id !== lastQuestId) {
    // 다른 항해 의뢰로 바뀌었으면(혹은 새로 시작했으면) 처음부터 다시 순서대로 보여준다.
    lastQuestId = voyage.id;
    shownCount = 0;
    cooldown = 15; // 항해를 시작하고 바로 뜨면 정신없으니 살짝 뒤로 미룬다
  }
  const pool = FLAVOR_BY_ROUTE[voyage.unlocksRoute];
  if (shownCount >= pool.length) return; // 이번 항해에서 준비된 발견은 다 보여줬다
  cooldown -= delta;
  if (cooldown > 0) return;
  cooldown = 40 + hashSeed(`${voyage.id}:cd:${shownCount}`) * 25; // 40~65초 간격으로 흩어지게
  hud.toast(`⚓ ${pool[shownCount]}`, 3400);
  shownCount++;
}
