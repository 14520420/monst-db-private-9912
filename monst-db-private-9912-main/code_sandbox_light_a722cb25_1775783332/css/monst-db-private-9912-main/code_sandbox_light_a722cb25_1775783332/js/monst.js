/* ==========================================================
   モンスト攻略  —  monst.js  (完全版)
   Bin①: monst-characters  → 全体キャラティア表
   Bin②: monst-quests      → クエスト＋適正キャラ
   ========================================================== */

// ===== JSONBin設定 =====
const API_KEY       = '$2a$10$joap43smKkXaRUqJnyLmH.WXhlFfhDqp9syZ978elHejCGT8amtQC';
const CHAR_BIN_URL  = 'https://api.jsonbin.io/v3/b/69dd8cfd856a6821892edf4a';
const QUEST_BIN_URL = 'https://api.jsonbin.io/v3/b/69dd8d5536566621a8adfdf0';

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

const FORM_COLORS = {
  '進化':     '#2563a8',
  '神化':     '#7b3fa0',
  '獣神化':   '#c0392b',
  '獣神化・改':'#d4750a',
  '真獣神化': '#2e7d52'
};

const CATEGORIES = {
  character: ['火属性', '水属性', '木属性', '光属性', '闇属性'],
  quest:     ['黎絶', '轟絶', '爆絶', '超絶', '超究極', '天魔(試練)', '天魔(空中庭園)', '禁忌']
};

// ===== 状態管理 =====
let characters     = [];
let quests         = [];
let isEditMode     = false;
let draggedId      = null;
let currentQuestId = null;
let activeCat      = 'all';
let pendingDeleteId= null;
let pendingDeleteType = null;
let searchTerm     = '';
let selectedForm   = '';

/* ==========================================================
   初期化
   ========================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  showLoading(true);
  await loadAllData();
  showLoading(false);
  setupEventListeners();
  render();
});

/* ==========================================================
   JSONBin 読み込み
   ========================================================== */
async function loadAllData() {
  try {
    const [cRes, qRes] = await Promise.all([
      fetch(CHAR_BIN_URL  + '/latest', { headers: HEADERS_READ }),
      fetch(QUEST_BIN_URL + '/latest', { headers: HEADERS_READ })
    ]);
    const cJson = await cRes.json();
    const qJson = await qRes.json();
    characters = cJson.characters ?? [];
    quests     = qJson.quests     ?? [];
  } catch (e) {
    console.error('データ読込エラー', e);
    characters = [];
    quests     = [];
  }
}

/* ==========================================================
   JSONBin 保存
   ========================================================== */
async function saveCharacters() {
  try {
    const res = await fetch(CHAR_BIN_URL, {
      method: 'PUT',
      headers: HEADERS_WRITE,
      body: JSON.stringify({ characters })
    });
    if (!res.ok) showToast('キャラ保存失敗: ' + res.status, 'error');
  } catch (e) {
    showToast('キャラ保存失敗', 'error');
  }
}

async function saveQuests() {
  try {
    const res = await fetch(QUEST_BIN_URL, {
      method: 'PUT',
      headers: HEADERS_WRITE,
      body: JSON.stringify({ quests })
    });
    if (!res.ok) showToast('クエスト保存失敗: ' + res.status, 'error');
  } catch (e) {
    showToast('クエスト保存失敗', 'error');
  }
}

/* ==========================================================
   イベントリスナー
   ========================================================== */
function setupEventListeners() {

  // ビュー切り替え
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
      currentQuestId = null;
      document.getElementById('btn-back-to-all').style.display = 'none';
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
      render();
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
      document.getElementById('tier-edit-actions').style.display  = 'flex';
      document.getElementById('quest-edit-actions').style.display = 'block';
      document.getElementById('unclassified-container').style.display = 'block';
      showToast('編集モードを有効にしました');
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '<i class="fas fa-edit"></i> 編集';
      document.body.classList.remove('edit-mode');
      document.getElementById('tier-edit-actions').style.display  = 'none';
      document.getElementById('quest-edit-actions').style.display = 'none';
      document.getElementById('unclassified-container').style.display = 'none';
      showToast('編集モードを終了しました');
    }
    render();
  };

  // キャラ・クエスト追加
  document.getElementById('btn-add-char').onclick  = () => openEditModal('character');
  document.getElementById('btn-add-quest').onclick = () => openEditModal('quest');

  // 全体キャラから追加ボタン
  document.getElementById('btn-copy-from-global').onclick = () => openCopyModal();

  // 全体に戻るボタン
  document.getElementById('btn-back-to-all').onclick = () => {
    currentQuestId = null;
    document.getElementById('btn-back-to-all').style.display = 'none';
    document.getElementById('btn-copy-from-global').style.display = 'none';
    document.getElementById('btn-add-char').style.display = isEditMode ? 'inline-flex' : 'none';
    document.getElementById('tier-title').innerHTML = '<i class="fas fa-crown"></i> 全キャラ最強ランキング';
    render();
  };

  // モーダルを閉じる
  document.getElementById('btn-close-modal').onclick  = closeEditModal;
  document.getElementById('btn-cancel-modal').onclick = closeEditModal;
  document.getElementById('modal-product').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-product')) closeEditModal();
  });

  // 詳細モーダルを閉じる
  document.getElementById('btn-detail-close').onclick = closeDetail;
  document.getElementById('modal-detail').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-detail')) closeDetail();
  });

  // 削除確認
  document.getElementById('btn-confirm-cancel').onclick = closeConfirmModal;
  document.getElementById('btn-confirm-ok').onclick     = handleConfirmDelete;

  // フォーム送信
  document.getElementById('product-form').onsubmit = (e) => {
    e.preventDefault();
    handleSave();
  };

  // 検索
  document.getElementById('search-input').oninput = (e) => {
    searchTerm = e.target.value.toLowerCase().trim();
    render();
  };

  // カテゴリフィルター
  document.getElementById('category-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    document.querySelectorAll('#category-filters .chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCat = btn.dataset.category;
    render();
  });

  // 形態セレクター
  document.getElementById('p-form-selector').addEventListener('click', (e) => {
    const btn = e.target.closest('.form-type-btn');
    if (!btn) return;
    document.querySelectorAll('.form-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedForm = btn.dataset.form;
    updateFormFields();
  });

  // ESCキー
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditModal();
      closeDetail();
      closeConfirmModal();
    }
  });
}

/* ==========================================================
   形態に応じてフォームフィールドを切り替え
   ========================================================== */
function updateFormFields() {
  const connectField = document.getElementById('field-connect');
  const shotField    = document.getElementById('field-shot-skill');
  const assistField  = document.getElementById('field-assist-skill');

  connectField.style.display     = selectedForm === '獣神化・改' ? 'block' : 'none';
  document.getElementById('field-connect-cond').style.display = selectedForm === '獣神化・改' ? 'block' : 'none';
  shotField.style.display    = selectedForm === '真獣神化'   ? 'block' : 'none';
  assistField.style.display  = selectedForm === '真獣神化'   ? 'block' : 'none';
}

/* ==========================================================
   描画
   ========================================================== */
function render() {
  const tierContainer = document.getElementById('tier-container');
  const productsGrid  = document.getElementById('products-grid');
  const tierPool      = document.getElementById('tier-pool');

  if (tierContainer) tierContainer.innerHTML = '';
  if (productsGrid)  productsGrid.innerHTML  = '';
  if (tierPool)      tierPool.innerHTML      = '';

  // クエスト適正キャラ表示モード
  if (currentQuestId) {
    const quest = quests.find(q => q.id === currentQuestId);
    if (quest) {
      document.getElementById('tier-title').innerHTML =
        `<i class="fas fa-crosshairs"></i> 【適正】${escHtml(quest.name)}`;
      document.getElementById('btn-back-to-all').style.display = 'inline-flex';
      if (isEditMode) {
        document.getElementById('btn-add-char').style.display = 'inline-flex';
        document.getElementById('btn-copy-from-global').style.display = 'inline-flex';
      }
      renderTierBoard(tierContainer, tierPool, quest.suitableChars || [], 'suitableChar');
      document.getElementById('view-list').classList.remove('active');
      document.getElementById('view-tier').classList.add('active');
      return;
    }
  }

  const activeTab = document.querySelector('.nav-btn.active')?.dataset.view;

  if (activeTab === 'tier') {
    document.getElementById('tier-title').innerHTML =
      '<i class="fas fa-crown"></i> 全キャラ最強ランキング';
    let filtered = characters;
    if (searchTerm) {
      filtered = filtered.filter(c => c.name.toLowerCase().includes(searchTerm));
    }
    renderTierBoard(tierContainer, tierPool, filtered, 'character');
  } else {
    let filtered = quests;
    if (activeCat !== 'all') {
      filtered = filtered.filter(q => q.category === activeCat);
    }
    if (searchTerm) {
      filtered = filtered.filter(q => q.name.toLowerCase().includes(searchTerm));
    }
    if (filtered.length === 0) {
      productsGrid.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-scroll"></i>
          <p>クエストがまだありません。編集モードで追加してください。</p>
        </div>`;
    } else {
      filtered.forEach(q => productsGrid.appendChild(createQuestCard(q)));
    }
  }
}

/* ── ティア表描画 ── */
function renderTierBoard(container, pool, dataList, context) {
  container.classList.remove('tier-board-loaded');

  TIER_ORDER.forEach(tier => {
    const items = dataList.filter(d => d.tier === tier);
    const row   = document.createElement('div');
    row.className = 'tier-row';

    const label = document.createElement('div');
    label.className = `tier-label tier-color-${tier.toLowerCase()}`;
    label.textContent = tier;

    const zone = document.createElement('div');
    zone.className = 'tier-row-content' + (items.length === 0 ? ' empty' : '');
    zone.dataset.tier = tier;

    items.forEach(d => zone.appendChild(createCharCard(d, context)));
    if (isEditMode) setupDropZone(zone, null, context);

    row.appendChild(label);
    row.appendChild(zone);
    container.appendChild(row);
  });

  // ローディング演出
  requestAnimationFrame(() => {
    container.classList.add('tier-board-loaded');
  });

  // 未分類
  const unassigned = dataList.filter(d => !TIER_ORDER.includes(d.tier));
  unassigned.forEach(d => pool.appendChild(createCharCard(d, context)));
  if (isEditMode) setupDropZone(pool, '未分類', context);
}

/* ── キャラカード生成 ── */
function createCharCard(item, context) {
  const card = document.createElement('div');
  card.className = 'monst-card';
  card.dataset.id = item.id;

  const formBadgeClass = {
    '進化':     'badge-進化',
    '神化':     'badge-神化',
    '獣神化':   'badge-獣神化',
    '獣神化・改':'badge-獣神化改',
    '真獣神化': 'badge-真獣神化'
  }[item.form] || '';

  const formLabel = {
    '獣神化・改': '獣改',
    '真獣神化':   '真獣'
  }[item.form] || (item.form || '');

  card.innerHTML = `
    <div class="monst-card-img-wrap">
      ${item.image_url
        ? `<img src="${escHtml(item.image_url)}" alt="${escHtml(item.name)}"
             onerror="this.parentElement.innerHTML='<div class=\\'monst-card-img-placeholder\\'><i class=\\'fas fa-user\\'></i></div>'">`
        : `<div class="monst-card-img-placeholder"><i class="fas fa-user"></i></div>`}
    </div>
    ${formBadgeClass
      ? `<span class="monst-form-badge ${formBadgeClass}">${escHtml(formLabel)}</span>`
      : ''}
    <div class="monst-card-name">${escHtml(item.name)}</div>
    ${isEditMode
      ? `<button class="card-delete-btn" title="削除"><i class="fas fa-times"></i></button>`
      : ''}
  `;

  // クリック
  card.addEventListener('click', (e) => {
    if (e.target.closest('.card-delete-btn')) return;
    if (isEditMode) {
      openEditModal('character', item);
    } else {
      showDetail(item);
    }
  });

  // 削除ボタン
  const delBtn = card.querySelector('.card-delete-btn');
  if (delBtn) {
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDelete(item.id, item.name, context);
    });
  }

  // ドラッグ
  if (isEditMode) {
    card.draggable = true;
    card.addEventListener('dragstart', (e) => {
      draggedId = item.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedId = null;
    });
  }

  return card;
}

/* ── クエストカード生成 ── */
function createQuestCard(quest) {
  const card = document.createElement('div');
  card.className = 'quest-card';

  card.innerHTML = `
    <div class="quest-card-actions">
      <button class="card-action-btn edit" title="編集"><i class="fas fa-edit"></i></button>
      <button class="card-action-btn delete" title="削除"><i class="fas fa-trash"></i></button>
    </div>
    ${quest.image_url
      ? `<img src="${escHtml(quest.image_url)}" class="quest-card-img" alt="${escHtml(quest.name)}">`
      : `<div class="quest-card-img-placeholder"><i class="fas fa-skull-crossbones"></i></div>`}
    <div class="quest-card-body">
      <span class="quest-card-category">${escHtml(quest.category || '')}</span>
      <div class="quest-card-name">${escHtml(quest.name)}</div>
      <div class="quest-card-desc">${escHtml(quest.description || '')}</div>
    </div>
  `;

  // カードクリック → 適正キャラティア表へ
  card.addEventListener('click', (e) => {
    if (e.target.closest('.card-action-btn')) return;
    if (isEditMode) {
      openEditModal('quest', quest);
    } else {
      currentQuestId = quest.id;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.nav-btn[data-view="tier"]').classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById('view-tier').classList.add('active');
      render();
    }
  });

  card.querySelector('.card-action-btn.edit').addEventListener('click', (e) => {
    e.stopPropagation();
    openEditModal('quest', quest);
  });
  card.querySelector('.card-action-btn.delete').addEventListener('click', (e) => {
    e.stopPropagation();
    confirmDelete(quest.id, quest.name, 'quest');
  });

  return card;
}

/* ==========================================================
   ドロップゾーン
   ========================================================== */
function setupDropZone(el, tierName = null, context = 'character') {
  if (!el) return;
  el.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.classList.add('drag-over');
  });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', async (e) => {
    e.preventDefault();
    el.classList.remove('drag-over');
    if (!draggedId) return;

    const newTier = tierName || el.dataset.tier;

    if (currentQuestId) {
      const q = quests.find(q => q.id === currentQuestId);
      if (q) {
        const c = (q.suitableChars || []).find(x => x.id === draggedId);
        if (c && c.tier !== newTier) {
          c.tier = newTier;
          await saveQuests();
          showToast(`ティアを「${newTier}」に変更しました`, 'success');
          render();
        }
      }
    } else {
      const char = characters.find(x => x.id === draggedId);
      if (char && char.tier !== newTier) {
        char.tier = newTier;
        await saveCharacters();
        showToast(`ティアを「${newTier}」に変更しました`, 'success');
        render();
      }
    }
  });
}

/* ==========================================================
   保存処理
   ========================================================== */
async function handleSave() {
  const id   = document.getElementById('p-id').value.trim();
  const type = document.getElementById('p-type').value;
  const name = document.getElementById('p-name').value.trim();

  if (!name) {
    showToast('名前は必須です', 'error');
    return;
  }

  const newData = {
    id:          id || generateId(),
    name,
    tier:        document.getElementById('p-tier').value,
    category:    document.getElementById('p-category').value,
    image_url:   document.getElementById('p-image-url').value.trim(),
    form:        selectedForm,
    typeDetail:  document.getElementById('p-type-detail').value.trim(),
    luck:        document.getElementById('p-luck').value.trim(),
    abi:         document.getElementById('p-abi').value.trim(),
    gauge:       document.getElementById('p-gauge').value.trim(),
    ss:          document.getElementById('p-ss').value.trim(),
    mainFriend:  document.getElementById('p-main-friend').value.trim(),
    subFriend:   document.getElementById('p-sub-friend').value.trim(),
    connect:     document.getElementById('p-connect').value.trim(),
    connectCond: document.getElementById('p-connect-cond').value.trim(),
    shotSkill:   document.getElementById('p-shot-skill').value.trim(),
    assistSkill: document.getElementById('p-assist-skill').value.trim(),
    description: document.getElementById('p-description').value.trim()
  };

  if (currentQuestId && type === 'character') {
    // 適正キャラの追加・編集
    const q = quests.find(q => q.id === currentQuestId);
    if (q) {
      if (!q.suitableChars) q.suitableChars = [];
      const idx = q.suitableChars.findIndex(c => c.id === id);
      if (idx !== -1) q.suitableChars[idx] = newData;
      else            q.suitableChars.push(newData);
      await saveQuests();
      showToast('適正キャラを保存しました', 'success');
    }
  } else if (type === 'quest') {
    // クエストの追加・編集
    const idx = quests.findIndex(q => q.id === id);
    if (idx !== -1) {
      newData.suitableChars = quests[idx].suitableChars || [];
      quests[idx] = newData;
    } else {
      newData.suitableChars = [];
      quests.push(newData);
    }
    await saveQuests();
    showToast('クエストを保存しました', 'success');
  } else {
    // キャラの追加・編集
    const idx = characters.findIndex(c => c.id === id);
    if (idx !== -1) characters[idx] = newData;
    else            characters.push(newData);
    await saveCharacters();
    showToast('キャラを保存しました', 'success');
  }

  closeEditModal();
  render();
}

/* ==========================================================
   モーダル開閉
   ========================================================== */
function openEditModal(type, item = null) {
  document.getElementById('modal-title').textContent =
    item ? (type === 'character' ? 'キャラ編集' : 'クエスト編集')
         : (type === 'character' ? 'キャラ追加' : 'クエスト追加');

  document.getElementById('p-id').value          = item?.id          || '';
  document.getElementById('p-type').value        = type;
  document.getElementById('p-name').value        = item?.name        || '';
  document.getElementById('p-tier').value        = item?.tier        || '未分類';
  document.getElementById('p-image-url').value   = item?.image_url   || '';
  document.getElementById('p-type-detail').value = item?.typeDetail  || '';
  document.getElementById('p-luck').value        = item?.luck        || '';
  document.getElementById('p-abi').value         = item?.abi         || '';
  document.getElementById('p-gauge').value       = item?.gauge       || '';
  document.getElementById('p-ss').value          = item?.ss          || '';
  document.getElementById('p-main-friend').value = item?.mainFriend  || '';
  document.getElementById('p-sub-friend').value  = item?.subFriend   || '';
  document.getElementById('p-connect').value     = item?.connect     || '';
  document.getElementById('p-connect-cond').value= item?.connectCond || '';
  document.getElementById('p-shot-skill').value  = item?.shotSkill   || '';
  document.getElementById('p-assist-skill').value= item?.assistSkill || '';
  document.getElementById('p-description').value = item?.description || '';

  // 属性セレクト
  const cat = document.getElementById('p-category');
  cat.innerHTML = CATEGORIES[type].map(c =>
    `<option value="${c}">${c}</option>`
  ).join('');
  if (item?.category) cat.value = item.category;

  // 形態セレクター
  selectedForm = item?.form || '';
  document.querySelectorAll('.form-type-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.form === selectedForm);
  });

  // フィールド表示切替
  document.getElementById('char-status-fields').style.display = type === 'character' ? 'block' : 'none';
  document.getElementById('quest-desc-field').style.display   = type === 'quest'     ? 'block' : 'none';
  document.getElementById('field-tier').style.display         = type === 'character' ? 'block' : 'none';
  updateFormFields();

  document.getElementById('modal-product').classList.add('is-open');
}

function closeEditModal() {
  document.getElementById('modal-product').classList.remove('is-open');
}

/* ==========================================================
   詳細表示
   ========================================================== */
function showDetail(item) {
  document.getElementById('detail-modal-title').textContent = item.name;
  const formColor = FORM_COLORS[item.form] || '#888884';

  const rows = [
    ['タイプ',   item.typeDetail,  ''],
    ['属性',     item.category,    ''],
    ['アビ',     item.abi,         'highlight'],
    ['ゲージ',   item.gauge,       'highlight'],
    ['SS',       item.ss,          ''],
    ['友情',     item.mainFriend,  ''],
    ['サブ友情', item.subFriend,   ''],
    ['ラック',   item.luck,        ''],
    ['コネクト',   item.connect,     'connect'],
    ['コネクト条件',item.connectCond,'connect'],
    ['ショットスキル', item.shotSkill,  'shot'],
    ['アシストスキル', item.assistSkill,'assist'],
  ].filter(([, v]) => v).map(([l, v, cls]) => `
    <div class="monst-status-row">
      <div class="monst-status-label">${l}</div>
      <div class="monst-status-value ${cls}">${escHtml(v)}</div>
    </div>
  `).join('');

  document.getElementById('detail-content').innerHTML = `
    <div class="detail-content">
      ${item.image_url
        ? `<div class="detail-img-wrap"><img src="${escHtml(item.image_url)}" alt="${escHtml(item.name)}"></div>`
        : ''}
      <div style="padding:0 1.3rem 0.5rem;">
        ${item.form
          ? `<span class="monst-form-badge-lg" style="background:${formColor}">${escHtml(item.form)}</span>`
          : ''}
        <div class="detail-meta-row">
          <div class="detail-tier-badge" style="background:${TIER_COLORS[item.tier] || '#888884'}">${escHtml(item.tier || '未')}</div>
          <div class="detail-name">${escHtml(item.name)}</div>
        </div>
        ${rows ? `<div class="monst-status-table">${rows}</div>` : ''}
      </div>
    </div>
  `;
  document.getElementById('modal-detail').classList.add('is-open');
}

function closeDetail() {
  document.getElementById('modal-detail').classList.remove('is-open');
}

/* ==========================================================
   削除
   ========================================================== */
function confirmDelete(id, name, context) {
  pendingDeleteId   = id;
  pendingDeleteType = context;
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

  if (pendingDeleteType === 'quest') {
    quests = quests.filter(q => q.id !== pendingDeleteId);
    await saveQuests();
  } else if (pendingDeleteType === 'suitableChar' && currentQuestId) {
    const q = quests.find(q => q.id === currentQuestId);
    if (q) {
      q.suitableChars = (q.suitableChars || []).filter(c => c.id !== pendingDeleteId);
      await saveQuests();
    }
  } else {
    characters = characters.filter(c => c.id !== pendingDeleteId);
    await saveCharacters();
  }

  closeConfirmModal();
  showToast('削除しました', 'success');
  render();
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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showLoading(visible) {
  ['tier-container', 'products-grid'].forEach(id => {
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
  toast.textContent    = message;
  toast.className      = type ? `toast ${type}` : 'toast';
  toast.style.display  = 'block';
  if (toastTimer) clearTimeout(toastTimer);

/* ==========================================================
   全体キャラから適正キャラをコピーするモーダル
   ========================================================== */

let selectedCopyIds = new Set();
let copyTier = 'S';

function openCopyModal() {
  if (!currentQuestId) return;
  selectedCopyIds.clear();
  copyTier = 'S';

  // ティアボタンのリセット
  document.querySelectorAll('.copy-tier-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tier === 'S');
  });

  // 検索リセット
  const searchEl = document.getElementById('copy-search-input');
  if (searchEl) searchEl.value = '';

  updateCopySelectedCount();
  renderCopyCharList('');
  document.getElementById('modal-copy-char').classList.add('is-open');

  // ティアボタンのイベント
  document.querySelectorAll('.copy-tier-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.copy-tier-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      copyTier = btn.dataset.tier;
    };
  });

  // 検索のイベント
  searchEl.oninput = (e) => renderCopyCharList(e.target.value.toLowerCase().trim());

  // 閉じるボタン
  document.getElementById('btn-copy-modal-close').onclick = closeCopyModal;
  document.getElementById('btn-copy-cancel').onclick      = closeCopyModal;
  document.getElementById('modal-copy-char').onclick = (e) => {
    if (e.target === document.getElementById('modal-copy-char')) closeCopyModal();
  };

  // 追加ボタン
  document.getElementById('btn-copy-confirm').onclick = handleCopyConfirm;
}

function closeCopyModal() {
  document.getElementById('modal-copy-char').classList.remove('is-open');
  selectedCopyIds.clear();
}

function renderCopyCharList(filter = '') {
  const list = document.getElementById('copy-char-list');
  if (!list) return;

  // 現在のクエストにすでに登録済みのIDを取得
  const quest = quests.find(q => q.id === currentQuestId);
  const existingIds = new Set((quest?.suitableChars || []).map(c => c.id));

  let filtered = characters;
  if (filter) {
    filtered = filtered.filter(c => c.name.toLowerCase().includes(filter));
  }

  if (filtered.length === 0) {
    list.innerHTML = `<div class="copy-char-empty">
      <i class="fas fa-user-slash"></i>
      <p>全体ティア表にキャラが登録されていません</p>
    </div>`;
    return;
  }

  list.innerHTML = filtered.map(char => {
    const isSelected  = selectedCopyIds.has(char.id);
    const isExisting  = existingIds.has(char.id);
    const formBadge   = char.form ? `<span class="copy-char-form">${escHtml(char.form)}</span>` : '';
    const tierColor   = {
      S:'#c0392b', A:'#d4750a', B:'#b8960a', C:'#2e7d52', D:'#2563a8', '未分類':'#888884'
    }[char.tier] || '#888884';

    return `
      <div class="copy-char-item ${isSelected ? 'selected' : ''} ${isExisting ? 'existing' : ''}"
           data-id="${char.id}">
        <div class="copy-char-img-wrap">
          ${char.image_url
            ? `<img src="${escHtml(char.image_url)}" alt="${escHtml(char.name)}">`
            : `<div class="copy-char-img-placeholder"><i class="fas fa-user"></i></div>`}
        </div>
        <div class="copy-char-info">
          <div class="copy-char-name">${escHtml(char.name)}</div>
          <div class="copy-char-meta">
            <span class="copy-char-tier" style="background:${tierColor}">${escHtml(char.tier || '未')}</span>
            ${formBadge}
            ${isExisting ? `<span class="copy-char-existing">登録済み</span>` : ''}
          </div>
        </div>
        <div class="copy-char-check">
          ${isExisting
            ? `<i class="fas fa-check-circle" style="color:var(--success)"></i>`
            : isSelected
              ? `<i class="fas fa-check-circle" style="color:var(--ink)"></i>`
              : `<i class="far fa-circle" style="color:var(--border-dark)"></i>`}
        </div>
      </div>`;
  }).join('');

  // クリックイベント
  list.querySelectorAll('.copy-char-item:not(.existing)').forEach(item => {
    item.onclick = () => {
      const id = item.dataset.id;
      if (selectedCopyIds.has(id)) {
        selectedCopyIds.delete(id);
        item.classList.remove('selected');
        item.querySelector('.copy-char-check').innerHTML =
          `<i class="far fa-circle" style="color:var(--border-dark)"></i>`;
      } else {
        selectedCopyIds.add(id);
        item.classList.add('selected');
        item.querySelector('.copy-char-check').innerHTML =
          `<i class="fas fa-check-circle" style="color:var(--ink)"></i>`;
      }
      updateCopySelectedCount();
    };
  });
}

function updateCopySelectedCount() {
  const el = document.getElementById('copy-selected-count');
  if (el) el.textContent = `${selectedCopyIds.size}体選択中`;
}

async function handleCopyConfirm() {
  if (selectedCopyIds.size === 0) {
    showToast('キャラを選択してください', 'error');
    return;
  }

  const quest = quests.find(q => q.id === currentQuestId);
  if (!quest) return;
  if (!quest.suitableChars) quest.suitableChars = [];

  // 選択されたキャラをコピーして追加
  let addedCount = 0;
  selectedCopyIds.forEach(id => {
    const char = characters.find(c => c.id === id);
    if (!char) return;

    // すでに登録済みならスキップ
    const alreadyExists = quest.suitableChars.some(c => c.id === id);
    if (alreadyExists) return;

    // データをコピーして追加（IDは新規生成、ティアはコピー先で選択したもの）
    quest.suitableChars.push({
      ...char,
      id:   generateId(),  // 新規ID
      tier: copyTier       // 選択したティアで登録
    });
    addedCount++;
  });

  if (addedCount === 0) {
    showToast('選択したキャラはすでに登録済みです', 'error');
    return;
  }

  await saveQuests();
  closeCopyModal();
  showToast(`${addedCount}体を追加しました`, 'success');
  render();
}
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3000);
}