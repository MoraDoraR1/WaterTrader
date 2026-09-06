// 배 부품(장비) 데이터 — 조선소에서 구매해 장착하는 업그레이드.
// slot: cannon(대포) / armor(장갑판) / sail(돛) / hull(선체 보강). armor/sail/hull은 슬롯당
// 하나만 장착 가능. cannon만 예외로 배 등급(class)에 따라 슬롯을 여러 개(1~6개, 최대 6개
// 한도) 가지며, state.shipParts.cannon은 슬롯별로 배열([슬롯0, 슬롯1, ...])로 저장된다
// (systems/shipyard.js의 getCannonSlotCount 참고 — 소형선 1개부터 초대형선 6개까지).
// 교체 시 기존 부품은 환불 없이 해제된다(장착 부품은 실물 선체에 딸린 개장으로 취급 — 배를
// 갈아타면 함께 이전되지 않는다).
// effects: cannonsAdd(화력) / hpAdd(최대 내구도) / cargoAdd(적재량) / armorAdd(방어력,
//          피격 데미지 감소율 %) — 가산. speedMul / turnRateMul — 현재 장착 중인 배의
//          기준 스탯에 곱연산으로 적용.
// 참고: armor는 cannons와 달리 장갑판 없이도 0이 아니다 — 배 등급(class)·역할(role)에 따른
// 기본 방어력이 깔려 있고(getBaseArmor 참고) 장갑판은 그 위에 armorAdd만큼 더해진다.
// source: 'compendium'인 항목은 골드로 못 사는 학문 도감 완주 보상 부품 — category(그
// 부품을 주는 학문)·milestone(1~3단계)·requiredCount(해금에 필요한 그 학문 도감 발견
// 개수)를 추가로 갖는다. 해금 판정은 systems/compendiumRewards.js, 장착 시 골드 대신
// 해금 여부를 검사하는 쪽은 systems/shipyard.js equipPart 참고.
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

  // ── 장갑판: 맞는 피해 자체를 % 로 깎아주는 진짜 방어력. 무게로 기동성을 깎는다 ──
  { id: 'armor_oak_planking', slot: 'armor', tier: 1, name: '참나무 보강판', price: 700,
    effects: { armorAdd: 8 },
    desc: '선체 외판에 참나무를 덧댄다. 큰 부담 없이 피격 데미지를 8% 줄인다.' },
  { id: 'armor_iron_strap', slot: 'armor', tier: 2, name: '철대 보강 장갑', price: 1800,
    effects: { armorAdd: 18, speedMul: 0.94, turnRateMul: 0.95 },
    desc: '철제 띠로 선체를 둘러 보강한다. 피격 데미지를 18% 줄이지만 무거워진다.' },
  { id: 'armor_composite_plate', slot: 'armor', tier: 3, name: '복합 장갑판', price: 4200,
    effects: { armorAdd: 32, speedMul: 0.90, turnRateMul: 0.90 },
    desc: '목재와 철판을 겹친 최고급 장갑. 피격 데미지를 32% 줄이지만 상당히 둔중해진다.' },

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
    effects: { cargoAdd: 110, hpAdd: 100, speedMul: 0.98 },
    desc: '갑판을 한 층 더 올려 적재량과 내구도를 함께 보강한다. 그만큼 무거워져 속도가 살짝 준다.' },
  { id: 'hull_reinforced_keel', slot: 'hull', tier: 3, name: '강화 용골', price: 3200,
    effects: { cargoAdd: 220, hpAdd: 250, speedMul: 0.97 },
    desc: '용골 자체를 강화해 대폭 늘어난 적재량과 내구도를 지탱한다. 다소 둔중해진다.' },

  // ── 학문 도감 완주 보상 전용 부품 — 골드로 살 수 없다(price 0, source:'compendium').
  // 고고학은 도감이 유물·난파선 그 자체이니 발굴품으로 만든 대포, 지리학은 해류·계절풍을
  // 아는 만큼 최적화된 돛, 천문학은 별자리로 재는 최단항로·마모 절감이라는 콘셉트로
  // 선체 보강에 배정했다. requiredCount는 그 학문 도감 총량(고고학23·지리학22·천문학24)의
  // 약 1/3·2/3·전체 지점 — 발견 개수가 그 수에 닿는 순간 systems/compendiumRewards.js의
  // checkCompendiumRewards가 state.compendiumRewards에 등록해 무료로 장착 가능해진다(다른
  // 부품처럼 조선소에서 골드로 사는 게 아니다 — price는 표시상 0). 마지막 단계(milestone 3,
  // 도감 전체 발견)는 각 슬롯의 기존 최고 티어(대포4·돛3·선체3)를 명백히 뛰어넘는 진짜
  // 엔드급 성능이다.
  { id: 'cannon_relic_bronze', slot: 'cannon', tier: 2, name: '유물 청동포', price: 0, source: 'compendium', category: 'archaeology', milestone: 1, requiredCount: 8,
    effects: { cannonsAdd: 9 },
    desc: '침몰선에서 발굴해 그대로 손질한 청동 함포. 원형을 살린 덕에 무게 부담 없이 화력만 오른다.' },
  { id: 'cannon_relic_salvaged', slot: 'cannon', tier: 3, name: '심해 인양 중포', price: 0, source: 'compendium', category: 'archaeology', milestone: 2, requiredCount: 16,
    effects: { cannonsAdd: 22, turnRateMul: 0.97 },
    desc: '여러 난파선에서 건진 포신을 이어붙여 재주조한 대형포. 기존 장사정포보다 강력하면서도 선회 손실은 더 적다.' },
  { id: 'cannon_antikythera', slot: 'cannon', tier: 4, name: '안티키테라의 계시', price: 0, source: 'compendium', category: 'archaeology', milestone: 3, requiredCount: 23,
    effects: { cannonsAdd: 40, turnRateMul: 1.0 },
    desc: '고대 계산기의 톱니 원리를 함포 사격 기구에 그대로 옮겼다. 완벽하게 계산된 발사 타이밍이 반동까지 상쇄해, 이 화력을 얻고도 선회는 조금도 둔해지지 않는다.' },

  { id: 'sail_current_charts', slot: 'sail', tier: 2, name: '해류 항적도 돛', price: 0, source: 'compendium', category: 'geography', milestone: 1, requiredCount: 8,
    effects: { speedMul: 1.13 },
    desc: '지도로 익힌 해류를 타도록 돛의 각도를 미리 맞춰 짠다. 부담 없이 속도를 크게 끌어올린다.' },
  { id: 'sail_trade_winds', slot: 'sail', tier: 3, name: '무역풍 전용범', price: 0, source: 'compendium', category: 'geography', milestone: 2, requiredCount: 15,
    effects: { speedMul: 1.22, turnRateMul: 0.98 },
    desc: '계절마다 부는 무역풍의 길목을 알아, 그 바람만을 위해 재단한 전용 범포. 클리퍼식 전체돛보다도 빠르다.' },
  { id: 'sail_seven_seas', slot: 'sail', tier: 4, name: '칠대양 풍해도', price: 0, source: 'compendium', category: 'geography', milestone: 3, requiredCount: 22,
    effects: { speedMul: 1.32, turnRateMul: 1.05 },
    desc: '세계 모든 대양의 해류·계절풍을 통달한 항해가만이 짤 수 있는 궁극의 범장. 속도를 극한까지 끌어올리면서도 바람의 결을 읽어 선회마저 더 예리해진다.' },

  { id: 'hull_star_ribs', slot: 'hull', tier: 2, name: '성위관측 늑재', price: 0, source: 'compendium', category: 'astronomy', milestone: 1, requiredCount: 8,
    effects: { hpAdd: 220, speedMul: 1.03 },
    desc: '별자리로 미리 가늠한 최적 항로를 따르도록 선체 늑재를 재배치했다. 파도를 덜 맞는 만큼 내구도와 속도가 함께 오른다.' },
  { id: 'hull_ecliptic_keel', slot: 'hull', tier: 3, name: '황도 항법 용골', price: 0, source: 'compendium', category: 'astronomy', milestone: 2, requiredCount: 16,
    effects: { hpAdd: 450, speedMul: 1.06, cargoAdd: 80 },
    desc: '태양과 별의 황도를 좇아 밤에도 최단항로를 잃지 않는 용골. 강화 용골보다도 튼튼하고 여유 공간까지 남는다.' },
  { id: 'hull_celestial_sphere', slot: 'hull', tier: 4, name: '천구의 항법 정수', price: 0, source: 'compendium', category: 'astronomy', milestone: 3, requiredCount: 24,
    effects: { hpAdd: 750, speedMul: 1.10, cargoAdd: 260 },
    desc: '밤하늘 전체를 항법 좌표로 삼는 경지에 이른 천문학자의 결정판. 마모 없는 최단항로 항해가 내구도·속도·적재량 셋 모두를 이 게임 최고 수준으로 끌어올린다.' },
];

// 배 등급별 기본 방어력(장갑판을 하나도 안 달아도 갖는 값) — 큰 배일수록 선체 자체가
// 두꺼워 원래 좀 더 잘 버틴다. 전투용(combat) 배는 애초에 실전을 상정하고 지어져
// 선체를 보강해뒀다고 보고 추가로 5%p를 더 얹는다(레판토·무적함대급 갈레온, 전열함 등).
const CLASS_BASE_ARMOR = { small: 0, medium: 3, large: 6, xlarge: 10 };
const COMBAT_ROLE_ARMOR_BONUS = 5;

export function getBaseArmor(shipDef) {
  const classBase = CLASS_BASE_ARMOR[shipDef?.class] || 0;
  const roleBonus = shipDef?.role === 'combat' ? COMBAT_ROLE_ARMOR_BONUS : 0;
  return classBase + roleBonus;
}

export function partsBySlot(slot) {
  return SHIP_PARTS.filter((p) => p.slot === slot);
}

export function getPart(id) {
  return SHIP_PARTS.find((p) => p.id === id);
}

// 학문 도감 완주 보상 부품(source:'compendium') — category별로 milestone(1~3) 오름차순.
export function getRewardParts(category) {
  return SHIP_PARTS.filter((p) => p.source === 'compendium' && p.category === category)
    .sort((a, b) => a.milestone - b.milestone);
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
  let hp = shipDef.hp, cargo = shipDef.cargo, cannons = 0, armor = getBaseArmor(shipDef);
  let speedMul = mulSkillEffect(shipDef, 'speedMul', 1), turnRateMul = mulSkillEffect(shipDef, 'turnRateMul', 1);
  for (const p of parts) {
    const e = p.effects;
    if (e.hpAdd) hp += e.hpAdd;
    if (e.cargoAdd) cargo += e.cargoAdd;
    if (e.cannonsAdd) cannons += e.cannonsAdd;
    if (e.armorAdd) armor += e.armorAdd;
    if (e.speedMul) speedMul *= e.speedMul;
    if (e.turnRateMul) turnRateMul *= e.turnRateMul;
  }
  return {
    ...shipDef,
    hp, cargo, cannons, armor,
    speed: Math.round(shipDef.speed * speedMul * 10) / 10,
    turnRate: Math.round(shipDef.turnRate * turnRateMul * 10) / 10,
    speedMul,
  };
}

// 방어력(armor, 0~100 사이의 "피격 데미지 감소율 %") 값을 실제 피해 배율로 바꾼다 —
// 전투 스킬(철갑 방어 등)의 incomingDamageMul과 곱연산으로 함께 적용되는 별개의 감산원이다.
// 70% 넘게 깎이지는 않도록 하한을 둬(장갑판 하나로는 도달 불가능한 수치라 실질적으로는
// 안전장치에 가깝다) 무적에 가까운 조합이 나오지 않게 한다.
export function armorDamageMul(armor) {
  return Math.max(0.3, 1 - (armor || 0) / 100);
}
