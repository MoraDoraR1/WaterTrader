import * as THREE from 'three';

export function buildCharacterMesh(gender = 'male') {
  const group = new THREE.Group();
  group.name = `character_${gender}`;

  const skin = new THREE.Color('#e0b18c');
  const outfit = gender === 'female' ? new THREE.Color('#8a2d4d') : new THREE.Color('#2d4a8a');
  const accent = new THREE.Color('#caa24a');

  const legH = gender === 'female' ? 0.85 : 0.9;
  const torsoH = gender === 'female' ? 0.72 : 0.8;
  const shoulderW = gender === 'female' ? 0.78 : 0.9;

  const legs = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.22, legH, 10),
    new THREE.MeshStandardMaterial({ color: '#3a2f28', roughness: 0.9 })
  );
  legs.position.y = legH / 2;
  group.add(legs);

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(shoulderW * 0.5, torsoH * 0.6, 4, 10),
    new THREE.MeshStandardMaterial({ color: outfit, roughness: 0.8 })
  );
  torso.position.y = legH + torsoH * 0.5;
  group.add(torso);

  const belt = new THREE.Mesh(
    new THREE.TorusGeometry(shoulderW * 0.52, 0.06, 6, 16),
    new THREE.MeshStandardMaterial({ color: accent, roughness: 0.6, metalness: 0.3 })
  );
  belt.rotation.x = Math.PI / 2;
  belt.position.y = legH + 0.08;
  group.add(belt);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 14, 12),
    new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 })
  );
  head.position.y = legH + torsoH + 0.32;
  group.add(head);

  const hair = new THREE.Mesh(
    gender === 'female'
      ? new THREE.ConeGeometry(0.34, 0.55, 12)
      : new THREE.SphereGeometry(0.33, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: '#2b2118', roughness: 0.9 })
  );
  hair.position.y = legH + torsoH + (gender === 'female' ? 0.5 : 0.42);
  group.add(hair);

  const hatBrim = gender === 'male'
    ? new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.05, 16),
        new THREE.MeshStandardMaterial({ color: '#1c1c1c' })
      )
    : null;
  if (hatBrim) {
    hatBrim.position.y = legH + torsoH + 0.5;
    group.add(hatBrim);
  }

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.13, torsoH * 0.55, 4, 8),
      new THREE.MeshStandardMaterial({ color: outfit.clone().lerp(new THREE.Color('#000'), 0.15) })
    );
    arm.position.set(side * shoulderW * 0.55, legH + torsoH * 0.55, 0);
    arm.rotation.z = side * 0.12;
    group.add(arm);
  }

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.userData.height = legH + torsoH + 0.6;
  return group;
}

export class CharacterController {
  constructor(mesh) {
    this.mesh = mesh;
    this.pos = new THREE.Vector3(0, 0, 0);
    this.facing = 0;
    this.moveTarget = null;
    this.speed = 4.6;
    this.turnSpeed = 10;
    this.walking = false;
  }

  setPosition(x, z) {
    this.pos.set(x, 0, z);
    this.mesh.position.copy(this.pos);
  }

  moveTo(x, z) {
    this.moveTarget = new THREE.Vector2(x, z);
  }

  cancelMoveTarget() {
    this.moveTarget = null;
  }

  update(delta, inputVec, cameraYaw, bounds) {
    let moveX = 0, moveZ = 0;
    this.walking = false;

    if (inputVec.lengthSq() > 0.0001) {
      this.moveTarget = null;
      const angle = Math.atan2(inputVec.x, inputVec.y) + cameraYaw;
      moveX = Math.sin(angle);
      moveZ = Math.cos(angle);
      this.walking = true;
    } else if (this.moveTarget) {
      const dx = this.moveTarget.x - this.pos.x;
      const dz = this.moveTarget.y - this.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.3) {
        moveX = dx / dist;
        moveZ = dz / dist;
        this.walking = true;
      } else {
        this.moveTarget = null;
      }
    }

    if (this.walking) {
      this.pos.x += moveX * this.speed * delta;
      this.pos.z += moveZ * this.speed * delta;
      if (bounds) {
        this.pos.x = THREE.MathUtils.clamp(this.pos.x, bounds.minX, bounds.maxX);
        this.pos.z = THREE.MathUtils.clamp(this.pos.z, bounds.minZ, bounds.maxZ);
      }
      const targetFacing = Math.atan2(moveX, moveZ);
      let diff = targetFacing - this.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.facing += diff * Math.min(1, this.turnSpeed * delta);
    }

    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.y = this.facing;
  }
}
