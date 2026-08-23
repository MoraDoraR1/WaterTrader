// 선박 데이터 — 대항해시대(15~17세기) 실존 선종/명명 고증
// class: small(소형) / medium(중형) / large(대형) / xlarge(초대형) — 선체 크기 등급
// role: adventure(모험용) / trade(교역용) / combat(전투용) — 대항해시대 온라인 실제 함선 도감의 용도 분류를 참고해 부여.
//       모험용은 선회/속도, 교역용은 적재량, 전투용은 화력/내구도가 동급 대비 우수하도록 능력치를 배분한다.
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

export const SHIPS = [
  // ── 소형선 (탐사/정찰용, 15세기 포르투갈/스페인 카라벨 계열) ──
  {
    id: 'caravela_lateen', name: '카라벨라 (Caravela Latina)', class: 'small', role: 'adventure',
    country: 'PT', era: '1450s', speed: 11, turnRate: 70, hp: 320, cargo: 60, cannons: 4, crew: 20, price: 800,
    desc: '포르투갈 항해자들이 아프리카 서안 탐사에 사용한 삼각돛 경쾌선.',
  },
  { id: 'pinta', name: '핀타 (Pinta)', class: 'small', role: 'adventure',
    country: 'ES', era: '1492', speed: 12, turnRate: 68, hp: 340, cargo: 65, cannons: 4, crew: 22, price: 850,
    desc: '콜럼버스 함대의 쾌속 카라벨. 기동성이 뛰어남.' },
  { id: 'nina', name: '니냐 (Niña)', class: 'small', role: 'adventure',
    country: 'ES', era: '1492', speed: 12, turnRate: 72, hp: 310, cargo: 55, cannons: 4, crew: 20, price: 820,
    desc: '콜럼버스 함대 중 가장 민첩했던 소형 카라벨.' },
  { id: 'barinel', name: '바리넬 (Barinel)', class: 'small', role: 'trade',
    country: 'PT', era: '1420s', speed: 10, turnRate: 60, hp: 300, cargo: 85, cannons: 2, crew: 18, price: 700,
    desc: '초기 포르투갈 연안 교역선. 노와 돛을 함께 사용.' },
  { id: 'caravela_redonda', name: '카라벨라 레돈다 (Caravela Redonda)', class: 'small', role: 'combat',
    country: 'PT', era: '1470s', speed: 11, turnRate: 58, hp: 380, cargo: 70, cannons: 7, crew: 26, price: 950,
    desc: '가로돛을 추가하고 무장을 보강해 호위 임무를 겸한 개량형 카라벨.' },

  // ── 중형선 (교역/균형형) ──
  { id: 'nau_santa_maria', name: '나오 산타마리아 (Nau Santa María)', class: 'medium', role: 'trade',
    country: 'ES', era: '1492', speed: 10, turnRate: 45, hp: 620, cargo: 200, cannons: 10, crew: 40, price: 2200,
    desc: '콜럼버스의 기함. 카라벨보다 크고 화물 적재에 유리한 나오(캐럭)선.' },
  { id: 'caravel_pinnace', name: '피나스 (Pinnace)', class: 'medium', role: 'adventure',
    country: 'EN', era: '1500s', speed: 14, turnRate: 58, hp: 560, cargo: 150, cannons: 12, crew: 45, price: 2400,
    desc: '영국 해군이 애용한 다목적 쾌속 중형선.' },
  { id: 'cog', name: '코게 (Hanseatic Kogge)', class: 'medium', role: 'trade',
    country: 'HAN', era: '1400s', speed: 8, turnRate: 40, hp: 700, cargo: 220, cannons: 6, crew: 35, price: 2000,
    desc: '한자동맹이 북해·발트해 교역에 사용한 견고한 상선.' },
  { id: 'fluyt', name: '플라위트 (Fluyt)', class: 'medium', role: 'trade',
    country: 'NL', era: '1590s', speed: 11, turnRate: 48, hp: 640, cargo: 290, cannons: 8, crew: 30, price: 2600,
    desc: '네덜란드가 개발한 대량 물자 수송 특화 상선. 동급 최대 적재량.' },
  { id: 'caravel_war', name: '카라벨라 데 아르마다 (Caravela de Armada)', class: 'medium', role: 'combat',
    country: 'PT', era: '1500s', speed: 12, turnRate: 50, hp: 660, cargo: 140, cannons: 16, crew: 48, price: 2500,
    desc: '무장을 강화한 포르투갈 호위용 카라벨.' },

  // ── 대형선 (전투/장거리 교역) ──
  { id: 'galeao_sao_martinho', name: '갈레온 산 마르틴 (San Martín)', class: 'large', role: 'combat',
    country: 'ES', era: '1580s', speed: 9, turnRate: 32, hp: 1400, cargo: 400, cannons: 38, crew: 92, price: 6500,
    desc: '스페인 무적함대 기함급 갈레온. 강력한 현측 포열을 갖춤.' },
  { id: 'madre_de_deus', name: '마드레 데 데우스 (Madre de Deus)', class: 'large', role: 'trade',
    country: 'PT', era: '1590s', speed: 8, turnRate: 28, hp: 1550, cargo: 600, cannons: 32, crew: 85, price: 7000,
    desc: '동방 교역으로 막대한 부를 실어나른 포르투갈 대형 캐럭.' },
  { id: 'east_indiaman', name: '이스트 인디아맨 (East Indiaman)', class: 'large', role: 'trade',
    country: 'NL', era: '1600s', speed: 10, turnRate: 34, hp: 1300, cargo: 580, cannons: 30, crew: 80, price: 6800,
    desc: '동인도회사의 향신료 무역 전용 대형 상선.' },
  { id: 'revenge', name: '리벤지 (Revenge)', class: 'large', role: 'combat',
    country: 'EN', era: '1570s', speed: 11, turnRate: 36, hp: 1250, cargo: 350, cannons: 40, crew: 95, price: 7200,
    desc: '영국 해군의 갈레온형 전열함. 기동성과 화력을 겸비.' },
  { id: 'galeone_veneziano', name: '갈레오네 (Galeone Veneziano)', class: 'large', role: 'adventure',
    country: 'IT', era: '1560s', speed: 9, turnRate: 34, hp: 1350, cargo: 420, cannons: 34, crew: 88, price: 6600,
    desc: '지중해 전역을 누비며 교역과 탐험을 겸한 다목적 베네치아 대형 갈레온.' },

  // ── 초대형선 (기함급 전열함) ──
  { id: 'henry_grace_a_dieu', name: '헨리 그레이스 어 듀 (Henry Grace à Dieu)', class: 'xlarge', role: 'combat',
    country: 'EN', era: '1514', speed: 7, turnRate: 20, hp: 2600, cargo: 700, cannons: 80, crew: 180, price: 15000,
    desc: '"그레이트 해리"라 불린 잉글랜드 최대의 초대형 캐럭 전함.' },
  { id: 'vasa', name: '바사 (Vasa)', class: 'xlarge', role: 'combat',
    country: 'SE', era: '1628', speed: 7, turnRate: 18, hp: 2400, cargo: 500, cannons: 64, crew: 150, price: 14000,
    desc: '스웨덴 왕실이 건조한 화려한 장식의 초대형 전함.' },
  { id: 'sovereign_of_the_seas', name: '소버린 오브 더 시즈 (Sovereign of the Seas)', class: 'xlarge', role: 'combat',
    country: 'EN', era: '1637', speed: 8, turnRate: 22, hp: 2800, cargo: 600, cannons: 102, crew: 200, price: 18000,
    desc: '3층 포열을 갖춘 당대 최강의 잉글랜드 초대형 전열함.' },
  { id: 'santisima_trinidad', name: '산티시마 트리니다드 (Santísima Trinidad)', class: 'xlarge', role: 'combat',
    country: 'ES', era: '1769', speed: 7, turnRate: 16, hp: 3200, cargo: 550, cannons: 140, crew: 220, price: 22000,
    desc: '스페인 해군이 자랑한 사상 최대급 4층 포열 전함.' },
  { id: 'soleil_royal', name: '솔레유 루아얄 (Soleil Royal)', class: 'xlarge', role: 'combat',
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
};

export const COUNTRY_NAMES = {
  PT: '포르투갈', ES: '스페인', EN: '잉글랜드', NL: '네덜란드',
  HAN: '한자동맹', IT: '베네치아', SE: '스웨덴', FR: '프랑스',
};
