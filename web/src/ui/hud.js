const $ = (id) => document.getElementById(id);

let toastTimer = null;
let mmBounds = null;
let mmLandPolygons = null;

function mmToPx(x, z, w, h) {
  return [
    ((x - mmBounds.minX) / (mmBounds.maxX - mmBounds.minX)) * w,
    ((z - mmBounds.minZ) / (mmBounds.maxZ - mmBounds.minZ)) * h,
  ];
}

// 가로세로 비율을 고정한 변환(종횡비가 크게 다른 전세계 지도에서 대륙이 찌그러지지 않도록).
// bounds보다 짧은 축은 캔버스 중앙에 레터박스로 여백을 둔다.
function wmTransform(bounds, w, h) {
  const spanX = bounds.maxX - bounds.minX, spanZ = bounds.maxZ - bounds.minZ;
  const scale = Math.min(w / spanX, h / spanZ);
  return { scale, ox: (w - spanX * scale) / 2, oz: (h - spanZ * scale) / 2 };
}
function wmToPx(x, z, bounds, t) {
  return [(x - bounds.minX) * t.scale + t.ox, (z - bounds.minZ) * t.scale + t.oz];
}

// 조선소/의뢰 게시판처럼 "행마다 이름·설명·가격표·버튼 하나"인 목록 패널의 공용 렌더러.
// rows: [{ name, sub, badge?, badgeColor?, priceLabel?, actionLabel, disabled?, highlight?, onAction? }]
function renderRowList(bodyEl, rows) {
  bodyEl.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'sy-list';
  for (const r of rows) {
    const row = document.createElement('div');
    row.className = 'sy-row' + (r.highlight ? ' highlight' : '');
    const main = document.createElement('div');
    main.className = 'sy-row-main';
    const badge = r.badge ? `<span class="role-badge" style="background:${r.badgeColor || '#888'}">${r.badge}</span>` : '';
    main.innerHTML = `<div class="sy-row-name">${r.name} ${badge}</div><div class="sy-row-sub">${r.sub || ''}</div>`;
    row.appendChild(main);
    const side = document.createElement('div');
    side.className = 'sy-row-side';
    if (r.priceLabel != null) {
      const price = document.createElement('div');
      price.className = 'sy-price';
      price.textContent = r.priceLabel;
      side.appendChild(price);
    }
    const btnRow = document.createElement('div');
    btnRow.className = 'sy-row-side-actions';
    if (r.actionLabel) {
      const btn = document.createElement('button');
      btn.className = 'sy-btn';
      btn.textContent = r.actionLabel;
      btn.disabled = !!r.disabled;
      if (r.onAction) btn.onclick = r.onAction;
      btnRow.appendChild(btn);
    }
    if (r.secondaryLabel) {
      const btn2 = document.createElement('button');
      btn2.className = 'sy-btn sy-btn-secondary';
      btn2.textContent = r.secondaryLabel;
      btn2.disabled = !!r.secondaryDisabled;
      if (r.onSecondary) btn2.onclick = r.onSecondary;
      btnRow.appendChild(btn2);
    }
    side.appendChild(btnRow);
    row.appendChild(side);
    list.appendChild(row);
  }
  bodyEl.appendChild(list);
}

export const hud = {
  showLoading(v) { $('loading').classList.toggle('hidden', !v); },
  showTitle(v) { $('title-screen').classList.toggle('hidden', !v); },
  showTopBar(v) { $('top-bar').classList.toggle('hidden', !v); },
  showLocationBanner(v) { $('location-banner').classList.toggle('hidden', !v); },
  showSeaHud(v) {
    $('ship-hp-box').classList.toggle('hidden', !v);
    $('nav-panel').classList.toggle('hidden', !v);
    $('weather-badge').classList.toggle('hidden', !v);
  },
  setWeather(label, isStorm) {
    const el = $('weather-badge');
    el.textContent = label;
    el.classList.toggle('storm', !!isStorm);
  },
  showCombatBanner(v) { $('combat-banner').classList.toggle('hidden', !v); },
  setCombatBannerText(text) { $('combat-banner').textContent = text; },
  showTargetHp(v) { $('target-hp-box').classList.toggle('hidden', !v); },
  showInteractPrompt(v, text = '') {
    const el = $('interact-prompt');
    el.classList.toggle('hidden', !v);
    if (v) el.textContent = text;
  },
  showActionHints(v, items = []) {
    const el = $('action-hints');
    el.classList.toggle('hidden', !v);
    if (v) el.innerHTML = items.map((t) => `<span>${t}</span>`).join('');
  },

  setLocation(name, sub = '') {
    $('location-banner').firstChild.textContent = name;
    $('location-sub').textContent = sub;
  },
  setGold(v) { $('gold-amount').textContent = v.toLocaleString('ko-KR'); },
  setCrewMorale(v) {
    $('morale-amount').textContent = Math.round(v);
    const el = $('morale-box');
    el.classList.toggle('morale-low', v < 40);
  },
  setRank(label) { $('rank-label').textContent = label; },

  showEnding(stats) {
    const grid = $('ending-stats');
    grid.innerHTML = stats.map((s) => `<div><span class="stat-val">${s.val}</span><span class="stat-label">${s.label}</span></div>`).join('');
    $('ending-screen').classList.remove('hidden');
  },
  hideEnding() { $('ending-screen').classList.add('hidden'); },

  initThrottle(min, max) {
    const row = $('notch-row');
    row.innerHTML = '';
    for (let i = min; i <= max; i++) {
      const el = document.createElement('div');
      el.className = i === 0 ? 'notch zero-line' : 'notch';
      el.dataset.notch = String(i);
      row.appendChild(el);
    }
  },
  setThrottle(notch, min, max) {
    const row = $('notch-row');
    for (const el of row.children) {
      const n = Number(el.dataset.notch);
      el.classList.remove('filled-fwd', 'filled-rev');
      if (n === 0) continue;
      if (n > 0 && n <= notch) el.classList.add('filled-fwd');
      if (n < 0 && n >= notch) el.classList.add('filled-rev');
    }
    $('throttle-label').textContent = notch === 0 ? '정박' : notch > 0 ? `전진 ${notch}` : `후진 ${Math.abs(notch)}`;
  },
  setCompass(headingRad) {
    const deg = (headingRad * 180) / Math.PI;
    $('compass-needle').style.transform = `rotate(${deg}deg)`;
  },
  setWind(towardDirRad, label) {
    const deg = (towardDirRad * 180) / Math.PI;
    $('wind-needle').style.transform = `rotate(${deg}deg)`;
    $('wind-label').textContent = label;
  },
  setShipHp(ratio) { $('ship-hp-fill').style.width = `${Math.max(0, ratio * 100)}%`; },

  setShipRoleBadge(label, color) {
    const el = $('ship-role-badge');
    el.textContent = label;
    el.style.background = color;
  },

  showShipInfo(v) { $('ship-info-panel').classList.toggle('hidden', !v); },
  isShipInfoOpen() { return !$('ship-info-panel').classList.contains('hidden'); },

  renderShipInfo(info) {
    $('ship-info-name').textContent = info.name;
    const roleBadge = $('ship-info-role');
    roleBadge.textContent = info.roleLabel;
    roleBadge.style.background = info.roleColor;
    $('ship-info-sub').textContent = info.sub;
    $('ship-info-desc').textContent = info.desc;
    const rows = [
      ['si-bar-hp', 'si-val-hp', info.hpRatio, info.hpVal],
      ['si-bar-cargo', 'si-val-cargo', info.cargoRatio, info.cargoVal],
      ['si-bar-cannons', 'si-val-cannons', info.cannonsRatio, info.cannonsVal],
      ['si-bar-turn', 'si-val-turn', info.turnRatio, info.turnVal],
      ['si-bar-speed', 'si-val-speed', info.speedRatio, info.speedVal],
    ];
    for (const [barId, valId, ratio, val] of rows) {
      $(barId).style.width = `${Math.max(2, Math.min(100, ratio * 100))}%`;
      $(valId).textContent = val;
    }
    if (info.parts) {
      $('ship-info-parts-list').innerHTML = info.parts.map((p) => `
        <div class="si-part-row${p.name ? '' : ' si-part-empty'}">
          <span class="si-part-icon">${p.icon}</span>
          <span class="si-part-label">${p.label}</span>
          <span class="si-part-name">${p.name || '미장착'}</span>
        </div>`).join('');
    }
  },

  showShipyard(v) { $('shipyard-panel').classList.toggle('hidden', !v); },
  hideShipyard() { $('shipyard-panel').classList.add('hidden'); },
  isShipyardOpen() { return !$('shipyard-panel').classList.contains('hidden'); },

  setShipyardActiveTab(tab) {
    document.querySelectorAll('#shipyard-tabs .sy-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  },

  // rows: [{ name, sub, badge?, badgeColor?, priceLabel?, actionLabel, disabled?, highlight?, onAction? }]
  renderShipyard({ title, gold, rows }) {
    $('shipyard-title').textContent = title;
    $('shipyard-gold-amount').textContent = gold.toLocaleString('ko-KR');
    renderRowList($('shipyard-body'), rows);
  },

  showQuestBoard(v) { $('quest-panel').classList.toggle('hidden', !v); },
  hideQuestBoard() { $('quest-panel').classList.add('hidden'); },
  isQuestBoardOpen() { return !$('quest-panel').classList.contains('hidden'); },

  // sections: [{ heading, rows, empty? }] — 섹션마다 소제목 하나 + 행 목록(또는 empty 안내문)
  renderQuestBoard({ title, sections }) {
    $('quest-header-title').textContent = title;
    const body = $('quest-body');
    body.innerHTML = '';
    for (const sec of sections) {
      const heading = document.createElement('div');
      heading.className = 'quest-section-title';
      heading.textContent = sec.heading;
      body.appendChild(heading);
      if (!sec.rows.length) {
        const empty = document.createElement('div');
        empty.className = 'quest-empty';
        empty.textContent = sec.empty || '해당 사항 없음';
        body.appendChild(empty);
        continue;
      }
      const listWrap = document.createElement('div');
      renderRowList(listWrap, sec.rows);
      body.appendChild(listWrap.firstChild);
    }
  },

  showMarket(v) { $('market-panel').classList.toggle('hidden', !v); },
  hideMarket() { $('market-panel').classList.add('hidden'); },
  isMarketOpen() { return !$('market-panel').classList.contains('hidden'); },

  // rows: [{ name, sub, actions: [{ label, disabled?, onAction }] }]
  renderMarket({ title, gold, cargo, rows }) {
    $('market-title').textContent = title;
    $('market-gold-amount').textContent = gold.toLocaleString('ko-KR');
    $('market-cargo').textContent = cargo;
    const body = $('market-body');
    body.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'sy-list';
    for (const r of rows) {
      const row = document.createElement('div');
      row.className = 'sy-row';
      const main = document.createElement('div');
      main.className = 'sy-row-main';
      main.innerHTML = `<div class="sy-row-name">${r.name}</div><div class="sy-row-sub">${r.sub || ''}</div>`;
      row.appendChild(main);
      const side = document.createElement('div');
      side.className = 'sy-row-side sy-row-side-actions';
      for (const a of (r.actions || [])) {
        const btn = document.createElement('button');
        btn.className = 'sy-btn';
        btn.textContent = a.label;
        btn.disabled = !!a.disabled;
        if (a.onAction) btn.onclick = a.onAction;
        side.appendChild(btn);
      }
      row.appendChild(side);
      list.appendChild(row);
    }
    body.appendChild(list);
  },

  // 미니맵은 이제 세계지도 축척과 별개로, 배 주변 일정 반경을 항상 따라다니며 보여주는
  // "국지 항해도"다(전세계 축척으로 고정하면 배가 거의 안 움직이는 것처럼 보여 쓸모가 없다).
  // landPolygons는 한 번만 저장해두고, 배경은 매 프레임 현재 bounds로 다시 그린다.
  initMinimap(landPolygons) {
    mmLandPolygons = landPolygons;
  },

  updateMinimap(bounds, ship, cities, npcShips, windTowardDir) {
    if (!mmLandPolygons) return;
    mmBounds = bounds;
    const canvas = $('minimap-canvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#12384a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#5f7a52';
    ctx.strokeStyle = 'rgba(20,40,30,0.5)';
    ctx.lineWidth = 1;
    for (const poly of mmLandPolygons) {
      ctx.beginPath();
      poly.forEach(([x, z], i) => {
        const [px, py] = mmToPx(x, z, w, h);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    for (const c of cities) {
      const [px, py] = mmToPx(c.x, c.z, w, h);
      if (px < -6 || px > w + 6 || py < -6 || py > h + 6) continue;
      ctx.fillStyle = c.color || '#e6c15a';
      ctx.beginPath(); ctx.arc(px, py, 2.8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.6; ctx.stroke();
    }

    for (const n of npcShips) {
      const [px, py] = mmToPx(n.x, n.z, w, h);
      if (px < -6 || px > w + 6 || py < -6 || py > h + 6) continue;
      ctx.fillStyle = n.hostile ? '#e0503f' : '#cfe0ea';
      ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI * 2); ctx.fill();
    }

    // 플레이어 삼각형 — 캔버스 rotate 대신 world의 sin/cos(heading) 그대로 재사용해
    // 다른 곳(나침반 등)과 회전 방향 규약을 동일하게 맞춘다.
    const [px, py] = mmToPx(ship.x, ship.z, w, h);
    const fw = [Math.sin(ship.heading), Math.cos(ship.heading)];
    const rt = [Math.cos(ship.heading), -Math.sin(ship.heading)];
    const tip = [px + fw[0] * 6, py + fw[1] * 6];
    const bl = [px - fw[0] * 4 + rt[0] * 3.6, py - fw[1] * 4 + rt[1] * 3.6];
    const br = [px - fw[0] * 4 - rt[0] * 3.6, py - fw[1] * 4 - rt[1] * 3.6];
    ctx.fillStyle = '#f3d98a';
    ctx.beginPath();
    ctx.moveTo(tip[0], tip[1]); ctx.lineTo(bl[0], bl[1]); ctx.lineTo(br[0], br[1]);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 0.7; ctx.stroke();

    // 미니맵 좌상단 구석에 바람이 불어가는 방향(순풍이 되는 방향)을 작은 화살표로 표시
    if (windTowardDir != null) {
      const cx = 14, cy = 14, r = 8;
      const wf = [Math.sin(windTowardDir), Math.cos(windTowardDir)];
      ctx.strokeStyle = 'rgba(207,224,234,0.55)';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#cfe0ea'; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx - wf[0] * r * 0.8, cy - wf[1] * r * 0.8);
      ctx.lineTo(cx + wf[0] * r * 0.8, cy + wf[1] * r * 0.8);
      ctx.stroke();
      const tipX = cx + wf[0] * r * 0.8, tipY = cy + wf[1] * r * 0.8;
      const backX = cx + wf[0] * r * 0.35, backY = cy + wf[1] * r * 0.35;
      const perp = [wf[1], -wf[0]];
      ctx.fillStyle = '#cfe0ea';
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(backX + perp[0] * 2.4, backY + perp[1] * 2.4);
      ctx.lineTo(backX - perp[0] * 2.4, backY - perp[1] * 2.4);
      ctx.closePath(); ctx.fill();
    }
  },
  setTargetHp(name, ratio) {
    $('target-name').textContent = name;
    $('target-hp-fill').style.width = `${Math.max(0, ratio * 100)}%`;
  },

  showDialogue(name, line, actions = []) {
    $('dialogue-name').textContent = name;
    $('dialogue-line').textContent = line;
    const box = $('dialogue-actions');
    box.innerHTML = '';
    for (const a of actions) {
      const btn = document.createElement('button');
      btn.textContent = a.label;
      btn.onclick = a.onClick;
      box.appendChild(btn);
    }
    $('dialogue-box').classList.remove('hidden');
  },
  hideDialogue() { $('dialogue-box').classList.add('hidden'); },

  toggleInventory(items, priceMap) {
    const panel = $('inventory-panel');
    const willShow = panel.classList.contains('hidden');
    if (willShow) {
      const grid = $('inventory-grid');
      grid.innerHTML = items.map((it) => {
        const price = priceMap && priceMap[it.id];
        const priceLine = price ? `<span class="inv-price">매도가 ${price.sell}/t · 총액 ${(price.sell * it.qty).toLocaleString('ko-KR')}</span>` : '';
        return `<div class="inv-slot">${it.name}<span class="qty">x${it.qty}</span>${priceLine}</div>`;
      }).join('');
    }
    panel.classList.toggle('hidden', !willShow);
    return willShow;
  },
  closeInventory() { $('inventory-panel').classList.add('hidden'); },
  isInventoryOpen() { return !$('inventory-panel').classList.contains('hidden'); },

  showWorldMap(v) { $('world-map-panel').classList.toggle('hidden', !v); },
  isWorldMapOpen() { return !$('world-map-panel').classList.contains('hidden'); },

  setWorldMapHeader(name, subtitle, idx, total) {
    $('world-map-title').textContent = name;
    $('world-map-subtitle').textContent = subtitle;
    $('world-map-page').textContent = `${idx + 1} / ${total}`;
  },

  renderWorldMapReal({ landPolygons, bounds, cities, regionBoxes, ship }) {
    const canvas = $('world-map-canvas');
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d');
    const t = wmTransform(bounds, w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0f3245';
    ctx.fillRect(0, 0, w, h);

    // 옅은 위경도 격자 — 대항해시대 지도책 느낌
    ctx.strokeStyle = 'rgba(180,210,225,0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const gx = (w / 10) * i, gy = (h / 10) * i;
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    }

    // 해역 이름 라벨(구획 표시)
    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(210,230,240,0.45)';
    ctx.textAlign = 'center';
    for (const [name, poly] of regionBoxes) {
      let cx = 0, cz = 0;
      poly.forEach(([x, z]) => { cx += x; cz += z; });
      cx /= poly.length; cz /= poly.length;
      const [px, py] = wmToPx(cx, cz, bounds, t);
      if (px >= 10 && px <= w - 10 && py >= 10 && py <= h - 10) ctx.fillText(name, px, py);
    }

    // 대륙
    ctx.fillStyle = '#5f7a52';
    ctx.strokeStyle = 'rgba(20,40,30,0.55)';
    ctx.lineWidth = 1.2;
    for (const poly of landPolygons) {
      ctx.beginPath();
      poly.forEach(([x, z], i) => {
        const [px, py] = wmToPx(x, z, bounds, t);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 도시 — 항상 이름을 표시하되, 전세계 축척에서도 잘 보이도록 마커를 키우고
    // 짙은 테두리 + 밝은 후광을 둬 옅은 배경/해안선 위에서도 도드라지게 한다.
    ctx.textAlign = 'left';
    for (const c of cities) {
      const [px, py] = wmToPx(c.x, c.z, bounds, t);
      if (px < -20 || px > w + 20 || py < -20 || py > h + 20) continue;
      ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10,8,4,0.55)'; ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = c.color || '#e6c15a'; ctx.fill();
      ctx.strokeStyle = '#f0e6d2'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = 'rgba(6,10,14,0.85)';
      ctx.fillText(c.name, px + 10, py + 5);
      ctx.fillStyle = '#f6ecd4';
      ctx.fillText(c.name, px + 9, py + 4);
    }

    // 플레이어 위치(참고용 — 지도 열람 자체는 이동 정보와 무관)
    if (ship) {
      const [px, py] = wmToPx(ship.x, ship.z, bounds, t);
      const fw = [Math.sin(ship.heading), Math.cos(ship.heading)];
      const rt = [Math.cos(ship.heading), -Math.sin(ship.heading)];
      const tip = [px + fw[0] * 10, py + fw[1] * 10];
      const bl = [px - fw[0] * 7 + rt[0] * 6, py - fw[1] * 7 + rt[1] * 6];
      const br = [px - fw[0] * 7 - rt[0] * 6, py - fw[1] * 7 - rt[1] * 6];
      ctx.fillStyle = '#ff5a3c';
      ctx.beginPath();
      ctx.moveTo(tip[0], tip[1]); ctx.lineTo(bl[0], bl[1]); ctx.lineTo(br[0], br[1]);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    }
  },

  toast(msg, ms = 2200) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  },
};
