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

// ---- 전역 툴팁 표시(이벤트 위임) ----
// .tip-box 자체는(위 마크업 그대로) 항상 display:none이라 화면에 안 보인다 — 실제로 보이는
// 건 body 최상위에 하나뿐인 #global-tooltip이다. 마우스가 .item-tip 위에 올라오면 그 안의
// .tip-box innerHTML을 그대로 복사해 #global-tooltip에 넣고, getBoundingClientRect()로 잰
// 화면 좌표에 position:fixed로 띄운다. fixed는 뷰포트 기준이라 부모가 overflow-y:auto인
// 스크롤 목록(시장 60종·건조 탭 21행 등) 안에 있어도 절대 잘리지 않는다 — 예전 순수 CSS
// :hover 방식은 부모의 overflow가 x축까지 함께 클리핑해버려 스크롤된 아래쪽 행에서는
// 툴팁이 그냥 안 보이는 문제가 있었다.
let tooltipEl = null;
let activeAnchor = null;

function positionTooltip(anchor) {
  const rect = anchor.getBoundingClientRect();
  const margin = 8;
  tooltipEl.style.left = '0px';
  tooltipEl.style.top = '0px';
  const tw = tooltipEl.offsetWidth;
  const th = tooltipEl.offsetHeight;
  let left = rect.left;
  let top = rect.bottom + margin;
  if (left + tw > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - margin - tw);
  if (left < margin) left = margin;
  if (top + th > window.innerHeight - margin) top = rect.top - th - margin;
  if (top < margin) top = margin;
  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
}

function showTip(anchor) {
  const box = anchor.querySelector(':scope > .tip-box');
  if (!box) return;
  activeAnchor = anchor;
  tooltipEl.innerHTML = box.innerHTML;
  tooltipEl.classList.add('tip-visible');
  positionTooltip(anchor);
}

function hideTip() {
  activeAnchor = null;
  tooltipEl.classList.remove('tip-visible');
}

export function initTooltips() {
  if (tooltipEl) return; // 중복 초기화 방지
  tooltipEl = document.getElementById('global-tooltip');
  if (!tooltipEl) return;
  document.addEventListener('mouseover', (e) => {
    const anchor = e.target.closest('.item-tip');
    if (anchor) showTip(anchor);
  });
  document.addEventListener('mouseout', (e) => {
    const anchor = e.target.closest('.item-tip');
    if (anchor && anchor === activeAnchor && !anchor.contains(e.relatedTarget)) hideTip();
  });
  // 패널이 다시 그려지며(innerHTML 교체) 지금 보고 있던 .item-tip 자체가 사라지는 경우 —
  // 다음 프레임에 확인해 이미 문서에서 떨어져 나갔다면 정리한다.
  document.addEventListener('scroll', () => {
    if (activeAnchor && !activeAnchor.isConnected) hideTip();
  }, true);
}
