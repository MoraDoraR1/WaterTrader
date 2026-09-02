// 전세계 항구도시 데이터 — 대항해시대 실존 무역항 기준
// pos: 실제 경위도를 project()로 투영한 바다 맵 [x, z] 좌표 (정박 마커 위치)
//      → 도시 간 상대적 방향/거리감이 실제 지구본과 일치한다.
// built: 상세 도시 씬이 구현된 도시. 모든 항목이 true — 마커만 있는 미구현 도시는 없다.
import { project } from './coastline.js';

export const CITIES = [
  {
    id: 'lisboa', name: '리스본', country: 'PT', pos: project(-9.14, 38.72), built: true,
    desc: '대항해시대 개막의 출발점. 인도 항로 개척의 중심 항구.',
    npcs: [
      { role: 'merchant', name: '향신료 상인 조앙', line: '후추와 계피, 좋은 값에 삽니다.' },
      { role: 'shipwright', name: '조선소 기사 미겔', line: '새 배를 건조하거나 수리해드립니다.' },
      { role: 'harbormaster', name: '출항 관리인 안토니오', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '어부 파울로', line: '오늘은 파도가 잔잔하군요.' },
    ],
  },
  {
    id: 'sevilla', name: '세비야', country: 'ES', pos: project(-5.99, 37.39), built: true,
    desc: '스페인 신대륙 무역을 독점한 통상원(Casa de Contratación) 소재지.',
    npcs: [
      { role: 'merchant', name: '은 상인 카를로스', line: '신대륙에서 온 은괴, 관심 있으신가요?' },
      { role: 'shipwright', name: '조선소 기사 디에고', line: '갈레온 건조는 저희 조선소가 최고입니다.' },
      { role: 'harbormaster', name: '항무관 페르난도', line: '통상원의 허가 없이는 신대륙行 항로를 열 수 없습니다.' },
      { role: 'citizen', name: '상인 견습생 루이스', line: '과달키비르 강을 따라 배가 끊이질 않네요.' },
    ],
  },
  {
    id: 'london', name: '런던', country: 'EN', pos: project(-0.13, 51.51), built: true,
    desc: '영국 해군과 동인도회사의 본거지.',
    npcs: [
      { role: 'merchant', name: '모직물 상인 윌리엄', line: '고급 모직물과 주석, 좋은 값에 거래합니다.' },
      { role: 'shipwright', name: '조선소 기사 토마스', line: '전열함 건조라면 저희 조선소가 최고입니다.' },
      { role: 'harbormaster', name: '항구 관리인 리처드', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '부두 노동자 존', line: '템스 강은 오늘도 배로 붐비는군요.' },
    ],
  },
  {
    id: 'amsterdam', name: '암스테르담', country: 'NL', pos: project(4.90, 52.37), built: true,
    desc: '네덜란드 동인도회사(VOC)의 향신료 무역 허브.',
    npcs: [
      { role: 'merchant', name: '동인도 상인 얀', line: '아시아에서 온 비단과 도자기, 최고가에 팝니다.' },
      { role: 'shipwright', name: '조선소 기사 피터', line: '플라위트(fluyt)선 건조는 저희 특기입니다.' },
      { role: 'harbormaster', name: '항구 관리인 헨드릭', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '환전상 코르넬리스', line: '튤립 값이 또 올랐다더군요.' },
    ],
  },
  {
    id: 'hamburg', name: '함부르크', country: 'HAN', pos: project(10.00, 53.55), built: true,
    desc: '한자동맹의 북해·발트해 교역 거점.',
    npcs: [
      { role: 'merchant', name: '한자상인 프리드리히', line: '발트해산 호박과 모피를 취급합니다.' },
      { role: 'shipwright', name: '조선소 기사 하인리히', line: '튼튼한 코게선이라면 맡겨주십시오.' },
      { role: 'harbormaster', name: '항구 관리인 게오르크', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '선원 조합원 콘라트', line: '한자동맹 깃발 아래 교역은 항상 든든하지요.' },
    ],
  },
  {
    id: 'marseille', name: '마르세유', country: 'FR', pos: project(5.37, 43.30), built: true,
    desc: '프랑스 지중해 무역의 관문.',
    npcs: [
      { role: 'merchant', name: '올리브유 상인 자크', line: '프로방스산 올리브유, 향과 품질이 다릅니다.' },
      { role: 'shipwright', name: '조선소 기사 앙투안', line: '지중해를 누빌 튼튼한 배를 지어드립니다.' },
      { role: 'harbormaster', name: '항구 관리인 루이', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '어부 피에르', line: '오늘 아침 그물이 묵직했습니다.' },
    ],
  },
  {
    id: 'genova', name: '제노바', country: 'IT', pos: project(8.93, 44.41), built: true,
    desc: '지중해 해상 공화국, 금융과 조선의 중심지.',
    npcs: [
      { role: 'merchant', name: '비단 상인 로렌초', line: '제노바산 비단, 동방 것 못지않습니다.' },
      { role: 'shipwright', name: '조선소 기사 마르코', line: '갤리선 건조는 제노바가 원조입니다.' },
      { role: 'harbormaster', name: '항구 관리인 파올로', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '환전상 지오반니', line: '제노바 은행가의 신용은 유럽 어디서나 통합니다.' },
    ],
  },
  {
    id: 'venezia', name: '베네치아', country: 'IT', pos: project(12.32, 45.44), built: true,
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
    id: 'azores', name: '폰타델가다', country: 'PT', pos: project(-25.66, 37.74), built: true,
    desc: '대서양 한가운데 떠 있는 향료 항로의 중간 보급항.',
    npcs: [
      { role: 'merchant', name: '포도주 상인 마누엘', line: '대서양을 건너기 전, 술통은 든든히 채워두시죠.' },
      { role: 'shipwright', name: '조선소 기사 바스코', line: '긴 항해 전 선체 점검은 필수입니다.' },
      { role: 'harbormaster', name: '항구 관리인 이네스', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '등대지기 조제', line: '여기서부턴 몇 주간 육지가 안 보입니다.' },
    ],
  },
  {
    id: 'canarias', name: '라스팔마스', country: 'ES', pos: project(-15.41, 28.10), built: true,
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
    id: 'alger', name: '알제', country: 'OT', pos: project(3.06, 36.77), built: true,
    desc: '바르바리 해적의 근거지, 나포한 물자가 헐값에 돌아다니는 항구.',
    npcs: [
      { role: 'merchant', name: '전리품 상인 하산', line: '나포선에서 나온 은괴, 값싸게 넘기겠습니다.' },
      { role: 'shipwright', name: '조선소 기사 유수프', line: '갤리선의 속도라면 저희를 따라올 자가 없습니다.' },
      { role: 'harbormaster', name: '항구 관리인 무라드', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '노잡이 감독 알리', line: '여기선 누구든 뱃삯 대신 노를 저어야 할 수도 있죠.' },
    ],
  },
  {
    id: 'istanbul', name: '이스탄불', country: 'OT', pos: project(28.98, 41.01), built: true,
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
    id: 'elmina', name: '엘미나', country: 'PT', pos: project(-1.35, 5.08), built: true,
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
    id: 'havana', name: '아바나', country: 'ES', pos: project(-82.38, 23.13), built: true,
    desc: '신대륙의 은 함대가 유럽행 항해 전에 집결하는 항구.',
    npcs: [
      { role: 'merchant', name: '은광 상인 로드리고', line: '포토시에서 온 은괴, 본국보다 훨씬 쌉니다.' },
      { role: 'shipwright', name: '조선소 기사 에스테반', line: '카리브해의 폭풍을 견디는 선체를 지어드립니다.' },
      { role: 'harbormaster', name: '항무관 프란시스코', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '해적 감시병 미겔', line: '이 항로엔 사략선이 들끓으니 조심하십시오.' },
    ],
  },
  {
    id: 'salvador', name: '사우바도르', country: 'PT', pos: project(-38.50, -12.97), built: true,
    desc: '브라질 사탕수수 농장 지대의 중심. 설탕과 카카오의 항구.',
    npcs: [
      { role: 'merchant', name: '설탕 농장주 페드루', line: '갓 정제한 설탕과 카카오, 원산지 가격으로 드립니다.' },
      { role: 'shipwright', name: '조선소 기사 주앙', line: '적도를 넘나드는 배는 용골부터 다르게 짜야 합니다.' },
      { role: 'harbormaster', name: '항구 관리인 마리아', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '농장 감독 안토니우', line: '올해도 사탕수수가 풍작이었지요.' },
    ],
  },
  {
    id: 'new_amsterdam', name: '뉴암스테르담', country: 'NL', pos: project(-74.01, 40.71), built: true,
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
    id: 'goa', name: '고아', country: 'PT', pos: project(73.83, 15.30), built: true,
    desc: '포르투갈령 인도의 수도. 후추 무역의 심장부.',
    npcs: [
      { role: 'merchant', name: '후추 상인 라구', line: '이곳에서 나는 후추는 유럽 값의 반값도 안 됩니다.' },
      { role: 'shipwright', name: '조선소 기사 페레이라', line: '계절풍을 타는 항해는 선체 보수가 생명입니다.' },
      { role: 'harbormaster', name: '총독부 관리인 알부케르크', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '향신료 중개상 나라얀', line: '몬순이 오기 전에 거래를 끝내야 합니다.' },
    ],
  },
  {
    id: 'malacca', name: '믈라카', country: 'PT', pos: project(102.25, 2.20), built: true,
    desc: '향신료 제도로 가는 관문. 동서 교역이 교차하는 해협의 요충지.',
    npcs: [
      { role: 'merchant', name: '정향 상인 탄', line: '말루쿠 제도에서 갓 들어온 정향과 육두구입니다.' },
      { role: 'shipwright', name: '조선소 기사 곤살베스', line: '해협의 급류를 다루려면 조타가 예민해야 합니다.' },
      { role: 'harbormaster', name: '항구 관리인 아이레스', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '통역상 리사이', line: '이 해협에서는 하루에도 수십 개 나라의 배를 봅니다.' },
    ],
  },
  {
    id: 'nagasaki', name: '나가사키', country: 'PT', pos: project(129.87, 32.75), built: true,
    desc: '일본과의 유일한 교역창구. 은과 도자기, 차가 오가는 항구.',
    npcs: [
      { role: 'merchant', name: '은 상인 소에몬', line: '이와미 은산에서 캐낸 은, 순도가 다릅니다.' },
      { role: 'shipwright', name: '조선소 기사 카를루스', line: '남만선(南蛮船)이라 불릴 만큼 튼튼히 지어드립니다.' },
      { role: 'harbormaster', name: '항구 관리인 데지마', line: '출항하시겠습니까? 우클릭으로 배로 돌아갑니다.' },
      { role: 'citizen', name: '다인(茶人) 리큐', line: '차 한 잔 나누고 가시겠습니까.' },
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
