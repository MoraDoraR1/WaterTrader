import * as THREE from 'three';
import { SHIP_CLASSES, COUNTRY_COLORS } from '../data/ships.js';

function trapezoid(topW, botW, h) {
  const shape = new THREE.Shape();
  shape.moveTo(-topW / 2, h / 2);
  shape.lineTo(topW / 2, h / 2);
  shape.lineTo(botW / 2, -h / 2);
  shape.lineTo(-botW / 2, -h / 2);
  shape.lineTo(-topW / 2, h / 2);
  return new THREE.ShapeGeometry(shape);
}

export function buildShipMesh(shipDef) {
  const cls = SHIP_CLASSES[shipDef.class];
  const [sx, sy, sz] = cls.hullScale;
  const group = new THREE.Group();
  group.name = `ship_${shipDef.id}`;

  const hullColor = new THREE.Color('#4a2f1c');
  const hullColorLight = new THREE.Color('#6b4526');
  const deckColor = new THREE.Color('#a3814f');
  const trim = new THREE.Color(COUNTRY_COLORS[shipDef.country] || '#888888');
  const rigColor = '#2b2015';

  const hullLen = 10 * sz;
  const hullWid = 3.4 * sx;
  const hullHei = 2.6 * sy;
  const hullMat = new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.85 });

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
  const hullMesh = new THREE.Mesh(hullGeo, hullMat);
  group.add(hullMesh);

  // 건월(뱃전 상단 테두리) — 살짝 더 넓게, 얇게 둘러 입체감을 준다
  const gunwaleGeo = new THREE.ExtrudeGeometry(hullShape, { depth: hullHei * 0.16, bevelEnabled: false });
  gunwaleGeo.rotateX(-Math.PI / 2);
  gunwaleGeo.scale(1.05, 1, 1.04);
  const gunwale = new THREE.Mesh(gunwaleGeo, new THREE.MeshStandardMaterial({ color: hullColorLight, roughness: 0.8 }));
  gunwale.position.y = hullHei * 0.86;
  group.add(gunwale);

  // 갑판
  const deckGeo = new THREE.ShapeGeometry(hullShape);
  deckGeo.rotateX(-Math.PI / 2);
  deckGeo.scale(0.92, 1, 0.92);
  const deck = new THREE.Mesh(deckGeo, new THREE.MeshStandardMaterial({ color: deckColor, roughness: 0.9 }));
  deck.position.y = hullHei + 0.05;
  group.add(deck);

  // 포문 — 선체가 거의 풀빔인 중앙 구간에만 배치해 뱃전 밖으로 뜨지 않도록 함
  const gunportMat = new THREE.MeshStandardMaterial({ color: '#1c130c' });
  const gunportCount = Math.max(2, Math.round(hullLen / 2.6));
  for (const side of [-1, 1]) {
    for (let i = 0; i < gunportCount; i++) {
      const t = (i + 0.5) / gunportCount;
      const gz = -hl * 0.5 + t * hl * 0.65;
      const port = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * sx, 0.35 * sy), gunportMat);
      port.position.set(side * (hw * 0.94 + 0.02), hullHei * 0.45, gz);
      port.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(port);
    }
  }

  // 선미루 (후방 구조물)
  const stern = new THREE.Mesh(
    new THREE.BoxGeometry(hullWid * 0.72, hullHei * 0.95, hullLen * 0.16),
    new THREE.MeshStandardMaterial({ color: trim.clone().lerp(new THREE.Color('#000'), 0.25), roughness: 0.8 })
  );
  stern.position.set(0, hullHei * 1.35, -hullLen * 0.36);
  group.add(stern);

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

  // 돛대 + 활대(야드) + 돛 (가로돛 범선 형태)
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

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.22, mastHeight, 8),
      new THREE.MeshStandardMaterial({ color: '#352616', roughness: 0.9 })
    );
    mast.position.set(0, mastBaseY + mastHeight / 2, mastZ);
    group.add(mast);

    // 삭구(스테이/샤우드) — 돛대 꼭대기에서 이물/고물/뱃전으로
    const mastTop = new THREE.Vector3(0, mastTopY, mastZ);
    addLine(mastTop, bowTip, 0.035);
    addLine(mastTop, sternDeck, 0.035);
    addLine(mastTop, new THREE.Vector3(hw * 0.9, hullHei * 0.9, mastZ), 0.03);
    addLine(mastTop, new THREE.Vector3(-hw * 0.9, hullHei * 0.9, mastZ), 0.03);

    // 활대 2단(코스 세일 + 톱세일) + 사다리꼴 돛
    const yardLevels = [0.42, 0.78];
    yardLevels.forEach((f, li) => {
      const yardY = mastBaseY + mastHeight * f;
      const yardW = (hullWid * 1.7 * sx * 0.55) * (li === 0 ? 1 : 0.68);
      const yard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, yardW, 6),
        new THREE.MeshStandardMaterial({ color: '#3b2a18' })
      );
      yard.rotation.z = Math.PI / 2;
      yard.position.set(0, yardY, mastZ);
      group.add(yard);

      const sailH = mastHeight * (li === 0 ? 0.32 : 0.24);
      const sailGeo = trapezoid(yardW * 0.98, yardW * 0.8, sailH);
      const sail = new THREE.Mesh(sailGeo, new THREE.MeshStandardMaterial({ color: '#e7ded0', roughness: 0.75, side: THREE.DoubleSide }));
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

  // 국기
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6 * sx, 1 * sy),
    new THREE.MeshStandardMaterial({ color: trim, side: THREE.DoubleSide })
  );
  flag.position.set(0, sternMastTopY + 0.6, sternMastZ);
  group.add(flag);

  group.userData.hullHeight = hullHei;
  group.userData.length = hullLen;
  group.userData.width = hullWid;
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
