// 선체 크기(월드 단위) — 이전 3D 메시 빌더가 만들던 hullLen/hullWid 근사치.
// 충돌 반경/포격 기준점/항적 위치 계산에 쓰인다(시각적 스프라이트 크기와는 별개, pixelSprites.js 참고).
export const CLASS_WORLD_SIZE = {
  small: { length: 10, width: 3.6 },
  medium: { length: 16, width: 5 },
  large: { length: 22, width: 6.4 },
  xlarge: { length: 29, width: 8 },
};

export function worldSizeFor(shipDef) {
  return CLASS_WORLD_SIZE[shipDef.class] || CLASS_WORLD_SIZE.medium;
}
