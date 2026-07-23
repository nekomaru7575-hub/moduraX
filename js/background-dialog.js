// js/background-dialog.js
// 背景画像アップロード時に、ボードサイズ（幅・高さ）を確認・調整するための小さなダイアログ。
// 初期値はアップロードした画像の実サイズだが、数値は自由に変更できる。

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

/**
 * @param {{
 *   naturalWidth: number, naturalHeight: number,
 *   onConfirm: (result: { width: number, height: number }) => void
 * }} options
 */
export function showBackgroundSizeDialog({ naturalWidth, naturalHeight, onConfirm }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const title = document.createElement('h3');
  title.textContent = 'ボードサイズを設定';
  form.appendChild(title);

  const note = document.createElement('p');
  note.style.cssText = 'margin: 0 0 12px; font-size: 0.85rem; color: #aaa;';
  note.textContent = '画像の実サイズを初期値にしています。必要に応じて数値を変更してください。';
  form.appendChild(note);

  const widthGroup = document.createElement('div');
  widthGroup.className = 'dialog-form-group';
  const widthLabel = document.createElement('label');
  widthLabel.textContent = '幅（px）';
  const widthInput = document.createElement('input');
  widthInput.type = 'number';
  widthInput.min = '50';
  widthInput.required = true;
  widthInput.value = naturalWidth;
  widthGroup.appendChild(widthLabel);
  widthGroup.appendChild(widthInput);
  form.appendChild(widthGroup);

  const heightGroup = document.createElement('div');
  heightGroup.className = 'dialog-form-group';
  const heightLabel = document.createElement('label');
  heightLabel.textContent = '高さ（px）';
  const heightInput = document.createElement('input');
  heightInput.type = 'number';
  heightInput.min = '50';
  heightInput.required = true;
  heightInput.value = naturalHeight;
  heightGroup.appendChild(heightLabel);
  heightGroup.appendChild(heightInput);
  form.appendChild(heightGroup);

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', () => dialog.close());

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'submit';
  confirmBtn.textContent = '適用';
  confirmBtn.className = 'dialog-confirm-btn';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  form.appendChild(btnRow);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const width = Number(widthInput.value) || naturalWidth;
    const height = Number(heightInput.value) || naturalHeight;
    dialog.close();
    onConfirm({ width, height });
  });

  dialog.appendChild(form);
  dialog.showModal();
  widthInput.focus();
}
