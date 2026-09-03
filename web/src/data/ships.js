// 선박 데이터 — 대항해시대~범선시대(15~19세기) 실존 선종/명명 고증
// class: small(소형) / medium(중형) / large(대형) / xlarge(초대형) — 선체 크기 등급
// role: adventure(모험용) / trade(교역용) / combat(전투용) — 대항해시대 온라인 실제 함선 도감의 용도 분류를 참고해 부여.
//       모험용은 선회/속도, 교역용은 적재량, 전투용은 화력/내구도가 동급 대비 우수하도록 능력치를 배분한다.
// type: 선종(SHIP_TYPES 참고) — 실루엣/삭구 형태를 결정한다(국가색은 더 이상 선체 색에 반영하지 않음).
// speed: 최고 전진속도(m/s 환산 기준값), turnRate: deg/s, hp: 내구도, cargo: 적재량(톤)
// cannons: 탑재 포 수, crew: 승무원, price: 조선 비용(더컷 기준), hull: 외형 프리셋

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
};

export const SHIPS = [
  // ── 소형선 (탐사/정찰용, 15세기 포르투갈/스페인 카라벨 계열) ──
  {
    id: 'caravela_lateen', name: '카라벨라 (Caravela Latina)', class: 'small', role: 'adventure', type: 'caravel',
    country: 'PT', era: '1450s', speed: 11, turnRate: 70, hp: 320, cargo: 60, cannons: 4, crew: 20, price: 800,
    desc: '포르투갈 항해자들이 아프리카 서안 탐사에 사용한 삼각돛 경쾌선.',
  },
  { id: 'pinta', name: '핀타 (Pinta)', class: 'small', role: 'adventure', type: 'caravel',
    country: 'ES', era: '1492', speed: 12, turnRate: 68, hp: 340, cargo: 65, cannons: 4, crew: 22, price: 850,
    desc: '콜럼버스 함대의 쾌속 카라벨. 기동성이 뛰어남.' },
  { id: 'nina', name: '니냐 (Niña)', class: 'small', role: 'adventure', type: 'caravel',
    country: 'ES', era: '1492', speed: 12, turnRate: 72, hp: 310, cargo: 55, cannons: 4, crew: 20, price: 820,
    desc: '콜럼버스 함대 중 가장 민첩했던 소형 카라벨.' },
  { id: 'barinel', name: '바리넬 (Barinel)', class: 'small', role: 'trade', type: 'caravel',
    country: 'PT', era: '1420s', speed: 10, turnRate: 60, hp: 300, cargo: 85, cannons: 2, crew: 18, price: 700,
    desc: '초기 포르투갈 연안 교역선. 노와 돛을 함께 사용.' },
  { id: 'caravela_redonda', name: '카라벨라 레돈다 (Caravela Redonda)', class: 'small', role: 'combat', type: 'caravel',
    country: 'PT', era: '1470s', speed: 11, turnRate: 58, hp: 380, cargo: 70, cannons: 7, crew: 26, price: 950,
    desc: '가로돛을 추가하고 무장을 보강해 호위 임무를 겸한 개량형 카라벨.' },

  // ── 갤리 (노 젓는 배, 지중해 전통) ──
  { id: 'galea_sottile', name: '갈레아 소틸레 (Galea Sottile)', class: 'small', role: 'adventure', type: 'galley',
    country: 'IT', era: '1500s', speed: 13, turnRate: 90, hp: 260, cargo: 30, cannons: 2, crew: 120, price: 900,
    desc: '베네치아 해양공화국의 경쾌 갤리. 노잡이가 대부분인 승무원 구성과 발군의 선회력이 특징.' },
  { id: 'galera_real', name: '갈레라 레알 (Galera Real)', class: 'medium', role: 'combat', type: 'galley',
    country: 'ES', era: '1571', speed: 10, turnRate: 75, hp: 480, cargo: 50, cannons: 6, crew: 180, price: 1600,
    desc: '레판토 해전급 스페인 기함 갤리. 이물에 집중 배치한 함포로 돌격전에 특화.' },
  { id: 'galeazza_veneziana', name: '갈레아짜 (Galeazza)', class: 'large', role: 'combat', type: 'galley',
    country: 'IT', era: '1571', speed: 8, turnRate: 42, hp: 900, cargo: 70, cannons: 20, crew: 300, price: 3200,
    desc: '갤리와 범선을 절충한 베네치아의 대형 노젓는 군함. 이물 함포에 더해 현측에도 포열을 갖춰 레판토 해전에서 위력을 떨쳤다. 선회는 느리지만 화력은 일반 갤리를 압도.' },
  { id: 'galeazza_reale', name: '갈레아짜 레알레 (Galeazza Reale)', class: 'xlarge', role: 'combat', type: 'galley',
    country: 'ES', era: '1588', speed: 7, turnRate: 30, hp: 1300, cargo: 90, cannons: 30, crew: 400, price: 5200,
    desc: '스페인 무적함대에 편성된 최대급 갈레아스 기함. 노와 돛을 겸용하는 함종 중 사상 최대 규모로, 강력한 화력을 자랑하지만 그만큼 둔중하다.' },

  // ── 중형선 (교역/균형형) ──
  { id: 'nau_santa_maria', name: '나오 산타마리아 (Nau Santa María)', class: 'medium', role: 'trade', type: 'carrack',
    country: 'ES', era: '1492', speed: 10, turnRate: 45, hp: 620, cargo: 200, cannons: 10, crew: 40, price: 2200,
    desc: '콜럼버스의 기함. 카라벨보다 크고 화물 적재에 유리한 나오(캐럭)선.' },
  { id: 'caravel_pinnace', name: '피나스 (Pinnace)', class: 'medium', role: 'adventure', type: 'caravel',
    country: 'EN', era: '1500s', speed: 14, turnRate: 58, hp: 560, cargo: 150, cannons: 12, crew: 45, price: 2400,
    desc: '영국 해군이 애용한 다목적 쾌속 중형선.' },
  { id: 'cog', name: '코게 (Hanseatic Kogge)', class: 'medium', role: 'trade', type: 'carrack',
    country: 'HAN', era: '1400s', speed: 8, turnRate: 40, hp: 700, cargo: 220, cannons: 6, crew: 35, price: 2000,
    desc: '한자동맹이 북해·발트해 교역에 사용한 견고한 상선.' },
  { id: 'fluyt', name: '플라위트 (Fluyt)', class: 'medium', role: 'trade', type: 'fullrig',
    country: 'NL', era: '1590s', speed: 11, turnRate: 48, hp: 640, cargo: 290, cannons: 8, crew: 30, price: 2600,
    desc: '네덜란드가 개발한 대량 물자 수송 특화 상선. 동급 최대 적재량.' },
  { id: 'caravel_war', name: '카라벨라 데 아르마다 (Caravela de Armada)', class: 'medium', role: 'combat', type: 'caravel',
    country: 'PT', era: '1500s', speed: 12, turnRate: 50, hp: 660, cargo: 140, cannons: 16, crew: 48, price: 2500,
    desc: '무장을 강화한 포르투갈 호위용 카라벨.' },

  // ── 스쿠너 (18세기 후반, 종범 위주 쾌속 범선) ──
  { id: 'baltimore_schooner', name: '볼티모어 스쿠너 (Baltimore Schooner)', class: 'small', role: 'adventure', type: 'schooner',
    country: 'EN', era: '1790s', speed: 15, turnRate: 66, hp: 420, cargo: 110, cannons: 8, crew: 32, price: 2100,
    desc: '개프세일(종범) 위주로 바람을 거슬러도 잘 나아가는 신형 쾌속 연락선.' },
  { id: 'topsail_schooner', name: '톱세일 스쿠너 (Topsail Schooner)', class: 'medium', role: 'combat', type: 'schooner',
    country: 'NL', era: '1800s', speed: 13, turnRate: 54, hp: 700, cargo: 180, cannons: 14, crew: 55, price: 3200,
    desc: '앞돛대에 사각돛을 겸용해 화력과 속도를 함께 갖춘 개량형 스쿠너.' },

  // ── 대형선 (전투/장거리 교역) ──
  { id: 'galeao_sao_martinho', name: '갈레온 산 마르틴 (San Martín)', class: 'large', role: 'combat', type: 'galleon',
    country: 'ES', era: '1580s', speed: 9, turnRate: 32, hp: 1400, cargo: 400, cannons: 38, crew: 92, price: 6500,
    desc: '스페인 무적함대 기함급 갈레온. 강력한 현측 포열을 갖춤.' },
  { id: 'madre_de_deus', name: '마드레 데 데우스 (Madre de Deus)', class: 'large', role: 'trade', type: 'carrack',
    country: 'PT', era: '1590s', speed: 8, turnRate: 28, hp: 1550, cargo: 600, cannons: 32, crew: 85, price: 7000,
    desc: '동방 교역으로 막대한 부를 실어나른 포르투갈 대형 캐럭.' },
  { id: 'east_indiaman', name: '이스트 인디아맨 (East Indiaman)', class: 'large', role: 'trade', type: 'fullrig',
    country: 'NL', era: '1600s', speed: 10, turnRate: 34, hp: 1300, cargo: 580, cannons: 30, crew: 80, price: 6800,
    desc: '동인도회사의 향신료 무역 전용 대형 상선.' },
  { id: 'revenge', name: '리벤지 (Revenge)', class: 'large', role: 'combat', type: 'galleon',
    country: 'EN', era: '1570s', speed: 11, turnRate: 36, hp: 1250, cargo: 350, cannons: 40, crew: 95, price: 7200,
    desc: '영국 해군의 갈레온형 전열함. 기동성과 화력을 겸비.' },
  { id: 'galeone_veneziano', name: '갈레오네 (Galeone Veneziano)', class: 'large', role: 'adventure', type: 'galleon',
    country: 'IT', era: '1560s', speed: 9, turnRate: 34, hp: 1350, cargo: 420, cannons: 34, crew: 88, price: 6600,
    desc: '지중해 전역을 누비며 교역과 탐험을 겸한 다목적 베네치아 대형 갈레온.' },
  { id: 'caravela_maior', name: '카라벨라 마이오르 (Caravela Maior)', class: 'large', role: 'trade', type: 'caravel',
    country: 'PT', era: '1500s', speed: 10, turnRate: 44, hp: 900, cargo: 320, cannons: 14, crew: 60, price: 4200,
    desc: '인도 항로의 장기 원양 항해를 위해 특별히 키운 대형 캐러벨. 캐러벨 특유의 날렵한 삼각돛 실루엣은 유지한 채 적재량만 크게 늘렸다.' },

  // ── 클리퍼 (19세기 초~중반, 극도로 날렵한 쾌속 범선) ──
  { id: 'opium_clipper', name: '오피움 클리퍼 (Opium Clipper)', class: 'small', role: 'adventure', type: 'clipper',
    country: 'EN', era: '1830s', speed: 16, turnRate: 52, hp: 380, cargo: 90, cannons: 4, crew: 18, price: 3400,
    desc: '중국과의 밀무역에 쓰인 초쾌속 소형 클리퍼. 훗날 티 클리퍼의 원형이 된 극단적으로 날렵한 선형.' },
  { id: 'tea_clipper', name: '티 클리퍼 (Tea Clipper)', class: 'medium', role: 'trade', type: 'clipper',
    country: 'EN', era: '1850s', speed: 18, turnRate: 40, hp: 900, cargo: 260, cannons: 6, crew: 34, price: 8200,
    desc: '중국 차(茶) 무역 경쟁에서 태어난 극쾌속 상선. 동급 최고 속도.' },
  { id: 'clipper_thermopylae', name: '클리퍼 테르모필레 (Thermopylae)', class: 'large', role: 'adventure', type: 'clipper',
    country: 'EN', era: '1868', speed: 19, turnRate: 34, hp: 1100, cargo: 300, cannons: 8, crew: 40, price: 9500,
    desc: '역사상 가장 빠른 범선 중 하나로 꼽히는 대형 클리퍼.' },
  { id: 'sobraon', name: '소브라온 (Sobraon)', class: 'xlarge', role: 'trade', type: 'clipper',
    country: 'EN', era: '1866', speed: 17, turnRate: 26, hp: 1500, cargo: 480, cannons: 6, crew: 45, price: 12500,
    desc: '역대 최대급 복합선체 클리퍼. 이민·양모 수송에 쓰인 초대형 쾌속 상선으로, 클리퍼 중에서도 압도적인 크기를 자랑한다.' },

  // ── 초대형 갤리 (화약 이전 시대, 고대 지중해 노젓는 대형 전함) ──
  // 함포가 없는 대신(화약 자체가 없던 시대) 압도적인 내구도·승무원·충각 공격력으로 맞선다.
  { id: 'roman_deceres', name: '로마 데케레스 (Roman Deceres)', class: 'xlarge', role: 'combat', type: 'galley',
    country: 'IT', era: '기원전 1세기', speed: 11, turnRate: 50, hp: 1600, cargo: 40, cannons: 0, crew: 450, price: 6000,
    desc: '악티움 해전급 로마 최대 등급 다단 노선(데케레스). 청동 충각과 압도적인 노잡이·해병 승선 인원으로 들이받고 백병전을 벌이는 고대 해전의 정점.' },

  // ── 초대형선 (기함급 전열함) ──
  { id: 'henry_grace_a_dieu', name: '헨리 그레이스 어 듀 (Henry Grace à Dieu)', class: 'xlarge', role: 'combat', type: 'shipline',
    country: 'EN', era: '1514', speed: 7, turnRate: 20, hp: 2600, cargo: 700, cannons: 80, crew: 180, price: 15000,
    desc: '"그레이트 해리"라 불린 잉글랜드 최대의 초대형 캐럭 전함.' },
  { id: 'vasa', name: '바사 (Vasa)', class: 'xlarge', role: 'combat', type: 'shipline',
    country: 'SE', era: '1628', speed: 7, turnRate: 18, hp: 2400, cargo: 500, cannons: 64, crew: 150, price: 14000,
    desc: '스웨덴 왕실이 건조한 화려한 장식의 초대형 전함.' },
  { id: 'sovereign_of_the_seas', name: '소버린 오브 더 시즈 (Sovereign of the Seas)', class: 'xlarge', role: 'combat', type: 'shipline',
    country: 'EN', era: '1637', speed: 8, turnRate: 22, hp: 2800, cargo: 600, cannons: 102, crew: 200, price: 18000,
    desc: '3층 포열을 갖춘 당대 최강의 잉글랜드 초대형 전열함.' },
  { id: 'santisima_trinidad', name: '산티시마 트리니다드 (Santísima Trinidad)', class: 'xlarge', role: 'combat', type: 'shipline',
    country: 'ES', era: '1769', speed: 7, turnRate: 16, hp: 3200, cargo: 550, cannons: 140, crew: 220, price: 22000,
    desc: '스페인 해군이 자랑한 사상 최대급 4층 포열 전함.' },
  { id: 'soleil_royal', name: '솔레유 루아얄 (Soleil Royal)', class: 'xlarge', role: 'combat', type: 'shipline',
    country: 'FR', era: '1670', speed: 7, turnRate: 19, hp: 2900, cargo: 520, cannons: 104, crew: 210, price: 19500,
    desc: '태양왕 루이 14세를 상징하는 프랑스 왕실 기함.' },
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
};

export const COUNTRY_NAMES = {
  PT: '포르투갈', ES: '스페인', EN: '잉글랜드', NL: '네덜란드',
  HAN: '한자동맹', IT: '베네치아', SE: '스웨덴', FR: '프랑스',
  OT: '오스만', DK: '덴마크',
};
