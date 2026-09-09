// 선박 데이터 — 대항해시대~범선시대(15~19세기) 실존 선종/명명 고증
// class: small(소형) / medium(중형) / large(대형) / xlarge(초대형) — 선체 크기 등급
// role: adventure(모험용) / trade(교역용) / combat(전투용) — 대항해시대 온라인 실제 함선 도감의 용도 분류를 참고해 부여.
//       모험용은 선회/속도, 교역용은 적재량, 전투용은 화력/내구도가 동급 대비 우수하도록 능력치를 배분한다.
// type: 선종(SHIP_TYPES 참고) — 실루엣/삭구 형태를 결정한다(국가색은 더 이상 선체 색에 반영하지 않음).
// speed: 최고 전진속도(m/s 환산 기준값), turnRate: deg/s, hp: 내구도, cargo: 적재량(톤)
// cannons: 이 배가 대포 슬롯을 전부 최고 등급으로 채웠을 때 도달하는 "최대 장착 가능 포문 수"
//   (기본으로 탑재되어 나오는 값이 아니다 — 모든 배는 대포 슬롯이 빈 채로 시작하며, 조선소에서
//   직접 부품을 사서 장착해야 실제 화력이 생긴다. 대포가 하나도 없으면 포탄이 있어도 포격 자체가
//   불가능하다.) cannonSlotTiers: 슬롯별로 허용되는 "최대" 부품 등급(Tier, 1~4)의 배열 — 배열
//   길이가 곧 슬롯 수(소형 1 ~ 초대형 6)이고, 각 슬롯은 그 값 이하 등급의 대포 부품만 장착 가능
//   하다(등급별 화력: Tier1=+2 / Tier2=+5 / Tier3=+16 / Tier4=+32, systems/shipyard.js 참고).
//   cannons 필드는 정확히 이 슬롯 조합의 최댓값 합으로 계산되어 있어, 슬롯을 다 채워도 이 배의
//   원래 고증 화력을 벗어나지 않는다. 대포 없이 충각·백병전으로만 싸우는 로마 데케레스는
//   cannonSlotTiers가 빈 배열(슬롯 자체가 없음).
// crew: 승무원, price: 조선 비용(더컷 기준), hull: 외형 프리셋
// skills: 이 배에 원래 내재된 고유 스킬 id 배열(data/shipSkills.js 참고) — 조선소에서 사고파는
//   부품과 달리 교체 불가능하고 항상 적용된다. 배열 길이(=스킬 슬롯 수)는 등급이 정한다
//   (소형 1 / 중형 2 / 대형 3 / 초대형 4). role에 따라 배정 가능한 스킬 카테고리가 고정된다
//   (combat->전투, trade->생존, adventure->탐험) — 한 배가 여러 카테고리를 섞어 갖지 않는다.

export const SHIP_CLASSES = {
  small: { label: '소형선', hullScale: [1, 1, 1], mastCount: 1 },
  medium: { label: '중형선', hullScale: [1.4, 1.15, 1.6], mastCount: 2 },
  large: { label: '대형선', hullScale: [1.8, 1.35, 2.2], mastCount: 3 },
  xlarge: { label: '초대형선', hullScale: [2.3, 1.6, 2.9], mastCount: 4 },
};

export const SHIP_ROLES = {
  adventure: { label: '모험용', color: '#6fc8e0', desc: '뛰어난 선회·기동성으로 미지의 항로 개척에 적합' },
  trade: { label: '교역용', color: '#e6c15a', desc: '넉넉한 적재량으로 대량 물자 수송에 특화' },
  combat: { label: '전투용', color: '#e0645a', desc: '두꺼운 장갑과 강력한 현측 포열을 갖춘 전투 특화선' },
};

// 선종별 고증 — 시대/주요 건조국/등장 가능한 크기 등급을 실제 조선사에 맞춰 제한한다.
// (모든 선종에 소~초대형을 다 채우지 않는다 — 예: 캐러벨/갤리는 초대형이 존재한 적이 없다.)
export const SHIP_TYPES = {
  // 대형은 "카라벨라 마이오르" — 실제로 존재했던 후기(16세기) 대형 무장/원양 캐러벨을
  // 근거로 한다. 다만 캐러벨은 애초에 날렵함이 정체성이라 초대형까지는 넣지 않는다
  // (그 크기가 되면 사실상 나오/카락으로 갈아탄 것이 역사적 실제 흐름이었다).
  caravel: { label: '캐러벨', era: '1440~1520s', nations: ['PT', 'ES'], sizes: ['small', 'medium', 'large'] },
  carrack: { label: '카락(나오)', era: '1450~1600s', nations: ['PT', 'ES', 'HAN'], sizes: ['medium', 'large'] },
  galleon: { label: '갈레온', era: '1520~1650s', nations: ['ES', 'PT', 'EN', 'NL', 'IT'], sizes: ['medium', 'large', 'xlarge'] },
  fullrig: { label: '범선(대형 상선)', era: '1600~1750s', nations: ['NL', 'EN', 'FR', 'SE'], sizes: ['medium', 'large'] },
  shipline: { label: '전열함', era: '1650~1850s', nations: ['EN', 'FR', 'ES', 'SE'], sizes: ['large', 'xlarge'] },
  // 대형/초대형은 갈레아스(Galeazza) — 갤리와 범선을 절충한 대형 노젓는 군함으로,
  // 레판토 해전(1571)·스페인 무적함대(1588)에 실전 투입된 실존 함종이다.
  galley: { label: '갤리', era: '고대~1600s', nations: ['IT', 'ES'], sizes: ['small', 'medium', 'large', 'xlarge'] },
  schooner: { label: '스쿠너', era: '1770s~1850s', nations: ['EN', 'NL'], sizes: ['small', 'medium'] },
  // 소형은 1830~40년대 아편 클리퍼(밀무역용 초쾌속 소형선), 초대형은 소브라온급
  // (1860년대 대형 이민/양모 클리퍼) — 클리퍼는 시기가 늦을수록 극단으로 커진 실제 사례가
  // 많아 소~초대형 전체 범위를 채울 근거가 충분하다.
  clipper: { label: '클리퍼', era: '1830~1870s', nations: ['EN'], sizes: ['small', 'medium', 'large', 'xlarge'] },
  // ── 동아시아 선종 — 판옥선/거북선/정크/아타케부네 등. 시기가 서로 안 맞아도(예: 거북선
  // 1592년과 오다 노부나가 철갑선 1570년대가 유럽 전열함들의 시대와 겹치지 않아도) 게임적
  // 허용 범위로 함께 등장시킨다. "유명하고 강력한 배는 초대형으로" 원칙에 따라 크기 등급은
  // 실제 고증(대부분 중~대형급)보다 한 단계 이상 올려 잡은 항목이 있다(거북선/철갑선/정화보선).
  panokseon: { label: '판옥선', era: '1555~1800s', nations: ['KR'], sizes: ['medium'] },
  geobukseon: { label: '거북선', era: '1592', nations: ['KR'], sizes: ['xlarge'] },
  joseon_cargo: { label: '조운선', era: '1400~1800s', nations: ['KR'], sizes: ['medium'] },
  junk: { label: '정크(전선)', era: '1300~1800s', nations: ['CN'], sizes: ['small', 'large'] },
  treasure_ship: { label: '보선', era: '1405~1433', nations: ['CN'], sizes: ['xlarge'] },
  atakebune: { label: '아타케부네', era: '1560~1630s', nations: ['JP'], sizes: ['large'] },
  tekkosen: { label: '철갑 아타케부네', era: '1578', nations: ['JP'], sizes: ['xlarge'] },
  sekibune: { label: '세키부네', era: '1467~1800s', nations: ['JP'], sizes: ['medium'] },
  bezaisen: { label: '벤자이센', era: '1600~1800s', nations: ['JP'], sizes: ['medium'] },
  kobaya: { label: '고바야', era: '1400~1800s', nations: ['JP'], sizes: ['small'] },
  // ── 그 외 세계 각지 선종 — 인도(마라타·무굴)/오스만/오만/몰타/라구사/동남아 등.
  // "이 게임은 배가 많이 중요하다"는 방향에 따라, 유럽·동아시아 외에도 실존했던 유명
  // 선종을 폭넓게 담는다.
  gallivat: { label: '갈리바트', era: '1700~1750s', nations: ['IN'], sizes: ['small'] },
  grab: { label: '구랍(그랩)', era: '1700~1750s', nations: ['IN'], sizes: ['medium'] },
  dhow: { label: '다우선', era: '1200~1800s', nations: ['IN', 'OM'], sizes: ['medium'] },
  mughal_ship: { label: '무굴 대형 선', era: '1650~1700s', nations: ['IN'], sizes: ['large'] },
  kadirga: { label: '카디르가', era: '1500~1700s', nations: ['OT'], sizes: ['medium'] },
  ottoman_flagship: { label: '오스만 제독 기함', era: '1530~1540s', nations: ['OT'], sizes: ['xlarge'] },
  omani_warship: { label: '오만 전열함', era: '1650~1750s', nations: ['OM'], sizes: ['large'] },
  argosy: { label: '아르고시', era: '1400~1600s', nations: ['RG'], sizes: ['large'] },
  scottish_carrack: { label: '스코틀랜드 대전함', era: '1511', nations: ['SC'], sizes: ['xlarge'] },
  mong_dong: { label: '몽동선', era: '1200~1800s', nations: ['VN'], sizes: ['medium'] },
  shuinsen: { label: '슈인센(주인선)', era: '1600~1630s', nations: ['JP'], sizes: ['medium'] },
  burmese_warship: { label: '버마 병선', era: '1750~1850s', nations: ['BU'], sizes: ['medium'] },
  // ── 해적 전용 선종 — 어느 나라에도 속하지 않는(country: 'PR') 해적 자체 무장선.
  // 지역별로 실제 그 해역 해적이 즐겨 쓴 선형을 따 왔다(지중해=제벡, 술루해=라농,
  // 발트해=갤리엇 등) — 정규 수군이 정의롭게 쓴 배(거북선 등)와는 겹치지 않는다.
  sloop: { label: '슬루프', era: '1650~1800s', nations: [], sizes: ['small'] },
  brigantine: { label: '브리건틴', era: '1650~1800s', nations: [], sizes: ['medium'] },
  pirate_flagship: { label: '해적 기함', era: '1650~1800s', nations: [], sizes: ['xlarge'] },
  xebec: { label: '제벡선', era: '1650~1800s', nations: [], sizes: ['medium'] },
  lanong: { label: '라농선', era: '1750~1850s', nations: [], sizes: ['medium'] },
  wokou_raider: { label: '왜구 습격선', era: '1350~1600s', nations: [], sizes: ['small'] },
  pirate_junk: { label: '해적 정크', era: '1750~1820s', nations: [], sizes: ['large'] },
  pirate_junk_flagship: { label: '해적 선단 기함', era: '1800~1810s', nations: [], sizes: ['xlarge'] },
  galliot: { label: '갤리엇', era: '1650~1800s', nations: [], sizes: ['small'] },
  pirate_frigate: { label: '해적 프리깃', era: '1690~1720s', nations: [], sizes: ['large'] },
  pirate_flagship_every: { label: '해적 기함', era: '1690~1700s', nations: [], sizes: ['xlarge'] },
  pirate_flagship_roberts: { label: '해적 기함', era: '1719~1722s', nations: [], sizes: ['xlarge'] },
  // ── 엔드 컨텐츠 전용 — 레전더리 해적(바르톨로뮤 로버츠) 격침 후 얻는 "로열 포춘호의
  // 파편"으로만 건조 가능한 "바르톨로뮤" 계열 3종. 격침한 전설의 기함 잔해를 이어받아
  // 다시 짓는다는 설정이라 선종명에 그 계보를 담았다.
  roberts_warship: { label: '로버츠의 유산(전열함)', era: '1722~ (전설의 유산)', nations: ['PR'], sizes: ['xlarge'] },
  roberts_clipper: { label: '로버츠의 유산(쾌속선)', era: '1722~ (전설의 유산)', nations: ['PR'], sizes: ['xlarge'] },
  roberts_galleon: { label: '로버츠의 유산(수송선)', era: '1722~ (전설의 유산)', nations: ['PR'], sizes: ['xlarge'] },
};

export const SHIPS = [
  // ── 소형선 (탐사/정찰용, 15세기 포르투갈/스페인 카라벨 계열) ──
  {
    id: 'caravela_lateen', name: '카라벨라 (Caravela Latina)', class: 'small', role: 'adventure', type: 'caravel',
    country: 'PT', era: '1450s', speed: 11, turnRate: 70, hp: 320, cargo: 60, cannons: 5, cannonSlotTiers: [2], skills: ['fair_wind_sailing'], crew: 20, price: 800,
    desc: '포르투갈 항해자들이 아프리카 서안 탐사에 사용한 삼각돛 경쾌선.',
  },
  { id: 'pinta', name: '핀타 (Pinta)', class: 'small', role: 'adventure', type: 'caravel',
    country: 'ES', era: '1492', speed: 12, turnRate: 68, hp: 340, cargo: 65, cannons: 5, cannonSlotTiers: [2], skills: ['nimble_helm'], crew: 22, price: 850,
    desc: '콜럼버스 함대의 쾌속 카라벨. 기동성이 뛰어남.' },
  { id: 'nina', name: '니냐 (Niña)', class: 'small', role: 'adventure', type: 'caravel',
    country: 'ES', era: '1492', speed: 12, turnRate: 72, hp: 310, cargo: 55, cannons: 5, cannonSlotTiers: [2], skills: ['nimble_helm'], crew: 20, price: 820,
    desc: '콜럼버스 함대 중 가장 민첩했던 소형 카라벨.' },
  { id: 'barinel', name: '바리넬 (Barinel)', class: 'small', role: 'trade', type: 'caravel',
    country: 'PT', era: '1420s', speed: 10, turnRate: 60, hp: 300, cargo: 85, cannons: 2, cannonSlotTiers: [1], skills: ['bulk_buyer'], crew: 18, price: 700,
    desc: '초기 포르투갈 연안 교역선. 노와 돛을 함께 사용.' },
  { id: 'caravela_redonda', name: '카라벨라 레돈다 (Caravela Redonda)', class: 'small', role: 'combat', type: 'caravel',
    country: 'PT', era: '1470s', speed: 11, turnRate: 58, hp: 380, cargo: 70, cannons: 5, cannonSlotTiers: [2], skills: ['precision_fire'], crew: 26, price: 950,
    desc: '가로돛을 추가하고 무장을 보강해 호위 임무를 겸한 개량형 카라벨.' },

  // ── 갤리 (노 젓는 배, 지중해 전통) ──
  { id: 'galea_sottile', name: '갈레아 소틸레 (Galea Sottile)', class: 'small', role: 'adventure', type: 'galley',
    country: 'IT', era: '1500s', speed: 13, turnRate: 90, hp: 260, cargo: 30, cannons: 2, cannonSlotTiers: [1], skills: ['nimble_helm'], crew: 120, price: 900,
    desc: '베네치아 해양공화국의 경쾌 갤리. 노잡이가 대부분인 승무원 구성과 발군의 선회력이 특징.' },
  { id: 'galera_real', name: '갈레라 레알 (Galera Real)', class: 'medium', role: 'combat', type: 'galley',
    country: 'ES', era: '1571', speed: 10, turnRate: 75, hp: 480, cargo: 50, cannons: 7, cannonSlotTiers: [2, 1], skills: ['rapid_reload', 'reinforced_ram'], crew: 180, price: 1600,
    desc: '레판토 해전급 스페인 기함 갤리. 이물에 집중 배치한 함포로 돌격전에 특화.' },
  { id: 'galeazza_veneziana', name: '갈레아짜 (Galeazza)', class: 'large', role: 'combat', type: 'galley',
    country: 'IT', era: '1571', speed: 8, turnRate: 42, hp: 900, cargo: 70, cannons: 20, cannonSlotTiers: [2, 2, 2, 2], skills: ['multi_cannon', 'rapid_reload', 'damage_control'], crew: 300, price: 3200,
    desc: '갤리와 범선을 절충한 베네치아의 대형 노젓는 군함. 이물 함포에 더해 현측에도 포열을 갖춰 레판토 해전에서 위력을 떨쳤다. 선회는 느리지만 화력은 일반 갤리를 압도.' },
  { id: 'galeazza_reale', name: '갈레아짜 레알레 (Galeazza Reale)', class: 'xlarge', role: 'combat', type: 'galley',
    country: 'ES', era: '1588', speed: 7, turnRate: 30, hp: 1300, cargo: 90, cannons: 30, cannonSlotTiers: [2, 2, 2, 2, 2, 2], skills: ['multi_cannon', 'rapid_reload', 'ironclad_defense', 'damage_control'], crew: 400, price: 10400,
    desc: '스페인 무적함대에 편성된 최대급 갈레아스 기함. 노와 돛을 겸용하는 함종 중 사상 최대 규모로, 강력한 화력을 자랑하지만 그만큼 둔중하다.' },

  // ── 중형선 (교역/균형형) ──
  { id: 'nau_santa_maria', name: '나오 산타마리아 (Nau Santa María)', class: 'medium', role: 'trade', type: 'carrack',
    country: 'ES', era: '1492', speed: 10, turnRate: 45, hp: 620, cargo: 200, cannons: 10, cannonSlotTiers: [2, 2], skills: ['skilled_carpenter', 'frugal_voyage'], crew: 40, price: 2200,
    desc: '콜럼버스의 기함. 카라벨보다 크고 화물 적재에 유리한 나오(캐럭)선.' },
  { id: 'caravel_pinnace', name: '피나스 (Pinnace)', class: 'medium', role: 'adventure', type: 'caravel',
    country: 'EN', era: '1500s', speed: 14, turnRate: 58, hp: 560, cargo: 150, cannons: 10, cannonSlotTiers: [2, 2], skills: ['fair_wind_sailing', 'swift_docking'], crew: 45, price: 2400,
    desc: '영국 해군이 애용한 다목적 쾌속 중형선.' },
  { id: 'cog', name: '코게 (Hanseatic Kogge)', class: 'medium', role: 'trade', type: 'carrack',
    country: 'HAN', era: '1400s', speed: 8, turnRate: 40, hp: 700, cargo: 220, cannons: 7, cannonSlotTiers: [2, 1], skills: ['careful_voyage', 'storm_hardened'], crew: 35, price: 2000,
    desc: '한자동맹이 북해·발트해 교역에 사용한 견고한 상선.' },
  { id: 'fluyt', name: '플라위트 (Fluyt)', class: 'medium', role: 'trade', type: 'fullrig',
    country: 'NL', era: '1590s', speed: 11, turnRate: 48, hp: 640, cargo: 290, cannons: 7, cannonSlotTiers: [2, 1], skills: ['bulk_buyer', 'material_expertise'], crew: 30, price: 2600,
    desc: '네덜란드가 개발한 대량 물자 수송 특화 상선. 동급 최대 적재량.' },
  { id: 'caravel_war', name: '카라벨라 데 아르마다 (Caravela de Armada)', class: 'medium', role: 'combat', type: 'caravel',
    country: 'PT', era: '1500s', speed: 12, turnRate: 50, hp: 660, cargo: 140, cannons: 18, cannonSlotTiers: [3, 1], skills: ['precision_fire', 'ironclad_defense'], crew: 48, price: 2500,
    acquire: 'build', buildCost: { gold: 2500, materials: 15, oakTimber: 2 },
    desc: '무장을 강화한 포르투갈 호위용 카라벨 — 조선소에서 직접 건조해야 하는 상위 전투함.' },

  // ── 스쿠너 (18세기 후반, 종범 위주 쾌속 범선) ──
  { id: 'baltimore_schooner', name: '볼티모어 스쿠너 (Baltimore Schooner)', class: 'small', role: 'adventure', type: 'schooner',
    country: 'EN', era: '1790s', speed: 15, turnRate: 66, hp: 420, cargo: 110, cannons: 5, cannonSlotTiers: [2], skills: ['headwind_master'], crew: 32, price: 2100,
    desc: '개프세일(종범) 위주로 바람을 거슬러도 잘 나아가는 신형 쾌속 연락선.' },
  { id: 'topsail_schooner', name: '톱세일 스쿠너 (Topsail Schooner)', class: 'medium', role: 'combat', type: 'schooner',
    country: 'NL', era: '1800s', speed: 13, turnRate: 54, hp: 700, cargo: 180, cannons: 10, cannonSlotTiers: [2, 2], skills: ['multi_cannon', 'assault_speed'], crew: 55, price: 3200,
    acquire: 'build', buildCost: { gold: 3200, materials: 18, oakTimber: 4 },
    desc: '앞돛대에 사각돛을 겸용해 화력과 속도를 함께 갖춘 개량형 스쿠너 — 조선소에서 직접 건조해야 하는 상위 전투함.' },

  // ── 대형선 (전투/장거리 교역) ──
  { id: 'galeao_sao_martinho', name: '갈레온 산 마르틴 (San Martín)', class: 'large', role: 'combat', type: 'galleon',
    country: 'ES', era: '1580s', speed: 9, turnRate: 32, hp: 1400, cargo: 400, cannons: 38, cannonSlotTiers: [4, 1, 1, 1], skills: ['multi_cannon', 'precision_fire', 'ironclad_defense'], crew: 92, price: 6500,
    acquire: 'build', buildCost: { gold: 6500, oakTimber: 8 },
    desc: '스페인 무적함대 기함급 갈레온. 강력한 현측 포열을 갖춤 — 조선소에서 직접 건조해야 하는 상위 전투함.' },
  { id: 'madre_de_deus', name: '마드레 데 데우스 (Madre de Deus)', class: 'large', role: 'trade', type: 'carrack',
    country: 'PT', era: '1590s', speed: 8, turnRate: 28, hp: 1550, cargo: 600, cannons: 31, cannonSlotTiers: [3, 2, 2, 2], skills: ['long_haul_logistics', 'savvy_haggler', 'skilled_carpenter'], crew: 85, price: 7000,
    acquire: 'build', buildCost: { gold: 7000, oakTimber: 9 },
    desc: '동방 교역으로 막대한 부를 실어나른 포르투갈 대형 캐럭 — 조선소에서 직접 건조해야 하는 상위 선박.' },
  { id: 'east_indiaman', name: '이스트 인디아맨 (East Indiaman)', class: 'large', role: 'trade', type: 'fullrig',
    country: 'NL', era: '1600s', speed: 10, turnRate: 34, hp: 1300, cargo: 580, cannons: 31, cannonSlotTiers: [3, 2, 2, 2], skills: ['port_friendly', 'long_haul_logistics', 'standing_supply'], crew: 80, price: 6800,
    desc: '동인도회사의 향신료 무역 전용 대형 상선.' },
  { id: 'revenge', name: '리벤지 (Revenge)', class: 'large', role: 'combat', type: 'galleon',
    country: 'EN', era: '1570s', speed: 11, turnRate: 36, hp: 1250, cargo: 350, cannons: 39, cannonSlotTiers: [3, 3, 2, 1], skills: ['rapid_reload', 'agile_maneuvers', 'assault_speed'], crew: 95, price: 7200,
    acquire: 'build', buildCost: { gold: 7200, oakTimber: 9 },
    desc: '영국 해군의 갈레온형 전열함. 기동성과 화력을 겸비 — 조선소에서 직접 건조해야 하는 상위 전투함.' },
  { id: 'galeone_veneziano', name: '갈레오네 (Galeone Veneziano)', class: 'large', role: 'adventure', type: 'galleon',
    country: 'IT', era: '1560s', speed: 9, turnRate: 34, hp: 1350, cargo: 420, cannons: 36, cannonSlotTiers: [3, 3, 1, 1], skills: ['new_route_pioneer', 'lean_crew', 'storm_sailing'], crew: 88, price: 6600,
    desc: '지중해 전역을 누비며 교역과 탐험을 겸한 다목적 베네치아 대형 갈레온.' },
  { id: 'caravela_maior', name: '카라벨라 마이오르 (Caravela Maior)', class: 'large', role: 'trade', type: 'caravel',
    country: 'PT', era: '1500s', speed: 10, turnRate: 44, hp: 900, cargo: 320, cannons: 14, cannonSlotTiers: [2, 2, 1, 1], skills: ['frugal_voyage', 'careful_voyage', 'standing_supply'], crew: 60, price: 4200,
    desc: '인도 항로의 장기 원양 항해를 위해 특별히 키운 대형 캐러벨. 캐러벨 특유의 날렵한 삼각돛 실루엣은 유지한 채 적재량만 크게 늘렸다.' },

  // ── 클리퍼 (19세기 초~중반, 극도로 날렵한 쾌속 범선) ──
  { id: 'opium_clipper', name: '오피움 클리퍼 (Opium Clipper)', class: 'small', role: 'adventure', type: 'clipper',
    country: 'EN', era: '1830s', speed: 16, turnRate: 52, hp: 380, cargo: 90, cannons: 5, cannonSlotTiers: [2], skills: ['fair_wind_sailing'], crew: 18, price: 3400,
    desc: '중국과의 밀무역에 쓰인 초쾌속 소형 클리퍼. 훗날 티 클리퍼의 원형이 된 극단적으로 날렵한 선형.' },
  { id: 'tea_clipper', name: '티 클리퍼 (Tea Clipper)', class: 'medium', role: 'trade', type: 'clipper',
    country: 'EN', era: '1850s', speed: 18, turnRate: 40, hp: 900, cargo: 260, cannons: 7, cannonSlotTiers: [2, 1], skills: ['long_haul_logistics', 'savvy_haggler'], crew: 34, price: 8200,
    desc: '중국 차(茶) 무역 경쟁에서 태어난 극쾌속 상선. 동급 최고 속도.' },
  { id: 'clipper_thermopylae', name: '클리퍼 테르모필레 (Thermopylae)', class: 'large', role: 'adventure', type: 'clipper',
    country: 'EN', era: '1868', speed: 19, turnRate: 34, hp: 1100, cargo: 300, cannons: 8, cannonSlotTiers: [1, 1, 1, 1], skills: ['fair_wind_sailing', 'nimble_helm', 'new_route_pioneer'], crew: 40, price: 9500,
    desc: '역사상 가장 빠른 범선 중 하나로 꼽히는 대형 클리퍼.' },
  { id: 'sobraon', name: '소브라온 (Sobraon)', class: 'xlarge', role: 'trade', type: 'clipper',
    country: 'EN', era: '1866', speed: 17, turnRate: 26, hp: 1500, cargo: 480, cannons: 12, cannonSlotTiers: [1, 1, 1, 1, 1, 1], skills: ['frugal_voyage', 'skilled_carpenter', 'material_expertise', 'storm_hardened'], crew: 45, price: 25000,
    desc: '역대 최대급 복합선체 클리퍼. 이민·양모 수송에 쓰인 초대형 쾌속 상선으로, 클리퍼 중에서도 압도적인 크기를 자랑한다.' },

  // ── 초대형 갤리 (화약 이전 시대, 고대 지중해 노젓는 대형 전함) ──
  // 함포가 없는 대신(화약 자체가 없던 시대) 압도적인 내구도·승무원·충각 공격력으로 맞선다.
  // 대포가 아예 없는 유일한 배인 만큼(고증상 화약 이전 시대), 그 공백을 메우려고 내구도·
  // 선회력을 전 함선 통틀어 최고치로, 속도도 클리퍼 계열(속도 특화 선종)을 제외한 모든
  // 배보다 높게 잡았다 — 포격전은 못 하지만 맷집과 기동성으로 밀어붙여 들이받는 배.
  { id: 'roman_deceres', name: '로마 데케레스 (Roman Deceres)', class: 'xlarge', role: 'combat', type: 'galley',
    country: 'IT', era: '기원전 1세기', speed: 15, turnRate: 95, hp: 3400, cargo: 40, cannons: 0, cannonSlotTiers: [], skills: ['reinforced_ram', 'boarding_mastery', 'ironclad_defense', 'assault_speed'], crew: 450, price: 12000,
    desc: '악티움 해전급 로마 최대 등급 다단 노선(데케레스). 청동 충각과 압도적인 노잡이·해병 승선 인원으로 들이받고 백병전을 벌이는 고대 해전의 정점(대포 슬롯 없음). 화력이 없는 대신 전 함선 중 최고의 내구도·선회력을 갖춰 들이받고 버티는 데 특화됐다.' },

  // ── 초대형선 (기함급 전열함) ──
  { id: 'henry_grace_a_dieu', name: '헨리 그레이스 어 듀 (Henry Grace à Dieu)', class: 'xlarge', role: 'combat', type: 'shipline',
    country: 'EN', era: '1514', speed: 7, turnRate: 20, hp: 2600, cargo: 700, cannons: 79, cannonSlotTiers: [4, 3, 3, 2, 2, 2], skills: ['multi_cannon', 'precision_fire', 'ironclad_defense', 'damage_control'], crew: 180, price: 30000,
    acquire: 'build', buildCost: { gold: 30000, oakTimber: 15, ironcladPlating: 2 },
    desc: '"그레이트 해리"라 불린 잉글랜드 최대의 초대형 캐럭 전함 — 조선소에서 직접 건조해야 하는 최상급 기함.' },
  { id: 'vasa', name: '바사 (Vasa)', class: 'xlarge', role: 'combat', type: 'shipline',
    country: 'SE', era: '1628', speed: 7, turnRate: 18, hp: 2400, cargo: 500, cannons: 63, cannonSlotTiers: [3, 3, 3, 2, 2, 2], skills: ['rapid_reload', 'multi_cannon', 'battle_morale', 'veteran_helmsman'], crew: 150, price: 28000,
    acquire: 'build', buildCost: { gold: 28000, oakTimber: 14, ironcladPlating: 2 },
    desc: '스웨덴 왕실이 건조한 화려한 장식의 초대형 전함 — 조선소에서 직접 건조해야 하는 최상급 기함.' },
  { id: 'sovereign_of_the_seas', name: '소버린 오브 더 시즈 (Sovereign of the Seas)', class: 'xlarge', role: 'combat', type: 'shipline',
    country: 'EN', era: '1637', speed: 8, turnRate: 22, hp: 2800, cargo: 600, cannons: 102, cannonSlotTiers: [4, 4, 4, 1, 1, 1], skills: ['multi_cannon', 'rapid_reload', 'precision_fire', 'ironclad_defense'], crew: 200, price: 36000,
    acquire: 'build', buildCost: { gold: 36000, oakTimber: 18, ironcladPlating: 3 },
    desc: '3층 포열을 갖춘 당대 최강의 잉글랜드 초대형 전열함 — 조선소에서 직접 건조해야 하는 최상급 기함.' },
  { id: 'santisima_trinidad', name: '산티시마 트리니다드 (Santísima Trinidad)', class: 'xlarge', role: 'combat', type: 'shipline',
    country: 'ES', era: '1769', speed: 7, turnRate: 16, hp: 3200, cargo: 550, cannons: 138, cannonSlotTiers: [4, 4, 4, 4, 2, 2], skills: ['multi_cannon', 'precision_fire', 'rapid_reload', 'damage_control'], crew: 220, price: 44000,
    acquire: 'build', buildCost: { gold: 44000, oakTimber: 22, ironcladPlating: 4 },
    desc: '스페인 해군이 자랑한 사상 최대급 4층 포열 전함 — 조선소에서 직접 건조해야 하는 최상급 기함.' },
  { id: 'soleil_royal', name: '솔레유 루아얄 (Soleil Royal)', class: 'xlarge', role: 'combat', type: 'shipline',
    country: 'FR', era: '1670', speed: 7, turnRate: 19, hp: 2900, cargo: 520, cannons: 103, cannonSlotTiers: [4, 4, 3, 3, 2, 1], skills: ['precision_fire', 'boarding_mastery', 'capture_expert', 'battle_morale'], crew: 210, price: 39000,
    acquire: 'build', buildCost: { gold: 39000, oakTimber: 20, ironcladPlating: 3 },
    desc: '태양왕 루이 14세를 상징하는 프랑스 왕실 기함 — 조선소에서 직접 건조해야 하는 최상급 기함.' },

  // ── 엔드 컨텐츠 전용: "바르톨로뮤" 계열 3종 ──
  // 세 항로를 모두 열어야 조우하는 레전더리 해적 바르톨로뮤 로버츠를 격침해야만 낮은
  // 확률(15%)로 얻는 "로열 포춘호의 파편"(data/buildMaterials.js robertsRelic)이 있어야
  // 건조할 수 있다. 전투/모험/교역 축 각각에 지금 있는 어떤 초대형선보다도 확실히 앞서는
  // 성능을 줘, "이 배를 짓기 위해 최종 보스를 잡는다"는 목표가 되도록 설계했다. 잔해에서
  // 이어받은 배라 국적은 여전히 해적(PR)이다.
  { id: 'bartholomew_reckoning', name: '바르톨로뮤의 심판호 (Bartholomew\'s Reckoning)', class: 'xlarge', role: 'combat', type: 'roberts_warship',
    country: 'PR', era: '1722~ (전설의 유산)', speed: 8, turnRate: 20, hp: 3500, cargo: 500, cannons: 149, cannonSlotTiers: [4, 4, 4, 4, 3, 2], skills: ['multi_cannon', 'precision_fire', 'rapid_reload', 'ironclad_defense'], crew: 230, price: 52000,
    acquire: 'build', buildCost: { gold: 52000, oakTimber: 25, ironcladPlating: 6, robertsRelic: 1 },
    desc: '로열 포춘호의 잔해로 다시 지은 전열함 — 지금 바다에 뜬 어떤 초대형 전함보다도 내구도·화력이 앞선다. 레전더리 해적을 잡아야만 얻는 "로열 포춘호의 파편" 없이는 건조 자체가 불가능한, 전투 축의 진짜 최종 목표.' },
  { id: 'bartholomew_horizon', name: '바르톨로뮤의 지평선호 (Bartholomew\'s Horizon)', class: 'xlarge', role: 'adventure', type: 'roberts_clipper',
    country: 'PR', era: '1722~ (전설의 유산)', speed: 20, turnRate: 40, hp: 1900, cargo: 400, cannons: 17, cannonSlotTiers: [2, 2, 2, 1], skills: ['fair_wind_sailing', 'nimble_helm', 'new_route_pioneer', 'storm_sailing'], crew: 75, price: 42000,
    acquire: 'build', buildCost: { gold: 42000, oakTimber: 20, ironcladPlating: 4, robertsRelic: 1 },
    desc: '초대형 선체는 느리다는 통념을 깬 최초의 초대형 탐험선 — 로열 포춘호의 파편으로 보강한 늑골 덕에 어떤 클리퍼보다도 빠르면서 초대형급 내구도까지 갖췄다. 모험 축의 진짜 최종 목표.' },
  { id: 'bartholomew_treasury', name: '바르톨로뮤의 보고호 (Bartholomew\'s Treasury)', class: 'xlarge', role: 'trade', type: 'roberts_galleon',
    country: 'PR', era: '1722~ (전설의 유산)', speed: 9, turnRate: 22, hp: 2800, cargo: 820, cannons: 39, cannonSlotTiers: [3, 3, 2, 1], skills: ['bulk_buyer', 'long_haul_logistics', 'skilled_carpenter', 'port_friendly'], crew: 260, price: 50000,
    acquire: 'build', buildCost: { gold: 50000, oakTimber: 24, ironcladPlating: 5, robertsRelic: 1 },
    desc: '로열 포춘호의 화물창을 본떠 지은 초대형 보고선 — 전 함선 통틀어 최대 적재량에, 웬만한 습격은 자체 화력으로 물리칠 방어력까지 갖췄다. 교역 축의 진짜 최종 목표.' },

  // ── 조선(KR) ──
  { id: 'panokseon', name: '판옥선 (板屋船)', class: 'medium', role: 'combat', type: 'panokseon',
    country: 'KR', era: '1555~1800s', speed: 9, turnRate: 55, hp: 700, cargo: 160, cannons: 18, cannonSlotTiers: [3, 1], skills: ['ironclad_defense', 'damage_control'], crew: 60, price: 2800,
    acquire: 'build', buildCost: { gold: 2800, materials: 16, oakTimber: 3 },
    desc: '평저선 특유의 안정된 선체를 포격 플랫폼으로 삼은 조선 수군의 주력 전선. 천자총통 등 대형 화포를 실을 수 있었다 — 조선소에서 직접 건조해야 하는 상위 전투함.' },
  { id: 'geobukseon', name: '거북선 (龜船)', class: 'xlarge', role: 'combat', type: 'geobukseon',
    country: 'KR', era: '1592', speed: 8, turnRate: 34, hp: 2700, cargo: 450, cannons: 92, cannonSlotTiers: [4, 4, 3, 2, 2, 1], skills: ['reinforced_ram', 'ironclad_defense', 'agile_maneuvers', 'damage_control'], crew: 190, price: 34000,
    acquire: 'build', buildCost: { gold: 34000, oakTimber: 17, ironcladPlating: 3 },
    desc: '쇠못 박힌 덮개와 용머리 충각을 갖춘 조선 수군의 전설적 철갑 전함. 임진왜란 해전에서 왜선 사이를 종횡무진하며 격파했다 — 실제 규모보다 훨씬 강력하게, 여느 초대형 전열함과 어깨를 나란히 하도록 재현했다. 돈으로 살 수 없고 조선소에서 직접 건조해야 하는 전설급 기함.' },
  { id: 'joseon_cargo', name: '조운선 (漕運船)', class: 'medium', role: 'trade', type: 'joseon_cargo',
    country: 'KR', era: '1400~1800s', speed: 9, turnRate: 46, hp: 650, cargo: 260, cannons: 7, cannonSlotTiers: [2, 1], skills: ['bulk_buyer', 'careful_voyage'], crew: 34, price: 2300,
    desc: '조선의 조세미(租稅米)를 전국 항구로 실어 나르던 평저형 세곡 운반선.' },

  // ── 중국(CN) ──
  { id: 'shachuan', name: '사선 (沙船)', class: 'small', role: 'adventure', type: 'junk',
    country: 'CN', era: '1350~1800s', speed: 10, turnRate: 62, hp: 340, cargo: 90, cannons: 5, cannonSlotTiers: [2], skills: ['nimble_helm'], crew: 18, price: 900,
    desc: '평저에 방수격벽 구조를 갖춰 얕은 연안과 원양을 가리지 않고 다닌 중국의 표준 정크선.' },
  { id: 'fuchuan', name: '복선 (福船)', class: 'large', role: 'combat', type: 'junk',
    country: 'CN', era: '1400~1800s', speed: 9, turnRate: 30, hp: 1450, cargo: 380, cannons: 28, cannonSlotTiers: [3, 2, 2, 1], skills: ['multi_cannon', 'ironclad_defense', 'damage_control'], crew: 110, price: 6800,
    acquire: 'build', buildCost: { gold: 6800, oakTimber: 8 },
    desc: '명나라 해군의 주력 대형 정크선. 높은 선루와 두꺼운 선체로 왜구·서양 해적선에 맞섰다 — 조선소에서 직접 건조해야 하는 상위 전투함.' },
  { id: 'zheng_he_treasure_ship', name: '정화보선 (鄭和寶船)', class: 'xlarge', role: 'trade', type: 'treasure_ship',
    country: 'CN', era: '1405~1433', speed: 6, turnRate: 14, hp: 2200, cargo: 750, cannons: 18, cannonSlotTiers: [2, 2, 1, 1, 1, 1], skills: ['long_haul_logistics', 'skilled_carpenter', 'standing_supply', 'port_friendly'], crew: 250, price: 40000,
    desc: '명나라 정화 함대의 기함. 당대 세계 최대 규모의 목조선으로, 조공 무역과 위세 과시를 위해 건조되었다 — 전 함선 통틀어 최대의 적재량을 자랑하지만 선회는 가장 둔하다.' },

  // ── 일본(JP) ──
  { id: 'atakebune', name: '아타케부네 (安宅船)', class: 'large', role: 'combat', type: 'atakebune',
    country: 'JP', era: '1560~1630s', speed: 8, turnRate: 28, hp: 1300, cargo: 320, cannons: 17, cannonSlotTiers: [2, 2, 2, 1], skills: ['boarding_mastery', 'battle_morale', 'agile_maneuvers'], crew: 130, price: 6200,
    desc: '다층 누각(야구라)을 얹은 일본 수군의 주력 대형 전함. 화력보다 다수의 무사를 태운 백병전에 강하다.' },
  { id: 'oda_tekkosen', name: '철갑 아타케부네 (鉄甲船)', class: 'xlarge', role: 'combat', type: 'tekkosen',
    country: 'JP', era: '1578', speed: 6, turnRate: 15, hp: 3000, cargo: 400, cannons: 49, cannonSlotTiers: [3, 3, 2, 2, 2, 1], skills: ['ironclad_defense', 'damage_control', 'reinforced_ram', 'battle_morale'], crew: 200, price: 37000,
    acquire: 'build', buildCost: { gold: 37000, oakTimber: 19, ironcladPlating: 3 },
    desc: '오다 노부나가가 모리 수군의 화공선에 맞서 건조시킨 쇠판 장갑 대형 아타케부네. 압도적인 방어력으로 적의 화공과 포격을 무력화한다 — 전 함선 중 최고의 내구도를 지녔다. 조선소에서 직접 건조해야 하는 최상급 기함.' },
  { id: 'sekibune', name: '세키부네 (関船)', class: 'medium', role: 'combat', type: 'sekibune',
    country: 'JP', era: '1467~1800s', speed: 11, turnRate: 58, hp: 560, cargo: 130, cannons: 7, cannonSlotTiers: [2, 1], skills: ['rapid_reload', 'agile_maneuvers'], crew: 45, price: 2600,
    desc: '각지 다이묘 수군의 표준 중형 전선. 노와 돛을 병용해 기동성이 뛰어나다.' },
  { id: 'bezaisen', name: '벤자이센 (弁才船)', class: 'medium', role: 'trade', type: 'bezaisen',
    country: 'JP', era: '1600~1800s', speed: 10, turnRate: 44, hp: 600, cargo: 240, cannons: 4, cannonSlotTiers: [1, 1], skills: ['savvy_haggler', 'frugal_voyage'], crew: 26, price: 2100,
    desc: '에도 시대 기타마에부네 항로를 오간 일본의 대표적 연안 상선.' },
  { id: 'kobaya', name: '고바야 (小早)', class: 'small', role: 'adventure', type: 'kobaya',
    country: 'JP', era: '1400~1800s', speed: 13, turnRate: 80, hp: 260, cargo: 45, cannons: 2, cannonSlotTiers: [1], skills: ['nimble_helm'], crew: 14, price: 750,
    desc: '일본 수군의 초쾌속 소형 정찰·전령선. 뛰어난 선회력으로 척후 임무에 쓰였다.' },

  // ── 인도(IN) — 마라타 해군·무굴 제국 ──
  { id: 'gallivat', name: '갈리바트 (Gallivat)', class: 'small', role: 'adventure', type: 'gallivat',
    country: 'IN', era: '1700~1750s', speed: 13, turnRate: 75, hp: 300, cargo: 55, cannons: 2, cannonSlotTiers: [1], skills: ['nimble_helm'], crew: 30, price: 950,
    desc: '마라타 해군이 정찰과 기습에 활용한 노젓기 겸용 소형 쾌속선.' },
  { id: 'grab', name: '구랍 (Grab)', class: 'medium', role: 'combat', type: 'grab',
    country: 'IN', era: '1700~1750s', speed: 10, turnRate: 52, hp: 640, cargo: 150, cannons: 10, cannonSlotTiers: [2, 2], skills: ['boarding_mastery', 'reinforced_ram'], crew: 150, price: 2700,
    desc: '칸호지 앙그리아의 마라타 해군이 영국·포르투갈 상선을 위협한 주력 중형 전선. 이물이 뾰족하고 낮아 접현·백병전에 유리하다.' },
  { id: 'indian_dhow', name: '다우선 (Dhow)', class: 'medium', role: 'trade', type: 'dhow',
    country: 'IN', era: '1200~1800s', speed: 10, turnRate: 48, hp: 580, cargo: 250, cannons: 4, cannonSlotTiers: [1, 1], skills: ['long_haul_logistics', 'savvy_haggler'], crew: 24, price: 1900,
    desc: '삼각돛 하나로 계절풍을 타고 인도양을 오간 전통 교역선. 아라비아부터 인도까지 널리 쓰였다.' },
  { id: 'ganj_i_sawai', name: '강지 사와이 (Ganj-i-Sawai)', class: 'large', role: 'trade', type: 'mughal_ship',
    country: 'IN', era: '1650~1700s', speed: 7, turnRate: 26, hp: 1300, cargo: 500, cannons: 14, cannonSlotTiers: [2, 2, 1, 1], skills: ['standing_supply', 'port_friendly', 'skilled_carpenter'], crew: 70, price: 6000,
    desc: '무굴 제국의 초대형 순례·무역선. 메카 순례자와 막대한 금은보화를 실어날라, 훗날 해적 헨리 에브리에게 나포되며 역사상 가장 유명한 해적질의 표적이 되었다.' },

  // ── 오스만 제국(OT) ──
  { id: 'ottoman_kadirga', name: '오스만 카디르가 (Kadirga)', class: 'medium', role: 'combat', type: 'kadirga',
    country: 'OT', era: '1500~1700s', speed: 11, turnRate: 70, hp: 520, cargo: 60, cannons: 7, cannonSlotTiers: [2, 1], skills: ['rapid_reload', 'reinforced_ram'], crew: 160, price: 2000,
    desc: '오스만 해군의 표준 갤리선. 지중해 전역에서 베네치아·스페인 함대와 맞섰다.' },
  { id: 'barbarossa_flagship', name: '바르바로사의 기함 하이레딘호', class: 'xlarge', role: 'combat', type: 'ottoman_flagship',
    country: 'OT', era: '1530~1540s', speed: 8, turnRate: 26, hp: 2500, cargo: 380, cannons: 46, cannonSlotTiers: [3, 3, 2, 2, 1, 1], skills: ['boarding_mastery', 'battle_morale', 'rapid_reload', 'reinforced_ram'], crew: 180, price: 33000,
    acquire: 'build', buildCost: { gold: 33000, oakTimber: 17, ironcladPlating: 3 },
    desc: '지중해의 공포로 군림한 오스만 대제독 하이레딘 바르바로사의 기함. 갤리 함대를 이끌고 프레베자 해전에서 신성동맹 함대를 격파했다. 조선소에서 직접 건조해야 하는 최상급 기함.' },

  // ── 오만 술탄국(OM) ──
  { id: 'omani_baghlah', name: '오만 바글라 (Baghlah)', class: 'medium', role: 'trade', type: 'dhow',
    country: 'OM', era: '1650~1750s', speed: 9, turnRate: 42, hp: 600, cargo: 260, cannons: 4, cannonSlotTiers: [1, 1], skills: ['bulk_buyer', 'frugal_voyage'], crew: 22, price: 2000,
    desc: '오만 상인들이 아프리카 동해안과 인도를 오가며 노예·상아·향료를 실어나른 대형 다우선.' },
  { id: 'omani_warship', name: '오만 전열함 알 팔라크호', class: 'large', role: 'combat', type: 'omani_warship',
    country: 'OM', era: '1650~1750s', speed: 9, turnRate: 30, hp: 1350, cargo: 300, cannons: 25, cannonSlotTiers: [3, 2, 1, 1], skills: ['ironclad_defense', 'multi_cannon', 'damage_control'], crew: 100, price: 6300,
    acquire: 'build', buildCost: { gold: 6300, oakTimber: 8 },
    desc: '잔지바르까지 세력을 뻗친 오만 술탄국 해군의 대형 전열함. 조선소에서 직접 건조해야 하는 상위 전투함.' },

  // ── 몰타 기사단(MT) ──
  { id: 'malta_galley', name: '몰타 기사단 갤리', class: 'medium', role: 'combat', type: 'galley',
    country: 'MT', era: '1530~1700s', speed: 11, turnRate: 68, hp: 560, cargo: 55, cannons: 10, cannonSlotTiers: [2, 2], skills: ['reinforced_ram', 'capture_expert'], crew: 170, price: 2900,
    desc: '성 요한 기사단이 바르바리 해적 사냥에 앞장선 지중해의 정예 갤리. 나포한 이슬람 상선에서 막대한 전리품을 챙겼다.' },

  // ── 라구사(RG, 두브로브니크) ──
  { id: 'ragusan_argosy', name: '라구사 아르고시', class: 'large', role: 'trade', type: 'argosy',
    country: 'RG', era: '1400~1600s', speed: 9, turnRate: 34, hp: 1200, cargo: 480, cannons: 14, cannonSlotTiers: [2, 2, 1, 1], skills: ['long_haul_logistics', 'port_friendly', 'savvy_haggler'], crew: 65, price: 5400,
    desc: '지중해 최대의 중립 교역 도시국가 라구사(두브로브니크)의 대형 상선. "아르고시(Argosy)"라는 영어 단어 자체가 이 배의 이름에서 비롯됐다.' },

  // ── 덴마크(DK) ──
  { id: 'danish_indiaman', name: '덴마크 이스트인디언 크론보르호', class: 'large', role: 'trade', type: 'fullrig',
    country: 'DK', era: '1620~1750s', speed: 10, turnRate: 32, hp: 1250, cargo: 520, cannons: 17, cannonSlotTiers: [2, 2, 2, 1], skills: ['standing_supply', 'long_haul_logistics', 'skilled_carpenter'], crew: 75, price: 6100,
    desc: '덴마크 동인도회사가 트랑케바르(인도) 항로에 투입한 대형 상선.' },

  // ── 스코틀랜드(SC) ──
  { id: 'great_michael', name: '그레이트 마이클호 (Great Michael)', class: 'xlarge', role: 'combat', type: 'scottish_carrack',
    country: 'SC', era: '1511', speed: 6, turnRate: 14, hp: 2900, cargo: 480, cannons: 73, cannonSlotTiers: [4, 3, 3, 2, 1, 1], skills: ['ironclad_defense', 'damage_control', 'battle_morale', 'multi_cannon'], crew: 300, price: 35000,
    acquire: 'build', buildCost: { gold: 35000, oakTimber: 18, ironcladPlating: 3 },
    desc: '1511년 진수 당시 유럽 최대의 군함이었던 스코틀랜드 왕실 전함. 건조에 스코틀랜드 전역의 목재를 거의 다 썼다는 전설이 남아 있다. 조선소에서 직접 건조해야 하는 최상급 기함.' },

  // ── 베트남(VN) ──
  { id: 'mong_dong', name: '몽동선 (Mông Đồng)', class: 'medium', role: 'combat', type: 'mong_dong',
    country: 'VN', era: '1200~1800s', speed: 12, turnRate: 64, hp: 580, cargo: 120, cannons: 7, cannonSlotTiers: [2, 1], skills: ['agile_maneuvers', 'assault_speed'], crew: 50, price: 2400,
    desc: '바익당강 전투로 유명한 베트남의 전통 병선. 얕은 강과 연안에서 뛰어난 기동력을 발휘했다.' },

  // ── 시암(SM) ──
  { id: 'siam_royal_junk', name: '시암 왕실 정크', class: 'medium', role: 'trade', type: 'junk',
    country: 'SM', era: '1350~1750s', speed: 9, turnRate: 44, hp: 620, cargo: 270, cannons: 4, cannonSlotTiers: [1, 1], skills: ['savvy_haggler', 'bulk_buyer'], crew: 28, price: 2200,
    desc: '아유타야 왕실이 중국·일본과의 조공 무역에 투입한 시암의 대형 정크선.' },

  // ── 아체 술탄국(AC) ──
  { id: 'aceh_galley', name: '아체 갤리', class: 'large', role: 'combat', type: 'galley',
    country: 'AC', era: '1520~1650s', speed: 9, turnRate: 40, hp: 1100, cargo: 200, cannons: 25, cannonSlotTiers: [3, 2, 1, 1], skills: ['multi_cannon', 'boarding_mastery', 'reinforced_ram'], crew: 200, price: 5600,
    desc: '포르투갈의 믈라카 지배에 맞선 아체 술탄국의 대형 갤리 함대. 유럽 화포 기술을 적극 받아들여 무장이 강력했다.' },

  // ── 조선(KR) 추가 ──
  { id: 'hyeopseon', name: '협선 (挾船)', class: 'small', role: 'adventure', type: 'panokseon',
    country: 'KR', era: '1555~1800s', speed: 12, turnRate: 72, hp: 280, cargo: 50, cannons: 2, cannonSlotTiers: [1], skills: ['nimble_helm'], crew: 16, price: 780,
    desc: '판옥선 함대를 뒤따르며 연락·정찰을 맡은 조선 수군의 소형 협선.' },

  // ── 중국(CN) 추가 ──
  { id: 'canton_trader', name: '광저우 대형 정크', class: 'large', role: 'trade', type: 'junk',
    country: 'CN', era: '1700~1840s', speed: 8, turnRate: 28, hp: 1400, cargo: 550, cannons: 14, cannonSlotTiers: [2, 2, 1, 1], skills: ['long_haul_logistics', 'port_friendly', 'standing_supply'], crew: 90, price: 6400,
    desc: '광저우 십삼행을 거점으로 동남아·일본까지 오간 청나라의 대형 교역용 정크선.' },

  // ── 일본(JP) 추가 ──
  { id: 'shuinsen', name: '슈인센 (朱印船)', class: 'medium', role: 'trade', type: 'shuinsen',
    country: 'JP', era: '1600~1630s', speed: 11, turnRate: 46, hp: 680, cargo: 230, cannons: 7, cannonSlotTiers: [2, 1], skills: ['long_haul_logistics', 'savvy_haggler'], crew: 40, price: 3000,
    desc: '에도 막부의 주인장(朱印狀)을 받아 동남아 각지와 교역한 일본의 대형 무역선. 서양식 선체에 일본식 삭구를 결합한 혼성 구조가 특징.' },

  // ── 브루나이(BN) ──
  { id: 'brunei_war_junk', name: '브루나이 대형 정크 전선', class: 'large', role: 'combat', type: 'junk',
    country: 'BN', era: '1500~1600s', speed: 9, turnRate: 32, hp: 1150, cargo: 280, cannons: 25, cannonSlotTiers: [3, 2, 1, 1], skills: ['boarding_mastery', 'multi_cannon', 'agile_maneuvers'], crew: 140, price: 5500,
    desc: '필리핀 군도까지 세력을 뻗친 브루나이 술탄국의 대형 정크 전선.' },

  // ── 버마(BU) ──
  { id: 'burmese_warship', name: '버마 병선', class: 'medium', role: 'combat', type: 'burmese_warship',
    country: 'BU', era: '1750~1850s', speed: 10, turnRate: 56, hp: 540, cargo: 110, cannons: 7, cannonSlotTiers: [2, 1], skills: ['agile_maneuvers', 'rapid_reload'], crew: 60, price: 2300,
    desc: '이라와디강과 안다만 해안을 오간 콘바웅 왕조의 병선. 강과 바다를 가리지 않는 얕은 흘수가 특징.' },

  // ── 해적 전용 선박 (구매 불가, purchasable: false) ──
  // 어느 나라에도 속하지 않는(country: 'PR') 해적 자체 무장선 — 조선소에서 살 수 없고
  // 오직 해적 NPC로만 등장한다. 잡몹(슬루프) → 엘리트(브리건틴) → 보스(기함) 3단 위협
  // 등급을 이루며, entities/pirate.js가 spawn 데이터의 tier에 따라 이 배들의 hp·화력에
  // 추가 배율을 얹는다(같은 배라도 등장 지역에 따라 조금씩 강해질 수 있다는 뜻).
  { id: 'pirate_sloop', name: '해적 슬루프', class: 'small', role: 'combat', type: 'sloop',
    country: 'PR', era: '1650~1800s', speed: 13, turnRate: 62, hp: 350, cargo: 60, cannons: 5, cannonSlotTiers: [2], skills: ['assault_speed'], crew: 24, price: 1100,
    desc: '세계 각지 해역에 출몰하는 흔한 해적 소형 쾌속선. 무리 지어 다니지만 개별 전투력은 약하다.', purchasable: false },
  { id: 'pirate_brigantine', name: '해적 브리건틴', class: 'medium', role: 'combat', type: 'brigantine',
    country: 'PR', era: '1650~1800s', speed: 12, turnRate: 50, hp: 620, cargo: 140, cannons: 10, cannonSlotTiers: [2, 2], skills: ['rapid_reload', 'assault_speed'], crew: 55, price: 2600,
    desc: '노련한 해적 선장이 지휘하는 중형 무장선. 상선단을 통째로 노릴 만큼 위협적이다.', purchasable: false },
  { id: 'pirate_flagship_blackbeard', name: '[보스] 흑수염의 앤 여왕의 복수호', class: 'xlarge', role: 'combat', type: 'pirate_flagship',
    country: 'PR', era: '1716~1718s', speed: 8, turnRate: 24, hp: 2600, cargo: 300, cannons: 78, cannonSlotTiers: [4, 4, 2, 2, 1, 1], skills: ['multi_cannon', 'rapid_reload', 'boarding_mastery', 'battle_morale'], crew: 190, price: 16000,
    desc: '카리브해와 북미 연안을 공포에 떨게 한 실존 해적 에드워드 티치(흑수염)의 기함. 전투 중 수염에 화승 심지를 꽂아 태우고 싸웠다는 일화로 유명하다.', purchasable: false },
  { id: 'pirate_flagship_every', name: '[보스] 헨리 에브리의 팬시호', class: 'xlarge', role: 'combat', type: 'pirate_flagship_every',
    country: 'PR', era: '1690~1700s', speed: 9, turnRate: 22, hp: 2700, cargo: 320, cannons: 65, cannonSlotTiers: [4, 3, 2, 2, 2, 1], skills: ['multi_cannon', 'precision_fire', 'boarding_mastery', 'agile_maneuvers'], crew: 200, price: 17000,
    desc: '1695년 무굴 제국의 보물선 간즈이사와이호를 나포해 역사상 최대급 해적질을 해낸 실존 해적 헨리 에브리의 쾌속 프리깃. 인도양을 주름잡은 뒤 끝내 붙잡히지 않고 종적을 감췄다.', purchasable: false },
  // 바르톨로뮤 로버츠("검은 바트") — 3년간 400척 이상을 나포해 해적 역사상 최다 전과를
  // 남긴 실존 해적. 서아프리카·카리브해·브라질을 오가며 활동해 세 대양을 종횡한 유일한
  // 해적이었다는 점에서, 세 항로를 전부 개척해야 조우하는 엔드게임 콘텐츠의 상징으로 삼았다.
  { id: 'pirate_flagship_roberts', name: '[레전더리] 바르톨로뮤 로버츠의 로열 포춘호', class: 'xlarge', role: 'combat', type: 'pirate_flagship_roberts',
    country: 'PR', era: '1719~1722s', speed: 9, turnRate: 20, hp: 3200, cargo: 340, cannons: 92, cannonSlotTiers: [4, 4, 3, 2, 2, 1], skills: ['multi_cannon', 'precision_fire', 'rapid_reload', 'ironclad_defense'], crew: 240, price: 20000,
    desc: '3년간 400척 이상을 나포해 해적 역사상 최다 전과를 남긴 실존 해적 바르톨로뮤 로버츠("검은 바트")의 기함. 서아프리카·카리브해·브라질을 오가며 세 대양을 종횡했다 — 세 항로를 모두 개척한 자만이 마주할 자격이 있다.', purchasable: false },
  { id: 'pirate_xebec', name: '해적 제벡선', class: 'medium', role: 'combat', type: 'xebec',
    country: 'PR', era: '1650~1800s', speed: 14, turnRate: 66, hp: 480, cargo: 90, cannons: 7, cannonSlotTiers: [2, 1], skills: ['assault_speed', 'reinforced_ram'], crew: 70, price: 1900,
    desc: '지중해 바르바리 해적이 애용한 삼각돛 쾌속 제벡선. 노와 돛을 겸용해 무풍에도 빠르게 접근한다.', purchasable: false },
  { id: 'pirate_lanong', name: '해적 라농선', class: 'medium', role: 'combat', type: 'lanong',
    country: 'PR', era: '1750~1850s', speed: 12, turnRate: 70, hp: 500, cargo: 80, cannons: 7, cannonSlotTiers: [2, 1], skills: ['boarding_mastery', 'assault_speed'], crew: 90, price: 1800,
    desc: '술루해와 믈라카 해협을 누빈 이라눈족 해적의 대형 노잡이 습격선. 수십 명의 전사를 태우고 빠르게 상선을 덮친다.', purchasable: false },
  { id: 'wokou_raider', name: '왜구 습격선', class: 'small', role: 'combat', type: 'wokou_raider',
    country: 'PR', era: '1350~1600s', speed: 12, turnRate: 64, hp: 320, cargo: 60, cannons: 2, cannonSlotTiers: [1], skills: ['assault_speed'], crew: 40, price: 1000,
    desc: '조선·중국·일본 연안을 가리지 않고 약탈한 왜구의 소형 쾌속 습격선. 정규 수군보다 가볍고 빠르다.', purchasable: false },
  { id: 'pirate_junk', name: '해적 대형 정크', class: 'large', role: 'combat', type: 'pirate_junk',
    country: 'PR', era: '1750~1820s', speed: 8, turnRate: 26, hp: 1300, cargo: 250, cannons: 28, cannonSlotTiers: [3, 2, 2, 1], skills: ['multi_cannon', 'boarding_mastery', 'damage_control'], crew: 160, price: 6000,
    desc: '남중국해를 장악한 해적 선단의 대형 무장 정크. 수십 척이 무리 지어 상선단을 통째로 노린다.', purchasable: false },
  { id: 'pirate_junk_flagship', name: '[보스] 정씨 해적 선단 기함', class: 'xlarge', role: 'combat', type: 'pirate_junk_flagship',
    country: 'PR', era: '1800~1810s', speed: 7, turnRate: 18, hp: 2800, cargo: 350, cannons: 73, cannonSlotTiers: [4, 3, 3, 2, 1, 1], skills: ['multi_cannon', 'boarding_mastery', 'battle_morale', 'damage_control'], crew: 220, price: 17500,
    desc: '한때 수만 명을 거느리며 청 제국 해군마저 압도했던 전설적 여해적 정이수(鄭一嫂)의 선단 기함.', purchasable: false },
  { id: 'pirate_galliot', name: '발트해 해적 갤리엇', class: 'small', role: 'combat', type: 'galliot',
    country: 'PR', era: '1650~1800s', speed: 11, turnRate: 58, hp: 380, cargo: 70, cannons: 2, cannonSlotTiers: [1], skills: ['assault_speed'], crew: 22, price: 1050,
    desc: '북해·발트해 연안을 노리는 해적 소형 갤리엇. 거친 파도에도 잘 버틴다.', purchasable: false },
  { id: 'pirate_frigate', name: '인도양 해적 프리깃', class: 'large', role: 'combat', type: 'pirate_frigate',
    country: 'PR', era: '1690~1720s', speed: 13, turnRate: 44, hp: 1350, cargo: 280, cannons: 36, cannonSlotTiers: [3, 3, 1, 1], skills: ['precision_fire', 'rapid_reload', 'boarding_mastery'], crew: 150, price: 7200,
    desc: '마다가스카르를 근거지로 삼아 무굴 순례선단을 노린 "해적의 황금시대" 프리깃. 인도양 최고의 표적을 노린다.', purchasable: false },
];

export function getShip(id) {
  return SHIPS.find((s) => s.id === id);
}

export function shipsByClass(cls) {
  return SHIPS.filter((s) => s.class === cls);
}

export function shipsByRole(role) {
  return SHIPS.filter((s) => s.role === role);
}

export const COUNTRY_COLORS = {
  PT: '#0f6e3e', ES: '#c8102e', EN: '#1e3a8a', NL: '#e8720c',
  HAN: '#6b4f3a', IT: '#7a1f3d', SE: '#0a4a9e', FR: '#274e9c',
  OT: '#a8862a', DK: '#c60c30',
  // ---- 아시아·동남아·기타 확장 항구 국가색 ----
  KR: '#3f7d5c', JP: '#bf2a37', CN: '#8b1e1e', VN: '#c0392b',
  SM: '#d4a017', BU: '#a0522d', AC: '#6b8e23', BN: '#f1c40f',
  MT: '#c8102e', RG: '#5a3e8a', OM: '#b03a2e', SC: '#1e5b8a',
  PR: '#1a1613', // 해적 전용 선박(어느 나라에도 속하지 않음) — 검은 깃발
  IN: '#d9861e', // 인도(마라타·무굴) — 선박 국가 색상. 게임 내 인도 항구는 전부 식민 세력(PT) 소속이라
                  // 도시 국가로는 등장하지 않지만, 선박은 원산지 그대로 인도로 표기한다.
};

export const COUNTRY_NAMES = {
  PT: '포르투갈', ES: '스페인', EN: '잉글랜드', NL: '네덜란드',
  HAN: '한자동맹', IT: '이탈리아', SE: '스웨덴', FR: '프랑스',
  OT: '오스만', DK: '덴마크',
  KR: '조선', JP: '일본', CN: '중국', VN: '베트남',
  SM: '샴', BU: '버마', AC: '아체', BN: '브루나이',
  MT: '몰타 기사단', RG: '라구사', OM: '오만', SC: '스코틀랜드',
  PR: '해적',
  IN: '인도',
};
