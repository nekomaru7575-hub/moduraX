// js/room-delete-dialog.js
// 部屋削除の確認ダイアログ。ルーム設定の「部屋を削除」から呼ばれる。
// dumbな部品：削除の実処理（保存・削除リクエストの送信）はすべて呼び出し側のコールバックに任せる。

import { createDialogHost } from './dialog-host.js';

const ensureDialog = createDialogHost();

/**
 * @param {{
 *   onDelete: () => void,
 *   onSaveAndDelete: () => void | Promise<void>
 *     （書き出しにサーバーへの問い合わせが要るため非同期になりうる。ダイアログは待たないが、
 *       削除を書き出しより先に走らせないのは呼び出し側の責任。js/main.js参照）
 * }} options
 */
export function showRoomDeleteConfirmDialog({ onDelete, onSaveAndDelete }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');
  form.method = 'dialog';

  const heading = document.createElement('h3');
  heading.textContent = '部屋の削除';
  form.appendChild(heading);

  const message = document.createElement('p');
  message.textContent = '削除したら元に戻せません。本当に削除しますか？';
  form.appendChild(message);

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'submit';
  cancelBtn.textContent = 'いいえ';

  const saveAndDeleteBtn = document.createElement('button');
  saveAndDeleteBtn.type = 'button';
  saveAndDeleteBtn.className = 'dialog-confirm-btn';
  saveAndDeleteBtn.textContent = '部屋を保存し削除';
  saveAndDeleteBtn.addEventListener('click', () => {
    dialog.close();
    onSaveAndDelete();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'dialog-danger-btn';
  deleteBtn.textContent = 'はい';
  deleteBtn.addEventListener('click', () => {
    dialog.close();
    onDelete();
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveAndDeleteBtn);
  btnRow.appendChild(deleteBtn);
  form.appendChild(btnRow);

  dialog.appendChild(form);
  dialog.showModal();
}
