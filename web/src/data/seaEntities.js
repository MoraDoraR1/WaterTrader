// 바다 위 NPC 선박 스폰 데이터 (프로토타입 범위 — 유형별 최소 1~2기)
// 좌표는 project(lon,lat)로 구해 대륙/섬 폴리곤과 겹치지 않는 공해상에 배치했다 —
// coastline.js의 SCALE이 바뀌어도(전세계 확장으로 45→90) 항상 같은 실제 위치를 유지한다.
//
// ---- 해역별 레벨 디자인(region) ----
// 상인 유저가 실제로 밟는 항로를 그대로 난이도 곡선으로 삼는다 — entities/pirate.js의
// REGION_MULS가 이 region 값(1~4)을 hp·화력·발사속도 배율로 바꾼다.
//   region 1: 유럽 근해(리스본·북해·지중해·발트해) — 초심자 해역, 배율 없음.
//   region 2: 대서양 횡단·카리브해 — 담배 무역으로 처음 건너가는 원양. 첫 보스(흑수염) 배치.
//   region 3: 인도양·동남아 향신료 항로 — 캘리컷 이후 육두구 등 향신료 무역권. 두 번째 보스(헨리 에브리) 배치.
//   region 4: 극동·남만 무역로 — 중국·일본 항로, 가장 위험한 원거리 해역. 세 번째 보스(정씨 해적) 배치.
//
// ---- 보스/엘리트는 전부 실존했던 유명 해적을 소재로 한다 ----
// (판옥선·거북선처럼 각국 정규 수군이 정의롭게 쓴 배와는 별개로, 여기 이름들은 실제
// 해적·사략선 선장들이다 — 흑수염(에드워드 티치)/헨리 에브리/정이수(보스), 클라우스
// 슈퇴르테베커/캘리코 잭/라 뷔즈(올리비에 르바쇠르)/장바오자이(엘리트).)
import { project } from './coastline.js';

export const SEA_NPC_SHIPS = [
  // respawnDays: 이 잡몹 4척은 각자를 노리는 비-체인 현상금 의뢰가 있어(data/quests.js
  // repeatable:true), 강화 없이(escalation 미적용) 단순 리스폰만 하도록 표시했다 — 다른
  // 잡몹 7척은 여전히 소진형이다(전투 축의 "가벼운 전투" 소재는 의도적으로 유한하게 유지).
  { id: 'pirate_1', type: 'pirate', name: '해적선 검은상어호', pos: project(-11.83, 35.00), shipId: 'caravel_war',
    hp: 500, hostile: true, patrolRadius: 60, tier: 'grunt', region: 1, respawnDays: 4 },
  { id: 'pirate_2', type: 'pirate', name: '해적선 붉은깃발호', pos: project(2.61, 52.78), shipId: 'caravela_redonda',
    hp: 420, hostile: true, patrolRadius: 25, tier: 'grunt', region: 1, respawnDays: 4 },
  { id: 'merchant_1', type: 'merchant', name: '상인선 카를로스호', pos: project(-11.39, 40.56), shipId: 'fluyt',
    hp: 600, hostile: false, patrolRadius: 60, country: 'PT' },
  { id: 'adventurer_1', type: 'adventurer', name: '모험가 페드로의 배', pos: project(-8.50, 36.11), shipId: 'pinta',
    hp: 350, hostile: false, patrolRadius: 20, country: 'PT' },
  { id: 'notable_1', type: 'notable', name: '항해가 바스코 다가마 함대', pos: project(-12.28, 41.00), shipId: 'nau_santa_maria',
    hp: 900, hostile: false, patrolRadius: 0, country: 'PT',
    dialogue: '"인도로 가는 항로를 처음 연 게 나일세." 노련한 함대 사령관이 자부심 가득한 얼굴로 인사를 건넵니다.' },

  // ── [region 1: 유럽 근해] 북해/영불해협 (런던·암스테르담·함부르크 인근) ──
  { id: 'merchant_london', type: 'merchant', name: '차 무역선 빅토리아호', pos: project(1.86, 51.82), shipId: 'tea_clipper',
    hp: 700, hostile: false, patrolRadius: 45, country: 'EN' },
  { id: 'pirate_channel', type: 'pirate', name: '해적선 북해의 늑대호', pos: project(2.57, 52.36), shipId: 'topsail_schooner',
    hp: 550, hostile: true, patrolRadius: 35, tier: 'grunt', region: 1, respawnDays: 4 },
  { id: 'merchant_amsterdam', type: 'merchant', name: '동인도회사 무역선 바타비아호', pos: project(3.19, 53.64), shipId: 'east_indiaman',
    hp: 1000, hostile: false, patrolRadius: 50, country: 'NL' },
  { id: 'merchant_hamburg', type: 'merchant', name: '한자동맹 코게선 그라이프호', pos: project(8.445, 53.42), shipId: 'cog',
    hp: 600, hostile: false, patrolRadius: 40, country: 'HAN' },
  { id: 'pirate_baltic', type: 'pirate', name: '발트해 해적선', pos: project(15.5, 55.0), shipId: 'pirate_galliot',
    hp: 300, hostile: true, patrolRadius: 30, tier: 'grunt', region: 1 },
  // 클라우스 슈퇴르테베커 — 14세기 발트해·북해를 주름잡은 "빅투알리엔 형제단"의 실존
  // 해적 두목. 함부르크에서 처형된 뒤에도 참수된 목이 대열 앞을 걸어갔다는 전설로 남았다.
  { id: 'pirate_elite_stortebeker', type: 'pirate', name: '[엘리트] 클라우스 슈퇴르테베커의 해적선', pos: project(10.5, 57.0), shipId: 'pirate_brigantine',
    hp: 580, hostile: true, patrolRadius: 35, tier: 'elite', region: 1 },

  // ── [region 1: 유럽 근해] 지중해(마르세유·제노바·베네치아·바르바리 인근) ──
  { id: 'notable_soleil', type: 'notable', name: '프랑스 왕실함대 솔레유 루아얄호', pos: project(5.32, 41.36), shipId: 'soleil_royal',
    hp: 2900, hostile: false, patrolRadius: 0, country: 'FR',
    dialogue: '태양왕의 문장을 두른 거함이 위풍당당하게 예포를 울립니다. 함부로 대적할 상대는 아닌 듯합니다.' },
  { id: 'adventurer_genova', type: 'adventurer', name: '항해가 콜롬보의 배', pos: project(7.66, 42.69), shipId: 'caravel_pinnace',
    hp: 450, hostile: false, patrolRadius: 30, country: 'IT' },
  { id: 'merchant_venezia', type: 'merchant', name: '베네치아 갈레온 레온도로호', pos: project(13.32, 43.44), shipId: 'galeone_veneziano',
    hp: 1100, hostile: false, patrolRadius: 45, country: 'IT' },
  { id: 'pirate_med', type: 'pirate', name: '바르바리 해적선 붉은수염호', pos: project(7.12, 41.98), shipId: 'baltimore_schooner',
    hp: 380, hostile: true, patrolRadius: 35, tier: 'grunt', region: 1, respawnDays: 4 },
  { id: 'pirate_barbary_grunt', type: 'pirate', name: '바르바리 해적선', pos: project(2.2, 37.3), shipId: 'pirate_xebec',
    hp: 300, hostile: true, patrolRadius: 30, tier: 'grunt', region: 1 },
  { id: 'pirate_barbary_elite', type: 'pirate', name: '[엘리트] 바르바리 해적 사령선', pos: project(15.3, 35.3), shipId: 'pirate_xebec',
    hp: 550, hostile: true, patrolRadius: 35, tier: 'elite', region: 1 },

  // ── [region 2: 대서양 횡단·카리브해 — 담배 무역로] ──
  // 유럽을 벗어나 처음 마주하는 원양. 잡몹 두 척 + 엘리트(캘리코 잭) + 항로 한복판을
  // 지키는 첫 보스(흑수염, 에드워드 티치의 실존 기함 "앤 여왕의 복수호").
  { id: 'pirate_caribbean', type: 'pirate', name: '해적선 카리브의 유령호', pos: project(-75.87, 21.0), shipId: 'baltimore_schooner',
    hp: 480, hostile: true, patrolRadius: 40, tier: 'grunt', region: 2 },
  { id: 'merchant_havana', type: 'merchant', name: '은 함대 산타클라라호', pos: project(-79.5, 19.0), shipId: 'fluyt',
    hp: 800, hostile: false, patrolRadius: 40, country: 'ES' },
  { id: 'pirate_caribbean_2', type: 'pirate', name: '해적선 죽음의 산호호', pos: project(-78.5, 20.0), shipId: 'pirate_sloop',
    hp: 320, hostile: true, patrolRadius: 40, tier: 'grunt', region: 2 },
  // 존 "캘리코 잭" 랙엄 — 앤 보니·메리 리드와 함께 활동한 실존 해적. 그의 배 "윌리엄호"는
  // 작고 빠른 슬루프였지만, 선장의 악명은 대형선 못지않았다.
  { id: 'pirate_elite_calicojack', type: 'pirate', name: '[엘리트] 캘리코 잭의 윌리엄호', pos: project(-76.5, 22.0), shipId: 'pirate_sloop',
    hp: 650, hostile: true, patrolRadius: 35, tier: 'elite', region: 2 },
  { id: 'pirate_boss_blackbeard', type: 'pirate', name: '[보스] 흑수염의 앤 여왕의 복수호', pos: project(-27.0, 36.0), shipId: 'pirate_flagship_blackbeard',
    hp: 2400, hostile: true, patrolRadius: 25, tier: 'boss', region: 2 },
  // 명사 NPC 헌정 원정(data/quests.js chain_soleil_*)의 2부 토벌 대상 — 왕실함대의 신대륙
  // 원정을 노리는 대서양 한복판의 사략선.
  { id: 'pirate_elite_atlantic_crossing', type: 'pirate', name: '[엘리트] 대서양의 사략선 검은백합호', pos: project(-45.0, 44.0), shipId: 'pirate_frigate',
    hp: 600, hostile: true, patrolRadius: 35, tier: 'elite', region: 2 },

  // ── [region 3: 인도양·동남아 향신료 항로] 캘리컷 이후 육두구 등 향신료 무역권 ──
  { id: 'merchant_goa', type: 'merchant', name: '동인도 무역선 상투메호', pos: project(72.5, 16.5), shipId: 'east_indiaman',
    hp: 900, hostile: false, patrolRadius: 45, country: 'PT' },
  // 말라바르 해안(캘리컷·고아 인근)의 실제 역사 그대로 — 칸호지 앙그리아의 마라타 해군이
  // 유럽 상선을 위협했다. "구랍(Grab)"은 플레이어도 구매 가능한 정규 선박이지만, 판옥선/
  // 거북선과 달리 침략자에 맞선 단일 "정의의 상징"이 아니라 실제로 유럽 상선을 약탈한
  // 무장 세력이었으므로 해적선으로 재현해도 컨셉에 어긋나지 않는다.
  { id: 'pirate_malabar', type: 'pirate', name: '말라바르 해적선', pos: project(74.5, 13.0), shipId: 'grab',
    hp: 500, hostile: true, patrolRadius: 35, tier: 'grunt', region: 3 },
  { id: 'pirate_malacca', type: 'pirate', name: '해적선 해협의 이빨호', pos: project(100.8, 3.0), shipId: 'caravel_war',
    hp: 460, hostile: true, patrolRadius: 30, tier: 'grunt', region: 3 },
  { id: 'pirate_sulu', type: 'pirate', name: '[엘리트] 해적선 술루의 파도호', pos: project(119.5, 7.5), shipId: 'pirate_lanong',
    hp: 480, hostile: true, patrolRadius: 35, tier: 'elite', region: 3 },
  { id: 'pirate_indian_ocean', type: 'pirate', name: '[엘리트] 해적선 계절풍의 습격자호', pos: project(101.0, 3.5), shipId: 'pirate_frigate',
    hp: 560, hostile: true, patrolRadius: 35, tier: 'elite', region: 3 },
  // 명사 NPC 헌정 원정(data/quests.js chain_dagama_*)의 2부 토벌 대상 — 캘리컷 앞바다에
  // 눌러앉아 다가마 제독의 원정로를 위협하는 해적선.
  { id: 'pirate_elite_malabar_route', type: 'pirate', name: '[엘리트] 말라바르 해협의 검은돛대호', pos: project(73.5, 11.8), shipId: 'pirate_frigate',
    hp: 540, hostile: true, patrolRadius: 35, tier: 'elite', region: 3 },
  // 올리비에 르바쇠르(라 뷔즈, "매") — 마다가스카르를 근거지로 무굴 보물선 나포에도
  // 가담한 실존 인도양 해적. 처형 직전 관중에게 던졌다는 미해독 보물 암호문으로 유명하다.
  { id: 'pirate_elite_labuse', type: 'pirate', name: '[엘리트] 라 뷔즈의 해적선', pos: project(47.5, -18.0), shipId: 'pirate_frigate',
    hp: 520, hostile: true, patrolRadius: 35, tier: 'elite', region: 3 },
  // 헨리 에브리("롱 벤") — 1695년 무굴 제국의 보물선 간즈이사와이호를 나포해 사상 최대급
  // 해적질을 해낸 실존 해적. 이후 끝내 붙잡히지 않고 종적을 감춰 "해적왕"으로 불렸다.
  { id: 'pirate_boss_every', type: 'pirate', name: '[보스] 헨리 에브리의 팬시호', pos: project(58.0, 6.0), shipId: 'pirate_flagship_every',
    hp: 2500, hostile: true, patrolRadius: 25, tier: 'boss', region: 3 },

  // ── [region 4: 극동·남만 무역로] 중국·일본 항로 — 가장 위험한 원거리 해역 ──
  // 판옥선·거북선처럼 각국 정규 수군이 "정의롭게" 쓴 배는 해적에게 넘기지 않고, 그 해역
  // 해적이 실제로 즐겨 쓴 전용 선형(왜구 습격선/해적 정크)을 새로 만들어 태운다.
  { id: 'pirate_wokou', type: 'pirate', name: '왜구선 아카츠키호', pos: project(129.6, 33.0), shipId: 'wokou_raider',
    hp: 420, hostile: true, patrolRadius: 30, tier: 'grunt', region: 4 },
  // 정씨 해적 연합("홍기방" 등 6개 함대 연합)은 하이난 앞바다부터 푸젠 연안까지 남중국해
  // 해안 전역을 세력권으로 삼았다 — 실제 활동 범위를 반영해 세 척을 광둥(주강 하구)·
  // 푸젠(타이완 해협)·하이난(퉁킹만) 앞바다로 넓게 흩어 배치한다.
  { id: 'pirate_china_coast', type: 'pirate', name: '[엘리트] 해적선 흑룡호', pos: project(108.0, 20.0), shipId: 'pirate_junk',
    hp: 1000, hostile: true, patrolRadius: 35, tier: 'elite', region: 4 },
  // 장바오자이(張保仔) — 정이수의 양자이자 최측근 지휘관이었던 실존 해적. 한때 남중국해
  // 해적 연합의 실질적 야전 사령관으로, 훗날 청 조정에 투항해 관직까지 받았다.
  { id: 'pirate_elite_zhangbaozai', type: 'pirate', name: '[엘리트] 장바오자이의 해적선', pos: project(120.2, 25.0), shipId: 'pirate_junk',
    hp: 900, hostile: true, patrolRadius: 35, tier: 'elite', region: 4 },
  { id: 'pirate_boss_zheng', type: 'pirate', name: '[보스] 정씨 해적 선단 기함', pos: project(114.0, 21.5), shipId: 'pirate_junk_flagship',
    hp: 2600, hostile: true, patrolRadius: 25, tier: 'boss', region: 4 },

  // ── [상행 NPC(상단) + 해군 NPC] — 해역 1~4마다 2척씩. ──
  // 상단(convoy)은 평화롭지만(hostile:false) 격침하면 대량의 교역품을 노획할 수 있는 대신
  // 악명이 쌓이고, 그 자리 근처로 해군 추격대가 즉시 출동한다(entities/pirate.js/seaScene.js
  // _spawnNavyResponder 참고). 해군(navy)은 평소엔 순찰만 하는 정규 수군이지만, 플레이어에게
  // 악명이 있는 상태로 사거리 안에 들어오면 무조건 교전을 걸어온다(systems/fame.js 악명 참고).
  // 두 유형 모두 바다 화면에 "🚩 상단"/"⚓ 해군" 라벨이 상시 표시된다.
  { id: 'convoy_europe_1', type: 'convoy', name: '[상단] 리스본 향신료 호송대', pos: project(-10.0, 39.5), shipId: 'east_indiaman',
    hp: 1000, hostile: false, patrolRadius: 40, country: 'NL', region: 1, tier: 'convoy' },
  { id: 'convoy_europe_2', type: 'convoy', name: '[상단] 베네치아 상단', pos: project(14.0, 43.0), shipId: 'galeone_veneziano',
    hp: 1100, hostile: false, patrolRadius: 40, country: 'IT', region: 1, tier: 'convoy' },
  { id: 'navy_europe_1', type: 'navy', name: '[해군] 스페인 해안 경비대', pos: project(-9.0, 44.0), shipId: 'galera_real',
    hp: 480, hostile: false, patrolRadius: 45, country: 'ES', region: 1 },
  { id: 'navy_europe_2', type: 'navy', name: '[해군] 몰타 기사단 순찰대', pos: project(16.0, 36.0), shipId: 'malta_galley',
    hp: 560, hostile: false, patrolRadius: 45, country: 'IT', region: 1 },

  { id: 'convoy_atlantic_1', type: 'convoy', name: '[상단] 카리브 설탕 호송대', pos: project(-81.5, 21.0), shipId: 'fluyt',
    hp: 600, hostile: false, patrolRadius: 40, country: 'NL', region: 2, tier: 'convoy' },
  { id: 'convoy_atlantic_2', type: 'convoy', name: '[상단] 대서양 상단', pos: project(-40.0, 30.0), shipId: 'nau_santa_maria',
    hp: 900, hostile: false, patrolRadius: 40, country: 'PT', region: 2, tier: 'convoy' },
  { id: 'navy_atlantic_1', type: 'navy', name: '[해군] 스페인 보물함대 호위대', pos: project(-81.0, 23.5), shipId: 'galera_real',
    hp: 480, hostile: false, patrolRadius: 45, country: 'ES', region: 2 },
  { id: 'navy_atlantic_2', type: 'navy', name: '[해군] 포르투갈 순찰함', pos: project(-28.0, 38.0), shipId: 'galera_real',
    hp: 480, hostile: false, patrolRadius: 45, country: 'PT', region: 2 },

  { id: 'convoy_indian_1', type: 'convoy', name: '[상단] 고아 향신료 상단', pos: project(71.0, 15.5), shipId: 'east_indiaman',
    hp: 1000, hostile: false, patrolRadius: 40, country: 'PT', region: 3, tier: 'convoy' },
  { id: 'convoy_indian_2', type: 'convoy', name: '[상단] 말라카 해협 상단', pos: project(100.5, 4.0), shipId: 'galeone_veneziano',
    hp: 1100, hostile: false, patrolRadius: 40, country: 'PT', region: 3, tier: 'convoy' },
  { id: 'navy_indian_1', type: 'navy', name: '[해군] 오만 해군', pos: project(59.5, 24.5), shipId: 'omani_warship',
    hp: 1350, hostile: false, patrolRadius: 50, country: 'OM', region: 3 },
  { id: 'navy_indian_2', type: 'navy', name: '[해군] 오스만 해군 분견대', pos: project(43.5, 12.5), shipId: 'ottoman_kadirga',
    hp: 520, hostile: false, patrolRadius: 45, country: 'OT', region: 3 },

  { id: 'convoy_asia_1', type: 'convoy', name: '[상단] 나가사키 무역 상단', pos: project(129.0, 32.5), shipId: 'fluyt',
    hp: 600, hostile: false, patrolRadius: 40, country: 'NL', region: 4, tier: 'convoy' },
  { id: 'convoy_asia_2', type: 'convoy', name: '[상단] 광둥 상단', pos: project(113.0, 22.0), shipId: 'nau_santa_maria',
    hp: 900, hostile: false, patrolRadius: 40, country: 'PT', region: 4, tier: 'convoy' },
  { id: 'navy_asia_1', type: 'navy', name: '[해군] 조선 수군', pos: project(128.5, 34.5), shipId: 'panokseon',
    hp: 700, hostile: false, patrolRadius: 45, country: 'KR', region: 4 },
  { id: 'navy_asia_2', type: 'navy', name: '[해군] 조선 수군 거북선대', pos: project(120.0, 24.0), shipId: 'geobukseon',
    hp: 2700, hostile: false, patrolRadius: 45, country: 'KR', region: 4 },

  // ── [엔드게임: 세 항로를 모두 개척해야 조우하는 레전더리 해적] ──
  // requiresRoutes에 적힌 항로가 전부 해금되기 전까지는 entities/pirate.js의 isActive()가
  // false를 반환해 클릭·조준·렌더링·AI 갱신 전부에서 완전히 제외된다 — 그 자리를 미리
  // 지나가도 아무것도 없는 것처럼 보인다. 특정 지역 소속이 아니라 세 대양 전체를 상징하는
  // 존재라 region은 지정하지 않고(기본값 1), TIER_MULS.legendary 배율만으로 강함을 낸다.
  // 격침해도 보스와 마찬가지로 무한 리스폰+누적 강화가 그대로 적용된다(다만 리스폰 주기는
  // 14항해일로 보스보다 더 길다) — 최상급 건조 재료(전설 해적기함의 철갑판)의 최고 효율
  // 파밍처가 되어, "세 항로 완주"가 끝이 아니라 다음 목표(진짜 최상급 함선)로 이어지게 한다.
  { id: 'pirate_legendary_roberts', type: 'pirate', name: '[레전더리] 바르톨로뮤 로버츠의 로열 포춘호', pos: project(-20.0, 0.5), shipId: 'pirate_flagship_roberts',
    hp: 3600, hostile: true, patrolRadius: 30, tier: 'legendary', requiresRoutes: ['west_africa', 'new_world', 'indian_ocean'] },
];

// 상단(convoy)을 격침한 순간 스폰되는 해군 추격대의 배 종류 — 그 해역의 정규 수군을 그대로
// 재사용해(위 navy 스폰 목록과 동일한 배들) 갑자기 전혀 다른 배가 튀어나오는 어색함을 없앤다.
export const NAVY_RESPONDER_SHIP_BY_REGION = {
  1: { shipId: 'galera_real', country: 'ES', name: '[해군] 출동한 해안 경비대' },
  2: { shipId: 'galera_real', country: 'ES', name: '[해군] 출동한 호위대' },
  3: { shipId: 'omani_warship', country: 'OM', name: '[해군] 출동한 오만 해군' },
  4: { shipId: 'panokseon', country: 'KR', name: '[해군] 출동한 조선 수군' },
};
