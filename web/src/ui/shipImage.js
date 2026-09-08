const SHIP_ASSET_ROOT = './assets/ships';

// GitHub Pages에서는 정적 WebP 경로를, standalone HTML에서는 build-artifact.mjs가
// 미리 주입한 data URL 사전을 사용한다. 호출부는 두 배포 형식을 구분할 필요가 없다.
export function getShipImageSrc(shipId) {
  return globalThis.__SHIP_IMAGE_DATA__?.[shipId] || `${SHIP_ASSET_ROOT}/${shipId}.webp`;
}

export function getShipImageProps(ship) {
  return {
    imageSrc: getShipImageSrc(ship.id),
    imageAlt: `${ship.name} 선박 이미지`,
  };
}
