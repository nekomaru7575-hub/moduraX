// js/room-entry-dialog.js
// 入室パスワードの入力ダイアログ。サーバーがパスワードを求めてきたとき
// （js/net-sync.jsのENTRY_REQUIRED / ENTRY_REJECTED）に開く。
// dumbな部品：保存も再送もしない。入力された値を呼び出し側へ渡すだけ。
//
// このダイアログが出ている間、部屋の中身はまだ何も届いていない（サーバーがINITを
// 送っていない）。キャンセルの行き先は部屋一覧しかないので、閉じるボタンは置かない。

import { createDialogHost, appendConfirmRow } from './dialog-host.js';

const ensureDialog = createDialogHost();

/**
 * @param {{
 *   password: string 前回入力した値（初期値として出す）,
 *   error: boolean 直前の入力が違っていたか,
 *   onSubmit: (password: string) => void
 * }} options
 */
export function showRoomEntryDialog({ password = '', error = false, onSubmit }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = 'この部屋には入室パスワードが設定されています';
  form.appendChild(heading);

  if (error) {
    const warn = document.createElement('p');
    warn.className = 'audio-note audio-note-warn';
    warn.textContent = 'パスワードが違います。もう一度入力してください。';
    form.appendChild(warn);
  }

  const note = document.createElement('p');
  note.className = 'audio-note';
  note.textContent = 'GMから教わったパスワードを入力してください。'
    + '入力したパスワードはこのブラウザに保存され、次からは自動で入室します。';
  form.appendChild(note);

  const group = document.createElement('div');
  group.className = 'dialog-form-group';
  const label = document.createElement('label');
  label.textContent = '入室パスワード';
  const input = document.createElement('input');
  input.type = 'password';
  input.value = password;
  group.appendChild(label);
  group.appendChild(input);
  form.appendChild(group);

  appendConfirmRow(form, {
    confirmLabel: '入室',
    cancelLabel: '部屋一覧へ戻る',
    onCancel: () => { window.location.href = '/'; }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    dialog.close();
    onSubmit(value);
  });

  dialog.appendChild(form);
  if (!dialog.open) dialog.showModal();
  input.focus();
}

export function closeRoomEntryDialog() {
  ensureDialog.closeIfOpen();
}
