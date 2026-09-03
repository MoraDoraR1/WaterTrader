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
    id: 'nagasaki', name: '나가사키', country: 'PT', pos: project(129.87, 32.75), built: true, layout: 'trading_post',
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
    id: 'macau', name: '마카오', country: 'PT', pos: project(113.55, 22.20), built: true, layout: 'trading_post',
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
