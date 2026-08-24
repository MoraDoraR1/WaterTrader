// 배 부품(장비) 데이터 — 조선소에서 구매해 장착하는 업그레이드.
// slot: cannon(대포) / armor(장갑판) / sail(돛) / hull(선체 보강) — 슬롯당 하나만 장착 가능,
// 교체 시 기존 부품은 환불 없이 해제된다(장착 부품은 실물 선체에 딸린 개장으로 취급 — 배를
// 갈아타면 함께 이전되지 않는다).
// effects: cannonsAdd(화력) / hpAdd(최대 내구도) / cargoAdd(적재량) — 가산.
//          speedMul / turnRateMul — 현재 장착 중인 배의 기준 스탯에 곱연산으로 적용.

export const PART_SLOTS = {
  cannon: { label: '대포', icon: '⚔' },
  armor: { label: '장갑판', icon: '🛡' },
  sail: { label: '돛', icon: '⛵' },
  hull: { label: '선체 보강', icon: '🪵' },
};

export const SHIP_PARTS = [
  // ── 대포: 현측 포열 증설로 화력을 직접 끌어올린다 ──
  { id: 'cannon_swivel', slot: 'cannon', tier: 1, name: '회전식 소형포', price: 500,
    effects: { cannonsAdd: 2 },
    desc: '갑판 난간에 다는 소형 선회포. 가벼워 다른 능력치에 영향이 없다.' },
  { id: 'cannon_culverin', slot: 'cannon', tier: 2, name: '컬버린 함포', price: 1400,
    effects: { cannonsAdd: 5 },
    desc: '사거리와 관통력을 겸비한 표준 함포. 현측 포열을 실질적으로 증강한다.' },
  { id: 'cannon_demicannon', slot: 'cannon', tier: 3, name: '데미캐논 중포', price: 3200,
    effects: { cannonsAdd: 9, turnRateMul: 0.95 },
    desc: '가장 강력한 중포. 화력은 압도적이지만 무게 탓에 선회가 살짝 둔해진다.' },

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

export function getEquippedParts(shipParts) {
  if (!shipParts) return [];
  return Object.values(shipParts).filter(Boolean).map(getPart).filter(Boolean);
}

// 장착 부품 효과를 반영한 "실효 스탯" 선박 정의를 만든다(원본 SHIPS 데이터는 건드리지 않는다).
// speedMul은 표시용 speed 값과 별개로도 그대로 실어둔다 — ShipController가 실제 이동 속도
// 계산에 직접 곱해서 쓰기 때문(표시값 반영만으로는 게임플레이에 반영되지 않는다).
export function getEffectiveShipDef(shipDef, shipParts) {
  if (!shipDef) return shipDef;
  const parts = getEquippedParts(shipParts);
  if (!parts.length) return shipDef;
  let hp = shipDef.hp, cargo = shipDef.cargo, cannons = shipDef.cannons;
  let speedMul = 1, turnRateMul = 1;
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
