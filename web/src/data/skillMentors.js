// 전투/교역 액티브 스킬은 처음부터 갖고 있지 않다 — 각 도시에 자리 잡은 스승(전투)이나
// 스킬북 상인(교역)을 찾아가 골드를 내고 사사해야 비로소 배우게 된다. 전부 처음부터 항해
// 가능한 서유럽·북해·지중해 항로 안에 있어 항로 개척 없이도 돌아다니며 전부 모을 수 있지만,
// 유럽 전역에 흩어져 있어 실제로 그 도시까지 항해해야만 만날 수 있다.
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
];

export function getMentorAt(cityId) {
  return SKILL_MENTORS.find((m) => m.cityId === cityId) || null;
}
