/* ==========================================================
   APEX攻略  —  apex.js
   Bin①: apex-legends  → レジェンド＋パーク
   Bin②: apex-weapons  → 武器
   ========================================================== */

// ===== JSONBin設定 =====
const API_KEY         = '$2a$10$joap43smKkXaRUqJnyLmH.WXhlFfhDqp9syZ978elHejCGT8amtQC';
const LEGEND_BIN_URL  = 'https://api.jsonbin.io/v3/b/69fd3b43250b1311c31c81df';
const WEAPON_BIN_URL  = 'https://api.jsonbin.io/v3/b/69fd3b1e250b1311c31c80c7';

const HEADERS_READ = {
  'X-Master-Key': API_KEY,
  'X-Bin-Meta': 'false'
};
const HEADERS_WRITE = {
  'Content-Type': 'application/json',
  'X-Master-Key': API_KEY,
  'X-Bin-Versioning': 'false'
};

// ===== 定数 =====
const TIER_ORDER = ['S', 'A', 'B', 'C', 'D'];
const TIER_COLORS = {
  S: '#c0392b', A: '#d4750a', B: '#b8960a',
  C: '#2e7d52', D: '#2563a8', '未分類': '#888884'
};
const CLASS_COLORS = {
  'スキャン':        '#2563a8',
  'スカーミッシャー': '#c0392b',
  'サポート':        '#2e7d52',
  'コントローラー':  '#7b3fa0',
  'アサルト':        '#d4750a'
};
const CLASS_SHORT = {
  'スキャン':        'スキャン',
  'スカーミッシャー': 'スカーミ',
  'サポート':        'サポート',
  'コントローラー':  'コント',
  'アサルト':        'アサルト'
};

// ===== 状態管理 =====
let legends         = [];
let weapons         = [];
let isEditMode      = false;
let draggedId       = null;
let draggedType     = null;
let pendingDeleteId = null;
let pendingDeleteType = null;
let activeWeaponCat = 'all';
let searchTerm      = '';

/* ==========================================================
   初期化
   ========================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  showLoading(true);
  await loadAllData();
  showLoading(false);
  setupEventListeners();
  renderAll();
});

/* ==========================================================
   JSONBin 読み込み
   ========================================================== */
async function loadAllData() {
  try {
    const [lRes, wRes] = await Promise.all([
      fetch(LEGEND_BIN_URL + '/latest', { headers: HEADERS_READ }),
      fetch(WEAPON_BIN_URL + '/latest', { headers: HEADERS_READ })
    ]);
    const lJson = await lRes.json();
    const wJson = await wRes.json();
    legends = lJson.legends ?? [];
    weapons = wJson.weapons ?? [];
  } catch (e) {
    console.error('データ読込エラー', e);
    legends = [];
    weapons = [];
  }
}

/* ==========================================================
   JSONBin 保存
   ========================================================== */
async function saveLegends() {
  try {
    const res = await fetch(LEGEND_BIN_URL, {
      method: 'PUT', headers: HEADERS_WRITE,
      body: JSON.stringify({ legends })
    });
    if (!res.ok) showToast('レジェンド保存失敗: ' + res.status, 'error');
  } catch (e) { showToast('レジェンド保存失敗', 'error'); }
}

async function saveWeapons() {
  try {
    const res = await fetch(WEAPON_BIN_URL, {
      method: 'PUT', headers: HEADERS_WRITE,
      body: JSON.stringify({ weapons })
    });
    if (!res.ok) showToast('武器保存失敗: ' + res.status, 'error');
  } catch (e) { showToast('武器保存失敗', 'error'); }
}

/* ==========================================================
   イベントリスナー
   ========================================================== */
function setupEventListeners() {

  // ビュー切り替え
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
      renderAll();
    };
  });

  // 編集モード切り替え
  document.getElementById('btn-edit-mode').onclick = () => {
    isEditMode = !isEditMode;
    const btn = document.getElementById('btn-edit-mode');
    if (isEditMode) {
      btn.classList.add('active');
      btn.innerHTML = '<i class="fas fa-lock-open"></i> 編集中';
      document.body.classList.add('edit-mode');
      document.getElementById('legend-edit-actions').style.display = 'flex';
      document.getElementById('weapon-edit-actions').style.display = 'block';
      document.getElementById('legend-unclassified').style.display = 'block';
      document.getElementById('weapon-unclassified').style.display = 'block';
      showToast('編集モードを有効にしました');
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '<i class="fas fa-edit"></i> 編集';
      document.body.classList.remove('edit-mode');
      document.getElementById('legend-edit-actions').style.display = 'none';
      document.getElementById('weapon-edit-actions').style.display = 'none';
      document.getElementById('legend-unclassified').style.display = 'none';
      document.getElementById('weapon-unclassified').style.display = 'none';
      showToast('編集モードを終了しました');
    }
    renderAll();
  };

  // レジェンド追加
  document.getElementById('btn-add-legend').onclick = () => openLegendModal();
  document.getElementById('btn-legend-modal-close').onclick = closeLegendModal;
  document.getElementById('btn-legend-cancel').onclick = closeLegendModal;
  document.getElementById('modal-legend').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-legend')) closeLegendModal();
  });
  document.getElementById('form-legend').onsubmit = (e) => {
    e.preventDefault(); handleSaveLegend();
  };

  // 武器追加
  document.getElementById('btn-add-weapon').onclick = () => openWeaponModal();
  document.getElementById('btn-weapon-modal-close').onclick = closeWeaponModal;
  document.getElementById('btn-weapon-cancel').onclick = closeWeaponModal;
  document.getElementById('modal-weapon').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-weapon')) closeWeaponModal();
  });
  document.getElementById('form-weapon').onsubmit = (e) => {
    e.preventDefault(); handleSaveWeapon();
  };

  // 詳細モーダルを閉じる
  document.getElementById('btn-detail-close').onclick = closeDetail;
  document.getElementById('modal-detail').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-detail')) closeDetail();
  });

  // 削除確認
  document.getElementById('btn-confirm-cancel').onclick = closeConfirmModal;
  document.getElementById('btn-confirm-ok').onclick = handleConfirmDelete;

  // 武器カテゴリフィルター
  document.getElementById('weapon-category-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    document.querySelectorAll('#weapon-category-filters .chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeWeaponCat = btn.dataset.category;
    renderWeapons();
  });

  // 検索
  document.getElementById('search-input').oninput = (e) => {
    searchTerm = e.target.value.toLowerCase().trim();
    renderAll();
  };

  // ESCキー
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLegendModal();
      closeWeaponModal();
      closeDetail();
      closeConfirmModal();
    }
  });
}

/* ==========================================================
   全体再描画
   ========================================================== */
function renderAll() {
  renderLegends();
  renderWeapons();
}

/* ==========================================================
   レジェンドティア表描画
   ========================================================== */
function renderLegends() {
  const container = document.getElementById('legend-tier-container');
  const pool      = document.getElementById('legend-tier-pool');
  container.innerHTML = '';
  pool.innerHTML      = '';

  let filtered = legends;
  if (searchTerm) {
    filtered = filtered.filter(l => l.name.toLowerCase().includes(searchTerm));
  }

  TIER_ORDER.forEach(tier => {
    const items = filtered.filter(l => l.tier === tier);
    const row   = document.createElement('div');
    row.className = 'tier-row';

    const label = document.createElement('div');
    label.className = `tier-label tier-color-${tier.toLowerCase()}`;
    label.textContent = tier;

    const zone = document.createElement('div');
    zone.className = 'tier-drop-zone' + (items.length === 0 ? ' empty' : '');
    zone.dataset.tier  = tier;
    zone.dataset.dtype = 'legend';

    items.forEach(l => zone.appendChild(createApexCard(l, 'legend')));
    if (isEditMode) setupDropZone(zone);

    row.appendChild(label);
    row.appendChild(zone);
    container.appendChild(row);
  });

  const unassigned = filtered.filter(l => !TIER_ORDER.includes(l.tier));
  unassigned.forEach(l => pool.appendChild(createApexCard(l, 'legend')));
  pool.dataset.tier  = '未分類';
  pool.dataset.dtype = 'legend';
  if (isEditMode) setupDropZone(pool);
}

/* ==========================================================
   武器ティア表描画
   ========================================================== */
function renderWeapons() {
  const container = document.getElementById('weapon-tier-container');
  const pool      = document.getElementById('weapon-tier-pool');
  container.innerHTML = '';
  pool.innerHTML      = '';

  let filtered = weapons;
  if (activeWeaponCat !== 'all') {
    filtered = filtered.filter(w => w.category === activeWeaponCat);
  }
  if (searchTerm) {
    filtered = filtered.filter(w => w.name.toLowerCase().includes(searchTerm));
  }

  TIER_ORDER.forEach(tier => {
    const items = filtered.filter(w => w.tier === tier);
    const row   = document.createElement('div');
    row.className = 'tier-row';

    const label = document.createElement('div');
    label.className = `tier-label tier-color-${tier.toLowerCase()}`;
    label.textContent = tier;

    const zone = document.createElement('div');
    zone.className = 'tier-drop-zone' + (items.length === 0 ? ' empty' : '');
    zone.dataset.tier  = tier;
    zone.dataset.dtype = 'weapon';

    items.forEach(w => zone.appendChild(createApexCard(w, 'weapon')));
    if (isEditMode) setupDropZone(zone);

    row.appendChild(label);
    row.appendChild(zone);
    container.appendChild(row);
  });

  const unassigned = filtered.filter(w => !TIER_ORDER.includes(w.tier));
  unassigned.forEach(w => pool.appendChild(createApexCard(w, 'weapon')));
  pool.dataset.tier  = '未分類';
  pool.dataset.dtype = 'weapon';
  if (isEditMode) setupDropZone(pool);
}

/* ==========================================================
   カード生成
   ========================================================== */
function createApexCard(item, type) {
  const card = document.createElement('div');
  card.className = 'apex-card';
  card.dataset.id = item.id;

  let badgeHtml = '';
  if (type === 'legend' && item.legendClass) {
    const color = CLASS_COLORS[item.legendClass] || '#888';
    const short = CLASS_SHORT[item.legendClass]  || item.legendClass;
    badgeHtml = `<span class="apex-class-badge class-${item.legendClass}" style="background:${color}">${escHtml(short)}</span>`;
  }
  if (type === 'weapon' && item.category) {
    const catShort = {
      'アサルトライフル': 'AR', 'サブマシンガン': 'SMG', '軽機関銃': 'LMG',
      'スナイパー': 'SR', 'ショットガン': 'SG', 'ピストル': 'PIS', 'マークスマン': 'MM'
    }[item.category] || item.category;
    badgeHtml = `<span class="apex-weapon-badge">${escHtml(catShort)}</span>`;
  }

  card.innerHTML = `
    <div class="apex-card-img-wrap">
      ${item.image_url
        ? `<img src="${escHtml(item.image_url)}" alt="${escHtml(item.name)}"
             onerror="this.parentElement.innerHTML='<div class=\\'apex-card-img-placeholder\\'><i class=\\'fas fa-user-astronaut\\'></i></div>'">`
        : `<div class="apex-card-img-placeholder">
             <i class="fas ${type === 'weapon' ? 'fa-gun' : 'fa-user-astronaut'}"></i>
           </div>`}
    </div>
    ${badgeHtml}
    <div class="apex-card-name">${escHtml(item.name)}</div>
    ${isEditMode
      ? `<button class="card-delete-btn" title="削除"><i class="fas fa-times"></i></button>`
      : ''}
  `;

  card.addEventListener('click', (e) => {
    if (e.target.closest('.card-delete-btn')) return;
    if (isEditMode) {
      if (type === 'legend') openLegendModal(item);
      else                   openWeaponModal(item);
    } else {
      if (type === 'legend') showLegendDetail(item);
      else                   showWeaponDetail(item);
    }
  });

  const delBtn = card.querySelector('.card-delete-btn');
  if (delBtn) {
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDelete(item.id, item.name, type);
    });
  }

  if (isEditMode) {
    card.draggable = true;
    card.addEventListener('dragstart', (e) => {
      draggedId   = item.id;
      draggedType = type;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedId   = null;
      draggedType = null;
    });
  }

  return card;
}

/* ==========================================================
   ドロップゾーン
   ========================================================== */
function setupDropZone(el) {
  el.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.classList.add('drag-over');
  });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', async (e) => {
    e.preventDefault();
    el.classList.remove('drag-over');
    if (!draggedId || !draggedType) return;

    const newTier = el.dataset.tier;
    const dtype   = el.dataset.dtype;
    if (dtype !== draggedType) return;

    if (draggedType === 'legend') {
      const item = legends.find(l => l.id === draggedId);
      if (item && item.tier !== newTier) {
        item.tier = newTier;
        await saveLegends();
        showToast(`ティアを「${newTier}」に変更しました`, 'success');
        renderLegends();
      }
    } else {
      const item = weapons.find(w => w.id === draggedId);
      if (item && item.tier !== newTier) {
        item.tier = newTier;
        await saveWeapons();
        showToast(`ティアを「${newTier}」に変更しました`, 'success');
        renderWeapons();
      }
    }
  });
}

/* ==========================================================
   レジェンドモーダル
   ========================================================== */
function openLegendModal(item = null) {
  document.getElementById('modal-legend-title').textContent = item ? 'レジェンド編集' : 'レジェンド追加';
  document.getElementById('legend-id').value          = item?.id          || '';
  document.getElementById('legend-name').value        = item?.name        || '';
  document.getElementById('legend-tier').value        = item?.tier        || '未分類';
  document.getElementById('legend-class').value       = item?.legendClass || 'スカーミッシャー';
  document.getElementById('legend-image').value       = item?.image_url   || '';
  document.getElementById('legend-description').value = item?.description || '';
  document.getElementById('legend-note').value        = item?.note        || '';

  const p = item?.perks || {};
  document.getElementById('perk-lv2-1-name').value   = p.lv2_1?.name   || '';
  document.getElementById('perk-lv2-1-effect').value = p.lv2_1?.effect || '';
  document.getElementById('perk-lv2-2-name').value   = p.lv2_2?.name   || '';
  document.getElementById('perk-lv2-2-effect').value = p.lv2_2?.effect || '';
  document.getElementById('perk-lv3-1-name').value   = p.lv3_1?.name   || '';
  document.getElementById('perk-lv3-1-effect').value = p.lv3_1?.effect || '';
  document.getElementById('perk-lv3-2-name').value   = p.lv3_2?.name   || '';
  document.getElementById('perk-lv3-2-effect').value = p.lv3_2?.effect || '';

  document.getElementById('modal-legend').classList.add('is-open');
}

function closeLegendModal() {
  document.getElementById('modal-legend').classList.remove('is-open');
}

async function handleSaveLegend() {
  const id   = document.getElementById('legend-id').value.trim();
  const name = document.getElementById('legend-name').value.trim();
  if (!name) { showToast('名前は必須です', 'error'); return; }

  const newData = {
    id:          id || generateId(),
    name,
    tier:        document.getElementById('legend-tier').value,
    legendClass: document.getElementById('legend-class').value,
    image_url:   document.getElementById('legend-image').value.trim(),
    description: document.getElementById('legend-description').value.trim(),
    note:        document.getElementById('legend-note').value.trim(),
    perks: {
      lv2_1: {
        name:   document.getElementById('perk-lv2-1-name').value.trim(),
        effect: document.getElementById('perk-lv2-1-effect').value.trim()
      },
      lv2_2: {
        name:   document.getElementById('perk-lv2-2-name').value.trim(),
        effect: document.getElementById('perk-lv2-2-effect').value.trim()
      },
      lv3_1: {
        name:   document.getElementById('perk-lv3-1-name').value.trim(),
        effect: document.getElementById('perk-lv3-1-effect').value.trim()
      },
      lv3_2: {
        name:   document.getElementById('perk-lv3-2-name').value.trim(),
        effect: document.getElementById('perk-lv3-2-effect').value.trim()
      }
    }
  };

  const idx = legends.findIndex(l => l.id === id);
  if (idx !== -1) legends[idx] = newData;
  else            legends.push(newData);

  await saveLegends();
  showToast(id ? 'レジェンドを更新しました' : 'レジェンドを追加しました', 'success');
  closeLegendModal();
  renderLegends();
}

/* ==========================================================
   武器モーダル
   ========================================================== */
function openWeaponModal(item = null) {
  document.getElementById('modal-weapon-title').textContent = item ? '武器編集' : '武器追加';
  document.getElementById('weapon-id').value       = item?.id       || '';
  document.getElementById('weapon-name').value     = item?.name     || '';
  document.getElementById('weapon-tier').value     = item?.tier     || '未分類';
  document.getElementById('weapon-category').value = item?.category || 'アサルトライフル';
  document.getElementById('weapon-image').value    = item?.image_url|| '';
  document.getElementById('weapon-note').value     = item?.note     || '';
  document.getElementById('modal-weapon').classList.add('is-open');
}

function closeWeaponModal() {
  document.getElementById('modal-weapon').classList.remove('is-open');
}

async function handleSaveWeapon() {
  const id   = document.getElementById('weapon-id').value.trim();
  const name = document.getElementById('weapon-name').value.trim();
  if (!name) { showToast('名前は必須です', 'error'); return; }

  const newData = {
    id:       id || generateId(),
    name,
    tier:     document.getElementById('weapon-tier').value,
    category: document.getElementById('weapon-category').value,
    image_url:document.getElementById('weapon-image').value.trim(),
    note:     document.getElementById('weapon-note').value.trim()
  };

  const idx = weapons.findIndex(w => w.id === id);
  if (idx !== -1) weapons[idx] = newData;
  else            weapons.push(newData);

  await saveWeapons();
  showToast(id ? '武器を更新しました' : '武器を追加しました', 'success');
  closeWeaponModal();
  renderWeapons();
}

/* ==========================================================
   詳細表示
   ========================================================== */
function showLegendDetail(item) {
  document.getElementById('detail-title').textContent = item.name;
  const classColor = CLASS_COLORS[item.legendClass] || '#888';
  const p = item.perks || {};

  const perkHtml = (perk, lv, num) => {
    if (!perk?.name) return '';
    return `
      <div class="apex-perk-card">
        <div class="apex-perk-card-header">
          <span class="apex-lv-badge ${lv}">${lv === 'lv2' ? 'LV2' : 'LV3'}</span>
          <span class="apex-perk-card-name">${escHtml(perk.name)}</span>
        </div>
        <div class="apex-perk-card-effect">${escHtml(perk.effect || '')}</div>
      </div>`;
  };

  document.getElementById('detail-content').innerHTML = `
    ${item.image_url
      ? `<div class="detail-img-wrap"><img src="${escHtml(item.image_url)}" alt="${escHtml(item.name)}"></div>`
      : ''}
    <div style="padding:0 1.3rem 1.3rem;">
      <span class="apex-detail-class" style="background:${classColor}">${escHtml(item.legendClass || '')}</span>
      <div class="detail-meta-row">
        <div class="detail-tier-badge" style="background:${TIER_COLORS[item.tier] || '#888'}">${escHtml(item.tier || '未')}</div>
        <div class="detail-name">${escHtml(item.name)}</div>
      </div>
      ${item.description ? `<p class="detail-desc">${escHtml(item.description)}</p>` : ''}

      ${(p.lv2_1?.name || p.lv2_2?.name || p.lv3_1?.name || p.lv3_2?.name) ? `
        <div class="apex-detail-section-title">パーク</div>
        <div class="apex-perk-cards">
          ${perkHtml(p.lv2_1, 'lv2', 1)}
          ${perkHtml(p.lv2_2, 'lv2', 2)}
          ${perkHtml(p.lv3_1, 'lv3', 1)}
          ${perkHtml(p.lv3_2, 'lv3', 2)}
        </div>
      ` : ''}

      ${item.note ? `
        <div class="apex-detail-section-title">補足</div>
        <div class="apex-note-box">${escHtml(item.note)}</div>
      ` : ''}

      ${isEditMode ? `
        <div class="detail-footer-btns">
          <button class="btn-primary" id="btn-detail-edit"><i class="fas fa-edit"></i> 編集する</button>
          <button class="btn-danger"  id="btn-detail-del"><i class="fas fa-trash"></i> 削除</button>
        </div>` : ''}
    </div>
  `;

  const editBtn = document.getElementById('btn-detail-edit');
  const delBtn  = document.getElementById('btn-detail-del');
  if (editBtn) editBtn.onclick = () => { closeDetail(); openLegendModal(item); };
  if (delBtn)  delBtn.onclick  = () => { closeDetail(); confirmDelete(item.id, item.name, 'legend'); };

  document.getElementById('modal-detail').classList.add('is-open');
}

function showWeaponDetail(item) {
  document.getElementById('detail-title').textContent = item.name;

  document.getElementById('detail-content').innerHTML = `
    ${item.image_url
      ? `<div class="detail-img-wrap"><img src="${escHtml(item.image_url)}" alt="${escHtml(item.name)}"></div>`
      : ''}
    <div style="padding:0 1.3rem 1.3rem;">
      <span class="apex-detail-class" style="background:var(--ink-2)">${escHtml(item.category || '')}</span>
      <div class="detail-meta-row">
        <div class="detail-tier-badge" style="background:${TIER_COLORS[item.tier] || '#888'}">${escHtml(item.tier || '未')}</div>
        <div class="detail-name">${escHtml(item.name)}</div>
      </div>

      ${item.note ? `
        <div class="apex-detail-section-title">補足</div>
        <div class="apex-note-box">${escHtml(item.note)}</div>
      ` : ''}

      ${isEditMode ? `
        <div class="detail-footer-btns">
          <button class="btn-primary" id="btn-detail-edit"><i class="fas fa-edit"></i> 編集する</button>
          <button class="btn-danger"  id="btn-detail-del"><i class="fas fa-trash"></i> 削除</button>
        </div>` : ''}
    </div>
  `;

  const editBtn = document.getElementById('btn-detail-edit');
  const delBtn  = document.getElementById('btn-detail-del');
  if (editBtn) editBtn.onclick = () => { closeDetail(); openWeaponModal(item); };
  if (delBtn)  delBtn.onclick  = () => { closeDetail(); confirmDelete(item.id, item.name, 'weapon'); };

  document.getElementById('modal-detail').classList.add('is-open');
}

function closeDetail() {
  document.getElementById('modal-detail').classList.remove('is-open');
}

/* ==========================================================
   削除
   ========================================================== */
function confirmDelete(id, name, type) {
  pendingDeleteId   = id;
  pendingDeleteType = type;
  document.getElementById('confirm-message').textContent =
    `「${name}」を削除しますか？この操作は元に戻せません。`;
  document.getElementById('modal-confirm').classList.add('is-open');
}

function closeConfirmModal() {
  pendingDeleteId   = null;
  pendingDeleteType = null;
  document.getElementById('modal-confirm').classList.remove('is-open');
}

async function handleConfirmDelete() {
  if (!pendingDeleteId) return;
  if (pendingDeleteType === 'legend') {
    legends = legends.filter(l => l.id !== pendingDeleteId);
    await saveLegends();
    renderLegends();
  } else {
    weapons = weapons.filter(w => w.id !== pendingDeleteId);
    await saveWeapons();
    renderWeapons();
  }
  closeConfirmModal();
  showToast('削除しました', 'success');
}

/* ==========================================================
   ユーティリティ
   ========================================================== */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showLoading(visible) {
  ['legend-tier-container', 'weapon-tier-container'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = visible
      ? '<div style="padding:3rem;color:var(--ink-3);text-align:center;font-size:0.85rem;"><i class="fas fa-spinner fa-spin"></i> 読み込み中...</div>'
      : '';
  });
}

let toastTimer = null;
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent   = message;
  toast.className     = type ? `toast ${type}` : 'toast';
  toast.style.display = 'block';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3000);
}