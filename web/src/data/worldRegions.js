// M키 전체 지도(월드맵)에 표시되는 해역 목록.
// 현재 구현된 항해 가능 구역은 'western_europe' 하나뿐이며, 나머지는 대항해시대 게임처럼
// 지도가 여러 장으로 나뉘어 있다는 것을 보여주기 위한 미개척 해역 자리표시자(placeholder)이다.
export const WORLD_REGIONS = [
  { id: 'western_europe', name: '서유럽 항로', subtitle: 'WESTERN EUROPE', kind: 'real' },
  { id: 'north_baltic', name: '북해·발트해', subtitle: 'NORTH SEA & BALTIC', kind: 'placeholder' },
  { id: 'east_mediterranean', name: '지중해 동부', subtitle: 'EASTERN MEDITERRANEAN', kind: 'placeholder' },
  { id: 'west_africa', name: '아프리카 서안', subtitle: 'WEST AFRICA', kind: 'placeholder' },
  { id: 'new_world', name: '신대륙 항로', subtitle: 'NEW WORLD', kind: 'placeholder' },
  { id: 'indian_ocean', name: '인도양 항로', subtitle: 'INDIAN OCEAN', kind: 'placeholder' },
];
