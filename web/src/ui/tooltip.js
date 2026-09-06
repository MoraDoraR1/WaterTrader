// 공용 "아이템에 마우스 오버 시 설명/효과/획득처를 보여주는 툴팁" 마크업 생성기.
// index.html의 .item-tip/.tip-box CSS(순수 :hover, 별도 JS 이벤트 불필요)가 실제 표시를
// 담당하므로, 여기서는 innerHTML로 삽입될 문자열만 조립한다 — 시장(교역품)·조선소(선박/
// 부품/건조재료)·보급창고(소모품) 등 hud.renderMarket/renderShipyard가 그리는 모든 행에서
// 재사용한다.
//
// meta 필드는 아이템 종류에 따라 라벨을 바꿔 쓴다(예: 교역품은 "효과" 대신 "분류", 건조
// 재료는 "획득처"에 드랍 확률까지 담는 식) — effectLabel/sourceLabel로 문맥에 맞게 조정한다.
export function itemTip(displayLabel, { title, desc, effect, effectLabel = '효과', source, sourceLabel = '획득처' } = {}) {
  if (!desc && !effect && !source) return displayLabel;
  const heading = title || String(displayLabel).replace(/<[^>]*>/g, '');
  let box = `<span class="tip-box"><b>${heading}</b>`;
  if (desc) box += desc;
  if (effect) box += `<span class="tip-effect">${effectLabel}: ${effect}</span>`;
  if (source) box += `<span class="tip-source">${sourceLabel}: ${source}</span>`;
  box += '</span>';
  return `<span class="item-tip">${displayLabel}${box}</span>`;
}
