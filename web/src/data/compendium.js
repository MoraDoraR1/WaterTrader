// 항해 도감 — 고고학(해저 유적·난파선)/지리학(지형·랜드마크)/천문학(별자리) 3개 학문의
// 발견 대상 목록. 고고학·지리학 항목은 실제 세계 좌표(project()로 변환한 게임 내 좌표)를
// 가진 고정 지점이라 배로 접근해 조사해야 하고, 천문학 항목은 좌표가 없고 대신 "밤 + 맑은
// 날씨" 조건에서 관측한다(systems/skills.js/scenes/seaScene.js가 조건을 판정한다).
//
// 각 항목: id, name, era(시대/문명 표기), desc(역사적·신화적 근거를 담은 한두 문장),
// rarity('common'|'rare'|'legendary' — 최초 발견 보상 크기), minSkillLevel(연계 없는 개별
// 발견 의뢰가 게시판에 뜨기 위한 최소 학문 레벨), cityId(그 발견 의뢰를 수락할 항구),
// chainId(짧은 연계 체인에 속하면 그 체인 id, 없으면 standalone). 고고학/지리학은 coords도 갖는다.
import { project } from './coastline.js';

const RARITY_REWARD = {
  common: { exp: 6, gold: 120 },
  rare: { exp: 10, gold: 260 },
  legendary: { exp: 16, gold: 500 },
};

export function rewardFor(rarity) {
  return RARITY_REWARD[rarity] || RARITY_REWARD.common;
}

// 학문 스킬(고고학/지리학/천문학)의 숙련도는 "시전"이 아니라 "발견"으로만 오르며, 그 상승폭은
// 발견물 자체의 랭크(=minSkillLevel, 1~15)에 비례한다 — 만렙에 가까운 어려운 발견일수록
// 숙련도를 더 많이 준다. 골드는 여전히 rarity 기준(rewardFor)을 쓴다.
export function rewardForRank(rank) {
  return 4 + rank * 2;
}

// ---- 고고학(해저 유적·난파선) — 실제 발굴된 유적 21곳 + 신화 속 전설 1곳. ----
export const ARCHAEOLOGY_SITES = [
  { id: 'wreck_antikythera', name: '안티키테라 유물', era: '기원전 1세기 그리스', rarity: 'rare', minSkillLevel: 1, cityId: 'valletta',
    coords: project(23.30, 35.86),
    desc: '1901년 그리스 어부들이 건져올린 난파선에서 나온 청동 장치 — 훗날 "세계 최초의 아날로그 컴퓨터"로 불리는 천체 계산기(안티키테라 기계)가 이 안에 있었다.' },
  { id: 'wreck_uluburun', name: '울루부룬 난파선', era: '기원전 14세기 청동기시대', rarity: 'common', minSkillLevel: 1, cityId: 'valletta',
    coords: project(29.68, 36.16),
    desc: '터키 남부 해안에서 발견된 청동기시대 상선 — 구리·주석 원료괴부터 이집트 왕비의 인장까지, 지중해 전역을 잇던 초기 교역망을 그대로 보여준다.' },
  { id: 'ruin_baiae', name: '바이아이 수중 도시', era: '고대 로마', rarity: 'common', minSkillLevel: 1, cityId: 'napoli',
    coords: project(14.09, 40.82),
    desc: '로마 귀족들의 호화 휴양지였던 바이아이는 화산 지대의 지반 침하로 서서히 바다에 잠겼다 — 지금도 물속에 대리석 바닥과 기둥이 고스란히 남아 있다.' },
  { id: 'ruin_thonis_heracleion', name: '토니스-헤라클레이온', era: '고대 이집트', rarity: 'common', minSkillLevel: 2, cityId: 'alexandria',
    coords: project(30.06, 31.31),
    desc: '나일강 하구에서 지진과 해수면 상승으로 통째로 가라앉은 항구 도시 — 신전과 거대 석상이 고스란히 잠긴 채로 2000년 만에 재발견됐다.' },
  { id: 'ruin_pavlopetri', name: '파블로페트리', era: '기원전 5천년경 청동기시대', rarity: 'rare', minSkillLevel: 2, cityId: 'valletta',
    coords: project(22.98, 36.53),
    desc: '지구상에서 가장 오래된 것으로 알려진 수중 도시 유적 — 거리와 건물 기초, 무덤까지 도시 계획의 흔적이 얕은 바다 밑에 그대로 펼쳐져 있다.' },
  { id: 'wreck_mahdia', name: '마디아 난파선', era: '기원전 1세기 헬레니즘', rarity: 'common', minSkillLevel: 2, cityId: 'valletta',
    coords: project(11.05, 35.50),
    desc: '튀니지 앞바다에 가라앉은 로마행 화물선 — 그리스 청동상과 대리석 기둥을 가득 실은 채로, 헬레니즘 예술품이 로마로 흘러가던 경로를 증언한다.' },
  { id: 'wreck_skerki', name: '스케르키 뱅크 난파선군', era: '고대 로마', rarity: 'common', minSkillLevel: 3, cityId: 'napoli',
    coords: project(11.00, 37.90),
    desc: '시칠리아 해협의 얕은 여울에 겹겹이 가라앉은 로마 시대 상선 잔해들 — 지중해 항로가 얼마나 붐볐는지, 그리고 얼마나 위험했는지를 함께 보여준다.' },
  { id: 'wreck_maryrose', name: '메리 로즈호', era: '1545년 튜더 왕조', rarity: 'rare', minSkillLevel: 3, cityId: 'london',
    coords: project(-1.10, 50.75),
    desc: '헨리 8세가 아끼던 잉글랜드 왕실 전함으로, 프랑스 함대와 교전 중 눈앞에서 전복돼 가라앉았다 — 진흙 속에 묻힌 덕에 선체 절반이 놀랍도록 온전히 남았다.' },
  { id: 'wreck_vasa', name: '바사호', era: '1628년 스웨덴 왕국', rarity: 'rare', minSkillLevel: 3, cityId: 'stockholm',
    coords: project(18.09, 59.32),
    desc: '스톡홀름 앞바다에서 처녀항해 중 강풍에 휘청이다 그대로 전복된 스웨덴의 자랑 — 세계에서 가장 완벽하게 보존된 17세기 전함으로 훗날 인양됐다.' },
  { id: 'ruin_portroyal', name: '포트로열 침몰지구', era: '1692년 자메이카', rarity: 'common', minSkillLevel: 4, cityId: 'havana',
    coords: project(-76.84, 17.94),
    desc: '한때 "가장 사악하고 부유한 도시"로 불리던 해적들의 항구가 대지진과 해일로 하룻밤 새 바다 밑으로 가라앉았다.' },
  { id: 'wreck_sanjose', name: '산호세 갤리언', era: '1708년 스페인 제국', rarity: 'rare', minSkillLevel: 4, cityId: 'havana',
    coords: project(-75.55, 10.40),
    desc: '카르타헤나 앞바다에서 영국 함대에 격침된 스페인 보물선 — 금화와 은괴, 에메랄드를 가득 실은 채 가라앉아 "난파선의 성배"로 불린다.' },
  { id: 'wreck_whydah', name: '와이다 갤리호', era: '1717년 해적시대', rarity: 'common', minSkillLevel: 4, cityId: 'new_amsterdam',
    coords: project(-70.03, 41.83),
    desc: '노예선에서 해적선으로 나포된 뒤 케이프코드 앞바다 폭풍에 난파한 배 — 선장 새뮤얼 벨라미의 노획물과 함께 가라앉아, 실물이 확인된 최초의 해적선으로 남았다.' },
  { id: 'ruin_dwarka', name: '드와르카 해저 유적', era: '전설 속 크리슈나의 도시', rarity: 'rare', minSkillLevel: 5, cityId: 'goa',
    coords: project(68.97, 22.24),
    desc: '힌두 신화에서 크리슈나가 다스리다 바다에 잠겼다는 전설의 도시 — 실제로 그 앞바다에서 고대 석조 구조물이 발견돼 전설과 고고학이 맞닿은 드문 사례다.' },
  { id: 'ruin_mahabalipuram', name: '마하발리푸람 일곱 탑', era: '팔라바 왕조', rarity: 'common', minSkillLevel: 5, cityId: 'colombo',
    coords: project(80.19, 12.62),
    desc: '해안에 남은 단 하나의 탑 뒤로 전설처럼 전해지던 나머지 여섯 탑이, 2004년 쓰나미가 모래를 걷어내면서 물밑 윤곽으로 잠깐 모습을 드러냈다.' },
  { id: 'wreck_belitung', name: '벨리퉁 난파선', era: '9세기 아바스 왕조', rarity: 'common', minSkillLevel: 5, cityId: 'malacca',
    coords: project(107.90, -2.70),
    desc: '아랍 다우선이 당나라 도자기 6만여 점을 싣고 가다 인도네시아 해역에 가라앉았다 — 해상 실크로드가 얼마나 이른 시기부터 대륙을 이었는지 보여준다.' },
  { id: 'wreck_shinan', name: '신안선', era: '14세기 원나라', rarity: 'common', minSkillLevel: 6, cityId: 'busan',
    coords: project(126.10, 34.79),
    desc: '고려로 향하던 원나라 무역선이 신안 앞바다에 가라앉았다 — 도자기 2만여 점과 동전 28톤이 어부의 그물에 걸려 세상에 알려졌다.' },
  { id: 'wreck_nanhai1', name: '난하이 1호', era: '남송 시대', rarity: 'common', minSkillLevel: 6, cityId: 'guangzhou',
    coords: project(111.90, 21.50),
    desc: '남송의 도자기·금은 세공품을 가득 싣고 동남아로 향하던 중 가라앉은 상선 — 선체째로 통째로 인양된 몇 안 되는 고대 난파선이다.' },
  { id: 'ruin_yonaguni', name: '요나구니 해저 지형', era: '기원 불명(선사시대 추정)', rarity: 'rare', minSkillLevel: 7, cityId: 'hakata',
    coords: project(123.00, 24.43),
    desc: '계단처럼 각진 거대한 해저 암반 — 자연 침식의 결과라는 설과 선사시대 인공 구조물이라는 설이 여전히 팽팽히 맞선다.' },
  { id: 'ruin_qaitbay', name: '파로스 등대 잔해', era: '고대 그리스-이집트', rarity: 'rare', minSkillLevel: 8, cityId: 'alexandria',
    coords: project(29.885, 31.214),
    desc: '고대 세계 7대 불가사의 중 하나였던 파로스 등대가 지진으로 무너져 내린 거대한 화강암 석재들이, 지금의 카이트베이 요새 앞바다에 그대로 흩어져 있다.' },
  { id: 'wreck_hoi_an', name: '호이안 난파선', era: '15세기 대월(베트남)', rarity: 'common', minSkillLevel: 9, cityId: 'brunei',
    coords: project(108.90, 15.60),
    desc: '베트남 참파 왕국의 청화백자를 가득 싣고 가라앉은 무역선 — 동남아 도자기 무역이 중국에만 의존하지 않았음을 보여주는 증거다.' },
  { id: 'wreck_geldermalsen', name: '헬더말선 난파선', era: '1752년 네덜란드 동인도회사', rarity: 'common', minSkillLevel: 10, cityId: 'aceh',
    coords: project(104.50, 3.20),
    desc: '중국 도자기와 금괴를 싣고 유럽으로 향하던 VOC 상선이 남중국해 암초에 부딪혀 침몰했다 — 이후 "난징호 보물"이라는 이름으로 경매에 오르며 유명해졌다.' },
  { id: 'wreck_mombasa_santoantonio', name: '산토안토니우호 난파지', era: '1697년 포르투갈 제국', rarity: 'rare', minSkillLevel: 11, cityId: 'zanzibar',
    coords: project(39.72, -4.06),
    desc: '몸바사 포트지저스 요새를 지키던 포르투갈 보급선이 오만 함대의 포위 속에 항구 어귀에서 격침됐다 — 동아프리카 향신료 무역 패권이 뒤바뀌던 순간의 흔적이다.' },
  { id: 'myth_atlantis', name: '전설의 침몰 대륙', era: '신화(플라톤의 기록)', rarity: 'legendary', minSkillLevel: 14, cityId: 'azores',
    coords: project(-27.50, 36.50),
    desc: '플라톤이 "헤라클레스의 기둥 너머"에 있었다고 전한 침몰한 섬나라 — 실체를 증명할 유적은 없지만, 대서양 한복판 화산섬 지형이 오랫동안 이 전설의 근거로 지목되어 왔다.' },
];

// ---- 지리학(지형·랜드마크) — 실제 지형지물 21곳 + 전설이 깃든 바다 1곳. ----
export const GEOGRAPHY_SITES = [
  { id: 'geo_gibraltar', name: '헤라클레스의 기둥(지브롤터 해협)', era: '지중해와 대서양의 경계', rarity: 'common', minSkillLevel: 1, cityId: 'tanger',
    coords: project(-5.60, 35.95),
    desc: '고대인들은 이 좁은 해협 너머를 "알려진 세계의 끝"이라 여겼다 — 지금은 지중해와 대서양을 잇는 가장 붐비는 뱃길 중 하나다.' },
  { id: 'geo_bosphorus', name: '보스포루스 해협', era: '유럽과 아시아의 경계', rarity: 'common', minSkillLevel: 1, cityId: 'istanbul',
    coords: project(29.02, 41.11),
    desc: '폭이 채 1km도 안 되는 해협 하나가 두 대륙을 가른다 — 흑해와 지중해를 잇는 이 물길을 쥔 자가 곧 두 바다의 무역을 쥐었다.' },
  { id: 'geo_nile_delta', name: '나일강 삼각주', era: '고대 이집트 문명의 요람', rarity: 'common', minSkillLevel: 2, cityId: 'alexandria',
    coords: project(31.20, 31.20),
    desc: '해마다 범람해 비옥한 흙을 실어나른 나일강이 지중해와 만나며 부챗살처럼 펼쳐진 땅 — 이집트 문명 그 자체가 이 삼각주에서 태어났다.' },
  { id: 'geo_finisterre', name: '피니스테레곶(땅끝)', era: '"세상의 끝"이라 불린 곶', rarity: 'common', minSkillLevel: 2, cityId: 'lisboa',
    coords: project(-9.28, 42.88),
    desc: '이름 그대로 "땅의 끝(finis terrae)" — 로마인들은 이 절벽 너머에 더 이상 육지가 없다고 믿었고, 순례자들은 지금도 이곳까지 걸어와 대서양을 마주한다.' },
  { id: 'geo_vesuvius', name: '베수비오 화산', era: '서기 79년 폼페이를 묻은 화산', rarity: 'common', minSkillLevel: 2, cityId: 'napoli',
    coords: project(14.43, 40.82),
    desc: '나폴리만을 내려다보는 이 화산은 서기 79년 대분화로 폼페이와 헤르쿨라네움을 하룻밤 새 화산재 밑에 묻었다 — 지금도 잠들어 있을 뿐, 죽지 않았다.' },
  { id: 'geo_teide', name: '테이데 화산(카나리아 제도)', era: '스페인 제국 최고봉', rarity: 'common', minSkillLevel: 3, cityId: 'canarias',
    coords: project(-16.64, 28.27),
    desc: '대서양 한복판에서 3700m 넘게 솟은 이 화산은 신대륙으로 향하는 선단이 마지막으로 바라보는 유럽 쪽 이정표였다.' },
  { id: 'geo_azores_volcanic', name: '아조레스 화산열도', era: '대서양 중앙해령의 지표', rarity: 'common', minSkillLevel: 3, cityId: 'azores',
    coords: project(-25.66, 37.74),
    desc: '아홉 개의 화산섬이 한 줄로 늘어선 이 열도는, 대서양 밑바닥을 가르는 거대한 해저 산맥(대서양 중앙해령)이 수면 위로 고개를 내민 흔적이다.' },
  { id: 'geo_hormuz', name: '호르무즈 해협', era: '페르시아만의 관문', rarity: 'common', minSkillLevel: 3, cityId: 'hormuz',
    coords: project(56.47, 26.96),
    desc: '페르시아만 전체의 숨통을 쥐고 있는 이 좁은 해협 하나로, 진주와 향신료와 비단이 오르내렸다.' },
  { id: 'geo_doldrums', name: '적도 무풍대(둘드럼)', era: '뱃사람들이 두려워한 바람 없는 바다', rarity: 'common', minSkillLevel: 4, cityId: 'mombasa',
    coords: project(-2.0, 2.0),
    desc: '적도 부근 이 해역에 들어서면 며칠이고 바람 한 점 없이 배가 멈춰 선다 — 식수가 바닥나고 선원들이 미쳐가는 뱃사람들의 악몽 같은 구역이다.' },
  { id: 'geo_monsoon', name: '인도양 계절풍대', era: '고대부터 이어진 무역풍 항로', rarity: 'common', minSkillLevel: 4, cityId: 'calicut',
    coords: project(75.0, 10.0),
    desc: '여름엔 서남쪽에서, 겨울엔 동북쪽에서 반년 주기로 바뀌어 부는 이 바람을 타고, 아랍과 인도 상인들은 나침반 없이도 수천 년째 대양을 오갔다.' },
  { id: 'geo_comorin', name: '코모린곶(인도 최남단)', era: '인도양과 아라비아해의 경계', rarity: 'common', minSkillLevel: 4, cityId: 'colombo',
    coords: project(77.54, 8.08),
    desc: '인도 아대륙이 삼각형으로 뾰족하게 끝나는 이 지점에서 아라비아해와 벵골만, 인도양이 한데 만난다.' },
  { id: 'geo_malacca_strait', name: '믈라카 해협', era: '동서 교역의 병목', rarity: 'common', minSkillLevel: 5, cityId: 'malacca',
    coords: project(100.35, 2.85),
    desc: '가장 좁은 곳은 폭이 2.7km에 불과한 이 해협 하나를 거치지 않고는, 인도와 중국 사이를 오가는 배가 거의 없었다.' },
  { id: 'geo_sunda_strait', name: '순다 해협', era: '자바와 수마트라 사이', rarity: 'common', minSkillLevel: 5, cityId: 'brunei',
    coords: project(105.85, -6.0),
    desc: '믈라카 해협이 막히거나 통행세가 부담스러운 상인들이 택한 우회로 — 크라카타우 화산의 그림자 아래 놓인 또 하나의 관문이다.' },
  { id: 'geo_krakatoa', name: '크라카타우 화산', era: '순다 해협의 화산섬', rarity: 'rare', minSkillLevel: 6, cityId: 'aceh',
    coords: project(105.42, -6.10),
    desc: '훗날(1883년) 사상 최대급 폭발로 섬 자체가 통째로 사라지게 될 이 화산은, 지금도 순다 해협을 오가는 뱃사람들 사이에서 불길한 이야깃거리다.' },
  { id: 'geo_santorini', name: '산토리니 칼데라', era: '미노아 문명을 뒤흔든 화산', rarity: 'rare', minSkillLevel: 6, cityId: 'valletta',
    coords: project(25.40, 36.40),
    desc: '거대한 화산 폭발로 섬 중앙이 통째로 바다 밑으로 꺼지며 생긴 초승달 모양의 만 — 일부 학자들은 이 화산 대분화가 아틀란티스 전설의 실제 원형이라고 본다.' },
  { id: 'geo_fuji', name: '후지산', era: '일본의 영산(靈山)', rarity: 'common', minSkillLevel: 7, cityId: 'osaka',
    coords: project(138.73, 35.36),
    desc: '완벽한 원뿔형 화산으로, 먼바다에서부터 일본 해안에 다가섰음을 알려주는 뱃사람들의 이정표이자 오래도록 신앙의 대상이었다.' },
  { id: 'geo_taiwan_strait', name: '타이완 해협', era: '중국과 타이완 사이', rarity: 'common', minSkillLevel: 7, cityId: 'quanzhou',
    coords: project(119.50, 24.00),
    desc: '취안저우와 광저우의 정크선단이 남중국해로 나가기 전 반드시 지나야 했던 물길 — 계절풍과 태풍이 번갈아 몰아치는 험로로도 악명이 높았다.' },
  { id: 'geo_sundarbans', name: '갠지스 삼각주(순다르반스)', era: '세계 최대의 강 삼각주', rarity: 'common', minSkillLevel: 8, cityId: 'colombo',
    coords: project(89.0, 21.9),
    desc: '갠지스강과 브라마푸트라강이 벵골만과 만나며 만들어낸 세계 최대의 맹그로브 삼각주 — 뱃길이 미로처럼 갈라져 길잡이 없이는 빠져나올 수 없다.' },
  { id: 'geo_scs_reefs', name: '남중국해 산호초 군', era: '동남아 항로의 숨은 암초', rarity: 'common', minSkillLevel: 9, cityId: 'guangzhou',
    coords: project(112.0, 16.0),
    desc: '수면 바로 아래 숨은 산호초와 모래톱이 광대하게 흩어져 있어, 정화(鄭和)의 대함대조차 이 해역을 지날 때는 각별히 신중한 항로를 택했다.' },
  { id: 'geo_good_hope', name: '희망봉', era: '원래 이름은 "폭풍의 곶"', rarity: 'rare', minSkillLevel: 10, cityId: 'cape_town',
    coords: project(18.47, -34.35),
    desc: '바르톨로메우 디아스가 처음 발견했을 땐 "폭풍의 곶"이라 불릴 만큼 사나웠던 이곳을, 주앙 2세가 인도로 가는 희망을 담아 "희망봉"으로 고쳐 불렀다.' },
  { id: 'geo_maelstrom', name: '모스크스트라우멘 소용돌이', era: '북해의 전설적 소용돌이', rarity: 'rare', minSkillLevel: 12, cityId: 'copenhagen',
    coords: project(12.90, 67.85),
    desc: '노르웨이 앞바다 로포텐 제도 사이, 밀물과 썰물이 부딪혀 생기는 거대한 소용돌이 — 옛 지도 제작자들은 이곳을 배를 통째로 삼키는 심연으로 그렸다.' },
  { id: 'geo_sargasso', name: '사르가소해', era: '해류가 만든 "바다 속의 사막"', rarity: 'legendary', minSkillLevel: 15, cityId: 'azores',
    coords: project(-55.0, 30.0),
    desc: '해안선 하나 없이 오직 해류로만 둘러싸인 유일한 바다 — 바람 한 점 없이 모자반 해초만 끝없이 떠다니는 이곳에서, 발이 묶인 범선들이 유령선이 되어 떠돈다는 뱃사람들의 전설이 오래도록 전해진다.' },
];

// ---- 천문학(별자리 — 좌표 없음, 야간+맑은 날씨 조건에서 관측) — 그리스/중국/아랍/폴리네시아
// 등 실제 항해 문화권의 별자리·항해술을 두루 담았다. cityId는 그 전통이 실제로 쓰이던
// 지역의 항구로 배정해, 어느 학문당에서 수락하는지 자체가 그 별자리의 유래를 암시한다. ----
export const ASTRONOMY_ENTRIES = [
  { id: 'star_orion', name: '오리온자리', era: '그리스 신화의 사냥꾼', rarity: 'common', minSkillLevel: 1, cityId: 'venezia',
    desc: '겨울 밤하늘에서 가장 알아보기 쉬운 별자리 — 허리띠를 이루는 세 개의 별이 나란히 늘어서 있어, 초심자도 가장 먼저 찾아내는 이정표다.' },
  { id: 'star_ursa_major', name: '큰곰자리(북두칠성)', era: '북반구 항해의 오랜 길잡이', rarity: 'common', minSkillLevel: 1, cityId: 'venezia',
    desc: '국자 모양 일곱 별로 이루어진 이 별자리는 계절과 무관하게 밤새 북쪽 하늘에 걸려 있어, 나침반이 없던 시절부터 뱃사람들의 방위 기준이었다.' },
  { id: 'star_polaris', name: '작은곰자리와 북극성', era: '진북을 가리키는 유일한 별', rarity: 'common', minSkillLevel: 2, cityId: 'venezia',
    desc: '지구 자전축이 거의 정확히 가리키는 방향에 있어, 밤새 하늘에서 거의 움직이지 않는 유일한 별 — 위도를 재는 데도 그대로 쓰였다.' },
  { id: 'star_scorpius', name: '전갈자리', era: '오리온을 쏘아 죽인 전갈', rarity: 'common', minSkillLevel: 2, cityId: 'venezia',
    desc: '붉은 별 안타레스를 심장 삼아 갈고리 모양 꼬리까지 뚜렷하게 이어지는 여름 별자리 — 그리스 신화에서는 오만한 사냥꾼 오리온을 쏘아 죽인 전갈로 그려진다.' },
  { id: 'star_cassiopeia', name: '카시오페이아자리', era: '허영심 많은 왕비', rarity: 'common', minSkillLevel: 3, cityId: 'marseille',
    desc: '알파벳 W(또는 M) 모양으로 늘어선 다섯 별 — 자신의 미모를 뽐내다 바다의 님프들의 노여움을 산 왕비를 그린다고 전해진다.' },
  { id: 'star_andromeda', name: '안드로메다자리', era: '바다 괴물에게 바쳐진 공주', rarity: 'common', minSkillLevel: 3, cityId: 'marseille',
    desc: '카시오페이아의 딸로, 어머니의 오만함에 대한 벌로 바다 괴물의 제물로 바쳐졌다가 페르세우스에게 구출된 공주의 이름을 땄다.' },
  { id: 'star_perseus', name: '페르세우스자리', era: '메두사를 처치한 영웅', rarity: 'common', minSkillLevel: 4, cityId: 'marseille',
    desc: '메두사의 머리를 베고 돌아오던 길에 안드로메다를 구했다는 영웅의 별자리 — 매년 8월 이 별자리 방향에서 유성우가 쏟아진다.' },
  { id: 'star_cygnus', name: '백조자리(북십자성)', era: '여름 밤하늘의 큰 십자가', rarity: 'common', minSkillLevel: 4, cityId: 'marseille',
    desc: '긴 목과 날개를 활짝 편 모습이 십자가처럼 보여 "북십자성"이라고도 불린다 — 은하수를 가로질러 날아가는 모습으로 그려진다.' },
  { id: 'star_lyra', name: '거문고자리', era: '오르페우스의 리라', rarity: 'common', minSkillLevel: 5, cityId: 'venezia',
    desc: '밝은 별 베가를 품은 작은 별자리 — 저승까지 내려가 아내를 되찾으려 했던 악사 오르페우스가 연주하던 리라를 형상화했다.' },
  { id: 'star_pegasus', name: '페가수스자리', era: '메두사의 피에서 태어난 천마', rarity: 'common', minSkillLevel: 5, cityId: 'venezia',
    desc: '커다란 사각형 몸통이 특징인 가을 별자리 — 메두사가 죽으며 흘린 피에서 태어났다는 날개 달린 천마의 이름을 땄다.' },
  { id: 'star_draco', name: '용자리', era: '헤스페리데스의 정원을 지키던 용', rarity: 'common', minSkillLevel: 6, cityId: 'marseille',
    desc: '북극성 주위를 구불구불 휘감듯 뻗어나가는 긴 별자리 — 황금 사과나무를 지키다 헤라클레스에게 처치된 용 라돈의 이름으로 전해진다.' },
  { id: 'star_taurus', name: '황소자리', era: '제우스가 변신한 흰 황소', rarity: 'common', minSkillLevel: 6, cityId: 'venezia',
    desc: '붉은 별 알데바란이 황소의 눈동자를 이루는 별자리 — 페니키아 공주 에우로파를 등에 태우고 바다를 건넌 제우스의 변신이라 전해진다.' },
  { id: 'star_leo', name: '사자자리', era: '헤라클레스가 처치한 네메아의 사자', rarity: 'common', minSkillLevel: 7, cityId: 'marseille',
    desc: '낫 모양으로 이어지는 별들이 사자의 갈기를 그린다 — 화살도 뚫지 못하는 가죽을 가졌다는 네메아의 사자를 형상화했다.' },
  { id: 'star_sagittarius', name: '궁수자리', era: '은하수 중심을 겨누는 반인반마', rarity: 'common', minSkillLevel: 7, cityId: 'istanbul',
    desc: '주전자 모양으로도 불리는 이 별자리 방향에 우리 은하의 중심이 자리한다 — 활을 겨눈 반인반마 켄타우로스의 모습으로 그려진다.' },
  { id: 'star_crux', name: '남십자자리', era: '남반구 항해의 나침반', rarity: 'rare', minSkillLevel: 8, cityId: 'cape_town',
    coordsHint: 'southern',
    desc: '북반구에서는 보이지 않는 이 작은 십자 모양 별자리는, 희망봉을 돈 뱃사람들에게 북극성을 대신해 남쪽 방위를 알려주는 유일한 이정표가 됐다.' },
  { id: 'star_centaurus', name: '켄타우루스자리', era: '남반구의 거대 별자리', rarity: 'common', minSkillLevel: 9, cityId: 'cape_town',
    desc: '남십자자리를 감싸듯 넓게 펼쳐진 별자리 — 그 안의 알파성(센타우루스자리 알파)은 태양계에서 가장 가까운 항성계로도 알려져 있다.' },
  { id: 'star_canopus', name: '노인성(카노푸스)', era: '아랍·인도양 항해자의 길잡이별', rarity: 'rare', minSkillLevel: 9, cityId: 'hormuz',
    desc: '밤하늘에서 두 번째로 밝은 이 별은 남쪽 수평선 가까이에서만 보인다 — 계절풍을 타고 인도양을 오가던 아랍 항해자들은 이 별의 높이로 자신의 위도를 가늠했다.' },
  { id: 'star_argo_navis', name: '아르고자리', era: '전설의 배, 아르고호', rarity: 'rare', minSkillLevel: 10, cityId: 'cape_town',
    desc: '이아손과 아르고나우타이가 황금 양털을 찾아 떠났던 전설의 배를 본뜬, 밤하늘에서 가장 거대했던 별자리 — 훗날 너무 커서 여러 조각으로 나뉘었다.' },
  { id: 'star_azure_dragon', name: '동방청룡(청룡 칠수)', era: '중국 사신(四神) 중 동방의 수호신', rarity: 'common', minSkillLevel: 10, cityId: 'guangzhou',
    desc: '중국 전통 천문학은 하늘을 사방으로 나눠 각각 신수를 배정했다 — 봄철 동쪽 하늘에 떠오르는 별자리 무리를 용의 몸통으로 이어 그렸다.' },
  { id: 'star_carina', name: '용골자리', era: '아르고자리에서 갈라진 배의 밑동', rarity: 'common', minSkillLevel: 11, cityId: 'cape_town',
    desc: '거대했던 아르고자리를 나누면서 배의 용골(밑바닥 뼈대) 부분만 따로 떼어 만든 별자리 — 하늘에서 두 번째로 밝은 별 카노푸스를 품고 있다.' },
  { id: 'star_white_tiger', name: '서방백호(백호 칠수)', era: '중국 사신 중 서방의 수호신', rarity: 'common', minSkillLevel: 11, cityId: 'guangzhou',
    desc: '가을철 서쪽 하늘의 별자리 무리를 호랑이의 형상으로 이어 그린 것 — 청룡과 대칭을 이루며 계절의 순환을 하늘에 새겼다.' },
  { id: 'star_vermilion_bird', name: '남방주작(주작 칠수)', era: '중국 사신 중 남방의 수호신', rarity: 'common', minSkillLevel: 12, cityId: 'quanzhou',
    desc: '여름철 남쪽 하늘에 걸리는 별자리 무리 — 불사조를 닮은 붉은 새의 모습으로 그려져, 뱃사람들에게는 남쪽 계절풍이 바뀔 시기를 알리는 신호이기도 했다.' },
  { id: 'star_black_tortoise', name: '북방현무(현무 칠수)', era: '중국 사신 중 북방의 수호신', rarity: 'common', minSkillLevel: 13, cityId: 'busan',
    desc: '겨울철 북쪽 하늘의 별자리 무리를 뱀이 휘감은 거북의 모습으로 그렸다 — 조선의 항해자들도 이 별자리로 한겨울 북쪽 방위를 가늠했다.' },
  { id: 'star_pleiades', name: '묘성(플레이아데스)', era: '태평양 항해자들의 새해 별', rarity: 'legendary', minSkillLevel: 15, cityId: 'brunei',
    desc: '좀생이별이라고도 불리는 이 자그마한 성단이 새벽 동쪽 하늘에 떠오르는 날을, 태평양의 항해자들은 한 해의 시작으로 삼고 먼바다로 카누를 띄웠다 — 나침반도 지도도 없이 오직 별과 파도의 결만으로 대양을 건너던 항해술의 정수다.' },
];

const SITE_LISTS = { archaeology: ARCHAEOLOGY_SITES, geography: GEOGRAPHY_SITES, astronomy: ASTRONOMY_ENTRIES };

export function getSiteList(category) {
  return SITE_LISTS[category] || [];
}

export function getSite(category, id) {
  return getSiteList(category).find((s) => s.id === id);
}

// 좌표(위경도)를 게임 내 좌표로 변환해두는 헬퍼 — 데이터 정의 시 project(lon, lat)로 바로 쓴다.
export { project };
