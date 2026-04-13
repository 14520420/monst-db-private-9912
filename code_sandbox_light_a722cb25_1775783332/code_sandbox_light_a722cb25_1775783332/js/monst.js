const TIER_ORDER = ['S', 'A', 'B', 'C', 'D'];
const STORAGE_KEY = 'monst_db_integrated_v4';

let allData = [];
let isEditMode = false;
let draggedId = null;
let currentQuestId = null; // 選択中のクエストIDを保持

const CATEGORIES = {
  character: ['火属性', '水属性', '木属性', '光属性', '闇属性'],
  quest: ['黎絶', '轟絶', '爆絶', '超絶', '超究極', '天魔(試練)', '天魔(空中庭園)', '禁忌']
};

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  allData = saved ? JSON.parse(saved) : [];
  setupEventListeners();
  render();
});

function setupEventListeners() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
      const targetView = btn.dataset.view;
      // 「最強ティア表」ボタンを直接押した時だけ、全体表示に戻す
      if (targetView === 'tier' && !currentQuestId) {
        currentQuestId = null;
      }
      // 「クエスト一覧」ボタンを押した時は、選択を解除して一覧へ
      if (targetView === 'list') {
        currentQuestId = null;
      }

      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(`view-${targetView}`).classList.add('active');
      render();
    };
  });

  document.getElementById('btn-edit-mode').onclick = () => {
    isEditMode = !isEditMode;
    const isVisible = isEditMode ? 'block' : 'none';
    document.getElementById('btn-add-char').style.display = isVisible;
    document.getElementById('btn-add-quest').style.display = isVisible;
    document.getElementById('unclassified-container').style.display = isVisible;
    document.getElementById('btn-edit-mode').classList.toggle('active', isEditMode);
    render();
  };

  document.getElementById('btn-add-char').onclick = () => openEditModal('character');
  document.getElementById('btn-add-quest').onclick = () => openEditModal('quest');
  document.getElementById('btn-close-modal').onclick = closeEditModal;
  document.getElementById('btn-cancel-modal').onclick = closeEditModal;
  document.getElementById('product-form').onsubmit = (e) => { e.preventDefault(); handleSave(); };
  document.getElementById('search-input').oninput = (e) => render(e.target.value.toLowerCase());
}

function render(filterTerm = '') {
  const tierContainer = document.getElementById('tier-container');
  const productsGrid = document.getElementById('products-grid');
  const tierPool = document.getElementById('tier-pool');
  const viewTitle = document.getElementById('tier-title');

  if (tierContainer) tierContainer.innerHTML = '';
  if (productsGrid) productsGrid.innerHTML = '';
  if (tierPool) tierPool.innerHTML = '';

  // 【重要】クエスト専用適正表示
  if (currentQuestId) {
    const quest = allData.find(d => d.id === currentQuestId);
    if (quest) {
      viewTitle.textContent = `【適正】${quest.name}`;
      renderTierSystem(tierContainer, tierPool, quest.suitableChars || [], filterTerm);
      // ビューを確実に「tier」に向ける
      document.getElementById('view-list').classList.remove('active');
      document.getElementById('view-tier').classList.add('active');
      return;
    }
  }

  // 通常モード
  const activeTab = document.querySelector('.nav-btn.active').dataset.view;
  if (activeTab === 'tier') {
    viewTitle.textContent = '全キャラ最強ランキング';
    renderTierSystem(tierContainer, tierPool, allData.filter(d => d.type === 'character'), filterTerm);
  } else {
    allData.filter(d => d.type === 'quest').forEach(q => {
      if (q.name.toLowerCase().includes(filterTerm)) productsGrid.appendChild(createCard(q));
    });
  }
}

function renderTierSystem(container, pool, dataList, filter) {
  TIER_ORDER.forEach(tier => {
    const row = document.createElement('div');
    row.className = 'tier-row';
    row.innerHTML = `<div class="tier-label tier-color-${tier.toLowerCase()}">${tier}</div><div class="tier-row-content" data-tier="${tier}"></div>`;
    setupDropZone(row.querySelector('.tier-row-content'));
    container.appendChild(row);
  });
  setupDropZone(pool, '未分類');

  dataList.forEach(item => {
    if (!item.name.toLowerCase().includes(filter)) return;
    const card = createCard(item);
    const target = (item.tier && item.tier !== '未分類') ? Array.from(container.querySelectorAll('.tier-row-content')).find(c => c.dataset.tier === item.tier) : pool;
    if (target) target.appendChild(card);
  });
}

function createCard(item) {
  const card = document.createElement('div');
  card.className = `tier-card ${item.type === 'quest' ? 'quest-style' : ''}`;
  if (isEditMode) {
    card.draggable = true;
    card.ondragstart = () => { draggedId = item.id; card.classList.add('dragging'); };
    card.ondragend = () => { card.classList.remove('dragging'); draggedId = null; };
  }
  card.innerHTML = `
    <div class="tier-card-img-container">
      ${item.image_url ? `<img src="${item.image_url}" class="tier-card-img">` : `<div class="tier-card-img-placeholder"><i class="fas fa-user"></i></div>`}
    </div>
    <div class="tier-card-name">${item.name}</div>
  `;
  card.onclick = () => {
    if (isEditMode) {
      openEditModal(item.type, item);
    } else if (item.type === 'quest') {
      currentQuestId = item.id; // クエストIDをセットして
      render(); // 描画
    } else {
      showDetail(item);
    }
  };
  return card;
}

function setupDropZone(el, tierName = null) {
  if (!el) return;
  el.ondragover = (e) => e.preventDefault();
  el.ondrop = (e) => {
    e.preventDefault();
    const targetTier = tierName || el.dataset.tier;
    if (!draggedId) return;

    if (currentQuestId) {
      const q = allData.find(d => d.id === currentQuestId);
      const c = q.suitableChars.find(x => x.id === draggedId);
      if (c) c.tier = targetTier;
    } else {
      const i = allData.find(x => x.id === draggedId);
      if (i) i.tier = targetTier;
    }
    saveAndRefresh();
  };
}

function handleSave() {
  const id = document.getElementById('p-id').value;
  const type = document.getElementById('p-type').value;

  const newData = {
    id: id || Date.now().toString(),
    type: type,
    name: document.getElementById('p-name').value,
    tier: document.getElementById('p-tier').value,
    category: document.getElementById('p-category').value,
    image_url: document.getElementById('p-image-url').value,
    typeDetail: document.getElementById('p-type-detail').value,
    abi: document.getElementById('p-abi').value,
    gauge: document.getElementById('p-gauge').value,
    ss: document.getElementById('p-ss').value,
    mainFriend: document.getElementById('p-main-friend').value,
    subFriend: document.getElementById('p-sub-friend').value,
    luck: document.getElementById('p-luck').value,
    description: document.getElementById('p-description').value
  };

  if (currentQuestId && type === 'character') {
    const q = allData.find(d => d.id === currentQuestId);
    if (!q.suitableChars) q.suitableChars = [];
    if (id) {
      const idx = q.suitableChars.findIndex(c => c.id === id);
      q.suitableChars[idx] = newData;
    } else q.suitableChars.push(newData);
  } else {
    if (id) {
      const idx = allData.findIndex(d => d.id === id);
      if (type === 'quest') newData.suitableChars = allData[idx].suitableChars || [];
      allData[idx] = newData;
    } else {
      if (type === 'quest') newData.suitableChars = [];
      allData.push(newData);
    }
  }
  saveAndRefresh();
  closeEditModal();
}

function showDetail(item) {
  const content = document.getElementById('detail-content');
  const imgHtml = item.image_url ? `<div class="detail-img-container"><img src="${item.image_url}"></div>` : '';
  if (item.type === 'quest') {
    content.innerHTML = `<div class="modal-header"><h2 class="modal-title">${item.name}</h2><button class="modal-close" onclick="closeDetail()"><i class="fas fa-times"></i></button></div><div class="modal-body">${imgHtml}<p style="white-space:pre-wrap;">${item.description || '詳細なし'}</p></div>`;
  } else {
    content.innerHTML = `<div class="modal-header"><h2 class="modal-title">${item.name}</h2><button class="modal-close" onclick="closeDetail()"><i class="fas fa-times"></i></button></div><div class="modal-body">${imgHtml}<div class="status-container">${renderRow('タイプ', item.typeDetail)}${renderRow('アビ', item.abi, true)}${renderRow('ゲージ', item.gauge, true)}${renderRow('SS', item.ss)}${renderRow('友情', item.mainFriend)}${renderRow('サブ', item.subFriend)}${renderRow('ラック', item.luck)}</div></div>`;
  }
  document.getElementById('modal-detail').style.display = 'flex';
}

function renderRow(l, v, b = false) { return v ? `<div class="status-row"><div class="status-label">${l}</div><div class="status-value ${b ? 'text-blue' : ''}">${v}</div></div>` : ''; }
function openEditModal(t, i = null) {
  document.getElementById('p-id').value = i ? i.id : '';
  document.getElementById('p-type').value = i ? i.type : t;
  document.getElementById('p-name').value = i ? i.name : '';
  document.getElementById('p-tier').value = i ? i.tier : '未分類';
  document.getElementById('p-image-url').value = i ? i.image_url : '';
  document.getElementById('p-type-detail').value = i?.typeDetail || '';
  document.getElementById('p-abi').value = i?.abi || '';
  document.getElementById('p-gauge').value = i?.gauge || '';
  document.getElementById('p-ss').value = i?.ss || '';
  document.getElementById('p-main-friend').value = i?.mainFriend || '';
  document.getElementById('p-sub-friend').value = i?.subFriend || '';
  document.getElementById('p-luck').value = i?.luck || '';
  document.getElementById('p-description').value = i?.description || '';
  const cat = document.getElementById('p-category');
  cat.innerHTML = CATEGORIES[t].map(c => `<option value="${c}">${c}</option>`).join('');
  if (i) cat.value = i.category;
  document.getElementById('char-status-fields').style.display = t === 'character' ? 'block' : 'none';
  document.getElementById('quest-desc-field').style.display = t === 'quest' ? 'block' : 'none';
  document.getElementById('field-tier').style.display = t === 'character' ? 'block' : 'none';
  document.getElementById('modal-product').style.display = 'flex';
}
function saveAndRefresh() { localStorage.setItem(STORAGE_KEY, JSON.stringify(allData)); render(); }
function closeEditModal() { document.getElementById('modal-product').style.display = 'none'; }
function closeDetail() { document.getElementById('modal-detail').style.display = 'none'; }
