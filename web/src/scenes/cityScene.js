import { Vec2, clamp } from '../util/math2d.js';
import { Camera2D, IsoProjection } from '../render/canvas2d.js';
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
    this.iso = new IsoProjection(PX_PER_UNIT, 0.55);

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
    const p = this.iso.toWorld(this.camera, screenX, screenY, this.logicalW, this.logicalH);
    this.character.moveTo(clamp(p.x, BOUNDS.minX, BOUNDS.maxX), clamp(p.z, BOUNDS.minZ, BOUNDS.maxZ));
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

  // world(cx,cz) 중심의 원을 다각형으로 근사해 그린다 — 선형 투영에서 원은 타원이 되므로,
  // 정확한 타원 대신 투영된 다각형으로 근사하면 셰어(shear)까지 자동으로 반영된다.
  _isoDisc(ctx, w, h, cx, cz, radius, fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    const N = 20;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const p = this.iso.toScreen(this.camera, cx + Math.cos(a) * radius, cz + Math.sin(a) * radius, w, h);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();
  }

  // 사각 평면(바닥/부두 등)을 세계 좌표 네 꼭짓점으로 그린다.
  _isoQuad(ctx, w, h, x0, z0, x1, z1, fillStyle) {
    const p0 = this.iso.toScreen(this.camera, x0, z0, w, h);
    const p1 = this.iso.toScreen(this.camera, x1, z0, w, h);
    const p2 = this.iso.toScreen(this.camera, x1, z1, w, h);
    const p3 = this.iso.toScreen(this.camera, x0, z1, w, h);
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fill();
  }

  // 3면(지붕/오른쪽 벽/앞쪽 벽)이 보이는 단순 아이소메트릭 건물 블록.
  _drawBuildingBlock(ctx, w, h, b) {
    const hw = b.w / 2, hd = b.d / 2;
    const wallPx = 13 * this.camera.zoom, roofPx = 9 * this.camera.zoom;
    const corners = [
      [b.x - hw, b.z - hd], [b.x + hw, b.z - hd], [b.x + hw, b.z + hd], [b.x - hw, b.z + hd],
    ].map(([x, z]) => this.iso.toScreen(this.camera, x, z, w, h));
    const wallTop = corners.map((p) => ({ x: p.x, y: p.y - wallPx }));
    const roofTop = corners.map((p) => ({ x: p.x, y: p.y - wallPx - roofPx }));
    const roofPeak = { x: (wallTop[0].x + wallTop[2].x) / 2, y: (wallTop[0].y + wallTop[2].y) / 2 - roofPx * 1.4 };

    const poly = (ctx2, pts, style) => {
      ctx2.fillStyle = style;
      ctx2.beginPath();
      pts.forEach((p, i) => { if (i === 0) ctx2.moveTo(p.x, p.y); else ctx2.lineTo(p.x, p.y); });
      ctx2.closePath();
      ctx2.fill();
    };
    // 오른쪽 벽(c1-c2), 앞쪽 벽(c2-c3) — 항상 이 두 면이 카메라를 향한다.
    poly(ctx, [corners[1], corners[2], wallTop[2], wallTop[1]], '#c7b48c');
    poly(ctx, [corners[2], corners[3], wallTop[3], wallTop[2]], '#e4dcc3');
    // 지붕(각뿔형 근사 — 꼭짓점 하나로 모으는 팔작지붕 느낌)
    poly(ctx, [wallTop[1], wallTop[2], roofPeak], '#8a3a28');
    poly(ctx, [wallTop[2], wallTop[3], roofPeak], '#a8492f');
    poly(ctx, [wallTop[0], wallTop[1], roofPeak], '#8a3a28');
    poly(ctx, [wallTop[3], wallTop[0], roofPeak], '#a8492f');
  }

  render(ctx) {
    const w = this.logicalW, h = this.logicalH;
    this.iso.scaleX = PX_PER_UNIT * this.camera.zoom;
    this.iso.scaleY = this.iso.scaleX * 0.55;

    ctx.fillStyle = '#c9b896';
    ctx.fillRect(0, 0, w, h);

    this._isoDisc(ctx, w, h, 0, 0, 30, '#d8cba3');

    // 부두/바다(도시 남쪽)
    this._isoQuad(ctx, w, h, -140, 55, 140, 220, '#0f4a63');
    this._isoQuad(ctx, w, h, -7, 58, 7, 98, '#5a4326');

    this._isoDisc(ctx, w, h, 0, 0, 2.3, '#9aa5a0');

    // 출항 마커
    const exitP = this.iso.toScreen(this.camera, this.exitPos.x, this.exitPos.y, w, h);
    ctx.fillStyle = '#e6c15a';
    ctx.beginPath();
    ctx.moveTo(exitP.x, exitP.y - 10);
    ctx.lineTo(exitP.x - 5, exitP.y + 4);
    ctx.lineTo(exitP.x + 5, exitP.y + 4);
    ctx.closePath(); ctx.fill();

    // 건물 + NPC + 플레이어를 화면 깊이(x+z) 순으로 함께 정렬해 그린다(페인터 알고리즘).
    const drawables = [
      ...this._buildings.map((b) => ({ depth: b.x + b.z + b.w / 2 + b.d / 2, draw: () => this._drawBuildingBlock(ctx, w, h, b) })),
      ...this.npcObjects.map((o) => ({ depth: o.pos.x + o.pos.y, draw: () => this._drawNpc(ctx, w, h, o) })),
      { depth: this.character.pos.x + this.character.pos.y, draw: () => this._drawPlayer(ctx, w, h) },
    ].sort((a, b) => a.depth - b.depth);
    for (const d of drawables) d.draw();
  }

  _drawNpc(ctx, w, h, o) {
    const p = this.iso.toScreen(this.camera, o.pos.x, o.pos.y, w, h);
    const roleColor = NPC_ROLE_COLORS[o.npc.role] || '#999';
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = roleColor;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 3, 4.6, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    const sprite = characterSprite(o.gender, roleColor);
    const scale = this.camera.zoom * 1.3;
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

  _drawPlayer(ctx, w, h) {
    const cp = this.iso.toScreen(this.camera, this.character.pos.x, this.character.pos.y, w, h);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#2a2016';
    ctx.beginPath(); ctx.ellipse(cp.x, cp.y + 3, 4.6, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    const sprite = characterSprite(state.gender, null);
    const scale = this.camera.zoom * 1.3;
    ctx.save();
    ctx.translate(cp.x, cp.y - sprite.height * scale / 2 + 3);
    ctx.rotate(this.iso.facingAngle(this.character.facing));
    ctx.drawImage(sprite, -sprite.width * scale / 2, -sprite.height * scale / 2, sprite.width * scale, sprite.height * scale);
    ctx.restore();
  }
}
