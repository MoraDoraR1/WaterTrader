// M키 전체 지도(월드맵)에 표시되는 해역 페이지 목록 — 대항해시대 지도책처럼 여러 장으로
// 나눠 넘겨볼 수 있다. 이제 전세계 좌표계를 쓰므로 모든 페이지가 같은 대륙/도시 데이터를
// 공유하고, 페이지마다 화면에 담을 위경도 범위(bounds)만 다르게 잡아 확대해 보여준다
// (첫 페이지 '전체'는 지구본을 펼친 것처럼 전체 항로를 한눈에 보여주는 개요판).
export const WORLD_REGIONS = [
  { id: 'world', name: '전체 항로', subtitle: 'THE WORLD', bounds: { lonMin: -95, lonMax: 138, latMin: -42, latMax: 68 } },
  { id: 'western_europe', name: '서유럽 항로', subtitle: 'WESTERN EUROPE', bounds: { lonMin: -12, lonMax: 16, latMin: 34, latMax: 58 } },
  { id: 'north_baltic', name: '북해·발트해', subtitle: 'NORTH SEA & BALTIC', bounds: { lonMin: -4, lonMax: 30, latMin: 49, latMax: 67 } },
  { id: 'east_mediterranean', name: '지중해·흑해', subtitle: 'MEDITERRANEAN & BLACK SEA', bounds: { lonMin: -6, lonMax: 42, latMin: 29, latMax: 48 } },
  { id: 'west_africa', name: '아프리카 항로', subtitle: 'AFRICAN COAST', bounds: { lonMin: -21, lonMax: 35, latMin: -36, latMax: 34 } },
  { id: 'new_world', name: '신대륙 항로', subtitle: 'THE NEW WORLD', bounds: { lonMin: -92, lonMax: -34, latMin: -26, latMax: 47 } },
  { id: 'indian_ocean', name: '인도양·극동 항로', subtitle: 'INDIAN OCEAN & THE FAR EAST', bounds: { lonMin: 63, lonMax: 133, latMin: -8, latMax: 36 } },
];
