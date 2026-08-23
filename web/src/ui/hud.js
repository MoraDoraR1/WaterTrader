const $ = (id) => document.getElementById(id);

let toastTimer = null;

export const hud = {
  showLoading(v) { $('loading').classList.toggle('hidden', !v); },
  showTitle(v) { $('title-screen').classList.toggle('hidden', !v); },
  showCrosshair(v) { $('crosshair').classList.toggle('hidden', !v); },
  showTopBar(v) { $('top-bar').classList.toggle('hidden', !v); },
  showSeaHud(v) { $('sea-hud').classList.toggle('hidden', !v); },
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
