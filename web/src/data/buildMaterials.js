// 건조 재료(화물칸을 차지하지 않는 별도 자원)의 설명/효과/획득처 메타데이터 — 조선소 UI가
// 이 데이터를 이용해 마우스 오버 툴팁을 만든다(ui/shipyardPanel.js materialTip 참고).
// 실제 수치 로직(드랍 확률·수량)은 entities/pirate.js에 있고, 여기는 순수 표시용 텍스트만 담는다.
export const BUILD_MATERIALS = {
  materials: {
    name: '자재',
    desc: '선체 응급 수리와 건조에 두루 쓰이는 목재·철물 등 잡다한 조선 자재.',
    effect: '바다 위 응급 수리 소모품 + 일부 함선의 건조 재료',
    source: '항구에서 구매 · 잡몹/엘리트 해적 격침 시 소량 노획',
  },
  oakTimber: {
    name: '상급 조선용 참나무',
    desc: '오래 묵혀 강도를 높인 고급 원목. 대형·초대형 함선의 골격을 짜는 데 쓰인다.',
    effect: '대형/초대형 함선 건조 재료',
    source: '엘리트 해적 격침 시 60% 확률 드랍',
  },
  ironcladPlating: {
    name: '전설 해적기함의 철갑판',
    desc: '전설적인 해적 기함의 선체를 이루던 보강 철물. 격침한 잔해에서 노획한다.',
    effect: '초대형 함선 건조 재료',
    source: '보스 해적 격침 시 확정 드랍(1~2) · 레전더리 해적은 3~5개로 대폭 상향',
  },
  robertsRelic: {
    name: '로열 포춘호의 파편',
    desc: '레전더리 해적 바르톨로뮤 로버츠의 기함, 로열 포춘호의 잔해에서 수습한 파편. 오직 그 배를 격침해야만 아주 낮은 확률로 얻을 수 있는 희귀 유물.',
    effect: '"바르톨로뮤" 엔드 컨텐츠 함선 3종(심판호·지평선호·보고호)의 필수 건조 재료',
    source: '[레전더리] 바르톨로뮤 로버츠의 로열 포춘호 격침 시 15% 확률 드랍',
  },
};

export function getBuildMaterial(id) {
  return BUILD_MATERIALS[id];
}
