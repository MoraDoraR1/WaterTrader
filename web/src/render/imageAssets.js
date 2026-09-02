// 나중에 다른 AI로 생성한 이미지를 붙여 넣을 자리 — 구조만 마련해 둔 것으로, 지금은
// 비어 있어 모든 배/캐릭터가 기존처럼 절차적(캔버스 드로잉)으로 그려진다.
//
// 채우는 법(배 기준, render/shipIso.js가 매 프레임 이 목록을 먼저 확인한다):
//   SHIP_IMAGES[shipTypeId] = {
//     image: <Image 또는 캔버스>,  // 가로로 frames장을 이어붙인 스프라이트시트
//     frames: 8,                    // 프레임 수(0번=이물이 화면 "위"를 향한 프레임, 시계방향 순)
//     scale: 0.14,                  // 화면 표시 배율 보정치(이미지 원본 해상도에 맞춰 조절)
//   }
// shipTypeId는 data/ships.js의 SHIP_TYPES 키(예: 'caravel', 'galleon')와 맞춘다 — 선종 단위로
// 그림 하나를 공유하고, 국가색/역할색 같은 디테일은 절차적 오버레이 없이는 표현되지 않으니
// 필요하면 국기 색 배지 등은 이미지 밖(HUD)에서 별도로 얹는 방식을 고려할 것.
//
// 캐릭터도 같은 방식으로 CHARACTER_IMAGES['male'] / CHARACTER_IMAGES['female']에 등록하면
// scenes/cityScene.js가 이 쪽을 우선 사용하도록 나중에 연결하면 된다(현재는 아직 미연결 — 배부터
// 우선 구조를 마련했다).
export const SHIP_IMAGES = {};
export const CHARACTER_IMAGES = {};

// data: URI(또는 일반 URL) 문자열로 이미지를 로드해 위 테이블에 바로 쓸 수 있는 형태로 반환.
// 아티팩트 특성상 외부 URL은 쓸 수 없으므로, 실제로는 base64 data: URI를 넘기게 된다.
export function loadShipImage(shipTypeId, src, frames = 8, scale = 0.14) {
  const img = new Image();
  img.src = src;
  SHIP_IMAGES[shipTypeId] = { image: img, frames, scale };
  return img;
}
