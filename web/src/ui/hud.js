const $ = (id) => document.getElementById(id);

let toastTimer = null;
let mmBounds = null;
let mmBgCanvas = null;

function mmToPx(x, z, w, h) {
  return [
    ((x - mmBounds.minX) / (mmBounds.maxX - mmBounds.minX)) * w,
    ((z - mmBounds.minZ) / (mmBounds.maxZ - mmBounds.minZ)) * h,
  ];
}

function wmToPx(x, z, w, h, bounds) {
  return [
    ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * w,
    ((z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * h,
  ];
}

export const hud = {
  showLoading(v) { $('loading').classList.toggle('hidden', !v); },
  showTitle(v) { $('title-screen').classList.toggle('hidden', !v); },
  showCrosshair(v) { $('crosshair').classList.toggle('hidden', !v); },
  showTopBar(v) { $('top-bar').classList.toggle('hidden', !v); },
  showLocationBanner(v) { $('location-banner').classList.toggle('hidden', !v); },
  showSeaHud(v) {
    $('ship-hp-box').classList.toggle('hidden', !v);
    $('nav-panel').classList.toggle('hidden', !v);
  },
  showCombatBanner(v) { $('combat-banner').classList.toggle('hidden', !v); },
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
    const body = $('shipyard-body');
    body.innerHTML = '';
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
      const btn = document.createElement('button');
      btn.className = 'sy-btn';
      btn.textContent = r.actionLabel;
      btn.disabled = !!r.disabled;
      if (r.onAction) btn.onclick = r.onAction;
      side.appendChild(btn);
      row.appendChild(side);
      list.appendChild(row);
    }
    body.appendChild(list);
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

  initMinimap(landPolygons, bounds) {
    mmBounds = bounds;
    const canvas = $('minimap-canvas');
    const w = canvas.width, h = canvas.height;
    mmBgCanvas = document.createElement('canvas');
    mmBgCanvas.width = w; mmBgCanvas.height = h;
    const bctx = mmBgCanvas.getContext('2d');
    bctx.fillStyle = '#12384a';
    bctx.fillRect(0, 0, w, h);
    bctx.fillStyle = '#5f7a52';
    for (const poly of landPolygons) {
      bctx.beginPath();
      poly.forEach(([x, z], i) => {
        const [px, py] = mmToPx(x, z, w, h);
        if (i === 0) bctx.moveTo(px, py); else bctx.lineTo(px, py);
      });
      bctx.closePath();
      bctx.fill();
    }
  },

  updateMinimap(ship, cities, npcShips) {
    if (!mmBgCanvas) return;
    const canvas = $('minimap-canvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(mmBgCanvas, 0, 0);

    for (const c of cities) {
      const [px, py] = mmToPx(c.x, c.z, w, h);
      ctx.fillStyle = c.color || '#e6c15a';
      ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.6; ctx.stroke();
    }

    for (const n of npcShips) {
      const [px, py] = mmToPx(n.x, n.z, w, h);
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

  toggleInventory(items) {
    const panel = $('inventory-panel');
    const willShow = panel.classList.contains('hidden');
    if (willShow) {
      const grid = $('inventory-grid');
      grid.innerHTML = items.map((it) => `<div class="inv-slot">${it.name}<span class="qty">x${it.qty}</span></div>`).join('');
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
    ctx.fillStyle = 'rgba(210,230,240,0.4)';
    ctx.textAlign = 'center';
    for (const [name, poly] of regionBoxes) {
      let cx = 0, cz = 0;
      poly.forEach(([x, z]) => { cx += x; cz += z; });
      cx /= poly.length; cz /= poly.length;
      const [px, py] = wmToPx(cx, cz, w, h, bounds);
      if (px >= 10 && px <= w - 10 && py >= 10 && py <= h - 10) ctx.fillText(name, px, py);
    }

    // 대륙
    ctx.fillStyle = '#5f7a52';
    ctx.strokeStyle = 'rgba(20,40,30,0.55)';
    ctx.lineWidth = 1.2;
    for (const poly of landPolygons) {
      ctx.beginPath();
      poly.forEach(([x, z], i) => {
        const [px, py] = wmToPx(x, z, w, h, bounds);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 도시(항상 이름 표시)
    ctx.textAlign = 'left';
    for (const c of cities) {
      const [px, py] = wmToPx(c.x, c.z, w, h, bounds);
      ctx.fillStyle = c.color || '#e6c15a';
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#f0e6d2';
      ctx.font = '12px sans-serif';
      ctx.fillText(c.name, px + 7, py + 4);
    }

    // 플레이어 위치(참고용 — 지도 열람 자체는 이동 정보와 무관)
    if (ship) {
      const [px, py] = wmToPx(ship.x, ship.z, w, h, bounds);
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

  renderWorldMapPlaceholder() {
    const canvas = $('world-map-canvas');
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a1a22';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(160,180,190,0.12)';
    ctx.lineWidth = 1;
    for (let i = -h; i < w; i += 28) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8fa6b4';
    ctx.font = '22px sans-serif';
    ctx.fillText('미개척 해역', w / 2, h / 2 - 10);
    ctx.font = '13px sans-serif';
    ctx.fillText('아직 항해 기록이 없습니다', w / 2, h / 2 + 18);
  },

  toast(msg, ms = 2200) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  },
};
