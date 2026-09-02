// 교역품 데이터 — 대항해시대 실제 무역로를 참고한 8개 항구 간 시세차익 구조.
// basePrice: 품목 자체의 기준가(참고용, 실제 매매가는 도시별 CITY_MARKET 항목이 우선한다).
export const GOODS = [
  { id: 'pepper', name: '후추', category: 'spice', basePrice: 45 },
  { id: 'cinnamon', name: '계피', category: 'spice', basePrice: 60 },
  { id: 'clove', name: '정향', category: 'spice', basePrice: 90 },
  { id: 'nutmeg', name: '육두구', category: 'spice', basePrice: 110 },
  { id: 'wine', name: '포도주', category: 'goods', basePrice: 18 },
  { id: 'silver', name: '은괴', category: 'goods', basePrice: 55 },
  { id: 'sugar', name: '설탕', category: 'goods', basePrice: 30 },
  { id: 'fur', name: '모피', category: 'goods', basePrice: 40 },
  // 암스테르담(VOC)·제노바·베네치아가 각각 다른 무역로(아시아 항로/이탈리아 견직업/
  // 지중해 옛 향신료길)로 들여오는 명품 — 산지가 여럿이라 값도 도시마다 갈린다.
  { id: 'silk', name: '비단', category: 'luxury', basePrice: 130 },
  { id: 'porcelain', name: '도자기', category: 'luxury', basePrice: 70 },
  { id: 'wool', name: '모직물', category: 'goods', basePrice: 25 },
  { id: 'tin', name: '주석', category: 'goods', basePrice: 48 },
  { id: 'amber', name: '호박', category: 'luxury', basePrice: 85 },
  { id: 'glass', name: '유리공예품', category: 'luxury', basePrice: 95 },
  { id: 'olive_oil', name: '올리브유', category: 'goods', basePrice: 22 },
  // 전세계 항로 확장으로 추가된 신대륙/아시아/아프리카 특산품.
  { id: 'gold', name: '금', category: 'luxury', basePrice: 150 },
  { id: 'cacao', name: '카카오', category: 'goods', basePrice: 35 },
  { id: 'tea', name: '차', category: 'luxury', basePrice: 75 },
];

// 도시별 매입가(buy = 상인에게 살 때 지불)/매도가(sell = 상인에게 팔 때 받음).
// 포르투갈 리스본은 향신료 항로(희망봉 경유)의 관문이라 향신료+포도주가 싸고,
// 스페인 세비야는 신대륙 은/설탕/모피 무역(통상원)의 관문이라 그쪽이 싸다 —
// 두 항구를 오가며 서로의 수출품을 상대편에 파는 것이 기본 무역 루프가 되도록 짰다.
export const CITY_MARKET = {
  lisboa: {
    pepper: { buy: 29, sell: 22 },
    cinnamon: { buy: 39, sell: 29 },
    clove: { buy: 59, sell: 44 },
    nutmeg: { buy: 72, sell: 54 },
    wine: { buy: 12, sell: 9 },
    silver: { buy: 72, sell: 63 },
    sugar: { buy: 39, sell: 34 },
    fur: { buy: 52, sell: 46 },
  },
  sevilla: {
    silver: { buy: 36, sell: 27 },
    sugar: { buy: 20, sell: 15 },
    fur: { buy: 26, sell: 20 },
    pepper: { buy: 59, sell: 52 },
    cinnamon: { buy: 78, sell: 69 },
    clove: { buy: 117, sell: 103 },
    nutmeg: { buy: 143, sell: 126 },
    wine: { buy: 23, sell: 20 },
  },
  // 런던(EN): 모직물·주석이 자국 산물이라 싸다. 아시아산 명품·포도주·설탕은 수입 의존.
  london: {
    wool: { buy: 16, sell: 12 },
    tin: { buy: 31, sell: 23 },
    silk: { buy: 169, sell: 149 },
    porcelain: { buy: 91, sell: 80 },
    wine: { buy: 23, sell: 20 },
    sugar: { buy: 39, sell: 34 },
  },
  // 암스테르담(NL): VOC 아시아 항로 덕에 비단·도자기가 유럽에서 가장 싸다.
  // 대신 원자재(모직물·모피·호박)는 직접 생산이 없어 비싸게 사들인다.
  amsterdam: {
    silk: { buy: 85, sell: 64 },
    porcelain: { buy: 46, sell: 35 },
    wool: { buy: 33, sell: 29 },
    fur: { buy: 52, sell: 46 },
    amber: { buy: 111, sell: 98 },
  },
  // 함부르크(HAN): 한자동맹 발트해 교역로 산물인 호박·모피가 싸다. 남유럽 명품·포도주·설탕은 수입.
  hamburg: {
    amber: { buy: 55, sell: 41 },
    fur: { buy: 26, sell: 20 },
    wine: { buy: 23, sell: 20 },
    silk: { buy: 169, sell: 149 },
    porcelain: { buy: 91, sell: 80 },
    sugar: { buy: 39, sell: 34 },
  },
  // 마르세유(FR): 프로방스 올리브유가 특산품. 지중해 관문답게 향신료·명품 수요가 높다.
  marseille: {
    olive_oil: { buy: 14, sell: 11 },
    pepper: { buy: 59, sell: 52 },
    silk: { buy: 169, sell: 149 },
    porcelain: { buy: 91, sell: 80 },
  },
  // 제노바(IT): 이탈리아 견직업 전통으로 비단이 싸다(암스테르담과는 다른 산지 — 시세도 다르게 움직인다).
  // 향신료·포도주·주석은 자체 생산이 없어 비싼 편.
  genova: {
    silk: { buy: 85, sell: 64 },
    pepper: { buy: 59, sell: 52 },
    cinnamon: { buy: 78, sell: 69 },
    wine: { buy: 23, sell: 20 },
  },
  // 베네치아(IT): 무라노 유리공예품이 세계 최고 명물. 옛 향신료길의 종착지라 도자기도 취급.
  // 북방 원자재(모직물·주석·모피)는 직접 조달할 수 없어 비싸게 사들인다.
  venezia: {
    glass: { buy: 62, sell: 47 },
    porcelain: { buy: 46, sell: 35 },
    wool: { buy: 33, sell: 29 },
    tin: { buy: 62, sell: 55 },
    fur: { buy: 52, sell: 46 },
  },
  // ---- 전세계 항로 확장 — 각지 원산지는 값이 가장 싸다("멀리 가서 싸게 사 온다"가
  // 큰 지도에서 갖는 의미). 유럽 항구까지 실어 오면 그만큼 비싸게 팔 수 있다.
  azores: {
    wine: { buy: 14, sell: 11 },
    sugar: { buy: 26, sell: 21 },
  },
  canarias: {
    sugar: { buy: 18, sell: 14 },
    wine: { buy: 15, sell: 12 },
  },
  alger: {
    silver: { buy: 30, sell: 23 },
    wine: { buy: 14, sell: 11 },
    olive_oil: { buy: 12, sell: 9 },
  },
  istanbul: {
    pepper: { buy: 24, sell: 18 },
    cinnamon: { buy: 32, sell: 24 },
    clove: { buy: 48, sell: 36 },
    nutmeg: { buy: 58, sell: 44 },
    silk: { buy: 68, sell: 51 },
  },
  elmina: {
    gold: { buy: 55, sell: 41 },
    pepper: { buy: 20, sell: 15 },
  },
  havana: {
    silver: { buy: 22, sell: 16 },
    sugar: { buy: 15, sell: 11 },
    cacao: { buy: 13, sell: 10 },
  },
  salvador: {
    sugar: { buy: 13, sell: 10 },
    cacao: { buy: 12, sell: 9 },
    wine: { buy: 27, sell: 24 },
  },
  new_amsterdam: {
    fur: { buy: 16, sell: 12 },
    wool: { buy: 30, sell: 26 },
  },
  goa: {
    pepper: { buy: 17, sell: 13 },
    cinnamon: { buy: 26, sell: 20 },
    silk: { buy: 75, sell: 56 },
  },
  malacca: {
    clove: { buy: 33, sell: 25 },
    nutmeg: { buy: 40, sell: 30 },
    porcelain: { buy: 52, sell: 39 },
  },
  nagasaki: {
    silver: { buy: 25, sell: 19 },
    tea: { buy: 28, sell: 21 },
    porcelain: { buy: 40, sell: 30 },
  },
};

export function getGood(id) {
  return GOODS.find((g) => g.id === id);
}
