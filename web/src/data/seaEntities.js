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

  // ── 북해/영불해협 (런던·암스테르담·함부르크 인근) ──
  { id: 'merchant_london', type: 'merchant', name: '차 무역선 빅토리아호', pos: [16, -307], shipId: 'tea_clipper',
    hp: 700, hostile: false, patrolRadius: 45 },
  { id: 'pirate_channel', type: 'pirate', name: '해적선 북해의 늑대호', pos: [48, -331], shipId: 'topsail_schooner',
    hp: 550, hostile: true, patrolRadius: 35 },
  { id: 'merchant_amsterdam', type: 'merchant', name: '동인도회사 무역선 바타비아호', pos: [76, -389], shipId: 'east_indiaman',
    hp: 1000, hostile: false, patrolRadius: 50 },
  { id: 'merchant_hamburg', type: 'merchant', name: '한자동맹 코게선 그라이프호', pos: [380, -289], shipId: 'cog',
    hp: 600, hostile: false, patrolRadius: 40 },

  // ── 지중해(마르세유·제노바·베네치아 인근) ──
  { id: 'notable_soleil', type: 'notable', name: '프랑스 왕실함대 솔레유 루아얄호', pos: [172, 164], shipId: 'soleil_royal',
    hp: 2900, hostile: false, patrolRadius: 0 },
  { id: 'adventurer_genova', type: 'adventurer', name: '항해가 콜롬보의 배', pos: [277, 104], shipId: 'caravel_pinnace',
    hp: 450, hostile: false, patrolRadius: 30 },
  { id: 'merchant_venezia', type: 'merchant', name: '베네치아 갈레온 레온도로호', pos: [520, 70], shipId: 'galeone_veneziano',
    hp: 1100, hostile: false, patrolRadius: 45 },
  { id: 'pirate_med', type: 'pirate', name: '바르바리 해적선 붉은수염호', pos: [253, 136], shipId: 'baltimore_schooner',
    hp: 380, hostile: true, patrolRadius: 35 },
];
