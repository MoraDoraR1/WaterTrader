import * as THREE from 'three';

const GRAVITY = -9.8;

export class CannonballPool {
  constructor(scene, maxBalls = 40) {
    this.scene = scene;
    this.balls = [];
    this.geo = new THREE.SphereGeometry(0.5, 8, 8);
    this.mat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.5, metalness: 0.4 });
  }

  fire(originVec3, dirVec3, speed, owner) {
    const mesh = new THREE.Mesh(this.geo, this.mat);
    mesh.position.copy(originVec3);
    this.scene.add(mesh);
    this.balls.push({
      mesh,
      vel: dirVec3.clone().multiplyScalar(speed),
      life: 4,
      owner,
      hit: false,
    });
  }

  update(delta, targets, onHit) {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.vel.y += GRAVITY * delta;
      b.mesh.position.addScaledVector(b.vel, delta);
      b.life -= delta;

      let dead = b.life <= 0 || b.mesh.position.y < -2;

      if (!dead) {
        for (const target of targets) {
          if (target.owner === b.owner || target.dead) continue;
          const d = target.position.distanceTo(b.mesh.position);
          if (d < target.radius) {
            onHit(target, b);
            dead = true;
            break;
          }
        }
      }

      if (dead) {
        this.scene.remove(b.mesh);
        this.balls.splice(i, 1);
      }
    }
  }
}
