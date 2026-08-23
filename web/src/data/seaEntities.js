// 바다 위 NPC 선박 스폰 데이터 (프로토타입 범위 — 유형별 최소 1~2기)
export const SEA_NPC_SHIPS = [
  { id: 'pirate_1', type: 'pirate', name: '해적선 검은상어호', pos: [-350, -50], shipId: 'caravel_war',
    hp: 500, hostile: true, patrolRadius: 140 },
  { id: 'pirate_2', type: 'pirate', name: '해적선 붉은깃발호', pos: [180, -180], shipId: 'caravela_redonda',
    hp: 420, hostile: true, patrolRadius: 120 },
  { id: 'merchant_1', type: 'merchant', name: '상인선 카를로스호', pos: [-540, 190], shipId: 'fluyt',
    hp: 600, hostile: false, patrolRadius: 200 },
  { id: 'adventurer_1', type: 'adventurer', name: '모험가 페드로의 배', pos: [-250, 60], shipId: 'pinta',
    hp: 350, hostile: false, patrolRadius: 260 },
  { id: 'notable_1', type: 'notable', name: '항해가 바스코 다가마 함대', pos: [-450, -140], shipId: 'nau_santa_maria',
    hp: 900, hostile: false, patrolRadius: 0 },
];
