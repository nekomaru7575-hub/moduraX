// js/log-clear-dialog.js
// 全タブのログを消す前の確認ダイアログ。ルームメニューの「ログを消去」から呼ばれる。
// dumbな部品：実際の消去（dispatch）は呼び出し側のコールバックに任せる
// （js/room-delete-dialog.jsと同じ作り）。

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

/**
 * @param {{ onConfirm: () => void }} options
 */
export function showLogClearConfirmDialog({ onConfirm }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');
  form.method = 'dialog';

  const heading = document.createElement('h3');
  heading.textContent = 'ログの消去';
  form.appendChild(heading);

  const message = document.createElement('p');
  message.textContent = '一度消すと戻せません、本当に消去しますか？';
  form.appendChild(message);

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  // 「いいえ」はsubmit（form method="dialog"）なので、押すと閉じるだけで何も起きない
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'submit';
  cancelBtn.textContent = 'いいえ';

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'dialog-danger-btn';
  confirmBtn.textContent = 'はい';
  confirmBtn.addEventListener('click', () => {
    dialog.close();
    onConfirm();
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  form.appendChild(btnRow);

  dialog.appendChild(form);
  dialog.showModal();
}
