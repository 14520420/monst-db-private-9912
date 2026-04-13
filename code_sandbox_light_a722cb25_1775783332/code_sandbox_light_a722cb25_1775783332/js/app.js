/* ==========================================================
   おすすめ商品・ティア表  —  app.js  (完全版)
   ========================================================== */

// ===== 定数 =====
const TIER_ORDER = ['S', 'A', 'B', 'C', 'D'];
const TIER_COLORS = { S: '#FF4444', A: '#FF8C00', B: '#FFD700', C: '#4CAF50', D: '#2196F3', '未分類': '#777799' };
const STORAGE_KEY = 'recommended_products_v2';

// ===== 状態管理 =====
let allProducts   = [];
let isEditMode    = false;
let currentView   = 'tier';       // 'tier' | 'products'
let activeCat     = 'all';
let searchTerm    = '';
let dragSrcId     = null;         // D&D用
let pendingDeleteId = null;       // 削除確認用

/* ==========================================================
   初期化
   ========================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  setupEventListeners();
  renderAll();
});

/* ==========================================================
   ストレージ
   ========================================================== */
const BIN_ID  = '69dc5298856a682189292896';
const API_KEY = '$2a$10$dsM39E4/AjtLgFPbVrJtXO3BneHVnIp3gyqTdgmT.cFyUBaG17qRS';
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

async function loadData() {
  try {
    const res  = await fetch(API_URL + '/latest', {
      headers: { 'X-Master-Key': API_KEY }
    });
    const json = await res.json();
    allProducts = json.record?.products ?? [];
  } catch (e) {
    console.error('データ読込エラー', e);
    allProducts = [];
  }
}

async function saveData() {
  try {
    await fetch(API_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': API_KEY
      },
      body: JSON.stringify({ products: allProducts })
    });
  } catch (e) {
    console.error('データ保存エラー', e);
    showToast('保存に失敗しました', 'error');
  }
}

// 初回起動時のサンプルデータ
function getSampleData() {
  return [
    {
      id: 'sample1',
      name: 'サンプル商品A',
      description: 'これはサンプルの商品です。編集モードで商品を追加・編集できます。',
      price: '¥3,980',
      category: 'ガジェット',
      tier: 'S',
      tags: ['おすすめ', '人気'],
      image_url: '',
      link: '',
      sort_order: 0
    },
    {
      id: 'sample2',
      name: 'サンプル商品B',
      description: 'コスパが良い商品の例です。',
      price: '¥1,280',
      category: '日用品',
      tier: 'B',
      tags: ['コスパ良好'],
      image_url: '',
      link: '',
      sort_order: 1
    }
  ];
}

/* ==========================================================
   イベントリスナー設定
   ========================================================== */
function setupEventListeners() {

  // ----- ビュー切り替え -----
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(`view-${currentView}`).classList.add('active');
    });
  });

  // ----- 編集モード切り替え -----
  document.getElementById('btn-edit-mode').addEventListener('click', toggleEditMode);

  // ----- ティア表：商品追加ボタン -----
  document.getElementById('btn-add-tier-item').addEventListener('click', () => openProductModal(null));

  // ----- 商品一覧：商品追加ボタン -----
  document.getElementById('btn-add-product').addEventListener('click', () => openProductModal(null));

  // ----- モーダルを閉じる -----
  document.getElementById('btn-modal-close').addEventListener('click', closeProductModal);
  document.getElementById('btn-cancel-modal').addEventListener('click', closeProductModal);

  // モーダル背景クリックで閉じる
  document.getElementById('modal-product').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-product')) closeProductModal();
  });
  document.getElementById('modal-detail').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-detail')) closeDetailModal();
  });

  // ----- 商品フォーム保存 -----
  document.getElementById('form-product').addEventListener('submit', (e) => {
    e.preventDefault();
    handleSaveProduct();
  });

  // ----- 詳細モーダルを閉じる -----
  document.getElementById('btn-detail-close').addEventListener('click', closeDetailModal);

  // ----- 削除確認ダイアログ -----
  document.getElementById('btn-confirm-cancel').addEventListener('click', closeConfirmModal);
  document.getElementById('btn-confirm-ok').addEventListener('click', handleConfirmDelete);

  // ----- 検索 -----
  document.getElementById('product-search').addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase().trim();
    renderProductGrid();
  });

  // ----- 画像URLプレビュー -----
  document.getElementById('field-image-url').addEventListener('input', (e) => {
    const url = e.target.value.trim();
    const wrap = document.getElementById('image-preview');
    const img  = document.getElementById('preview-img');
    if (url) {
      img.src = url;
      wrap.style.display = 'block';
      img.onerror = () => { wrap.style.display = 'none'; };
    } else {
      wrap.style.display = 'none';
    }
  });

  // ----- ティアセレクター -----
  document.querySelectorAll('.tier-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ----- ESCキーでモーダルを閉じる -----
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProductModal();
      closeDetailModal();
      closeConfirmModal();
    }
  });
}

/* ==========================================================
   編集モード切り替え
   ========================================================== */
function toggleEditMode() {
  isEditMode = !isEditMode;
  const btn = document.getElementById('btn-edit-mode');

  if (isEditMode) {
    btn.classList.add('active');
    btn.innerHTML = '<i class="fas fa-lock-open"></i> 編集中';
    document.body.classList.add('edit-mode');
    document.getElementById('tier-edit-actions').style.display = 'flex';
    document.getElementById('product-edit-actions').style.display = 'block';
    document.getElementById('tier-unassigned').style.display = 'block';
    showToast('編集モードを有効にしました');
  } else {
    btn.classList.remove('active');
    btn.innerHTML = '<i class="fas fa-edit"></i> 編集';
    document.body.classList.remove('edit-mode');
    document.getElementById('tier-edit-actions').style.display = 'none';
    document.getElementById('product-edit-actions').style.display = 'none';
    document.getElementById('tier-unassigned').style.display = 'none';
    showToast('編集モードを終了しました');
  }
  renderAll();
}

/* ==========================================================
   全体再描画
   ========================================================== */
function renderAll() {
  renderTierBoard();
  renderProductGrid();
  renderCategoryFilters();
}

/* ==========================================================
   ティア表
   ========================================================== */
function renderTierBoard() {
  const board = document.getElementById('tier-board');
  board.innerHTML = '';

  TIER_ORDER.forEach(tier => {
    const items = allProducts.filter(p => p.tier === tier);
    const row = document.createElement('div');
    row.className = 'tier-row';

    // ラベル
    const label = document.createElement('div');
    label.className = `tier-label tier-color-${tier.toLowerCase()}`;
    label.textContent = tier;

    // ドロップゾーン
    const zone = document.createElement('div');
    zone.className = 'tier-drop-zone' + (items.length === 0 ? ' empty' : '');
    zone.dataset.tier = tier;

    items.forEach(p => zone.appendChild(createTierCard(p)));

    if (isEditMode) setupDropZone(zone);

    row.appendChild(label);
    row.appendChild(zone);
    board.appendChild(row);
  });

  // 未分類エリア
  const unassigned = allProducts.filter(p => !TIER_ORDER.includes(p.tier));
  const unassignedZone = document.getElementById('unassigned-items');
  unassignedZone.innerHTML = '';
  unassigned.forEach(p => unassignedZone.appendChild(createTierCard(p)));
  if (isEditMode) {
    unassignedZone.classList.add('tier-drop-zone');
    setupDropZone(unassignedZone);
  } else {
    unassignedZone.classList.remove('tier-drop-zone');
  }
}

function createTierCard(product) {
  const card = document.createElement('div');
  card.className = 'tier-card';
  card.dataset.id = product.id;

  card.innerHTML = `
    <div class="tier-card-img-container">
      ${product.image_url
        ? `<img src="${escHtml(product.image_url)}" class="tier-card-img" alt="${escHtml(product.name)}" onerror="this.parentElement.innerHTML='<div class=\\'tier-card-img-placeholder\\'><i class=\\'fas fa-image\\'></i></div>'">`
        : `<div class="tier-card-img-placeholder"><i class="fas fa-image"></i></div>`}
    </div>
    <div class="tier-card-name">${escHtml(product.name)}</div>
    ${isEditMode ? `<button class="card-delete-btn" title="削除" data-id="${product.id}"><i class="fas fa-times"></i></button>` : ''}
  `;

  // クリックで詳細 or 編集
  card.addEventListener('click', (e) => {
    if (e.target.closest('.card-delete-btn')) return; // 削除ボタンは別処理
    if (isEditMode) {
      openProductModal(product);
    } else {
      openDetailModal(product);
    }
  });

  // 削除ボタン
  const delBtn = card.querySelector('.card-delete-btn');
  if (delBtn) {
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDelete(product.id, product.name);
    });
  }

  // ドラッグ設定（編集モードのみ）
  if (isEditMode) {
    card.draggable = true;
    card.addEventListener('dragstart', (e) => {
      dragSrcId = product.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      dragSrcId = null;
    });
  }

  return card;
}

function setupDropZone(zone) {
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (!dragSrcId) return;

    const newTier = zone.dataset.tier;
    const product = allProducts.find(p => p.id === dragSrcId);
    if (product && product.tier !== newTier) {
      product.tier = newTier;
      saveData();
      renderTierBoard();
      showToast(`ティアを「${newTier}」に変更しました`);
    }
  });
}

/* ==========================================================
   商品グリッド
   ========================================================== */
function renderProductGrid() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';

  let filtered = allProducts.slice();

  // カテゴリフィルター
  if (activeCat !== 'all') {
    filtered = filtered.filter(p => p.category === activeCat);
  }

  // 検索
  if (searchTerm) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchTerm) ||
      (p.description || '').toLowerCase().includes(searchTerm) ||
      (p.tags || []).some(t => t.toLowerCase().includes(searchTerm))
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-box-open"></i>
        <p>${searchTerm ? '検索結果がありません' : '商品がまだありません。編集モードで追加してください。'}</p>
      </div>`;
    return;
  }

  filtered.forEach(p => grid.appendChild(createProductCard(p)));
}

function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';

  const tagsHtml = (product.tags || [])
    .map(t => `<span class="tag">${escHtml(t)}</span>`)
    .join('');

  const tierColor = TIER_COLORS[product.tier] || TIER_COLORS['未分類'];

  card.innerHTML = `
    <div class="product-card-actions">
      <button class="card-action-btn edit" title="編集" data-id="${product.id}"><i class="fas fa-edit"></i></button>
      <button class="card-action-btn delete" title="削除" data-id="${product.id}"><i class="fas fa-trash"></i></button>
    </div>
    ${product.image_url
      ? `<img src="${escHtml(product.image_url)}" class="product-card-img" alt="${escHtml(product.name)}" onerror="this.className='product-card-img-placeholder';this.outerHTML='<div class=\\'product-card-img-placeholder\\'><i class=\\'fas fa-image\\'></i></div>'">`
      : `<div class="product-card-img-placeholder"><i class="fas fa-box-open"></i></div>`}
    <div class="product-card-body">
      <div class="product-card-tier" style="background:${tierColor}">${escHtml(product.tier)}</div>
      <div class="product-card-name">${escHtml(product.name)}</div>
      <div class="product-card-desc">${escHtml(product.description || '')}</div>
      <div class="product-card-meta">
        <span class="product-card-price">${escHtml(product.price || '')}</span>
        ${product.category ? `<span class="product-card-category">${escHtml(product.category)}</span>` : ''}
      </div>
      ${tagsHtml ? `<div class="product-card-tags">${tagsHtml}</div>` : ''}
    </div>
  `;

  // カードクリック（詳細 or 編集）
  card.addEventListener('click', (e) => {
    if (e.target.closest('.card-action-btn')) return;
    if (isEditMode) {
      openProductModal(product);
    } else {
      openDetailModal(product);
    }
  });

  // 編集・削除ボタン
  card.querySelector('.card-action-btn.edit').addEventListener('click', (e) => {
    e.stopPropagation();
    openProductModal(product);
  });
  card.querySelector('.card-action-btn.delete').addEventListener('click', (e) => {
    e.stopPropagation();
    confirmDelete(product.id, product.name);
  });

  return card;
}

/* ==========================================================
   カテゴリフィルター
   ========================================================== */
function renderCategoryFilters() {
  const container = document.getElementById('category-filters');
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))].sort();

  container.innerHTML = `<button class="chip ${activeCat === 'all' ? 'active' : ''}" data-cat="all">すべて</button>`;

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `chip ${activeCat === cat ? 'active' : ''}`;
    btn.dataset.cat = cat;
    btn.textContent = cat;
    container.appendChild(btn);
  });

  container.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.dataset.cat;
      renderProductGrid();
    });
  });
}

/* ==========================================================
   商品追加・編集モーダル
   ========================================================== */
function openProductModal(product = null) {
  const modal = document.getElementById('modal-product');
  modal.classList.add('is-open');
  document.getElementById('modal-title').textContent = product ? '商品を編集' : '商品を追加';

  // フォームリセット
  document.getElementById('form-product').reset();
  document.getElementById('image-preview').style.display = 'none';

  // ティアボタンリセット
  document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('active'));

  if (product) {
    // 編集時
    document.getElementById('field-id').value          = product.id;
    document.getElementById('field-name').value        = product.name || '';
    document.getElementById('field-description').value = product.description || '';
    document.getElementById('field-price').value       = product.price || '';
    document.getElementById('field-category').value    = product.category || '';
    document.getElementById('field-image-url').value   = product.image_url || '';
    document.getElementById('field-link').value        = product.link || '';
    document.getElementById('field-tags').value        = (product.tags || []).join(', ');

    const tierToSelect = product.tier || '未分類';
    const tierBtn = document.querySelector(`.tier-btn[data-tier="${tierToSelect}"]`);
    if (tierBtn) tierBtn.classList.add('active');

    // 画像プレビュー
    if (product.image_url) {
      document.getElementById('preview-img').src = product.image_url;
      document.getElementById('image-preview').style.display = 'block';
    }
  } else {
    // 新規
    document.getElementById('field-id').value = '';
    const defaultTierBtn = document.querySelector('.tier-btn[data-tier="未分類"]');
    if (defaultTierBtn) defaultTierBtn.classList.add('active');
  }

}

function closeProductModal() {
  document.getElementById('modal-product').classList.remove('is-open');
}

function handleSaveProduct() {
  const id   = document.getElementById('field-id').value.trim();
  const name = document.getElementById('field-name').value.trim();

  if (!name) {
    showToast('商品名は必須です', 'error');
    document.getElementById('field-name').focus();
    return;
  }

  const selectedTierBtn = document.querySelector('.tier-btn.active');
  const tier = selectedTierBtn ? selectedTierBtn.dataset.tier : '未分類';

  const tagsRaw = document.getElementById('field-tags').value;
  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

  const productData = {
    id:          id || generateId(),
    name:        name,
    description: document.getElementById('field-description').value.trim(),
    price:       document.getElementById('field-price').value.trim(),
    category:    document.getElementById('field-category').value.trim(),
    image_url:   document.getElementById('field-image-url').value.trim(),
    link:        document.getElementById('field-link').value.trim(),
    tier:        tier,
    tags:        tags,
    sort_order:  Date.now()
  };

  if (id) {
    // 更新
    const idx = allProducts.findIndex(p => p.id === id);
    if (idx !== -1) {
      allProducts[idx] = productData;
      showToast('商品を更新しました', 'success');
    }
  } else {
    // 新規追加
    allProducts.push(productData);
    showToast('商品を追加しました', 'success');
  }

  saveData();
  renderAll();
  closeProductModal();
}

/* ==========================================================
   商品詳細モーダル
   ========================================================== */
function openDetailModal(product) {
  const modal   = document.getElementById('modal-detail');
  const content = document.getElementById('detail-content');
  document.getElementById('detail-title').textContent = product.name;

  const tierColor = TIER_COLORS[product.tier] || TIER_COLORS['未分類'];
  const tagsHtml  = (product.tags || [])
    .map(t => `<span class="tag">${escHtml(t)}</span>`)
    .join('');

  content.innerHTML = `
    ${product.image_url
      ? `<div class="detail-img-wrap"><img src="${escHtml(product.image_url)}" alt="${escHtml(product.name)}" onerror="this.parentElement.style.display='none'"></div>`
      : ''}
    <div class="detail-meta-row">
      <div class="detail-tier-badge" style="background:${tierColor}">${escHtml(product.tier)}</div>
      <div class="detail-name">${escHtml(product.name)}</div>
    </div>
    ${product.price ? `<div class="detail-price">${escHtml(product.price)}</div>` : ''}
    ${product.description ? `<p class="detail-desc">${escHtml(product.description).replace(/\n/g, '<br>')}</p>` : ''}
    ${tagsHtml ? `<div class="detail-tags">${tagsHtml}</div>` : ''}
    ${product.link ? `<a href="${escHtml(product.link)}" target="_blank" rel="noopener noreferrer" class="detail-link"><i class="fas fa-external-link-alt"></i> 購入ページを開く</a>` : ''}
    <div class="detail-footer-btns">
      ${isEditMode
        ? `<button class="btn-primary" id="btn-detail-edit"><i class="fas fa-edit"></i> 編集する</button>
           <button class="btn-danger"  id="btn-detail-delete"><i class="fas fa-trash"></i> 削除</button>`
        : ''}
    </div>
  `;

  // 編集・削除ボタン（編集モード時のみ）
  const editBtn = content.querySelector('#btn-detail-edit');
  const delBtn  = content.querySelector('#btn-detail-delete');
  if (editBtn) editBtn.addEventListener('click', () => { closeDetailModal(); openProductModal(product); });
  if (delBtn)  delBtn.addEventListener('click',  () => { closeDetailModal(); confirmDelete(product.id, product.name); });

  modal.classList.add('is-open');
}

function closeDetailModal() {
  document.getElementById('modal-detail').classList.remove('is-open');
}

/* ==========================================================
   削除確認ダイアログ
   ========================================================== */
function confirmDelete(id, name) {
  pendingDeleteId = id;
  document.getElementById('confirm-message').textContent = `「${name}」を削除しますか？この操作は元に戻せません。`;
  document.getElementById('modal-confirm').classList.add('is-open');
}

function closeConfirmModal() {
  pendingDeleteId = null;
  document.getElementById('modal-confirm').classList.remove('is-open');
}

function handleConfirmDelete() {
  if (!pendingDeleteId) return;
  allProducts = allProducts.filter(p => p.id !== pendingDeleteId);
  saveData();
  renderAll();
  closeConfirmModal();
  showToast('商品を削除しました', 'success');
}

/* ==========================================================
   ユーティリティ
   ========================================================== */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// XSS対策
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// トースト通知（type: 'success' | 'error' | '' ）
let toastTimer = null;
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast${type ? ' ' + type : ''}`;
  toast.style.display = 'block';

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.display = 'none';
    toast.className = 'toast';
  }, 3000);
}