import { Vec2, clamp } from '../util/math2d.js';
import { Camera2D, worldToScreen } from '../render/canvas2d.js';
import { characterSprite } from '../render/pixelSprites.js';
import { CharacterController } from '../entities/characterController.js';
import { getCity, NPC_ROLE_COLORS, NPC_ROLE_LABELS } from '../data/cities.js';
import { COUNTRY_NAMES } from '../data/ships.js';
import { isDown } from '../controls/keys.js';
import { state } from '../state.js';
import { hud } from '../ui/hud.js';
import { openShipyard } from '../ui/shipyardPanel.js';
import { openMarket } from '../ui/marketPanel.js';
import { openQuestBoard } from '../ui/questPanel.js';

const BOUNDS = { minX: -85, maxX: 85, minZ: -85, maxZ: 85 };
const INTERACT_RANGE = 7.5;
const PX_PER_UNIT = 2.55;

function defaultNpcs() {
  return [
    { role: 'harbormaster', name: '항구 관리인', line: '아직 이 항구는 정비가 덜 되었습니다. 곧 상단이 들어올 예정입니다.' },
    { role: 'citizen', name: '부두 노동자', line: '이 항구는 아직 조용하지만, 언젠가 번성할 겁니다.' },
  ];
}

export class CityScene {
  constructor(cityId, onExit, logicalW, logicalH) {
    const city = getCity(cityId);
    this.city = { ...city, npcs: city.npcs && city.npcs.length ? city.npcs : defaultNpcs() };
    this.onExit = onExit;
    this.logicalW = logicalW;
    this.logicalH = logicalH;
    this.camera = new Camera2D();

    this.buildingColliders = [];
    this._buildings = this._layoutBuildings();
    this.npcObjects = this._layoutNpcs();
    this.exitPos = new Vec2(0, 92);

    this.character = new CharacterController();
    const harbormaster = this.npcObjects.find((o) => o.npc.role === 'harbormaster');
    if (harbormaster) {
      const centerX = 0, centerZ = -10;
      const hx = harbormaster.pos.x, hz = harbormaster.pos.y;
      let dx = centerX - hx, dz = centerZ - hz;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
      const spawnX = hx + dx * 3.5, spawnZ = hz + dz * 3.5;
      this.character.setPosition(spawnX, spawnZ);
      this.character.facing = Math.atan2(hx - spawnX, hz - spawnZ);
    } else {
      this.character.setPosition(0, 40);
      this.character.facing = Math.PI;
    }
    this.camera.snapTo(this.character.pos.x, this.character.pos.y);
  }

  _layoutBuildings() {
    const positions = [
      [-46, -20], [46, -20], [-46, 20], [46, 20],
      [0, -55], [-60, -55], [60, -55],
    ];
    const buildings = [];
    for (const [x, z] of positions) {
      const w = 16 + Math.random() * 6, d = 14 + Math.random() * 5;
      const box = { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
      buildings.push({ x, z, w, d });
      this.buildingColliders.push(box);
    }
    return buildings;
  }

  _layoutNpcs() {
    const angleStep = (Math.PI * 2) / Math.max(1, this.city.npcs.length);
    return this.city.npcs.map((npc, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const r = 18;
      const pos = new Vec2(Math.cos(angle) * r, Math.sin(angle) * r - 10);
      return { npc, pos, facing: angle + Math.PI, gender: npc.role === 'merchant' && i % 2 === 0 ? 'female' : 'male' };
    });
  }

  onWheelZoom(deltaY) { this.camera.zoom = clamp(this.camera.zoom - deltaY * 0.0011, 0.6, 2); }

  _findInteractable() {
    let best = null, bestD = Infinity;
    for (const o of this.npcObjects) {
      const d = this.character.pos.distanceTo(o.pos);
      if (d < bestD) { bestD = d; best = { kind: 'npc', obj: o, dist: d }; }
    }
    const exitD = this.character.pos.distanceTo(this.exitPos);
    if (exitD < bestD) best = { kind: 'exit', dist: exitD };
    if (!best || best.dist > INTERACT_RANGE) return null;
    return best;
  }

  handleInteract() {
    if (hud.isInventoryOpen() || hud.isShipyardOpen() || hud.isMarketOpen() || hud.isQuestBoardOpen()) return;
    const target = this._findInteractable();
    if (!target) { hud.toast('상호작용할 대상이 없습니다.'); return; }

    if (target.kind === 'exit') { this.onExit(); return; }
    const npc = target.obj.npc;
    if (npc.role === 'shipwright') {
      hud.showDialogue(npc.name, npc.line, [
        { label: '배 구매', onClick: () => { hud.hideDialogue(); openShipyard('buy'); } },
        { label: '수리', onClick: () => { hud.hideDialogue(); openShipyard('repair'); } },
        { label: '부품', onClick: () => { hud.hideDialogue(); openShipyard('parts'); } },
        { label: '닫기', onClick: () => hud.hideDialogue() },
      ]);
      return;
    }
    if (npc.role === 'merchant') {
      hud.showDialogue(npc.name, npc.line, [
        { label: '거래', onClick: () => { hud.hideDialogue(); openMarket(this.city.id); } },
        { label: '닫기', onClick: () => hud.hideDialogue() },
      ]);
      return;
    }
    if (npc.role === 'harbormaster') {
      hud.showDialogue(npc.name, npc.line, [
        { label: '출항', onClick: () => { hud.hideDialogue(); this.onExit(); } },
        { label: '의뢰', onClick: () => { hud.hideDialogue(); openQuestBoard(this.city.id); } },
        { label: '닫기', onClick: () => hud.hideDialogue() },
      ]);
      return;
    }
    hud.showDialogue(npc.name, npc.line, [{ label: '닫기', onClick: () => hud.hideDialogue() }]);
  }

  // 화면 좌표(캔버스 기준, 논리 해상도 스케일)를 월드 좌표로 되돌려 이동 목표로 삼는다.
  handleRightClickAt(screenX, screenY) {
    const px = PX_PER_UNIT * this.camera.zoom;
    const wx = (screenX - this.logicalW / 2) / px + this.camera.x;
    const wz = (screenY - this.logicalH / 2) / px + this.camera.y;
    this.character.moveTo(clamp(wx, BOUNDS.minX, BOUNDS.maxX), clamp(wz, BOUNDS.minZ, BOUNDS.maxZ));
  }

  update(delta) {
    const forward = (isDown('KeyW') ? 1 : 0) - (isDown('KeyS') ? 1 : 0);
    const strafe = (isDown('KeyD') ? 1 : 0) - (isDown('KeyA') ? 1 : 0);
    this.character.update(delta, { x: strafe, y: forward }, BOUNDS, this.buildingColliders);
    this.camera.follow(this.character.pos.x, this.character.pos.y, delta, 7);

    const interactable = this._findInteractable();
    if (interactable) {
      const name = interactable.kind === 'exit' ? '배로 돌아가기' : interactable.obj.npc.name;
      hud.showInteractPrompt(true, `[F 또는 좌클릭] ${name}과 상호작용`);
    } else {
      hud.showInteractPrompt(false);
    }

    hud.setLocation(this.city.name, `${COUNTRY_NAMES[this.city.country]} 항구도시`);
  }

  render(ctx) {
    const w = this.logicalW, h = this.logicalH;
    const px = PX_PER_UNIT * this.camera.zoom;
    const toScreen = (wx, wz) => worldToScreen(this.camera, px, wx, wz, w, h);

    ctx.fillStyle = '#c9b896';
    ctx.fillRect(0, 0, w, h);

    // 광장
    const plazaC = toScreen(0, 0);
    ctx.fillStyle = '#d8cba3';
    ctx.beginPath(); ctx.arc(plazaC.x, plazaC.y, 30 * px, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9aa5a0';
    ctx.beginPath(); ctx.arc(plazaC.x, plazaC.y, 2.3 * px, 0, Math.PI * 2); ctx.fill();

    // 부두/바다(화면 하단, 도시 남쪽)
    const dockTop = toScreen(-70, 60);
    ctx.fillStyle = '#0f4a63';
    ctx.fillRect(0, dockTop.y, w, h - dockTop.y);
    const pierC = toScreen(0, 78);
    ctx.fillStyle = '#5a4326';
    ctx.fillRect(pierC.x - 7 * px, pierC.y - 20 * px, 14 * px, 40 * px);

    // 건물
    for (const b of this._buildings) {
      const c = toScreen(b.x, b.z);
      const bw = b.w * px, bd = b.d * px;
      ctx.fillStyle = '#e4dcc3';
      ctx.fillRect(c.x - bw / 2, c.y - bd / 2, bw, bd);
      ctx.strokeStyle = '#8a7658';
      ctx.lineWidth = 1;
      ctx.strokeRect(c.x - bw / 2, c.y - bd / 2, bw, bd);
      ctx.fillStyle = '#a8492f';
      ctx.beginPath();
      ctx.moveTo(c.x - bw * 0.4, c.y - bd * 0.15);
      ctx.lineTo(c.x, c.y - bd * 0.55);
      ctx.lineTo(c.x + bw * 0.4, c.y - bd * 0.15);
      ctx.closePath(); ctx.fill();
    }

    // 출항 마커
    const exitP = toScreen(this.exitPos.x, this.exitPos.y);
    ctx.fillStyle = '#e6c15a';
    ctx.beginPath();
    ctx.moveTo(exitP.x, exitP.y - 10);
    ctx.lineTo(exitP.x - 5, exitP.y + 4);
    ctx.lineTo(exitP.x + 5, exitP.y + 4);
    ctx.closePath(); ctx.fill();

    // NPC
    for (const o of this.npcObjects) {
      const p = toScreen(o.pos.x, o.pos.y);
      const roleColor = NPC_ROLE_COLORS[o.npc.role] || '#999';
      ctx.fillStyle = roleColor;
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.arc(p.x, p.y + 4, 4.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      const sprite = characterSprite(o.gender, roleColor);
      const scale = px / PX_PER_UNIT * 1.3;
      ctx.drawImage(sprite, p.x - (sprite.width * scale) / 2, p.y - sprite.height * scale + 4, sprite.width * scale, sprite.height * scale);
      ctx.fillStyle = 'rgba(20,14,8,0.75)';
      ctx.font = '7px sans-serif';
      ctx.textAlign = 'center';
      const label = NPC_ROLE_LABELS[o.npc.role] || o.npc.name;
      const tw = ctx.measureText(label).width;
      ctx.fillRect(p.x - tw / 2 - 2, p.y - sprite.height * scale - 6, tw + 4, 9);
      ctx.fillStyle = '#f0e6d2';
      ctx.fillText(label, p.x, p.y - sprite.height * scale + 1);
    }

    // 플레이어 캐릭터
    const cp = toScreen(this.character.pos.x, this.character.pos.y);
    const sprite = characterSprite(state.gender, null);
    const scale = px / PX_PER_UNIT * 1.3;
    ctx.save();
    ctx.translate(cp.x, cp.y - sprite.height * scale / 2 + 3);
    ctx.rotate(-this.character.facing);
    ctx.drawImage(sprite, -sprite.width * scale / 2, -sprite.height * scale / 2, sprite.width * scale, sprite.height * scale);
    ctx.restore();
  }
}
