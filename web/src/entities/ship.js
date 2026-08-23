import * as THREE from 'three';
import { SHIP_CLASSES, COUNTRY_COLORS } from '../data/ships.js';

export function buildShipMesh(shipDef) {
  const cls = SHIP_CLASSES[shipDef.class];
  const [sx, sy, sz] = cls.hullScale;
  const group = new THREE.Group();
  group.name = `ship_${shipDef.id}`;

  const hullColor = new THREE.Color('#5b3a21');
  const deckColor = new THREE.Color('#8a6a3f');
  const trim = new THREE.Color(COUNTRY_COLORS[shipDef.country] || '#888888');

  // 선체 — 본체 박스 + 선수(뱃머리) 마름모 프로우로 뾰족한 실루엣 구성 (+Z가 선수 방향)
  const hullLen = 10 * sz;
  const hullWid = 3.4 * sx;
  const hullHei = 2.6 * sy;
  const hullMat = new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.85 });

  const bodyLen = hullLen * 0.8;
  const bodyFrontZ = hullLen * 0.14; // 본체 앞면 z 위치
  const hullBody = new THREE.Mesh(new THREE.BoxGeometry(hullWid, hullHei, bodyLen), hullMat);
  hullBody.position.set(0, hullHei / 2, bodyFrontZ - bodyLen / 2);
  group.add(hullBody);

  const prowSide = hullWid * 0.95;
  const prow = new THREE.Mesh(new THREE.BoxGeometry(prowSide, hullHei, prowSide), hullMat);
  prow.rotation.y = Math.PI / 4;
  prow.position.set(0, hullHei / 2, bodyFrontZ);
  group.add(prow);

  // 갑판
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(hullWid * 0.9, 0.25, hullLen * 0.75),
    new THREE.MeshStandardMaterial({ color: deckColor, roughness: 0.9 })
  );
  deck.position.set(0, hullHei * 0.5, 0);
  group.add(deck);

  // 선미루 (후방 구조물)
  const stern = new THREE.Mesh(
    new THREE.BoxGeometry(hullWid * 0.75, hullHei * 0.9, hullLen * 0.18),
    new THREE.MeshStandardMaterial({ color: trim.clone().lerp(new THREE.Color('#000'), 0.25), roughness: 0.8 })
  );
  stern.position.set(0, hullHei * 0.85, -hullLen * 0.34);
  group.add(stern);

  // 돛대 + 돛
  const mastCount = cls.mastCount;
  let sternMastTopY = hullHei, sternMastZ = -hullLen * 0.3;
  for (let i = 0; i < mastCount; i++) {
    const t = mastCount === 1 ? 0.5 : i / (mastCount - 1);
    const mastZ = hullLen * (0.32 - t * 0.62);
    const mastHeight = hullHei + 7 * sy * (i === Math.floor(mastCount / 2) ? 1.15 : 0.9);
    sternMastTopY = hullHei * 0.5 + mastHeight;
    sternMastZ = mastZ;

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.2, mastHeight, 8),
      new THREE.MeshStandardMaterial({ color: '#3b2a18', roughness: 0.9 })
    );
    mast.position.set(0, hullHei * 0.5 + mastHeight / 2, mastZ);
    group.add(mast);

    const sailW = hullWid * 1.6 * sx * 0.55;
    const sailH = mastHeight * 0.5;
    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(sailW, sailH),
      new THREE.MeshStandardMaterial({ color: '#ece4d3', roughness: 0.7, side: THREE.DoubleSide })
    );
    sail.position.set(0, hullHei * 0.5 + mastHeight * 0.62, mastZ);
    group.add(sail);
  }

  // 선수 사장(bowsprit)
  const bowsprit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.16, hullLen * 0.28, 6),
    new THREE.MeshStandardMaterial({ color: '#3b2a18' })
  );
  bowsprit.rotation.x = Math.PI / 2.6;
  bowsprit.position.set(0, hullHei * 0.6, hullLen * 0.55);
  group.add(bowsprit);

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
    this.helmInput = 0; // -1..1 from right-drag
  }

  throttleUp() { this.notch = Math.min(MAX_FWD, this.notch + 1); }
  throttleDown() { this.notch = Math.max(MAX_REV, this.notch - 1); }

  get speedMs() { return this.notch * NOTCH_SPEED; }
  get speedRatio() { return this.notch >= 0 ? this.notch / MAX_FWD : this.notch / Math.abs(MAX_REV); }

  update(delta, t) {
    const turnRateBase = THREE.MathUtils.degToRad(this.shipDef.turnRate);
    const speedFactor = 0.35 + 0.65 * Math.min(1, Math.abs(this.notch) / MAX_FWD);
    const dir = this.notch < 0 ? -1 : 1;
    const totalTurn = (this.turnInput + this.helmInput) * turnRateBase * speedFactor * dir;
    this.heading += totalTurn * delta;

    const vx = Math.sin(this.heading) * this.speedMs;
    const vz = Math.cos(this.heading) * this.speedMs;
    this.pos.x += vx * delta;
    this.pos.y += vz * delta;

    const wave = this.heightAt ? this.heightAt(this.pos.x, this.pos.y, t) : 0;
    const waveAhead = this.heightAt ? this.heightAt(this.pos.x + Math.sin(this.heading) * 4, this.pos.y + Math.cos(this.heading) * 4, t) : 0;
    const pitch = Math.atan2(waveAhead - wave, 4) * 1.5;

    this.mesh.position.set(this.pos.x, wave, this.pos.y);
    this.mesh.rotation.set(pitch, this.heading, Math.sin(t * 0.6) * 0.03, 'YXZ');
  }
}
