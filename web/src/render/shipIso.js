// 배를 "평면 탑뷰 스프라이트를 통째로 회전"하는 대신, 건물(cityScene._drawBuildingBlock)과
// 같은 방식으로 매 프레임 실제 입체(선체 벽 + 갑판 + 돛대)로 대각선(45도풍) 투영해 그린다.
// world(x,z) 평면상의 배 윤곽(다각형)을 이물 방향(heading)에 맞춰 회전시킨 뒤, 화면에 보이는
// (카메라 쪽을 향한) 변만 골라 그 변을 위로 밀어올려 "벽"을 만들고, 그 위에 갑판을 얹는다.
import { SHIP_CLASSES, SHIP_ROLES, COUNTRY_COLORS } from '../data/ships.js';
import { worldSizeFor } from '../entities/shipSize.js';
import { SHIP_IMAGES } from './imageAssets.js';

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + amt)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

const WALL_PX = { small: 2.7, medium: 3.5, large: 4.4, xlarge: 5.5 };
const MAST_PX = { small: 9, medium: 12.5, large: 16.5, xlarge: 20.5 };

// 선체 윤곽(이물=+f 뾰족, 고물=-f 뭉툭) — 좌우 대칭 7각형. f/s는 [-1,1] 정규화 계수(길이/폭 절반 기준).
const HULL_PROFILE = [
  { f: 1, s: 0 },
  { f: 0.55, s: 0.85 },
  { f: 0.05, s: 1 },
  { f: -0.68, s: 0.78 },
  { f: -0.68, s: -0.78 },
  { f: 0.05, s: -1 },
  { f: 0.55, s: -0.85 },
];

// 프레임을 가로로 이어붙인 스프라이트시트에서 heading에 가장 가까운 프레임을 오려 그린다.
// (0번 프레임=이물이 화면 "위"를 향한 모습, 시계방향 순으로 나머지 프레임이 이어진다고 가정)
function drawShipImageOverride(ctx, iso, camera, p0, heading, override, alpha) {
  const { image, frames, scale } = override;
  const angle = iso.facingAngle(heading); // -PI..PI, 화면상 회전각
  const idx = Math.round((((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * frames) % frames;
  const fw = image.width / frames, fh = image.height;
  const drawH = fh * camera.zoom * (scale || 0.14);
  const drawW = fw * (drawH / fh);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, idx * fw, 0, fw, fh, p0.x - drawW / 2, p0.y - drawH * 0.82, drawW, drawH);
  ctx.restore();
}

function fillPoly(ctx, pts, style) {
  ctx.fillStyle = style;
  ctx.beginPath();
  pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
  ctx.closePath();
  ctx.fill();
}

export function drawShipIso(ctx, iso, camera, w, h, pos, heading, shipDef, variant, alpha, tier) {
  const p0 = iso.toScreen(camera, pos.x, pos.y, w, h);
  if (p0.x < -70 || p0.x > w + 70 || p0.y < -70 || p0.y > h + 70) return;

  // 나중에 이미지 자산을 등록하면(render/imageAssets.js) 절차적 드로잉 대신 이 쪽을 쓴다.
  const imgOverride = SHIP_IMAGES[shipDef.type];
  if (imgOverride && imgOverride.image && imgOverride.image.complete) {
    drawShipImageOverride(ctx, iso, camera, p0, heading, imgOverride, alpha);
    return;
  }

  const cls = shipDef.class in WALL_PX ? shipDef.class : 'medium';
  const size = worldSizeFor(shipDef);
  const halfLen = size.length / 2, halfBeam = size.width / 2;
  const isWreck = variant === 'wreck';
  const isHostile = variant === 'hostile';
  const mastCount = SHIP_CLASSES[shipDef.class]?.mastCount || 1;
  const roleColor = (SHIP_ROLES[shipDef.role] || SHIP_ROLES.trade).color;
  // 잡몹/엘리트/보스 위협 등급을 깃발·갑판 중심선 색으로 멀리서도 구분할 수 있게 한다 —
  // 평시 배(상선·모험가 등)는 tier가 없으니 이 값이 null이 되어 기존 배색을 그대로 쓴다.
  const tierColor = isHostile && tier === 'boss' ? '#8b2fc9' : isHostile && tier === 'elite' ? '#d68a1a' : null;
  const flagColor = tierColor || (isHostile ? '#221d19' : (COUNTRY_COLORS[shipDef.country] || '#999'));
  const sailColor = isWreck ? '#8f8577' : '#e9e2cf';
  const hullBase = isWreck ? '#453b30' : '#8a5a34';
  const hostileOfs = isHostile ? -20 : 0;
  const tone = (amt) => shade(hullBase, hostileOfs + amt);

  const sinH = Math.sin(heading), cosH = Math.cos(heading);
  const toWorld = (f, s) => ({ x: pos.x + f * sinH + s * cosH, z: pos.y + f * cosH - s * sinH });
  const toScreenVec = (vx, vz) => ({ x: (vx - vz) * iso.scaleX, y: (vx + vz) * iso.scaleY });

  const wallPx = WALL_PX[cls] * camera.zoom;
  const mastPx = MAST_PX[cls] * camera.zoom;

  const worldPts = HULL_PROFILE.map((pt) => toWorld(pt.f * halfLen, pt.s * halfBeam));
  const basePts = worldPts.map((wp) => iso.toScreen(camera, wp.x, wp.z, w, h));
  const deckPts = basePts.map((p) => ({ x: p.x, y: p.y - wallPx }));

  ctx.save();
  ctx.globalAlpha = alpha;

  // ---- 선체 옆면(카메라를 향한 변만 벽으로 세운다) ----
  const n = worldPts.length;
  for (let i = 0; i < n; i++) {
    const a = worldPts[i], b = worldPts[(i + 1) % n];
    let nx = b.z - a.z, nz = -(b.x - a.x);
    const midx = (a.x + b.x) / 2, midz = (a.z + b.z) / 2;
    if ((midx - pos.x) * nx + (midz - pos.y) * nz < 0) { nx = -nx; nz = -nz; }
    const len = Math.hypot(nx, nz) || 1;
    const facing = (nx / len + nz / len) / Math.SQRT2; // -1..1, >0이면 카메라 쪽
    if (facing <= 0.02) continue;
    const pa = basePts[i], pb = basePts[(i + 1) % n];
    const ta = { x: pa.x, y: pa.y - wallPx }, tb = { x: pb.x, y: pb.y - wallPx };
    fillPoly(ctx, [pa, pb, tb, ta], tone(-30 + facing * 44));
  }
  ctx.strokeStyle = tone(-50);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  deckPts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
  ctx.closePath();
  ctx.stroke();

  // ---- 갑판(위쪽 면) ----
  fillPoly(ctx, deckPts, isWreck ? '#6b6156' : '#c9a876');
  // 갑판 중심선(역할 색)
  const bowDeck = deckPts[0];
  const sternDeck = { x: (deckPts[3].x + deckPts[4].x) / 2, y: (deckPts[3].y + deckPts[4].y) / 2 };
  if (!isWreck) {
    ctx.strokeStyle = tierColor || roleColor;
    ctx.lineWidth = tierColor ? Math.max(1.6, 2.1 * camera.zoom) : Math.max(1, 1.3 * camera.zoom);
    ctx.beginPath(); ctx.moveTo(bowDeck.x, bowDeck.y); ctx.lineTo(sternDeck.x, sternDeck.y); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.lineWidth = 0.5;
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    const l = { x: bowDeck.x + (sternDeck.x - bowDeck.x) * t + (deckPts[2].x - deckPts[5].x) * 0.18, y: bowDeck.y + (sternDeck.y - bowDeck.y) * t };
    const r = { x: bowDeck.x + (sternDeck.x - bowDeck.x) * t - (deckPts[2].x - deckPts[5].x) * 0.18, y: bowDeck.y + (sternDeck.y - bowDeck.y) * t };
    ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(r.x, r.y); ctx.stroke();
  }

  const fwdVec = toScreenVec(sinH, cosH);
  const fwdLen = Math.hypot(fwdVec.x, fwdVec.y) || 1;
  const fwdUnit = { x: fwdVec.x / fwdLen, y: fwdVec.y / fwdLen };
  const rightVec = toScreenVec(cosH, -sinH);

  if (!isWreck) {
    // ---- 바우스프릿 + 이물 삼각돛 ----
    const bowTip2 = toScreenVec(sinH * halfLen * 0.34, cosH * halfLen * 0.34);
    const bowspritTip = { x: bowDeck.x + bowTip2.x, y: bowDeck.y + bowTip2.y + 1.4 * camera.zoom };
    ctx.strokeStyle = tone(-52); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bowDeck.x, bowDeck.y); ctx.lineTo(bowspritTip.x, bowspritTip.y); ctx.stroke();

    // ---- 돛대: 이물쪽부터 고물쪽까지 배치, 가운데(주돛)가 가장 크다 ----
    const mastFs = mastCount === 1 ? [0.32] : Array.from({ length: mastCount }, (_, i) => 0.5 - i * (1.0 / (mastCount - 1)) * 0.62 - 0.02);
    let mainIdx = 0, bestScore = -1;
    mastFs.forEach((f, i) => { const s = 1 - Math.abs(f); if (s > bestScore) { bestScore = s; mainIdx = i; } });

    if (mastCount >= 2) {
      const jibBase = { x: bowDeck.x + (bowspritTip.x - bowDeck.x) * 0.55, y: bowDeck.y + (bowspritTip.y - bowDeck.y) * 0.55 };
      const firstMastF = mastFs[0] * halfLen;
      const firstMastWorld = toWorld(firstMastF, 0);
      const firstMastDeck = iso.toScreen(camera, firstMastWorld.x, firstMastWorld.z, w, h);
      const firstMastTop = { x: firstMastDeck.x, y: firstMastDeck.y - wallPx - mastPx * 0.5 };
      fillPoly(ctx, [bowspritTip, jibBase, firstMastTop], `${sailColor}b8`);
    }

    for (let mi = 0; mi < mastFs.length; mi++) {
      const fNorm = mastFs[mi];
      const worldM = toWorld(fNorm * halfLen, 0);
      const baseP = iso.toScreen(camera, worldM.x, worldM.z, w, h);
      const deckY = baseP.y - wallPx;
      const isMain = mi === mainIdx;
      const bell = 1 - Math.abs(fNorm) * 1.1;
      const mHeight = mastPx * (isMain ? 1.15 : 0.82 + bell * 0.18);
      const topY = deckY - mHeight;

      ctx.strokeStyle = tone(-54); ctx.lineWidth = Math.max(1, 1.1 * camera.zoom * 0.6);
      ctx.beginPath(); ctx.moveTo(baseP.x, deckY); ctx.lineTo(baseP.x, topY); ctx.stroke();

      const yardScale = halfBeam * (1.15 + Math.max(0, bell) * 0.55);
      const rightLen = Math.hypot(rightVec.x, rightVec.y) || 1;
      const yv = { x: (rightVec.x / rightLen) * yardScale * iso.scaleX * 0.5, y: (rightVec.y / rightLen) * yardScale * iso.scaleY * 0.5 };
      const yardL = { x: baseP.x - yv.x, y: topY + mHeight * 0.2 - yv.y };
      const yardR = { x: baseP.x + yv.x, y: topY + mHeight * 0.2 + yv.y };
      ctx.strokeStyle = tone(-45); ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(yardL.x, yardL.y); ctx.lineTo(yardR.x, yardR.y); ctx.stroke();

      const sailH = mHeight * 0.5;
      const sailGrad = ctx.createLinearGradient(0, yardL.y, 0, yardL.y + sailH);
      sailGrad.addColorStop(0, sailColor);
      sailGrad.addColorStop(1, shade(sailColor, -24));
      const sailBotL = { x: yardL.x, y: yardL.y + sailH }, sailBotR = { x: yardR.x, y: yardR.y + sailH };
      fillPoly(ctx, [yardL, yardR, sailBotR, sailBotL], sailGrad);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(yardL.x, yardL.y); ctx.lineTo(yardR.x, yardR.y);
      ctx.lineTo(sailBotR.x, sailBotR.y); ctx.lineTo(sailBotL.x, sailBotL.y);
      ctx.closePath(); ctx.stroke();

      if (isMain) {
        ctx.fillStyle = tone(-54);
        ctx.beginPath(); ctx.arc(baseP.x, topY, Math.max(0.9, camera.zoom * 0.7), 0, Math.PI * 2); ctx.fill();
        if (mastCount >= 3) { ctx.fillStyle = roleColor; ctx.fillRect(baseP.x - 0.7 * camera.zoom, topY - 2 * camera.zoom, 1.4 * camera.zoom, 1.6 * camera.zoom); }
      }
    }
  } else {
    // 난파선 — 부러진 돛대 하나
    ctx.strokeStyle = tone(-45); ctx.lineWidth = 1;
    const snapWorld = toWorld(halfLen * 0.1, 0);
    const snapBase = iso.toScreen(camera, snapWorld.x, snapWorld.z, w, h);
    ctx.beginPath();
    ctx.moveTo(snapBase.x, snapBase.y - wallPx);
    ctx.lineTo(snapBase.x + 3 * camera.zoom, snapBase.y - wallPx - mastPx * 0.4);
    ctx.stroke();
  }

  // ---- 현측 포열(대형/초대형) ----
  if (!isWreck && (cls === 'large' || cls === 'xlarge')) {
    const gunCount = cls === 'xlarge' ? 3 : 2;
    for (let gi = 0; gi < gunCount; gi++) {
      const f = 0.32 - (gi * 0.5) / Math.max(1, gunCount - 1 || 1);
      for (const side of [1, -1]) {
        const wp = toWorld(f * halfLen, side * halfBeam * 0.92);
        const gp = iso.toScreen(camera, wp.x, wp.z, w, h);
        ctx.fillStyle = tone(-58);
        const gs = Math.max(1, camera.zoom * 1.1);
        ctx.fillRect(gp.x - gs / 2, gp.y - wallPx * 0.55 - gs / 2, gs, gs);
      }
    }
  }

  // ---- 고물 깃대 + 깃발(난파선은 깃발을 내린다) ----
  if (!isWreck) {
    const poleTop = { x: sternDeck.x, y: sternDeck.y - mastPx * 0.55 };
    ctx.strokeStyle = tone(-52); ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(sternDeck.x, sternDeck.y); ctx.lineTo(poleTop.x, poleTop.y); ctx.stroke();
    const flut = { x: -fwdUnit.x * 4.4 * camera.zoom, y: -fwdUnit.y * 4.4 * camera.zoom - 1.2 * camera.zoom };
    ctx.fillStyle = flagColor;
    ctx.beginPath();
    ctx.moveTo(poleTop.x, poleTop.y);
    ctx.lineTo(poleTop.x + flut.x, poleTop.y + flut.y);
    ctx.lineTo(poleTop.x, poleTop.y + 2.2 * camera.zoom);
    ctx.closePath();
    ctx.fill();
  }

  if (isWreck) {
    const bx = basePts[0].x, by = basePts[0].y - wallPx * 0.5;
    const sx = sternDeck.x, sy = sternDeck.y;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(bx - 2, by - 2); ctx.lineTo(sx + 2, sy + 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - 2, sy - 2); ctx.lineTo(bx + 2, by + 2); ctx.stroke();
  }

  ctx.restore();
}
