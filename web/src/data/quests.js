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

  // ---- 전세계 항로 확장 — 대륙을 넘나드는 장거리 의뢰. 거리·위험 부담이 큰 만큼 보상도 크다.
  { id: 'del_lisboa_elmina', type: 'delivery', cityId: 'lisboa', destCityId: 'elmina', goodId: 'wine', qty: 15, reward: 1900,
    title: '포도주 15t → 엘미나', desc: '황금해안 요새 수비대가 본국의 포도주를 그리워한답니다.' },
  { id: 'del_elmina_lisboa', type: 'delivery', cityId: 'elmina', destCityId: 'lisboa', goodId: 'gold', qty: 8, reward: 2400,
    title: '금 8t → 리스본', desc: '왕실 조폐국에 엘미나산 금을 보내야 합니다.' },
  { id: 'del_sevilla_havana', type: 'delivery', cityId: 'sevilla', destCityId: 'havana', goodId: 'wine', qty: 20, reward: 2200,
    title: '포도주 20t → 아바나', desc: '신대륙 이주민들이 본국의 포도주를 애타게 기다립니다.' },
  { id: 'del_havana_sevilla', type: 'delivery', cityId: 'havana', destCityId: 'sevilla', goodId: 'silver', qty: 25, reward: 2600,
    title: '은괴 25t → 세비야', desc: '통상원이 신대륙 은 함대의 화물을 기다리고 있습니다.' },
  { id: 'del_amsterdam_new_amsterdam', type: 'delivery', cityId: 'amsterdam', destCityId: 'new_amsterdam', goodId: 'wool', qty: 20, reward: 2100,
    title: '모직물 20t → 뉴암스테르담', desc: '서인도회사 식민지에 겨울 대비 모직물이 필요합니다.' },
  { id: 'del_new_amsterdam_amsterdam', type: 'delivery', cityId: 'new_amsterdam', destCityId: 'amsterdam', goodId: 'fur', qty: 18, reward: 2000,
    title: '모피 18t → 암스테르담', desc: '본사가 신대륙 모피의 최신 물량을 기다립니다.' },
  { id: 'del_marseille_istanbul', type: 'delivery', cityId: 'marseille', destCityId: 'istanbul', goodId: 'olive_oil', qty: 20, reward: 1400,
    title: '올리브유 20t → 이스탄불', desc: '술탄의 궁정 주방이 프로방스 올리브유를 주문했습니다.' },
  { id: 'del_venezia_malacca', type: 'delivery', cityId: 'venezia', destCityId: 'malacca', goodId: 'glass', qty: 10, reward: 3400,
    title: '유리공예품 10t → 믈라카', desc: '해협의 부유한 상인이 베네치아 유리공예품을 원합니다.' },
  { id: 'del_goa_lisboa', type: 'delivery', cityId: 'goa', destCityId: 'lisboa', goodId: 'pepper', qty: 30, reward: 2600,
    title: '후추 30t → 리스본', desc: '본국이 인도산 후추의 정기 물량을 기다립니다.' },
  { id: 'del_nagasaki_goa', type: 'delivery', cityId: 'nagasaki', destCityId: 'goa', goodId: 'silver', qty: 15, reward: 2900,
    title: '은괴 15t → 고아', desc: '총독부가 일본산 은을 유럽행 선단에 실어야 합니다.' },

  { id: 'bounty_pirate_1', type: 'bounty', cityId: 'lisboa', targetId: 'pirate_1', reward: 450,
    title: '해적선 검은상어호 토벌', desc: '리스본 인근 해역에 출몰하는 해적선을 처치해주십시오.' },
  { id: 'bounty_pirate_2', type: 'bounty', cityId: 'amsterdam', targetId: 'pirate_2', reward: 380,
    title: '해적선 붉은깃발호 토벌', desc: '북해를 어지럽히는 해적선입니다. 처치하면 사례하겠습니다.' },
  { id: 'bounty_pirate_channel', type: 'bounty', cityId: 'london', targetId: 'pirate_channel', reward: 500,
    title: '해적선 북해의 늑대호 토벌', desc: '영불해협을 노리는 해적선이 있습니다. 상선들이 떨고 있어요.' },
  { id: 'bounty_pirate_med', type: 'bounty', cityId: 'genova', targetId: 'pirate_med', reward: 340,
    title: '바르바리 해적선 토벌', desc: '지중해 항로에 출몰하는 해적선을 처치해주십시오.' },

  // ---- 항로 개척 연계 의뢰 (3부작) ----
  // "배달 → 토벌 → 항해" 3부작. 1부(delivery)는 기존 배달 의뢰 관례대로 물품 원산지 도시
  // (세비야/런던/베네치아)에서 수락해 리스본에 납품하고, 그 김에 이미 리스본에 도착해 있는
  // 2부(토벌)·3부(항해)는 리스본 게시판에서 이어 받는다. 랭크가 충분해지면(minRankIndex)
  // 1부가 뜨고, 1부를 완료해야(requires) 2부가, 2부를 완료해야 3부가 뜬다.
  // 3부(voyage)는 targetCityId에 입항하는 순간 자동 완료되며 unlocksRoute 항로를 영구히 연다
  // (systems/quests.js의 checkVoyageArrival). 인도양 3부작은 아프리카 항로가 먼저 열려
  // 있어야(routePrereq) 1부가 뜬다 — 희망봉을 돌아가는 실제 항로 순서를 반영한다.

  // -- 1) 아프리카 항로: 세비야 ↔ 리스본 포도주 보급 → 바르바리 해적 사령선 토벌 → 카나리아 제도 항해
  { id: 'chain_africa_delivery', type: 'delivery', cityId: 'sevilla', destCityId: 'lisboa', goodId: 'wine', qty: 15, reward: 750,
    minRankIndex: 1,
    title: '[항로 개척 1/3] 포도주 15t → 리스본', desc: '리스본 함대 사령부가 남방 항해에 나설 선단에 보급할 포도주를 모으고 있습니다. (화물칸이 부족하다면 가진 교역품을 먼저 처분하십시오)',
    acceptLine: '세비야 항구 관리인이 말합니다. "리스본 함대 사령부에서 전갈이 왔네. 남쪽 바다로 나갈 채비를 하는데 포도주가 급하다더군. 여기서 15t을 구해 리스본으로 가져다 주게."' },
  { id: 'chain_africa_bounty', type: 'bounty', cityId: 'lisboa', targetId: 'pirate_barbary_elite', reward: 1300,
    requires: 'chain_africa_delivery',
    title: '[항로 개척 2/3] 바르바리 해적 사령선 토벌', desc: '보급은 끝났지만, 남쪽 항로 어귀에 바르바리 해적 사령선이 버티고 있어 선단이 나설 수 없습니다. 먼저 처치해주십시오.',
    acceptLine: '"고맙네만, 아직 배를 띄울 수가 없어. 바르바리 해적 사령선이 항로 어귀를 막고 있거든. 자네가 먼저 그놈을 가라앉혀주게."' },
  { id: 'chain_africa_voyage', type: 'voyage', cityId: 'lisboa', targetCityId: 'canarias', reward: 900,
    requires: 'chain_africa_bounty', unlocksRoute: 'west_africa',
    title: '[항로 개척 3/3] 카나리아 제도까지 항해', desc: '길이 열렸습니다. 이제 직접 카나리아 제도까지 항해하여 항로가 안전한지 확인해주십시오.',
    acceptLine: '"해적을 처치했다니 이제 길은 열렸네. 자네가 직접 카나리아 제도까지 항해해서 항로를 확인해주게 — 그래야 다른 선단도 안심하고 뒤따를 걸세."',
    arriveLine: '거친 파도를 넘어 마침내 카나리아 제도, 라스팔마스 항에 닻을 내렸습니다. 뒤돌아본 수평선 너머로 유럽 해안선은 이미 보이지 않습니다 — 이제부터는 미지의 바다입니다.' },

  // -- 2) 신대륙 항로: 런던 ↔ 리스본 주석 보급 → 카리브의 유령호 토벌 → 아조레스 제도 항해
  { id: 'chain_newworld_delivery', type: 'delivery', cityId: 'london', destCityId: 'lisboa', goodId: 'tin', qty: 12, reward: 700,
    minRankIndex: 2,
    title: '[항로 개척 1/3] 주석 12t → 리스본', desc: '리스본 조선소가 대서양 횡단 선단의 선체 보강용 주석을 기다리고 있습니다. (화물칸이 부족하다면 가진 교역품을 먼저 처분하십시오)',
    acceptLine: '런던 항구 관리인이 말합니다. "리스본에서 전갈이 왔네. 대서양을 건널 선단의 선체 보강에 주석이 필요하다더군. 여기서 12t을 구해 리스본으로 가져다 주게."' },
  { id: 'chain_newworld_bounty', type: 'bounty', cityId: 'lisboa', targetId: 'pirate_caribbean', reward: 1000,
    requires: 'chain_newworld_delivery',
    title: '[항로 개척 2/3] 해적선 카리브의 유령호 토벌', desc: '카리브해에 출몰하는 해적선 카리브의 유령호가 신대륙 항로 어귀를 떠돌고 있다는 첩보입니다. 처치해주십시오.',
    acceptLine: '"보강은 끝났네만, 카리브해에 유령처럼 나타난다는 해적선이 하나 있어. 그놈부터 정리하지 않으면 아무도 그 항로로 나서지 않을 걸세."' },
  { id: 'chain_newworld_voyage', type: 'voyage', cityId: 'lisboa', targetCityId: 'azores', reward: 850,
    requires: 'chain_newworld_bounty', unlocksRoute: 'new_world',
    title: '[항로 개척 3/3] 아조레스 제도까지 항해', desc: '대서양 한복판의 아조레스 제도까지 항해하여 신대륙으로 가는 중간 기착지를 확보해주십시오.',
    acceptLine: '"이제 바다가 조용해졌겠지. 아조레스 제도까지 가서 그 섬이 우리 선단의 중간 기착지가 될 수 있는지 직접 확인해주게."',
    arriveLine: '망망대해 한가운데, 화산섬 아조레스가 마침내 수평선 위로 솟아올랐습니다. 여기서부터는 신대륙까지 곧장 이어지는 대서양입니다.' },

  // -- 3) 인도양 항로: 베네치아 ↔ 리스본 유리공예품 보급 → 계절풍의 습격자호 토벌 → 케이프타운 항해
  // (아프리카 항로가 먼저 열려 있어야 함 — 희망봉을 돌아가는 실제 순서)
  { id: 'chain_indianocean_delivery', type: 'delivery', cityId: 'venezia', destCityId: 'lisboa', goodId: 'glass', qty: 8, reward: 900,
    minRankIndex: 3, routePrereq: 'west_africa',
    title: '[항로 개척 1/3] 유리공예품 8t → 리스본', desc: '함대 사령부가 인도로 보낼 교역품 견본으로 베네치아 유리공예품을 원합니다. (화물칸이 부족하다면 가진 교역품을 먼저 처분하십시오)',
    acceptLine: '베네치아 항구 관리인이 말합니다. "리스본 함대 사령부에서 전갈이 왔네. 희망봉을 돌아 인도까지 가는 선단에 줄 선물로 유리공예품이 필요하다더군. 여기서 8t을 구해 리스본으로 가져다 주게."' },
  { id: 'chain_indianocean_bounty', type: 'bounty', cityId: 'lisboa', targetId: 'pirate_indian_ocean', reward: 1600,
    requires: 'chain_indianocean_delivery',
    title: '[항로 개척 2/3] 해적선 계절풍의 습격자호 토벌', desc: '동남아 해역에서 계절풍을 타고 습격해온다는 해적선입니다. 인도양 항로를 열기 전에 처치해주십시오.',
    acceptLine: '"준비는 끝났네만, 계절풍을 타고 나타난다는 해적선 하나가 골칫거리야. 그놈을 처치하기 전엔 어떤 선단도 그 바다로 보낼 수 없네."' },
  { id: 'chain_indianocean_voyage', type: 'voyage', cityId: 'lisboa', targetCityId: 'cape_town', reward: 1200,
    requires: 'chain_indianocean_bounty', unlocksRoute: 'indian_ocean',
    title: '[항로 개척 3/3] 케이프타운(폭풍의 곶)까지 항해', desc: '아프리카 최남단, 뱃사람들이 "폭풍의 곶"이라 부르는 곳을 돌아 케이프타운까지 항해해주십시오.',
    acceptLine: '"뱃사람들은 그곳을 폭풍의 곶이라 부르지. 그 곶을 돌아 케이프타운까지 가보게 — 거기서부터는 인도양과 극동으로 가는 길이 곧장 열릴 걸세."',
    arriveLine: '악명 높은 폭풍의 곶을 무사히 돌아 케이프타운에 닻을 내렸습니다. 남쪽 바람이 잦아들자, 동쪽 수평선 너머로 인도양과 향신료의 바다가 펼쳐집니다.' },

  // ---- 항로 개척 이후의 반복 토벌 의뢰 ----
  // 항로를 열고 나면 그 항로의 상징적 엘리트 해적(이미 리스폰 시스템으로 무한히 되살아나는
  // 개체)을 다시 잡을 때마다 소액이지만 계속 받을 수 있는 의뢰다 — repeatable: true로
  // 표시해, 그 npc가 리스폰할 때마다(entities/pirate.js checkPirateRespawns) 다시
  // 게시판에 오른다(systems/quests.js reactivateRepeatableBounties). 항로 개척 3부작
  // 자체(chain_ 접두)는 스토리 게이트라 그대로 일회성으로 남긴다.
  { id: 'patrol_west_africa', type: 'bounty', cityId: 'canarias', targetId: 'pirate_barbary_elite', reward: 700,
    routePrereq: 'west_africa', repeatable: true,
    title: '[반복] 바르바리 해적 잔당 소탕', desc: '항로는 열렸지만 바르바리 해적 사령선의 잔당이 계속 되살아나 상선을 위협합니다. 볼 때마다 처치해주십시오.',
    acceptLine: '카나리아 제도 항구 관리인이 말합니다. "그 사령선, 죽여도 죽여도 다시 나타나는 모양이더군. 볼 때마다 처리해주면 그때마다 사례하지."' },
  { id: 'patrol_new_world', type: 'bounty', cityId: 'azores', targetId: 'pirate_elite_calicojack', reward: 650,
    routePrereq: 'new_world', repeatable: true,
    title: '[반복] 캘리코 잭 잔당 소탕', desc: '카리브해에서 캘리코 잭의 윌리엄호가 계속 다시 나타나 신대륙 항로를 어지럽힙니다. 볼 때마다 처치해주십시오.',
    acceptLine: '아조레스 항구 관리인이 말합니다. "캘리코 잭, 그 배는 가라앉혀도 며칠 뒤면 또 나타난다더군. 나타날 때마다 처리해주게."' },
  { id: 'patrol_indian_ocean', type: 'bounty', cityId: 'cape_town', targetId: 'pirate_indian_ocean', reward: 800,
    routePrereq: 'indian_ocean', repeatable: true,
    title: '[반복] 계절풍의 습격자호 소탕', desc: '인도양 항로가 열렸지만 계절풍의 습격자호가 계속 되살아나 향신료 무역선을 노립니다. 볼 때마다 처치해주십시오.',
    acceptLine: '케이프타운 항구 관리인이 말합니다. "그 습격자호 말이야, 가라앉혀도 계절풍처럼 또 돌아오더군. 볼 때마다 사례할 테니 계속 처리해주게."' },
];

export function getQuest(id) {
  return QUESTS.find((q) => q.id === id);
}
