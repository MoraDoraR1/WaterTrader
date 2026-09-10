// 인게임 "선장의 수첩" — 별도 웹 아티팩트로 배포된 전체 가이드의 요약판을 게임 안에서
// 그대로 열람할 수 있게 한다. 우측 상단 헤더의 📔 버튼(또는 다른 패널이 닫혀 있을 때
// 언제든)으로 연다. 항해 도감(compendiumPanel.js)과 같은 탭 전환 패턴을 쓰되, 콘텐츠가
// 순수 정적 텍스트라 hud.js의 공용 행 렌더러 대신 직접 innerHTML을 채운다.
import { hud } from './hud.js';

const TABS = [
  { id: 'start', label: '시작하기', html: `
    <h4>이 게임의 목표</h4>
    <p>이 게임에는 엔딩이 없습니다. <b>교역·모험·전투·악명</b> 네 축이 각자 독립적으로 쌓이고, 각 축마다 칭호가 붙습니다. 세 항로를 모두 개척한 뒤 나타나는 전설의 해적을 잡는 것이 사실상 가장 도전적인 목표지만, 몇 번이고 반복할 수 있습니다.</p>
    <h4>게임의 두 화면</h4>
    <p><b>바다 씬</b> — 배를 조종해 항해합니다. 항구·해적선·상선에 다가가 상호작용하거나 전투를 겁니다.</p>
    <p><b>도시 씬</b> — 항구에 정박하면 전환됩니다. 캐릭터를 걸어서 시장·조선소·의뢰 게시판·은행 NPC에게 다가가 말을 겁니다.</p>
    <h4>처음 30분</h4>
    <ol>
      <li>리스본에서 시작 — <span class="g-key">F</span>로 시장 상인과 대화, 포르투갈산 포도주를 사서 인근 항구로 실어 팔아 첫 자금을 불립니다.</li>
      <li>바다의 잡몹 해적선을 클릭해 "전투" → <span class="g-key">Space</span>로 포격해 격침하면 골드·교역품을 얻습니다.</li>
      <li>항구 의뢰 게시판에서 배달 의뢰를 받아 남는 화물칸을 채웁니다.</li>
      <li>돈이 모이면 조선소에서 더 크고 빠른 배로 갈아타고, 항로 개척 의뢰(3부작)로 잠긴 항로를 엽니다.</li>
      <li>우측 상단 🎖 버튼(또는 <span class="g-key">V</span>)으로 칭호와 진행도를 언제든 확인하세요.</li>
    </ol>
  ` },
  { id: 'controls', label: '조작법', html: `
    <h4>이동</h4>
    <p><b>바다에서</b>: <span class="g-key">W</span>를 누르고 있으면 가속, <span class="g-key">S</span>를 누르고 있으면 감속·후진 — 홀드하는 동안 계속 속도가 바뀝니다. <span class="g-key">A</span>/<span class="g-key">D</span>로 좌우 조향(순풍·역풍의 영향을 받음).<br><b>항구에서</b>: 캐릭터를 4방향으로 이동.</p>
    <p><span class="g-key">Space</span> — 바다 전투 중 누르고 있으면 현측 포격 지속. 백병전 중에는 연타할수록 유리합니다.</p>
    <h4>상호작용 &amp; 메뉴</h4>
    <p><span class="g-key">F</span> 정박·승선/대화 · <span class="g-key">E</span> 화물칸(🎒 버튼) · <span class="g-key">M</span> 전체 지도(🗺️ 버튼, 열린 상태에서 ◀▶로 지역 전환) · <span class="g-key">T</span> 선박 정보(🚢 버튼) · <span class="g-key">V</span> 칭호(🎖 버튼) · <span class="g-key">K</span> 스킬 패널(📯 버튼) · <span class="g-key">C</span> 항해 도감(📖 버튼) · <span class="g-key">R</span> 바다 위 응급 수리 · <span class="g-key">Esc</span> 열린 창 전부 닫기</p>
    <p>이 6개 패널(화물칸·지도·선박정보·스킬·도감·칭호)은 이제 키보드뿐 아니라 <b>화면 우측 상단의 아이콘 버튼</b>으로도 마우스만으로 열고 닫을 수 있습니다 — 같은 버튼을 다시 누르면 닫힙니다.</p>
    <h4>스킬 &amp; 도감</h4>
    <p><span class="g-key">1</span>~<span class="g-key">9</span> 퀵슬롯 스킬 시전 · <span class="g-key">G</span> 유적/지형 조사 또는 야간 별자리 관측</p>
  ` },
  { id: 'sailing', label: '항해와 날씨', html: `
    <h4>날씨</h4>
    <p><b>폭풍 · 순풍</b> — 바람을 등지고 달리면 최대 +25% 속도, 대신 선체 내구도가 초당 소량 깎입니다.</p>
    <p><b>폭풍 · 역풍</b> — 정면으로 거스르면 속도 이득 없이 선체 손상만 더 큽니다.</p>
    <p><b>안개</b> — 해적의 탐지·추격 거리와 내 포격 사거리가 함께 줄어듭니다.</p>
    <p><b>좋은 날씨</b> — 폭풍·안개가 없으면 선체·사기가 아주 천천히 저절로 회복됩니다.</p>
    <p><b>벼락</b> — 아주 심한 폭풍에서만 낮은 확률로 발동하는 목돈 피해. 완전히 피할 수 없는 순수 확률 위험입니다.</p>
  ` },
  { id: 'trade', label: '교역', html: `
    <h4>구매는 원산지에서만</h4>
    <p>각 품목은 실제 역사적 산지(전 세계 최저가 대비 +30% 이내 항구)에서만 <b>구매</b>할 수 있습니다. 리스본·세비야 같은 중계 무역항에서는 그 품목을 살 수 없습니다 — 구매 버튼이 "원산지 아님"으로 비활성화됩니다. <b>판매</b>는 원산지 여부와 무관하게 어디서든 가능합니다.</p>
    <h4>가격 3중 레이어 + 거리 프리미엄</h4>
    <p>공급·수요, 5항해일 시세 사이클, 도시 대호황/대폭락에 더해 <b>원산지 거리 프리미엄</b>이 있습니다 — 그 품목의 <b>가장 가까운 원산지</b>에서 멀수록 매도가 상한선이 높아집니다(최대 원산지 매입가의 3배). 원산지 바로 옆에서 되팔면 남는 게 거의 없어, "가까운 원산지 하나 끼고 단거리 왕복"으로 큰돈을 버는 지름길은 막혀 있습니다.</p>
    <h4>구매 탭 / 판매 탭</h4>
    <p>시장 창은 <b>구매</b>·<b>판매</b> 두 탭으로 나뉩니다. 구매 탭엔 이 항구가 원산지인 품목만, 판매 탭엔 지금 화물칸에 있는 품목만 나옵니다.</p>
    <h4>한정 재고</h4>
    <p>품목마다 실제로 파는 물량이 유한합니다. 다 사면 품절되고 5~10항해일 후 재입고됩니다.</p>
  ` },
  { id: 'combat', label: '전투', html: `
    <h4>교전의 흐름</h4>
    <ol>
      <li>대상 클릭 → "전투" 선택 → 근접하면 <span class="g-key">Space</span>로 현측 포격.</li>
      <li>내구도가 낮아지면 백병전(승선전) 전환 — <span class="g-key">Space</span> 연타.</li>
      <li>승리 시 격침 — 골드·지역 교역품·확률적 건조 재료를 얻고 전투 명성이 오릅니다.</li>
    </ol>
    <h4>해적의 4단계</h4>
    <p><b>잡몹</b>(격침 후 소멸, 일부만 리스폰) → <b>엘리트</b>(3항해일 리스폰, 부활마다 +25% 무한 누적, 참나무 드랍) → <b>보스</b>(10항해일 리스폰, 철갑판 확정) → <b>레전더리</b>(세 항로 완주 후 등장, 로열 포춘호의 파편 드랍).</p>
    <h4>🚩 상단 · ⚓ 해군</h4>
    <p>상단 격침 시 교역품 대량 노획 + 악명 상승. 악명이 있으면 해군 사거리 안에서 강제 교전됩니다. 악명은 시간이 지나면 저절로 줄어듭니다.</p>
    <h4>함대(예비 선박)</h4>
    <p>최대 4척(기함 포함)까지 보유 가능. 예비 선박은 전투 중 4.5초마다 자동으로 보조 사격(발당 10 데미지, 사거리 90)하지만, 부품 장착과 응급 수리(R·항구 수리)는 모두 <b>지금 조종 중인 배</b>에만 적용됩니다 — 예비 선박을 고치거나 꾸미려면 함대 탭에서 먼저 기함과 맞바꿔야 합니다. 예비 선박은 hp가 0이 되면 영구히 사라집니다.</p>
  ` },
  { id: 'ships', label: '선박과 조선소', html: `
    <p>조선소에서 <b>구매</b>(골드만 있으면 즉시), <b>건조</b>(구매 불가 최상급 함선 — 골드+전투 재료 필요), <b>부품</b>(대포·장갑판·돛·선체보강 4슬롯) 세 갈래로 배를 늘리고 꾸밉니다.</p>
    <p><b>가격 안내</b>: 초대형선 16종과 조선소 부품 13종은 순수 소득만으로 너무 빨리 최상급 함선을 살 수 있던 문제를 완화하기 위해 가격이 2배로 조정돼 있습니다(재료 요구량은 그대로).</p>
    <p><b>함대</b>: 최대 4척(기함 포함)까지 보유. 함대 탭에서 기함과 예비 선박을 비용 없이 맞바꿀 수 있습니다.</p>
  ` },
  { id: 'skills', label: '스킬과 학문', html: `
    <p>배에 고정된 선박 스킬과 별개로, 선장 개인이 성장하는 숙련도 시스템입니다. 전투 4종·교역 4종·학문 3종(고고학/지리학/천문학) 전부 세계 각지의 스승에게 배워야 쓸 수 있습니다. 만렙 15, 배운 스킬은 퀵슬롯 9칸에 장착해 숫자키로 시전합니다.</p>
    <p>학문은 시전 개념이 없고, <span class="g-key">G</span>로 현장에서 새 유적·지형·별자리를 발견할 때만 숙련도가 오릅니다. 도감(고고학23·지리학22·천문학24) 완주 시 학문마다 3단계 무료 전용 부품이 해금됩니다.</p>
  ` },
  { id: 'titles', label: '명성과 칭호', html: `
    <p>교역·모험·전투·악명 네 축이 완전히 독립적으로 쌓이고, 각 6단계 칭호가 붙습니다. 이미 지나온 낮은 단계도 자유롭게 장착 가능하며, 장착한 칭호는 축에 맞는 소량의 상시 버프를 줍니다(교역=매도가, 모험=이동속도, 전투=피격 감소, 악명=노획량).</p>
    <p>악명 칭호만 예외로, 악명이 문턱 밑으로 가라앉으면 장착 중이어도 즉시 해제됩니다.</p>
  ` },
  { id: 'reference', label: '빠른 참고', html: `
    <h4>키 요약</h4>
    <p><span class="g-key">W</span><span class="g-key">A</span><span class="g-key">S</span><span class="g-key">D</span> 이동/조향 · <span class="g-key">Space</span> 포격·백병전 · <span class="g-key">F</span> 상호작용 · <span class="g-key">E</span> 화물칸 · <span class="g-key">M</span> 월드맵 · <span class="g-key">T</span> 선박정보 · <span class="g-key">V</span> 칭호 · <span class="g-key">K</span> 스킬 · <span class="g-key">C</span> 도감 · <span class="g-key">R</span> 응급수리 · <span class="g-key">G</span> 조사/관측 · <span class="g-key">1~9</span> 퀵슬롯 · <span class="g-key">Esc</span> 전체 닫기</p>
    <h4>용어</h4>
    <p><b>두캇</b> 화폐 단위 · <b>항해일자</b> 1항해일=실제 60초 · <b>원산지</b> 그 품목의 실제 산지(구매 가능 항구) · <b>거리 프리미엄</b> 원산지에서 멀수록 높아지는 매도가 상한 · <b>강화</b> 엘리트·보스가 리스폰마다 누적되는 전투력 보정(자정 초기화) · <b>건조 전용</b> 전투 재료 없이는 못 짓는 함선 · <b>함대</b> 최대 4척(기함 포함) 보유, 예비 선박은 자동 보조사격+영구 손실 위험.</p>
  ` },
];

let activeTab = 'start';

function renderTabs() {
  const tabsEl = document.getElementById('guide-tabs');
  tabsEl.innerHTML = TABS.map((t) =>
    `<button type="button" class="sy-tab${t.id === activeTab ? ' active' : ''}" data-guide-tab="${t.id}">${t.label}</button>`
  ).join('');
}

function renderBody() {
  const tab = TABS.find((t) => t.id === activeTab) || TABS[0];
  document.getElementById('guide-body').innerHTML = tab.html;
}

export function setGuideActiveTab(id) {
  if (!TABS.some((t) => t.id === id)) return;
  activeTab = id;
  renderTabs();
  renderBody();
}

export function openGuidePanel() {
  renderTabs();
  renderBody();
  hud.showGuidePanel(true);
}

export function wireGuideTabs() {
  document.getElementById('guide-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-guide-tab]');
    if (btn) setGuideActiveTab(btn.dataset.guideTab);
  });
}
