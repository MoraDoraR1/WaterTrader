// 항구관리인(harbormaster) NPC가 내주는 의뢰 — 배달(delivery)과 토벌(bounty) 두 종류.
// cityId: 의뢰를 받을 수 있는 항구. delivery는 destCityId의 항구관리인에게 납품한다.
// bounty는 targetId(seaEntities.js의 SEA_NPC_SHIPS id)를 격침하면 자동으로 완료된다.
// reward는 대략 "그 물품을 사는 비용 대비 1.6배" 선에서 잡아, 직접 시세차익을 노리는 것보다
// 의뢰를 받는 쪽이 확실히 이득이 되도록 했다(경로를 몰라도 되는 편의의 대가).
import { ARCHAEOLOGY_SITES, GEOGRAPHY_SITES, ASTRONOMY_ENTRIES, rewardFor } from './compendium.js';

const STATIC_QUESTS = [
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

  // 이 4건은 대상 잡몹에 respawnDays가 붙어 있어(data/seaEntities.js) repeatable로 표시했다
  // — 격침하면 며칠 뒤 다시 나타나고, 그때 이 의뢰도 다시 게시된다(강화는 없다).
  { id: 'bounty_pirate_1', type: 'bounty', cityId: 'lisboa', targetId: 'pirate_1', reward: 450, repeatable: true,
    title: '해적선 검은상어호 토벌', desc: '리스본 인근 해역에 출몰하는 해적선을 처치해주십시오.' },
  { id: 'bounty_pirate_2', type: 'bounty', cityId: 'amsterdam', targetId: 'pirate_2', reward: 380, repeatable: true,
    title: '해적선 붉은깃발호 토벌', desc: '북해를 어지럽히는 해적선입니다. 처치하면 사례하겠습니다.' },
  { id: 'bounty_pirate_channel', type: 'bounty', cityId: 'london', targetId: 'pirate_channel', reward: 500, repeatable: true,
    title: '해적선 북해의 늑대호 토벌', desc: '영불해협을 노리는 해적선이 있습니다. 상선들이 떨고 있어요.' },
  { id: 'bounty_pirate_med', type: 'bounty', cityId: 'genova', targetId: 'pirate_med', reward: 340, repeatable: true,
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

  // ---- 명사(名士) NPC 헌정 원정(3부작) ----
  // 항로 개척 3부작과 완전히 같은 포맷(배달→토벌→항해)을 그대로 재사용한다. 다만 새 항로를
  // 여는 게 아니라, 이미 열려 있는 항로 위에서 실존 인물(바다 위 notable 타입 NPC로 이미
  // 등장하는 바스코 다가마·프랑스 왕실함대)에게 바치는 헌정 원정이라 voyage 단계에
  // unlocksRoute가 없다 — 그 점만 빼면 requires/minRankIndex/routePrereq 게이팅과
  // checkVoyageArrival 자동완료 로직을 그대로 탄다. 이미 열린 항로 위의 여정이므로
  // routePrereq로 그 항로가 먼저 열려 있을 것을 요구한다(도착지 자체가 그 항로 안에 있다).

  // -- 4) 바스코 다가마 헌정 원정: 포르투 ↔ 리스본 정향 보급 → 말라바르 해협의 검은돛대호 토벌 → 캘리컷 항해
  { id: 'chain_dagama_delivery', type: 'delivery', cityId: 'sevilla', destCityId: 'lisboa', goodId: 'clove', qty: 10, reward: 800,
    minRankIndex: 3, routePrereq: 'indian_ocean',
    title: '[명사 의뢰 1/3] 정향 10t → 리스본', desc: '늙은 항해가 바스코 다가마 제독이 처음 캘리컷에 닿았던 항로를 다시 한번 밟아보고 싶어합니다. 원정 물자로 정향을 모아주십시오. (화물칸이 부족하다면 가진 교역품을 먼저 처분하십시오)',
    acceptLine: '세비야 항구 관리인이 말합니다. "리스본에 계신 다가마 제독께서 마지막으로 캘리컷 항로를 다시 밟고 싶다 하시더군. 원정에 쓸 정향을 좀 구해다 드리게."' },
  { id: 'chain_dagama_bounty', type: 'bounty', cityId: 'lisboa', targetId: 'pirate_elite_malabar_route', reward: 1400,
    requires: 'chain_dagama_delivery',
    title: '[명사 의뢰 2/3] 말라바르 해협의 검은돛대호 토벌', desc: '캘리컷 앞바다에 눌러앉은 해적선이 다가마 제독의 원정로를 위협하고 있습니다. 제독의 안전을 위해 먼저 처치해주십시오.',
    acceptLine: '"제독께서 연로하신데 그 바다에 아직도 해적이 있다는군. 검은돛대호라던가 — 자네가 먼저 정리해주면 제독께서도 마음 놓고 배를 띄우실 걸세."' },
  { id: 'chain_dagama_voyage', type: 'voyage', cityId: 'lisboa', targetCityId: 'calicut', reward: 1200,
    requires: 'chain_dagama_bounty',
    title: '[명사 의뢰 3/3] 캘리컷까지 항해 — 다가마 제독을 대신하여', desc: '길이 안전해졌습니다. 제독을 대신해 캘리컷까지 항해하여, 그가 처음 닿았던 그 해안에 다시 한번 닻을 내려주십시오.',
    acceptLine: '"고맙네. 이제 자네가 내 대신 캘리컷까지 가주게 — 늙은 몸으로 직접 가지 못하는 게 한이지만, 자네가 그 항로를 다시 밟아준다면 그걸로 충분하네."',
    arriveLine: '캘리컷 해안에 닻을 내리자 뱃사람들 사이에서 짧은 함성이 터져나옵니다. 다가마 제독이 처음 이곳에 닿은 지 오랜 세월이 지났지만, 그가 열어젖힌 항로는 오늘도 여전히 살아 있습니다.' },

  // -- 5) 프랑스 왕실함대 헌정 원정: 보르도 ↔ 마르세유 설탕 보급 → 대서양의 사략선 검은백합호 토벌 → 퀘벡 항해
  { id: 'chain_soleil_delivery', type: 'delivery', cityId: 'bordeaux', destCityId: 'marseille', goodId: 'sugar', qty: 18, reward: 850,
    minRankIndex: 3, routePrereq: 'new_world',
    title: '[명사 의뢰 1/3] 설탕 18t → 마르세유', desc: '마르세유에 정박한 왕실함대 솔레유 루아얄호가 신대륙 원정을 준비하며 물자를 모으고 있습니다. (화물칸이 부족하다면 가진 교역품을 먼저 처분하십시오)',
    acceptLine: '보르도 항구 관리인이 말합니다. "마르세유의 왕실함대에서 전갈이 왔네. 태양왕의 이름으로 신대륙까지 원정을 떠난다는데, 그 채비에 설탕이 필요하다더군."' },
  { id: 'chain_soleil_bounty', type: 'bounty', cityId: 'marseille', targetId: 'pirate_elite_atlantic_crossing', reward: 1500,
    requires: 'chain_soleil_delivery',
    title: '[명사 의뢰 2/3] 대서양의 사략선 검은백합호 토벌', desc: '대서양 항로 한복판에 왕실함대의 원정을 노리는 사략선이 도사리고 있습니다. 함대가 출항하기 전에 처치해주십시오.',
    acceptLine: '"왕실함대씩이나 되는 배가 사략선 따위에 발이 묶여서야 체면이 서겠나. 검은백합호, 그놈부터 가라앉혀주게."' },
  { id: 'chain_soleil_voyage', type: 'voyage', cityId: 'marseille', targetCityId: 'quebec', reward: 1300,
    requires: 'chain_soleil_bounty',
    title: '[명사 의뢰 3/3] 퀘벡까지 항해 — 왕실 함대를 대신하여', desc: '바다가 안전해졌습니다. 왕실함대를 대신해 대서양을 건너 누벨프랑스의 관문 퀘벡까지 항해하여, 태양왕의 깃발이 여전히 대양을 넘나든다는 것을 보여주십시오.',
    acceptLine: '"함대는 여기 마르세유에 남아 위엄을 지켜야 하네만, 누군가는 실제로 퀘벡까지 가서 깃발을 꽂아야지. 자네가 그 몫을 맡아주게."',
    arriveLine: '퀘벡 항구에 닻을 내리자 요새의 백합 문장 깃발이 눈에 들어옵니다. 태양왕의 함대는 마르세유에 머물러 있지만, 그 이름을 실은 배는 오늘도 대서양을 건넜습니다.' },
];

// ---- 학문(고고학/지리학/천문학) 연계 의뢰(짧은 체인) ----
// 도감(data/compendium.js) 항목 중 서사적으로 묶일 만한 것들을 3~4부작 체인으로 엮었다.
// 항로 개척 3부작과 같은 requires 게이팅을 쓰되, voyage처럼 입항이 아니라 그 사이트를 실제로
// 조사·관측(G키)해야 완료된다(type: 'investigate', systems/quests.js checkInvestigateComplete).
// 나머지 도감 항목(아래 CHAINED_SITE_IDS에 없는 것)은 파일 하단 buildDiscoveryQuests()가
// 개별 발견 의뢰로 자동 생성한다.
const ACADEMIC_CHAIN_QUESTS = [
  // -- 고고학 1) 지중해 고대 난파선 탐사대: 울루부룬 → 마디아 → 스케르키 뱅크
  { id: 'chain_arch_med_1', type: 'investigate', cityId: 'valletta', siteId: 'wreck_uluburun', skillId: 'archaeology', minSkillLevel: 1, reward: 300,
    title: '[고고학 연계 1/3] 청동기시대 난파선 조사', desc: '몰타의 호사가가 청동기시대 지중해 교역로의 흔적을 찾고 있습니다. 울루부룬 난파선을 조사해주십시오.',
    acceptLine: '발레타의 한 수집가가 말합니다. "청동기시대 지중해 무역이 얼마나 촘촘했는지 증명하고 싶소. 울루부룬 난파선부터 조사해주시겠소?"' },
  { id: 'chain_arch_med_2', type: 'investigate', cityId: 'valletta', siteId: 'wreck_mahdia', skillId: 'archaeology', requires: 'chain_arch_med_1', reward: 400,
    title: '[고고학 연계 2/3] 헬레니즘 예술품 난파선 조사', desc: '이번엔 그리스 예술품이 로마로 흘러가던 경로, 마디아 난파선을 조사해주십시오.',
    acceptLine: '"좋습니다, 이제 그 예술품들이 로마로 어떻게 흘러갔는지 봅시다 — 마디아로 가주시오."' },
  { id: 'chain_arch_med_3', type: 'investigate', cityId: 'valletta', siteId: 'wreck_skerki', skillId: 'archaeology', requires: 'chain_arch_med_2', reward: 550,
    title: '[고고학 연계 3/3] 시칠리아 해협의 난파선군 조사', desc: '마지막으로, 로마 항로가 얼마나 붐볐는지 스케르키 뱅크의 난파선군에서 확인해주십시오.',
    acceptLine: '"이제 마지막이오 — 스케르키 뱅크. 그곳 하나에만 몇 척이 가라앉아 있는지 보면 놀랄 거요."' },

  // -- 고고학 2) 대서양 보물선 추적: 포트로열 → 산호세 갤리언 → 와이다 갤리호
  { id: 'chain_arch_atlantic_1', type: 'investigate', cityId: 'havana', siteId: 'ruin_portroyal', skillId: 'archaeology', minSkillLevel: 4, reward: 350,
    title: '[고고학 연계 1/3] 침몰한 해적 도시 조사', desc: '아바나의 기록보관인이 카리브해 해적 황금기의 흔적을 모으고 있습니다. 포트로열 침몰지구를 조사해주십시오.',
    acceptLine: '아바나 항구 관리인이 말합니다. "한때 이 바다를 주름잡던 해적들의 도시가 하룻밤에 가라앉았다지. 그 흔적을 좀 봐주게."' },
  { id: 'chain_arch_atlantic_2', type: 'investigate', cityId: 'havana', siteId: 'wreck_sanjose', skillId: 'archaeology', requires: 'chain_arch_atlantic_1', reward: 500,
    title: '[고고학 연계 2/3] "난파선의 성배" 조사', desc: '이번엔 카르타헤나 앞바다에 가라앉은 스페인 보물선, 산호세 갤리언을 조사해주십시오.',
    acceptLine: '"이번엔 좀 더 큰 건이야 — 산호세 갤리언, 금은보화를 가득 실은 채 가라앉았다는 그 배 말일세."' },
  { id: 'chain_arch_atlantic_3', type: 'investigate', cityId: 'havana', siteId: 'wreck_whydah', skillId: 'archaeology', requires: 'chain_arch_atlantic_2', reward: 650,
    title: '[고고학 연계 3/3] 실존 확인된 해적선 조사', desc: '마지막으로 뉴잉글랜드 앞바다의 와이다 갤리호를 조사해주십시오 — 실물이 확인된 최초의 해적선이라 합니다.',
    acceptLine: '"이게 마지막인데 제일 흥미로울 걸세. 벨라미 선장의 그 배, 와이다 갤리호 말이야."' },

  // -- 고고학 3) 동아시아 무역선 발굴: 신안선 → 난하이 1호 → 호이안 난파선
  { id: 'chain_arch_asia_1', type: 'investigate', cityId: 'busan', siteId: 'wreck_shinan', skillId: 'archaeology', minSkillLevel: 6, reward: 400,
    title: '[고고학 연계 1/3] 신안선 발굴 조사', desc: '부산의 학자가 동아시아 해상 교역사를 연구하고 있습니다. 신안 앞바다의 난파선부터 조사해주십시오.',
    acceptLine: '부산 항구 관리인이 말합니다. "고려로 향하던 원나라 배가 신안 앞바다에 가라앉았다더군. 그 흔적을 살펴봐주게."' },
  { id: 'chain_arch_asia_2', type: 'investigate', cityId: 'busan', siteId: 'wreck_nanhai1', skillId: 'archaeology', requires: 'chain_arch_asia_1', reward: 500,
    title: '[고고학 연계 2/3] 난하이 1호 발굴 조사', desc: '이번엔 남송의 도자기를 가득 실은 채 통째로 가라앉은 난하이 1호를 조사해주십시오.',
    acceptLine: '"이번엔 남송 시대 배일세 — 난하이 1호, 선체째로 가라앉은 보기 드문 경우지."' },
  { id: 'chain_arch_asia_3', type: 'investigate', cityId: 'busan', siteId: 'wreck_hoi_an', skillId: 'archaeology', requires: 'chain_arch_asia_2', reward: 700,
    title: '[고고학 연계 3/3] 호이안 난파선 발굴 조사', desc: '마지막으로 베트남 참파 왕국의 청화백자를 실은 호이안 난파선을 조사해, 교역이 중국에만 의존하지 않았음을 확인해주십시오.',
    acceptLine: '"마지막으로 베트남 쪽도 한번 보세 — 도자기 무역이 중국 하나뿐이었을 리 없거든."' },

  // -- 지리학 1) 세계의 관문 해협들: 지브롤터 → 보스포루스 → 호르무즈
  { id: 'chain_geo_straits_1', type: 'investigate', cityId: 'tanger', siteId: 'geo_gibraltar', skillId: 'geography', minSkillLevel: 1, reward: 300,
    title: '[지리학 연계 1/3] 헤라클레스의 기둥 답사', desc: '탕헤르의 지리학자가 세계의 주요 해협을 정리하고 있습니다. 지브롤터 해협부터 답사해주십시오.',
    acceptLine: '탕헤르 항구 관리인이 말합니다. "고대인들이 세상의 끝이라 믿었던 그 해협 말일세. 직접 가서 봐주게."' },
  { id: 'chain_geo_straits_2', type: 'investigate', cityId: 'tanger', siteId: 'geo_bosphorus', skillId: 'geography', requires: 'chain_geo_straits_1', reward: 400,
    title: '[지리학 연계 2/3] 보스포루스 해협 답사', desc: '이번엔 두 대륙을 가르는 보스포루스 해협을 답사해주십시오.',
    acceptLine: '"이번엔 동쪽으로 — 보스포루스, 유럽과 아시아를 가르는 그 좁은 물길 말이네."' },
  { id: 'chain_geo_straits_3', type: 'investigate', cityId: 'tanger', siteId: 'geo_hormuz', skillId: 'geography', requires: 'chain_geo_straits_2', reward: 550,
    title: '[지리학 연계 3/3] 호르무즈 해협 답사', desc: '마지막으로 페르시아만의 관문, 호르무즈 해협을 답사해주십시오.',
    acceptLine: '"마지막은 페르시아만 어귀일세 — 호르무즈, 그 좁은 목 하나가 만 전체의 숨통을 쥐고 있다더군."' },

  // -- 지리학 2) 적도를 넘어서: 무풍대 → 계절풍대 → 코모린곶
  { id: 'chain_geo_equator_1', type: 'investigate', cityId: 'mombasa', siteId: 'geo_doldrums', skillId: 'geography', minSkillLevel: 4, reward: 350,
    title: '[지리학 연계 1/3] 적도 무풍대 답사', desc: '몸바사의 항해장이 적도 부근의 기후대를 기록하고 있습니다. 뱃사람들이 두려워하는 무풍대부터 답사해주십시오.',
    acceptLine: '몸바사 항구 관리인이 말합니다. "적도 부근 그 바람 없는 구역 말일세. 직접 겪어봐야 왜 다들 두려워하는지 알 걸세."' },
  { id: 'chain_geo_equator_2', type: 'investigate', cityId: 'mombasa', siteId: 'geo_monsoon', skillId: 'geography', requires: 'chain_geo_equator_1', reward: 450,
    title: '[지리학 연계 2/3] 인도양 계절풍대 답사', desc: '이번엔 반년 주기로 방향이 바뀌는 인도양 계절풍대를 답사해주십시오.',
    acceptLine: '"이번엔 계절풍이야 — 이 바람 하나로 수천 년째 상인들이 나침반 없이 대양을 건넌다더군."' },
  { id: 'chain_geo_equator_3', type: 'investigate', cityId: 'mombasa', siteId: 'geo_comorin', skillId: 'geography', requires: 'chain_geo_equator_2', reward: 550,
    title: '[지리학 연계 3/3] 코모린곶 답사', desc: '마지막으로 인도 최남단, 세 바다가 만나는 코모린곶을 답사해주십시오.',
    acceptLine: '"마지막으로 인도 아대륙 끝자락을 보세 — 코모린곶, 세 바다가 한데 만나는 곳이지."' },

  // -- 지리학 3) 남쪽 바다의 관문: 희망봉 → 모스크스트라우멘 → 사르가소해
  { id: 'chain_geo_south_1', type: 'investigate', cityId: 'cape_town', siteId: 'geo_good_hope', skillId: 'geography', minSkillLevel: 10, reward: 600,
    title: '[지리학 연계 1/3] 희망봉 답사', desc: '케이프타운의 노(老) 항해사가 세계 끝자락의 전설적인 바다들을 모으고 있습니다. 희망봉부터 답사해주십시오.',
    acceptLine: '케이프타운 항구 관리인이 말합니다. "원래 이름이 폭풍의 곶이었다는 걸 아는가? 그 사나운 곶부터 다시 봐주게."' },
  { id: 'chain_geo_south_2', type: 'investigate', cityId: 'cape_town', siteId: 'geo_maelstrom', skillId: 'geography', requires: 'chain_geo_south_1', reward: 750,
    title: '[지리학 연계 2/3] 모스크스트라우멘 소용돌이 답사', desc: '이번엔 북쪽 끝, 배를 통째로 삼킨다는 전설의 소용돌이를 답사해주십시오.',
    acceptLine: '"이번엔 정반대로 북쪽 끝일세 — 노르웨이의 그 소용돌이, 옛 지도엔 심연으로 그려져 있더군."' },
  // 사르가소해는 바람도 해류도 종잡을 수 없어(적도 무풍대와 함께 뱃사람들이 가장 두려워한
  // 해역), 위치를 가늠할 유일한 수단이 결국 별이었다 — 천문학도 함께 요구한다.
  { id: 'chain_geo_south_3', type: 'investigate', cityId: 'cape_town', siteId: 'geo_sargasso', skillId: 'geography', requires: 'chain_geo_south_2', reward: 950,
    extraSkillReqs: [{ skillId: 'astronomy', minLevel: 10 }],
    title: '[지리학 연계 3/3] 사르가소해 답사', desc: '마지막으로 해안선 하나 없이 해류로만 둘러싸인 유일한 바다, 사르가소해를 답사해주십시오. (천문학 Lv.10 이상 — 바람도 해류도 없는 이 바다에서는 별을 볼 줄 알아야만 위치를 가늠할 수 있습니다)',
    acceptLine: '"마지막은 가장 기이한 곳일세 — 사르가소해, 유령선 전설이 끊이지 않는 그 바다 말이네. 바람도 해류도 없으니, 별을 읽을 줄 모르면 그 안에서 영영 표류할 걸세."' },

  // -- 천문학 1) 고대 그리스 별자리: 오리온 → 큰곰자리 → 전갈자리
  { id: 'chain_astro_greek_1', type: 'investigate', cityId: 'venezia', siteId: 'star_orion', skillId: 'astronomy', minSkillLevel: 1, reward: 300,
    title: '[천문학 연계 1/3] 오리온자리 관측', desc: '베네치아의 천문학자가 그리스 신화 속 별자리를 정리하고 있습니다. 오리온자리부터 관측해주십시오.',
    acceptLine: '베네치아 항구 관리인이 말합니다. "겨울 밤하늘의 그 사냥꾼 말일세. 맑은 밤에 한번 관측해보게."' },
  { id: 'chain_astro_greek_2', type: 'investigate', cityId: 'venezia', siteId: 'star_ursa_major', skillId: 'astronomy', requires: 'chain_astro_greek_1', reward: 400,
    title: '[천문학 연계 2/3] 큰곰자리 관측', desc: '이번엔 뱃사람들의 오랜 길잡이, 큰곰자리(북두칠성)를 관측해주십시오.',
    acceptLine: '"이번엔 북쪽 하늘일세 — 국자 모양 일곱 별, 나침반 없던 시절의 길잡이였지."' },
  { id: 'chain_astro_greek_3', type: 'investigate', cityId: 'venezia', siteId: 'star_scorpius', skillId: 'astronomy', requires: 'chain_astro_greek_2', reward: 550,
    title: '[천문학 연계 3/3] 전갈자리 관측', desc: '마지막으로 오리온을 쏘아 죽였다는 전갈자리를 관측해주십시오.',
    acceptLine: '"마지막으로 그 사냥꾼을 죽인 전갈을 보세 — 여름 밤하늘의 붉은 별, 안타레스가 심장이라네."' },

  // -- 천문학 2) 동방 사신도: 청룡 → 백호 → 주작 → 현무
  { id: 'chain_astro_china_1', type: 'investigate', cityId: 'guangzhou', siteId: 'star_azure_dragon', skillId: 'astronomy', minSkillLevel: 10, reward: 500,
    title: '[천문학 연계 1/4] 동방청룡 관측', desc: '광저우의 흠천감 관원이 사신(四神)의 별자리를 모두 기록하려 합니다. 봄철 동쪽 하늘의 청룡부터 관측해주십시오.',
    acceptLine: '광저우 항구 관리인이 말합니다. "하늘을 넷으로 나눠 각각 신수를 배정했다지. 먼저 동쪽의 청룡부터 봐주게."' },
  { id: 'chain_astro_china_2', type: 'investigate', cityId: 'guangzhou', siteId: 'star_white_tiger', skillId: 'astronomy', requires: 'chain_astro_china_1', reward: 600,
    title: '[천문학 연계 2/4] 서방백호 관측', desc: '이번엔 가을철 서쪽 하늘의 백호를 관측해주십시오.',
    acceptLine: '"이번엔 서쪽 — 백호일세. 청룡과 대칭을 이룬다더군."' },
  { id: 'chain_astro_china_3', type: 'investigate', cityId: 'guangzhou', siteId: 'star_vermilion_bird', skillId: 'astronomy', requires: 'chain_astro_china_2', reward: 700,
    title: '[천문학 연계 3/4] 남방주작 관측', desc: '이번엔 여름철 남쪽 하늘의 주작을 관측해주십시오.',
    acceptLine: '"남쪽은 주작이지 — 불사조를 닮은 붉은 새, 계절풍이 바뀔 때를 알린다더군."' },
  { id: 'chain_astro_china_4', type: 'investigate', cityId: 'guangzhou', siteId: 'star_black_tortoise', skillId: 'astronomy', requires: 'chain_astro_china_3', reward: 850,
    title: '[천문학 연계 4/4] 북방현무 관측', desc: '마지막으로 겨울철 북쪽 하늘의 현무를 관측해 사신을 모두 완성해주십시오.',
    acceptLine: '"마지막이 북쪽 현무일세 — 이걸로 사신을 다 모으는 걸세, 뱀이 거북을 휘감은 모습이라지."' },

  // -- 천문학 3) 남반구 항해자의 별: 남십자자리 → 노인성 → 아르고자리
  { id: 'chain_astro_south_1', type: 'investigate', cityId: 'cape_town', siteId: 'star_crux', skillId: 'astronomy', minSkillLevel: 8, reward: 550,
    title: '[천문학 연계 1/3] 남십자자리 관측', desc: '케이프타운의 항해장이 남반구 별자리를 정리하고 있습니다. 남십자자리부터 관측해주십시오.',
    acceptLine: '케이프타운 항구 관리인이 말합니다. "북극성이 안 보이는 이 바다에선 저 작은 십자가가 대신 방위를 알려준다네."' },
  // 노인성(카노푸스)은 아랍 항해자들이 인도양 계절풍 항로에서 위도를 가늠하던 별이다 — 그
  // 항로의 지리(계절풍대·호르무즈 해협)를 모르면 이 별이 왜 중요했는지 이해할 수 없으므로,
  // 지리학도 함께 요구한다(고고학·지리학·천문학 2개 학문을 병렬로 요구하는 연계 의뢰).
  { id: 'chain_astro_south_2', type: 'investigate', cityId: 'cape_town', siteId: 'star_canopus', skillId: 'astronomy', requires: 'chain_astro_south_1', reward: 700,
    extraSkillReqs: [{ skillId: 'geography', minLevel: 4 }],
    title: '[천문학 연계 2/3] 노인성(카노푸스) 관측', desc: '이번엔 아랍 항해자들이 위도를 가늠하던 노인성을 관측해주십시오. (지리학 Lv.4 이상 — 이 별이 쓰이던 계절풍 항로를 먼저 알아야 합니다)',
    acceptLine: '"이번엔 노인성이야 — 하늘에서 둘째로 밝은 별인데, 남쪽 수평선 가까이서만 보인다더군. 다만 이 별이 왜 중요했는지 알려면, 자네가 계절풍 항로부터 먼저 알아야 할 걸세."' },
  { id: 'chain_astro_south_3', type: 'investigate', cityId: 'cape_town', siteId: 'star_argo_navis', skillId: 'astronomy', requires: 'chain_astro_south_2', reward: 900,
    title: '[천문학 연계 3/3] 아르고자리 관측', desc: '마지막으로 전설의 배 아르고호를 본뜬, 한때 밤하늘에서 가장 거대했던 별자리를 관측해주십시오.',
    acceptLine: '"마지막으로 가장 큰 별자리를 보세 — 이아손의 배, 아르고자리일세. 너무 커서 훗날 여럿으로 쪼개졌다더군."' },

  // ---- 2개 학문을 병렬로 요구하는 단독 의뢰 2건 ----
  // 원래는 buildDiscoveryQuests()가 자동 생성하는 개별 발견 의뢰였지만, 실제로 두 학문이
  // 함께 필요한 이유가 있는 항목이라 손으로 옮겨 extraSkillReqs를 얹었다(사이트 자체는
  // 그대로라 도감·보상은 동일, 수주 조건만 하나 더 걸린다).
  { id: 'disc_wreck_antikythera', type: 'investigate', cityId: 'valletta', siteId: 'wreck_antikythera', skillId: 'archaeology', minSkillLevel: 1, reward: 260,
    extraSkillReqs: [{ skillId: 'astronomy', minLevel: 2 }],
    title: '[고고학 발견] 🏺 안티키테라 유물', desc: '1901년 그리스 어부들이 건져올린 난파선에서 나온 청동 장치 — 훗날 "세계 최초의 아날로그 컴퓨터"로 불리는 천체 계산기(안티키테라 기계)가 이 안에 있었다. (천문학 Lv.2 이상 — 이 장치가 계산하던 것이 무엇인지 알아야 진가를 알아볼 수 있습니다)',
    acceptLine: '발레타의 한 수집가가 말합니다. "몰타 앞바다에 가라앉은 청동기 하나가 있는데, 그 안에 든 톱니 장치가 심상치 않아. 다만 이걸 알아보려면 별자리를 좀 알아야 할 걸세."' },
  { id: 'disc_myth_atlantis', type: 'investigate', cityId: 'azores', siteId: 'myth_atlantis', skillId: 'archaeology', minSkillLevel: 14, reward: 500,
    extraSkillReqs: [{ skillId: 'geography', minLevel: 6 }],
    title: '[고고학 발견] 🏺 전설의 침몰 대륙', desc: '플라톤이 "헤라클레스의 기둥 너머"에 있었다고 전한 침몰한 섬나라 — 실체를 증명할 유적은 없지만, 대서양 한복판 화산섬 지형이 오랫동안 이 전설의 근거로 지목되어 왔다. (지리학 Lv.6 이상 — 산토리니 같은 실제 화산 지형학을 알아야 전설과 지질을 구분할 수 있습니다)',
    acceptLine: '아조레스 항구 관리인이 말합니다. "플라톤이 남겼다는 그 침몰한 섬나라 말인데, 자네가 산토리니 같은 화산 지형을 볼 줄 안다면 전설과 진짜를 가려낼 수 있을지도 모르겠군."' },
];

// 위 9개 체인에 이미 쓰인 사이트는 개별 발견 의뢰로 중복 생성하지 않는다.
const CHAINED_SITE_IDS = new Set(ACADEMIC_CHAIN_QUESTS.map((q) => q.siteId));

const DISCOVERY_ACCEPT_LINES = {
  archaeology: (name) => `항구 관리인이 말합니다. "이 근방에 ${name}에 관한 소문이 있던데, 관심 있으면 한번 가보게."`,
  geography: (name) => `항구 관리인이 말합니다. "${name} 말인데, 직접 가서 둘러보면 흥미로운 게 있을 거라더군."`,
  astronomy: (name) => `항구 관리인이 말합니다. "맑은 밤에 시간이 나면 ${name}을(를) 한번 관측해보게."`,
};

// 체인에 속하지 않은 나머지 도감 항목을 개별 발견 의뢰로 자동 생성한다 — 사이트 하나당
// 퀘스트 하나(사이트의 desc/좌표/등급을 그대로 재사용), 스킬 레벨이 minSkillLevel에 닿아야
// 게시판에 뜬다. 천문학은 좌표가 없어 targetCityId 없이 순수 조건(야간+맑음)으로만 완료된다.
function buildDiscoveryQuests() {
  const quests = [];
  const bySubject = [
    ['archaeology', ARCHAEOLOGY_SITES],
    ['geography', GEOGRAPHY_SITES],
    ['astronomy', ASTRONOMY_ENTRIES],
  ];
  for (const [skillId, sites] of bySubject) {
    for (const site of sites) {
      if (CHAINED_SITE_IDS.has(site.id)) continue;
      const { gold } = rewardFor(site.rarity);
      const icon = skillId === 'archaeology' ? '🏺' : skillId === 'geography' ? '🗺️' : '🔭';
      quests.push({
        id: `disc_${site.id}`,
        type: 'investigate',
        cityId: site.cityId,
        siteId: site.id,
        skillId,
        minSkillLevel: site.minSkillLevel,
        reward: gold,
        repeatable: false,
        title: `[${SKILL_CATEGORIES_KO[skillId]} 발견] ${icon} ${site.name}`,
        desc: site.desc,
        acceptLine: DISCOVERY_ACCEPT_LINES[skillId](site.name),
      });
    }
  }
  return quests;
}
const SKILL_CATEGORIES_KO = { archaeology: '고고학', geography: '지리학', astronomy: '천문학' };

export const QUESTS = [...STATIC_QUESTS, ...ACADEMIC_CHAIN_QUESTS, ...buildDiscoveryQuests()];

export function getQuest(id) {
  return QUESTS.find((q) => q.id === id);
}
