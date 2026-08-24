import * as THREE from 'three';
import { SHIP_CLASSES, COUNTRY_COLORS } from '../data/ships.js';

// 선종(SHIP_TYPES) → 선체 아키타입(실루엣/삭구 스타일). 국가가 아니라 "무슨 배인가"가
// 선체 형태를 결정한다 — 국가는 그 선종을 누가 지을 수 있는지(SHIP_TYPES.nations)만 가른다.
//
// profileMul: halfWidthProfile(7개 z지점) 각 반폭에 곱하는 배율 — 이물~고물 실루엣 자체를 바꾼다.
// beamMul: 전체 선폭, freeboardMul: 선체 전체 높이(건현), castleMul: 선수루/선미루 규모,
// tumbleMul: 텀블홈(상부가 안으로 기우는 정도), lateenMizzen: 미즌 돛대를 라틴세일로,
// simpleRig: 삭구를 단순화(돛 단수 최대 2단), gildLevel: 금박 장식 정도(0~3),
// gaffRig: 사각돛 대신 개프세일(종범) 삭구(스쿠너 전용).
const TYPE_PRESETS = {
  // 캐러벨 — 소형, 라틴세일, 낮은 선루(플러시 데크에 가까움)
  caravel: { profileMul: [0.9, 1, 1, 0.95, 0.85, 0.6, 1], beamMul: 0.85, freeboardMul: 0.78, castleMul: 0.35, tumbleMul: 0.8, lateenMizzen: true, simpleRig: true, gildLevel: 0 },
  // 카락(나오) — 뭉툭하고 둥근 대양 항해선, 중간 규모 선루
  carrack: { profileMul: [1.1, 1.05, 1, 1, 0.95, 0.7, 1], beamMul: 1.05, freeboardMul: 1.0, castleMul: 0.95, tumbleMul: 0.9, lateenMizzen: true, simpleRig: false, gildLevel: 1 },
  // 갈레온 — 화려하고 육중한 표준형, 높은 선루, 미즌 라틴세일 고증
  galleon: { profileMul: [1, 1, 1, 1, 1, 1, 1], beamMul: 1, freeboardMul: 1, castleMul: 1.1, tumbleMul: 1, lateenMizzen: true, simpleRig: false, gildLevel: 2 },
  // 범선(대형 상선/동인도선) — 낮은 건현, 실용적인 간소한 삭구, 완만한 선루
  fullrig: { profileMul: [0.85, 1.08, 1.12, 1.10, 1.05, 0.85, 1], beamMul: 1.02, freeboardMul: 0.88, castleMul: 0.68, tumbleMul: 1.05, lateenMizzen: false, simpleRig: true, gildLevel: 1 },
  // 전열함 — 좁고 높으며 가장 화려하게 장식된 다층 포열 대형 전함
  shipline: { profileMul: [0.9, 0.95, 1, 1, 0.95, 0.7, 1], beamMul: 0.95, freeboardMul: 1.15, castleMul: 1.25, tumbleMul: 1.1, lateenMizzen: false, simpleRig: false, gildLevel: 3 },
  // 스쿠너 — 날렵한 저건현 선체, 개프세일(종범) 위주
  schooner: { profileMul: [0.75, 0.95, 1, 0.97, 0.9, 0.62, 1], beamMul: 0.78, freeboardMul: 0.8, castleMul: 0.28, tumbleMul: 0.75, lateenMizzen: false, simpleRig: true, gildLevel: 0, gaffRig: true },
  // 클리퍼 — 극도로 날렵하고 낮은 선체, 이물이 뾰족하게 빠짐, 돛은 항상 최대 단수
  clipper: { profileMul: [0.55, 0.85, 0.95, 1, 0.98, 0.5, 1], beamMul: 0.76, freeboardMul: 0.76, castleMul: 0.22, tumbleMul: 0.6, lateenMizzen: false, simpleRig: false, gildLevel: 0, forceTallRig: true },
};

// 국가별 조선 특색 — "무슨 배인가"(TYPE_PRESETS) 위에 곱해지는 국가 배율.
// 실제 조선사를 과장해 국가별로 실루엣만 봐도 구분되게 한다(엄밀한 축척 고증이 아니라
// 게임적 과장): 스페인은 화려한 텀블홈/선루, 네덜란드는 극단적인 배불뚝이(플루이트 세율 회피용
// 형태), 잉글랜드는 날렵한 저건현, 한자동맹은 코게선 특유의 밋밋하고 각진 실루엣(텀블홈이
// 작을수록 옆면이 곧게 서서 각져 보인다), 스웨덴은 바사호처럼 과도하게 높고 장식적인 선루,
// 베네치아(IT)는 갤리선 전통의 날렵함, 프랑스는 태양왕풍 화려함.
const NATION_MODIFIERS = {
  PT: { beamMul: 0.95, freeboardMul: 1.0, castleMul: 0.9, tumbleMul: 0.95, gildBonus: 0 },
  ES: { beamMul: 1.05, freeboardMul: 1.05, castleMul: 1.25, tumbleMul: 1.3, gildBonus: 1 },
  EN: { beamMul: 0.92, freeboardMul: 0.85, castleMul: 0.75, tumbleMul: 0.85, gildBonus: -1 },
  NL: { beamMul: 1.25, freeboardMul: 0.9, castleMul: 0.7, tumbleMul: 1.4, gildBonus: -1 },
  HAN: { beamMul: 1.15, freeboardMul: 1.0, castleMul: 0.6, tumbleMul: 0.6, gildBonus: -1 },
  IT: { beamMul: 0.85, freeboardMul: 0.9, castleMul: 1.0, tumbleMul: 1.0, gildBonus: 1 },
  SE: { beamMul: 1.1, freeboardMul: 1.2, castleMul: 1.3, tumbleMul: 1.15, gildBonus: 1 },
  FR: { beamMul: 0.98, freeboardMul: 1.05, castleMul: 1.05, tumbleMul: 1.05, gildBonus: 1 },
};
const DEFAULT_NATION_MOD = { beamMul: 1, freeboardMul: 1, castleMul: 1, tumbleMul: 1, gildBonus: 0 };

// 갤리는 선종 하나에 배 4척뿐이라 TYPE_PRESETS 같은 일반화된 축보다, 각 배의 실제 이름/평판을
// 그대로 반영하는 개별 프리셋이 낫다: "소틸레(가늘고 가벼움)"는 이름 그대로 날렵하게,
// "레알(왕실 기함)"은 레판토 해전 실제 돈 후안 데 아우스트리아 기함처럼 화려하게,
// 갈레아짜 두 척은 육중하고 무장이 앞선 절충형으로 구분한다.
const GALLEY_PRESETS = {
  galea_sottile: { beamMul: 0.82, ornament: 0, canopyMul: 0.75, ramMul: 0.85, pennants: 1 },
  galera_real: { beamMul: 1.0, ornament: 3, canopyMul: 1.35, ramMul: 1.15, pennants: 3 },
  // 갈레아스 실제 자료 기준: 이물에 둥근 갑판을 얹고 그 위에 함포 여러 문을 앞으로 향하게
  // 배치한 "원형 선수루(round forecastle)"가 특징 — bowCastle 플래그로 별도 구조물을 추가한다.
  galeazza_veneziana: { beamMul: 1.1, ornament: 1, canopyMul: 1.1, ramMul: 1.2, pennants: 2, bowCastle: true },
  galeazza_reale: { beamMul: 1.05, ornament: 2, canopyMul: 1.25, ramMul: 1.3, pennants: 3, bowCastle: true },
  // 로마 데케레스 — 화약 이전 시대의 완전히 다른 갤리. HS 올림피아스(고증 복원 트라이림)
  // 참고 사진 기준 재설계: 청동 삼지창형 충각, 이물에 그린 눈(오큘루스) 장식, 위로 솟은
  // 곡선 선수/선미 기둥, 3단으로 겹친 노(트라이림 특유의 실루엣), 라틴세일이 아니라
  // 사각 가로돛, 방향타 대신 고물 양옆의 쌍노(steering oar). ancient 플래그로 별도 분기.
  roman_deceres: { beamMul: 1.05, ornament: 1, canopyMul: 0.5, ramMul: 1.3, pennants: 1, ancient: true, oarBanks: 3 },
};
const DEFAULT_GALLEY_PRESET = { beamMul: 1, ornament: 0, canopyMul: 1, ramMul: 1, pennants: 1, ancient: false, oarBanks: 1, bowCastle: false };

// 사다리꼴 돛 — 밑단을 2차 베지어 곡선으로 살짝 부풀려 바람을 머금은 형태를 낸다.
function trapezoid(topW, botW, h, belly = h * 0.16) {
  const shape = new THREE.Shape();
  shape.moveTo(-topW / 2, h / 2);
  shape.lineTo(topW / 2, h / 2);
  shape.lineTo(botW / 2, -h / 2);
  shape.quadraticCurveTo(0, -h / 2 - belly, -botW / 2, -h / 2);
  shape.lineTo(-topW / 2, h / 2);
  return new THREE.ShapeGeometry(shape, 8);
}

function paintHullColors(geo, hullHei) {
  const below = new THREE.Color('#1c140b'); // 흘수선 아래 — 타르 먹인 짙은 색
  const stripe = new THREE.Color('#d4af5a'); // 흘수선 트림 라인
  const above = new THREE.Color('#96693c'); // 흘수선 위 본 선체(밝은 오크색)
  const posAttr = geo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);
  const tmp = new THREE.Color();
  const waterline = hullHei * 0.34, stripeW = hullHei * 0.08;
  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i);
    if (y < waterline - stripeW) tmp.copy(below);
    else if (y < waterline + stripeW) tmp.copy(stripe);
    else tmp.copy(above);
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

// 라틴세일(삼각돛) — 소형 모험용선 및 이베리아/지중해권 선박의 미즌마스트에 쓰이는 사선 삼각돛
function addLateenRig(group, mastBaseY, mastHeight, mastZ, yardLen) {
  const yard = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, yardLen, 6),
    new THREE.MeshStandardMaterial({ color: '#3b2a18' })
  );
  // 활대/돛의 평면이 뱃전(가로) 방향을 향해야 옆에서 봤을 때 넓은 삼각형으로 보인다.
  // 기존 코드는 이 평면이 선수-선미(세로) 방향을 향해 옆에서 보면 실처럼 얇게 보이는 문제가 있었다.
  const yardCenterY = mastBaseY + mastHeight * 0.68;
  yard.position.set(0, yardCenterY, mastZ);
  yard.rotation.x = 1.15;
  group.add(yard);

  const sailH = mastHeight * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(0, sailH * 0.5);
  shape.lineTo(-yardLen * 0.88, -sailH * 0.32);
  shape.quadraticCurveTo(-yardLen * 0.4, -sailH * 0.58, 0, -sailH * 0.5);
  shape.lineTo(0, sailH * 0.5);
  const geo = new THREE.ShapeGeometry(shape, 8);
  const sail = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#e7ded0', roughness: 0.75, side: THREE.DoubleSide }));
  sail.rotation.y = Math.PI / 2;
  sail.position.set(0, yardCenterY - sailH * 0.05, mastZ + 0.04);
  group.add(sail);
}

export function buildShipMesh(shipDef) {
  // 갤리(노 젓는 배)는 돛대/선루 중심인 다른 선종과 구조 자체가 달라 완전히 별도로 생성한다.
  if (shipDef.type === 'galley') return buildGalleyMesh(shipDef);

  const cls = SHIP_CLASSES[shipDef.class];
  const [sx, sy, sz] = cls.hullScale;
  const role = shipDef.role || 'trade';
  const group = new THREE.Group();
  group.name = `ship_${shipDef.id}`;

  const typePreset = TYPE_PRESETS[shipDef.type] || TYPE_PRESETS.fullrig;
  const natMod = NATION_MODIFIERS[shipDef.country] || DEFAULT_NATION_MOD;
  // 선종(TYPE_PRESETS)이 기본 실루엣을 정하고, 그 위에 국가 배율(NATION_MODIFIERS)을 곱해
  // 같은 갈레온이라도 스페인은 화려하고 육중하게, 잉글랜드는 날렵하게 갈라지게 한다.
  const arch = {
    ...typePreset,
    beamMul: typePreset.beamMul * natMod.beamMul,
    freeboardMul: typePreset.freeboardMul * natMod.freeboardMul,
    castleMul: typePreset.castleMul * natMod.castleMul,
    tumbleMul: typePreset.tumbleMul * natMod.tumbleMul,
    gildLevel: Math.max(0, Math.min(3, typePreset.gildLevel + natMod.gildBonus)),
  };

  // 선체 색상은 국가/커스텀과 무관하게 자연스러운 목재 톤 하나로 통일한다.
  const hullColorLight = new THREE.Color('#6b4526');
  const hullColorDark = hullColorLight.clone().lerp(new THREE.Color('#2e2013'), 0.35);
  const trimColor = new THREE.Color('#e6c15a');
  const deckColor = new THREE.Color('#a3814f');
  const trim = new THREE.Color(COUNTRY_COLORS[shipDef.country] || '#888888'); // 국기색(깃발 전용)
  const rigColor = '#2b2015';

  // 역할별 선체 실루엣 차이 — 교역용은 둥글고 넉넉하게, 모험용은 날렵하게, 전투용은 표준 비율
  const roleHullMul = role === 'trade' ? 1.1 : role === 'adventure' ? 0.94 : 1.0;
  // 라틴세일 단일 돛대는 "소형 모험용선"이라는 조건만으로 걸면 스쿠너/클리퍼처럼 애초에
  // 라틴세일과 무관한 선종까지 걸려든다(실제로 소형 클리퍼가 돛대 3개짜리 라틴세일선이
  // 되어버리는 버그가 있었다). 캐러벨에만 명시적으로 적용한다.
  const useLateen = role === 'adventure' && shipDef.class === 'small' && shipDef.type === 'caravel';

  const hullLen = 10 * sz;
  const hullWid = 3.4 * sx * roleHullMul * arch.beamMul;
  const hullHei = 2.2 * sy * arch.freeboardMul;

  // 갑판을 한 단 낮추고 그 위를 속이 빈 뱃전(불워크)으로 둘러, 갑판이 옴폭 파이고
  // 양옆이 난간처럼 둘러선 형태를 낸다. deckY 아래는 실제 솔리드 선체, 그 위 bulwarkH만큼은
  // 구멍 뚫린 고리 형태 벽이다.
  const deckY = hullHei * 0.44;
  const bulwarkH = hullHei * 0.50;
  const railTopY = deckY + bulwarkH;

  const hw = hullWid / 2;
  const hl = hullLen / 2;

  // ---- 선체 실루엣(위에서 본 평면도) — z별 반폭(half-width) 프로파일 하나를 기준으로
  // 다각형 윤곽선과 이물/고물 곡선을 동시에 도출한다. 아키타입별 profileMul로 나라마다
  // 실루엣 자체(배불뚝이/날렵함/좁고 긺 등)가 달라진다.
  const pm = arch.profileMul;
  const halfWidthProfile = [
    [-hl * 0.97, hw * 0.30 * pm[0]],
    [-hl * 0.72, hw * 0.85 * pm[1]],
    [-hl * 0.40, hw * 0.99 * pm[2]],
    [-hl * 0.02, hw * 0.97 * pm[3]],
    [hl * 0.42, hw * 0.80 * pm[4]],
    [hl * 0.75, hw * 0.45 * pm[5]],
    [hl * 1.00, 0.0005],
  ];
  function halfWidthAt(z) {
    const zc = THREE.MathUtils.clamp(z, halfWidthProfile[0][0], halfWidthProfile[halfWidthProfile.length - 1][0]);
    for (let i = 0; i < halfWidthProfile.length - 1; i++) {
      const [z0, w0] = halfWidthProfile[i];
      const [z1, w1] = halfWidthProfile[i + 1];
      if (zc >= z0 && zc <= z1) {
        const t = (zc - z0) / (z1 - z0);
        const st = t * t * (3 - 2 * t); // smoothstep — 각 기준점 사이를 부드러운 곡선으로 잇는다(직선 보간 대비 각짐 완화)
        return THREE.MathUtils.lerp(w0, w1, st);
      }
    }
    return 0;
  }
  // halfWidthProfile의 7개 기준점만 잇는 대신, 훨씬 촘촘하게 샘플링해 실제 배 사진처럼
  // 매끄럽게 흐르는 뱃전 실루엣을 만든다(저해상도 다각형이 아니라 연속 곡선에 가깝게).
  const SILHOUETTE_SAMPLES = 22;
  const zMin = halfWidthProfile[0][0], zMax = halfWidthProfile[halfWidthProfile.length - 1][0];
  const starboardCurve = [];
  for (let i = 0; i <= SILHOUETTE_SAMPLES; i++) {
    const z = THREE.MathUtils.lerp(zMin, zMax, i / SILHOUETTE_SAMPLES);
    starboardCurve.push([halfWidthAt(z), z]);
  }
  const outline = [
    ...starboardCurve,
    ...[...starboardCurve].slice(0, -1).reverse().map(([w, z]) => [-w, z]),
  ];
  // rotateX(-90°) 매핑은 로컬 y가 곧 -world z가 되므로, 아래 좌표는 (x, -z)로 넣는다.
  const hullShape = new THREE.Shape();
  outline.forEach(([x, z], i) => {
    if (i === 0) hullShape.moveTo(x, -z); else hullShape.lineTo(x, -z);
  });
  hullShape.lineTo(outline[0][0], -outline[0][1]);

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: deckY, bevelEnabled: true, bevelThickness: deckY * 0.12, bevelSize: hw * 0.06, bevelSegments: 2,
  });
  hullGeo.rotateX(-Math.PI / 2);
  paintHullColors(hullGeo, hullHei);
  const hullMesh = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  group.add(hullMesh);

  // 선저(빌지) 테이퍼 — 흘수선 아래 선체가 용골을 향해 둥글게 좁아지는 곡면을 근사한다.
  const bilgeGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: hullHei * 0.22, bevelEnabled: true, bevelThickness: hullHei * 0.04, bevelSize: hw * 0.02, bevelSegments: 3,
  });
  bilgeGeo.rotateX(-Math.PI / 2);
  bilgeGeo.scale(0.4, 1, 0.66);
  bilgeGeo.translate(0, -hullHei * 0.22, 0);
  const bilgeMesh = new THREE.Mesh(bilgeGeo, new THREE.MeshStandardMaterial({ color: '#140d06', roughness: 0.9 }));
  group.add(bilgeMesh);

  // 메인 웨일(wale) — 흘수선 트림 라인을 따라 실제로 튀어나온 두꺼운 몰딩 띠(선체 구조재, 도색과 무관하게 짙은 목재색).
  const waleGeo = new THREE.ExtrudeGeometry(hullShape, { depth: hullHei * 0.09, bevelEnabled: false });
  waleGeo.rotateX(-Math.PI / 2);
  waleGeo.scale(1.035, 1, 1.03);
  waleGeo.translate(0, hullHei * 0.30, 0);
  const waleMesh = new THREE.Mesh(waleGeo, new THREE.MeshStandardMaterial({ color: '#241a10', roughness: 0.85 }));
  group.add(waleMesh);

  // 용골(keel) — 선체 하부 중심을 따라 이물/고물 쪽으로 완만히 휘어 오르는 골재(스템/스턴포스트 곡선 근사).
  const keelY = -hullHei * 0.26;
  const keelCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, hullHei * 0.05, -hl * 0.97),
    new THREE.Vector3(0, keelY * 0.7, -hl * 0.78),
    new THREE.Vector3(0, keelY, 0),
    new THREE.Vector3(0, keelY * 0.7, hl * 0.7),
    new THREE.Vector3(0, hullHei * 0.1, hl * 0.99),
  ]);
  const keelGeo = new THREE.TubeGeometry(keelCurve, 28, Math.max(0.05, hullWid * 0.045), 6, false);
  const keelMesh = new THREE.Mesh(keelGeo, new THREE.MeshStandardMaterial({ color: '#1c140b', roughness: 0.9 }));
  group.add(keelMesh);

  // 스템(이물 기둥) / 스턴포스트(고물 기둥) — 용골이 선수/선미에서 위로 이어지는 골재를
  // 강조해, 참고 도면처럼 "용골 → 스템(뱃머리 곡선)" 구조가 옆에서도 뚜렷이 보이도록 한다.
  // 배가 날렵해 보이는 인상은 대부분 이 이물 곡선이 얼마나 또렷한가에서 온다 — 그래서 짧은
  // 직선 각재 하나가 아니라, 흘수선 부근에서 시작해 선체 윤곽선보다 앞으로 튀어나오며 사장
  // 밑동까지 매끄럽게 휘어 오르는 곡선재(빔헤드/이물 장식대)로 만든다.
  const keelAccentMat = new THREE.MeshStandardMaterial({ color: '#1c140b', roughness: 0.9 });
  const cutwaterCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -hullHei * 0.1, hl * 0.88),
    new THREE.Vector3(0, hullHei * 0.22, hl * 1.03),
    new THREE.Vector3(0, hullHei * 0.6, hl * 1.16),
    new THREE.Vector3(0, railTopY * 0.9, hl * 1.26),
  ]);
  const cutwaterGeo = new THREE.TubeGeometry(cutwaterCurve, 24, Math.max(0.08, hullWid * 0.07), 8, false);
  const cutwaterMesh = new THREE.Mesh(cutwaterGeo, keelAccentMat);
  group.add(cutwaterMesh);
  const sternPostMesh = new THREE.Mesh(new THREE.BoxGeometry(hullWid * 0.06, hullHei * 0.5, hullWid * 0.06), keelAccentMat);
  sternPostMesh.position.set(0, hullHei * 0.02, -hl * 0.98);
  sternPostMesh.rotation.x = 0.12;
  group.add(sternPostMesh);

  // 뱃전(불워크) — 갑판보다 한 단 높은 속이 빈 고리형 난간 벽. 고물 쪽(선미)은 점점 폭을
  // 줄여 거의 사라지게 해(sternPinch), 실제 갈레온처럼 "고물의 벽"이 아니라 선미루(퀀터덱/포프덱)
  // 자체가 고물 구조를 이루도록 한다 — 이렇게 해야 용골/갑판이 뒤에서도 잘 드러난다.
  function sternPinch(pts, startFrac = 0.58, minScale = 0.05) {
    const zStart = -hl * startFrac;
    return pts.map(([x, z]) => {
      if (z > zStart) return [x, z];
      const t = Math.min(1, (z - zStart) / (-hl - zStart));
      const scale = 1 - t * (1 - minScale);
      return [x * scale, z];
    });
  }
  // 상부 선체가 안으로 기울어지는 텀블홈 — 아키타입별로 정도가 다르다(네덜란드/발트가 더 강함).
  const tumbleScale = 1 - (1 - 0.95) * arch.tumbleMul;
  const bulwarkPts = sternPinch(outline).map(([x, z]) => [x * tumbleScale, z]);
  const bulwarkOuter = new THREE.Shape();
  bulwarkPts.forEach(([x, z], i) => {
    if (i === 0) bulwarkOuter.moveTo(x, -z); else bulwarkOuter.lineTo(x, -z);
  });
  bulwarkOuter.lineTo(bulwarkPts[0][0], -bulwarkPts[0][1]);
  // 구멍(hole)은 바깥 윤곽과 반대 방향(역순)으로 감아야 실제로 뚫린 구멍으로 인식된다.
  const bulwarkHole = new THREE.Path();
  const revBulwarkPts = [...bulwarkPts].reverse();
  const holeScale = 0.68;
  revBulwarkPts.forEach(([x, z], i) => {
    const ix = x * holeScale, iz = z * holeScale;
    if (i === 0) bulwarkHole.moveTo(ix, -iz); else bulwarkHole.lineTo(ix, -iz);
  });
  bulwarkHole.lineTo(revBulwarkPts[0][0] * holeScale, -revBulwarkPts[0][1] * holeScale);
  bulwarkOuter.holes.push(bulwarkHole);
  const bulwarkGeo = new THREE.ExtrudeGeometry(bulwarkOuter, {
    depth: bulwarkH, bevelEnabled: true, bevelThickness: bulwarkH * 0.1, bevelSize: hw * 0.02, bevelSegments: 2,
  });
  bulwarkGeo.rotateX(-Math.PI / 2);
  bulwarkGeo.translate(0, deckY, 0);
  const bulwarkMesh = new THREE.Mesh(bulwarkGeo, new THREE.MeshStandardMaterial({ color: hullColorDark, roughness: 0.85 }));
  group.add(bulwarkMesh);

  // 레일 캡 / 웨이스트 레일 — 뱃전과 같은(고물 쪽에서 함께 사라지는) 윤곽을 써서
  // 벽이 얇아지는 고물에서 트림 라인만 붕 떠보이지 않도록 한다. 트림 색은 도색의 금박색을 따른다.
  const railCapGeo = new THREE.ExtrudeGeometry(bulwarkOuter, { depth: hullHei * 0.06, bevelEnabled: false });
  railCapGeo.rotateX(-Math.PI / 2);
  railCapGeo.scale(1.05, 1, 1.04);
  railCapGeo.translate(0, railTopY - hullHei * 0.06, 0);
  const railCap = new THREE.Mesh(railCapGeo, new THREE.MeshStandardMaterial({ color: hullColorLight, roughness: 0.8 }));
  group.add(railCap);

  const waistRailGeo = new THREE.ExtrudeGeometry(bulwarkOuter, { depth: hullHei * 0.075, bevelEnabled: false });
  waistRailGeo.rotateX(-Math.PI / 2);
  waistRailGeo.scale(1.08, 1, 1.05);
  waistRailGeo.translate(0, deckY + bulwarkH * 0.4, 0);
  const waistRail = new THREE.Mesh(waistRailGeo, new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.6 }));
  group.add(waistRail);

  // 시어 레일(sheer line) — 갑판 난간 맨 위 테두리가 이물/고물 쪽으로 갈수록 위로 휘어
  // 오르는 실제 범선 특유의 곡선. 선체 실루엣(halfWidthAt)을 따라가는 3D 곡선 튜브로 표현한다.
  function sheerRiseAt(z) {
    const tb = z / hl;
    const bowRise = Math.pow(Math.max(0, tb), 1.6) * hullHei * 0.22;
    const sternRise = Math.pow(Math.max(0, -tb), 1.6) * hullHei * 0.30;
    return bowRise + sternRise;
  }
  function buildSheerRail(side) {
    const n = 10;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const z = THREE.MathUtils.lerp(-hl * 0.9, hl * 0.97, i / n);
      pts.push(new THREE.Vector3(side * halfWidthAt(z) * tumbleScale * 0.99, railTopY + sheerRiseAt(z), z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 40, Math.max(0.04, hullWid * 0.032), 6, false);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: hullColorLight, roughness: 0.75 }));
    group.add(mesh);
  }
  buildSheerRail(1);
  buildSheerRail(-1);

  // 갑판 — 낮아진 바닥면(옴폭 파인 안쪽 공간의 바닥). 뱃전보다 항상 안쪽에 오도록 여유를 둔다.
  const deckGeo = new THREE.ShapeGeometry(hullShape);
  deckGeo.rotateX(-Math.PI / 2);
  deckGeo.scale(0.58, 1, 0.58);
  const deck = new THREE.Mesh(deckGeo, new THREE.MeshStandardMaterial({ color: deckColor, roughness: 0.9 }));
  deck.position.y = deckY + 0.03;
  group.add(deck);

  // 포문 — 웨일 바로 위, 선체가 거의 풀빔인 중앙 구간에 배치. 어두운 포문 판 뒤에 살짝 큰
  // 밝은 틀(리드 프레임)을 깔아 포문 뚜껑처럼 다듬는다. 역할별로 개수를 가감.
  const gunportMat = new THREE.MeshStandardMaterial({ color: '#1c130c' });
  const gunportFrameMat = new THREE.MeshStandardMaterial({ color: hullColorLight, roughness: 0.7 });
  function addGunportRow(heightFrac, count, scale = 1) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const gz = -hl * 0.5 + t * hl * 0.65;
        const gy = hullHei * heightFrac;
        const frame = new THREE.Mesh(new THREE.PlaneGeometry(0.64 * sx * scale, 0.46 * sy * scale), gunportFrameMat);
        frame.position.set(side * (hw * 0.945 + 0.012), gy, gz);
        frame.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        group.add(frame);
        const port = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * sx * scale, 0.35 * sy * scale), gunportMat);
        port.position.set(side * (hw * 0.94 + 0.02), gy, gz);
        port.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        group.add(port);
      }
    }
  }
  let gunportCount = Math.max(2, Math.round(hullLen / 2.6));
  if (role === 'trade') gunportCount = Math.max(0, gunportCount - 2);
  if (role === 'combat') gunportCount += 2;
  if (gunportCount > 0) addGunportRow(0.46, gunportCount);
  const isHeavyCombat = role === 'combat' && (shipDef.class === 'large' || shipDef.class === 'xlarge');
  if (isHeavyCombat) addGunportRow(0.78, Math.max(2, gunportCount - 2), 0.85);

  // 교역용 갑판 화물(궤짝/술통) — 넉넉한 적재량을 시각적으로 표현
  if (role === 'trade') {
    const crateMat = new THREE.MeshStandardMaterial({ color: '#7a5a35', roughness: 0.95 });
    const barrelMat = new THREE.MeshStandardMaterial({ color: '#5c4020', roughness: 0.9 });
    const cargoSpots = [
      [hw * 0.4, -hl * 0.08], [-hw * 0.36, -hl * 0.2], [hw * 0.3, -hl * 0.32], [-hw * 0.32, hl * 0.02],
    ];
    cargoSpots.forEach(([cx, cz], i) => {
      if (i % 2 === 0) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.55 * sx, 0.5 * sy, 0.55 * sx), crateMat);
        crate.position.set(cx, deckY + 0.05 + 0.25 * sy, cz);
        crate.rotation.y = i * 0.7;
        group.add(crate);
      } else {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * sx, 0.28 * sx, 0.55 * sy, 10), barrelMat);
        barrel.position.set(cx, deckY + 0.05 + 0.28 * sy, cz);
        group.add(barrel);
      }
    });
  }

  // 선수루(포어캐슬)/선미루 규모 — 소형 카라벨은 갑판이 낮고 평평했고(플러시 데크),
  // 대형/초대형 갈레온일수록 참고 도면처럼 웅장한 선루를 가졌다. 선체 크기 + 국가 아키타입으로 층고를 배분한다.
  const castleScale = ({ small: 0.4, medium: 0.65, large: 0.9, xlarge: 1.05 }[shipDef.class] ?? 0.7) * arch.castleMul;

  // 선수루(포어캐슬) — 이물 쪽 낮은 갑판 구조물 + 안쪽으로 살짝 들어간 상판(완전한 상자가
  // 아니라 갑판+난간 느낌) + 난간 기둥과 이를 잇는 레일 바.
  const darkPostMat = new THREE.MeshStandardMaterial({ color: '#2e2013' });
  const forecastleH = hullHei * 0.3 * castleScale;
  const fcLen = hullLen * 0.15 * castleScale;
  const forecastle = new THREE.Mesh(
    new THREE.BoxGeometry(hullWid * 0.64, forecastleH, fcLen),
    new THREE.MeshStandardMaterial({ color: hullColorLight, roughness: 0.85 })
  );
  forecastle.position.set(0, railTopY + forecastleH / 2 + 0.05, hl * 0.66);
  group.add(forecastle);
  const fcTop = new THREE.Mesh(new THREE.BoxGeometry(hullWid * 0.58, hullHei * 0.03, fcLen * 0.94), new THREE.MeshStandardMaterial({ color: deckColor, roughness: 0.9 }));
  fcTop.position.set(0, railTopY + forecastleH + 0.07, hl * 0.66);
  group.add(fcTop);
  {
    // 난간 기둥 + 그 위를 잇는 레일 바 — 기둥만 있으면 못이 박힌 것처럼 보이므로
    // 반드시 가로 난간대로 연결해 진짜 난간처럼 만든다.
    const railY = railTopY + forecastleH + 0.15 + hullHei * 0.1;
    const railZ = hl * 0.66 + hullLen * 0.07;
    for (let i = -3; i <= 3; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, hullHei * 0.2, 5), darkPostMat);
      post.position.set((i / 3) * hullWid * 0.28, railTopY + forecastleH + 0.15, railZ);
      group.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(hullWid * 0.58, hullHei * 0.025, 0.045), darkPostMat);
    rail.position.set(0, railY, railZ);
    group.add(rail);
  }

  // 선미루 — 선장갑판(퀀터덱, 선장실/조타 공간)과 그 위의 뒷갑판(포프덱) 2단 구조.
  // 포프덱 뒷면을 선체의 실제 맨 끝(halfWidthAt이 0에 가까워지는 -hl 근처)까지 바짝 붙인다.
  // 참고 사진(실제 범선) 대비 이전 높이(qdH+poopH 합이 hullHei의 2배를 넘음)가 지나치게
  // 높고 상자 두 개를 쌓은 것처럼 보였다 — 실제 범선은 선미루가 선체 길이 대비 완만하게
  // 솟은 하나의 구조물에 가깝다. 합계를 hullHei의 1배 안팎으로 낮춘다.
  const qdH = hullHei * 0.5 * castleScale, qdLen = hullLen * 0.24 * castleScale;
  const poopH = hullHei * 0.32 * castleScale, poopLen = hullLen * 0.15 * castleScale;
  // 퀀터덱을 먼저 선체 맨 끝(고물)에 붙이고, 포프덱(과 그 위 조타륜)은 퀀터덱 "지붕" 위에
  // 얹히는 더 작은 구조물로 둔다. 이전에는 포프덱을 선체 끝에 붙이고 퀀터덱을 그 앞에 이어
  // 붙이는 순서였는데, 그러면 포프덱 발자국 전체가 퀀터덱 지붕보다 뒤로 빠져서 받쳐주는
  // 구조 없이 허공에 떠 있는 것처럼 보였다. 포프덱 발자국이 퀀터덱 지붕 안쪽(여유 30%를
  // 남긴 70% 지점까지만 뒤로)에 들어오도록 해서 실제로 그 위에 얹힌 것처럼 보이게 한다.
  const qdCenterZ = -hl * 0.985 + qdLen * 0.5;
  const poopCenterZ = qdCenterZ - (qdLen - poopLen) * 0.35;

  // 선체는 고물로 갈수록 좁아지므로(halfWidthAt), 상자 폭을 고정값이 아니라 각 구조물
  // 뒤쪽 끝(가장 좁아지는 지점) 기준 실제 선체 폭에 맞춰 정한다. 그래야 뱃전 난간이
  // 선실 옆으로 삐져나오지 않는다.
  const qdBackZ = qdCenterZ - qdLen / 2;
  const qdHalfW = halfWidthAt(qdBackZ) * 0.84;
  const poopBackZ = poopCenterZ - poopLen / 2;
  const poopHalfW = halfWidthAt(poopBackZ) * 0.8;

  const sternDeckMat = new THREE.MeshStandardMaterial({ color: hullColorLight, roughness: 0.85 });
  const quarterdeck = new THREE.Mesh(new THREE.BoxGeometry(qdHalfW * 2, qdH, qdLen), sternDeckMat);
  quarterdeck.position.set(0, railTopY + qdH / 2, qdCenterZ);
  group.add(quarterdeck);

  // 선루 층 구분 몰딩 — 선체/퀀터덱, 퀀터덱/포프덱 경계마다 밝은 트림 띠를 둘러
  // 갑판 단이 어디서 나뉘는지 뚜렷이 드러낸다.
  const deckLineMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.6 });
  function addDeckLine(y, width, len) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(width, hullHei * 0.09, len), deckLineMat);
    line.position.set(0, y, qdCenterZ);
    group.add(line);
  }
  addDeckLine(railTopY + 0.02, qdHalfW * 2 + 0.05, qdLen + 0.1);

  const poopMat = new THREE.MeshStandardMaterial({ color: hullColorDark, roughness: 0.85 });
  const poop = new THREE.Mesh(new THREE.BoxGeometry(poopHalfW * 2, poopH, poopLen), poopMat);
  poop.position.set(0, railTopY + qdH + poopH / 2, poopCenterZ);
  group.add(poop);
  {
    const line = new THREE.Mesh(new THREE.BoxGeometry(poopHalfW * 2 + 0.05, hullHei * 0.08, poopLen + 0.1), deckLineMat);
    line.position.set(0, railTopY + qdH + 0.02, poopCenterZ);
    group.add(line);
  }
  const poopTop = new THREE.Mesh(new THREE.BoxGeometry(poopHalfW * 1.8, hullHei * 0.03, poopLen * 0.9), new THREE.MeshStandardMaterial({ color: deckColor, roughness: 0.9 }));
  poopTop.position.set(0, railTopY + qdH + poopH + 0.07, poopCenterZ);
  group.add(poopTop);

  // 선미 갤러리 창 — 가장 뒤쪽/가장 위(포프덱) 후면, 즉 배 뒤에서 봤을 때 실제로 눈에
  // 들어오는 면에 배치한다(퀀터덱 후면은 포프덱에 가려 거의 보이지 않는다). 창은 포프덱
  // 표면 색이 그대로 창살처럼 비치도록 간격만 두고, 둘레는 실제로 튀어나온 각재 몰딩
  // (BoxGeometry)으로 둘러 소형선에서도 뚜렷하게 보이도록 한다. 몰딩 색은 도색의 금박색.
  const windowMat = new THREE.MeshStandardMaterial({ color: '#0a1620', roughness: 0.25, metalness: 0.3 });
  const mullionMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.4, metalness: 0.25 });
  function addSternGallery(centerY, zPos, w, h) {
    const cols = [0.32, 0.36, 0.32]; // 가운데 창(선장실)을 살짝 더 넓게
    const gap = w * 0.07;
    let cx = -w / 2;
    cols.forEach((cw) => {
      const colW = w * cw - gap;
      const win = new THREE.Mesh(new THREE.PlaneGeometry(colW, h * 0.86), windowMat);
      win.position.set(cx + w * cw / 2, centerY, zPos);
      win.rotation.y = Math.PI;
      group.add(win);
      cx += w * cw;
    });
    // 가로 살(sash) — 창을 위/아래로 나누는 밝은 각재, 표면보다 튀어나오게 배치
    const sash = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, h * 0.07, 0.06), mullionMat);
    sash.position.set(0, centerY, zPos + 0.03);
    group.add(sash);
    // 테두리 몰딩 — 창 무리 둘레를 감싸는 얇고 밝은 각재 프레임
    const bT = h * 0.09;
    const top = new THREE.Mesh(new THREE.BoxGeometry(w * 1.08, bT, 0.08), mullionMat);
    top.position.set(0, centerY + h / 2 + bT / 2, zPos + 0.03);
    group.add(top);
    const bottom = top.clone();
    bottom.position.y = centerY - h / 2 - bT / 2;
    group.add(bottom);
    const side = new THREE.Mesh(new THREE.BoxGeometry(bT, h + bT * 2, 0.08), mullionMat);
    side.position.set(-w / 2 - bT / 2, centerY, zPos + 0.03);
    group.add(side);
    const side2 = side.clone();
    side2.position.x = w / 2 + bT / 2;
    group.add(side2);
    return top;
  }
  const galleryTopY = railTopY + qdH + poopH * 0.56;
  const galleryZ = poopCenterZ - poopLen / 2 - 0.03;
  addSternGallery(galleryTopY, galleryZ, poopHalfW * 2, poopH * 0.68);

  // 금박 장식(gildLevel) — 화려한 국가(이베리아/발트)일수록 갤러리 위에 조각된 박공(페디먼트)
  // 장식을 추가로 얹어, 참고 사진 속 화려한 선미 장식을 흉내낸다. 0(전혀 없음)부터 3(가장 화려)
  // 까지 매 단계가 눈에 띄게 커지도록 크기를 연속적으로 키운다 — 잉글랜드/네덜란드/한자동맹처럼
  // gildBonus가 음수인 국가는 같은 선종이라도 확실히 소박해 보여야 한다.
  if (arch.gildLevel >= 1) {
    const pediment = new THREE.Mesh(
      new THREE.ConeGeometry(poopHalfW * (0.16 + arch.gildLevel * 0.1), poopH * (0.14 + arch.gildLevel * 0.06), 4),
      new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.35, metalness: 0.35 })
    );
    pediment.rotation.y = Math.PI / 4;
    pediment.position.set(0, railTopY + qdH + poopH + 0.14, poopCenterZ - poopLen / 2 - 0.03);
    group.add(pediment);
  }
  if (arch.gildLevel >= 3) {
    // 갤러리 상단 몰딩을 따라 작은 금박 장식구(구슬 몰딩)를 촘촘히 배치
    const beadCount = 7;
    for (let i = 0; i < beadCount; i++) {
      const t = (i + 0.5) / beadCount - 0.5;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(poopH * 0.045, 6, 5), new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.3, metalness: 0.4 }));
      bead.position.set(t * poopHalfW * 1.9, galleryTopY + poopH * 0.4, galleryZ + 0.04);
      group.add(bead);
    }
  }

  // 쿼터 갤러리(퀀터갤러리) — 선미 양쪽 모서리에 작게 튀어나온 곁창. 갈레온 고증 컷어웨이
  // 도면에 등장하는 특징적인 디테일로, 선미 갤러리와 함께 넣어야 "선미 창 배치"가 완성된다.
  function addQuarterGallery(side) {
    const gx = side * (poopHalfW + 0.01);
    const gz = poopCenterZ - poopLen * 0.15;
    const gy = railTopY + qdH + poopH * 0.5;
    const win = new THREE.Mesh(new THREE.PlaneGeometry(poopLen * 0.5, poopH * 0.5), windowMat);
    win.position.set(gx, gy, gz);
    win.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(win);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.04, poopH * 0.56, poopLen * 0.56), mullionMat);
    frame.position.set(gx + side * 0.02, gy, gz);
    group.add(frame);
  }
  addQuarterGallery(1);
  addQuarterGallery(-1);

  // 선장실 곁창 — 퀀터덱 양옆에도 창을 두어 뒷면 갤러리만이 아니라 옆에서 봐도
  // "선장실/선실" 구조물로 읽히게 한다(그 전엔 옆면이 무늬 없는 통짜 벽이었다).
  function addCabinWindow(side, wy, wz) {
    const ww = hullWid * 0.11, wh = qdH * 0.34;
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(ww * 1.3, wh * 1.22), mullionMat);
    frame.position.set(side * (qdHalfW + 0.01), wy, wz);
    frame.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(frame);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), windowMat);
    glass.position.set(side * (qdHalfW + 0.02), wy, wz);
    glass.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(glass);
  }
  const cabinWinY = railTopY + qdH * 0.56;
  for (const side of [-1, 1]) {
    addCabinWindow(side, cabinWinY, qdCenterZ + qdLen * 0.2);
    addCabinWindow(side, cabinWinY, qdCenterZ - qdLen * 0.2);
  }

  // 뒷갑판 난간 기둥(발스트레이드) + 이를 잇는 레일 바
  {
    const railY = railTopY + qdH + poopH + 0.1 + hullHei * 0.1;
    const railZ = poopCenterZ - poopLen * 0.3;
    for (let i = -2; i <= 2; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, hullHei * 0.2, 5), darkPostMat);
      post.position.set((i / 2) * poopHalfW * 0.8, railTopY + qdH + poopH + 0.1, railZ);
      group.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(poopHalfW * 1.7, hullHei * 0.025, 0.045), darkPostMat);
    rail.position.set(0, railY, railZ);
    group.add(rail);
  }
  // 선미등(랜턴)
  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(hullHei * 0.13, 8, 6),
    new THREE.MeshStandardMaterial({ color: '#f3d98a', emissive: '#c98f2a', emissiveIntensity: 0.5, roughness: 0.4 })
  );
  lantern.position.set(0, railTopY + qdH + poopH + 0.22, poopCenterZ - hullLen * 0.02);
  group.add(lantern);

  // 조타륜 — 선미루 맨 위(포프덱), 가장 높은 곳에서 배를 모는 조타 장치.
  // 실제 범선처럼 미즌마스트 바로 뒤(포프덱 앞쪽 끝)에 놓아, 키잡이가 앞을 보고
  // 설 수 있는 위치로 배치한다.
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#3b2a18', roughness: 0.8 });
  const wheelGroup = new THREE.Group();
  const wheelR = hullHei * 0.17;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(wheelR, wheelR * 0.1, 6, 12), wheelMat);
  wheelGroup.add(rim);
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(wheelR * 0.07, wheelR * 0.07, wheelR * 1.9, 4), wheelMat);
    spoke.rotation.z = (i / 4) * Math.PI;
    wheelGroup.add(spoke);
  }
  const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(wheelR * 0.16, wheelR * 0.16, wheelR * 0.35, 6), darkPostMat);
  wheelHub.rotation.x = Math.PI / 2;
  wheelGroup.add(wheelHub);
  const wheelPost = new THREE.Mesh(new THREE.CylinderGeometry(wheelR * 0.15, wheelR * 0.2, hullHei * 0.3, 6), wheelMat);
  wheelPost.position.y = -wheelR - hullHei * 0.15;
  wheelGroup.add(wheelPost);
  wheelGroup.position.set(0, railTopY + qdH + poopH + 0.1 + wheelR + hullHei * 0.15, poopCenterZ + poopLen * 0.32);
  group.add(wheelGroup);

  // 선수상(피겨헤드) — 이물 끝 아래에 작은 장식
  const figurehead = new THREE.Mesh(
    new THREE.ConeGeometry(hullWid * 0.09, hullHei * 0.5, 6),
    new THREE.MeshStandardMaterial({ color: trim.clone().lerp(trimColor, 0.4), roughness: 0.6 })
  );
  figurehead.rotation.x = Math.PI * 0.42;
  figurehead.position.set(0, railTopY * 0.42, hl * 1.05);
  group.add(figurehead);

  // 방향타 — 고물 아래로 늘어뜨린 얇은 판
  const rudder = new THREE.Mesh(
    new THREE.BoxGeometry(hullWid * 0.1, hullHei * 0.85, hullLen * 0.11),
    new THREE.MeshStandardMaterial({ color: '#2e2013', roughness: 0.9 })
  );
  rudder.position.set(0, hullHei * 0.15, -hl * 0.99);
  rudder.rotation.x = -0.08;
  group.add(rudder);

  // 닻 — 이물 측면에 매달린 형태
  const anchorMat = new THREE.MeshStandardMaterial({ color: '#3a3a3a', roughness: 0.6, metalness: 0.4 });
  const anchorGroup = new THREE.Group();
  const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.9 * sy, 6), anchorMat);
  anchorGroup.add(shank);
  const fluke = new THREE.Mesh(new THREE.TorusGeometry(0.28 * sy, 0.035, 5, 10, Math.PI), anchorMat);
  fluke.position.y = -0.45 * sy;
  fluke.rotation.z = Math.PI;
  anchorGroup.add(fluke);
  const stock = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.4 * sy, 5), anchorMat);
  stock.rotation.z = Math.PI / 2;
  stock.position.y = 0.35 * sy;
  anchorGroup.add(stock);
  anchorGroup.position.set(hw * 0.98, hullHei * 0.75, hl * 0.55);
  group.add(anchorGroup);

  const rigMat = new THREE.MeshStandardMaterial({ color: rigColor, roughness: 0.95 });
  function addLine(from, to, radius = 0.045) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(radius, radius, len, 4);
    const line = new THREE.Mesh(geo, rigMat);
    line.position.copy(from).addScaledVector(dir, 0.5);
    line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    group.add(line);
  }
  // 샤우드 — 마스트의 한 지점에서 뱃전 좌우로 여러 가닥이 부채꼴로 펼쳐지는 지지줄(참고 사진 특유의 그물망 느낌)
  function addShrouds(fromPoint, mastZ, count = 3, radius = 0.024) {
    for (const side of [-1, 1]) {
      for (let k = 0; k < count; k++) {
        const f = 0.5 + (k / Math.max(1, count - 1)) * 0.48;
        const zJitter = (k - (count - 1) / 2) * hullLen * 0.025;
        addLine(fromPoint, new THREE.Vector3(side * hw * 0.95 * f, hullHei * 0.85, mastZ + zJitter), radius);
      }
    }
  }

  const mastMat = new THREE.MeshStandardMaterial({ color: '#352616', roughness: 0.9 });
  const topMat = new THREE.MeshStandardMaterial({ color: '#3b2a18', roughness: 0.9 });
  const yardMat = new THREE.MeshStandardMaterial({ color: '#3b2a18' });
  const sailMat = new THREE.MeshStandardMaterial({ color: '#e7ded0', roughness: 0.75, side: THREE.DoubleSide });

  // 돛대(하단/중간/상단 다단 구성) + 활대(야드) + 돛 (가로돛 범선 형태)
  // 스쿠너는 최소 2개(포어+메인) 돛대, 클리퍼는 실제로도 항상 3개(풀 리그드) 이상이 정상이므로
  // 소형/중형 클래스라도 최소치를 보장한다.
  let mastCount = cls.mastCount;
  if (shipDef.type === 'schooner') mastCount = Math.max(2, mastCount);
  if (shipDef.type === 'clipper') mastCount = Math.max(3, mastCount);
  let sternMastTopY = railTopY, sternMastZ = -hullLen * 0.3;
  const bowTip = new THREE.Vector3(0, railTopY * 0.75, hl * 0.98);
  // 미즌 스테이(고물 쪽 지지줄) 고정점 — 선미루 몸체 중간이 아니라 실제 구조물인 포프덱
  // 난간 지점(랜턴 근처)에 붙여, 선을 그었을 때 선실 벽을 뚫고 지나가는 것처럼 보이지 않게 한다.
  const sternDeck = new THREE.Vector3(0, railTopY + qdH + poopH + 0.15, poopCenterZ - hullLen * 0.02);
  // 맨 뒤(미즌) 돛대는 반드시 퀀터덱 앞쪽 끝보다 앞에서 끝나도록 한다 — 그렇지 않으면
  // 돛대/활대가 선미루 선실 벽을 그대로 뚫고 지나가는 것처럼 보인다.
  const mastForeZ = hullLen * 0.32;
  const mastAftZ = qdCenterZ + qdLen / 2 + hullLen * 0.05;
  // 모든 돛대 z위치를 미리 계산해둔다 — 스테이(삭구)를 "돛대마다 같은 이물/고물 한 점"이
  // 아니라 "바로 앞/뒤 돛대(또는 뱃머리/선미)"로 이어지도록 하기 위함이다. 전자는 돛대가
  // 여러 개일 때 모든 스테이가 한 점으로 모이는 부채꼴(X자) 모양이 되어 실제 삭구와 다르게
  // 지저분해 보인다. 실제 범선은 각 돛대가 바로 이웃한 돛대/구조물로만 지지줄을 뻗는다.
  const mastZs = [];
  for (let i = 0; i < mastCount; i++) {
    const t = mastCount === 1 ? 0.5 : i / (mastCount - 1);
    mastZs.push(THREE.MathUtils.lerp(mastForeZ, mastAftZ, t));
  }
  for (let i = 0; i < mastCount; i++) {
    const mastZ = mastZs[i];
    const foreStayAnchor = i === 0 ? bowTip : new THREE.Vector3(0, railTopY + 0.35, mastZs[i - 1]);
    const aftStayAnchor = i === mastCount - 1 ? sternDeck : new THREE.Vector3(0, railTopY + 0.35, mastZs[i + 1]);
    const mastHeight = hullHei + 7 * sy * (i === Math.floor(mastCount / 2) ? 1.15 : 0.9);
    const mastBaseY = railTopY + 0.1;
    const mastTopY = mastBaseY + mastHeight;
    sternMastTopY = mastTopY;
    sternMastZ = mastZ;

    // 라틴세일: (1) 소형 모험용선은 유일한 돛대에, (2) 이베리아/지중해 아키타입은 미즌(맨 뒤) 돛대에
    // 실제 역사 고증대로 사선 삼각돛을 단다 — 국가별 삭구 차이의 핵심 표현.
    // 돛대가 2개뿐인 배(중형 캐럭 등)에서 "마지막 돛대"에 미즌 라틴세일을 달면 사실상
    // 유일한 사각돛(메인마스트)이 사라져 돛이 휑해 보인다. 실제로도 미즌은 3번째(고물) 돛대이므로
    // 돛대가 3개 이상일 때만 적용한다.
    const isMizzenLateen = arch.lateenMizzen && !useLateen && mastCount >= 3 && i === mastCount - 1;
    if (useLateen || isMizzenLateen) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, mastHeight, 8), mastMat);
      mast.position.set(0, mastBaseY + mastHeight / 2, mastZ);
      group.add(mast);
      const mastTop = new THREE.Vector3(0, mastTopY, mastZ);
      addLine(mastTop, foreStayAnchor, 0.035);
      addLine(mastTop, aftStayAnchor, 0.035);
      addShrouds(mastTop, mastZ, 2, 0.028);
      // 소형 라틴세일선은 유일한 돛대라 크게, 다중 돛대 함선의 미즌 라틴세일은 다른 가로돛보다
      // 작아야 실제 역사 고증(미즌은 보조 돛)과 맞는다. hullWid에는 이미 sx가 반영되어 있으므로
      // 여기서 다시 곱하면(이전 버그) 대형선일수록 미즌 돛이 제곱으로 커져 지나치게 거대해진다.
      const lateenYardLen = useLateen ? hullWid * 2.0 : hullWid * 1.1;
      addLateenRig(group, mastBaseY, mastHeight, mastZ, lateenYardLen);
      continue;
    }

    // 스쿠너 — 사각돛(가로돛)이 아니라 마스트를 따라 뒤쪽으로 펼쳐지는 개프세일(종범) 삭구.
    // 붐(아래 활대)·개프(위 활대) 사이에 사각형에 가까운 돛을 걸어, 활대가 배와 수직이 아니라
    // 선체 길이 방향을 따라 눕는다는 점이 가로돛과의 핵심 차이다.
    if (arch.gaffRig) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, mastHeight, 8), mastMat);
      mast.position.set(0, mastBaseY + mastHeight / 2, mastZ);
      mast.rotation.x = -0.03; // 살짝 뒤로 눕힌 레이크(스쿠너 특유의 기울어진 돛대)
      group.add(mast);
      const mastTop = new THREE.Vector3(0, mastTopY, mastZ);
      addLine(mastTop, foreStayAnchor, 0.03);
      addShrouds(mastTop, mastZ, 2, 0.022);

      // 붐 길이가 다음 돛대(또는 선미)와의 간격보다 길면 돛끼리 겹쳐 뒤쪽 돛에 가려 안 보이므로,
      // 실제로 남는 간격에 맞춰 상한을 둔다(소형선처럼 돛대 사이 간격이 좁을 때 특히 중요).
      const gapAft = Math.abs((i === mastCount - 1 ? sternDeck.z : mastZs[i + 1]) - mastZ);
      const maxFootLen = Math.max(1.2, gapAft * 0.85);
      const luffH = mastHeight * 0.6, footLen = Math.min(mastHeight * 0.56, maxFootLen), headLen = footLen * 0.82;
      const baseY = mastBaseY + mastHeight * 0.32;
      // 로컬 +x가 rotY(90도) 이후 월드 -z(고물 쪽)로 매핑되므로, 붐/개프 활대가 실제로
      // 놓이는 고물 방향과 돛 캔버스가 같은 방향으로 펼쳐지도록 +x를 사용한다.
      const gaffShape = new THREE.Shape();
      gaffShape.moveTo(0, 0);
      gaffShape.lineTo(0, luffH);
      gaffShape.lineTo(headLen, luffH * 0.92);
      gaffShape.lineTo(footLen, luffH * 0.05);
      gaffShape.lineTo(0, 0);
      const gaffSail = new THREE.Mesh(new THREE.ShapeGeometry(gaffShape, 4), sailMat);
      gaffSail.name = `gaffSail_${i}`;
      gaffSail.rotation.y = Math.PI / 2;
      gaffSail.position.set(0, baseY, mastZ);
      group.add(gaffSail);
      const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, footLen, 6), yardMat);
      boom.rotation.x = Math.PI / 2;
      boom.position.set(0, baseY, mastZ - footLen / 2);
      group.add(boom);
      const gaffSpar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, headLen, 6), yardMat);
      gaffSpar.rotation.x = Math.PI / 2;
      gaffSpar.position.set(0, baseY + luffH * 0.92, mastZ - headLen / 2);
      group.add(gaffSpar);
      // 이물 쪽 돛대(포어마스트)에는 삼각형 지브(staysail)를 하나 추가해 스쿠너 특유의
      // "앞은 삼각돛, 뒤는 사각형 개프세일" 조합을 표현한다.
      if (i === 0) {
        // 지브는 이물(사장) 쪽으로 펼쳐져야 하므로 개프세일과 반대 부호(-x → 월드 +z, 이물 방향)를 쓴다.
        const jibShape = new THREE.Shape();
        jibShape.moveTo(0, luffH * 0.5);
        jibShape.lineTo(0, -luffH * 0.35);
        jibShape.lineTo(-footLen * 0.9, -luffH * 0.1);
        jibShape.lineTo(0, luffH * 0.5);
        const jib = new THREE.Mesh(new THREE.ShapeGeometry(jibShape, 4), sailMat);
        jib.name = 'jib';
        jib.rotation.y = Math.PI / 2;
        jib.position.set(0, baseY + luffH * 0.1, mastZ);
        group.add(jib);
      }
      continue;
    }

    // 특히 높은(주로 중앙) 돛대는 하단/중간/상단 3단(코스+톱+톱갤런트), 나머지는 2단(하단+중간)으로 구성.
    // 네덜란드/한자동맹(simpleRig)은 소수 선원으로도 다룰 수 있도록 항상 2단까지만 쓰고,
    // 클리퍼(forceTallRig)는 반대로 항상 최대 단수를 써서 돛으로 뒤덮인 특유의 실루엣을 낸다.
    const tierCount = (mastHeight > 13 || arch.forceTallRig) && !arch.simpleRig ? 3 : 2;
    const segFracs = tierCount === 3 ? [0.5, 0.3, 0.2] : [0.62, 0.38];
    const sailWidthFactors = [1, 0.68, 0.42];
    const sailHeightFracs = tierCount === 3 ? [0.28, 0.22, 0.16] : [0.32, 0.24];

    let curY = mastBaseY, curR = 0.15 * sy;
    const tierTopYs = [];
    for (let s = 0; s < tierCount; s++) {
      const segH = mastHeight * segFracs[s];
      const topR = curR * 0.6;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(topR, curR, segH, 8), mastMat);
      seg.position.set(0, curY + segH / 2, mastZ);
      group.add(seg);
      curY += segH;
      tierTopYs.push(curY);
      curR = topR;

      // 세그먼트 접합부의 톱(발판) + 크로스바 — 여기서 다음 단 돛대가 이어진다
      if (s < tierCount - 1) {
        const platR = 0.5 * sy * (1 - s * 0.2);
        const plat = new THREE.Mesh(new THREE.CylinderGeometry(platR, platR * 0.8, 0.12, 8), topMat);
        plat.position.set(0, curY, mastZ);
        group.add(plat);
        const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, platR * 2.2, 5), topMat);
        crossbar.rotation.z = Math.PI / 2;
        crossbar.position.set(0, curY + 0.16, mastZ);
        group.add(crossbar);
        addShrouds(new THREE.Vector3(0, curY, mastZ), mastZ, 2, 0.02);
      }
    }

    // 삭구(스테이/샤우드) — 돛대 꼭대기에서 바로 앞/뒤 돛대(또는 뱃머리/선미)와 뱃전으로
    const mastTop = new THREE.Vector3(0, mastTopY, mastZ);
    addLine(mastTop, foreStayAnchor, 0.03);
    addLine(mastTop, aftStayAnchor, 0.03);
    addShrouds(mastTop, mastZ, 3, 0.024);

    // 각 단 상단(활대 위치)에 활대 + 사다리꼴 돛 — 아래부터 코스세일/톱세일/톱갤런트세일
    tierTopYs.forEach((yardY, li) => {
      // hullWid에는 이미 sx가 반영되어 있으므로 여기서 다시 곱하지 않는다(중형/대형선일수록
      // 돛이 제곱으로 커지는 비례 오류를 방지).
      const yardW = hullWid * 1.7 * 0.55 * sailWidthFactors[li];
      const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, yardW, 6), yardMat);
      yard.rotation.z = Math.PI / 2;
      yard.position.set(0, yardY, mastZ);
      group.add(yard);

      const sailH = mastHeight * sailHeightFracs[li];
      const sailGeo = trapezoid(yardW * 0.98, yardW * 0.8, sailH);
      const sail = new THREE.Mesh(sailGeo, sailMat);
      // 돛의 평면이 뱃전(가로) 방향을 바라봐야 옆에서 본 실루엣에서 캔버스 전체가 보인다.
      // 회전 없이 두면 평면이 선수-선미 방향을 향해 옆에서는 실처럼 얇게 보인다(개프세일과 동일한 문제).
      sail.rotation.y = Math.PI / 2;
      sail.position.set(0, yardY - sailH / 2 - 0.05, mastZ);
      group.add(sail);
    });
  }

  // 선수 사장(bowsprit) — 끝 지점(사장 팁)을 실제로 계산해, 그 지점을 기준으로
  // 스프릿세일이 사장을 따라 매달리도록 한다.
  const bowspritAngle = Math.PI / 2.6;
  const bowspritLen = hullLen * 0.3;
  const bowspritBaseY = railTopY * 0.7, bowspritBaseZ = hl * 0.95;
  const bowsprit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.16, bowspritLen, 6),
    new THREE.MeshStandardMaterial({ color: '#352616' })
  );
  bowsprit.rotation.x = bowspritAngle;
  bowsprit.position.set(0, bowspritBaseY, bowspritBaseZ);
  group.add(bowsprit);
  const foreMastZ = THREE.MathUtils.lerp(mastForeZ, mastAftZ, mastCount === 1 ? 0.5 : 0);
  addLine(new THREE.Vector3(0, railTopY * 0.55, hl * 0.55), new THREE.Vector3(0, railTopY, foreMastZ), 0.03);

  const bowspritTipY = bowspritBaseY + Math.cos(bowspritAngle) * (bowspritLen / 2);
  const bowspritTipZ = bowspritBaseZ + Math.sin(bowspritAngle) * (bowspritLen / 2);

  // 스프릿세일 — 사장 바깥쪽 절반을 따라 매달리는 작은 사각돛. 다른 돛들과 같은 방식으로
  // 활대(야드)를 먼저 그려 사장에 걸린 지점을 명확히 보여준 뒤, 그 활대에서 돛이 늘어지도록 한다.
  const spritYardW = hullWid * 0.62 * sx;
  const spritYardZ = THREE.MathUtils.lerp(bowspritBaseZ, bowspritTipZ, 0.72);
  const spritYardY = THREE.MathUtils.lerp(bowspritBaseY, bowspritTipY, 0.72);
  const spritYard = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, spritYardW, 6), yardMat);
  spritYard.rotation.z = Math.PI / 2;
  spritYard.position.set(0, spritYardY, spritYardZ);
  group.add(spritYard);

  const spritH = hullHei * 0.55;
  const spritGeo = trapezoid(spritYardW * 0.96, spritYardW * 0.14, spritH, hullHei * 0.06);
  const sprit = new THREE.Mesh(spritGeo, sailMat);
  sprit.name = 'sprit';
  sprit.position.set(0, spritYardY - spritH * 0.5, spritYardZ);
  group.add(sprit);

  // 국기
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6 * sx, 1 * sy),
    new THREE.MeshStandardMaterial({ color: trim, side: THREE.DoubleSide })
  );
  flag.position.set(0, sternMastTopY + 0.6, sternMastZ);
  group.add(flag);

  // 전투용 대형/초대형선은 이물에 군기를 하나 더 달아 위압감을 더한다
  if (isHeavyCombat) {
    const bowFlag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1 * sx, 0.7 * sy),
      new THREE.MeshStandardMaterial({ color: trim, side: THREE.DoubleSide })
    );
    bowFlag.position.set(0, railTopY * 1.03, hl * 1.02);
    group.add(bowFlag);
  }

  group.userData.hullHeight = hullHei;
  group.userData.length = hullLen;
  group.userData.width = hullWid;
  group.userData.role = role;
  return group;
}

// 갤리(노 젓는 배) — 다른 선종과 달리 돛대/선루가 거의 없고, 길고 좁고 낮은 선체에
// 양옆으로 노가 촘촘히 늘어선 지중해 전통 갤리 형태. buildShipMesh와 별도 함수로 둔다.
function buildGalleyMesh(shipDef) {
  const cls = SHIP_CLASSES[shipDef.class];
  const [sx, sy, sz] = cls.hullScale;
  const role = shipDef.role || 'adventure';
  const group = new THREE.Group();
  group.name = `ship_${shipDef.id}`;

  const hullColorLight = new THREE.Color('#6b4526');
  const deckColor = new THREE.Color('#a3814f');
  const trim = new THREE.Color(COUNTRY_COLORS[shipDef.country] || '#888888');
  const gp = GALLEY_PRESETS[shipDef.id] || DEFAULT_GALLEY_PRESET;
  const gildMat = new THREE.MeshStandardMaterial({ color: '#e6c15a', roughness: 0.35, metalness: 0.4 });

  // 갤리는 실제로 선체가 가늘고 매우 길다(길이:폭 비가 다른 선종보다 훨씬 큼) + 건현이 낮다
  // (노잡이가 수면 가까이 앉음) — 이 두 특징이 실루엣의 핵심이다. beamMul로 배 이름별 날렵함/
  // 육중함을 더 준다("소틸레"=가늘게, "레알"/"갈레아짜"=더 당당하게).
  const hullLen = 10 * sz * 1.35;
  const hullWid = 3.4 * sx * 0.48 * gp.beamMul;
  const hullHei = 2.2 * sy * 0.42;
  const deckY = hullHei * 0.62;
  const railH = hullHei * 0.16; // 아주 낮은 뱃전 — 돛대 배 특유의 "깊은 웰 데크"가 없다
  const railTopY = deckY + railH;
  const hw = hullWid / 2, hl = hullLen / 2;

  const halfWidthProfile = [
    [-hl * 0.98, 0.0004],
    [-hl * 0.8, hw * 0.55],
    [-hl * 0.35, hw * 0.98],
    [0, hw],
    [hl * 0.45, hw * 0.85],
    [hl * 0.82, hw * 0.32],
    [hl * 1.0, 0.0004],
  ];
  function halfWidthAt(z) {
    const zc = THREE.MathUtils.clamp(z, halfWidthProfile[0][0], halfWidthProfile[halfWidthProfile.length - 1][0]);
    for (let i = 0; i < halfWidthProfile.length - 1; i++) {
      const [z0, w0] = halfWidthProfile[i];
      const [z1, w1] = halfWidthProfile[i + 1];
      if (zc >= z0 && zc <= z1) {
        const t = (zc - z0) / (z1 - z0);
        return THREE.MathUtils.lerp(w0, w1, t * t * (3 - 2 * t));
      }
    }
    return 0;
  }
  const SAMPLES = 18;
  const starboard = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const z = THREE.MathUtils.lerp(halfWidthProfile[0][0], halfWidthProfile[halfWidthProfile.length - 1][0], i / SAMPLES);
    starboard.push([halfWidthAt(z), z]);
  }
  const outline = [...starboard, ...[...starboard].slice(0, -1).reverse().map(([w, z]) => [-w, z])];
  const hullShape = new THREE.Shape();
  outline.forEach(([x, z], i) => { if (i === 0) hullShape.moveTo(x, -z); else hullShape.lineTo(x, -z); });
  hullShape.lineTo(outline[0][0], -outline[0][1]);

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: railTopY, bevelEnabled: true, bevelThickness: railTopY * 0.08, bevelSize: hw * 0.05, bevelSegments: 2 });
  hullGeo.rotateX(-Math.PI / 2);
  paintHullColors(hullGeo, railTopY * 1.3); // 갤리는 압출 높이가 hullHei가 아니라 railTopY이므로, 그 기준으로 흘수선 비율을 다시 잡는다
  const hullMesh = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  group.add(hullMesh);

  if (gp.ancient) {
    // 청동 충각(embolon) — 그리스/로마 트라이림 특유의 수면 높이 삼지창형 충각(HS 올림피아스
    // 복원선 실측 사진 기준). 화약 이전 시대 갤리는 이 충각으로 적선 노를 부수거나 선체를
    // 들이받는 것이 주 전술이라, 나무 원뿔이 아니라 납작하고 넓은 청동 핀 형태로 만든다.
    const bronzeMat = new THREE.MeshStandardMaterial({ color: '#8a6a2a', roughness: 0.4, metalness: 0.65 });
    const ramLen = hullLen * 0.09 * gp.ramMul;
    const finCount = 3;
    const finSpread = hw * 0.55 * gp.ramMul;
    for (let i = 0; i < finCount; i++) {
      const t = i / (finCount - 1) - 0.5; // -0.5, 0, 0.5 — 옆으로 부채꼴로 펼쳐지는 삼지창형 날
      const fin = new THREE.Mesh(new THREE.ConeGeometry(hw * 0.1 * gp.ramMul, ramLen, 3), bronzeMat);
      fin.rotation.x = Math.PI / 2;
      fin.position.set(t * finSpread, deckY * 0.15, hl + ramLen * 0.35);
      group.add(fin);
    }
    // 이물에 그려 넣은 눈(오큘루스) — 고대 지중해 갤리 특유의 장식으로, 별다른 구조물 없이도
    // 이 배가 "고대 갤리"임을 즉시 알아보게 하는 가장 상징적인 요소.
    const oculusY = deckY * 0.7;
    for (const side of [-1, 1]) {
      const white = new THREE.Mesh(new THREE.CircleGeometry(hullHei * 0.16, 16), new THREE.MeshStandardMaterial({ color: '#e8e2d0', roughness: 0.6, side: THREE.DoubleSide }));
      white.rotation.y = side * Math.PI / 2;
      white.position.set(side * hw * 0.98, oculusY, hl * 0.68);
      group.add(white);
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(hullHei * 0.07, 12), new THREE.MeshStandardMaterial({ color: '#1a1410', roughness: 0.5, side: THREE.DoubleSide }));
      pupil.rotation.copy(white.rotation);
      pupil.position.set(side * (hw * 0.98 + side * 0.01), oculusY, hl * 0.68);
      group.add(pupil);
    }
    // 위로 솟구쳐 곡선을 그리는 이물/고물 기둥(아크로스톨리온) — 참고 사진처럼 갑판보다
    // 훨씬 높이, 뒤로 완만히 휘며 올라간다.
    const sternPostCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, railTopY, hl * 0.92),
      new THREE.Vector3(0, railTopY + hullHei * 1.1, hl * 0.8),
      new THREE.Vector3(0, railTopY + hullHei * 1.9, hl * 0.68),
    ]);
    const sternPostGeo = new THREE.TubeGeometry(sternPostCurve, 16, Math.max(0.04, hw * 0.05), 6, false);
    group.add(new THREE.Mesh(sternPostGeo, new THREE.MeshStandardMaterial({ color: '#5a3a20', roughness: 0.75 })));

    // 에포티스(epotis) — 이물 양옆으로 튀어나온 캣헤드형 가로대. 닻을 걸거나 충돌 시 완충재
    // 역할을 한 실제 구조물로, 참고 사진에서 눈 장식 바로 위 튀어나온 각재로 뚜렷이 보인다.
    const epotisMat = new THREE.MeshStandardMaterial({ color: '#3b2a18', roughness: 0.85 });
    for (const side of [-1, 1]) {
      const epotis = new THREE.Mesh(new THREE.CylinderGeometry(hw * 0.05, hw * 0.06, hw * 0.7, 6), epotisMat);
      epotis.rotation.z = Math.PI / 2;
      epotis.position.set(side * hw * 0.75, railTopY * 0.9, hl * 0.78);
      group.add(epotis);
    }
  } else if (gp.ornament >= 3) {
    // 기함급(레알)은 짧은 충각이 아니라, 실제 바르셀로나 해양박물관 레알 레플리카 사진처럼
    // 선체 길이의 상당 부분을 차지하는 아주 길고 가느다란 금박 이물 스퍼(spur)를 단다 —
    // 끝에 작은 조각상(figurehead)까지 얹어 기함으로서의 위엄을 표현한다.
    const spurLen = hullLen * 0.3 * gp.ramMul;
    const spur = new THREE.Mesh(new THREE.CylinderGeometry(hw * 0.1, hw * 0.16, spurLen, 6), new THREE.MeshStandardMaterial({ color: '#3b2416', roughness: 0.6 }));
    spur.rotation.x = Math.PI / 2 + 0.08;
    spur.position.set(0, deckY * 0.55, hl + spurLen * 0.42);
    group.add(spur);
    for (const side of [-1, 1]) {
      const trimStripe = new THREE.Mesh(new THREE.BoxGeometry(hw * 0.03, hw * 0.03, spurLen * 0.94), gildMat);
      trimStripe.position.set(side * hw * 0.09, deckY * 0.55 + spurLen * 0.94 * 0.042, hl + spurLen * 0.42);
      trimStripe.rotation.x = 0.08;
      group.add(trimStripe);
    }
    const figurehead = new THREE.Mesh(new THREE.SphereGeometry(hw * 0.22, 8, 6), gildMat);
    figurehead.position.set(0, deckY * 0.55 + spurLen * 0.84, hl + spurLen * 0.84 + hw * 0.1);
    group.add(figurehead);
  } else {
    // 이물 충각(ram) — 갤리 특유의 수면 위로 길게 뻗은 뾰족한 뱃머리 장식. ramMul로 배마다
    // 충각 크기를 달리해(갈레아짜는 더 길고 당당하게) 이물에서부터 정체성이 드러나게 한다.
    const ramLen = hullLen * 0.22 * gp.ramMul;
    const ram = new THREE.Mesh(new THREE.ConeGeometry(hw * 0.12 * gp.ramMul, ramLen, 5), new THREE.MeshStandardMaterial({ color: '#2e2013', roughness: 0.8 }));
    ram.rotation.x = Math.PI / 2;
    ram.position.set(0, deckY * 0.35, hl + hullLen * 0.09);
    group.add(ram);
    // 장식 등급(ornament) 2는 충각 밑동에 금박 장식구를 둘러 갈레아짜의 위엄을 더한다.
    if (gp.ornament >= 2) {
      const ramCollar = new THREE.Mesh(new THREE.TorusGeometry(hw * 0.14 * gp.ramMul, hw * 0.03, 6, 10), gildMat);
      ramCollar.rotation.y = Math.PI / 2;
      ramCollar.position.set(0, deckY * 0.35, hl + 0.05);
      group.add(ramCollar);
    }
  }

  // 낮은 뱃전 트림(전체 실루엣을 얇게 두르는 밝은 몰딩) — 깊은 웰 데크 구조 없이 얇은 테두리만
  const railGeo = new THREE.ExtrudeGeometry(hullShape, { depth: railH, bevelEnabled: false });
  railGeo.rotateX(-Math.PI / 2);
  railGeo.scale(1.02, 1, 1.0);
  railGeo.translate(0, deckY, 0);
  group.add(new THREE.Mesh(railGeo, new THREE.MeshStandardMaterial({ color: hullColorLight, roughness: 0.8 })));

  const deckGeo = new THREE.ShapeGeometry(hullShape);
  deckGeo.rotateX(-Math.PI / 2);
  deckGeo.scale(0.94, 1, 0.94);
  const deck = new THREE.Mesh(deckGeo, new THREE.MeshStandardMaterial({ color: deckColor, roughness: 0.9 }));
  deck.position.y = deckY + 0.02;
  group.add(deck);

  // 아웃리거(파렉세이레시아) — 고대 트라이림/데케레스 특유의, 선체 위에 얹혀 옆으로
  // 튀어나온 상자형 구조물 + 그 위 평평한 통로 갑판. 참고 사진(HS 올림피아스)에서 가장
  // 눈에 띄는 요소인데도 처음 버전엔 빠져 있었다 — 그냥 매끈한 선체 옆에서 노가 튀어나오는
  // 게 아니라, "선체 위에 별도로 얹힌 노받이 구조물"이라는 게 이 배가 카누가 아니라
  // 트라이림으로 보이게 하는 핵심이다. 맨 위(트라니테) 노는 이 아웃리거에서, 아래 단들은
  // 선체 옆면에서 나오도록 해 실제 트라이림의 3단 배치를 흉내낸다.
  let outriggerH = 0, outriggerZLen = 0;
  if (gp.ancient) {
    outriggerH = hullHei * 0.5;
    outriggerZLen = hl * 1.28;
    const outriggerW = hullWid * 0.86;
    const outriggerMat = new THREE.MeshStandardMaterial({ color: hullColorLight, roughness: 0.85 });
    const outrigger = new THREE.Mesh(new THREE.BoxGeometry(outriggerW, outriggerH, outriggerZLen), outriggerMat);
    outrigger.position.set(0, railTopY + outriggerH / 2, -hl * 0.02);
    group.add(outrigger);
    const walkway = new THREE.Mesh(new THREE.BoxGeometry(outriggerW * 0.5, hullHei * 0.05, outriggerZLen * 0.99), new THREE.MeshStandardMaterial({ color: deckColor, roughness: 0.9 }));
    walkway.position.set(0, railTopY + outriggerH + hullHei * 0.03, -hl * 0.02);
    group.add(walkway);
    // 스탠션 — 노가 그 사이로 지나가는 살대. 바깥쪽으로 살짝 벌어진 각도가 사진 속 트라이림의
    // 특징적인 사선 실루엣을 만든다.
    const stanchionMat = new THREE.MeshStandardMaterial({ color: '#3b2a18', roughness: 0.9 });
    const stanchionCount = 16;
    for (let i = 0; i < stanchionCount; i++) {
      const t = (i + 0.5) / stanchionCount;
      const sz = -outriggerZLen / 2 + t * outriggerZLen;
      for (const side of [-1, 1]) {
        const stanchion = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, outriggerH * 1.15, 5), stanchionMat);
        stanchion.position.set(side * outriggerW * 0.52, railTopY + outriggerH * 0.5, sz);
        stanchion.rotation.x = 0.12;
        stanchion.rotation.z = side * 0.18;
        group.add(stanchion);
      }
    }
  }

  // 노(oar) — 갤리의 정체성. 선체 중앙 70% 구간에 촘촘히, 양옆으로 비스듬히 물에 담근다.
  // 크기가 커질수록(대형/초대형 갈레아스급) 노잡이 열도 함께 늘어난다. oarBanks가 1보다
  // 크면(고대 트라이림) 노를 위아래로 겹쳐 여러 단(탈라미안/지지안/트라니테)을 재현한다 —
  // 맨 위 단은 아웃리거 바깥 가장자리에서, 아래 단들은 흘수선에 가까운 선체 옆면에서
  // 나오도록 해 대각선으로 겹치는 참고 사진의 노 배치를 재현한다.
  const oarMat = new THREE.MeshStandardMaterial({ color: '#3b2a18', roughness: 0.9 });
  const oarCountByClass = { small: 8, medium: 11, large: 15, xlarge: 20 };
  const oarCount = oarCountByClass[shipDef.class] ?? 8;
  const oarBanks = gp.oarBanks || 1;
  for (let b = 0; b < oarBanks; b++) {
    const bankT = oarBanks === 1 ? 0 : b / (oarBanks - 1); // 0=가장 아래(탈라미안)~1=가장 위(트라니테)
    const bankY = gp.ancient
      ? THREE.MathUtils.lerp(deckY - hullHei * 0.85, railTopY + outriggerH * 0.65, bankT)
      : deckY - hullHei * 0.55 + bankT * hullHei * 0.42;
    const bankOutX = gp.ancient
      ? THREE.MathUtils.lerp(hw * 0.6, hullWid * 0.86 * 0.52, bankT)
      : hw * 0.55 + bankT * hw * 0.12;
    const oarLenMul = 1 - (1 - bankT) * 0.12;
    for (let i = 0; i < oarCount; i++) {
      const t = (i + 0.5) / oarCount;
      const oz = gp.ancient ? -outriggerZLen / 2 + t * outriggerZLen : -hl * 0.72 + t * hl * 1.3;
      for (const side of [-1, 1]) {
        const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, hullWid * 1.15 * oarLenMul, 5), oarMat);
        oar.position.set(side * bankOutX, bankY, oz);
        oar.rotation.z = side * 1.15;
        group.add(oar);
      }
    }
  }

  // 선미 소지휘대 — 다른 선종의 웅장한 선미루 대신, 아주 낮고 작은 지휘용 발판 + 차양.
  // canopyMul로 배마다 이 지휘대/차양 크기를 달리한다("소틸레"는 작고 실용적으로,
  // "레알"은 기함답게 훨씬 크고 화려하게).
  const aftH = hullHei * 0.55;
  const aftPlatform = new THREE.Mesh(new THREE.BoxGeometry(hullWid * 0.5 * gp.canopyMul, aftH, hullLen * 0.1 * gp.canopyMul), new THREE.MeshStandardMaterial({ color: hullColorLight, roughness: 0.85 }));
  aftPlatform.position.set(0, railTopY + aftH / 2, -hl * 0.82);
  group.add(aftPlatform);
  const canopyPostMat = new THREE.MeshStandardMaterial({ color: '#2e2013' });
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, hullHei * 0.5, 5), canopyPostMat);
    post.position.set(side * hullWid * 0.2 * gp.canopyMul, railTopY + aftH + hullHei * 0.25, -hl * 0.82);
    group.add(post);
  }
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(hullWid * 0.55 * gp.canopyMul, hullHei * 0.04, hullLen * 0.13 * gp.canopyMul), new THREE.MeshStandardMaterial({ color: trim, roughness: 0.7 }));
  canopy.position.set(0, railTopY + aftH + hullHei * 0.5, -hl * 0.82);
  group.add(canopy);
  // 장식 등급 1 이상: 차양 테두리를 금박 몰딩으로 두른다. 3(레알 전용)은 지휘대 가장자리에
  // 조각 발코니처럼 작은 난간 기둥을 촘촘히 세워, 실제 레판토 해전의 기함 갈레라 레알이
  // 온통 금박 조각으로 뒤덮여 있었던 것을 흉내낸다.
  if (gp.ornament >= 1) {
    const gildEdge = new THREE.Mesh(new THREE.BoxGeometry(hullWid * 0.58 * gp.canopyMul, hullHei * 0.03, hullLen * 0.135 * gp.canopyMul), gildMat);
    gildEdge.position.set(0, railTopY + aftH + hullHei * 0.5 + hullHei * 0.03, -hl * 0.82);
    group.add(gildEdge);
  }
  if (gp.ornament >= 3) {
    // 레알 실제 레플리카(바르셀로나 해양박물관) 사진처럼 조각 기둥 + 그 위아래를 잇는
    // 금박 가로대까지 둘러 발코니(콜로네이드)처럼 보이게 한다.
    const balustradeCount = 8;
    const bw = hullWid * 0.5 * gp.canopyMul, bl = hullLen * 0.1 * gp.canopyMul;
    for (const side of [-1, 1]) {
      for (let i = 0; i < balustradeCount; i++) {
        const t = (i + 0.5) / balustradeCount - 0.5;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, aftH * 0.9, 6), gildMat);
        post.position.set(side * (bw / 2 + 0.02), railTopY + aftH * 0.45, -hl * 0.82 + t * bl);
        group.add(post);
      }
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, bl + 0.05), gildMat);
      topRail.position.set(side * (bw / 2 + 0.02), railTopY + aftH * 0.9, -hl * 0.82);
      group.add(topRail);
      const botRail = topRail.clone();
      botRail.position.y = railTopY + aftH * 0.05;
      group.add(botRail);
    }
  }

  // 방향타 — 고대 갤리는 중앙 방향타가 아니라 고물 양옆에 노 형태의 쌍노(steering oar)를
  // 매달아 조종했다(중앙 방향타는 훨씬 후대의 발명품이다).
  if (gp.ancient) {
    const steerMat = new THREE.MeshStandardMaterial({ color: '#3b2a18', roughness: 0.9 });
    for (const side of [-1, 1]) {
      const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, hullHei * 1.6, 6), steerMat);
      oar.position.set(side * hw * 0.75, deckY - hullHei * 0.3, -hl * 0.95);
      oar.rotation.x = 0.65;
      oar.rotation.z = side * 0.25;
      group.add(oar);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(hullHei * 0.35, hullHei * 0.55, 0.03), steerMat);
      blade.position.set(side * hw * 0.75, deckY - hullHei * 1.05, -hl * 1.08);
      blade.rotation.x = 0.65;
      group.add(blade);
    }
  } else {
    const rudder = new THREE.Mesh(new THREE.BoxGeometry(hullWid * 0.08, hullHei * 0.7, hullLen * 0.08), new THREE.MeshStandardMaterial({ color: '#2e2013', roughness: 0.9 }));
    rudder.position.set(0, 0, -hl * 0.99);
    group.add(rudder);
  }

  // 이물 함포(있는 경우) — 갤리는 현측 포열이 아니라 이물에 소수의 함포를 집중 배치했다.
  // 갈레아스는(bowCastle) 갑판보다 한 단 높은 둥근 선수루를 얹고 그 위에 함포를 배치했다 —
  // 실제 자료에서 갈레아스의 핵심 특징으로 꼽히는 "round forecastle with 6-9 guns".
  let bowCastleY = railTopY;
  if (gp.bowCastle) {
    const castleH = hullHei * 0.65;
    const castleR = hw * 0.85;
    const bowCastleMesh = new THREE.Mesh(new THREE.CylinderGeometry(castleR, castleR * 1.05, castleH, 10, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: hullColorLight, roughness: 0.85 }));
    bowCastleMesh.rotation.y = -Math.PI / 2;
    bowCastleMesh.position.set(0, railTopY + castleH / 2, hl * 0.72);
    group.add(bowCastleMesh);
    bowCastleY = railTopY + castleH;
  }
  if (role === 'combat' && shipDef.cannons > 0) {
    const cannonMat = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.5, metalness: 0.5 });
    for (const off of [-0.35, 0, 0.35]) {
      if (off !== 0 && shipDef.cannons < 4) continue;
      const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, hullLen * 0.13, 6), cannonMat);
      cannon.rotation.x = Math.PI / 2;
      cannon.position.set(off * hw, bowCastleY + 0.1, hl * 0.7);
      group.add(cannon);
    }
    // 대형/초대형(갈레아스급)은 순수 갤리와 달리 노 사이 공간에 현측 포열도 갖췄다 —
    // 레판토 해전에서 베네치아 갈레아스가 실제로 이런 구성을 썼다.
    if (shipDef.class === 'large' || shipDef.class === 'xlarge') {
      const broadsideCount = shipDef.class === 'xlarge' ? 5 : 3;
      for (let i = 0; i < broadsideCount; i++) {
        const t = (i + 0.5) / broadsideCount;
        const cz = -hl * 0.55 + t * hl * 0.95;
        for (const side of [-1, 1]) {
          const bCannon = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, hullWid * 0.5, 6), cannonMat);
          bCannon.rotation.z = Math.PI / 2;
          bCannon.position.set(side * hw * 0.7, deckY + hullHei * 0.1, cz);
          group.add(bCannon);
        }
      }
    }
  }

  // 단일 돛대(주로 중앙보다 살짝 이물 쪽) + 라틴세일 — 갤리는 무풍/역풍에는 노로, 순풍에는
  // 이 돛으로 나아갔다.
  const mastMat = new THREE.MeshStandardMaterial({ color: '#352616', roughness: 0.9 });
  // 고대 갤리는 주돛대가 중앙보다 고물 쪽으로 더 치우쳐 있고(참고 사진 기준), 이물 쪽에는
  // 작은 보조 돛대(아르테몬)가 하나 더 있다 — 아래에서 별도로 세운다.
  const mastZ = gp.ancient ? -hl * 0.25 : hl * 0.05;
  const mastHeight = hullHei * 3.4 + 3.5 * sy;
  const mastBaseY = railTopY + 0.1;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.18, mastHeight, 8), mastMat);
  mast.position.set(0, mastBaseY + mastHeight / 2, mastZ);
  group.add(mast);

  const rigMat = new THREE.MeshStandardMaterial({ color: '#2b2015', roughness: 0.95 });
  function addLine(from, to, radius = 0.03) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const line = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 4), rigMat);
    line.position.copy(from).addScaledVector(dir, 0.5);
    line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    group.add(line);
  }
  const mastTop = new THREE.Vector3(0, mastBaseY + mastHeight, mastZ);
  addLine(mastTop, new THREE.Vector3(0, railTopY * 0.6, hl * 0.9), 0.03);
  addLine(mastTop, new THREE.Vector3(0, railTopY + aftH, -hl * 0.8), 0.03);
  for (const side of [-1, 1]) addLine(mastTop, new THREE.Vector3(side * hw * 0.9, railTopY, mastZ), 0.024);
  if (gp.ancient) {
    // 라틴세일(삼각돛)은 훨씬 후대(중세)의 발명품이라, 고대 갤리에는 활대에 매단 사각
    // 가로돛을 단다 — 참고 사진 속 올림피아스의 돛대·활대 구성과 같은 방식.
    const yardW = hullWid * 1.6 * sx;
    const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, yardW, 6), rigMat);
    yard.rotation.z = Math.PI / 2;
    yard.position.set(0, mastBaseY + mastHeight * 0.82, mastZ);
    group.add(yard);
    const sailH = mastHeight * 0.42;
    const sailShape = new THREE.Shape();
    sailShape.moveTo(-yardW * 0.46, sailH / 2);
    sailShape.lineTo(yardW * 0.46, sailH / 2);
    sailShape.lineTo(yardW * 0.42, -sailH / 2);
    sailShape.lineTo(-yardW * 0.42, -sailH / 2);
    sailShape.lineTo(-yardW * 0.46, sailH / 2);
    const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape), new THREE.MeshStandardMaterial({ color: '#d8cba8', roughness: 0.8, side: THREE.DoubleSide }));
    sail.rotation.y = Math.PI / 2;
    sail.position.set(0, mastBaseY + mastHeight * 0.82 - sailH * 0.55, mastZ);
    group.add(sail);
  } else {
    addLateenRig(group, mastBaseY, mastHeight, mastZ, hullWid * 1.7 * sx);
  }

  if (gp.ancient) {
    // 이물 쪽 보조 돛대(아르테몬) — 참고 사진에도 주돛대보다 작은 돛대가 이물 쪽에 하나 더
    // 서 있다. 단일 돛대뿐인 중세 갤리와 달리, 고대 대형 갤리는 돛대 2개가 표준이었다.
    const foreMastZ = hl * 0.42;
    const foreMastHeight = mastHeight * 0.6;
    const foreMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, foreMastHeight, 8), mastMat);
    foreMast.position.set(0, mastBaseY + foreMastHeight / 2, foreMastZ);
    group.add(foreMast);
    const foreMastTop = new THREE.Vector3(0, mastBaseY + foreMastHeight, foreMastZ);
    addLine(foreMastTop, new THREE.Vector3(0, railTopY * 0.6, hl * 0.95), 0.024);
    addLine(foreMastTop, mastTop, 0.022);
    for (const side of [-1, 1]) addLine(foreMastTop, new THREE.Vector3(side * hw * 0.85, railTopY, foreMastZ), 0.02);
    const foreYardW = hullWid * 1.0 * sx;
    const foreYard = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, foreYardW, 6), rigMat);
    foreYard.rotation.z = Math.PI / 2;
    foreYard.position.set(0, mastBaseY + foreMastHeight * 0.82, foreMastZ);
    group.add(foreYard);
    const foreSailH = foreMastHeight * 0.4;
    const foreSailShape = new THREE.Shape();
    foreSailShape.moveTo(-foreYardW * 0.46, foreSailH / 2);
    foreSailShape.lineTo(foreYardW * 0.46, foreSailH / 2);
    foreSailShape.lineTo(foreYardW * 0.42, -foreSailH / 2);
    foreSailShape.lineTo(-foreYardW * 0.42, -foreSailH / 2);
    foreSailShape.lineTo(-foreYardW * 0.46, foreSailH / 2);
    const foreSail = new THREE.Mesh(new THREE.ShapeGeometry(foreSailShape), new THREE.MeshStandardMaterial({ color: '#d8cba8', roughness: 0.8, side: THREE.DoubleSide }));
    foreSail.rotation.y = Math.PI / 2;
    foreSail.position.set(0, mastBaseY + foreMastHeight * 0.82 - foreSailH * 0.55, foreMastZ);
    group.add(foreSail);
  }

  // 국기
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2 * sx, 0.75 * sy), new THREE.MeshStandardMaterial({ color: trim, side: THREE.DoubleSide }));
  flag.position.set(0, mastBaseY + mastHeight + 0.4, mastZ);
  group.add(flag);

  // 추가 예기(pennants) — 기함급일수록(레알/갈레아짜) 활대·이물에 작은 삼각기를 더 매달아
  // 훨씬 화려하고 위엄있게 보이도록 한다. 소틸레처럼 실용적인 정찰 갤리는 국기 하나뿐.
  const pennantMat = new THREE.MeshStandardMaterial({ color: trim, side: THREE.DoubleSide });
  function addPennant(x, y, z, w, h) {
    const shape = new THREE.Shape();
    shape.moveTo(0, h / 2);
    shape.lineTo(w, 0);
    shape.lineTo(0, -h / 2);
    shape.lineTo(0, h / 2);
    const pennant = new THREE.Mesh(new THREE.ShapeGeometry(shape), pennantMat);
    pennant.rotation.y = Math.PI / 2;
    pennant.position.set(x, y, z);
    group.add(pennant);
  }
  if (gp.pennants >= 2) addPennant(0, mastBaseY + mastHeight * 0.7, mastZ, hullWid * 0.5, hullHei * 0.35);
  if (gp.pennants >= 3) addPennant(0, deckY * 0.35 + hullHei * 0.4, hl + hullLen * 0.03, hullWid * 0.4, hullHei * 0.3);

  group.userData.hullHeight = hullHei;
  group.userData.length = hullLen;
  group.userData.width = hullWid;
  group.userData.role = role;
  return group;
}

const NOTCH_SPEED = 4.2; // 1노치당 목표 속도(m/s)
const MAX_FWD = 5;
const MAX_REV = -3;
const ACCEL_BASE = 3.6; // m/s^2 — 목표 속도(레버 위치)로 수렴하는 가속도. 값이 작을수록 배가 무겁게 반응한다.
// rad/s^2 — 목표 선회각속도로 수렴하는 각가속도(타가 듣기까지의 지연/관성).
// 예전(1.7)에는 최대 선회각속도까지 1초도 안 걸려 도달해 방향키를 누르는 즉시 팍
// 꺾이는 아케이드 느낌이었다. 낮춰서 완전히 돌아가는 데 2~3초 걸리도록 해
// 배가 관성으로 서서히 돌기 시작하고, 방향키를 놓아도 관성으로 계속 돌다 서서히
// 멎는 느낌을 준다(선박 간 상대적인 민첩성 차이는 그대로 유지된다).
const TURN_ACCEL_BASE = 0.6;

export class ShipController {
  constructor(mesh, shipDef, heightAt) {
    this.mesh = mesh;
    this.shipDef = shipDef;
    this.heightAt = heightAt;
    this.notch = 0; // -3 .. 5 (스로틀 레버 위치)
    this.curSpeed = 0; // 실제 속도(m/s) — 레버 위치를 향해 가속도로 서서히 수렴한다(관성)
    this.curTurnRate = 0; // 실제 선회각속도(rad/s) — 타 입력을 향해 서서히 수렴한다(타가 듣는 지연감)
    this.heading = 0; // rad
    this.pos = new THREE.Vector2(0, 0);
    this.turnInput = 0; // -1..1 from A/D

    // 선체가 클수록 무겁게 반응하도록, 선체 스케일(부피감)에 반비례해 가속도를 낮춘다.
    const cls = SHIP_CLASSES[shipDef.class] || SHIP_CLASSES.medium;
    const [csx, , csz] = cls.hullScale;
    const inertia = 1 + (csx * csz - 1) * 0.35;
    this.accel = ACCEL_BASE / inertia;
    this.turnAccel = TURN_ACCEL_BASE / inertia;
    // 장착 부품(돛 등)의 속도 배율 — 조선소 부품 시스템에서만 1이 아닌 값이 들어온다.
    this.speedMul = shipDef.speedMul || 1;
  }

  throttleUp() { this.notch = Math.min(MAX_FWD, this.notch + 1); }
  throttleDown() { this.notch = Math.max(MAX_REV, this.notch - 1); }

  get speedMs() { return this.curSpeed; }
  get speedRatio() { return this.notch >= 0 ? this.notch / MAX_FWD : this.notch / Math.abs(MAX_REV); }

  update(delta, t, isBlocked) {
    const turnRateBase = THREE.MathUtils.degToRad(this.shipDef.turnRate);
    const maxSpeed = NOTCH_SPEED * MAX_FWD * this.speedMul;
    // 실제 속도가 붙은 만큼만 타가 듣는다(정지 상태에서는 선회 반응이 둔하다) — curSpeed 기준으로 계산해
    // 가속 중에는 선회 감도도 함께 서서히 올라온다.
    const speedFactor = 0.35 + 0.65 * Math.min(1, Math.abs(this.curSpeed) / maxSpeed);
    const dir = this.curSpeed < 0 ? -1 : 1;
    const targetTurnRate = this.turnInput * turnRateBase * speedFactor * dir;
    const maxTurnStep = this.turnAccel * delta;
    this.curTurnRate += Math.max(-maxTurnStep, Math.min(maxTurnStep, targetTurnRate - this.curTurnRate));
    this.heading += this.curTurnRate * delta;

    const targetSpeed = this.notch * NOTCH_SPEED * this.speedMul;
    const maxSpeedStep = this.accel * delta;
    this.curSpeed += Math.max(-maxSpeedStep, Math.min(maxSpeedStep, targetSpeed - this.curSpeed));

    const vx = Math.sin(this.heading) * this.curSpeed;
    const vz = Math.cos(this.heading) * this.curSpeed;
    const prevX = this.pos.x, prevY = this.pos.y;
    let nx = prevX + vx * delta, ny = prevY + vz * delta;

    if (isBlocked && isBlocked(nx, ny)) {
      // 육지에 막히면 해안선을 따라 미끄러지듯 각 축으로 시도(완전 정지 대신)
      if (!isBlocked(nx, prevY)) ny = prevY;
      else if (!isBlocked(prevX, ny)) nx = prevX;
      else { nx = prevX; ny = prevY; }
    }
    this.pos.x = nx;
    this.pos.y = ny;

    const wave = this.heightAt ? this.heightAt(this.pos.x, this.pos.y, t) : 0;
    const waveAhead = this.heightAt ? this.heightAt(this.pos.x + Math.sin(this.heading) * 4, this.pos.y + Math.cos(this.heading) * 4, t) : 0;
    // 멀미 유발을 줄이기 위해 파도에 따른 피치/롤 흔들림 폭을 낮춤(진폭 자체도 ocean.js에서 줄임)
    const pitch = Math.atan2(waveAhead - wave, 4) * 0.8;

    this.mesh.position.set(this.pos.x, wave, this.pos.y);
    this.mesh.rotation.set(pitch, this.heading, Math.sin(t * 0.6) * 0.015, 'YXZ');
  }
}
