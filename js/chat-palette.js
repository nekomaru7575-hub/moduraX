// js/chat-palette.js
// チャットパレット：ユーザ(ブラウザ)ごとによく使うフレーズを保存し、
// クリックだけで即座に送信できるようにする機能。
// 保存内容は改行区切りのプレーンテキスト1本。1行＝1フレーズ＝1ボタンとして扱う
// （ラベルと送信内容を分けない）。テキストとして自由に編集できるようにするため。

const STORAGE_KEY = 'chatPalette';

export function loadChatPaletteText() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveChatPaletteText(text) {
  try {
    localStorage.setItem(STORAGE_KEY, text);
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

let editDialogEl = null;

function ensureEditDialog() {
  if (editDialogEl) return editDialogEl;
  editDialogEl = document.createElement('dialog');
  editDialogEl.className = 'character-dialog chat-palette-editor-dialog';
  document.body.appendChild(editDialogEl);
  return editDialogEl;
}

function showChatPaletteEditor({ onSave }) {
  const dialog = ensureEditDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const title = document.createElement('h3');
  title.textContent = 'チャットパレットを編集';
  form.appendChild(title);

  const hint = document.createElement('p');
  hint.className = 'chat-palette-editor-hint';
  hint.textContent = '1行につき1フレーズです。空行は保存時に無視されます。';
  form.appendChild(hint);

  const textarea = document.createElement('textarea');
  textarea.className = 'chat-palette-editor-textarea';
  textarea.value = loadChatPaletteText();
  form.appendChild(textarea);

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', () => dialog.close());

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = '保存';
  saveBtn.className = 'dialog-confirm-btn';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  form.appendChild(btnRow);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    saveChatPaletteText(textarea.value);
    dialog.close();
    onSave();
  });

  dialog.appendChild(form);
  dialog.showModal();
}

/**
 * パレットのボタン一覧を描画する。編集後は自動で再描画される。
 * @param {{ container: HTMLElement, onSend: (text: string) => void }} options
 */
export function renderChatPalette({ container, onSend }) {
  container.innerHTML = '';

  const listEl = document.createElement('div');
  listEl.className = 'chat-palette-list';

  const lines = parseChatPaletteLines(loadChatPaletteText());
  if (lines.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'chat-palette-empty';
    empty.textContent = 'フレーズが登録されていません。「編集」から追加できます。';
    listEl.appendChild(empty);
  } else {
    lines.forEach(line => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-palette-btn';
      btn.textContent = line;
      btn.title = line;
      btn.addEventListener('click', () => onSend(line));
      listEl.appendChild(btn);
    });
  }

  container.appendChild(listEl);

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'chat-palette-edit-btn';
  editBtn.textContent = '編集';
  editBtn.addEventListener('click', () => {
    showChatPaletteEditor({
      onSave: () => renderChatPalette({ container, onSend })
    });
  });
  container.appendChild(editBtn);
}
