// 바다 위 NPC 선박 스폰 데이터 (프로토타입 범위 — 유형별 최소 1~2기)
// 좌표는 project(lon,lat)로 구해 대륙/섬 폴리곤과 겹치지 않는 공해상에 배치했다 —
// coastline.js의 SCALE이 바뀌어도(전세계 확장으로 45→90) 항상 같은 실제 위치를 유지한다.
import { project } from './coastline.js';

export const SEA_NPC_SHIPS = [
  { id: 'pirate_1', type: 'pirate', name: '해적선 검은상어호', pos: project(-11.83, 35.00), shipId: 'caravel_war',
    hp: 500, hostile: true, patrolRadius: 60, tier: 'grunt' },
  { id: 'pirate_2', type: 'pirate', name: '해적선 붉은깃발호', pos: project(2.61, 52.78), shipId: 'caravela_redonda',
    hp: 420, hostile: true, patrolRadius: 25, tier: 'grunt' },
  { id: 'merchant_1', type: 'merchant', name: '상인선 카를로스호', pos: project(-11.39, 40.56), shipId: 'fluyt',
    hp: 600, hostile: false, patrolRadius: 60 },
  { id: 'adventurer_1', type: 'adventurer', name: '모험가 페드로의 배', pos: project(-8.50, 36.11), shipId: 'pinta',
    hp: 350, hostile: false, patrolRadius: 20 },
  { id: 'notable_1', type: 'notable', name: '항해가 바스코 다가마 함대', pos: project(-12.28, 41.00), shipId: 'nau_santa_maria',
    hp: 900, hostile: false, patrolRadius: 0,
    dialogue: '"인도로 가는 항로를 처음 연 게 나일세." 노련한 함대 사령관이 자부심 가득한 얼굴로 인사를 건넵니다.' },

  // ── 북해/영불해협 (런던·암스테르담·함부르크 인근) ──
  { id: 'merchant_london', type: 'merchant', name: '차 무역선 빅토리아호', pos: project(1.86, 51.82), shipId: 'tea_clipper',
    hp: 700, hostile: false, patrolRadius: 45 },
  { id: 'pirate_channel', type: 'pirate', name: '해적선 북해의 늑대호', pos: project(2.57, 52.36), shipId: 'topsail_schooner',
    hp: 550, hostile: true, patrolRadius: 35, tier: 'grunt' },
  { id: 'merchant_amsterdam', type: 'merchant', name: '동인도회사 무역선 바타비아호', pos: project(3.19, 53.64), shipId: 'east_indiaman',
    hp: 1000, hostile: false, patrolRadius: 50 },
  { id: 'merchant_hamburg', type: 'merchant', name: '한자동맹 코게선 그라이프호', pos: project(8.445, 53.42), shipId: 'cog',
    hp: 600, hostile: false, patrolRadius: 40 },

  // ── 지중해(마르세유·제노바·베네치아 인근) ──
  { id: 'notable_soleil', type: 'notable', name: '프랑스 왕실함대 솔레유 루아얄호', pos: project(5.32, 41.36), shipId: 'soleil_royal',
    hp: 2900, hostile: false, patrolRadius: 0,
    dialogue: '태양왕의 문장을 두른 거함이 위풍당당하게 예포를 울립니다. 함부로 대적할 상대는 아닌 듯합니다.' },
  { id: 'adventurer_genova', type: 'adventurer', name: '항해가 콜롬보의 배', pos: project(7.66, 42.69), shipId: 'caravel_pinnace',
    hp: 450, hostile: false, patrolRadius: 30 },
  { id: 'merchant_venezia', type: 'merchant', name: '베네치아 갈레온 레온도로호', pos: project(13.32, 43.44), shipId: 'galeone_veneziano',
    hp: 1100, hostile: false, patrolRadius: 45 },
  { id: 'pirate_med', type: 'pirate', name: '바르바리 해적선 붉은수염호', pos: project(7.12, 41.98), shipId: 'baltimore_schooner',
    hp: 380, hostile: true, patrolRadius: 35, tier: 'grunt' },

  // ── 전세계 항로 확장 — 대서양·인도양 신규 항구 인근 순찰선 ──
  { id: 'pirate_caribbean', type: 'pirate', name: '해적선 카리브의 유령호', pos: project(-75.87, 21.0), shipId: 'baltimore_schooner',
    hp: 480, hostile: true, patrolRadius: 40, tier: 'grunt' },
  { id: 'merchant_havana', type: 'merchant', name: '은 함대 산타클라라호', pos: project(-79.5, 19.0), shipId: 'fluyt',
    hp: 800, hostile: false, patrolRadius: 40 },
  { id: 'merchant_goa', type: 'merchant', name: '동인도 무역선 상투메호', pos: project(72.5, 16.5), shipId: 'east_indiaman',
    hp: 900, hostile: false, patrolRadius: 45 },
  { id: 'pirate_malacca', type: 'pirate', name: '해적선 해협의 이빨호', pos: project(100.8, 3.0), shipId: 'caravel_war',
    hp: 460, hostile: true, patrolRadius: 30, tier: 'grunt' },

  // ── 신규 해적 증원 — 지역별 컨셉 배치 ──
  // 해적 선종 자체를 다양화해 배마다 자연스러운 난이도 곡선(잡몹→엘리트→보스)을 이루도록
  // 했다. 판옥선·거북선처럼 각국 정규 수군이 "정의롭게" 쓴 배는 해적에게 넘기지 않고,
  // 그 해역 해적이 실제로 즐겨 쓴 전용 선형(왜구 습격선/해적 정크/제벡선/라농선 등)을 새로
  // 만들어 태운다.
  { id: 'pirate_wokou', type: 'pirate', name: '왜구선 아카츠키호', pos: project(129.6, 33.0), shipId: 'wokou_raider',
    hp: 420, hostile: true, patrolRadius: 30, tier: 'grunt' },
  { id: 'pirate_china_coast', type: 'pirate', name: '해적선 흑룡호', pos: project(116.5, 22.5), shipId: 'pirate_junk',
    hp: 1000, hostile: true, patrolRadius: 35, tier: 'elite' },
  { id: 'pirate_sulu', type: 'pirate', name: '해적선 술루의 파도호', pos: project(119.5, 7.5), shipId: 'pirate_lanong',
    hp: 480, hostile: true, patrolRadius: 35, tier: 'elite' },

  // 바르바리(지중해 서부)에는 지역 고유 선형인 제벡선을 잡몹/엘리트 2단계로 배치한다.
  { id: 'pirate_barbary_grunt', type: 'pirate', name: '바르바리 해적선', pos: project(2.2, 37.3), shipId: 'pirate_xebec',
    hp: 300, hostile: true, patrolRadius: 30, tier: 'grunt' },
  { id: 'pirate_barbary_elite', type: 'pirate', name: '바르바리 해적 사령선', pos: project(15.3, 35.3), shipId: 'pirate_xebec',
    hp: 550, hostile: true, patrolRadius: 35, tier: 'elite' },
  { id: 'pirate_caribbean_2', type: 'pirate', name: '해적선 죽음의 산호호', pos: project(-78.5, 20.0), shipId: 'pirate_sloop',
    hp: 320, hostile: true, patrolRadius: 40, tier: 'grunt' },
  { id: 'pirate_indian_ocean', type: 'pirate', name: '해적선 계절풍의 습격자호', pos: project(101.0, 3.5), shipId: 'pirate_frigate',
    hp: 560, hostile: true, patrolRadius: 35, tier: 'elite' },
  { id: 'pirate_baltic', type: 'pirate', name: '발트해 해적선', pos: project(15.5, 55.0), shipId: 'pirate_galliot',
    hp: 300, hostile: true, patrolRadius: 30, tier: 'grunt' },

  // 보스 — 세계 전역에 딱 한 척뿐인 유일 개체 2기. 대서양(크라켄의 이빨호)과 남중국해
  // (정씨 해적 선단 기함)에 각각 배치해 양 대륙에 하나씩 전설적인 조우를 심어둔다.
  { id: 'pirate_boss_kraken', type: 'pirate', name: '[보스] 해적 기함 크라켄의 이빨호', pos: project(-27.0, 36.0), shipId: 'pirate_flagship_kraken',
    hp: 2400, hostile: true, patrolRadius: 25, tier: 'boss' },
  { id: 'pirate_boss_zheng', type: 'pirate', name: '[보스] 정씨 해적 선단 기함', pos: project(114.0, 21.5), shipId: 'pirate_junk_flagship',
    hp: 2600, hostile: true, patrolRadius: 25, tier: 'boss' },
];
