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
  // ── 해적 전용 선종 — 어느 나라에도 속하지 않는(country: 'PR') 해적 자체 무장선.
  sloop: { label: '슬루프', era: '1650~1800s', nations: [], sizes: ['small'] },
  brigantine: { label: '브리건틴', era: '1650~1800s', nations: [], sizes: ['medium'] },
  pirate_flagship: { label: '해적 기함', era: '1650~1800s', nations: [], sizes: ['xlarge'] },
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
    country: 'ES', era: '1588', speed: 7, turnRate: 30, hp: 1300, cargo: 90, cannons: 30, cannonSlotTiers: [2, 2, 2, 2, 2, 2], skills: ['multi_cannon', 'rapid_reload', 'ironclad_defense', 'damage_control'], crew: 400, price: 5200,
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
    desc: '무장을 강화한 포르투갈 호위용 카라벨.' },

  // ── 스쿠너 (18세기 후반, 종범 위주 쾌속 범선) ──
  { id: 'baltimore_schooner', name: '볼티모어 스쿠너 (Baltimore Schooner)', class: 'small', role: 'adventure', type: 'schooner',
    country: 'EN', era: '1790s', speed: 15, turnRate: 66, hp: 420, cargo: 110, cannons: 5, cannonSlotTiers: [2], skills: ['headwind_master'], crew: 32, price: 2100,
    desc: '개프세일(종범) 위주로 바람을 거슬러도 잘 나아가는 신형 쾌속 연락선.' },
  { id: 'topsail_schooner', name: '톱세일 스쿠너 (Topsail Schooner)', class: 'medium', role: 'combat', type: 'schooner',
    country: 'NL', era: '1800s', speed: 13, turnRate: 54, hp: 700, cargo: 180, cannons: 10, cannonSlotTiers: [2, 2], skills: ['multi_cannon', 'assault_speed'], crew: 55, price: 3200,
    desc: '앞돛대에 사각돛을 겸용해 화력과 속도를 함께 갖춘 개량형 스쿠너.' },

  // ── 대형선 (전투/장거리 교역) ──
  { id: 'galeao_sao_martinho', name: '갈레온 산 마르틴 (San Martín)', class: 'large', role: 'combat', type: 'galleon',
    country: 'ES', era: '1580s', speed: 9, turnRate: 32, hp: 1400, cargo: 400, cannons: 38, cannonSlotTiers: [4, 1, 1, 1], skills: ['multi_cannon', 'precision_fire', 'ironclad_defense'], crew: 92, price: 6500,
    desc: '스페인 무적함대 기함급 갈레온. 강력한 현측 포열을 갖춤.' },
  { id: 'madre_de_deus', name: '마드레 데 데우스 (Madre de Deus)', class: 'large', role: 'trade', type: 'carrack',
    country: 'PT', era: '1590s', speed: 8, turnRate: 28, hp: 1550, cargo: 600, cannons: 31, cannonSlotTiers: [3, 2, 2, 2], skills: ['long_haul_logistics', 'savvy_haggler', 'skilled_carpenter'], crew: 85, price: 7000,
    desc: '동방 교역으로 막대한 부를 실어나른 포르투갈 대형 캐럭.' },
  { id: 'east_indiaman', name: '이스트 인디아맨 (East Indiaman)', class: 'large', role: 'trade', type: 'fullrig',
    country: 'NL', era: '1600s', speed: 10, turnRate: 34, hp: 1300, cargo: 580, cannons: 31, cannonSlotTiers: [3, 2, 2, 2], skills: ['port_friendly', 'long_haul_logistics', 'standing_supply'], crew: 80, price: 6800,
    desc: '동인도회사의 향신료 무역 전용 대형 상선.' },
  { id: 'revenge', name: '리벤지 (Revenge)', class: 'large', role: 'combat', type: 'galleon',
    country: 'EN', era: '1570s', speed: 11, turnRate: 36, hp: 1250, cargo: 350, cannons: 39, cannonSlotTiers: [3, 3, 2, 1], skills: ['rapid_reload', 'agile_maneuvers', 'assault_speed'], crew: 95, price: 7200,
    desc: '영국 해군의 갈레온형 전열함. 기동성과 화력을 겸비.' },
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
    country: 'EN', era: '1866', speed: 17, turnRate: 26, hp: 1500, cargo: 480, cannons: 12, cannonSlotTiers: [1, 1, 1, 1, 1, 1], skills: ['frugal_voyage', 'skilled_carpenter', 'material_expertise', 'storm_hardened'], crew: 45, price: 12500,
    desc: '역대 최대급 복합선체 클리퍼. 이민·양모 수송에 쓰인 초대형 쾌속 상선으로, 클리퍼 중에서도 압도적인 크기를 자랑한다.' },

  // ── 초대형 갤리 (화약 이전 시대, 고대 지중해 노젓는 대형 전함) ──
  // 함포가 없는 대신(화약 자체가 없던 시대) 압도적인 내구도·승무원·충각 공격력으로 맞선다.
  // 대포가 아예 없는 유일한 배인 만큼(고증상 화약 이전 시대), 그 공백을 메우려고 내구도·
  // 선회력을 전 함선 통틀어 최고치로, 속도도 클리퍼 계열(속도 특화 선종)을 제외한 모든
  // 배보다 높게 잡았다 — 포격전은 못 하지만 맷집과 기동성으로 밀어붙여 들이받는 배.
  { id: 'roman_deceres', name: '로마 데케레스 (Roman Deceres)', class: 'xlarge', role: 'combat', type: 'galley',
    country: 'IT', era: '기원전 1세기', speed: 15, turnRate: 95, hp: 3400, cargo: 40, cannons: 0, cannonSlotTiers: [], skills: ['reinforced_ram', 'boarding_mastery', 'ironclad_defense', 'assault_speed'], crew: 450, price: 6000,
    desc: '악티움 해전급 로마 최대 등급 다단 노선(데케레스). 청동 충각과 압도적인 노잡이·해병 승선 인원으로 들이받고 백병전을 벌이는 고대 해전의 정점(대포 슬롯 없음). 화력이 없는 대신 전 함선 중 최고의 내구도·선회력을 갖춰 들이받고 버티는 데 특화됐다.' },

  // ── 초대형선 (기함급 전열함) ──
  { id: 'henry_grace_a_dieu', name: '헨리 그레이스 어 듀 (Henry Grace à Dieu)', class: 'xlarge', role: 'combat', type: 'shipline',
    country: 'EN', era: '1514', speed: 7, turnRate: 20, hp: 2600, cargo: 700, cannons: 79, cannonSlotTiers: [4, 3, 3, 2, 2, 2], skills: ['multi_cannon', 'precision_fire', 'ironclad_defense', 'damage_control'], crew: 180, price: 15000,
    desc: '"그레이트 해리"라 불린 잉글랜드 최대의 초대형 캐럭 전함.' },
  { id: 'vasa', name: '바사 (Vasa)', class: 'xlarge', role: 'combat', type: 'shipline',
    country: 'SE', era: '1628', speed: 7, turnRate: 18, hp: 2400, cargo: 500, cannons: 63, cannonSlotTiers: [3, 3, 3, 2, 2, 2], skills: ['rapid_reload', 'multi_cannon', 'battle_morale', 'veteran_helmsman'], crew: 150, price: 14000,
    desc: '스웨덴 왕실이 건조한 화려한 장식의 초대형 전함.' },
  { id: 'sovereign_of_the_seas', name: '소버린 오브 더 시즈 (Sovereign of the Seas)', class: 'xlarge', role: 'combat', type: 'shipline',
    country: 'EN', era: '1637', speed: 8, turnRate: 22, hp: 2800, cargo: 600, cannons: 102, cannonSlotTiers: [4, 4, 4, 1, 1, 1], skills: ['multi_cannon', 'rapid_reload', 'precision_fire', 'ironclad_defense'], crew: 200, price: 18000,
    desc: '3층 포열을 갖춘 당대 최강의 잉글랜드 초대형 전열함.' },
  { id: 'santisima_trinidad', name: '산티시마 트리니다드 (Santísima Trinidad)', class: 'xlarge', role: 'combat', type: 'shipline',
    country: 'ES', era: '1769', speed: 7, turnRate: 16, hp: 3200, cargo: 550, cannons: 138, cannonSlotTiers: [4, 4, 4, 4, 2, 2], skills: ['multi_cannon', 'precision_fire', 'rapid_reload', 'damage_control'], crew: 220, price: 22000,
    desc: '스페인 해군이 자랑한 사상 최대급 4층 포열 전함.' },
  { id: 'soleil_royal', name: '솔레유 루아얄 (Soleil Royal)', class: 'xlarge', role: 'combat', type: 'shipline',
    country: 'FR', era: '1670', speed: 7, turnRate: 19, hp: 2900, cargo: 520, cannons: 103, cannonSlotTiers: [4, 4, 3, 3, 2, 1], skills: ['precision_fire', 'boarding_mastery', 'capture_expert', 'battle_morale'], crew: 210, price: 19500,
    desc: '태양왕 루이 14세를 상징하는 프랑스 왕실 기함.' },

  // ── 조선(KR) ──
  { id: 'panokseon', name: '판옥선 (板屋船)', class: 'medium', role: 'combat', type: 'panokseon',
    country: 'KR', era: '1555~1800s', speed: 9, turnRate: 55, hp: 700, cargo: 160, cannons: 18, cannonSlotTiers: [3, 1], skills: ['ironclad_defense', 'damage_control'], crew: 60, price: 2800,
    desc: '평저선 특유의 안정된 선체를 포격 플랫폼으로 삼은 조선 수군의 주력 전선. 천자총통 등 대형 화포를 실을 수 있었다.' },
  { id: 'geobukseon', name: '거북선 (龜船)', class: 'xlarge', role: 'combat', type: 'geobukseon',
    country: 'KR', era: '1592', speed: 8, turnRate: 34, hp: 2700, cargo: 450, cannons: 92, cannonSlotTiers: [4, 4, 3, 2, 2, 1], skills: ['reinforced_ram', 'ironclad_defense', 'agile_maneuvers', 'damage_control'], crew: 190, price: 17000,
    desc: '쇠못 박힌 덮개와 용머리 충각을 갖춘 조선 수군의 전설적 철갑 전함. 임진왜란 해전에서 왜선 사이를 종횡무진하며 격파했다 — 실제 규모보다 훨씬 강력하게, 여느 초대형 전열함과 어깨를 나란히 하도록 재현했다.' },
  { id: 'joseon_cargo', name: '조운선 (漕運船)', class: 'medium', role: 'trade', type: 'joseon_cargo',
    country: 'KR', era: '1400~1800s', speed: 9, turnRate: 46, hp: 650, cargo: 260, cannons: 7, cannonSlotTiers: [2, 1], skills: ['bulk_buyer', 'careful_voyage'], crew: 34, price: 2300,
    desc: '조선의 조세미(租稅米)를 전국 항구로 실어 나르던 평저형 세곡 운반선.' },

  // ── 중국(CN) ──
  { id: 'shachuan', name: '사선 (沙船)', class: 'small', role: 'adventure', type: 'junk',
    country: 'CN', era: '1350~1800s', speed: 10, turnRate: 62, hp: 340, cargo: 90, cannons: 5, cannonSlotTiers: [2], skills: ['nimble_helm'], crew: 18, price: 900,
    desc: '평저에 방수격벽 구조를 갖춰 얕은 연안과 원양을 가리지 않고 다닌 중국의 표준 정크선.' },
  { id: 'fuchuan', name: '복선 (福船)', class: 'large', role: 'combat', type: 'junk',
    country: 'CN', era: '1400~1800s', speed: 9, turnRate: 30, hp: 1450, cargo: 380, cannons: 28, cannonSlotTiers: [3, 2, 2, 1], skills: ['multi_cannon', 'ironclad_defense', 'damage_control'], crew: 110, price: 6800,
    desc: '명나라 해군의 주력 대형 정크선. 높은 선루와 두꺼운 선체로 왜구·서양 해적선에 맞섰다.' },
  { id: 'zheng_he_treasure_ship', name: '정화보선 (鄭和寶船)', class: 'xlarge', role: 'trade', type: 'treasure_ship',
    country: 'CN', era: '1405~1433', speed: 6, turnRate: 14, hp: 2200, cargo: 750, cannons: 18, cannonSlotTiers: [2, 2, 1, 1, 1, 1], skills: ['long_haul_logistics', 'skilled_carpenter', 'standing_supply', 'port_friendly'], crew: 250, price: 20000,
    desc: '명나라 정화 함대의 기함. 당대 세계 최대 규모의 목조선으로, 조공 무역과 위세 과시를 위해 건조되었다 — 전 함선 통틀어 최대의 적재량을 자랑하지만 선회는 가장 둔하다.' },

  // ── 일본(JP) ──
  { id: 'atakebune', name: '아타케부네 (安宅船)', class: 'large', role: 'combat', type: 'atakebune',
    country: 'JP', era: '1560~1630s', speed: 8, turnRate: 28, hp: 1300, cargo: 320, cannons: 17, cannonSlotTiers: [2, 2, 2, 1], skills: ['boarding_mastery', 'battle_morale', 'agile_maneuvers'], crew: 130, price: 6200,
    desc: '다층 누각(야구라)을 얹은 일본 수군의 주력 대형 전함. 화력보다 다수의 무사를 태운 백병전에 강하다.' },
  { id: 'oda_tekkosen', name: '철갑 아타케부네 (鉄甲船)', class: 'xlarge', role: 'combat', type: 'tekkosen',
    country: 'JP', era: '1578', speed: 6, turnRate: 15, hp: 3000, cargo: 400, cannons: 49, cannonSlotTiers: [3, 3, 2, 2, 2, 1], skills: ['ironclad_defense', 'damage_control', 'reinforced_ram', 'battle_morale'], crew: 200, price: 18500,
    desc: '오다 노부나가가 모리 수군의 화공선에 맞서 건조시킨 쇠판 장갑 대형 아타케부네. 압도적인 방어력으로 적의 화공과 포격을 무력화한다 — 전 함선 중 최고의 내구도를 지녔다.' },
  { id: 'sekibune', name: '세키부네 (関船)', class: 'medium', role: 'combat', type: 'sekibune',
    country: 'JP', era: '1467~1800s', speed: 11, turnRate: 58, hp: 560, cargo: 130, cannons: 7, cannonSlotTiers: [2, 1], skills: ['rapid_reload', 'agile_maneuvers'], crew: 45, price: 2600,
    desc: '각지 다이묘 수군의 표준 중형 전선. 노와 돛을 병용해 기동성이 뛰어나다.' },
  { id: 'bezaisen', name: '벤자이센 (弁才船)', class: 'medium', role: 'trade', type: 'bezaisen',
    country: 'JP', era: '1600~1800s', speed: 10, turnRate: 44, hp: 600, cargo: 240, cannons: 4, cannonSlotTiers: [1, 1], skills: ['savvy_haggler', 'frugal_voyage'], crew: 26, price: 2100,
    desc: '에도 시대 기타마에부네 항로를 오간 일본의 대표적 연안 상선.' },
  { id: 'kobaya', name: '고바야 (小早)', class: 'small', role: 'adventure', type: 'kobaya',
    country: 'JP', era: '1400~1800s', speed: 13, turnRate: 80, hp: 260, cargo: 45, cannons: 2, cannonSlotTiers: [1], skills: ['nimble_helm'], crew: 14, price: 750,
    desc: '일본 수군의 초쾌속 소형 정찰·전령선. 뛰어난 선회력으로 척후 임무에 쓰였다.' },

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
  { id: 'pirate_flagship_kraken', name: '[보스] 해적 기함 크라켄의 이빨호', class: 'xlarge', role: 'combat', type: 'pirate_flagship',
    country: 'PR', era: '1650~1800s', speed: 8, turnRate: 24, hp: 2600, cargo: 300, cannons: 78, cannonSlotTiers: [4, 4, 2, 2, 1, 1], skills: ['multi_cannon', 'rapid_reload', 'boarding_mastery', 'battle_morale'], crew: 190, price: 16000,
    desc: '악명 높은 해적왕의 기함. 각지에 소문으로만 떠돌던 전설적인 초대형 사략선으로, 마주치면 상당한 전투력을 각오해야 한다.', purchasable: false },
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
};

export const COUNTRY_NAMES = {
  PT: '포르투갈', ES: '스페인', EN: '잉글랜드', NL: '네덜란드',
  HAN: '한자동맹', IT: '베네치아', SE: '스웨덴', FR: '프랑스',
  OT: '오스만', DK: '덴마크',
  KR: '조선', JP: '일본', CN: '중국', VN: '베트남',
  SM: '샴', BU: '버마', AC: '아체', BN: '브루나이',
  MT: '몰타 기사단', RG: '라구사', OM: '오만', SC: '스코틀랜드',
  PR: '해적',
};
