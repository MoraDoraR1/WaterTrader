// 교역품 데이터 — 대항해시대 실제 무역로를 참고한 두 항구(리스본/세비야) 간 시세차익 구조.
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
  // 아직 어느 항구도 싼값에 파는 곳이 없는 품목 — 아시아 무역항(암스테르담/런던 등)이
  // 추가되면 그쪽에서 수출품으로 등장할 예정. 지금은 카탈로그에만 존재.
  { id: 'silk', name: '비단', category: 'luxury', basePrice: 130 },
  { id: 'porcelain', name: '도자기', category: 'luxury', basePrice: 70 },
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
};

export function getGood(id) {
  return GOODS.find((g) => g.id === id);
}
