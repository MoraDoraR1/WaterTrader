// 항구관리인(harbormaster) NPC가 내주는 의뢰 — 배달(delivery)과 토벌(bounty) 두 종류.
// cityId: 의뢰를 받을 수 있는 항구. delivery는 destCityId의 항구관리인에게 납품한다.
// bounty는 targetId(seaEntities.js의 SEA_NPC_SHIPS id)를 격침하면 자동으로 완료된다.
// reward는 대략 "그 물품을 사는 비용 대비 1.6배" 선에서 잡아, 직접 시세차익을 노리는 것보다
// 의뢰를 받는 쪽이 확실히 이득이 되도록 했다(경로를 몰라도 되는 편의의 대가).
export const QUESTS = [
  { id: 'del_lisboa_sevilla', type: 'delivery', cityId: 'lisboa', destCityId: 'sevilla', goodId: 'pepper', qty: 20, reward: 930,
    title: '후추 20t → 세비야', desc: '세비야 상관에서 후추가 급하다 합니다. 20t을 구해 옮겨주십시오.' },
  { id: 'del_sevilla_lisboa', type: 'delivery', cityId: 'sevilla', destCityId: 'lisboa', goodId: 'silver', qty: 15, reward: 860,
    title: '은괴 15t → 리스본', desc: '리스본 조폐소에 신대륙 은이 필요합니다.' },
  { id: 'del_london_amsterdam', type: 'delivery', cityId: 'london', destCityId: 'amsterdam', goodId: 'wool', qty: 25, reward: 640,
    title: '모직물 25t → 암스테르담', desc: '암스테르담 직물 공방에 잉글랜드산 모직물을 대야 합니다.' },
  { id: 'del_amsterdam_london', type: 'delivery', cityId: 'amsterdam', destCityId: 'london', goodId: 'porcelain', qty: 10, reward: 740,
    title: '도자기 10t → 런던', desc: '런던 귀족 저택에 들일 도자기가 필요하답니다.' },
  { id: 'del_hamburg_venezia', type: 'delivery', cityId: 'hamburg', destCityId: 'venezia', goodId: 'amber', qty: 12, reward: 1060,
    title: '호박 12t → 베네치아', desc: '베네치아 세공사들이 발트해산 호박을 찾습니다.' },
  { id: 'del_marseille_genova', type: 'delivery', cityId: 'marseille', destCityId: 'genova', goodId: 'olive_oil', qty: 30, reward: 670,
    title: '올리브유 30t → 제노바', desc: '제노바 시장에 프로방스산 올리브유를 대주십시오.' },
  { id: 'del_genova_marseille', type: 'delivery', cityId: 'genova', destCityId: 'marseille', goodId: 'silk', qty: 8, reward: 1090,
    title: '비단 8t → 마르세유', desc: '마르세유 의상실에서 제노바 비단을 찾습니다.' },
  { id: 'del_venezia_hamburg', type: 'delivery', cityId: 'venezia', destCityId: 'hamburg', goodId: 'glass', qty: 10, reward: 990,
    title: '유리공예품 10t → 함부르크', desc: '함부르크 상인이 무라노 유리를 수집하고 있습니다.' },

  { id: 'bounty_pirate_1', type: 'bounty', cityId: 'lisboa', targetId: 'pirate_1', reward: 450,
    title: '해적선 검은상어호 토벌', desc: '리스본 인근 해역에 출몰하는 해적선을 처치해주십시오.' },
  { id: 'bounty_pirate_2', type: 'bounty', cityId: 'amsterdam', targetId: 'pirate_2', reward: 380,
    title: '해적선 붉은깃발호 토벌', desc: '북해를 어지럽히는 해적선입니다. 처치하면 사례하겠습니다.' },
  { id: 'bounty_pirate_channel', type: 'bounty', cityId: 'london', targetId: 'pirate_channel', reward: 500,
    title: '해적선 북해의 늑대호 토벌', desc: '영불해협을 노리는 해적선이 있습니다. 상선들이 떨고 있어요.' },
  { id: 'bounty_pirate_med', type: 'bounty', cityId: 'genova', targetId: 'pirate_med', reward: 340,
    title: '바르바리 해적선 토벌', desc: '지중해 항로에 출몰하는 해적선을 처치해주십시오.' },
];

export function getQuest(id) {
  return QUESTS.find((q) => q.id === id);
}
