// js/log-edit-dialog.js
// 既に流れた発言の本文を書き直すダイアログ。ログ欄の右クリック（タッチは長押し）から開く。
// dumbな部品：実際の反映（dispatch）は呼び出し側（js/main.js）のコールバックに任せる
// （js/log-clear-dialog.jsと同じ作り）。
//
// 直せるのは本文だけで、キャラ名・発言時刻・コマンド・出目内訳は編集の対象にしない
// （js/game-store.jsのEDIT_CHAT_MESSAGE参照）。

import { createDialogHost, appendConfirmRow } from './dialog-host.js';

const ensureDialog = createDialogHost();

/**
 * @param {{ resultText: string, onConfirm: (resultText: string) => void }} options
 *   onConfirmは中身が実際に変わったときだけ呼ばれる。
 */
export function showLogEditDialog({ resultText = '', onConfirm }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = '発言を編集';
  form.appendChild(heading);

  const group = document.createElement('div');
  group.className = 'dialog-form-group';

  const label = document.createElement('label');
  label.textContent = '本文';
  const textarea = document.createElement('textarea');
  textarea.rows = 5;
  textarea.value = resultText;

  group.appendChild(label);
  group.appendChild(textarea);
  form.appendChild(group);

  // 黙って書き換わると同席者には何が起きたか分からないので、印が付くことを先に伝える
  const note = document.createElement('p');
  note.className = 'dialog-form-note';
  note.textContent = '部屋にいる全員のログが書き換わり、「(編集済み)」が付きます。';
  form.appendChild(note);

  appendConfirmRow(form, {
    confirmLabel: '変更',
    onCancel: () => dialog.close()
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    // 空にはできない。発言そのものを消したいのは編集ではないし、
    // 本文の無い行はログの中で誰の発言だったかも読み取れなくなる。
    const next = textarea.value;
    if (next.trim() === '') {
      textarea.focus();
      return;
    }

    dialog.close();
    if (next !== resultText) onConfirm(next);
  });

  dialog.appendChild(form);
  dialog.showModal();
  textarea.focus();
}
