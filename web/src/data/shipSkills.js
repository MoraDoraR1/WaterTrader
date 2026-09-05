// 선박 고유 스킬 — 조선소에서 사고파는 부품(shipParts.js)과 달리, 배 자체에 원래 내재된
// 특성이라 교체가 불가능하고 그 배를 타는 동안 항상 적용된다. 슬롯 수는 배 등급이 정한다
// (소형 1 / 중형 2 / 대형 3 / 초대형 4, data/ships.js의 skills 배열 길이).
// 카테고리는 role에 종속된다 — combat 배는 전투(combat) 스킬만, trade 배는 생존(survival)
// 스킬만, adventure 배는 탐험(exploration) 스킬만 갖는다.
//
// effects 키는 실제 게임 로직 안의 특정 계산식에 직접 꽂힌다(장식용 수치가 아니다) —
// 각 스킬이 어디에 꽂히는지는 아래 desc와 실제 소비처(seaScene.js/crew.js/market.js/
// shipyard.js/supplies.js/shipParts.js/shipController.js)의 mulSkillEffect/sumSkillEffect
// 호출부를 참고.
export const SKILL_CATEGORIES = {
  combat: { label: '전투', color: '#e0645a' },
  survival: { label: '생존', color: '#e6c15a' },
  exploration: { label: '탐험', color: '#6fc8e0' },
};

export const SHIP_SKILLS = {
  // ── 전투(combat 배 전용) ──
  rapid_reload: { id: 'rapid_reload', name: '급속장전', category: 'combat',
    desc: '포격 재장전 대기시간 -20%', effects: { fireCooldownMul: 0.8 } },
  multi_cannon: { id: 'multi_cannon', name: '다연장 포열', category: 'combat',
    desc: '일제사격 동시발사수 +3', effects: { shotCountAdd: 3 } },
  precision_fire: { id: 'precision_fire', name: '정밀 포격', category: 'combat',
    desc: '포격 사거리 +15%', effects: { rangeMul: 1.15 } },
  reinforced_ram: { id: 'reinforced_ram', name: '충각 강화', category: 'combat',
    desc: '충돌 시 상대에게 주는 피해 +30%', effects: { ramDamageMul: 1.3 } },
  boarding_mastery: { id: 'boarding_mastery', name: '백병전 숙련', category: 'combat',
    desc: '백병전 전투력 +20%', effects: { meleePowerMul: 1.2 } },
  capture_expert: { id: 'capture_expert', name: '숙련된 노획조', category: 'combat',
    desc: '적선이 가라앉기 전 화물을 더 많이 건져낸다 — 격침 시 교역품 노획량 +50%', effects: { lootQtyMul: 1.5 } },
  damage_control: { id: 'damage_control', name: '응급 수리반', category: 'combat',
    desc: '전투 중 초당 선체 내구도 1.2 자동 회복', effects: { combatHpRegenPerSec: 1.2 } },
  ironclad_defense: { id: 'ironclad_defense', name: '철갑 방어', category: 'combat',
    desc: '피격 데미지 -10%', effects: { incomingDamageMul: 0.9 } },
  agile_maneuvers: { id: 'agile_maneuvers', name: '신속 기동', category: 'combat',
    desc: '전투 중 선회력 +15%', effects: { combatTurnMul: 1.15 } },
  assault_speed: { id: 'assault_speed', name: '돌격 항해술', category: 'combat',
    desc: '전투 중 속도 +10%', effects: { combatSpeedMul: 1.1 } },
  veteran_helmsman: { id: 'veteran_helmsman', name: '노련한 조타수', category: 'combat',
    desc: '전투 승리 후 표류 선원 구조 인원 +1', effects: { rescueBonusAdd: 1 } },
  battle_morale: { id: 'battle_morale', name: '사기충천', category: 'combat',
    desc: '전투 승리 시 선원 사기 +8 회복', effects: { victoryMoraleAdd: 8 } },

  // ── 생존(trade 배 전용) ──
  frugal_voyage: { id: 'frugal_voyage', name: '절약 항해', category: 'survival',
    desc: '일일 식량·식수 소모 -20%', effects: { supplyConsumeMul: 0.8 } },
  skilled_carpenter: { id: 'skilled_carpenter', name: '유능한 목수', category: 'survival',
    desc: '항구 조선소 수리비 -15%', effects: { repairCostMul: 0.85 } },
  material_expertise: { id: 'material_expertise', name: '자재 활용술', category: 'survival',
    desc: '바다 위 자재 응급수리 효율 +25%', effects: { seaRepairEfficiencyMul: 1.25 } },
  bulk_buyer: { id: 'bulk_buyer', name: '대량 구매', category: 'survival',
    desc: '항구 보급품(식량·식수·자재·포탄) 구매가 -10%', effects: { supplyBuyPriceMul: 0.9 } },
  careful_voyage: { id: 'careful_voyage', name: '신중한 항해', category: 'survival',
    desc: '기아·탈수로 인한 선원 손실률 -30%', effects: { starvationLossMul: 0.7 } },
  long_haul_logistics: { id: 'long_haul_logistics', name: '장거리 물류', category: 'survival',
    desc: '거리 프리미엄(원산지에서 멀수록 붙는 웃돈) 획득량 +18%', effects: { distancePremiumMul: 1.18 } },
  port_friendly: { id: 'port_friendly', name: '항구 친화', category: 'survival',
    desc: '평판 상승 속도 +20%', effects: { reputationGainMul: 1.2 } },
  storm_hardened: { id: 'storm_hardened', name: '침수 대비', category: 'survival',
    desc: '폭풍 속 풍향 요동이 이 배에 주는 영향 -30%', effects: { stormWindResistMul: 0.7 } },
  savvy_haggler: { id: 'savvy_haggler', name: '능숙한 흥정', category: 'survival',
    desc: '매도가 +4%', effects: { sellPriceMul: 1.04 } },
  standing_supply: { id: 'standing_supply', name: '순환 보급', category: 'survival',
    desc: '입항 시 급여를 낼 수 있으면 식량·식수 +2씩 추가 지급', effects: { dockSupplyBonusAdd: 2 } },

  // ── 탐험(adventure 배 전용) ──
  fair_wind_sailing: { id: 'fair_wind_sailing', name: '순풍 항해술', category: 'exploration',
    desc: '최고 속도 +10%', effects: { speedMul: 1.10 } },
  nimble_helm: { id: 'nimble_helm', name: '민첩한 조타', category: 'exploration',
    desc: '선회력 +15%', effects: { turnRateMul: 1.15 } },
  new_route_pioneer: { id: 'new_route_pioneer', name: '신항로 개척', category: 'exploration',
    desc: '거리 프리미엄 획득량 +20%', effects: { distancePremiumMul: 1.2 } },
  headwind_master: { id: 'headwind_master', name: '역풍 극복', category: 'exploration',
    desc: '역풍으로 인한 속도 페널티 -50%', effects: { headwindPenaltyMul: 0.5 } },
  lean_crew: { id: 'lean_crew', name: '소수 정예 승조', category: 'exploration',
    desc: '출항 가능 최소 선원 비율 -15%p', effects: { minCrewRatioAdd: -0.15 } },
  storm_sailing: { id: 'storm_sailing', name: '폭풍 항해술', category: 'exploration',
    desc: '폭풍 속 풍향 요동이 이 배에 주는 영향 -50%', effects: { stormWindResistMul: 0.5 } },
  swift_docking: { id: 'swift_docking', name: '신속 입출항', category: 'exploration',
    desc: '항구 도킹 판정 거리 +10', effects: { dockRangeAdd: 10 } },
};

export function getSkill(id) {
  return SHIP_SKILLS[id];
}

export function getShipSkills(shipDef) {
  return (shipDef?.skills || []).map(getSkill).filter(Boolean);
}

// *Add 계열은 합연산 누적(기본값 base에 더함).
export function sumSkillEffect(shipDef, key, base = 0) {
  let total = base;
  for (const s of getShipSkills(shipDef)) {
    const v = s.effects[key];
    if (v != null) total += v;
  }
  return total;
}

// *Mul 계열은 곱연산 누적(기본값 base에 곱함) — shipParts.js의 부품 배율과 같은 관례.
export function mulSkillEffect(shipDef, key, base = 1) {
  let total = base;
  for (const s of getShipSkills(shipDef)) {
    const v = s.effects[key];
    if (v != null) total *= v;
  }
  return total;
}
