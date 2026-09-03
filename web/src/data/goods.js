// 교역품 데이터 — 대항해시대 실제 무역로를 참고한 전세계 항구 간 시세차익 구조.
// basePrice: 품목 자체의 기준가(참고용, 실제 매매가는 도시별 CITY_MARKET 항목이 우선한다).
//
// ---- 국가별 주력 교역품(정리) ----
// 같은 나라 안에서도 도시마다 취급 품목 조합이 겹치지 않도록 배정했다(69개 항구 전수 검증).
//   PT 포르투갈: 후추·향신료 항로(리스본) + 금(엘미나) + 설탕(상투메·사우바도르) + 인도양 중계(모잠비크)
//   ES 스페인: 신대륙 은(세비야·카디스·아바나·카야오) + 설탕/카카오(신대륙) + 지중해 올리브유(카디스)
//   EN 잉글랜드: 모직물·주석(런던·브리스톨) + 클리퍼 차 무역(19세기) + 카리브해 사략(포트로열)
//   NL 네덜란드: VOC 아시아 비단·도자기(암스테르담) + 희망봉 중계(케이프타운)
//   HAN 한자동맹: 발트해 호박·모피(함부르크·단치히)
//   IT 이탈리아 도시국가: 비단(제노바)·유리공예(베네치아)
//   SE 스웨덴: 발트해 주석·모피(스톡홀름)
//   FR 프랑스: 프로방스 올리브유(마르세유) + 보르도 포도주 + 신대륙 모피(뉴올리언스)
//   OT 오스만: 육로 향신료·비단(이스탄불) + 이집트 향신료·유리(알렉산드리아)
//   DK 덴마크: 발트해 호박·모피(코펜하겐)
//   KR/JP/CN 한국·일본·중국: 물물교환 전용(barter) — 인삼·도자기·비단·차 등, 두캇 매매 없음
//   기타 동남아·신대륙·군소국: 각 지역 실제 원산지 특산품(정향=잔지바르, 후추=아체, 은=카야오 등)
//     을 최저가로 배정해 "멀리 실어 나를수록 남는다"는 거리 프리미엄 구조가 자연히 성립한다.
export const GOODS = [
  { id: 'pepper', name: '후추', category: 'spice', basePrice: 45 },
  { id: 'cinnamon', name: '계피', category: 'spice', basePrice: 70 },
  { id: 'clove', name: '정향', category: 'spice', basePrice: 150 },
  { id: 'nutmeg', name: '육두구', category: 'spice', basePrice: 190 },
  { id: 'wine', name: '포도주', category: 'goods', basePrice: 18 },
  { id: 'silver', name: '은괴', category: 'goods', basePrice: 65 },
  { id: 'sugar', name: '설탕', category: 'goods', basePrice: 42 },
  { id: 'fur', name: '모피', category: 'goods', basePrice: 48 },
  // 암스테르담(VOC)·제노바·베네치아가 각각 다른 무역로(아시아 항로/이탈리아 견직업/
  // 지중해 옛 향신료길)로 들여오는 명품 — 산지가 여럿이라 값도 도시마다 갈린다.
  { id: 'silk', name: '비단', category: 'luxury', basePrice: 160 },
  { id: 'porcelain', name: '도자기', category: 'luxury', basePrice: 85 },
  { id: 'wool', name: '모직물', category: 'goods', basePrice: 25 },
  { id: 'tin', name: '주석', category: 'goods', basePrice: 40 },
  { id: 'amber', name: '호박', category: 'luxury', basePrice: 95 },
  { id: 'glass', name: '유리공예품', category: 'luxury', basePrice: 90 },
  { id: 'olive_oil', name: '올리브유', category: 'goods', basePrice: 20 },
  // 전세계 항로 확장으로 추가된 신대륙/아시아/아프리카 특산품.
  { id: 'gold', name: '금', category: 'luxury', basePrice: 170 },
  { id: 'cacao', name: '카카오', category: 'goods', basePrice: 40 },
  { id: 'tea', name: '차', category: 'luxury', basePrice: 95 },
  // 한국 특산품 — 물물교환 항구(한국·일본·중국)의 가치 환산 기준(basePrice)에도 그대로 쓰인다.
  { id: 'ginseng', name: '인삼', category: 'luxury', basePrice: 80 },
];

// 도시별 매입가(buy = 상인에게 살 때 지불)/매도가(sell = 상인에게 팔 때 받음).
// 포르투갈 리스본은 향신료 항로(희망봉 경유)의 관문이라 향신료+포도주가 싸고,
// 스페인 세비야는 신대륙 은/설탕/모피 무역(통상원)의 관문이라 그쪽이 싸다 —
// 두 항구를 오가며 서로의 수출품을 상대편에 파는 것이 기본 무역 루프가 되도록 짰다.
export const CITY_MARKET = {
  lisboa: {
    pepper: { buy: 29, sell: 22 },
    cinnamon: { buy: 46, sell: 34 },
    clove: { buy: 98, sell: 73 },
    nutmeg: { buy: 124, sell: 93 },
    wine: { buy: 12, sell: 9 },
    silver: { buy: 85, sell: 74 },
    sugar: { buy: 55, sell: 48 },
    fur: { buy: 62, sell: 55 },
  },
  sevilla: {
    silver: { buy: 43, sell: 32 },
    sugar: { buy: 28, sell: 21 },
    fur: { buy: 31, sell: 24 },
    pepper: { buy: 59, sell: 52 },
    cinnamon: { buy: 91, sell: 80 },
    clove: { buy: 195, sell: 172 },
    nutmeg: { buy: 247, sell: 218 },
    wine: { buy: 23, sell: 20 },
  },
  // 런던(EN): 모직물·주석이 자국 산물이라 싸다. 아시아산 명품·포도주·설탕은 수입 의존.
  london: {
    wool: { buy: 16, sell: 12 },
    tin: { buy: 26, sell: 19 },
    silk: { buy: 208, sell: 183 },
    porcelain: { buy: 110, sell: 97 },
    wine: { buy: 23, sell: 20 },
    sugar: { buy: 55, sell: 48 },
  },
  // 암스테르담(NL): VOC 아시아 항로 덕에 비단·도자기가 유럽에서 가장 싸다.
  // 대신 원자재(모직물·모피·호박)는 직접 생산이 없어 비싸게 사들인다.
  amsterdam: {
    silk: { buy: 105, sell: 79 },
    porcelain: { buy: 56, sell: 42 },
    wool: { buy: 33, sell: 29 },
    fur: { buy: 62, sell: 55 },
    amber: { buy: 124, sell: 110 },
  },
  // 함부르크(HAN): 한자동맹 발트해 교역로 산물인 호박·모피가 싸다. 남유럽 명품·포도주·설탕은 수입.
  hamburg: {
    amber: { buy: 61, sell: 46 },
    fur: { buy: 31, sell: 24 },
    wine: { buy: 23, sell: 20 },
    silk: { buy: 208, sell: 183 },
    porcelain: { buy: 110, sell: 97 },
    sugar: { buy: 55, sell: 48 },
  },
  // 마르세유(FR): 프로방스 올리브유가 특산품. 지중해 관문답게 향신료·명품 수요가 높다.
  marseille: {
    olive_oil: { buy: 13, sell: 10 },
    pepper: { buy: 59, sell: 52 },
    silk: { buy: 208, sell: 183 },
    porcelain: { buy: 110, sell: 97 },
  },
  // 제노바(IT): 이탈리아 견직업 전통으로 비단이 싸다(암스테르담과는 다른 산지 — 시세도 다르게 움직인다).
  // 향신료·포도주·주석은 자체 생산이 없어 비싼 편.
  genova: {
    silk: { buy: 105, sell: 79 },
    pepper: { buy: 59, sell: 52 },
    cinnamon: { buy: 91, sell: 80 },
    wine: { buy: 23, sell: 20 },
  },
  // 베네치아(IT): 무라노 유리공예품이 세계 최고 명물. 옛 향신료길의 종착지라 도자기도 취급.
  // 북방 원자재(모직물·주석·모피)는 직접 조달할 수 없어 비싸게 사들인다.
  venezia: {
    glass: { buy: 59, sell: 45 },
    porcelain: { buy: 56, sell: 42 },
    wool: { buy: 33, sell: 29 },
    tin: { buy: 52, sell: 46 },
    fur: { buy: 62, sell: 55 },
  },
  // ---- 전세계 항로 확장 — 각지 원산지는 값이 가장 싸다("멀리 가서 싸게 사 온다"가
  // 큰 지도에서 갖는 의미). 유럽 항구까지 실어 오면 그만큼 비싸게 팔 수 있다.
  azores: {
    wine: { buy: 14, sell: 11 },
    sugar: { buy: 36, sell: 29 },
  },
  canarias: {
    sugar: { buy: 25, sell: 20 },
    wine: { buy: 15, sell: 12 },
  },
  alger: {
    silver: { buy: 35, sell: 27 },
    wine: { buy: 14, sell: 11 },
    olive_oil: { buy: 11, sell: 8 },
  },
  istanbul: {
    pepper: { buy: 24, sell: 18 },
    cinnamon: { buy: 37, sell: 28 },
    clove: { buy: 80, sell: 60 },
    nutmeg: { buy: 100, sell: 76 },
    silk: { buy: 84, sell: 63 },
  },
  elmina: {
    gold: { buy: 62, sell: 46 },
    pepper: { buy: 20, sell: 15 },
  },
  havana: {
    silver: { buy: 26, sell: 19 },
    sugar: { buy: 21, sell: 15 },
    cacao: { buy: 15, sell: 11 },
  },
  salvador: {
    sugar: { buy: 18, sell: 14 },
    cacao: { buy: 14, sell: 10 },
    wine: { buy: 27, sell: 24 },
  },
  new_amsterdam: {
    fur: { buy: 19, sell: 14 },
    wool: { buy: 30, sell: 26 },
  },
  goa: {
    pepper: { buy: 17, sell: 13 },
    cinnamon: { buy: 30, sell: 23 },
    silk: { buy: 92, sell: 69 },
  },
  malacca: {
    clove: { buy: 55, sell: 42 },
    nutmeg: { buy: 69, sell: 52 },
    porcelain: { buy: 63, sell: 47 },
  },
  nagasaki: {
    silver: { buy: 30, sell: 22 },
    tea: { buy: 35, sell: 27 },
    porcelain: { buy: 49, sell: 36 },
  },
  // ---- 항구 대량 확충 — 각 품목의 진짜 원산지를 최저가로 잡아, 어디서 사서 얼마나 멀리
  // 가져가느냐가 곧 이문이 되는 구조를 강화한다(거리 프리미엄은 systems/market.js가 계산).
  napoli: {
    olive_oil: { buy: 15, sell: 12 },
    wine: { buy: 20, sell: 17 },
    silk: { buy: 111, sell: 84 },
  },
  barcelona: {
    wool: { buy: 19, sell: 16 },
    olive_oil: { buy: 15, sell: 12 },
  },
  porto: {
    wine: { buy: 10, sell: 8 },
    olive_oil: { buy: 14, sell: 11 },
  },
  bristol: {
    wool: { buy: 17, sell: 14 },
    tin: { buy: 20, sell: 16 },
  },
  copenhagen: {
    amber: { buy: 50, sell: 40 },
    fur: { buy: 26, sell: 22 },
  },
  danzig: {
    amber: { buy: 39, sell: 31 },
    fur: { buy: 24, sell: 19 },
  },
  tanger: {
    silver: { buy: 31, sell: 24 },
    olive_oil: { buy: 12, sell: 9 },
  },
  mombasa: {
    gold: { buy: 57, sell: 43 },
    porcelain: { buy: 70, sell: 53 }, // 스와힐리 해안 유적에서 다량 출토되는 인도양 항로 중국 도자기
  },
  luanda: {
    gold: { buy: 54, sell: 42 },
    fur: { buy: 29, sell: 23 },
  },
  cartagena: {
    gold: { buy: 40, sell: 31 },
    silver: { buy: 21, sell: 17 },
  },
  veracruz: {
    cacao: { buy: 10, sell: 8 },
    silver: { buy: 24, sell: 18 },
  },
  rio_de_janeiro: {
    sugar: { buy: 20, sell: 15 },
    gold: { buy: 51, sell: 40 },
  },
  quebec: {
    fur: { buy: 13, sell: 10 },
    wine: { buy: 30, sell: 27 },
  },
  boston: {
    fur: { buy: 18, sell: 14 },
    wool: { buy: 20, sell: 17 },
  },
  calicut: {
    pepper: { buy: 14, sell: 11 },
    cinnamon: { buy: 26, sell: 20 },
  },
  colombo: {
    cinnamon: { buy: 19, sell: 14 },
  },
  macau: {
    silk: { buy: 55, sell: 42 },
    porcelain: { buy: 36, sell: 28 },
    tea: { buy: 25, sell: 19 },
  },
  manila: {
    silver: { buy: 35, sell: 27 },
    porcelain: { buy: 51, sell: 39 },
    silk: { buy: 68, sell: 50 },
  },
  batavia: {
    clove: { buy: 40, sell: 30 },
    nutmeg: { buy: 52, sell: 40 },
    pepper: { buy: 19, sell: 15 },
  },
  hormuz: {
    silk: { buy: 74, sell: 55 },
    pepper: { buy: 22, sell: 17 },
  },
  // ---- 신규 항구 30곳 ----
  // 한국·일본·중국(barter:true)도 CITY_MARKET 구조는 동일하게 쓴다 — 다만 매매가 아니라
  // "이 항구가 취급하는 물품 목록·가치 참고용"으로만 쓰이고(실제 교환은 basePrice 기준),
  // 이 buy가가 원산지 판별(findOrigin)에도 그대로 들어가 다른 항구의 거리 프리미엄에 반영된다.
  busan: { ginseng: { buy: 22, sell: 17 }, porcelain: { buy: 46, sell: 35 } },
  incheon: { ginseng: { buy: 26, sell: 20 }, silk: { buy: 89, sell: 68 } },
  osaka: { silver: { buy: 27, sell: 20 }, tea: { buy: 33, sell: 25 } },
  hakata: { porcelain: { buy: 42, sell: 32 }, tea: { buy: 30, sell: 23 } },
  guangzhou: { silk: { buy: 49, sell: 37 }, tea: { buy: 20, sell: 15 }, porcelain: { buy: 32, sell: 24 } },
  quanzhou: { silk: { buy: 52, sell: 39 }, porcelain: { buy: 34, sell: 25 } },
  hoi_an: { silk: { buy: 59, sell: 44 }, porcelain: { buy: 53, sell: 40 } },
  ayutthaya: { tin: { buy: 22, sell: 17 }, sugar: { buy: 22, sell: 17 } },
  bago: { gold: { buy: 59, sell: 45 }, tin: { buy: 18, sell: 14 } },
  aceh: { pepper: { buy: 12, sell: 9 } },
  brunei: { gold: { buy: 53, sell: 41 } },
  cebu: { gold: { buy: 50, sell: 39 } },
  antwerp: { wool: { buy: 14, sell: 11 }, silk: { buy: 98, sell: 74 } },
  stockholm: { tin: { buy: 23, sell: 18 }, fur: { buy: 22, sell: 17 } },
  cadiz: { silver: { buy: 24, sell: 18 }, wine: { buy: 11, sell: 9 } },
  valletta: { olive_oil: { buy: 10, sell: 7 }, glass: { buy: 55, sell: 42 } },
  dubrovnik: { wine: { buy: 16, sell: 13 }, silk: { buy: 92, sell: 70 } },
  zanzibar: { clove: { buy: 30, sell: 23 } },
  alexandria: { pepper: { buy: 26, sell: 20 }, glass: { buy: 52, sell: 40 } },
  cape_town: { wine: { buy: 17, sell: 13 }, wool: { buy: 22, sell: 18 } },
  sao_tome: { sugar: { buy: 17, sell: 13 } },
  new_orleans: { fur: { buy: 17, sell: 13 }, sugar: { buy: 22, sell: 17 } },
  charleston: { sugar: { buy: 24, sell: 18 }, fur: { buy: 19, sell: 14 } },
  callao: { silver: { buy: 19, sell: 14 } },
  buenos_aires: { silver: { buy: 22, sell: 17 }, fur: { buy: 20, sell: 16 } },
  port_royal: { silver: { buy: 25, sell: 19 }, sugar: { buy: 20, sell: 15 } },
  bordeaux: { wine: { buy: 9, sell: 7 } },
  leith: { wool: { buy: 15, sell: 12 }, fur: { buy: 23, sell: 18 } },
  mozambique_island: { gold: { buy: 56, sell: 43 } },
  muscat: { pepper: { buy: 24, sell: 19 }, silk: { buy: 71, sell: 54 } },
};

export function getGood(id) {
  return GOODS.find((g) => g.id === id);
}
