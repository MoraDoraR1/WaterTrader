// 절차적으로 그리는 탑뷰 픽셀아트 스프라이트. 외부 이미지 파일을 쓸 수 없는 단일 HTML
// 아티팩트라, 작은 오프스크린 캔버스에 사각형/폴리곤을 채워 넣는 방식으로 도트 그림 느낌을 낸다
// (낮은 해상도 + imageSmoothingEnabled=false 확대가 만들어내는 계단현상이 곧 "도트"가 된다).
// 배 스프라이트는 뱃머리가 로컬 캔버스의 +Y(아래쪽)를 향하도록 그린다 — Camera2D가 이 스프라이트를
// ctx.rotate(-heading)로 돌리면 world의 fwd=(sin h, cos h) 방향과 정확히 일치한다.
import { cachedSprite } from './canvas2d.js';
import { SHIP_CLASSES, SHIP_ROLES, COUNTRY_COLORS } from '../data/ships.js';

const CLASS_SIZE = {
  small: { w: 12, h: 22 },
  medium: { w: 15, h: 28 },
  large: { w: 18, h: 36 },
  xlarge: { w: 22, h: 46 },
};

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + amt)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export function shipSpriteKey(shipDef, variant) { return `ship_${shipDef.id}_${variant || 'n'}`; }

export function shipSprite(shipDef, variant) {
  const key = shipSpriteKey(shipDef, variant);
  const size = CLASS_SIZE[shipDef.class] || CLASS_SIZE.medium;
  const roleColor = (SHIP_ROLES[shipDef.role] || SHIP_ROLES.trade).color;
  const flagColor = COUNTRY_COLORS[shipDef.country] || '#999';
  const hullBase = variant === 'wreck' ? '#3a332a' : '#7a5230';
  return cachedSprite(key, size.w, size.h, (ctx, w, h) => {
    const hull = variant === 'hostile' ? shade(hullBase, -18) : hullBase;
    const cx = w / 2;
    // 선체 — 이물(아래)이 뾰족하고 고물(위)이 뭉툭한 카누형 폴리곤
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.moveTo(cx, h - 1);
    ctx.lineTo(w - 1, h * 0.62);
    ctx.lineTo(w - 2, h * 0.18);
    ctx.lineTo(cx + w * 0.28, 1);
    ctx.lineTo(cx - w * 0.28, 1);
    ctx.lineTo(1, h * 0.18);
    ctx.lineTo(0, h * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade(hull, -40);
    ctx.lineWidth = 1;
    ctx.stroke();

    // 갑판 중앙 라인 — 역할 색
    ctx.fillStyle = roleColor;
    ctx.fillRect(cx - 1, h * 0.22, 2, h * 0.56);

    // 돛대 — 클래스가 클수록 개수가 늘어난다
    const mastCount = SHIP_CLASSES[shipDef.class]?.mastCount || 1;
    ctx.fillStyle = shade(hull, -55);
    for (let i = 0; i < mastCount; i++) {
      const my = h * (0.28 + i * (0.4 / Math.max(1, mastCount)));
      ctx.fillRect(cx - 1, my, 2, 2);
    }

    // 선미 깃발 — 국기색 점
    ctx.fillStyle = flagColor;
    ctx.fillRect(cx - 1, h * 0.12, 3, 3);

    if (variant === 'wreck') {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(w - 2, h - 2); ctx.stroke();
    }
  });
}

export function shipSpriteSize(shipDef) { return CLASS_SIZE[shipDef.class] || CLASS_SIZE.medium; }

// ---- 캐릭터(도시 씬) ----
export function characterSprite(gender, roleColor) {
  const key = `char_${gender}_${roleColor || 'p'}`;
  return cachedSprite(key, 10, 12, (ctx, w, h) => {
    const outfit = roleColor || (gender === 'female' ? '#8a2d4d' : '#2d4a8a');
    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(w / 2, h - 1.5, 3, 1.4, 0, 0, Math.PI * 2); ctx.fill();
    // 몸통
    ctx.fillStyle = outfit;
    ctx.fillRect(w / 2 - 3, h / 2 - 2, 6, 6);
    // 머리
    ctx.fillStyle = '#e0b18c';
    ctx.beginPath(); ctx.arc(w / 2, h / 2 - 4, 2.6, 0, Math.PI * 2); ctx.fill();
    // 머리카락
    ctx.fillStyle = '#2b2118';
    ctx.beginPath(); ctx.arc(w / 2, h / 2 - 5, 2.6, Math.PI, 0); ctx.fill();
  });
}

// ---- 도시 마커(바다에서 보이는 항구 아이콘) ----
export function cityIconSprite(country) {
  const key = `cityicon_${country}`;
  const flagColor = COUNTRY_COLORS[country] || '#999';
  return cachedSprite(key, 16, 16, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(w / 2, h - 2, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9b896';
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a7658'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#e8ddb5';
    ctx.fillRect(w / 2 - 3, h / 2 - 5, 6, 5);
    ctx.fillStyle = '#a8492f';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 4, h / 2 - 5); ctx.lineTo(w / 2, h / 2 - 9); ctx.lineTo(w / 2 + 4, h / 2 - 5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = flagColor;
    ctx.fillRect(w / 2 - 1, h / 2 - 12, 3, 3);
  });
}
