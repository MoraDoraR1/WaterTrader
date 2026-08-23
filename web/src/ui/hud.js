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

  toast(msg, ms = 2200) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  },
};
