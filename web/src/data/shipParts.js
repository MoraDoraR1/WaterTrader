// 배 부품(장비) 데이터 — 조선소에서 구매해 장착하는 업그레이드.
// slot: cannon(대포) / armor(장갑판) / sail(돛) / hull(선체 보강). armor/sail/hull은 슬롯당
// 하나만 장착 가능. cannon만 예외로 배 등급(class)에 따라 슬롯을 여러 개(1~6개, 최대 6개
// 한도) 가지며, state.shipParts.cannon은 슬롯별로 배열([슬롯0, 슬롯1, ...])로 저장된다
// (systems/shipyard.js의 getCannonSlotCount 참고 — 소형선 1개부터 초대형선 6개까지).
// 교체 시 기존 부품은 환불 없이 해제된다(장착 부품은 실물 선체에 딸린 개장으로 취급 — 배를
// 갈아타면 함께 이전되지 않는다).
// effects: cannonsAdd(화력) / hpAdd(최대 내구도) / cargoAdd(적재량) — 가산.
//          speedMul / turnRateMul — 현재 장착 중인 배의 기준 스탯에 곱연산으로 적용.
import { mulSkillEffect } from './shipSkills.js';

export const PART_SLOTS = {
  cannon: { label: '대포', icon: '⚔' },
  armor: { label: '장갑판', icon: '🛡' },
  sail: { label: '돛', icon: '⛵' },
  hull: { label: '선체 보강', icon: '🪵' },
};

// 대포 부품 가격 사다리 — "하위 단계 가격의 1.6배 / 2.4배 / 3배"로 순차 배수 적용
// (500 -> 800 -> 1920 -> 5760). 예전엔 최고 등급이 +9문뿐이라, 슬롯을 여러 개 가진
// 대형선에서조차 화력 증가폭이 미미했다(9문짜리를 여러 개 꽂아야 했음) — 그 대신 상위 두
// 단계를 +16/+32로 크게 올려, 슬롯 몇 개만으로도 큰 함선다운 화력 도약이 나도록 했다.
export const SHIP_PARTS = [
  // ── 대포: 슬롯 하나당 이 중 하나를 장착 — 슬롯 수는 배 등급이 정한다(소형 1 ~ 초대형 6) ──
  { id: 'cannon_swivel', slot: 'cannon', tier: 1, name: '회전식 소형포', price: 500,
    effects: { cannonsAdd: 2 },
    desc: '갑판 난간에 다는 소형 선회포. 가벼워 다른 능력치에 영향이 없다.' },
  { id: 'cannon_culverin', slot: 'cannon', tier: 2, name: '컬버린 함포', price: 800,
    effects: { cannonsAdd: 5 },
    desc: '사거리와 관통력을 겸비한 표준 함포. 현측 포열을 실질적으로 증강한다.' },
  { id: 'cannon_longrange', slot: 'cannon', tier: 3, name: '장사정 캐논 포열', price: 1920,
    effects: { cannonsAdd: 16, turnRateMul: 0.95 },
    desc: '사거리와 파괴력을 크게 늘린 중포열. 무게 탓에 선회가 살짝 둔해진다.' },
  { id: 'cannon_decisive', slot: 'cannon', tier: 4, name: '결전 캐논 포열', price: 5760,
    effects: { cannonsAdd: 32, turnRateMul: 0.90 },
    desc: '함대전의 승패를 가르는 최중량 포열. 압도적 화력이지만 선회가 눈에 띄게 둔해진다.' },

  // ── 장갑판: 내구도를 크게 올리되 무게로 기동성을 깎는다 ──
  { id: 'armor_oak_planking', slot: 'armor', tier: 1, name: '참나무 보강판', price: 700,
    effects: { hpAdd: 150, speedMul: 0.97 },
    desc: '선체 외판에 참나무를 덧댄다. 가벼운 감속만으로 내구도를 보강한다.' },
  { id: 'armor_iron_strap', slot: 'armor', tier: 2, name: '철대 보강 장갑', price: 1800,
    effects: { hpAdd: 400, speedMul: 0.94, turnRateMul: 0.95 },
    desc: '철제 띠로 선체를 둘러 보강한다. 확실히 튼튼해지지만 무거워진다.' },
  { id: 'armor_composite_plate', slot: 'armor', tier: 3, name: '복합 장갑판', price: 4200,
    effects: { hpAdd: 900, speedMul: 0.90, turnRateMul: 0.90 },
    desc: '목재와 철판을 겹친 최고급 장갑. 내구도는 최상급이나 상당히 둔중해진다.' },

  // ── 돛: 속도를 끌어올리되 클수록 선회에 살짝 불리하다 ──
  { id: 'sail_reinforced_canvas', slot: 'sail', tier: 1, name: '보강 범포', price: 600,
    effects: { speedMul: 1.05 },
    desc: '질긴 범포로 돛을 교체한다. 부담 없이 속도를 조금 끌어올린다.' },
  { id: 'sail_extra_jib', slot: 'sail', tier: 2, name: '추가 지브세일', price: 1600,
    effects: { speedMul: 1.10, turnRateMul: 0.98 },
    desc: '이물에 지브세일을 추가로 단다. 속도가 눈에 띄게 붙는다.' },
  { id: 'sail_full_clipper_rig', slot: 'sail', tier: 3, name: '클리퍼식 전체돛', price: 3600,
    effects: { speedMul: 1.18, turnRateMul: 0.95 },
    desc: '클리퍼에 준하는 전체 돛 개장. 최고 속도를 크게 끌어올리는 대신 다루기는 까다로워진다.' },

  // ── 선체 보강: 적재량을 늘리는 화물 개장 계열 ──
  { id: 'hull_cargo_racks', slot: 'hull', tier: 1, name: '화물 선반 증설', price: 500,
    effects: { cargoAdd: 40 },
    desc: '화물칸에 선반을 짜 넣어 적재 공간을 늘린다.' },
  { id: 'hull_double_deck', slot: 'hull', tier: 2, name: '이중 갑판', price: 1400,
    effects: { cargoAdd: 110, hpAdd: 100 },
    desc: '갑판을 한 층 더 올려 적재량과 내구도를 함께 보강한다.' },
  { id: 'hull_reinforced_keel', slot: 'hull', tier: 3, name: '강화 용골', price: 3200,
    effects: { cargoAdd: 220, hpAdd: 250, speedMul: 0.97 },
    desc: '용골 자체를 강화해 대폭 늘어난 적재량과 내구도를 지탱한다. 다소 둔중해진다.' },
];

export function partsBySlot(slot) {
  return SHIP_PARTS.filter((p) => p.slot === slot);
}

export function getPart(id) {
  return SHIP_PARTS.find((p) => p.id === id);
}

// cannon 슬롯은 배열([슬롯0, 슬롯1, ...] — 빈 슬롯은 null/undefined)로 여러 개 담기고,
// armor/sail/hull은 예전처럼 문자열 하나다. 배열이든 문자열이든 그대로 펼쳐서 실제 장착된
// 부품 목록을 만든다(과거 세이브에 남아있는 cannon: '문자열' 형태도 그대로 호환된다).
export function getEquippedParts(shipParts) {
  if (!shipParts) return [];
  const result = [];
  for (const value of Object.values(shipParts)) {
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const id of value) {
        if (!id) continue;
        const p = getPart(id);
        if (p) result.push(p);
      }
    } else {
      const p = getPart(value);
      if (p) result.push(p);
    }
  }
  return result;
}

// 장착 부품 효과를 반영한 "실효 스탯" 선박 정의를 만든다(원본 SHIPS 데이터는 건드리지 않는다).
// speedMul은 표시용 speed 값과 별개로도 그대로 실어둔다 — ShipController가 실제 이동 속도
// 계산에 직접 곱해서 쓰기 때문(표시값 반영만으로는 게임플레이에 반영되지 않는다).
// 탐험 스킬(순풍 항해술/민첩한 조타)의 speedMul·turnRateMul도 부품과 같은 배율 자리에
// 곱해 넣는다 — 부품과 달리 장착/해제가 없는 배 고유 특성이라 shipDef.skills에서 직접 읽는다.
export function getEffectiveShipDef(shipDef, shipParts) {
  if (!shipDef) return shipDef;
  const parts = getEquippedParts(shipParts);
  // cannons는 shipDef.cannons(슬롯을 전부 채웠을 때의 "최대치")와 무관하게 실제로 장착한
  // 대포 부품의 합으로만 정해진다 — 슬롯이 비어 있으면 0(대포 없이는 포격 자체가 불가능).
  let hp = shipDef.hp, cargo = shipDef.cargo, cannons = 0;
  let speedMul = mulSkillEffect(shipDef, 'speedMul', 1), turnRateMul = mulSkillEffect(shipDef, 'turnRateMul', 1);
  for (const p of parts) {
    const e = p.effects;
    if (e.hpAdd) hp += e.hpAdd;
    if (e.cargoAdd) cargo += e.cargoAdd;
    if (e.cannonsAdd) cannons += e.cannonsAdd;
    if (e.speedMul) speedMul *= e.speedMul;
    if (e.turnRateMul) turnRateMul *= e.turnRateMul;
  }
  return {
    ...shipDef,
    hp, cargo, cannons,
    speed: Math.round(shipDef.speed * speedMul * 10) / 10,
    turnRate: Math.round(shipDef.turnRate * turnRateMul * 10) / 10,
    speedMul,
  };
}
