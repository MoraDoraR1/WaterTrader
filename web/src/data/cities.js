// 유럽 항구도시 데이터 — 대항해시대 실존 무역항 기준
// pos: 실제 경위도를 project()로 투영한 바다 맵 [x, z] 좌표 (정박 마커 위치)
//      → 도시 간 상대적 방향/거리감이 실제 유럽 지도와 일치한다.
// built: 상세 3D 도시 씬이 구현된 도시(프로토타입 범위), false면 추후 확장용 마커만 존재
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
  { id: 'london', name: '런던', country: 'EN', pos: project(-0.13, 51.51), built: false,
    desc: '영국 해군과 동인도회사의 본거지.' },
  { id: 'amsterdam', name: '암스테르담', country: 'NL', pos: project(4.90, 52.37), built: false,
    desc: '네덜란드 동인도회사(VOC)의 향신료 무역 허브.' },
  { id: 'hamburg', name: '함부르크', country: 'HAN', pos: project(10.00, 53.55), built: false,
    desc: '한자동맹의 북해·발트해 교역 거점.' },
  { id: 'marseille', name: '마르세유', country: 'FR', pos: project(5.37, 43.30), built: false,
    desc: '프랑스 지중해 무역의 관문.' },
  { id: 'genova', name: '제노바', country: 'IT', pos: project(8.93, 44.41), built: false,
    desc: '지중해 해상 공화국, 금융과 조선의 중심지.' },
  { id: 'venezia', name: '베네치아', country: 'IT', pos: project(12.32, 45.44), built: false,
    desc: '동방 무역으로 번영한 아드리아해의 여왕.' },
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
