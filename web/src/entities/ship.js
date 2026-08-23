import * as THREE from 'three';
import { SHIP_CLASSES, COUNTRY_COLORS } from '../data/ships.js';

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

// 라틴세일(삼각돛) — 소형 모험용선(카라벨라 라티나 계열) 전용, 사선 활대에 걸린 삼각형 돛
function addLateenRig(group, mastBaseY, mastHeight, mastZ, yardLen) {
  const yard = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, yardLen, 6),
    new THREE.MeshStandardMaterial({ color: '#3b2a18' })
  );
  const yardCenterY = mastBaseY + mastHeight * 0.68;
  yard.position.set(0, yardCenterY, mastZ);
  yard.rotation.z = 1.15;
  group.add(yard);

  const sailH = mastHeight * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(0, sailH * 0.5);
  shape.lineTo(yardLen * 0.88, -sailH * 0.32);
  shape.quadraticCurveTo(yardLen * 0.4, -sailH * 0.58, 0, -sailH * 0.5);
  shape.lineTo(0, sailH * 0.5);
  const geo = new THREE.ShapeGeometry(shape, 8);
  const sail = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#e7ded0', roughness: 0.75, side: THREE.DoubleSide }));
  sail.position.set(0, yardCenterY - sailH * 0.05, mastZ + 0.04);
  group.add(sail);
}

export function buildShipMesh(shipDef) {
  const cls = SHIP_CLASSES[shipDef.class];
  const [sx, sy, sz] = cls.hullScale;
  const role = shipDef.role || 'trade';
  const group = new THREE.Group();
  group.name = `ship_${shipDef.id}`;

  const hullColorLight = new THREE.Color('#6b4526');
  const deckColor = new THREE.Color('#a3814f');
  const trim = new THREE.Color(COUNTRY_COLORS[shipDef.country] || '#888888');
  const rigColor = '#2b2015';

  // 역할별 선체 실루엣 차이 — 교역용은 둥글고 넉넉하게, 모험용은 날렵하게, 전투용은 표준 비율
  const roleHullMul = role === 'trade' ? 1.1 : role === 'adventure' ? 0.94 : 1.0;
  const useLateen = role === 'adventure' && shipDef.class === 'small';

  const hullLen = 10 * sz;
  const hullWid = 3.4 * sx * roleHullMul;
  const hullHei = 2.6 * sy;

  // 선체 윤곽선(위에서 본 모양) — 이물은 뾰족하게, 고물은 완만하게 넓어지는 실제 범선 형태.
  // rotateX(-90°) 매핑은 로컬 y가 곧 -world z가 되므로, 아래 좌표는 (x, -z)로 넣는다.
  const hw = hullWid / 2;
  const hl = hullLen / 2;
  const outline = [
    [-hw * 0.4, -hl * 0.96], [hw * 0.4, -hl * 0.96], // 선미 트랜섬
    [hw * 0.98, -hl * 0.55], [hw * 0.92, hl * 0.15],
    [hw * 0.5, hl * 0.72], [0, hl], // 이물 끝
    [-hw * 0.5, hl * 0.72], [-hw * 0.92, hl * 0.15],
    [-hw * 0.98, -hl * 0.55],
  ];
  const hullShape = new THREE.Shape();
  outline.forEach(([x, z], i) => {
    if (i === 0) hullShape.moveTo(x, -z); else hullShape.lineTo(x, -z);
  });
  hullShape.lineTo(outline[0][0], -outline[0][1]);

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: hullHei, bevelEnabled: true, bevelThickness: hullHei * 0.12, bevelSize: hw * 0.06, bevelSegments: 2,
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
  bilgeGeo.scale(0.6, 1, 0.9);
  bilgeGeo.translate(0, -hullHei * 0.22, 0);
  const bilgeMesh = new THREE.Mesh(bilgeGeo, new THREE.MeshStandardMaterial({ color: '#140d06', roughness: 0.9 }));
  group.add(bilgeMesh);

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

  // 텀블홈 — 뱃전이 위로 갈수록 안쪽으로 좁아지는 범선 특유의 실루엣.
  // 상부 선체보다 살짝 좁은 밴드를 덧대어 허리선에서 안쪽으로 꺾이는 단을 만든다.
  const tumbleGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: hullHei * 0.5, bevelEnabled: true, bevelThickness: hullHei * 0.05, bevelSize: hw * 0.03, bevelSegments: 2,
  });
  tumbleGeo.rotateX(-Math.PI / 2);
  tumbleGeo.scale(0.93, 1, 0.97);
  tumbleGeo.translate(0, hullHei * 0.52, 0);
  const tumbleMesh = new THREE.Mesh(tumbleGeo, new THREE.MeshStandardMaterial({ color: hullColorLight, roughness: 0.85 }));
  group.add(tumbleMesh);

  // 건월(뱃전 상단 테두리) — 살짝 더 넓게, 얇게 둘러 입체감을 준다
  const gunwaleGeo = new THREE.ExtrudeGeometry(hullShape, { depth: hullHei * 0.16, bevelEnabled: false });
  gunwaleGeo.rotateX(-Math.PI / 2);
  gunwaleGeo.scale(1.05, 1, 1.04);
  const gunwale = new THREE.Mesh(gunwaleGeo, new THREE.MeshStandardMaterial({ color: hullColorLight, roughness: 0.8 }));
  gunwale.position.y = hullHei * 0.86;
  group.add(gunwale);

  // 난간 밑 몰딩(웨이스트 레일) — 건월(뱃전 상단)과 선체 사이를 잇는 밝은 트림 라인으로
  // 난간부와 선체를 시각적으로 구분한다. 뱃전 밖으로 뚜렷이 튀어나오도록 두께를 넉넉히 준다.
  const waistRailGeo = new THREE.ExtrudeGeometry(hullShape, { depth: hullHei * 0.075, bevelEnabled: false });
  waistRailGeo.rotateX(-Math.PI / 2);
  waistRailGeo.scale(1.08, 1, 1.05);
  waistRailGeo.translate(0, hullHei * 0.76, 0);
  const waistRail = new THREE.Mesh(waistRailGeo, new THREE.MeshStandardMaterial({ color: '#e6c15a', roughness: 0.6 }));
  group.add(waistRail);

  // 갑판
  const deckGeo = new THREE.ShapeGeometry(hullShape);
  deckGeo.rotateX(-Math.PI / 2);
  deckGeo.scale(0.92, 1, 0.92);
  const deck = new THREE.Mesh(deckGeo, new THREE.MeshStandardMaterial({ color: deckColor, roughness: 0.9 }));
  deck.position.y = hullHei + 0.05;
  group.add(deck);

  // 포문 — 선체가 거의 풀빔인 중앙 구간에만 배치해 뱃전 밖으로 뜨지 않도록 함
  // 역할별로 개수를 가감: 교역용은 줄여 화물칸 느낌을, 전투용은 늘리고 대형/초대형은 2단 포열을 추가
  const gunportMat = new THREE.MeshStandardMaterial({ color: '#1c130c' });
  function addGunportRow(heightFrac, count, scale = 1) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const gz = -hl * 0.5 + t * hl * 0.65;
        const port = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * sx * scale, 0.35 * sy * scale), gunportMat);
        port.position.set(side * (hw * 0.94 + 0.02), hullHei * heightFrac, gz);
        port.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        group.add(port);
      }
    }
  }
  let gunportCount = Math.max(2, Math.round(hullLen / 2.6));
  if (role === 'trade') gunportCount = Math.max(0, gunportCount - 2);
  if (role === 'combat') gunportCount += 2;
  if (gunportCount > 0) addGunportRow(0.45, gunportCount);
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
        crate.position.set(cx, hullHei + 0.05 + 0.25 * sy, cz);
        crate.rotation.y = i * 0.7;
        group.add(crate);
      } else {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * sx, 0.28 * sx, 0.55 * sy, 10), barrelMat);
        barrel.position.set(cx, hullHei + 0.05 + 0.28 * sy, cz);
        group.add(barrel);
      }
    });
  }

  // 선수루(포어캐슬)/선미루 규모 — 소형 카라벨은 갑판이 낮고 평평했고(플러시 데크),
  // 대형/초대형 갈레온일수록 참고 도면처럼 웅장한 선루를 가졌다. 선체 크기별로 층고를 배분한다.
  const castleScale = { small: 0.4, medium: 0.65, large: 0.9, xlarge: 1.05 }[shipDef.class] ?? 0.7;

  // 선수루(포어캐슬) — 이물 쪽 낮은 갑판 구조물 + 난간 기둥
  const darkPostMat = new THREE.MeshStandardMaterial({ color: '#2e2013' });
  const forecastleH = hullHei * 0.42 * castleScale;
  const forecastle = new THREE.Mesh(
    new THREE.BoxGeometry(hullWid * 0.64, forecastleH, hullLen * 0.15 * castleScale),
    new THREE.MeshStandardMaterial({ color: hullColorLight, roughness: 0.85 })
  );
  forecastle.position.set(0, hullHei + forecastleH / 2 + 0.05, hl * 0.66);
  group.add(forecastle);
  for (let i = -3; i <= 3; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, hullHei * 0.2, 5), darkPostMat);
    post.position.set((i / 3) * hullWid * 0.28, hullHei + forecastleH + 0.15, hl * 0.66 + hullLen * 0.07);
    group.add(post);
  }

  // 선미루 — 선장갑판(퀀터덱)과 그 위의 뒷갑판(포프덱) 2단 구조 + 선미 갤러리 창
  const qdH = hullHei * 1.0 * castleScale, qdLen = hullLen * 0.22 * castleScale;
  const sternDeckMat = new THREE.MeshStandardMaterial({ color: trim.clone().lerp(new THREE.Color('#000'), 0.25), roughness: 0.8 });
  const quarterdeck = new THREE.Mesh(new THREE.BoxGeometry(hullWid * 0.76, qdH, qdLen), sternDeckMat);
  quarterdeck.position.set(0, hullHei + qdH / 2, -hullLen * 0.34);
  group.add(quarterdeck);

  // 선루 층 구분 몰딩 — 선체/퀀터덱, 퀀터덱/포프덱 경계마다 밝은 트림 띠를 둘러
  // 갑판 단이 어디서 나뉘는지 뚜렷이 드러낸다.
  const deckLineMat = new THREE.MeshStandardMaterial({ color: '#e6c15a', roughness: 0.6 });
  function addDeckLine(y, width, len) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(width, hullHei * 0.09, len), deckLineMat);
    line.position.set(0, y, -hullLen * 0.34);
    group.add(line);
  }
  addDeckLine(hullHei + 0.02, hullWid * 0.82, qdLen + 0.1);

  const poopH = hullHei * 0.58 * castleScale, poopLen = hullLen * 0.12 * castleScale;
  const poopMat = new THREE.MeshStandardMaterial({ color: trim.clone().lerp(new THREE.Color('#000'), 0.15), roughness: 0.8 });
  const poop = new THREE.Mesh(new THREE.BoxGeometry(hullWid * 0.5, poopH, poopLen), poopMat);
  poop.position.set(0, hullHei + qdH + poopH / 2, -hullLen * 0.4);
  group.add(poop);
  {
    const line = new THREE.Mesh(new THREE.BoxGeometry(hullWid * 0.56, hullHei * 0.08, poopLen + 0.1), deckLineMat);
    line.position.set(0, hullHei + qdH + 0.02, -hullLen * 0.4);
    group.add(line);
  }

  // 선미 갤러리 창 — 가장 뒤쪽/가장 위(포프덱) 후면, 즉 배 뒤에서 봤을 때 실제로 눈에
  // 들어오는 면에 배치한다(퀀터덱 후면은 포프덱에 가려 거의 보이지 않는다). 창은 포프덱
  // 표면 색이 그대로 창살처럼 비치도록 간격만 두고, 둘레는 실제로 튀어나온 각재 몰딩
  // (BoxGeometry)으로 둘러 소형선에서도 뚜렷하게 보이도록 한다.
  const windowMat = new THREE.MeshStandardMaterial({ color: '#0a1620', roughness: 0.25, metalness: 0.3 });
  const mullionMat = new THREE.MeshStandardMaterial({ color: '#e6c15a', roughness: 0.55 });
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
  }
  addSternGallery(hullHei + qdH + poopH * 0.56, -hullLen * 0.4 - poopLen / 2 - 0.03, hullWid * 0.5, poopH * 0.68);
  // 뒷갑판 난간 기둥(발스트레이드)
  for (let i = -2; i <= 2; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, hullHei * 0.2, 5), darkPostMat);
    post.position.set((i / 2) * hullWid * 0.2, hullHei + qdH + poopH + 0.1, -hullLen * 0.4 - poopLen * 0.3);
    group.add(post);
  }
  // 선미등(랜턴)
  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(hullHei * 0.13, 8, 6),
    new THREE.MeshStandardMaterial({ color: '#f3d98a', emissive: '#c98f2a', emissiveIntensity: 0.5, roughness: 0.4 })
  );
  lantern.position.set(0, hullHei + qdH + poopH + 0.22, -hullLen * 0.42);
  group.add(lantern);

  // 선수상(피겨헤드) — 이물 끝 아래에 작은 장식
  const figurehead = new THREE.Mesh(
    new THREE.ConeGeometry(hullWid * 0.09, hullHei * 0.5, 6),
    new THREE.MeshStandardMaterial({ color: trim.clone().lerp(new THREE.Color('#e6c15a'), 0.4), roughness: 0.6 })
  );
  figurehead.rotation.x = Math.PI * 0.42;
  figurehead.position.set(0, hullHei * 0.35, hl * 1.06);
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
  const mastCount = cls.mastCount;
  let sternMastTopY = hullHei, sternMastZ = -hullLen * 0.3;
  const bowTip = new THREE.Vector3(0, hullHei * 0.7, hl * 0.98);
  const sternDeck = new THREE.Vector3(0, hullHei * 1.1, -hl * 0.9);
  for (let i = 0; i < mastCount; i++) {
    const t = mastCount === 1 ? 0.5 : i / (mastCount - 1);
    const mastZ = hullLen * (0.32 - t * 0.62);
    const mastHeight = hullHei + 7 * sy * (i === Math.floor(mastCount / 2) ? 1.15 : 0.9);
    const mastBaseY = hullHei + 0.1;
    const mastTopY = mastBaseY + mastHeight;
    sternMastTopY = mastTopY;
    sternMastZ = mastZ;

    // 라틴세일(소형 모험용선)은 단일 돛대에 사선 삼각돛 하나로 구성 — 실제 카라벨라 라티나 고증
    if (useLateen) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, mastHeight, 8), mastMat);
      mast.position.set(0, mastBaseY + mastHeight / 2, mastZ);
      group.add(mast);
      const mastTop = new THREE.Vector3(0, mastTopY, mastZ);
      addLine(mastTop, bowTip, 0.035);
      addLine(mastTop, sternDeck, 0.035);
      addShrouds(mastTop, mastZ, 2, 0.028);
      addLateenRig(group, mastBaseY, mastHeight, mastZ, hullWid * 2.0 * sx);
      continue;
    }

    // 특히 높은(주로 중앙) 돛대는 하단/중간/상단 3단(코스+톱+톱갤런트), 나머지는 2단(하단+중간)으로 구성
    const tierCount = mastHeight > 13 ? 3 : 2;
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

    // 삭구(스테이/샤우드) — 돛대 꼭대기에서 이물/고물/뱃전으로
    const mastTop = new THREE.Vector3(0, mastTopY, mastZ);
    addLine(mastTop, bowTip, 0.03);
    addLine(mastTop, sternDeck, 0.03);
    addShrouds(mastTop, mastZ, 3, 0.024);

    // 각 단 상단(활대 위치)에 활대 + 사다리꼴 돛 — 아래부터 코스세일/톱세일/톱갤런트세일
    tierTopYs.forEach((yardY, li) => {
      const yardW = hullWid * 1.7 * sx * 0.55 * sailWidthFactors[li];
      const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, yardW, 6), yardMat);
      yard.rotation.z = Math.PI / 2;
      yard.position.set(0, yardY, mastZ);
      group.add(yard);

      const sailH = mastHeight * sailHeightFracs[li];
      const sailGeo = trapezoid(yardW * 0.98, yardW * 0.8, sailH);
      const sail = new THREE.Mesh(sailGeo, sailMat);
      sail.position.set(0, yardY - sailH / 2 - 0.05, mastZ);
      group.add(sail);
    });
  }

  // 선수 사장(bowsprit)
  const bowsprit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.16, hullLen * 0.3, 6),
    new THREE.MeshStandardMaterial({ color: '#352616' })
  );
  bowsprit.rotation.x = Math.PI / 2.6;
  bowsprit.position.set(0, hullHei * 0.65, hl * 0.95);
  group.add(bowsprit);
  addLine(new THREE.Vector3(0, hullHei * 0.3, hl * 0.55), new THREE.Vector3(0, hullHei * 1.0, hullLen * (0.32 - (mastCount === 1 ? 0.5 : 0) * 0.62)), 0.03);

  // 스프릿세일 — 선수 사장 아래 작은 삼각 돛
  const spritGeo = trapezoid(hullWid * 0.75 * sx, 0.05, hullHei * 0.9, hullHei * 0.1);
  const sprit = new THREE.Mesh(spritGeo, new THREE.MeshStandardMaterial({ color: '#e7ded0', roughness: 0.75, side: THREE.DoubleSide }));
  sprit.position.set(0, hullHei * 0.35, hl * 1.18);
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
    bowFlag.position.set(0, hullHei * 1.05, hl * 1.02);
    group.add(bowFlag);
  }

  group.userData.hullHeight = hullHei;
  group.userData.length = hullLen;
  group.userData.width = hullWid;
  group.userData.role = role;
  return group;
}

const NOTCH_SPEED = 4.2; // 1노치당 m/s
const MAX_FWD = 5;
const MAX_REV = -3;

export class ShipController {
  constructor(mesh, shipDef, heightAt) {
    this.mesh = mesh;
    this.shipDef = shipDef;
    this.heightAt = heightAt;
    this.notch = 0; // -3 .. 5
    this.heading = 0; // rad
    this.pos = new THREE.Vector2(0, 0);
    this.turnInput = 0; // -1..1 from A/D
  }

  throttleUp() { this.notch = Math.min(MAX_FWD, this.notch + 1); }
  throttleDown() { this.notch = Math.max(MAX_REV, this.notch - 1); }

  get speedMs() { return this.notch * NOTCH_SPEED; }
  get speedRatio() { return this.notch >= 0 ? this.notch / MAX_FWD : this.notch / Math.abs(MAX_REV); }

  update(delta, t, isBlocked) {
    const turnRateBase = THREE.MathUtils.degToRad(this.shipDef.turnRate);
    const speedFactor = 0.35 + 0.65 * Math.min(1, Math.abs(this.notch) / MAX_FWD);
    const dir = this.notch < 0 ? -1 : 1;
    const totalTurn = this.turnInput * turnRateBase * speedFactor * dir;
    this.heading += totalTurn * delta;

    const vx = Math.sin(this.heading) * this.speedMs;
    const vz = Math.cos(this.heading) * this.speedMs;
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
    const pitch = Math.atan2(waveAhead - wave, 4) * 1.5;

    this.mesh.position.set(this.pos.x, wave, this.pos.y);
    this.mesh.rotation.set(pitch, this.heading, Math.sin(t * 0.6) * 0.03, 'YXZ');
  }
}
