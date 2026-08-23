// 바다 위 NPC 선박 스폰 데이터 (프로토타입 범위 — 유형별 최소 1~2기)
// 좌표는 실제 지리 투영 좌표계 기준으로, 대륙/섬 폴리곤과 겹치지 않는 공해상에 배치했다.
export const SEA_NPC_SHIPS = [
  { id: 'pirate_1', type: 'pirate', name: '해적선 검은상어호', pos: [-600, 450], shipId: 'caravel_war',
    hp: 500, hostile: true, patrolRadius: 60 },
  { id: 'pirate_2', type: 'pirate', name: '해적선 붉은깃발호', pos: [50, -350], shipId: 'caravela_redonda',
    hp: 420, hostile: true, patrolRadius: 25 },
  { id: 'merchant_1', type: 'merchant', name: '상인선 카를로스호', pos: [-580, 200], shipId: 'fluyt',
    hp: 600, hostile: false, patrolRadius: 60 },
  { id: 'adventurer_1', type: 'adventurer', name: '모험가 페드로의 배', pos: [-450, 400], shipId: 'pinta',
    hp: 350, hostile: false, patrolRadius: 20 },
  { id: 'notable_1', type: 'notable', name: '항해가 바스코 다가마 함대', pos: [-620, 180], shipId: 'nau_santa_maria',
    hp: 900, hostile: false, patrolRadius: 0 },
];
