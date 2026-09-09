import { Vec2, clamp } from '../util/math2d.js';
import { Camera2D, IsoProjection } from '../render/canvas2d.js';
import { getCharacterImage } from '../render/characterAssets.js';
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
import { openCrew } from '../ui/crewPanel.js';
import { getMentorAt } from '../data/skillMentors.js';
import { getSkillDef } from '../data/playerSkills.js';
import { isLearned, learnSkill } from '../systems/skills.js';
import { formatCityEventBadge } from '../systems/market.js';

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

// 국가권별 재질·건축 팔레트. 16~17세기 항구의 기후와 건축 실루엣을 게임 크기에서
// 빠르게 구분할 수 있도록 색뿐 아니라 처마/지붕/식생/포장 방식까지 함께 묶는다.
const CITY_VISUAL_PROFILES = {
  iberian: {
    style: 'iberian', groundColor: '#bda66f', plazaColor: '#d6c594', roadColor: '#cbb987', pavingLine: 'rgba(91,73,45,0.2)',
    wallA: '#d8c996', wallB: '#efe2b9', roofA: '#873b27', roofB: '#b25532', accent: '#2f6f8b', vegetation: 'olive',
    waterDeep: '#0d4a62', waterLight: '#19718a', quay: '#85745b',
  },
  north_sea: {
    style: 'north_sea', groundColor: '#84917c', plazaColor: '#a4a493', roadColor: '#96998e', pavingLine: 'rgba(39,48,44,0.25)',
    wallA: '#8c654b', wallB: '#b98760', roofA: '#3f4b50', roofB: '#576167', accent: '#3b3029', vegetation: 'pine',
    waterDeep: '#123f50', waterLight: '#276879', quay: '#6e716b',
  },
  mediterranean: {
    style: 'mediterranean', groundColor: '#b9a06c', plazaColor: '#d2bd89', roadColor: '#c8b27c', pavingLine: 'rgba(87,69,44,0.22)',
    wallA: '#cfad78', wallB: '#ead4a6', roofA: '#8e442c', roofB: '#b35b37', accent: '#496e67', vegetation: 'cypress',
    waterDeep: '#0d4c67', waterLight: '#1b7890', quay: '#88775f',
  },
  ottoman: {
    style: 'ottoman', groundColor: '#b99a61', plazaColor: '#d5b978', roadColor: '#c8aa70', pavingLine: 'rgba(91,61,35,0.2)',
    wallA: '#c18d51', wallB: '#dfb270', roofA: '#2f6970', roofB: '#45868a', accent: '#b87832', vegetation: 'palm',
    waterDeep: '#104a5d', waterLight: '#257489', quay: '#8d7452',
  },
  tropical: {
    style: 'tropical', groundColor: '#748b62', plazaColor: '#a98d5b', roadColor: '#9b8055', pavingLine: 'rgba(49,58,37,0.18)',
    wallA: '#765236', wallB: '#9b7045', roofA: '#4b3826', roofB: '#674a2d', accent: '#b8843b', vegetation: 'palm',
    waterDeep: '#0d5362', waterLight: '#27899a', quay: '#6d573c',
  },
  chinese: {
    style: 'chinese', groundColor: '#9f997f', plazaColor: '#b8ae91', roadColor: '#aaa38e', pavingLine: 'rgba(46,43,39,0.23)',
    wallA: '#c9b98d', wallB: '#ded1a9', roofA: '#303d39', roofB: '#43534d', accent: '#9b3429', vegetation: 'bamboo',
    waterDeep: '#164957', waterLight: '#2b7180', quay: '#777166', eaves: true,
  },
  japanese: {
    style: 'japanese', groundColor: '#96947f', plazaColor: '#aaa58e', roadColor: '#a19c88', pavingLine: 'rgba(38,39,34,0.24)',
    wallA: '#6a5845', wallB: '#ddd5bd', roofA: '#303535', roofB: '#454a48', accent: '#6e342b', vegetation: 'pine',
    waterDeep: '#164958', waterLight: '#2a6f7e', quay: '#706b60', eaves: true,
  },
  korean: {
    style: 'korean', groundColor: '#b8ad86', plazaColor: '#d0c49a', roadColor: '#c4b890', pavingLine: 'rgba(58,54,44,0.2)',
    wallA: '#d8cfae', wallB: '#eee5c9', roofA: '#292d2c', roofB: '#4b504d', accent: '#7c3c2d', vegetation: 'pine',
    waterDeep: '#164956', waterLight: '#2b6d7b', quay: '#777165', eaves: true, hanok: true,
  },
};

const COUNTRY_VISUAL_GROUP = {
  PT: 'iberian', ES: 'iberian',
  EN: 'north_sea', NL: 'north_sea', HAN: 'north_sea', DK: 'north_sea', SE: 'north_sea', SC: 'north_sea',
  FR: 'mediterranean', IT: 'mediterranean', MT: 'mediterranean', RG: 'mediterranean',
  OT: 'ottoman', OM: 'ottoman',
  AC: 'tropical', BN: 'tropical', BU: 'tropical', SM: 'tropical', VN: 'tropical',
  CN: 'chinese', JP: 'japanese', KR: 'korean',
};

function visualProfileFor(city) {
  return CITY_VISUAL_PROFILES[COUNTRY_VISUAL_GROUP[city.country]] || CITY_VISUAL_PROFILES.iberian;
}

function citySeed(id) {
  let seed = 2166136261;
  for (let i = 0; i < id.length; i++) seed = Math.imul(seed ^ id.charCodeAt(i), 16777619);
  return seed >>> 0;
}

function seededUnit(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

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
    const template = LAYOUT_TEMPLATES[city.layout] || LAYOUT_TEMPLATES.plaza;
    this.profile = visualProfileFor(city);
    this.layout = { ...template, ...this.profile, buildingPositions: template.buildingPositions };
    this.sizeMul = this.isCapital ? 1.4 : 1;
    this.seed = citySeed(city.id);
    this.t = 0;

    this.buildingColliders = [];
    this._buildings = this._layoutBuildings();
    this.npcObjects = this._layoutNpcs();
    this.props = this._layoutProps();
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

  // 건물마다 기능(type)을 배정한다 — 예전엔 도시 안의 모든 건물이 크기(±랜덤)만 다를 뿐
  // 완전히 동일한 도형이라, 플레이어가 건물 외형만으로는 "저기가 조선소인지 시장인지"
  // 전혀 구분할 수 없었다. 이 도시의 NPC 역할 중 실제로 건물이 있어야 말이 되는 역할
  // (조선소기사/상인/은행원/항구 관리인/총독)을 뽑아 앞쪽 건물 슬롯부터 순서대로 배정하고,
  // _drawBuildingBlock/_drawHanokBlock이 type에 맞춰 지붕 위 장식(간판 격)을 얹는다.
  _layoutBuildings() {
    const t = this.layout;
    const buildings = [];
    // 대도시는 같은 배치를 더 바깥 링에 한 번 더 세워 실제로 두 배 큰 도시처럼 보이게 한다.
    const positions = this.isCapital
      ? [...t.buildingPositions, ...t.buildingPositions.map(([x, z]) => [x * 1.7, z * 1.7])]
      : t.buildingPositions;
    const sizeBoost = this.isCapital ? 5 : 0;
    const ROLE_PRIORITY = ['shipwright', 'merchant', 'harbormaster', 'banker', 'governor'];
    const rolesHere = ROLE_PRIORITY.filter((r) => this.city.npcs.some((n) => n.role === r));
    let roleIdx = 0;
    for (let index = 0; index < positions.length; index++) {
      const [x, z] = positions[index];
      const w = 16 + sizeBoost + seededUnit(this.seed + index * 2) * 6;
      const d = 14 + sizeBoost + seededUnit(this.seed + index * 2 + 1) * 5;
      const box = { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
      const type = roleIdx < rolesHere.length ? rolesHere[roleIdx++] : 'generic';
      buildings.push({ x, z, w, d, wallA: t.wallA, wallB: t.wallB, roofA: t.roofA, roofB: t.roofB, hanok: t.hanok, eaves: t.eaves, style: t.style, accent: t.accent, type });
      this.buildingColliders.push(box);
    }
    return buildings;
  }

  _layoutProps() {
    const m = this.sizeMul;
    const vegetation = this.layout.vegetation || 'olive';
    const candidates = [
      [-72, -8, vegetation], [72, -5, vegetation], [-67, 38, vegetation], [68, 40, vegetation],
      [-34, 50, 'crate'], [31, 49, 'barrel'], [-18, -33, 'stall'], [24, -34, 'stall'],
      [-9, 29, 'lamp'], [10, 31, 'lamp'], [0, 8, 'well'], [-49, 48, 'crate'], [50, 46, 'barrel'],
    ];
    return candidates
      .map(([x, z, type], index) => ({ x: x * m, z: z * m, type, variant: seededUnit(this.seed + 100 + index) }))
      .filter((p) => !this.buildingColliders.some((b) => p.x > b.minX - 4 && p.x < b.maxX + 4 && p.z > b.minZ - 4 && p.z < b.maxZ + 4));
  }

  // 건물 type별 지붕 위/앞 장식 — 조선소는 작은 돛대+깃발, 시장은 줄무늬 차양,
  // 은행은 정면 기둥 한 쌍, 항구 관리인(의뢰 게시판)은 나무 팻말. wallTop/roofPeak는
  // _drawBuildingBlock·_drawHanokBlock이 이미 계산해둔 화면 좌표를 그대로 받는다.
  _drawBuildingTopper(ctx, b, wallTop, roofPeak) {
    const z = this.camera.zoom;
    // 앞쪽 벽(카메라를 향한 두 면 중 하나) 위 모서리 — poly(corners[2],corners[3],wallTop[3],wallTop[2])와 동일한 변.
    const a = wallTop[2], bb = wallTop[3];
    if (b.type === 'shipwright') {
      const mastTop = { x: roofPeak.x, y: roofPeak.y - 22 * z };
      ctx.strokeStyle = '#3a2c1c'; ctx.lineWidth = Math.max(1, 1.6 * z);
      ctx.beginPath(); ctx.moveTo(roofPeak.x, roofPeak.y); ctx.lineTo(mastTop.x, mastTop.y); ctx.stroke();
      ctx.fillStyle = '#c9432f';
      ctx.beginPath();
      ctx.moveTo(mastTop.x, mastTop.y);
      ctx.lineTo(mastTop.x + 11 * z, mastTop.y + 4 * z);
      ctx.lineTo(mastTop.x, mastTop.y + 8 * z);
      ctx.closePath(); ctx.fill();
    } else if (b.type === 'merchant') {
      const stripes = 4;
      const dx = (bb.x - a.x) / stripes;
      for (let i = 0; i < stripes; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#c9432f' : '#e8ddc4';
        ctx.beginPath();
        ctx.moveTo(a.x + dx * i, a.y);
        ctx.lineTo(a.x + dx * (i + 1), a.y);
        ctx.lineTo(a.x + dx * (i + 1) + 2 * z, a.y + 9 * z);
        ctx.lineTo(a.x + dx * i + 2 * z, a.y + 9 * z);
        ctx.closePath(); ctx.fill();
      }
    } else if (b.type === 'banker') {
      const cols = [0.28, 0.72];
      for (const f of cols) {
        const cx = a.x + (bb.x - a.x) * f, topY = a.y - 3 * z, botY = a.y + 14 * z;
        ctx.fillStyle = '#d9cfae';
        ctx.fillRect(cx - 1.6 * z, topY, 3.2 * z, botY - topY);
        ctx.fillStyle = '#8a7c58';
        ctx.fillRect(cx - 2.4 * z, topY - 2 * z, 4.8 * z, 2 * z);
      }
    } else if (b.type === 'harbormaster') {
      const postX = a.x - 6 * z, postTopY = a.y + 2 * z, postBotY = a.y + 16 * z;
      ctx.strokeStyle = '#4a3624'; ctx.lineWidth = Math.max(1, 1.4 * z);
      ctx.beginPath(); ctx.moveTo(postX, postBotY); ctx.lineTo(postX, postTopY); ctx.stroke();
      ctx.fillStyle = '#8a6a44';
      ctx.fillRect(postX - 5 * z, postTopY - 6 * z, 10 * z, 7 * z);
      ctx.strokeStyle = '#3a2c1c'; ctx.lineWidth = Math.max(0.6, 0.8 * z);
      ctx.strokeRect(postX - 5 * z, postTopY - 6 * z, 10 * z, 7 * z);
    } else if (b.type === 'governor') {
      const poleTop = { x: roofPeak.x, y: roofPeak.y - 18 * z };
      ctx.strokeStyle = '#5a5a54'; ctx.lineWidth = Math.max(1, 1.4 * z);
      ctx.beginPath(); ctx.moveTo(roofPeak.x, roofPeak.y); ctx.lineTo(poleTop.x, poleTop.y); ctx.stroke();
      ctx.fillStyle = '#d9ac54';
      ctx.fillRect(poleTop.x, poleTop.y, 10 * z, 6 * z);
    }
  }

  _layoutNpcs() {
    const angleStep = (Math.PI * 2) / Math.max(1, this.city.npcs.length);
    const r = this.layout.npcRadius * this.sizeMul;
    return this.city.npcs.map((npc, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const pos = new Vec2(Math.cos(angle) * r, Math.sin(angle) * r - 10);
      // 예전엔 상인만 절반 확률로 여성이고 나머지 전 역할이 전부 남성으로 고정돼 있었다 —
      // 이제 서양식 실루엣도 성별로 갈리니(치마/장식) 모든 역할에 고르게 다양성을 준다.
      return { npc, pos, facing: angle + Math.PI, gender: i % 2 === 0 ? 'female' : 'male' };
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
        { label: '건조', onClick: () => { hud.hideDialogue(); openShipyard('build'); } },
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
    if (npc.role === 'mentor') {
      const mentor = getMentorAt(this.city.id);
      const skill = mentor && getSkillDef(mentor.skillId);
      if (!mentor || !skill) { hud.showDialogue(npc.name, npc.line, [{ label: '닫기', onClick: () => hud.hideDialogue() }]); return; }
      const already = isLearned(mentor.skillId);
      hud.showDialogue(npc.name, mentor.flavor, [
        {
          label: already ? '이미 배웠습니다' : `${skill.icon} '${skill.name}' 배우기 (${mentor.cost.toLocaleString('ko-KR')} 두캇)`,
          disabled: already,
          onClick: () => {
            const res = learnSkill(mentor.skillId, mentor.cost);
            if (res.ok) { hud.hideDialogue(); hud.toast(`${skill.icon} '${skill.name}'을(를) 배웠습니다! (K: 스킬 패널에서 퀵슬롯 장착)`); }
            else hud.toast(res.reason);
          },
        },
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
        { label: '선원', onClick: () => { hud.hideDialogue(); openCrew(this.city.id); } },
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
    this.t += delta;
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

    const eventBadge = formatCityEventBadge(this.city.id);
    hud.setLocation(this.city.name, `${COUNTRY_NAMES[this.city.country]} 항구도시${eventBadge ? ' · ' + eventBadge : ''}`);
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

  _worldLine(ctx, w, h, points, strokeStyle, lineWidth = 1) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    points.forEach(([x, z], index) => {
      const p = this.iso.toScreen(this.camera, x, z, w, h);
      if (index === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }

  _strokeIsoDisc(ctx, w, h, cx, cz, radius, strokeStyle, lineWidth = 1) {
    const points = [];
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      points.push([cx + Math.cos(a) * radius, cz + Math.sin(a) * radius]);
    }
    this._worldLine(ctx, w, h, points, strokeStyle, lineWidth);
  }

  _drawGroundAndHarbor(ctx, w, h) {
    const groundGradient = ctx.createLinearGradient(0, 0, 0, h);
    groundGradient.addColorStop(0, this.layout.groundColor);
    groundGradient.addColorStop(1, this.layout.roadColor);
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, 0, w, h);

    // 광장으로 모이는 포장도로와 항구 산책로. 직선 위에 이음매를 얹어 손으로 깐
    // 돌/다진 흙 표면처럼 보이게 하되 이동 가능 영역은 바꾸지 않는다.
    this._isoQuad(ctx, w, h, -8, -100, 8, 58, this.layout.roadColor);
    this._isoQuad(ctx, w, h, -105, -7, 105, 7, this.layout.roadColor);
    this._isoDisc(ctx, w, h, 0, 0, this.layout.plazaRadius * this.sizeMul, this.layout.plazaColor);
    this._strokeIsoDisc(ctx, w, h, 0, 0, this.layout.plazaRadius * this.sizeMul, this.layout.pavingLine, 1.2);
    this._strokeIsoDisc(ctx, w, h, 0, 0, this.layout.plazaRadius * this.sizeMul * 0.72, this.layout.pavingLine, 0.8);
    for (let i = -6; i <= 6; i++) {
      const x = i * 14;
      this._worldLine(ctx, w, h, [[x, -96], [x, 50]], this.layout.pavingLine, 0.55);
    }
    for (let i = -5; i <= 3; i++) {
      const z = i * 14;
      this._worldLine(ctx, w, h, [[-102, z], [102, z]], this.layout.pavingLine, 0.55);
    }

    // 수심별 항만 수색과 파랑. 화면 아래로 갈수록 진해져 평면 한 장이 아니라 얕은
    // 연안에서 깊은 바다로 이어지는 항구처럼 읽힌다.
    this._isoQuad(ctx, w, h, -150, 55, 150, 102, this.layout.waterLight);
    this._isoQuad(ctx, w, h, -150, 102, 150, 158, '#166379');
    this._isoQuad(ctx, w, h, -150, 158, 150, 230, this.layout.waterDeep);
    this._isoQuad(ctx, w, h, -150, 50, 150, 58, this.layout.quay);
    this._worldLine(ctx, w, h, [[-150, 57], [150, 57]], 'rgba(224,219,190,0.55)', 1.2);
    for (let i = 0; i < 18; i++) {
      const z = 68 + (i % 6) * 24;
      const x = -125 + Math.floor(i / 6) * 80 + ((i * 19) % 42);
      const sway = Math.sin(this.t * 1.1 + i * 1.7) * 3;
      this._worldLine(ctx, w, h, [[x + sway, z], [x + 12 + sway, z + 1.5]], 'rgba(192,231,229,0.34)', 1);
    }

    // 중앙 부두는 석조 교각과 목재 상판을 겹쳐 입체감을 준다. 대도시는 보조 부두도 추가한다.
    this._isoQuad(ctx, w, h, -8, 57, 8, 101, '#463826');
    this._isoQuad(ctx, w, h, -6.5, 57, 6.5, 98, '#6b4d2b');
    for (let z = 61; z < 98; z += 6) this._worldLine(ctx, w, h, [[-6.5, z], [6.5, z]], 'rgba(220,181,112,0.28)', 0.7);
    if (this.isCapital) {
      this._isoQuad(ctx, w, h, -48, 57, -37, 88, '#60452a');
      this._isoQuad(ctx, w, h, 37, 57, 48, 88, '#60452a');
    }

    this._isoDisc(ctx, w, h, 0, 0, 2.8, this.layout.accent);
    this._strokeIsoDisc(ctx, w, h, 0, 0, 4.5, 'rgba(246,230,183,0.42)', 0.8);
  }

  _drawProp(ctx, w, h, prop) {
    const p = this.iso.toScreen(this.camera, prop.x, prop.z, w, h);
    const z = this.camera.zoom;
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#18231d';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 2 * z, 5.5 * z, 2.3 * z, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    if (['olive', 'pine', 'palm', 'cypress', 'bamboo'].includes(prop.type)) {
      ctx.strokeStyle = '#554129'; ctx.lineWidth = Math.max(1, 1.4 * z);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + (prop.variant - 0.5) * 2 * z, p.y - 13 * z); ctx.stroke();
      const topX = p.x + (prop.variant - 0.5) * 2 * z, topY = p.y - 13 * z;
      if (prop.type === 'palm') {
        ctx.strokeStyle = '#31583b'; ctx.lineWidth = Math.max(1, z);
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(topX, topY); ctx.quadraticCurveTo(topX + Math.cos(a) * 5 * z, topY - 2 * z, topX + Math.cos(a) * 9 * z, topY + Math.sin(a) * 4 * z); ctx.stroke();
        }
      } else if (prop.type === 'pine') {
        ctx.fillStyle = '#315443';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.moveTo(topX, topY - (5 - i * 3) * z); ctx.lineTo(topX - (6 - i) * z, topY + (5 + i * 3) * z); ctx.lineTo(topX + (6 - i) * z, topY + (5 + i * 3) * z); ctx.closePath(); ctx.fill();
        }
      } else if (prop.type === 'cypress') {
        ctx.fillStyle = '#31503a'; ctx.beginPath(); ctx.ellipse(topX, topY - 2 * z, 4 * z, 11 * z, 0, 0, Math.PI * 2); ctx.fill();
      } else if (prop.type === 'bamboo') {
        ctx.strokeStyle = '#446044'; ctx.lineWidth = Math.max(1, z);
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(p.x + i * 1.5 * z, p.y); ctx.lineTo(p.x + i * 1.2 * z, p.y - (11 + Math.abs(i)) * z); ctx.stroke(); }
      } else {
        ctx.fillStyle = '#536b3d';
        for (const [dx, dy, r] of [[-4, 0, 5], [3, -2, 5], [0, -6, 5]]) { ctx.beginPath(); ctx.arc(topX + dx * z, topY + dy * z, r * z, 0, Math.PI * 2); ctx.fill(); }
      }
    } else if (prop.type === 'crate') {
      ctx.fillStyle = '#7a542e'; ctx.fillRect(p.x - 4 * z, p.y - 7 * z, 8 * z, 7 * z);
      ctx.strokeStyle = '#4a321e'; ctx.lineWidth = Math.max(0.7, z); ctx.strokeRect(p.x - 4 * z, p.y - 7 * z, 8 * z, 7 * z);
      ctx.beginPath(); ctx.moveTo(p.x - 4 * z, p.y - 7 * z); ctx.lineTo(p.x + 4 * z, p.y); ctx.moveTo(p.x + 4 * z, p.y - 7 * z); ctx.lineTo(p.x - 4 * z, p.y); ctx.stroke();
    } else if (prop.type === 'barrel') {
      ctx.fillStyle = '#755033'; ctx.beginPath(); ctx.ellipse(p.x, p.y - 4 * z, 3.5 * z, 5 * z, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#342a22'; ctx.lineWidth = Math.max(0.7, z); ctx.beginPath(); ctx.moveTo(p.x - 3.2 * z, p.y - 6 * z); ctx.lineTo(p.x + 3.2 * z, p.y - 6 * z); ctx.moveTo(p.x - 3.2 * z, p.y - 2 * z); ctx.lineTo(p.x + 3.2 * z, p.y - 2 * z); ctx.stroke();
    } else if (prop.type === 'stall') {
      ctx.strokeStyle = '#4a3421'; ctx.lineWidth = Math.max(1, z);
      ctx.beginPath(); ctx.moveTo(p.x - 6 * z, p.y); ctx.lineTo(p.x - 6 * z, p.y - 11 * z); ctx.moveTo(p.x + 6 * z, p.y); ctx.lineTo(p.x + 6 * z, p.y - 11 * z); ctx.stroke();
      ctx.fillStyle = this.layout.accent; ctx.fillRect(p.x - 7 * z, p.y - 13 * z, 14 * z, 5 * z);
      ctx.fillStyle = 'rgba(243,224,184,0.9)'; ctx.fillRect(p.x - 2 * z, p.y - 13 * z, 4 * z, 5 * z);
    } else if (prop.type === 'lamp') {
      ctx.strokeStyle = '#3b3328'; ctx.lineWidth = Math.max(1, z); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - 12 * z); ctx.stroke();
      ctx.fillStyle = '#e4bc5a'; ctx.fillRect(p.x - 2 * z, p.y - 14 * z, 4 * z, 5 * z);
    } else if (prop.type === 'well') {
      ctx.fillStyle = this.layout.quay; ctx.beginPath(); ctx.ellipse(p.x, p.y - 2 * z, 6 * z, 3 * z, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#40382f'; ctx.lineWidth = Math.max(1, z); ctx.beginPath(); ctx.ellipse(p.x, p.y - 3 * z, 4.5 * z, 2 * z, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  _drawFacadeDetails(ctx, b, corners, wallTop) {
    const z = this.camera.zoom;
    const mix = (a, bb, f) => ({ x: a.x + (bb.x - a.x) * f, y: a.y + (bb.y - a.y) * f });
    const frontTopA = wallTop[2], frontTopB = wallTop[3], frontBottomA = corners[2], frontBottomB = corners[3];

    // 석재/벽돌 층과 목조 골조는 지역 프로필을 그대로 따른다.
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = b.style === 'north_sea' ? '#46362d' : 'rgba(92,68,43,0.55)';
    ctx.lineWidth = Math.max(0.55, 0.7 * z);
    for (const f of [0.3, 0.58]) {
      const a = mix(frontTopA, frontBottomA, f), bb = mix(frontTopB, frontBottomB, f);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y); ctx.stroke();
    }
    if (['north_sea', 'japanese', 'chinese', 'korean', 'tropical'].includes(b.style)) {
      for (const f of [0.18, 0.5, 0.82]) {
        const a = mix(frontTopA, frontTopB, f), bb = mix(frontBottomA, frontBottomB, f);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y); ctx.stroke();
      }
    }
    ctx.restore();

    const door = mix(frontBottomA, frontBottomB, 0.52);
    ctx.fillStyle = b.style === 'ottoman' ? '#4f3825' : '#493526';
    ctx.fillRect(door.x - 2.4 * z, door.y - 8 * z, 4.8 * z, 8 * z);
    ctx.fillStyle = b.accent || '#6a7b78';
    for (const f of [0.24, 0.78]) {
      const top = mix(frontTopA, frontTopB, f), bottom = mix(frontBottomA, frontBottomB, f);
      const y = top.y + (bottom.y - top.y) * 0.43;
      ctx.fillRect(top.x - 2.1 * z, y - 2 * z, 4.2 * z, 4 * z);
      ctx.strokeStyle = 'rgba(238,220,177,0.7)'; ctx.lineWidth = Math.max(0.5, 0.6 * z); ctx.strokeRect(top.x - 2.1 * z, y - 2 * z, 4.2 * z, 4 * z);
    }
    if (b.style === 'iberian') {
      const a = mix(frontTopA, frontBottomA, 0.72), bb = mix(frontTopB, frontBottomB, 0.72);
      ctx.strokeStyle = b.accent; ctx.lineWidth = Math.max(1, 1.4 * z); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y); ctx.stroke();
    }
  }

  _drawCultureTopper(ctx, b, roofPeak) {
    const z = this.camera.zoom;
    if (b.style === 'ottoman') {
      ctx.fillStyle = '#3c7d7a'; ctx.beginPath(); ctx.arc(roofPeak.x, roofPeak.y + 1.5 * z, 4.2 * z, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#d2a24f'; ctx.beginPath(); ctx.arc(roofPeak.x, roofPeak.y - 3 * z, 1.1 * z, 0, Math.PI * 2); ctx.fill();
    } else if (b.style === 'north_sea') {
      ctx.fillStyle = '#49362d'; ctx.fillRect(roofPeak.x + 3 * z, roofPeak.y - 5 * z, 3 * z, 8 * z);
      ctx.fillStyle = 'rgba(213,219,211,0.35)'; ctx.beginPath(); ctx.arc(roofPeak.x + 5 * z, roofPeak.y - 8 * z, 2.2 * z, 0, Math.PI * 2); ctx.fill();
    } else if (['chinese', 'japanese', 'korean'].includes(b.style)) {
      ctx.strokeStyle = b.style === 'chinese' ? '#9b3429' : '#252a29'; ctx.lineWidth = Math.max(1, 1.3 * z);
      ctx.beginPath(); ctx.moveTo(roofPeak.x - 7 * z, roofPeak.y + 2 * z); ctx.lineTo(roofPeak.x + 7 * z, roofPeak.y + 2 * z); ctx.stroke();
    } else if (b.style === 'tropical') {
      ctx.strokeStyle = '#b78a48'; ctx.lineWidth = Math.max(0.8, z); ctx.beginPath(); ctx.moveTo(roofPeak.x - 7 * z, roofPeak.y + 2 * z); ctx.lineTo(roofPeak.x + 7 * z, roofPeak.y - 2 * z); ctx.stroke();
    }
  }

  // 3면(지붕/오른쪽 벽/앞쪽 벽)이 보이는 단순 아이소메트릭 건물 블록.
  _drawBuildingBlock(ctx, w, h, b) {
    if (b.hanok || b.eaves) { this._drawHanokBlock(ctx, w, h, b); return; }
    const hw = b.w / 2, hd = b.d / 2;
    const wallPx = 18 * this.camera.zoom;
    const roofPx = (b.style === 'north_sea' ? 14 : 10) * this.camera.zoom;
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
    this._drawFacadeDetails(ctx, b, corners, wallTop);
    // 지붕(각뿔형 근사 — 꼭짓점 하나로 모으는 팔작지붕 느낌)
    poly(ctx, [wallTop[1], wallTop[2], roofPeak], b.roofA || '#8a3a28');
    poly(ctx, [wallTop[2], wallTop[3], roofPeak], b.roofB || '#a8492f');
    poly(ctx, [wallTop[0], wallTop[1], roofPeak], b.roofA || '#8a3a28');
    poly(ctx, [wallTop[3], wallTop[0], roofPeak], b.roofB || '#a8492f');
    this._drawCultureTopper(ctx, b, roofPeak);
    this._drawBuildingTopper(ctx, b, wallTop, roofPeak);
  }

  // 한옥 전용 건물 블록 — 벽 위 지붕선이 바깥으로 내밀며(처마) 위로 살짝 들려 올라가는
  // 팔작지붕 곡선 실루엣을 낸다(서양식 각뿔 지붕과 확실히 다른 형태가 되도록 별도 지오메트리로 그린다).
  _drawHanokBlock(ctx, w, h, b) {
    const hw = b.w / 2, hd = b.d / 2;
    const wallPx = 15 * this.camera.zoom, roofPx = 10 * this.camera.zoom;
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
    this._drawFacadeDetails(ctx, b, corners, wallTop);
    // 처마 — 벽보다 바깥으로 내밀리며 살짝 들려 올라간 곡선 기와 처마.
    poly([wallTop[1], wallTop[2], eave[2], eave[1]], b.roofB || '#4a4a46');
    poly([wallTop[2], wallTop[3], eave[3], eave[2]], b.roofB || '#4a4a46');
    // 팔작지붕 상단 — 처마에서 용마루로 모이는 완만한 기와 경사면.
    poly([eave[1], eave[2], roofPeak], b.roofA || '#33332f');
    poly([eave[2], eave[3], roofPeak], b.roofA || '#33332f');
    this._drawCultureTopper(ctx, b, roofPeak);
    this._drawBuildingTopper(ctx, b, eave, roofPeak);
  }

  render(ctx) {
    const w = this.logicalW, h = this.logicalH;
    this.iso.scaleX = PX_PER_UNIT * this.camera.zoom;
    this.iso.scaleY = this.iso.scaleX * 0.55;

    this._drawGroundAndHarbor(ctx, w, h);

    // 출항 마커
    const exitP = this.iso.toScreen(this.camera, this.exitPos.x, this.exitPos.y, w, h);
    const exitPulse = 5 + Math.sin(this.t * 2.5) * 1.5;
    ctx.fillStyle = 'rgba(230,193,90,0.18)';
    ctx.beginPath(); ctx.arc(exitP.x, exitP.y, exitPulse + 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0cb68';
    ctx.beginPath();
    ctx.moveTo(exitP.x, exitP.y - 12);
    ctx.lineTo(exitP.x - 6, exitP.y + 4);
    ctx.lineTo(exitP.x + 6, exitP.y + 4);
    ctx.closePath(); ctx.fill();

    // 건물 + NPC + 플레이어를 화면 깊이(x+z) 순으로 함께 정렬해 그린다(페인터 알고리즘).
    const drawables = [
      ...this._buildings.map((b) => ({ depth: b.x + b.z + b.w / 2 + b.d / 2, draw: () => this._drawBuildingBlock(ctx, w, h, b) })),
      ...this.props.map((p) => ({ depth: p.x + p.z, draw: () => this._drawProp(ctx, w, h, p) })),
      ...this.npcObjects.map((o) => ({ depth: o.pos.x + o.pos.y, draw: () => this._drawNpc(ctx, w, h, o) })),
      { depth: this.character.pos.x + this.character.pos.y, draw: () => this._drawPlayer(ctx, w, h) },
    ].sort((a, b) => a.depth - b.depth);
    for (const d of drawables) d.draw();
  }

  _drawFallbackCharacter(ctx, p, height, outfit, gender) {
    // 생성 이미지가 첫 프레임에 아직 디코딩되지 않았을 때만 보이는 벡터 폴백.
    // 작은 비트맵을 확대하지 않고 현재 고해상도 컨텍스트에서 곡선으로 직접 그린다.
    const s = height / 39;
    const footY = p.y + 2 * s;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#3a2b23';
    ctx.lineWidth = 2.1 * s;
    ctx.beginPath();
    ctx.moveTo(p.x - 2.2 * s, footY - 10 * s); ctx.lineTo(p.x - 2.8 * s, footY);
    ctx.moveTo(p.x + 2.2 * s, footY - 10 * s); ctx.lineTo(p.x + 2.8 * s, footY);
    ctx.stroke();

    ctx.fillStyle = outfit || '#315d78';
    ctx.beginPath();
    ctx.moveTo(p.x - 5.5 * s, footY - 25 * s);
    ctx.quadraticCurveTo(p.x, footY - 29 * s, p.x + 5.5 * s, footY - 25 * s);
    ctx.lineTo(p.x + (gender === 'female' ? 7 : 5) * s, footY - 9 * s);
    ctx.quadraticCurveTo(p.x, footY - 6 * s, p.x - (gender === 'female' ? 7 : 5) * s, footY - 9 * s);
    ctx.closePath(); ctx.fill();

    ctx.strokeStyle = '#c89472'; ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.moveTo(p.x - 4.8 * s, footY - 23 * s); ctx.lineTo(p.x - 7 * s, footY - 13 * s);
    ctx.moveTo(p.x + 4.8 * s, footY - 23 * s); ctx.lineTo(p.x + 7 * s, footY - 13 * s); ctx.stroke();

    const skin = ctx.createRadialGradient(p.x - 1.5 * s, footY - 33 * s, 0, p.x, footY - 31 * s, 6 * s);
    skin.addColorStop(0, '#efc4a0'); skin.addColorStop(1, '#b87958');
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(p.x, footY - 31 * s, 5.2 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a211d';
    ctx.beginPath(); ctx.arc(p.x, footY - 33 * s, 5.4 * s, Math.PI, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _drawNpc(ctx, w, h, o) {
    const p = this.iso.toScreen(this.camera, o.pos.x, o.pos.y, w, h);
    const roleColor = NPC_ROLE_COLORS[o.npc.role] || '#999';
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = roleColor;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 3, 6.8 * this.camera.zoom, 3 * this.camera.zoom, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    const generated = getCharacterImage(o.gender, this.city.country, false);
    let spriteHeight;
    if (generated) {
      spriteHeight = 36 * this.camera.zoom;
      const spriteWidth = spriteHeight * (generated.naturalWidth / generated.naturalHeight);
      ctx.drawImage(generated, p.x - spriteWidth / 2, p.y - spriteHeight + 4 * this.camera.zoom, spriteWidth, spriteHeight);
    } else {
      spriteHeight = 36 * this.camera.zoom;
      this._drawFallbackCharacter(ctx, p, spriteHeight, roleColor, o.gender);
    }
    ctx.fillStyle = 'rgba(20,14,8,0.75)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    const label = NPC_ROLE_LABELS[o.npc.role] || o.npc.name;
    const tw = ctx.measureText(label).width;
    const labelY = p.y - spriteHeight - 5;
    ctx.fillRect(p.x - tw / 2 - 3, labelY - 8, tw + 6, 11);
    ctx.fillStyle = '#f0e6d2';
    ctx.fillText(label, p.x, labelY);
  }

  _drawPlayer(ctx, w, h) {
    const cp = this.iso.toScreen(this.camera, this.character.pos.x, this.character.pos.y, w, h);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#2a2016';
    ctx.beginPath(); ctx.ellipse(cp.x, cp.y + 3, 7.2 * this.camera.zoom, 3.2 * this.camera.zoom, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    const generated = getCharacterImage(state.gender, this.city.country, true);
    if (generated) {
      const spriteHeight = 39 * this.camera.zoom;
      const spriteWidth = spriteHeight * (generated.naturalWidth / generated.naturalHeight);
      const flip = Math.sin(this.character.facing) < -0.05 ? -1 : 1;
      ctx.save();
      ctx.translate(cp.x, 0);
      ctx.scale(flip, 1);
      ctx.drawImage(generated, -spriteWidth / 2, cp.y - spriteHeight + 4 * this.camera.zoom, spriteWidth, spriteHeight);
      ctx.restore();
    } else {
      this._drawFallbackCharacter(ctx, cp, 39 * this.camera.zoom, state.gender === 'female' ? '#713f5d' : '#315d78', state.gender);
    }
  }
}
