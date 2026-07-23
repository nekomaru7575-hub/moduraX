// js/background-dialog.js
// 背景画像アップロード時に、ボードサイズ（マス単位の幅・高さ）を確認・調整するための
// 小さなダイアログ。初期値は画像の実サイズをマス換算した近似値だが、数値は自由に変更できる。

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
 *   naturalWidth: number, naturalHeight: number, gridSize: number,
 *   onConfirm: (result: { width: number, height: number }) => void
 * }} options naturalWidth/naturalHeightは画像の実ピクセルサイズ、gridSizeはマス1つのpx数。
 *   onConfirmにはマス数×gridSizeへ変換した後のピクセルサイズを渡す。
 */
export function showBackgroundSizeDialog({ naturalWidth, naturalHeight, gridSize, onConfirm }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const defaultCols = Math.max(1, Math.round(naturalWidth / gridSize));
  const defaultRows = Math.max(1, Math.round(naturalHeight / gridSize));

  const form = document.createElement('form');

  const title = document.createElement('h3');
  title.textContent = 'ボードサイズを設定';
  form.appendChild(title);

  const note = document.createElement('p');
  note.style.cssText = 'margin: 0 0 12px; font-size: 0.85rem; color: #aaa;';
  note.textContent = '画像の実サイズをマス換算した近似値を初期値にしています。必要に応じて変更してください。';
  form.appendChild(note);

  const widthGroup = document.createElement('div');
  widthGroup.className = 'dialog-form-group';
  const widthLabel = document.createElement('label');
  widthLabel.textContent = '幅（マス）';
  const widthInput = document.createElement('input');
  widthInput.type = 'number';
  widthInput.min = '1';
  widthInput.required = true;
  widthInput.value = defaultCols;
  widthGroup.appendChild(widthLabel);
  widthGroup.appendChild(widthInput);
  form.appendChild(widthGroup);

  const heightGroup = document.createElement('div');
  heightGroup.className = 'dialog-form-group';
  const heightLabel = document.createElement('label');
  heightLabel.textContent = '高さ（マス）';
  const heightInput = document.createElement('input');
  heightInput.type = 'number';
  heightInput.min = '1';
  heightInput.required = true;
  heightInput.value = defaultRows;
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
    const cols = Number(widthInput.value) || defaultCols;
    const rows = Number(heightInput.value) || defaultRows;
    dialog.close();
    onConfirm({ width: cols * gridSize, height: rows * gridSize });
  });

  dialog.appendChild(form);
  dialog.showModal();
  widthInput.focus();
}
