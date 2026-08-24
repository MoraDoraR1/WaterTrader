import * as THREE from 'three';
import { buildShipMesh } from './ship.js';

// 함대의 예비 선박을 바다에서 플레이어 뒤쪽 대형(편대) 위치를 따라오는 시각적 호위선으로
// 렌더링한다. 전투/충돌에는 관여하지 않는 순수 연출용 개체 — 물리는 플레이어 배를 향한
// 목표 지점을 향해 단순히 보간(lerp)하는 것으로 충분히 자연스러운 편대 느낌을 낸다.
const FORMATION_SLOTS = [
  [-13, -16], // 좌현 뒤
  [13, -16], // 우현 뒤
  [0, -30], // 정중앙 더 뒤
];

export class EscortShip {
  constructor(scene, shipDef, slotIndex) {
    this.mesh = buildShipMesh(shipDef);
    scene.add(this.mesh);
    this.pos = new THREE.Vector2(0, 0);
    this.heading = 0;
    this.slot = FORMATION_SLOTS[slotIndex % FORMATION_SLOTS.length];
    this._initialized = false;
  }

  update(delta, t, playerShip, heightAt) {
    const fwd = new THREE.Vector2(Math.sin(playerShip.heading), Math.cos(playerShip.heading));
    const right = new THREE.Vector2(fwd.y, -fwd.x);
    const [lat, back] = this.slot;
    const desired = new THREE.Vector2(
      playerShip.pos.x + right.x * lat + fwd.x * back,
      playerShip.pos.y + right.y * lat + fwd.y * back
    );

    if (!this._initialized) {
      this.pos.copy(desired);
      this.heading = playerShip.heading;
      this._initialized = true;
    } else {
      const toDesired = new THREE.Vector2().subVectors(desired, this.pos);
      const dist = toDesired.length();
      // 거리가 멀수록 빠르게 따라붙고(대열 이탈 후 복귀), 가까우면 살짝 느슨하게 따라온다.
      const catchUp = THREE.MathUtils.clamp(dist * 0.9, 1.5, 14);
      if (dist > 0.001) this.pos.addScaledVector(toDesired.normalize(), Math.min(dist, catchUp * delta));

      if (dist > 0.6) {
        const targetHeading = Math.atan2(toDesired.x, toDesired.y);
        let diff = targetHeading - this.heading;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        this.heading += THREE.MathUtils.clamp(diff, -1, 1) * delta * 1.6;
      } else {
        let diff = playerShip.heading - this.heading;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        this.heading += diff * Math.min(1, delta * 1.6);
      }
    }

    const wave = heightAt ? heightAt(this.pos.x, this.pos.y, t) : 0;
    this.mesh.position.set(this.pos.x, wave, this.pos.y);
    this.mesh.rotation.y = this.heading;
  }

  dispose(scene) {
    scene.remove(this.mesh);
  }
}
