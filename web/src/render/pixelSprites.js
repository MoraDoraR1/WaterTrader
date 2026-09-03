// 절차적으로 그리는 픽셀아트 스프라이트. 외부 이미지 파일을 쓸 수 없는 단일 HTML 아티팩트라,
// 작은 오프스크린 캔버스에 사각형/폴리곤을 채워 넣는 방식으로 도트 그림 느낌을 낸다
// (낮은 해상도 + imageSmoothingEnabled=false 확대가 만들어내는 계단현상이 곧 "도트"가 된다).
// 배는 더 이상 여기서 다루지 않는다 — render/shipIso.js가 매 프레임 실제 입체(선체 벽+갑판+돛대)로
// 대각선 투영해 그리므로, 캐시된 탑뷰 비트맵을 돌려 붙이는 방식보다 시점이 훨씬 자연스럽다.
import { cachedSprite } from './canvas2d.js';
import { COUNTRY_COLORS } from '../data/ships.js';

// ---- 캐릭터(도시 씬) ----
// hanbok: true면 한국 항구(hanok 레이아웃)용 한복 실루엣 — 아래로 퍼지는 치마/도포 자락 +
// 여성은 저고리 옷고름, 남성은 갓을 얹어 서양식 복장과 실루엣부터 다르게 그린다.
export function characterSprite(gender, roleColor, hanbok) {
  const key = `char_${gender}_${roleColor || 'p'}_${hanbok ? 'hb' : 'w'}`;
  return cachedSprite(key, 10, 12, (ctx, w, h) => {
    const outfit = roleColor || (gender === 'female' ? '#8a2d4d' : '#2d4a8a');
    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(w / 2, h - 1.5, 3, 1.4, 0, 0, Math.PI * 2); ctx.fill();
    if (hanbok) {
      // 치마/도포 자락 — 아래로 퍼지는 실루엣
      ctx.fillStyle = outfit;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 2, h / 2);
      ctx.lineTo(w / 2 + 2, h / 2);
      ctx.lineTo(w / 2 + 3.6, h - 2);
      ctx.lineTo(w / 2 - 3.6, h - 2);
      ctx.closePath(); ctx.fill();
      // 저고리(옅은 색 상의)
      ctx.fillStyle = gender === 'female' ? '#f2e9da' : '#e8e2d0';
      ctx.fillRect(w / 2 - 2.6, h / 2 - 2, 5.2, 3.4);
      // 머리
      ctx.fillStyle = '#e0b18c';
      ctx.beginPath(); ctx.arc(w / 2, h / 2 - 4, 2.6, 0, Math.PI * 2); ctx.fill();
      if (gender === 'female') {
        ctx.fillStyle = '#2b2118';
        ctx.beginPath(); ctx.arc(w / 2, h / 2 - 4.3, 2.7, Math.PI, 0); ctx.fill();
        ctx.fillStyle = outfit;
        ctx.fillRect(w / 2 - 0.6, h / 2 - 6.4, 1.2, 3); // 옷고름
      } else {
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.ellipse(w / 2, h / 2 - 6.6, 3.4, 1, 0, 0, Math.PI * 2); ctx.fill(); // 갓 챙
        ctx.fillRect(w / 2 - 1.6, h / 2 - 8.6, 3.2, 2.4); // 갓 몸통
      }
      return;
    }
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
