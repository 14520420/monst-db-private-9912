/* ============================================================
   settings.js — サイト共通設定パネル
   ・ダークモード切り替え
   ・アニメーション設定（なし / 控えめ / 派手め）
   ・カードサイズ切り替え（小 / 中 / 大）
   ・ティア表を画像として保存（html2canvas）
   ・更新履歴・メモ機能
   ・キーボードショートカット
   ============================================================ */

(function () {

  /* ──────────────────────────────────────────
     定数・設定キー
  ────────────────────────────────────────── */
  const KEYS = {
    DARK:     'site_dark_mode',
    ANIM:     'site_anim_setting',
    CARD:     'site_card_size',
    HISTORY:  'site_change_history'
  };

  const MAX_HISTORY = 50;

  /* ──────────────────────────────────────────
     設定の読み込み・保存
  ────────────────────────────────────────── */
  const load  = k       => localStorage.getItem(k);
  const save  = (k, v)  => localStorage.setItem(k, v);

  /* ──────────────────────────────────────────
     ダークモード
  ────────────────────────────────────────── */
  function applyDark(on) {
    document.body.classList.toggle('dark-mode', on);
  }
  function toggleDark() {
    const next = !document.body.classList.contains('dark-mode');
    save(KEYS.DARK, next ? '1' : '0');
    applyDark(next);
    updateSettingsUI();
  }

  /* ──────────────────────────────────────────
     アニメーション
  ────────────────────────────────────────── */
  function applyAnim(v) {
    document.body.classList.remove('anim-subtle', 'anim-fancy');
    if (v === 'subtle') document.body.classList.add('anim-subtle');
    if (v === 'fancy')  document.body.classList.add('anim-fancy');
  }

  /* ──────────────────────────────────────────
     カードサイズ
  ────────────────────────────────────────── */
  function applyCard(v) {
    document.body.classList.remove('card-sm', 'card-md', 'card-lg');
    document.body.classList.add(`card-${v}`);
  }

  /* ──────────────────────────────────────────
     更新履歴
  ────────────────────────────────────────── */
  function getHistory() {
    try { return JSON.parse(load(KEYS.HISTORY) || '[]'); }
    catch { return []; }
  }

  function addHistory(text) {
    if (!text.trim()) return;
    const list = getHistory();
    list.unshift({
      text: text.trim(),
      date: new Date().toLocaleString('ja-JP', {
        year:'numeric', month:'2-digit', day:'2-digit',
        hour:'2-digit', minute:'2-digit'
      })
    });
    if (list.length > MAX_HISTORY) list.splice(MAX_HISTORY);
    save(KEYS.HISTORY, JSON.stringify(list));
  }

  /* ──────────────────────────────────────────
     ティア表を画像保存（html2canvas）
  ────────────────────────────────────────── */
  async function saveTierImage() {
    // どのティアボードを保存するか判定
    const targets = [
      document.getElementById('tier-board'),         // おすすめ商品
      document.getElementById('tier-container'),      // モンスト
      document.getElementById('legend-tier-container'), // APEX legends
      document.getElementById('weapon-tier-container')  // APEX weapons
    ].filter(el => el && el.offsetParent !== null);   // 表示中のもの

    if (targets.length === 0) {
      showToastGlobal('ティア表が表示されていません', 'error');
      return;
    }
    const target = targets[0];

    showToastGlobal('画像を生成中...', '');

    try {
      // html2canvasを動的に読み込み
      if (!window.html2canvas) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      }
      const canvas = await window.html2canvas(target, {
        backgroundColor: getComputedStyle(document.body)
          .getPropertyValue('--bg').trim() || '#f7f7f5',
        scale: 2,
        useCORS: true,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `tier-${Date.now()}.png`;
      link.href     = canvas.toDataURL('image/png');
      link.click();
      showToastGlobal('画像を保存しました', 'success');
    } catch (e) {
      console.error(e);
      showToastGlobal('画像生成に失敗しました', 'error');
    }
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  /* ──────────────────────────────────────────
     トースト（グローバル）
  ────────────────────────────────────────── */
  let toastTimer = null;
  function showToastGlobal(msg, type) {
    let toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent   = msg;
    toast.className     = type ? `toast ${type}` : 'toast';
    toast.style.display = 'block';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3000);
  }

  /* ──────────────────────────────────────────
     パネルHTML注入
  ────────────────────────────────────────── */
  function injectUI() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    /* ── 設定ボタン ── */
    const settingsBtn = document.createElement('button');
    settingsBtn.id        = 'btn-settings';
    settingsBtn.className = 'settings-btn';
    settingsBtn.title     = '設定 (S)';
    settingsBtn.innerHTML = '<i class="fas fa-sliders-h"></i>';
    headerActions.insertBefore(settingsBtn, headerActions.firstChild);

    /* ── パネル本体 ── */
    const panel = document.createElement('div');
    panel.id        = 'settings-panel';
    panel.className = 'settings-panel';
    panel.innerHTML = `
      <div class="settings-panel-header">
        <i class="fas fa-sliders-h"></i> 設定
      </div>

      <!-- ダークモード -->
      <div class="settings-section">
        <div class="settings-section-label">テーマ</div>
        <div class="settings-toggle-row">
          <div>
            <div class="settings-toggle-label">ダークモード</div>
            <div class="settings-toggle-desc">夜間に見やすい暗いテーマ</div>
          </div>
          <button class="settings-toggle-btn" id="toggle-dark" title="ダークモード切替">
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
          </button>
        </div>
      </div>

      <!-- アニメーション -->
      <div class="settings-section">
        <div class="settings-section-label">アニメーション</div>
        <div class="settings-options">
          <button class="settings-option" data-type="anim" data-val="none">
            <div>
              <div class="settings-option-label">なし</div>
              <div class="settings-option-desc">すべての動きを無効化</div>
            </div>
            <i class="fas fa-check settings-check"></i>
          </button>
          <button class="settings-option" data-type="anim" data-val="subtle">
            <div>
              <div class="settings-option-label">控えめ</div>
              <div class="settings-option-desc">ふわっとしたシンプルな動き</div>
            </div>
            <i class="fas fa-check settings-check"></i>
          </button>
          <button class="settings-option" data-type="anim" data-val="fancy">
            <div>
              <div class="settings-option-label">派手め</div>
              <div class="settings-option-desc">バウンス・傾き・時間差演出</div>
            </div>
            <i class="fas fa-check settings-check"></i>
          </button>
        </div>
      </div>

      <!-- カードサイズ -->
      <div class="settings-section">
        <div class="settings-section-label">カードサイズ</div>
        <div class="settings-options">
          <button class="settings-option" data-type="card" data-val="sm">
            <div>
              <div class="settings-option-label">小</div>
              <div class="settings-option-desc">多くのカードを一度に表示</div>
            </div>
            <i class="fas fa-check settings-check"></i>
          </button>
          <button class="settings-option" data-type="card" data-val="md">
            <div>
              <div class="settings-option-label">中（標準）</div>
              <div class="settings-option-desc">バランスの良いデフォルトサイズ</div>
            </div>
            <i class="fas fa-check settings-check"></i>
          </button>
          <button class="settings-option" data-type="card" data-val="lg">
            <div>
              <div class="settings-option-label">大</div>
              <div class="settings-option-desc">画像・名前を大きく表示</div>
            </div>
            <i class="fas fa-check settings-check"></i>
          </button>
        </div>
      </div>

      <!-- ティア表を画像保存 -->
      <div class="settings-section">
        <div class="settings-section-label">ティア表</div>
        <button class="settings-action-btn" id="btn-save-image">
          <i class="fas fa-image"></i> 画像として保存
        </button>
      </div>

      <!-- 更新履歴 -->
      <div class="settings-section">
        <div class="settings-section-label">更新履歴・メモ</div>
        <div class="settings-history-input-wrap">
          <input type="text" id="history-input" class="settings-history-input"
            placeholder="変更内容を入力（例：ヤクモをSに変更）">
          <button class="settings-history-add-btn" id="btn-add-history">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <div class="settings-history-list" id="history-list"></div>
      </div>

      <!-- キーボードショートカット -->
      <div class="settings-section">
        <div class="settings-section-label">キーボードショートカット</div>
        <div class="settings-shortcut-list">
          <div class="settings-shortcut-row">
            <kbd>E</kbd><span>編集モード切替</span>
          </div>
          <div class="settings-shortcut-row">
            <kbd>D</kbd><span>ダークモード切替</span>
          </div>
          <div class="settings-shortcut-row">
            <kbd>S</kbd><span>設定パネル開閉</span>
          </div>
          <div class="settings-shortcut-row">
            <kbd>Esc</kbd><span>モーダルを閉じる</span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    /* ── パネルイベント ── */
    // 設定ボタン
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePanel();
    });

    // 外側クリックで閉じる
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && e.target !== settingsBtn) {
        closePanel();
      }
    });

    // ダークモードトグル
    document.getElementById('toggle-dark').addEventListener('click', toggleDark);

    // アニメーション・カードサイズ選択
    panel.querySelectorAll('.settings-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const val  = btn.dataset.val;
        if (type === 'anim') {
          save(KEYS.ANIM, val);
          applyAnim(val);
        } else if (type === 'card') {
          save(KEYS.CARD, val);
          applyCard(val);
        }
        updateSettingsUI();
      });
    });

    // 画像保存
    document.getElementById('btn-save-image').addEventListener('click', () => {
      closePanel();
      saveTierImage();
    });

    // 履歴追加
    document.getElementById('btn-add-history').addEventListener('click', addHistoryFromInput);
    document.getElementById('history-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addHistoryFromInput(); }
    });
  }

  function addHistoryFromInput() {
    const input = document.getElementById('history-input');
    const text  = input?.value?.trim();
    if (!text) return;
    addHistory(text);
    input.value = '';
    renderHistoryList();
    showToastGlobal('履歴に追加しました', 'success');
  }

  function renderHistoryList() {
    const list = document.getElementById('history-list');
    if (!list) return;
    const history = getHistory();
    if (history.length === 0) {
      list.innerHTML = '<div class="settings-history-empty">まだ履歴がありません</div>';
      return;
    }
    list.innerHTML = history.slice(0, 10).map((h, i) => `
      <div class="settings-history-item">
        <div class="settings-history-text">${escHtml(h.text)}</div>
        <div class="settings-history-date">${escHtml(h.date)}</div>
        <button class="settings-history-del" data-index="${i}" title="削除">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');

    // 削除ボタン
    list.querySelectorAll('.settings-history-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        const h   = getHistory();
        h.splice(idx, 1);
        save(KEYS.HISTORY, JSON.stringify(h));
        renderHistoryList();
      });
    });
  }

  /* ──────────────────────────────────────────
     パネル開閉
  ────────────────────────────────────────── */
  function togglePanel() {
    const panel = document.getElementById('settings-panel');
    const btn   = document.getElementById('btn-settings');
    if (!panel) return;
    const isOpen = panel.classList.contains('is-open');
    if (isOpen) closePanel();
    else        openPanel();
  }

  function openPanel() {
    const panel = document.getElementById('settings-panel');
    const btn   = document.getElementById('btn-settings');
    if (!panel) return;
    panel.classList.add('is-open');
    btn?.classList.add('active');
    renderHistoryList();
  }

  function closePanel() {
    const panel = document.getElementById('settings-panel');
    const btn   = document.getElementById('btn-settings');
    panel?.classList.remove('is-open');
    btn?.classList.remove('active');
  }

  /* ──────────────────────────────────────────
     UIの状態更新
  ────────────────────────────────────────── */
  function updateSettingsUI() {
    const isDark  = document.body.classList.contains('dark-mode');
    const anim    = load(KEYS.ANIM) || 'subtle';
    const card    = load(KEYS.CARD) || 'md';

    // ダークモードトグル
    const toggleDarkBtn = document.getElementById('toggle-dark');
    if (toggleDarkBtn) {
      toggleDarkBtn.classList.toggle('on', isDark);
    }

    // 選択肢のactive
    document.querySelectorAll('.settings-option').forEach(btn => {
      const type = btn.dataset.type;
      const val  = btn.dataset.val;
      if (type === 'anim') btn.classList.toggle('active', val === anim);
      if (type === 'card') btn.classList.toggle('active', val === card);
    });
  }

  /* ──────────────────────────────────────────
     キーボードショートカット
  ────────────────────────────────────────── */
  function setupShortcuts() {
    document.addEventListener('keydown', (e) => {
      // 入力中は無視
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key.toLowerCase()) {
        case 'e':
          // 編集モードボタンをクリック
          document.getElementById('btn-edit-mode')?.click();
          break;
        case 'd':
          // ダークモード切替
          toggleDark();
          showToastGlobal(
            document.body.classList.contains('dark-mode')
              ? 'ダークモード ON' : 'ダークモード OFF',
            ''
          );
          break;
        case 's':
          // 設定パネル開閉
          togglePanel();
          break;
      }
    });
  }

  /* ──────────────────────────────────────────
     ユーティリティ
  ────────────────────────────────────────── */
  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ──────────────────────────────────────────
     初期化
  ────────────────────────────────────────── */
  function init() {
    // 設定を読み込んで適用
    applyDark(load(KEYS.DARK) === '1');
    applyAnim(load(KEYS.ANIM) || 'subtle');
    applyCard(load(KEYS.CARD) || 'md');

    // UIを注入
    injectUI();
    updateSettingsUI();

    // ショートカット
    setupShortcuts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();