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
import { openBank } from '../ui/bankPanel.js';
import { openSupplies } from '../ui/suppliesPanel.js';
import { openQuestBoard } from '../ui/questPanel.js';

const BOUNDS = { minX: -85, maxX: 85, minZ: -85, maxZ: 85 };
const INTERACT_RANGE = 7.5;
const PX_PER_UNIT = 2.55;

// ---- 도시 배치 템플릿 ----
// 모든 항구가 같은 "광장+건물 7채" 틀을 쓰던 것을 도시 성격별로 분화한다.
// buildingPositions: 건물 배치, plazaRadius/groundColor: 중심 공터 크기·색,
// npcRadius: NPC가 둘러선 반경, wallA/wallB/roofA/roofB: 건물 외장 배색(지역색).
const LAYOUT_TEMPLATES = {
  // 유럽 왕실/상관 도시 — 넓은 광장 중심(기존 표준형)
  plaza: {
    buildingPositions: [[-46, -20], [46, -20], [-46, 20], [46, 20], [0, -55], [-60, -55], [60, -55]],
    plazaRadius: 30, groundColor: '#c9b896', plazaColor: '#d8cba3', npcRadius: 18,
    wallA: '#c7b48c', wallB: '#e4dcc3', roofA: '#8a3a28', roofB: '#a8492f',
  },
  // 식민지/전략 요충 요새 — 건물이 중앙 연병장을 방어하듯 둘러싼다
  fortress: {
    buildingPositions: [[-30, -45], [30, -45], [-52, 0], [52, 0], [-30, 45], [30, 45], [0, -72]],
    plazaRadius: 16, groundColor: '#a89e88', plazaColor: '#8f8878', npcRadius: 13,
    wallA: '#8a8a82', wallB: '#a8a89c', roofA: '#4a4a48', roofB: '#5c5c56',
  },
  // 오스만·인도양 교역 거점 — 좁은 골목에 상점이 밀집한 시장
  bazaar: {
    buildingPositions: [[-32, -30], [32, -30], [-52, 8], [52, 8], [-20, 42], [20, 42], [0, -58], [-55, -55], [55, -55]],
    plazaRadius: 22, groundColor: '#cbab6e', plazaColor: '#e0c07d', npcRadius: 15,
    wallA: '#c9975a', wallB: '#e0b378', roofA: '#3a6b7a', roofB: '#4a8494',
  },
  // 나가사키 데지마·마카오·바타비아 — 외딴 소규모 교역 거점, 건물 서너 채뿐
  trading_post: {
    buildingPositions: [[-28, -18], [28, -18], [0, -48]],
    plazaRadius: 19, groundColor: '#8f9a80', plazaColor: '#aab391', npcRadius: 14,
    wallA: '#7a5a3a', wallB: '#96754c', roofA: '#4a3624', roofB: '#5c4530',
  },
  // 신대륙/개척 식민지 — 건물이 듬성듬성 흩어진 개척촌
  colonial: {
    buildingPositions: [[-58, -32], [58, -32], [-72, 18], [72, 18], [0, -66]],
    plazaRadius: 26, groundColor: '#b89a72', plazaColor: '#cdb185', npcRadius: 20,
    wallA: '#d8cfb8', wallB: '#ece4cf', roofA: '#5a4636', roofB: '#6e5744',
  },
  // 대서양 섬 기항지 — 초소형 보급항, 건물 두 채
  waypost: {
    buildingPositions: [[-24, -10], [24, -10]],
    plazaRadius: 14, groundColor: '#9ea88a', plazaColor: '#c2c49f', npcRadius: 11,
    wallA: '#cfd2c4', wallB: '#e2e4d8', roofA: '#6a5040', roofB: '#7c6048',
  },
  // 한국(조선) 항구 — 회벽 목조 건물 + 팔작지붕의 처마 곡선을 별도 지오메트리로 그린다
  // (hanok: true → _drawBuildingBlock이 _drawHanokBlock으로 분기). NPC/플레이어도 한복으로 그려진다.
  hanok: {
    buildingPositions: [[-42, -22], [42, -22], [-42, 24], [42, 24], [0, -54], [-58, 6], [58, 6]],
    plazaRadius: 24, groundColor: '#cdbf9a', plazaColor: '#e2d6ae', npcRadius: 17,
    wallA: '#d9cfae', wallB: '#f2e9cd', roofA: '#2e2e2b', roofB: '#5f5952', hanok: true,
  },
};

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
    // 국가별 대도시(capital: true) — 건물 수·광장·이동 가능 범위를 한 단계 키우고
    // 총독 NPC를 하나 더 세워 "이 나라에서 손꼽히는 큰 도시"라는 느낌을 낸다.
    this.isCapital = !!city.capital;
    if (this.isCapital) {
      this.city.npcs = [
        { role: 'governor', name: '총독', line: `이곳은 ${COUNTRY_NAMES[city.country] || city.country}에서 손꼽히는 대도시입니다. 상단도, 함대도 이곳에서 가장 크게 모입니다.` },
        // 은행은 대도시에만 있다 — 침몰해도 잃지 않도록 두캇을 맡아둔다(교역품은 취급하지 않는다).
        { role: 'banker', name: '은행원', line: '두캇을 맡아드립니다. 배가 침몰해도 이곳에 맡긴 돈은 안전합니다.' },
        ...this.city.npcs,
      ];
    }
    this.bounds = this.isCapital ? { minX: -120, maxX: 120, minZ: -120, maxZ: 120 } : BOUNDS;
    this.onExit = onExit;
    this.logicalW = logicalW;
    this.logicalH = logicalH;
    this.camera = new Camera2D();
    this.iso = new IsoProjection(PX_PER_UNIT, 0.55);
    this.layout = LAYOUT_TEMPLATES[city.layout] || LAYOUT_TEMPLATES.plaza;
    this.sizeMul = this.isCapital ? 1.4 : 1;

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
    const t = this.layout;
    const buildings = [];
    // 대도시는 같은 배치를 더 바깥 링에 한 번 더 세워 실제로 두 배 큰 도시처럼 보이게 한다.
    const positions = this.isCapital
      ? [...t.buildingPositions, ...t.buildingPositions.map(([x, z]) => [x * 1.7, z * 1.7])]
      : t.buildingPositions;
    const sizeBoost = this.isCapital ? 5 : 0;
    for (const [x, z] of positions) {
      const w = 16 + sizeBoost + Math.random() * 6, d = 14 + sizeBoost + Math.random() * 5;
      const box = { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
      buildings.push({ x, z, w, d, wallA: t.wallA, wallB: t.wallB, roofA: t.roofA, roofB: t.roofB, hanok: t.hanok });
      this.buildingColliders.push(box);
    }
    return buildings;
  }

  _layoutNpcs() {
    const angleStep = (Math.PI * 2) / Math.max(1, this.city.npcs.length);
    const r = this.layout.npcRadius * this.sizeMul;
    return this.city.npcs.map((npc, i) => {
      const angle = angleStep * i - Math.PI / 2;
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
    if (npc.role === 'banker') {
      hud.showDialogue(npc.name, npc.line, [
        { label: '은행', onClick: () => { hud.hideDialogue(); openBank(this.city.id); } },
        { label: '닫기', onClick: () => hud.hideDialogue() },
      ]);
      return;
    }
    if (npc.role === 'harbormaster') {
      hud.showDialogue(npc.name, npc.line, [
        { label: '출항', onClick: () => { hud.hideDialogue(); this.onExit(); } },
        { label: '의뢰', onClick: () => { hud.hideDialogue(); openQuestBoard(this.city.id); } },
        { label: '보급', onClick: () => { hud.hideDialogue(); openSupplies(this.city.id); } },
        { label: '닫기', onClick: () => hud.hideDialogue() },
      ]);
      return;
    }
    hud.showDialogue(npc.name, npc.line, [{ label: '닫기', onClick: () => hud.hideDialogue() }]);
  }

  // 화면 좌표(캔버스 기준, 논리 해상도 스케일)를 월드 좌표로 되돌려 이동 목표로 삼는다.
  handleRightClickAt(screenX, screenY) {
    const p = this.iso.toWorld(this.camera, screenX, screenY, this.logicalW, this.logicalH);
    this.character.moveTo(clamp(p.x, this.bounds.minX, this.bounds.maxX), clamp(p.z, this.bounds.minZ, this.bounds.maxZ));
  }

  update(delta) {
    const forward = (isDown('KeyW') ? 1 : 0) - (isDown('KeyS') ? 1 : 0);
    const strafe = (isDown('KeyD') ? 1 : 0) - (isDown('KeyA') ? 1 : 0);
    // 대각선(아이소메트릭) 시점에 맞춰 WASD를 화면 방향 기준으로 재매핑한다
    // (W=화면 위쪽, D=화면 오른쪽 …) — 월드 절대축 기준이면 시점과 어긋나 보인다.
    const screenRelative = { x: strafe - forward, y: -(forward + strafe) };
    this.character.update(delta, screenRelative, this.bounds, this.buildingColliders);
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
    if (b.hanok) { this._drawHanokBlock(ctx, w, h, b); return; }
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
    // (배색은 도시 배치 템플릿을 따른다 — 유럽 붉은기와/요새 회색석재/시장 청록타일 등)
    poly(ctx, [corners[1], corners[2], wallTop[2], wallTop[1]], b.wallA || '#c7b48c');
    poly(ctx, [corners[2], corners[3], wallTop[3], wallTop[2]], b.wallB || '#e4dcc3');
    // 지붕(각뿔형 근사 — 꼭짓점 하나로 모으는 팔작지붕 느낌)
    poly(ctx, [wallTop[1], wallTop[2], roofPeak], b.roofA || '#8a3a28');
    poly(ctx, [wallTop[2], wallTop[3], roofPeak], b.roofB || '#a8492f');
    poly(ctx, [wallTop[0], wallTop[1], roofPeak], b.roofA || '#8a3a28');
    poly(ctx, [wallTop[3], wallTop[0], roofPeak], b.roofB || '#a8492f');
  }

  // 한옥 전용 건물 블록 — 벽 위 지붕선이 바깥으로 내밀며(처마) 위로 살짝 들려 올라가는
  // 팔작지붕 곡선 실루엣을 낸다(서양식 각뿔 지붕과 확실히 다른 형태가 되도록 별도 지오메트리로 그린다).
  _drawHanokBlock(ctx, w, h, b) {
    const hw = b.w / 2, hd = b.d / 2;
    const wallPx = 10 * this.camera.zoom, roofPx = 8 * this.camera.zoom;
    const corners = [
      [b.x - hw, b.z - hd], [b.x + hw, b.z - hd], [b.x + hw, b.z + hd], [b.x - hw, b.z + hd],
    ].map(([x, z]) => this.iso.toScreen(this.camera, x, z, w, h));
    const wallTop = corners.map((p) => ({ x: p.x, y: p.y - wallPx }));
    const cx = (wallTop[0].x + wallTop[2].x) / 2, cy = (wallTop[0].y + wallTop[2].y) / 2;
    const eave = wallTop.map((p) => ({ x: cx + (p.x - cx) * 1.4, y: p.y - roofPx * 0.5 }));
    const roofPeak = { x: cx, y: cy - roofPx * 1.9 };
    const poly = (pts, style) => {
      ctx.fillStyle = style;
      ctx.beginPath();
      pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.closePath();
      ctx.fill();
    };
    // 회벽 목조 벽체(오른쪽/앞쪽 면)
    poly([corners[1], corners[2], wallTop[2], wallTop[1]], b.wallA || '#e8e2d0');
    poly([corners[2], corners[3], wallTop[3], wallTop[2]], b.wallB || '#d8d0ba');
    // 처마 — 벽보다 바깥으로 내밀리며 살짝 들려 올라간 곡선 기와 처마.
    poly([wallTop[1], wallTop[2], eave[2], eave[1]], b.roofB || '#4a4a46');
    poly([wallTop[2], wallTop[3], eave[3], eave[2]], b.roofB || '#4a4a46');
    // 팔작지붕 상단 — 처마에서 용마루로 모이는 완만한 기와 경사면.
    poly([eave[1], eave[2], roofPeak], b.roofA || '#33332f');
    poly([eave[2], eave[3], roofPeak], b.roofA || '#33332f');
  }

  render(ctx) {
    const w = this.logicalW, h = this.logicalH;
    this.iso.scaleX = PX_PER_UNIT * this.camera.zoom;
    this.iso.scaleY = this.iso.scaleX * 0.55;

    ctx.fillStyle = this.layout.groundColor;
    ctx.fillRect(0, 0, w, h);

    this._isoDisc(ctx, w, h, 0, 0, this.layout.plazaRadius * this.sizeMul, this.layout.plazaColor);

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
    const sprite = characterSprite(o.gender, roleColor, this.layout.hanok);
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
    const sprite = characterSprite(state.gender, null, this.layout.hanok);
    const scale = this.camera.zoom * 1.3;
    ctx.save();
    ctx.translate(cp.x, cp.y - sprite.height * scale / 2 + 3);
    ctx.rotate(this.iso.facingAngle(this.character.facing));
    ctx.drawImage(sprite, -sprite.width * scale / 2, -sprite.height * scale / 2, sprite.width * scale, sprite.height * scale);
    ctx.restore();
  }
}
