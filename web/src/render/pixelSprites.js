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
export function characterSprite(gender, roleColor, hanbok, role) {
  const key = `char_${gender}_${roleColor || 'p'}_${hanbok ? 'hb' : 'w'}_${role || 'none'}`;
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
    // 몸통 — 여성은 아래로 살짝 퍼지는 치마 실루엣, 남성은 각진 상의로 실루엣부터 구분한다
    // (예전엔 서양식 캐릭터가 성별과 무관하게 완전히 동일한 사각형 하나였다).
    ctx.fillStyle = outfit;
    if (gender === 'female') {
      ctx.beginPath();
      ctx.moveTo(w / 2 - 2.4, h / 2 - 2); ctx.lineTo(w / 2 + 2.4, h / 2 - 2);
      ctx.lineTo(w / 2 + 3.4, h / 2 + 4); ctx.lineTo(w / 2 - 3.4, h / 2 + 4);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillRect(w / 2 - 3, h / 2 - 2, 6, 6);
    }
    // 머리
    ctx.fillStyle = '#e0b18c';
    ctx.beginPath(); ctx.arc(w / 2, h / 2 - 4, 2.6, 0, Math.PI * 2); ctx.fill();
    // 머리카락 — 여성은 얼굴을 감싸는 긴 머리, 남성은 짧은 뒷머리만.
    ctx.fillStyle = '#2b2118';
    if (gender === 'female') {
      ctx.beginPath(); ctx.arc(w / 2, h / 2 - 4, 2.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e0b18c';
      ctx.beginPath(); ctx.ellipse(w / 2, h / 2 - 3.6, 2.2, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(w / 2, h / 2 - 5, 2.6, Math.PI, 0); ctx.fill();
    }

    // ---- 역할별 액세서리 — 옷 색 하나로만 구분되던 걸 실루엣 차이로 보강한다 ----
    if (role === 'shipwright') {
      // 목공용 가죽 앞치마 + 손에 든 망치
      ctx.fillStyle = '#5a3d24';
      ctx.fillRect(w / 2 - 2.2, h / 2 - 1, 4.4, 5);
      ctx.fillStyle = '#7a6a52';
      ctx.fillRect(w / 2 + 2.6, h / 2 + 0.4, 1.1, 3);
      ctx.fillStyle = '#3a2c1c';
      ctx.fillRect(w / 2 + 2.1, h / 2 - 0.4, 2.1, 1.3);
    } else if (role === 'merchant') {
      // 챙 넓은 상인 모자
      ctx.fillStyle = '#3a2c1c';
      ctx.beginPath(); ctx.ellipse(w / 2, h / 2 - 6.1, 3.1, 0.9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(w / 2 - 1.3, h / 2 - 7.3, 2.6, 1.4);
    } else if (role === 'banker') {
      // 짙은 정장의 대비되는 셔츠 라인 + 겨드랑이에 낀 장부
      ctx.fillStyle = '#f0e6d2';
      ctx.fillRect(w / 2 - 0.6, h / 2 - 1.8, 1.2, 3);
      ctx.fillStyle = '#8a7c58';
      ctx.fillRect(w / 2 + 2.3, h / 2 - 0.2, 1.7, 2.3);
    } else if (role === 'harbormaster') {
      // 이각모(항구 관리인 정복) + 팔에 두른 완장
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.moveTo(w / 2 - 3.2, h / 2 - 5.8); ctx.lineTo(w / 2 + 3.2, h / 2 - 5.8); ctx.lineTo(w / 2, h / 2 - 8);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d9ac54';
      ctx.fillRect(w / 2 - 2.8, h / 2 - 0.8, 1.5, 1.3);
    } else if (role === 'governor') {
      // 짙은 망토 자락 + 깃털 장식 모자
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(w / 2 - 3.6, h / 2 - 1, 1.3, 5.6);
      ctx.fillStyle = '#8a2d2d';
      ctx.beginPath(); ctx.ellipse(w / 2, h / 2 - 6.3, 2.7, 1.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#f2ece0'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(w / 2 + 1.5, h / 2 - 6.8); ctx.lineTo(w / 2 + 3, h / 2 - 9); ctx.stroke();
    }
  });
}

// ---- 도시 마커(바다에서 보이는 항구 아이콘) ----
// 예전엔 16x16짜리 작은 오두막 실루엣이라 바다 화면 축척에서 거의 안 보였다 — 캔버스를
// 키우고, 실제 항구 등대(흰 몸통 + 빨간 띠 + 노란 등불)와 부두 잔교를 그려 훨씬 크고
// 눈에 띄는 실루엣으로 바꿨다. 국가색은 등대 몸통 위쪽 밴드와 깃발 둘 다에 반영해 배색이
// 또렷하게 드러나도록 한다.
export function cityIconSprite(country) {
  const key = `cityicon2_${country}`;
  const flagColor = COUNTRY_COLORS[country] || '#999';
  // 세로 레이아웃(위→아래, 캔버스 34px 안에 전부 들어오도록): 지붕 2 → 등롱 6~11 →
  // 경고 밴드 11~15 → 몸통(국가색 밴드 포함) 15~24 → 부두 잔교 24~31 → 그림자 31.
  return cachedSprite(key, 26, 34, (ctx, w, h) => {
    const cx = w / 2;
    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(cx, 31, 10, 3.2, 0, 0, Math.PI * 2); ctx.fill();
    // 부두 잔교(바위/목재 받침)
    ctx.fillStyle = '#7a6a52';
    ctx.beginPath();
    ctx.moveTo(cx - 11, 31); ctx.lineTo(cx + 11, 31); ctx.lineTo(cx + 7, 24); ctx.lineTo(cx - 7, 24);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4f4534'; ctx.lineWidth = 1; ctx.stroke();
    // 등대 몸통(아래로 갈수록 넓어지는 원뿔형 실루엣)
    ctx.fillStyle = '#f2ece0';
    ctx.beginPath();
    ctx.moveTo(cx - 4.5, 15); ctx.lineTo(cx - 6.5, 24); ctx.lineTo(cx + 6.5, 24); ctx.lineTo(cx + 4.5, 15);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#b9ac93'; ctx.lineWidth = 1; ctx.stroke();
    // 국가색 밴드(몸통 중간)
    ctx.fillStyle = flagColor;
    ctx.beginPath();
    ctx.moveTo(cx - 5, 19); ctx.lineTo(cx - 5.3, 22); ctx.lineTo(cx + 5.3, 22); ctx.lineTo(cx + 5, 19);
    ctx.closePath(); ctx.fill();
    // 붉은 경고 밴드(등대 상징색)
    ctx.fillStyle = '#b8412f';
    ctx.beginPath();
    ctx.moveTo(cx - 4.7, 11); ctx.lineTo(cx - 5.2, 15); ctx.lineTo(cx + 5.2, 15); ctx.lineTo(cx + 4.7, 11);
    ctx.closePath(); ctx.fill();
    // 등롱(램프실) — 검은 테두리의 유리방 + 노란 불빛
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(cx - 4.4, 6, 8.8, 5);
    ctx.fillStyle = 'rgba(255,211,92,0.35)';
    ctx.beginPath(); ctx.arc(cx, 8.5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd35c';
    ctx.beginPath(); ctx.arc(cx, 8.5, 2.6, 0, Math.PI * 2); ctx.fill();
    // 지붕
    ctx.fillStyle = '#5a4636';
    ctx.beginPath();
    ctx.moveTo(cx - 6, 6); ctx.lineTo(cx, 1); ctx.lineTo(cx + 6, 6);
    ctx.closePath(); ctx.fill();
  });
}
