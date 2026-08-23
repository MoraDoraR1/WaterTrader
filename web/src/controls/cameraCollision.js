import * as THREE from 'three';

// anchor(타겟 근처)에서 desired(원하는 카메라 위치)로 레이를 쏴 colliders에 막히면
// 충돌 지점 바로 앞으로 카메라를 당겨온다 — 카메라가 지형/건물을 뚫고 들어가는 것을 방지.
export function resolveCameraCollision(raycaster, colliders, anchor, desired, margin = 1.2, minDist = 1.5) {
  const offset = new THREE.Vector3().subVectors(desired, anchor);
  const dist = offset.length();
  if (dist < 0.01 || colliders.length === 0) return desired;
  const dir = offset.normalize();
  raycaster.set(anchor, dir);
  raycaster.near = 0;
  raycaster.far = dist;
  const hits = raycaster.intersectObjects(colliders, false);
  if (hits.length) {
    const safeDist = Math.max(minDist, hits[0].distance - margin);
    return anchor.clone().addScaledVector(dir, safeDist);
  }
  return desired;
}
