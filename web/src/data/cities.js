// 전세계 항구도시 데이터 — 대항해시대 실존 무역항 기준
// pos: 실제 경위도를 project()로 투영한 바다 맵 [x, z] 좌표 (정박 마커 위치)
//      → 도시 간 상대적 방향/거리감이 실제 지구본과 일치한다.
// built: 상세 도시 씬이 구현된 도시. 모든 항목이 true — 마커만 있는 미구현 도시는 없다.
import { project } from './coastline.js';

export const CITIES = [
  {
    id: 'lisboa', name: '리스본', country: 'PT', pos: project(-9.14, 38.72), built: true, layout: 'plaza',
    desc: '대항해시대 개막의 출발점. 인도 항로 개척의 중심 항구.',
    npcs: [
      { role: 'merchant', name: '향신료 상인 조앙', line: '후추와 계피, 좋은 값에 삽니다.' },
      { role: 'shipwright', name: '조선소 기사 미겔', line: '새 배를 건조하거나 수리해드립니다.' },
      { role: 'harbormaster', name: '출항 관리인 안토니오', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '어부 파울로', line: '오늘은 파도가 잔잔하군요.' },
    ],
  },
  {
    id: 'sevilla', name: '세비야', country: 'ES', pos: project(-5.99, 37.39), built: true, layout: 'plaza',
    desc: '스페인 신대륙 무역을 독점한 통상원(Casa de Contratación) 소재지.',
    npcs: [
      { role: 'merchant', name: '은 상인 카를로스', line: '신대륙에서 온 은괴, 관심 있으신가요?' },
      { role: 'shipwright', name: '조선소 기사 디에고', line: '갈레온 건조는 저희 조선소가 최고입니다.' },
      { role: 'harbormaster', name: '항무관 페르난도', line: '통상원의 허가 없이는 신대륙行 항로를 열 수 없습니다.' },
      { role: 'citizen', name: '상인 견습생 루이스', line: '과달키비르 강을 따라 배가 끊이질 않네요.' },
    ],
  },
  {
    id: 'london', name: '런던', country: 'EN', pos: project(-0.13, 51.51), built: true, layout: 'plaza',
    desc: '영국 해군과 동인도회사의 본거지.',
    npcs: [
      { role: 'merchant', name: '모직물 상인 윌리엄', line: '고급 모직물과 주석, 좋은 값에 거래합니다.' },
      { role: 'shipwright', name: '조선소 기사 토마스', line: '전열함 건조라면 저희 조선소가 최고입니다.' },
      { role: 'harbormaster', name: '항구 관리인 리처드', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '부두 노동자 존', line: '템스 강은 오늘도 배로 붐비는군요.' },
    ],
  },
  {
    id: 'amsterdam', name: '암스테르담', country: 'NL', pos: project(4.90, 52.37), built: true, layout: 'plaza',
    desc: '네덜란드 동인도회사(VOC)의 향신료 무역 허브.',
    npcs: [
      { role: 'merchant', name: '동인도 상인 얀', line: '아시아에서 온 비단과 도자기, 최고가에 팝니다.' },
      { role: 'shipwright', name: '조선소 기사 피터', line: '플라위트(fluyt)선 건조는 저희 특기입니다.' },
      { role: 'harbormaster', name: '항구 관리인 헨드릭', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '환전상 코르넬리스', line: '튤립 값이 또 올랐다더군요.' },
    ],
  },
  {
    id: 'hamburg', name: '함부르크', country: 'HAN', pos: project(10.00, 53.55), built: true, layout: 'plaza',
    desc: '한자동맹의 북해·발트해 교역 거점.',
    npcs: [
      { role: 'merchant', name: '한자상인 프리드리히', line: '발트해산 호박과 모피를 취급합니다.' },
      { role: 'shipwright', name: '조선소 기사 하인리히', line: '튼튼한 코게선이라면 맡겨주십시오.' },
      { role: 'harbormaster', name: '항구 관리인 게오르크', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '선원 조합원 콘라트', line: '한자동맹 깃발 아래 교역은 항상 든든하지요.' },
    ],
  },
  {
    id: 'marseille', name: '마르세유', country: 'FR', pos: project(5.37, 43.30), built: true, layout: 'plaza',
    desc: '프랑스 지중해 무역의 관문.',
    npcs: [
      { role: 'merchant', name: '올리브유 상인 자크', line: '프로방스산 올리브유, 향과 품질이 다릅니다.' },
      { role: 'shipwright', name: '조선소 기사 앙투안', line: '지중해를 누빌 튼튼한 배를 지어드립니다.' },
      { role: 'harbormaster', name: '항구 관리인 루이', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '어부 피에르', line: '오늘 아침 그물이 묵직했습니다.' },
    ],
  },
  {
    id: 'genova', name: '제노바', country: 'IT', pos: project(8.93, 44.41), built: true, layout: 'plaza',
    desc: '지중해 해상 공화국, 금융과 조선의 중심지.',
    npcs: [
      { role: 'merchant', name: '비단 상인 로렌초', line: '제노바산 비단, 동방 것 못지않습니다.' },
      { role: 'shipwright', name: '조선소 기사 마르코', line: '갤리선 건조는 제노바가 원조입니다.' },
      { role: 'harbormaster', name: '항구 관리인 파올로', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '환전상 지오반니', line: '제노바 은행가의 신용은 유럽 어디서나 통합니다.' },
    ],
  },
  {
    id: 'venezia', name: '베네치아', country: 'IT', pos: project(12.32, 45.44), built: true, layout: 'plaza',
    desc: '동방 무역으로 번영한 아드리아해의 여왕.',
    npcs: [
      { role: 'merchant', name: '베네치아 상인 안드레아', line: '무라노 유리공예품과 도자기, 진품만 취급합니다.' },
      { role: 'shipwright', name: '아르세날레 조선기사 니콜로', line: '이곳 아르세날레는 유럽에서 가장 빠른 조선소입니다.' },
      { role: 'harbormaster', name: '항구 관리인 자코모', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '곤돌라 사공 필리포', line: '운하도 좋지만 역시 넓은 바다가 그립군요.' },
    ],
  },
  // ---- 대서양 섬(중간 기항지) ----
  {
    id: 'azores', name: '폰타델가다', country: 'PT', pos: project(-25.66, 37.74), built: true, layout: 'waypost',
    desc: '대서양 한가운데 떠 있는 향료 항로의 중간 보급항.',
    npcs: [
      { role: 'merchant', name: '포도주 상인 마누엘', line: '대서양을 건너기 전, 술통은 든든히 채워두시죠.' },
      { role: 'shipwright', name: '조선소 기사 바스코', line: '긴 항해 전 선체 점검은 필수입니다.' },
      { role: 'harbormaster', name: '항구 관리인 이네스', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '등대지기 조제', line: '여기서부턴 몇 주간 육지가 안 보입니다.' },
    ],
  },
  {
    id: 'canarias', name: '라스팔마스', country: 'ES', pos: project(-15.41, 28.10), built: true, layout: 'waypost',
    desc: '신대륙 항로로 떠나는 배들의 마지막 기항지.',
    npcs: [
      { role: 'merchant', name: '설탕 농장주 알론소', line: '이곳 사탕수수 농장에서 갓 짜낸 설탕입니다.' },
      { role: 'shipwright', name: '조선소 기사 라몬', line: '무역풍을 타려면 삭구부터 다시 손봐야죠.' },
      { role: 'harbormaster', name: '항무관 비센테', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '선원 토마스', line: '여기서 서쪽으로 가면 그야말로 망망대해입니다.' },
    ],
  },
  // ---- 지중해 동부·북아프리카 ----
  {
    id: 'alger', name: '알제', country: 'OT', pos: project(3.06, 36.77), built: true, layout: 'bazaar',
    desc: '바르바리 해적의 근거지, 나포한 물자가 헐값에 돌아다니는 항구.',
    npcs: [
      { role: 'merchant', name: '전리품 상인 하산', line: '나포선에서 나온 은괴, 값싸게 넘기겠습니다.' },
      { role: 'shipwright', name: '조선소 기사 유수프', line: '갤리선의 속도라면 저희를 따라올 자가 없습니다.' },
      { role: 'harbormaster', name: '항구 관리인 무라드', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '노잡이 감독 알리', line: '여기선 누구든 뱃삯 대신 노를 저어야 할 수도 있죠.' },
    ],
  },
  {
    id: 'istanbul', name: '이스탄불', country: 'OT', pos: project(28.98, 41.01), built: true, layout: 'bazaar',
    desc: '옛 콘스탄티노플. 육로 향신료길과 비단길이 만나는 제국의 관문.',
    npcs: [
      { role: 'merchant', name: '대상 상인 이브라힘', line: '육로로 들여온 향신료와 비단, 뱃길보다 신선합니다.' },
      { role: 'shipwright', name: '조선소 기사 셀림', line: '금각만의 조선소는 제국 해군의 자랑입니다.' },
      { role: 'harbormaster', name: '항구 관리인 오스만', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '시장 상인 아이셰', line: '보스포루스 해협은 하루도 배가 끊이지 않아요.' },
    ],
  },
  // ---- 아프리카 항로 ----
  {
    id: 'elmina', name: '엘미나', country: 'PT', pos: project(-1.35, 5.08), built: true, layout: 'fortress',
    desc: '황금해안의 포르투갈 무역 요새. 금과 후추가 오가는 항구.',
    npcs: [
      { role: 'merchant', name: '황금 상인 곤살루', line: '이 해안의 이름값을 하는 순도 높은 금입니다.' },
      { role: 'shipwright', name: '조선소 기사 아폰수', line: '적도의 습기는 선체를 빨리 상하게 하니 손질이 중요합니다.' },
      { role: 'harbormaster', name: '요새 관리인 두아르트', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '통역사 카타리나', line: '이곳 교역은 신뢰가 금값보다 중요합니다.' },
    ],
  },
  // ---- 신대륙 ----
  {
    id: 'havana', name: '아바나', country: 'ES', pos: project(-82.38, 23.13), built: true, layout: 'fortress',
    desc: '신대륙의 은 함대가 유럽행 항해 전에 집결하는 항구.',
    npcs: [
      { role: 'merchant', name: '은광 상인 로드리고', line: '포토시에서 온 은괴, 본국보다 훨씬 쌉니다.' },
      { role: 'shipwright', name: '조선소 기사 에스테반', line: '카리브해의 폭풍을 견디는 선체를 지어드립니다.' },
      { role: 'harbormaster', name: '항무관 프란시스코', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '해적 감시병 미겔', line: '이 항로엔 사략선이 들끓으니 조심하십시오.' },
    ],
  },
  {
    id: 'salvador', name: '사우바도르', country: 'PT', pos: project(-38.50, -12.97), built: true, layout: 'colonial',
    desc: '브라질 사탕수수 농장 지대의 중심. 설탕과 카카오의 항구.',
    npcs: [
      { role: 'merchant', name: '설탕 농장주 페드루', line: '갓 정제한 설탕과 카카오, 원산지 가격으로 드립니다.' },
      { role: 'shipwright', name: '조선소 기사 주앙', line: '적도를 넘나드는 배는 용골부터 다르게 짜야 합니다.' },
      { role: 'harbormaster', name: '항구 관리인 마리아', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '농장 감독 안토니우', line: '올해도 사탕수수가 풍작이었지요.' },
    ],
  },
  {
    id: 'new_amsterdam', name: '뉴암스테르담', country: 'NL', pos: project(-74.01, 40.71), built: true, layout: 'colonial',
    desc: '서인도회사가 세운 모피 교역 전초기지.',
    npcs: [
      { role: 'merchant', name: '모피 상인 빌럼', line: '원주민과 거래한 최상급 모피입니다.' },
      { role: 'shipwright', name: '조선소 기사 클라스', line: '겨울 바다를 견딜 튼튼한 배가 필요하시죠.' },
      { role: 'harbormaster', name: '항구 관리인 스타위베산트', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '모피 사냥꾼 얀센', line: '내륙 원주민들과의 거래가 점점 늘고 있습니다.' },
    ],
  },
  // ---- 아시아 항로 ----
  {
    id: 'goa', name: '고아', country: 'PT', pos: project(73.83, 15.30), built: true, layout: 'plaza',
    desc: '포르투갈령 인도의 수도. 후추 무역의 심장부.',
    npcs: [
      { role: 'merchant', name: '후추 상인 라구', line: '이곳에서 나는 후추는 유럽 값의 반값도 안 됩니다.' },
      { role: 'shipwright', name: '조선소 기사 페레이라', line: '계절풍을 타는 항해는 선체 보수가 생명입니다.' },
      { role: 'harbormaster', name: '총독부 관리인 알부케르크', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '향신료 중개상 나라얀', line: '몬순이 오기 전에 거래를 끝내야 합니다.' },
    ],
  },
  {
    id: 'malacca', name: '믈라카', country: 'PT', pos: project(102.25, 2.20), built: true, layout: 'bazaar',
    desc: '향신료 제도로 가는 관문. 동서 교역이 교차하는 해협의 요충지.',
    npcs: [
      { role: 'merchant', name: '정향 상인 탄', line: '말루쿠 제도에서 갓 들어온 정향과 육두구입니다.' },
      { role: 'shipwright', name: '조선소 기사 곤살베스', line: '해협의 급류를 다루려면 조타가 예민해야 합니다.' },
      { role: 'harbormaster', name: '항구 관리인 아이레스', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '통역상 리사이', line: '이 해협에서는 하루에도 수십 개 나라의 배를 봅니다.' },
    ],
  },
  {
    id: 'nagasaki', name: '나가사키', country: 'PT', pos: project(129.87, 32.75), built: true, layout: 'trading_post', barter: true,
    desc: '일본과의 유일한 교역창구. 은과 도자기, 차가 오가는 항구.',
    npcs: [
      { role: 'merchant', name: '은 상인 소에몬', line: '이와미 은산에서 캐낸 은, 순도가 다릅니다.' },
      { role: 'shipwright', name: '조선소 기사 카를루스', line: '남만선(南蛮船)이라 불릴 만큼 튼튼히 지어드립니다.' },
      { role: 'harbormaster', name: '항구 관리인 데지마', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '다인(茶人) 리큐', line: '차 한 잔 나누고 가시겠습니까.' },
    ],
  },
  // ---- 지중해 서부 확장 ----
  {
    id: 'napoli', name: '나폴리', country: 'IT', pos: project(14.27, 40.85), built: true, layout: 'plaza',
    desc: '나폴리 왕국의 수도. 베수비오 화산 아래 지중해 최대급 항구도시.',
    npcs: [
      { role: 'merchant', name: '올리브유 상인 살바토레', line: '캄파니아산 올리브유와 포도주, 맛보고 가시죠.' },
      { role: 'shipwright', name: '조선소 기사 빈첸초', line: '나폴리 조선소는 왕실 함대를 책임집니다.' },
      { role: 'harbormaster', name: '항구 관리인 프란체스코', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '어부 도메니코', line: '베수비오가 조용한 날은 바다도 잔잔하지요.' },
    ],
  },
  {
    id: 'barcelona', name: '바르셀로나', country: 'ES', pos: project(2.17, 41.39), built: true, layout: 'plaza',
    desc: '카탈루냐 지중해 무역의 중심, 모직물과 올리브유가 오가는 항구.',
    npcs: [
      { role: 'merchant', name: '모직물 상인 조르디', line: '카탈루냐산 모직물입니다. 질이 다릅니다.' },
      { role: 'shipwright', name: '조선소 기사 마르크', line: '지중해 무장상선이라면 이곳이 최고죠.' },
      { role: 'harbormaster', name: '항구 관리인 누리아', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '길드 상인 페레', line: '바르셀로나 상인 길드의 역사는 수백 년입니다.' },
    ],
  },
  {
    id: 'porto', name: '포르투', country: 'PT', pos: project(-8.61, 41.15), built: true, layout: 'plaza',
    desc: '도루 강 하구의 포도주 항구 — 이 도시 이름이 곧 그 술의 이름이 되었다.',
    npcs: [
      { role: 'merchant', name: '포도주 상인 이자벨', line: '도루 계곡 포도주, 원산지 가격이라 다른 곳보다 훨씬 쌉니다.' },
      { role: 'shipwright', name: '조선소 기사 누누', line: '카라벨선은 원래 이 근방에서 만들어졌지요.' },
      { role: 'harbormaster', name: '항구 관리인 히카르두', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '포도밭 농부 조제', line: '올해 포도주는 유난히 맛이 좋습니다.' },
    ],
  },
  {
    id: 'bristol', name: '브리스톨', country: 'EN', pos: project(-2.59, 51.45), built: true, layout: 'plaza',
    desc: '잉글랜드 서부의 대서양 관문. 콘월산 주석과 양모의 항구.',
    npcs: [
      { role: 'merchant', name: '주석 상인 에드워드', line: '콘월 광산에서 캐낸 주석, 런던보다 쌉니다.' },
      { role: 'shipwright', name: '조선소 기사 헨리', line: '대서양을 건널 배라면 여기서 지어야죠.' },
      { role: 'harbormaster', name: '항구 관리인 찰스', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '부두 노동자 토머스', line: '에이번 강 조수 차가 커서 정박이 까다롭습니다.' },
    ],
  },
  {
    id: 'copenhagen', name: '코펜하겐', country: 'DK', pos: project(12.57, 55.68), built: true, layout: 'plaza',
    desc: '외레순 해협을 지키는 관세관. 발트해를 드나드는 배는 모두 이곳에 통행세를 낸다.',
    npcs: [
      { role: 'merchant', name: '호박 상인 닐스', line: '발트해산 호박, 함부르크보다 싸게 드립니다.' },
      { role: 'shipwright', name: '조선소 기사 라스무스', line: '해협을 지키는 함대의 배는 저희가 만듭니다.' },
      { role: 'harbormaster', name: '관세관 크리스티안', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '어부 모르텐', line: '순드 해협 통행세 덕에 왕실 곳간이 넉넉하지요.' },
    ],
  },
  {
    id: 'danzig', name: '단치히', country: 'HAN', pos: project(18.65, 54.35), built: true, layout: 'plaza',
    desc: '비스와 강 하구의 곡창 도시. 발트해 호박길의 종착지.',
    npcs: [
      { role: 'merchant', name: '호박 상인 야쿠프', line: '이곳이 호박길의 진짜 종점입니다. 유럽에서 가장 쌉니다.' },
      { role: 'shipwright', name: '조선소 기사 미코와이', line: '발트해 코게선 건조라면 단치히가 원조지요.' },
      { role: 'harbormaster', name: '항구 관리인 파베우', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '곡물상 안제이', line: '폴란드 곡창지대의 밀이 이 강을 따라 내려옵니다.' },
    ],
  },
  // ---- 아프리카 항로 확장 ----
  {
    id: 'tanger', name: '탕헤르', country: 'PT', pos: project(-5.80, 35.78), built: true, layout: 'fortress',
    desc: '지브롤터 해협을 마주보는 포르투갈령 요새 도시.',
    npcs: [
      { role: 'merchant', name: '은 상인 누누', line: '해협을 오가는 배들의 은괴가 이곳에 모입니다.' },
      { role: 'shipwright', name: '조선소 기사 디오구', line: '해협의 조류를 견디는 선체가 필요하시죠.' },
      { role: 'harbormaster', name: '요새 사령관 알바루', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '보초병 마누엘', line: '맑은 날엔 해협 건너 스페인이 보입니다.' },
    ],
  },
  {
    id: 'mombasa', name: '몸바사', country: 'PT', pos: project(39.66, -4.05), built: true, layout: 'fortress',
    desc: '스와힐리 해안의 포르투갈 요새 포르트제수스. 인도양 무역을 감시한다.',
    npcs: [
      { role: 'merchant', name: '황금 상인 조앙', line: '내륙에서 온 금과 후추, 감시가 삼엄한 만큼 값도 정직합니다.' },
      { role: 'shipwright', name: '조선소 기사 페드루', line: '인도양 계절풍은 홍해 쪽과는 또 다릅니다.' },
      { role: 'harbormaster', name: '요새 사령관 카르발류', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '통역사 파티마', line: '스와힐리어와 포르투갈어를 함께 쓰는 항구입니다.' },
    ],
  },
  {
    id: 'luanda', name: '루안다', country: 'PT', pos: project(13.23, -8.84), built: true, layout: 'colonial',
    desc: '남대서양 교역의 거점이 된 포르투갈령 앙골라의 항구.',
    npcs: [
      { role: 'merchant', name: '상아 상인 시망', line: '내륙에서 실어온 상아와 금, 관심 있으신가요.' },
      { role: 'shipwright', name: '조선소 기사 카에타누', line: '적도 항해에 맞는 선체로 손봐드립니다.' },
      { role: 'harbormaster', name: '항구 관리인 로렌수', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '통역사 은징가', line: '이 항구는 대서양 양쪽을 잇는 다리 같은 곳입니다.' },
    ],
  },
  // ---- 신대륙 확장 ----
  {
    id: 'cartagena', name: '카르타헤나', country: 'ES', pos: project(-75.51, 10.39), built: true, layout: 'fortress',
    desc: '신대륙 최강의 성벽 도시. 남미의 금과 은이 모여드는 요새항.',
    npcs: [
      { role: 'merchant', name: '금광 상인 알레한드로', line: '누에바그라나다산 금, 신대륙에서 가장 쌉니다.' },
      { role: 'shipwright', name: '조선소 기사 후안', line: '이 성벽만큼이나 튼튼한 배를 지어드립니다.' },
      { role: 'harbormaster', name: '요새 사령관 디에고', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '수비병 라파엘', line: '해적선이 자주 노리는 항구라 성벽이 늘 분주합니다.' },
    ],
  },
  {
    id: 'veracruz', name: '베라크루스', country: 'ES', pos: project(-96.13, 19.19), built: true, layout: 'fortress',
    desc: '누에바에스파냐로 통하는 관문. 아스테카의 금과 카카오가 실려 나간다.',
    npcs: [
      { role: 'merchant', name: '카카오 상인 마르티나', line: '아스테카 전통의 카카오, 원산지 가격으로 드립니다.' },
      { role: 'shipwright', name: '조선소 기사 로드리고', line: '멕시코만의 허리케인을 견디려면 선체가 튼튼해야죠.' },
      { role: 'harbormaster', name: '항무관 세바스티안', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '짐꾼 미겔', line: '내륙 총독령에서 온 짐수레가 하루 종일 끊이질 않습니다.' },
    ],
  },
  {
    id: 'rio_de_janeiro', name: '리우데자네이루', country: 'PT', pos: project(-43.17, -22.91), built: true, layout: 'colonial',
    desc: '구아나바라 만의 항구. 브라질 사탕수수와 금이 오가는 신흥 식민 도시.',
    npcs: [
      { role: 'merchant', name: '설탕 농장주 카를루스', line: '리우 인근 사탕수수 농장에서 갓 짜낸 설탕입니다.' },
      { role: 'shipwright', name: '조선소 기사 파울루', line: '구아나바라 만은 배를 짓기에 더없이 좋은 지형이죠.' },
      { role: 'harbormaster', name: '항구 관리인 히카르두', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '금 세공사 테레자', line: '내륙에서 금이 발견됐다는 소문이 자자합니다.' },
    ],
  },
  {
    id: 'quebec', name: '퀘벡', country: 'FR', pos: project(-71.21, 46.81), built: true, layout: 'colonial',
    desc: '세인트로렌스 강의 모피 교역 거점. 신프랑스의 심장.',
    npcs: [
      { role: 'merchant', name: '모피 상인 자크', line: '원주민과 거래한 비버 모피, 유럽 어디보다 쌉니다.' },
      { role: 'shipwright', name: '조선소 기사 루이', line: '강 얼음을 견디는 선체를 지어드립니다.' },
      { role: 'harbormaster', name: '총독부 관리인 샹플랭', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '모피 사냥꾼 피에르', line: '겨울이 오기 전에 교역을 끝내야 합니다.' },
    ],
  },
  {
    id: 'boston', name: '보스턴', country: 'EN', pos: project(-71.06, 42.36), built: true, layout: 'colonial',
    desc: '청교도들이 세운 항구. 모피와 목재 교역으로 성장하는 뉴잉글랜드의 중심.',
    npcs: [
      { role: 'merchant', name: '모피 상인 새뮤얼', line: '뉴잉글랜드산 모피와 양모, 보시고 가시죠.' },
      { role: 'shipwright', name: '조선소 기사 존', line: '이곳 목재로 지은 배는 유럽산 못지않습니다.' },
      { role: 'harbormaster', name: '항구 관리인 벤저민', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '목수 조지프', line: '뉴잉글랜드 숲의 목재가 배 만들기엔 최고죠.' },
    ],
  },
  // ---- 아시아 항로 확장 ----
  {
    id: 'calicut', name: '캘리컷', country: 'PT', pos: project(75.78, 11.26), built: true, layout: 'bazaar',
    desc: '말라바르 해안의 향신료 시장. 바스코 다가마가 처음 인도 땅을 밟은 곳.',
    npcs: [
      { role: 'merchant', name: '후추 상인 메논', line: '말라바르 후추입니다. 세상 어디보다 쌉니다 — 여기가 원산지니까요.' },
      { role: 'shipwright', name: '조선소 기사 코레아', line: '몬순을 뚫으려면 삭구부터 점검해야죠.' },
      { role: 'harbormaster', name: '항구 관리인 소자', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '향신료 중개상 라마', line: '자모린 왕의 허가 없이는 큰 거래가 어렵습니다.' },
    ],
  },
  {
    id: 'colombo', name: '콜롬보', country: 'PT', pos: project(79.86, 6.93), built: true, layout: 'trading_post',
    desc: '실론 섬의 계피 산지. 세계에서 가장 향긋한 계피가 이곳에서 난다.',
    npcs: [
      { role: 'merchant', name: '계피 상인 페레라', line: '실론 계피, 진짜 원산지 물건입니다.' },
      { role: 'shipwright', name: '조선소 기사 실바', line: '작은 섬 요새지만 조선 솜씨는 확실합니다.' },
      { role: 'harbormaster', name: '요새 관리인 멘데스', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '계피 채취인 디아스', line: '내륙 산지에서 갓 벗겨낸 계피 껍질입니다.' },
    ],
  },
  {
    id: 'macau', name: '마카오', country: 'PT', pos: project(113.55, 22.20), built: true, layout: 'trading_post', barter: true,
    desc: '명 제국과의 유일한 통상 창구. 좁은 반도에 세운 작은 무역 거점.',
    npcs: [
      { role: 'merchant', name: '비단 상인 유', line: '광저우에서 들여온 비단과 도자기, 차 — 원산지 가격입니다.' },
      { role: 'shipwright', name: '조선소 기사 소자', line: '남중국해를 오가는 배는 여기서 손질하는 게 최고입니다.' },
      { role: 'harbormaster', name: '항구 관리인 카르네이루', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '통역상 아메이', line: '광둥어와 포르투갈어를 함께 쓰는 게 이 항구의 일상이죠.' },
    ],
  },
  {
    id: 'manila', name: '마닐라', country: 'ES', pos: project(120.98, 14.60), built: true, layout: 'bazaar',
    desc: '태평양을 건너는 갈레온 무역의 시발점. 중국 물자와 신대륙 은이 교차한다.',
    npcs: [
      { role: 'merchant', name: '비단 상인 리', line: '중국 정크선이 실어온 비단과 도자기입니다.' },
      { role: 'shipwright', name: '조선소 기사 곤살레스', line: '태평양을 건널 갈레온이라면 이곳 조선소가 최고죠.' },
      { role: 'harbormaster', name: '항무관 오르티스', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '환전상 탄', line: '누에바에스파냐의 은이 갈레온을 타고 이곳에 옵니다.' },
    ],
  },
  {
    id: 'batavia', name: '바타비아', country: 'NL', pos: project(106.85, -6.21), built: true, layout: 'trading_post',
    desc: '향료 제도를 통제하는 동인도회사 총독부. 요새화된 무역 도시.',
    npcs: [
      { role: 'merchant', name: '정향 상인 데커르', line: '말루쿠 정향과 육두구, VOC가 직접 통제하는 만큼 값이 정직합니다.' },
      { role: 'shipwright', name: '조선소 기사 브라우어르', line: '동인도회사 함대의 배는 모두 이곳을 거칩니다.' },
      { role: 'harbormaster', name: '총독부 관리인 쿤', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '향신료 감독관 반 다이크', line: '이 성벽 안에서 향료 제도 전체의 물량을 관리합니다.' },
    ],
  },
  {
    id: 'hormuz', name: '호르무즈', country: 'PT', pos: project(56.47, 26.96), built: true, layout: 'fortress',
    desc: '페르시아만 입구를 틀어쥔 포르투갈 요새. "세상이 반지라면 호르무즈는 그 보석"이라 불렸다.',
    npcs: [
      { role: 'merchant', name: '비단 상인 알리', line: '페르시아 육로로 들여온 비단과 후추입니다.' },
      { role: 'shipwright', name: '조선소 기사 소아레스', line: '만의 무더위 속에서도 선체 관리는 소홀히 할 수 없습니다.' },
      { role: 'harbormaster', name: '요새 사령관 알부케르크 2세', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '진주 채취인 하산', line: '이 만은 진주로도 유명하지만, 향신료가 더 큰 돈이 되지요.' },
    ],
  },
  // ---- 신규 항구 30곳: 동아시아(한국·일본·중국은 물물교환), 동남아, 그리고 나머지 대륙 확장 ----
  // 한국(조선) — hanok 레이아웃(한옥 처마 곡선 지오메트리) + 한복 캐릭터, barter:true(물물교환).
  {
    id: 'busan', name: '부산', country: 'KR', pos: project(129.08, 35.10), built: true, layout: 'hanok', barter: true,
    desc: '조선이 일본과 유일하게 공식 교역을 허가한 왜관(倭館)의 항구.',
    npcs: [
      { role: 'merchant', name: '역관 상인 김만덕', line: '인삼과 청자, 가져오신 물건 가치만큼 맞바꿔 드립니다.' },
      { role: 'harbormaster', name: '왜관 관리 박첨지', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '뱃사공 이서방', line: '대마도에서 온 배가 또 들어왔군요.' },
    ],
  },
  {
    id: 'incheon', name: '제물포', country: 'KR', pos: project(126.63, 37.45), built: true, layout: 'hanok', barter: true,
    desc: '한성으로 통하는 관문 포구. 개항 이후 각국 상선이 드나든다.',
    npcs: [
      { role: 'merchant', name: '객주 최상궁', line: '인삼과 비단, 이곳 물건과 바꿔가시지요.' },
      { role: 'harbormaster', name: '개항장 관리 윤참봉', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '나루터 아낙 순이', line: '한성 가는 길이 여기서 지척입니다.' },
    ],
  },
  // 일본 — 나가사키 데지마 외에 실제 대규모 상업항 두 곳을 더한다. barter:true.
  {
    id: 'osaka', name: '오사카', country: 'JP', pos: project(135.50, 34.65), built: true, layout: 'trading_post', barter: true,
    desc: '"천하의 부엌"이라 불린 일본 상업의 중심. 각지 쌀과 물자가 모인다.',
    npcs: [
      { role: 'merchant', name: '상인 요도야', line: '가져오신 물건, 은과 차로 맞바꿔 드리지요.' },
      { role: 'harbormaster', name: '항구 관리 사토', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '뱃사람 곤베에', line: '요도가와 강을 오가는 배가 하루도 끊이질 않습니다.' },
    ],
  },
  {
    id: 'hakata', name: '하카타', country: 'JP', pos: project(130.40, 33.60), built: true, layout: 'bazaar', barter: true,
    desc: '규슈의 대륙 교역 관문. 옛부터 대륙 문물이 가장 먼저 닿는 항구.',
    npcs: [
      { role: 'merchant', name: '상인 시마즈', line: '아리타 도자기와 차, 값진 물건과 바꿔드립니다.' },
      { role: 'harbormaster', name: '항구 관리 다나카', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '어부 헤이스케', line: '겐카이나다 바다가 오늘은 잔잔하군요.' },
    ],
  },
  // 중국 — 마카오 외에 청·송원대 실제 대외무역 거점 두 곳. barter:true.
  {
    id: 'guangzhou', name: '광저우', country: 'CN', pos: project(113.26, 23.13), built: true, layout: 'bazaar', barter: true,
    desc: '청 제국이 유일하게 허가한 서양 무역항. 십삼행(十三行) 상관이 늘어서 있다.',
    npcs: [
      { role: 'merchant', name: '행상 오병감', line: '비단과 차, 도자기 — 광둥 물건과 바꾸어 가시지요.' },
      { role: 'harbormaster', name: '해관 관리 임씨', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '뱃사공 아창', line: '주강을 오르내리는 삼판선이 강을 가득 메웁니다.' },
    ],
  },
  {
    id: 'quanzhou', name: '취안저우', country: 'CN', pos: project(118.68, 24.90), built: true, layout: 'trading_post', barter: true,
    desc: '송·원대 세계 최대의 항구였던 "자이툰". 옛 영화가 서린 교역 도시.',
    npcs: [
      { role: 'merchant', name: '상인 임씨', line: '이곳 비단과 도자기, 가져오신 물건과 바꿔드립니다.' },
      { role: 'harbormaster', name: '시박사 관리 진씨', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '뱃사람 왕씨', line: '옛날엔 이 항구에 세상 모든 배가 모였다지요.' },
    ],
  },
  // ---- 동남아시아 (현금 교역) ----
  {
    id: 'hoi_an', name: '호이안', country: 'VN', pos: project(108.33, 15.88), built: true, layout: 'bazaar',
    desc: '베트남 중부의 국제무역항. 여러 나라 상관이 나란히 늘어서 있다.',
    npcs: [
      { role: 'merchant', name: '상인 응우옌', line: '비단과 도자기, 원산지 못지않은 값에 드립니다.' },
      { role: 'harbormaster', name: '항구 관리 쩐씨', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '뱃사공 레반', line: '투본 강 하구는 계절풍이 바뀔 때마다 배로 붐빕니다.' },
    ],
  },
  {
    id: 'ayutthaya', name: '아유타야', country: 'SM', pos: project(100.58, 13.55), built: true, layout: 'plaza',
    desc: '샴 왕국의 수도이자 국제무역항. 주석과 쌀이 풍부하다.',
    npcs: [
      { role: 'merchant', name: '상인 프라야', line: '시암산 주석, 좋은 값에 팔고 있습니다.' },
      { role: 'harbormaster', name: '항구 관리 쑤리야', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '뱃사공 아논', line: '차오프라야 강을 따라 온갖 나라 배가 오갑니다.' },
    ],
  },
  {
    id: 'bago', name: '페구', country: 'BU', pos: project(96.20, 16.75), built: true, layout: 'waypost',
    desc: '버마 몬 왕조의 항구. 티크목과 보석 교역으로 이름났다.',
    npcs: [
      { role: 'merchant', name: '상인 마웅', line: '내륙에서 캐낸 금, 값을 후하게 쳐드립니다.' },
      { role: 'harbormaster', name: '항구 관리 우툰', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '뱃사공 코코', line: '우기가 오기 전에 교역을 마쳐야 합니다.' },
    ],
  },
  {
    id: 'aceh', name: '반다르아체', country: 'AC', pos: project(95.32, 5.55), built: true, layout: 'bazaar',
    desc: '수마트라 북단의 이슬람 향신료 왕국. 세계 최대급 후추 산지.',
    npcs: [
      { role: 'merchant', name: '상인 테우쿠', line: '아체산 후추입니다. 캘리컷 못지않게 쌉니다 — 여기도 원산지니까요.' },
      { role: 'harbormaster', name: '항구 관리 스리', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '뱃사공 이스마일', line: '말라카 해협 어귀라 오가는 배가 끊이질 않습니다.' },
    ],
  },
  {
    id: 'brunei', name: '브루나이', country: 'BN', pos: project(114.94, 4.94), built: true, layout: 'waypost',
    desc: '보르네오의 이슬람 술탄국. 물 위에 지은 수상 도시로 유명하다.',
    npcs: [
      { role: 'merchant', name: '상인 아왕', line: '내륙에서 캐낸 사금과 장뇌, 관심 있으신가요.' },
      { role: 'harbormaster', name: '항구 관리 하지', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '뱃사공 유수프', line: '이 도시는 집도 시장도 전부 물 위에 있지요.' },
    ],
  },
  {
    id: 'cebu', name: '세부', country: 'ES', pos: project(123.90, 10.30), built: true, layout: 'colonial',
    desc: '마젤란이 처음 발을 디딘 필리핀 최초의 스페인 거점.',
    npcs: [
      { role: 'merchant', name: '상인 곤살레스', line: '중국 정크선이 실어온 물건, 마닐라보다 싸게 넘깁니다.' },
      { role: 'harbormaster', name: '항무관 델라크루즈', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '선교사 페드로', line: '마젤란 십자가가 아직도 이 자리에 서 있습니다.' },
    ],
  },
  // ---- 유럽 확장 ----
  {
    id: 'antwerp', name: '안트베르펜', country: 'NL', pos: project(4.25, 51.35), built: true, layout: 'plaza',
    desc: '중세~근세 유럽 최대의 상업·금융 도시. 플랑드르 모직물의 중심.',
    npcs: [
      { role: 'merchant', name: '모직물 상인 페터르', line: '플랑드르 모직물과 비단, 이곳이 유럽 최대 시장입니다.' },
      { role: 'harbormaster', name: '항구 관리인 요스', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '환전상 빌럼', line: '스헬더 강 어귀는 유럽 자본이 모이는 곳이지요.' },
    ],
  },
  {
    id: 'stockholm', name: '스톡홀름', country: 'SE', pos: project(18.07, 59.33), built: true, layout: 'plaza',
    desc: '발트해 무역과 스웨덴 철·주석 수출의 거점.',
    npcs: [
      { role: 'merchant', name: '상인 에리크', line: '북방산 주석과 모피, 좋은 값에 넘깁니다.' },
      { role: 'harbormaster', name: '항구 관리인 구스타프', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '어부 라르스', line: '군도 사이 물길이 얼기 전에 서둘러야지요.' },
    ],
  },
  {
    id: 'cadiz', name: '카디스', country: 'ES', pos: project(-6.29, 36.53), built: true, layout: 'fortress',
    desc: '신대륙 은 함대가 입항하는 스페인의 대서양 관문.',
    npcs: [
      { role: 'merchant', name: '은 상인 마누엘', line: '방금 들어온 은 함대의 신대륙산 은괴입니다.' },
      { role: 'harbormaster', name: '항무관 라파엘', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '부두 노동자 호세', line: '함대가 들어오는 날은 항구가 온통 축제 같지요.' },
    ],
  },
  {
    id: 'valletta', name: '발레타', country: 'MT', pos: project(14.51, 35.90), built: true, layout: 'fortress',
    desc: '성 요한 기사단의 지중해 요새 도시. 코르시어(사략선)의 거점.',
    npcs: [
      { role: 'merchant', name: '전리품 상인 조반니', line: '기사단 코르시어가 나포한 물건, 값싸게 넘기겠습니다.' },
      { role: 'harbormaster', name: '요새 관리인 안토니오', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '수비병 카르멜로', line: '대공위 시대의 포위전 흔적이 성벽에 그대로 남아있죠.' },
    ],
  },
  {
    id: 'dubrovnik', name: '두브로브니크', country: 'RG', pos: project(18.11, 42.65), built: true, layout: 'plaza',
    desc: '아드리아해의 독립 상업 공화국 라구사. 발칸 교역의 관문.',
    npcs: [
      { role: 'merchant', name: '상인 이반', line: '발칸 내륙에서 들여온 비단과 포도주입니다.' },
      { role: 'harbormaster', name: '항구 관리인 마린', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '선주 니콜라', line: '베네치아 눈치를 보면서도 독립을 지켜온 도시입니다.' },
    ],
  },
  // ---- 아프리카 확장 ----
  {
    id: 'zanzibar', name: '잔지바르', country: 'OM', pos: project(39.19, -6.16), built: true, layout: 'bazaar',
    desc: '오만 술탄국이 다스리는 인도양 향신료·교역의 중심.',
    npcs: [
      { role: 'merchant', name: '상인 살림', line: '이 섬의 정향입니다. 세상 어디보다 쌉니다 — 여기가 산지니까요.' },
      { role: 'harbormaster', name: '항구 관리인 하미드', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '농장 감독 파라지', line: '섬 전체가 정향나무로 뒤덮여 있지요.' },
    ],
  },
  {
    id: 'alexandria', name: '알렉산드리아', country: 'OT', pos: project(29.92, 31.20), built: true, layout: 'bazaar',
    desc: '지중해와 홍해를 잇는 이집트의 관문. 옛 향신료길의 종착지.',
    npcs: [
      { role: 'merchant', name: '상인 유수프', line: '홍해를 건너온 향신료와 유리공예품입니다.' },
      { role: 'harbormaster', name: '항구 관리인 마흐무드', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '뱃사공 카림', line: '나일 강 삼각주는 예나 지금이나 교역의 요람이지요.' },
    ],
  },
  {
    id: 'cape_town', name: '케이프타운', country: 'NL', pos: project(18.42, -33.92), built: true, layout: 'waypost',
    desc: '희망봉의 VOC 보급기지. 유럽과 아시아 항로의 중간 정박지.',
    npcs: [
      { role: 'merchant', name: '농장주 야코뷔스', line: '이곳 포도밭에서 갓 담근 포도주입니다.' },
      { role: 'harbormaster', name: '항구 관리인 코르넬리스', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '선원 헨드릭', line: '여기서 정비 안 하면 인도양 끝까지 못 갑니다.' },
    ],
  },
  {
    id: 'sao_tome', name: '상투메', country: 'PT', pos: project(6.73, 0.33), built: true, layout: 'colonial',
    desc: '기니만의 적도 섬. 유럽인이 사탕수수를 처음 대규모로 재배한 섬.',
    npcs: [
      { role: 'merchant', name: '농장주 곤살루', line: '이 섬 설탕은 유럽 어디보다도 원산지 값입니다.' },
      { role: 'harbormaster', name: '항구 관리인 바스투', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '농장 감독 이자벨', line: '적도의 더위 속에서도 사탕수수는 잘 자랍니다.' },
    ],
  },
  // ---- 신대륙 확장 ----
  {
    id: 'new_orleans', name: '뉴올리언스', country: 'FR', pos: project(-90.07, 29.95), built: true, layout: 'colonial',
    desc: '미시시피 강 하구의 프랑스령 항구. 모피와 설탕이 오간다.',
    npcs: [
      { role: 'merchant', name: '모피 상인 자크', line: '내륙에서 실어온 모피, 퀘벡 못지않게 쌉니다.' },
      { role: 'harbormaster', name: '항구 관리인 루이', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '뱃사공 앙리', line: '미시시피 강은 대륙 안쪽까지 뱃길이 이어집니다.' },
    ],
  },
  {
    id: 'charleston', name: '찰스턴', country: 'EN', pos: project(-79.93, 32.78), built: true, layout: 'colonial',
    desc: '남부 식민지의 항구. 설탕과 모피 교역으로 성장한 신흥 도시.',
    npcs: [
      { role: 'merchant', name: '농장주 새뮤얼', line: '남부 농장에서 온 설탕과 모피입니다.' },
      { role: 'harbormaster', name: '항구 관리인 윌리엄', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '부두 노동자 토머스', line: '이 항구는 보스턴 못지않게 빠르게 크고 있습니다.' },
    ],
  },
  {
    id: 'callao', name: '카야오', country: 'ES', pos: project(-77.15, -12.05), built: true, layout: 'fortress',
    desc: '페루 부왕령의 관문. 포토시 은이 태평양으로 나가는 길목.',
    npcs: [
      { role: 'merchant', name: '은광 상인 리마', line: '포토시 은광에서 캐낸 은괴, 세상 어디보다 쌉니다 — 여기가 산지니까요.' },
      { role: 'harbormaster', name: '항무관 알바로', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '짐꾼 마르코스', line: '안데스에서 내려온 은 수레가 하루 종일 이어집니다.' },
    ],
  },
  {
    id: 'buenos_aires', name: '부에노스아이레스', country: 'ES', pos: project(-58.37, -34.60), built: true, layout: 'colonial',
    desc: '라플라타 강 하구의 신흥 무역항. 남미 남부 교역의 관문.',
    npcs: [
      { role: 'merchant', name: '상인 디에고', line: '내륙에서 온 은과 모피, 관심 있으신가요.' },
      { role: 'harbormaster', name: '항구 관리인 파블로', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '목동 후안', line: '팜파스 초원의 가죽이 이 항구로 다 모입니다.' },
    ],
  },
  {
    id: 'port_royal', name: '포트로열', country: 'EN', pos: project(-76.84, 17.94), built: true, layout: 'fortress',
    desc: '카리브해 사략선과 해적의 소굴로 악명 높은 항구.',
    npcs: [
      { role: 'merchant', name: '전리품 상인 잭', line: '나포선에서 나온 은괴, 묻지도 따지지도 않고 넘깁니다.' },
      { role: 'harbormaster', name: '항구 관리인 헨리', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '술집 주인 메리', line: '이 항구에서 제일 안전한 곳은 제 술집뿐이지요.' },
    ],
  },
  // ---- 그 외 ----
  {
    id: 'bordeaux', name: '보르도', country: 'FR', pos: project(-1.15, 45.55), built: true, layout: 'plaza',
    desc: '지롱드 강 하구의 포도주 항구. 세계에서 가장 유명한 산지.',
    npcs: [
      { role: 'merchant', name: '포도주 상인 클로드', line: '보르도 포도주입니다. 원산지라 유럽 어디보다 쌉니다.' },
      { role: 'harbormaster', name: '항구 관리인 필리프', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '포도밭 농부 마르셀', line: '올해도 지롱드 강변 포도가 실하게 여물었습니다.' },
    ],
  },
  {
    id: 'leith', name: '리스', country: 'SC', pos: project(-3.17, 55.98), built: true, layout: 'plaza',
    desc: '스코틀랜드 에든버러의 관문항. 양모와 청어 무역이 활발하다.',
    npcs: [
      { role: 'merchant', name: '모직물 상인 던컨', line: '스코틀랜드산 양모와 모피, 좋은 값에 넘깁니다.' },
      { role: 'harbormaster', name: '항구 관리인 앵거스', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '어부 이완', line: '포스 만은 청어 떼로 유명하지요.' },
    ],
  },
  {
    id: 'mozambique_island', name: '모잠비크 섬', country: 'PT', pos: project(40.73, -15.03), built: true, layout: 'waypost',
    desc: '동아프리카 항로의 포르투갈 보급 거점. 인도로 가는 길목.',
    npcs: [
      { role: 'merchant', name: '상인 페드루', line: '내륙에서 온 금, 인도로 가기 전 여기서 거래합니다.' },
      { role: 'harbormaster', name: '요새 관리인 아폰수', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '통역사 마리아', line: '이곳부터는 계절풍을 잘 타야 인도까지 갑니다.' },
    ],
  },
  {
    id: 'muscat', name: '무스카트', country: 'OM', pos: project(58.59, 23.61), built: true, layout: 'fortress',
    desc: '오만 술탄국의 수도. 인도양 서부 교역로의 요충지.',
    npcs: [
      { role: 'merchant', name: '상인 사이드', line: '페르시아산 비단과 후추, 좋은 값에 넘깁니다.' },
      { role: 'harbormaster', name: '요새 사령관 알리', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '뱃사람 라시드', line: '오만 배는 아프리카 해안까지 두루 다닙니다.' },
    ],
  },
];

export function getCity(id) {
  return CITIES.find((c) => c.id === id);
}

export const NPC_ROLE_LABELS = {
  merchant: '교역품 상인',
  shipwright: '조선소 직원',
  harbormaster: '출항 관리인',
  citizen: '주민',
};

export const NPC_ROLE_COLORS = {
  merchant: '#c9a227',
  shipwright: '#7a5230',
  harbormaster: '#2c6e9e',
  citizen: '#6b6b6b',
};
