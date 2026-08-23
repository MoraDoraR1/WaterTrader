import * as THREE from 'three';
import { buildShipMesh } from './ship.js';
import { getShip } from '../data/ships.js';

const AGGRO_RANGE = 90;
const ATTACK_RANGE = 55;
const STANDOFF = 40;
const FIRE_INTERVAL = 2.6;

export class NpcShip {
  constructor(scene, def) {
    this.def = def;
    this.shipDef = getShip(def.shipId);
    this.mesh = buildShipMesh(this.shipDef);
    scene.add(this.mesh);

    this.spawn = new THREE.Vector2(def.pos[0], def.pos[1]);
    this.pos = this.spawn.clone();
    this.heading = Math.random() * Math.PI * 2;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.state = 'patrol';
    this.patrolTarget = this._randomPatrolPoint();
    this.fireTimer = FIRE_INTERVAL * Math.random();
    this.dead = false;
    this.owner = def.id;
    this.radius = (this.mesh.userData.length || 10) * 0.55;

    this.mesh.position.set(this.pos.x, 0, this.pos.y);
  }

  _randomPatrolPoint() {
    const r = this.def.patrolRadius || 100;
    const a = Math.random() * Math.PI * 2;
    return new THREE.Vector2(this.spawn.x + Math.cos(a) * r, this.spawn.y + Math.sin(a) * r);
  }

  get position() { return new THREE.Vector3(this.pos.x, 0, this.pos.y); }

  takeDamage(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0 && !this.dead) {
      this.dead = true;
      this.state = 'sunk';
    }
  }

  update(delta, t, playerPos2, heightAt, cannonPool, playerVecTarget) {
    if (this.dead) {
      this.mesh.position.y -= delta * 1.5;
      this.mesh.rotation.z += delta * 0.3;
      return;
    }

    const toPlayer = new THREE.Vector2(playerPos2.x - this.pos.x, playerPos2.y - this.pos.y);
    const distToPlayer = toPlayer.length();

    if (this.def.hostile) {
      if (this.state === 'patrol' && distToPlayer < AGGRO_RANGE) this.state = 'chase';
      if (this.state === 'chase' && distToPlayer < ATTACK_RANGE) this.state = 'attack';
      if (this.state !== 'patrol' && distToPlayer > AGGRO_RANGE * 1.6) this.state = 'patrol';
    }

    let targetDir;
    let speed;
    if (this.state === 'patrol') {
      const toTarget = new THREE.Vector2(this.patrolTarget.x - this.pos.x, this.patrolTarget.y - this.pos.y);
      if (toTarget.length() < 8) this.patrolTarget = this._randomPatrolPoint();
      targetDir = toTarget.normalize();
      speed = 5;
    } else if (this.state === 'chase') {
      targetDir = toPlayer.clone().normalize();
      speed = 8;
    } else {
      const standoffVec = toPlayer.clone().normalize();
      const desired = distToPlayer < STANDOFF ? standoffVec.negate() : standoffVec;
      targetDir = new THREE.Vector2(-standoffVec.y, standoffVec.x);
      if (distToPlayer < STANDOFF * 0.7) targetDir = desired;
      speed = 4;

      this.fireTimer -= delta;
      if (this.fireTimer <= 0 && distToPlayer < ATTACK_RANGE) {
        this.fireTimer = FIRE_INTERVAL;
        const dir3 = new THREE.Vector3(toPlayer.x, 0.15, toPlayer.y).normalize();
        const origin = this.position.clone().addScaledVector(dir3, this.radius * 0.6);
        origin.y = 3;
        cannonPool.fire(origin, dir3, 34, this.owner);
      }
    }

    const targetHeading = Math.atan2(targetDir.x, targetDir.y);
    let diff = targetHeading - this.heading;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.heading += THREE.MathUtils.clamp(diff, -1, 1) * delta * 1.4;

    this.pos.x += Math.sin(this.heading) * speed * delta;
    this.pos.y += Math.cos(this.heading) * speed * delta;

    const wave = heightAt ? heightAt(this.pos.x, this.pos.y, t) : 0;
    this.mesh.position.set(this.pos.x, wave, this.pos.y);
    this.mesh.rotation.y = this.heading;
  }
}
