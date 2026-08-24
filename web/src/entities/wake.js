import * as THREE from 'three';

const FOAM_COLOR = '#eef6f2';

// 선미 쪽에 주기적으로 뿌려 서서히 번지며 사라지는 물거품 자국 — 배가 지나간 자리에
// 남는 항적(wake)을 흉내낸다. 각 자국은 독립된 원판 메시(월드 좌표 고정)로, 시간이
// 지날수록 커지고 옅어지다 사라진다.
export class WakeTrail {
  constructor(scene, maxPuffs = 70) {
    this.scene = scene;
    this.maxPuffs = maxPuffs;
    this.puffs = [];
    this.geo = new THREE.CircleGeometry(1, 10);
    this.geo.rotateX(-Math.PI / 2);
  }

  spawn(x, y, z, baseScale = 1, life = 2.4) {
    if (this.puffs.length >= this.maxPuffs) {
      const oldest = this.puffs.shift();
      this.scene.remove(oldest.mesh);
      oldest.mesh.material.dispose();
    }
    const mat = new THREE.MeshBasicMaterial({
      color: FOAM_COLOR, transparent: true, opacity: 0.42, depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.geo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(baseScale * 0.4);
    mesh.rotation.y = Math.random() * Math.PI;
    this.scene.add(mesh);
    this.puffs.push({ mesh, life, maxLife: life, baseScale });
  }

  update(delta, elapsed, heightAt) {
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.material.dispose();
        this.puffs.splice(i, 1);
        continue;
      }
      const t = 1 - p.life / p.maxLife;
      p.mesh.scale.setScalar(p.baseScale * (0.4 + t * 1.5));
      p.mesh.material.opacity = 0.42 * (1 - t) * (1 - t * 0.25);
      if (heightAt) p.mesh.position.y = heightAt(p.mesh.position.x, p.mesh.position.z, elapsed) + 0.05;
    }
  }
}

// 이물 양옆으로 갈라지는 물살 — 매 프레임 배의 실제 위치/방향/속도로 정점을 다시 계산해
// 그리는 동적 지오메트리라, 회전 행렬 관례를 신경 쓸 필요 없이 항상 배 이물에 맞물린다.
export class BowWave {
  constructor(scene) {
    this.geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.Float32BufferAttribute(new Float32Array(12 * 3), 3);
    this.geo.setAttribute('position', this.posAttr);
    this.mat = new THREE.MeshBasicMaterial({
      color: FOAM_COLOR, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  // shipPos: Vector2, heading: rad, hw/hl: 선체 반폭/반길이, speedRatio: 0..1(속력),
  // dir: 1=전진/-1=후진(물을 가르는 쪽이 이물이냐 고물이냐), waveY: 그 지점의 파고
  update(shipPos, heading, hw, hl, speedRatio, waveY, dir = 1) {
    const visible = speedRatio > 0.05;
    this.mesh.visible = visible;
    if (!visible) return;

    const fwdX = Math.sin(heading) * dir, fwdZ = Math.cos(heading) * dir;
    const rightX = Math.cos(heading), rightZ = -Math.sin(heading);
    const bowX = shipPos.x + fwdX * hl * 0.95, bowZ = shipPos.y + fwdZ * hl * 0.95;
    const spread = hw * (1.1 + speedRatio * 1.7);
    const back = hl * (0.5 + speedRatio * 1.4);

    const verts = [];
    for (const side of [-1, 1]) {
      const nearX = bowX + rightX * side * hw * 0.5, nearZ = bowZ + rightZ * side * hw * 0.5;
      const outX = bowX + rightX * side * spread - fwdX * back, outZ = bowZ + rightZ * side * spread - fwdZ * back;
      const out2X = bowX + rightX * side * spread * 0.55 - fwdX * back * 1.3;
      const out2Z = bowZ + rightZ * side * spread * 0.55 - fwdZ * back * 1.3;
      verts.push(
        bowX, waveY, bowZ, outX, waveY, outZ, nearX, waveY, nearZ,
        nearX, waveY, nearZ, outX, waveY, outZ, out2X, waveY, out2Z,
      );
    }
    this.posAttr.set(new Float32Array(verts));
    this.posAttr.needsUpdate = true;
    this.geo.computeBoundingSphere();
    this.mat.opacity = 0.12 + speedRatio * 0.4;
  }
}
