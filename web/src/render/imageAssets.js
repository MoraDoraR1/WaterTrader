// 외부 선박 이미지를 런타임에 연결할 수 있는 선택적 오버라이드 테이블.
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
export const SHIP_IMAGES = {};

// data: URI(또는 일반 URL) 문자열로 이미지를 로드해 위 테이블에 바로 쓸 수 있는 형태로 반환.
// 아티팩트 특성상 외부 URL은 쓸 수 없으므로, 실제로는 base64 data: URI를 넘기게 된다.
export function loadShipImage(shipTypeId, src, frames = 8, scale = 0.14) {
  const img = new Image();
  img.src = src;
  SHIP_IMAGES[shipTypeId] = { image: img, frames, scale };
  return img;
}
