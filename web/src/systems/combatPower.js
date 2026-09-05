// 전투력 — 배가 "얼마나 잘 싸우는지"를 하나의 종합 수치로 보여주는 지표. 오직 전투
// 판정에 실제로 쓰이는 스탯(화력/생존력/백병전력)만으로 구성한다(적재량·가격·속도 등
// 비전투 스탯은 제외). T키 함선정보 패널에 "현재 실제 장착 기준"으로 표시된다 —
// 완전무장 가정치가 아니라 대포를 하나도 안 달았으면 화력 점수가 그대로 0이다.
import { SHIPS } from '../data/ships.js';
import { getEffectiveShipDef, armorDamageMul, getBaseArmor, SHIP_PARTS, partsBySlot } from '../data/shipParts.js';
import { mulSkillEffect, sumSkillEffect } from '../data/shipSkills.js';

const FIRE_COOLDOWN = 1.5;
const PLAYER_SHOT_DMG = 22;
// 갤리(galley)형은 정원 대부분이 노잡이라 실제로 싸우는 인원(전투원)은 일부뿐이다 —
// 노잡이 400명을 그대로 "백병전 병력 400명"으로 치면 갤리가 비정상적으로 강해진다.
// 이 비율은 표시용 전투력뿐 아니라 seaScene.js의 실제 백병전 승패 계산에도 그대로
// 쓰여, 보여주는 수치와 실전 결과가 일치한다.
const GALLEY_COMBATANT_RATIO = 0.25;

// crewCount를 넘기면 그 값(예: 전투로 줄어든 실제 승선 인원)을, 안 넘기면 배의 정원
// 전체를 기준으로 "실제 싸우는 인원"을 계산한다.
export function getCombatants(shipDef, crewCount) {
  const headcount = crewCount ?? shipDef?.crew ?? 0;
  const ratio = shipDef?.type === 'galley' ? GALLEY_COMBATANT_RATIO : 1;
  return Math.round(headcount * ratio);
}

function rangedDps(shipDef, eff) {
  if (eff.cannons <= 0) return 0;
  const fireCooldown = FIRE_COOLDOWN * mulSkillEffect(shipDef, 'fireCooldownMul', 1);
  const shotCount = Math.max(2, Math.min(40, Math.round(eff.cannons / 4) + sumSkillEffect(shipDef, 'shotCountAdd', 0)));
  return (shotCount * PLAYER_SHOT_DMG) / fireCooldown;
}

function effectiveHp(shipDef, eff) {
  const dmgMul = armorDamageMul(eff.armor) * mulSkillEffect(shipDef, 'incomingDamageMul', 1);
  return eff.hp / dmgMul;
}

// 정규화 기준값을 구하기 위한 "완전무장" 가정 — 각 슬롯에서 그 배가 허용하는 최고 등급
// 부품을 전부 낀 상태(대포는 슬롯별 최대 허용 등급 그대로).
function bestLoadout(shipDef) {
  const parts = {};
  if (shipDef.cannonSlotTiers?.length) {
    parts.cannon = shipDef.cannonSlotTiers.map((maxTier) => {
      const candidates = SHIP_PARTS.filter((p) => p.slot === 'cannon' && p.tier <= maxTier);
      return candidates.sort((a, b) => b.tier - a.tier)[0]?.id || null;
    });
  }
  for (const slot of ['armor', 'sail', 'hull']) {
    parts[slot] = partsBySlot(slot).sort((a, b) => b.tier - a.tier)[0].id;
  }
  return parts;
}

// 32척이 전부 완전무장했을 때 도달 가능한 이론적 최댓값 — 전투력 점수의 척도를 여기에
// 고정해둬야 부품을 갈아끼울 때마다 척도 자체가 흔들리지 않는다(모듈 로드 시 1회 계산).
function computeMaxRefs() {
  let maxDps = 0, maxEhp = 0, maxCombatants = 0;
  for (const shipDef of SHIPS) {
    const eff = getEffectiveShipDef(shipDef, bestLoadout(shipDef));
    maxDps = Math.max(maxDps, rangedDps(shipDef, eff));
    maxEhp = Math.max(maxEhp, effectiveHp(shipDef, eff));
    maxCombatants = Math.max(maxCombatants, getCombatants(shipDef));
  }
  return { maxDps, maxEhp, maxCombatants };
}

const MAX_REFS = computeMaxRefs();
const WEIGHTS = { dps: 40, ehp: 30, melee: 30 };

// shipParts는 "지금 실제 장착된 부품" 그대로 넘긴다(완전무장 가정 아님).
export function getCombatPower(shipDef, shipParts) {
  const eff = getEffectiveShipDef(shipDef, shipParts);
  const dps = rangedDps(shipDef, eff);
  const ehp = effectiveHp(shipDef, eff);
  const combatants = getCombatants(shipDef);
  const score = WEIGHTS.dps * (dps / MAX_REFS.maxDps)
    + WEIGHTS.ehp * (ehp / MAX_REFS.maxEhp)
    + WEIGHTS.melee * (combatants / MAX_REFS.maxCombatants);
  return { dps, ehp, combatants, score: Math.round(score * 10) / 10 };
}

// NPC선은 shipParts(장착 부품)가 없다 — 대포는 shipDef.cannons 그대로, 방어는 기본 장갑
// (getBaseArmor)뿐이고, 내구도는 스폰 데이터의 maxHp(배 원본 hp를 덮어쓰는 경우가 많다)를
// 쓴다. 실제 발포 간격·데미지도 pirate.js가 계산해둔 값(npc.fireInterval/shotDmg) 그대로
// 반영해, 여기 표시되는 점수가 실전 위협도와 어긋나지 않게 한다. 점수 척도(MAX_REFS)는
// 플레이어용 getCombatPower와 동일해 서로 직접 비교할 수 있다.
export function getNpcCombatPower(npc) {
  const shipDef = npc?.shipDef;
  if (!shipDef) return { dps: 0, ehp: 0, combatants: 0, score: 0 };
  const dps = npc.fireInterval > 0 ? (npc.shotDmg || 0) / npc.fireInterval : 0;
  const dmgMul = armorDamageMul(getBaseArmor(shipDef));
  const ehp = (npc.maxHp ?? shipDef.hp ?? 0) / dmgMul;
  const combatants = getCombatants(shipDef);
  const score = WEIGHTS.dps * (dps / MAX_REFS.maxDps)
    + WEIGHTS.ehp * (ehp / MAX_REFS.maxEhp)
    + WEIGHTS.melee * (combatants / MAX_REFS.maxCombatants);
  return { dps, ehp, combatants, score: Math.round(score * 10) / 10 };
}
