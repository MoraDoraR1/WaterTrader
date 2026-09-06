const $ = (id) => document.getElementById(id);

// 내구도 바 색상 단계 — 절반 밑이면 노랑(hp-mid), 1/4 밑이면 빨강+점멸(hp-low). 둘 다 아니면
// 원래 클래스(.bar-fill 기본 초록 / .enemy 기본 빨강)로 돌아간다.
function applyHpTier(el, ratio) {
  el.classList.toggle('hp-mid', ratio < 0.5 && ratio >= 0.25);
  el.classList.toggle('hp-low', ratio < 0.25);
}

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
export function renderRowList(bodyEl, rows) {
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
    $('supplies-badge').classList.toggle('hidden', !v);
  },
  setWeather(label, isStorm) {
    const el = $('weather-badge');
    el.textContent = label;
    el.classList.toggle('storm', !!isStorm);
  },
  // supplies: [{icon,label,qty,low}] — low(부족 경고 임계치 이하)면 강조 색으로 표시한다.
  setSupplies(supplies) {
    $('supplies-badge').innerHTML = supplies
      .map((s) => `<span${s.low ? ' class="low"' : ''}>${s.icon}${s.qty}</span>`)
      .join('');
  },
  showCombatBanner(v) { $('combat-banner').classList.toggle('hidden', !v); },
  setCombatBannerText(text) { $('combat-banner').textContent = text; },

  // 전투 개시/강습/승리/패배 — 화면 중앙에 1초간 크게 떴다 사라지는 플래시 텍스트.
  // tone으로 색만 다르게 준다(default: 시작, danger: 강습, win: 승리, lose: 패배).
  flashCombatText(text, tone = 'default') {
    const el = $('combat-flash');
    clearTimeout(this._combatFlashTimer);
    el.textContent = text;
    el.className = `tone-${tone}`;
    void el.offsetWidth; // 같은 텍스트가 연달아 뜰 때도 트랜지션이 다시 재생되도록 리플로우 강제
    el.classList.add('show');
    this._combatFlashTimer = setTimeout(() => el.classList.remove('show'), 1000);
  },
  showTargetHp(v) { $('target-hp-box').classList.toggle('hidden', !v); },

  // 클릭으로 지정한 함선의 상호작용 메뉴(전투/대화/종료) — 처음 열 때 버튼 핸들러를 등록하고,
  // 이후엔 updateInteractionMenu()로 매 프레임 범위 내 여부·전투력 텍스트만 갱신한다.
  showInteractionMenu({ name, hostile }, { onCombat, onTalk, onCancel }) {
    $('interaction-menu').classList.remove('hidden');
    const nameEl = $('im-name');
    nameEl.textContent = name;
    nameEl.classList.toggle('hostile', !!hostile);
    $('im-combat').onclick = onCombat;
    $('im-talk').onclick = onTalk;
    $('im-cancel').onclick = onCancel;
  },
  updateInteractionMenu({ inRange, hpRatio, combatText }) {
    const el = $('interaction-menu');
    if (el.classList.contains('hidden')) return;
    $('im-sub').textContent = `${combatText} · 상대 내구 ${Math.round((hpRatio ?? 1) * 100)}%`;
    $('im-combat').disabled = !inRange;
    $('im-talk').disabled = !inRange;
    $('im-cancel').disabled = !inRange;
    $('im-hint').classList.toggle('hidden', inRange);
  },
  hideInteractionMenu() { $('interaction-menu').classList.add('hidden'); },
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
  setCrewCount(count, max, minCrew) {
    $('crew-amount').textContent = Math.round(count);
    $('crew-max').textContent = Math.round(max);
    $('crew-box').classList.toggle('crew-low', count < minCrew);
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
  setShipHp(ratio) {
    const fill = $('ship-hp-fill');
    fill.style.width = `${Math.max(0, ratio * 100)}%`;
    applyHpTier(fill, ratio);
  },
  // 피격 순간(포격/충돌/벼락) 호출 — 내구도 패널을 붉게 짧게 번쩍이고, 화면 가장자리에도
  // 옅은 붉은 비네트를 짧게 띄운다. 카메라 흔들림(seaScene의 addShake)과 함께 써서
  // "맞았다"는 느낌을 시각적으로 분명히 한다.
  flashShipHit() {
    const box = $('ship-hp-box');
    box.classList.remove('hit-flash');
    void box.offsetWidth;
    box.classList.add('hit-flash');
    const vignette = $('hit-vignette');
    vignette.classList.add('show');
    clearTimeout(this._hitVignetteTimer);
    this._hitVignetteTimer = setTimeout(() => vignette.classList.remove('show'), 90);
  },

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
    $('si-val-combat').textContent = info.combatVal;
    const rows = [
      ['si-bar-hp', 'si-val-hp', info.hpRatio, info.hpVal],
      ['si-bar-armor', 'si-val-armor', info.armorRatio, info.armorVal],
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
    if (info.skills) {
      $('ship-info-skills-list').innerHTML = info.skills.length
        ? info.skills.map((s) => `
          <div class="si-skill-row">
            <span class="si-skill-name">${s.name}</span>
            <span class="si-skill-desc">${s.desc}</span>
          </div>`).join('')
        : '<div class="si-part-row si-part-empty"><span class="si-part-name">없음</span></div>';
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

  showSkillPanel(v) { $('skill-panel').classList.toggle('hidden', !v); },
  hideSkillPanel() { $('skill-panel').classList.add('hidden'); },
  isSkillPanelOpen() { return !$('skill-panel').classList.contains('hidden'); },
  setSkillActiveTab(tab) {
    document.querySelectorAll('#skill-tabs .sy-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  },
  // rows: renderRowList와 같은 스키마 — 스킬 하나당 한 행(레벨/진행도 + 학습/장착 버튼 등).
  renderSkillPanel(rows) {
    renderRowList($('skill-body'), rows);
  },
  // 퀵슬롯 9칸 그리드(스킬 패널 "퀵슬롯" 탭 전용) — slots: [{ label, sub, filled, onClick }]
  renderQuickslotGrid(slots) {
    const grid = $('skill-quickslot-grid');
    grid.innerHTML = '';
    grid.classList.remove('hidden');
    slots.forEach((s, i) => {
      const btn = document.createElement('button');
      btn.className = 'qslot' + (s.filled ? ' qslot-filled' : '');
      btn.innerHTML = `<span class="qslot-num">${i + 1}</span>${s.label}${s.sub ? `<div style="color:#8fa6b4;margin-top:2px;">${s.sub}</div>` : ''}`;
      if (s.onClick) btn.onclick = s.onClick;
      grid.appendChild(btn);
    });
  },
  hideQuickslotGrid() { $('skill-quickslot-grid').classList.add('hidden'); },

  showCompendiumPanel(v) { $('compendium-panel').classList.toggle('hidden', !v); },
  hideCompendiumPanel() { $('compendium-panel').classList.add('hidden'); },
  isCompendiumPanelOpen() { return !$('compendium-panel').classList.contains('hidden'); },
  setCompendiumActiveTab(tab) {
    document.querySelectorAll('#compendium-tabs .sy-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  },
  renderCompendiumPanel({ title, rows }) {
    $('compendium-title').textContent = title;
    renderRowList($('compendium-body'), rows);
  },

  // 바다 HUD: 장착된 전투 액티브 버프 2슬롯을 상시 표시 — 쿨다운/지속시간 안내.
  // slots: [{ icon, name, statusText, state: 'empty'|'ready'|'cooldown'|'active' }, ...]
  showBuffSlots(v) { $('buff-slots').classList.toggle('hidden', !v); },
  renderBuffSlots(slots) {
    $('buff-slots').innerHTML = slots.map((s, i) => `
      <div class="buff-slot buff-${s.state}">
        <div class="buff-slot-name"><span>${s.icon || '—'} ${s.name || `슬롯 ${i + 1} 비어있음`}</span><span>${i + 1}</span></div>
        ${s.statusText ? `<div style="margin-top:2px;color:#9fb8c9;">${s.statusText}</div>` : ''}
      </div>`).join('');
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
  // headerTitle/cargoLabel: 시장(기본값) 외에 은행 등 같은 패널을 재사용하는 화면에서 문구를 바꿔 쓴다.
  renderMarket({ title, gold, cargo, rows, headerTitle, cargoLabel }) {
    $('market-header-title').textContent = headerTitle || '🏺 시장';
    $('market-cargo-label').textContent = cargoLabel || '적재';
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

  updateMinimap(bounds, ship, cities, npcShips, windTowardDir, explorationSite, compendiumSites) {
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

    // 모험 축 반복 콘텐츠(systems/exploration.js) — 미탐사 해역 좌표를 금색 다이아몬드로 표시.
    if (explorationSite) {
      const [ex, ey] = mmToPx(explorationSite.x, explorationSite.z, w, h);
      if (ex >= -6 && ex <= w + 6 && ey >= -6 && ey <= h + 6) {
        ctx.fillStyle = '#ffd76e';
        ctx.beginPath();
        ctx.moveTo(ex, ey - 4); ctx.lineTo(ex + 4, ey); ctx.lineTo(ex, ey + 4); ctx.lineTo(ex - 4, ey);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.6; ctx.stroke();
      }
    }

    // 학문(고고학/지리학) 발견 지점 — 미니맵 반경 안에 들어왔을 때만 자연스럽게 눈에 띈다.
    if (compendiumSites) {
      for (const s of compendiumSites) {
        const [sx, sy] = mmToPx(s.x, s.z, w, h);
        if (sx < -6 || sx > w + 6 || sy < -6 || sy > h + 6) continue;
        ctx.fillStyle = s.found ? '#9ee08a' : (s.category === 'archaeology' ? '#c9a876' : '#6fc8e0');
        ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.6; ctx.stroke();
      }
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
    const fill = $('target-hp-fill');
    fill.style.width = `${Math.max(0, ratio * 100)}%`;
    applyHpTier(fill, ratio);
  },

  showDialogue(name, line, actions = []) {
    $('dialogue-name').textContent = name;
    $('dialogue-line').textContent = line;
    const box = $('dialogue-actions');
    box.innerHTML = '';
    for (const a of actions) {
      const btn = document.createElement('button');
      btn.textContent = a.label;
      btn.disabled = !!a.disabled;
      btn.onclick = a.onClick;
      box.appendChild(btn);
    }
    $('dialogue-box').classList.remove('hidden');
  },
  hideDialogue() { $('dialogue-box').classList.add('hidden'); },

  // supplies: [{icon,name,qty}] — 식량/식수/자재/포탄(화물칸을 교역품과 함께 나눠 쓴다).
  // cargo: { used, cap } — 전체 화물칸 사용량(교역품+보급품 합산).
  toggleInventory(items, priceMap, supplies, cargo) {
    const panel = $('inventory-panel');
    const willShow = panel.classList.contains('hidden');
    if (willShow) {
      $('inventory-cargo').textContent = cargo ? `화물칸 ${cargo.used} / ${cargo.cap} t` : '';
      const grid = $('inventory-grid');
      const supplySlots = (supplies || []).map((s) =>
        `<div class="inv-slot inv-slot-supply">${s.icon} ${s.name}<span class="qty">x${s.qty}</span></div>`
      );
      const goodSlots = items.map((it) => {
        const price = priceMap && priceMap[it.id];
        const priceLine = price ? `<span class="inv-price">매도가 ${price.sell}/t · 총액 ${(price.sell * it.qty).toLocaleString('ko-KR')}</span>` : '';
        return `<div class="inv-slot">${it.name}<span class="qty">x${it.qty}</span>${priceLine}</div>`;
      });
      grid.innerHTML = [...supplySlots, ...goodSlots].join('');
    }
    panel.classList.toggle('hidden', !willShow);
    return willShow;
  },
  closeInventory() { $('inventory-panel').classList.add('hidden'); },
  isInventoryOpen() { return !$('inventory-panel').classList.contains('hidden'); },

  showWorldMap(v) { $('world-map-panel').classList.toggle('hidden', !v); },
  isWorldMapOpen() { return !$('world-map-panel').classList.contains('hidden'); },

  setWorldMapHeader(name, subtitle, idx, total, locked) {
    $('world-map-title').textContent = locked ? `🔒 ${name}` : name;
    $('world-map-title').classList.toggle('wm-locked', !!locked);
    $('world-map-subtitle').textContent = subtitle;
    $('world-map-page').textContent = `${idx + 1} / ${total}`;
  },

  renderWorldMapReal({ landPolygons, bounds, cities, regionBoxes, ship, locked, lockInfo, sites }) {
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
      // 국가별 대도시는 마커·글자를 한 단계 키워 지도에서도 눈에 띄게 한다.
      const rOuter = c.capital ? 10 : 7, rInner = c.capital ? 7.5 : 5;
      ctx.beginPath(); ctx.arc(px, py, rOuter, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10,8,4,0.55)'; ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, rInner, 0, Math.PI * 2);
      ctx.fillStyle = c.color || '#e6c15a'; ctx.fill();
      ctx.strokeStyle = '#f0e6d2'; ctx.lineWidth = c.capital ? 2 : 1.4; ctx.stroke();
      // 대호황(주황 발광 고리)/대폭락(파랑 발광 고리) 도시는 전체지도에서부터 눈에 띄게 —
      // 도킹하지 않고도 "저기 지금 대박이다" 하는 걸 알아채고 항로를 바꿀 수 있게 한다.
      if (c.event && c.event.active) {
        const evColor = c.event.type === 'boom' ? '#ff8a3c' : '#5fb0e8';
        ctx.save();
        ctx.shadowColor = evColor;
        ctx.shadowBlur = 9;
        ctx.beginPath(); ctx.arc(px, py, rOuter + 4, 0, Math.PI * 2);
        ctx.strokeStyle = evColor; ctx.lineWidth = 2.2; ctx.stroke();
        ctx.restore();
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(c.event.type === 'boom' ? '🔥' : '💥', px, py - rOuter - 7);
        ctx.textAlign = 'left';
      }
      ctx.font = c.capital ? 'bold 15px sans-serif' : 'bold 13px sans-serif';
      const tx = px + rOuter + 3, ty = py + (c.capital ? 6 : 5);
      ctx.fillStyle = 'rgba(6,10,14,0.85)';
      ctx.fillText(c.name, tx + 1, ty + 1);
      ctx.fillStyle = c.capital ? '#ffe6a0' : '#f6ecd4';
      ctx.fillText(c.name, tx, ty);
    }

    // 학문(고고학/지리학) 발견 지점 — 도시보다 작고 옅은 마커. 미발견은 물음표만,
    // 발견한 것은 실제 이름을 보여준다(수집 동기를 주기 위해 미발견 상태는 가려둔다).
    if (sites) {
      ctx.textAlign = 'left';
      for (const s of sites) {
        const [px, py] = wmToPx(s.x, s.z, bounds, t);
        if (px < -16 || px > w + 16 || py < -16 || py > h + 16) continue;
        ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = s.found ? 'rgba(158,224,138,0.85)' : 'rgba(160,170,180,0.55)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.font = '11px sans-serif';
        ctx.fillStyle = s.found ? '#cdeecb' : 'rgba(200,205,210,0.65)';
        ctx.fillText(`${s.icon} ${s.found ? s.name : '???'}`, px + 7, py + 4);
      }
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

    // 아직 해금되지 않은 항로 — 지도 위에 어둡게 덧씌우고 자물쇠 + 해금 조건을 크게 띄운다.
    // 지형·도시는 그 아래로 옅게 비쳐 보이게 둬서 "존재는 하지만 아직 못 가는 곳"이라는
    // 느낌을 준다.
    if (locked) {
      ctx.fillStyle = 'rgba(4,7,10,0.72)';
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 14;
      ctx.font = `${Math.round(Math.min(w, h) * 0.14)}px sans-serif`;
      ctx.fillStyle = 'rgba(230,225,210,0.92)';
      ctx.fillText('🔒', w / 2, h / 2 - 6);
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#f3d98a';
      ctx.fillText('아직 열리지 않은 항로', w / 2, h / 2 + 40);
      if (lockInfo?.rankLabel) {
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#cfe0ea';
        ctx.fillText(`해금 조건: 랭크 "${lockInfo.rankLabel}" 이상`, w / 2, h / 2 + 66);
      }
      ctx.restore();
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
