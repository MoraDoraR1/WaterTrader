// 선장 개인 스킬 11종(전투4·교역4·학문3) 전부 처음부터 갖고 있지 않다 — 각 도시에 자리 잡은
// 스승(전투)·스킬북 상인(교역)·학자(학문)를 찾아가 골드를 내고 사사해야 비로소 배우게 된다.
// 전부 처음부터 항해 가능한 서유럽·북해·지중해 항로 안에 있어 항로 개척 없이도 돌아다니며
// 전부 모을 수 있지만, 유럽 전역에 흩어져 있어 실제로 그 도시까지 항해해야만 만날 수 있다.
export const SKILL_MENTORS = [
  { cityId: 'lisboa', mentorName: '상관 조합장 두아르트', role: 'trade', skillId: 'haggling', cost: 500,
    flavor: '"장사꾼이라면 값을 깎고 붙이는 눈치부터 배워야지. 흥정술을 가르쳐주겠네."' },
  { cityId: 'sevilla', mentorName: '보급창 관리인 이네스', role: 'trade', skillId: 'bulk_buying', cost: 700,
    flavor: '"한 번에 많이 사면 값이 낮아지는 법이지. 대량 매입 요령을 알려주지."' },
  { cityId: 'marseille', mentorName: '늙은 항해사 클로드', role: 'trade', skillId: 'route_intel', cost: 900,
    flavor: '"먼 항로일수록 값이 더 붙는다는 걸 아는 자가 드물지. 신항로 정보를 나눠주겠네."' },
  { cityId: 'amsterdam', mentorName: '동인도 상관장 빌럼', role: 'trade', skillId: 'diplomacy', cost: 1100,
    flavor: '"각국 관리들과 잘 지내는 법을 가르쳐주지. 사교술이라네."' },
  { cityId: 'venezia', mentorName: '검술 사범 마르코', role: 'combat', skillId: 'battle_cry', cost: 800,
    flavor: '"승선전은 기세 싸움일세. 병사들의 함성을 이끄는 법을 가르쳐주겠네."' },
  { cityId: 'genova', mentorName: '포술장 로렌초', role: 'combat', skillId: 'rapid_fire_stance', cost: 1000,
    flavor: '"제노바 포병대의 속사 태세, 자네에게 전수해줌세."' },
  { cityId: 'istanbul', mentorName: '해군 교관 데니즈', role: 'combat', skillId: 'evasive_maneuver', cost: 1300,
    flavor: '"오스만 함대의 회피 기동술이지. 맞기 전에 피하는 법부터 배우게."' },
  { cityId: 'hamburg', mentorName: '군의관 프리츠', role: 'combat', skillId: 'combat_medic', cost: 1500,
    flavor: '"전장에서 응급 처치를 할 줄 알면 목숨이 여럿 산다네."' },
  // ---- 학문 3종도 처음부터 갖고 있지 않다 — 이 셋 역시 배워야 조사·관측 자체가 가능해진다 ----
  { cityId: 'napoli', mentorName: '고고학자 에르콜라노', role: 'academic', skillId: 'archaeology', cost: 600,
    flavor: '"이 아래 잠든 옛 도시들 말일세 — 유적을 읽는 법을 가르쳐주지."' },
  { cityId: 'barcelona', mentorName: '지도 제작자 헤라르드', role: 'academic', skillId: 'geography', cost: 600,
    flavor: '"땅의 생김새엔 전부 사연이 있는 법이지. 지리학을 가르쳐주겠네."' },
  { cityId: 'copenhagen', mentorName: '천문학자 소렌센', role: 'academic', skillId: 'astronomy', cost: 700,
    flavor: '"밤하늘의 별자리를 읽을 줄 알아야 진짜 항해사지. 천문학을 가르쳐주지."' },
];

export function getMentorAt(cityId) {
  return SKILL_MENTORS.find((m) => m.cityId === cityId) || null;
}
