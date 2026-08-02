// js/chat-palette.js
// チャットパレット：ユーザ(ブラウザ)ごとによく使うフレーズを保存し、
// クリックだけで即座に送信できるようにする機能。
//
// 保存単位は「タブ」。1タブ＝｛名前, 改行区切りのプレーンテキスト1本｝で、
// 1行＝1フレーズとして扱う（ラベルと送信内容を分けない。テキストとして自由に編集できるように）。
//
// タブの「名前」がそのタブの発言者になる。コマ名と完全一致すればそのコマとして送られ
// （{パラメータ名}置換・バフ/プラグインコマンドの対象になる）、一致しなければ
// その名前の発言として送られる。判定と送信そのものはjs/main.jsのsubmitFromPaletteが行い、
// このモジュールはUIと保存だけを担当する。

import { downloadJSON, parseJsonText } from './character-snapshot.js';
import { pickFileAsText } from './file-uploader.js';

// 旧形式（改行区切りテキスト1本）のキー。移行のために読むだけで、消しはしない（切り戻せるように）
const LEGACY_STORAGE_KEY = 'chatPalette';
const STORAGE_KEY = 'chatPaletteV2';

// パレットのファイル保存形式のマーカー。コマのスナップショット（character-snapshot.js）と
// 同じ考え方で、他のJSONを読ませてしまった場合に弾くために持たせる。
export const CHAT_PALETTE_FORMAT = 'mojuraX-chat-palette-v1';

let tabSeq = 0;
function generateTabId() {
  tabSeq += 1;
  return `palette-${Date.now()}-${tabSeq}`;
}

function createTab(name = '', text = '') {
  return { id: generateTabId(), name, text };
}

function emptyState() {
  const tab = createTab();
  return { version: 1, activeTabId: tab.id, tabs: [tab] };
}

// 保存済み・読み込み済みのデータを、欠けたフィールドを補って正規化する。
// タブは必ず1枚以上あるようにし、activeTabIdは実在するタブを指すようにそろえる。
function normalizeState(raw) {
  if (!raw || typeof raw !== 'object') return emptyState();

  const tabs = Array.isArray(raw.tabs)
    ? raw.tabs
        .filter(t => t && typeof t === 'object')
        .map(t => ({
          id: typeof t.id === 'string' && t.id ? t.id : generateTabId(),
          name: typeof t.name === 'string' ? t.name : '',
          text: typeof t.text === 'string' ? t.text : ''
        }))
    : [];

  if (tabs.length === 0) return emptyState();

  const activeTabId = tabs.some(t => t.id === raw.activeTabId) ? raw.activeTabId : tabs[0].id;
  return { version: 1, activeTabId, tabs };
}

export function loadChatPaletteState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeState(JSON.parse(raw));

    // 旧形式（テキスト1本）が残っていれば、名前なしのタブ1枚として引き継ぐ
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const tab = createTab('', legacy);
      return { version: 1, activeTabId: tab.id, tabs: [tab] };
    }
  } catch {
    // 壊れたJSON・localStorageが使えない環境では既定の空パレットで始める
  }
  return emptyState();
}

export function saveChatPaletteState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorageが使えない環境（プライベートモード等）では保存を諦める
  }
}

export function parseChatPaletteLines(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '');
}

/**
 * パレットのUIを描画する。中身の状態はこの関数の中に閉じ、変更のたびにlocalStorageへ保存する。
 * @param {{
 *   container: HTMLElement,
 *   onSend: (options: { text: string, name: string, onSent?: () => void }) => void,
 *   findTokenByName: (name: string) => object | null
 * }} options
 *   onSend: 1行クリック・パレット内チャット欄からの送信。発言者の解決は呼び出し元に委ねる。
 *   findTokenByName: 名前欄の下に「このコマとして送る／この名前で発言」を出すための照会。
 */
export function renderChatPalette({ container, onSend, findTokenByName }) {
  let state = loadChatPaletteState();
  let editing = false;

  const persist = () => saveChatPaletteState(state);
  const activeTab = () => state.tabs.find(t => t.id === state.activeTabId) ?? state.tabs[0];

  container.innerHTML = '';
  container.className = 'chat-palette';

  // --- タブ行 ---
  const tabRow = document.createElement('div');
  tabRow.className = 'chat-palette-tabs';
  container.appendChild(tabRow);

  // --- 名前欄 ---
  const nameRow = document.createElement('div');
  nameRow.className = 'chat-palette-name-row';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'chat-palette-name';
  nameInput.placeholder = '名前（コマ名と一致でそのコマとして送信）';

  const nameStatus = document.createElement('span');
  nameStatus.className = 'chat-palette-name-status';

  nameRow.appendChild(nameInput);
  nameRow.appendChild(nameStatus);
  container.appendChild(nameRow);

  // --- 本体（行一覧 ⇔ 編集用テキストエリア） ---
  const listEl = document.createElement('div');
  listEl.className = 'chat-palette-list';
  container.appendChild(listEl);

  const editorEl = document.createElement('textarea');
  editorEl.className = 'chat-palette-editor';
  editorEl.placeholder = '1行につき1フレーズです。空行は無視されます。';
  editorEl.style.display = 'none';
  container.appendChild(editorEl);

  // --- パレット内チャット欄（このタブの名前として送る） ---
  const sendRow = document.createElement('div');
  sendRow.className = 'chat-palette-send-row';

  const sendInput = document.createElement('textarea');
  sendInput.className = 'chat-palette-send-input';
  sendInput.rows = 2;
  sendInput.placeholder = 'この名前で発言';

  const sendBtn = document.createElement('button');
  sendBtn.type = 'button';
  sendBtn.className = 'chat-palette-send-btn';
  sendBtn.textContent = '送信';

  sendRow.appendChild(sendInput);
  sendRow.appendChild(sendBtn);
  container.appendChild(sendRow);

  // --- フッター（編集・保存・読み込み） ---
  const footer = document.createElement('div');
  footer.className = 'chat-palette-footer';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'chat-palette-footer-btn';

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'chat-palette-footer-btn';
  exportBtn.textContent = '保存';
  exportBtn.title = '全タブをJSONファイルへ書き出す';

  const importBtn = document.createElement('button');
  importBtn.type = 'button';
  importBtn.className = 'chat-palette-footer-btn';
  importBtn.textContent = '読み込み';
  importBtn.title = 'JSONファイルから全タブを読み込む（現在の内容は置き換わる）';

  footer.appendChild(editBtn);
  footer.appendChild(exportBtn);
  footer.appendChild(importBtn);
  container.appendChild(footer);

  // ---- 描画 ----

  function renderTabs() {
    tabRow.innerHTML = '';

    state.tabs.forEach(tab => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-palette-tab';
      btn.classList.toggle('is-active', tab.id === state.activeTabId);
      // 名前が未入力のタブも見分けられるようにしておく
      btn.textContent = tab.name.trim() || '(無名)';
      btn.title = tab.name.trim() || '(無名)';
      btn.addEventListener('click', () => {
        if (editing) commitEditor(); // 編集内容を捨てずにタブを移る
        state.activeTabId = tab.id;
        persist();
        renderAll();
      });
      tabRow.appendChild(btn);
    });

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'chat-palette-tab-add';
    addBtn.textContent = '+';
    addBtn.title = 'タブを追加';
    addBtn.addEventListener('click', () => {
      if (editing) commitEditor();
      const tab = createTab();
      state.tabs.push(tab);
      state.activeTabId = tab.id;
      persist();
      renderAll();
    });
    tabRow.appendChild(addBtn);

    // 最後の1枚は消せない（タブが0枚だと名前も本文も置き場所が無くなるため）
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'chat-palette-tab-remove';
    removeBtn.textContent = '×';
    removeBtn.title = '表示中のタブを削除';
    removeBtn.disabled = state.tabs.length <= 1;
    removeBtn.addEventListener('click', () => {
      const tab = activeTab();
      if (state.tabs.length <= 1) return;
      if (!confirm(`タブ「${tab.name.trim() || '(無名)'}」を削除します。よろしいですか？`)) return;
      state.tabs = state.tabs.filter(t => t.id !== tab.id);
      state.activeTabId = state.tabs[0].id;
      editing = false;
      persist();
      renderAll();
    });
    tabRow.appendChild(removeBtn);
  }

  function renderNameStatus() {
    const name = nameInput.value.trim();
    if (name === '') {
      nameStatus.textContent = '発言者なし';
      nameStatus.className = 'chat-palette-name-status';
      return;
    }
    const token = findTokenByName(name);
    if (token) {
      nameStatus.textContent = 'このコマとして送信';
      nameStatus.className = 'chat-palette-name-status is-matched';
    } else {
      nameStatus.textContent = 'この名前で発言';
      nameStatus.className = 'chat-palette-name-status is-plain';
    }
  }

  function renderList() {
    listEl.innerHTML = '';

    const lines = parseChatPaletteLines(activeTab().text);
    if (lines.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'chat-palette-empty';
      empty.textContent = 'フレーズが登録されていません。「編集」から追加できます。';
      listEl.appendChild(empty);
      return;
    }

    lines.forEach(line => {
      const row = document.createElement('div');
      row.className = 'chat-palette-line';
      row.textContent = line;
      row.title = line;
      row.addEventListener('click', () => {
        onSend({ text: line, name: nameInput.value });
      });
      listEl.appendChild(row);
    });
  }

  // 編集内容を確定してタブへ書き戻す。タブ切り替え・タブ追加でも呼ぶので、
  // 編集途中の内容が黙って消えることはない。
  function commitEditor() {
    activeTab().text = editorEl.value;
    editing = false;
    persist();
  }

  function renderEditState() {
    listEl.style.display = editing ? 'none' : '';
    editorEl.style.display = editing ? '' : 'none';
    editBtn.textContent = editing ? '完了' : '編集';
    if (editing) editorEl.value = activeTab().text;
  }

  function renderAll() {
    const tab = activeTab();
    nameInput.value = tab.name;
    renderTabs();
    renderNameStatus();
    renderList();
    renderEditState();
  }

  // ---- イベント ----

  nameInput.addEventListener('input', () => {
    activeTab().name = nameInput.value;
    persist();
    renderNameStatus();
    renderTabs(); // タブの見出しは名前なので一緒に追従させる
  });

  editBtn.addEventListener('click', () => {
    if (editing) {
      commitEditor();
    } else {
      editing = true;
    }
    renderEditState();
    if (!editing) renderList();
  });

  const sendFromInput = () => {
    const text = sendInput.value;
    if (text.trim() === '') return;
    onSend({ text, name: nameInput.value, onSent: () => { sendInput.value = ''; } });
  };

  sendBtn.addEventListener('click', sendFromInput);
  // メインのチャット欄と同じ操作感に揃える（Shift+Enterで改行、IME変換中は無視）
  sendInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      sendFromInput();
    }
  });

  exportBtn.addEventListener('click', () => {
    if (editing) commitEditor();
    downloadJSON('chat-palette.json', {
      __format: CHAT_PALETTE_FORMAT,
      tabs: state.tabs.map(({ name, text }) => ({ name, text }))
    });
    renderAll();
  });

  importBtn.addEventListener('click', async () => {
    const picked = await pickFileAsText({ accept: 'application/json' });
    if (!picked) return;

    const json = parseJsonText(picked.text);
    if (!json) return;
    if (json.__format !== CHAT_PALETTE_FORMAT || !Array.isArray(json.tabs)) {
      alert('チャットパレットのファイルではありません。');
      return;
    }
    if (!confirm('現在のチャットパレット（全タブ）を、読み込んだ内容で置き換えます。よろしいですか？')) {
      return;
    }

    state = normalizeState({ tabs: json.tabs });
    editing = false;
    persist();
    renderAll();
  });

  renderAll();

  // 名前とコマの対応は他クライアントの操作でも変わるため、外から再判定できるようにしておく
  return { refreshNameStatus: renderNameStatus };
}
