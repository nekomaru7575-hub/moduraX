// js/panel-dialog.js
// パネル（マップタイル状オブジェクト）の追加・編集ダイアログ。
// 画像とサイズ（幅・高さ、マス単位）を指定する。画像を選ぶと、その実サイズを
// マス換算した近似値をサイズ欄に自動反映する（あとから手で変更可）。

import { pickAndUploadImage } from './image-upload.js';

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

// data URLの画像の実ピクセルサイズを取得する
function loadImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * @param {{
 *   title?: string,
 *   initialImage?: string | null,
 *   initialText?: string,
 *   initialCols?: number,
 *   initialRows?: number,
 *   gridSize: number,
 *   onConfirm: (result: { image: string | null, text: string, cols: number, rows: number }) => void
 * }} options
 */
export function showPanelDialog({
  title = 'パネルを追加', initialImage = null, initialText = '', initialCols = 2, initialRows = 2, gridSize, onConfirm
}) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  let currentImage = initialImage || null;

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = title;
  form.appendChild(heading);

  // --- 画像 ---
  const imageGroup = document.createElement('div');
  imageGroup.className = 'dialog-form-group';
  const imageLabel = document.createElement('label');
  imageLabel.textContent = '画像';
  imageGroup.appendChild(imageLabel);

  const preview = document.createElement('img');
  preview.className = 'dialog-image-preview';
  preview.style.display = currentImage ? 'block' : 'none';
  if (currentImage) preview.src = currentImage;
  imageGroup.appendChild(preview);

  const imageBtnRow = document.createElement('div');
  imageBtnRow.className = 'dialog-custom-row';

  const pickBtn = document.createElement('button');
  pickBtn.type = 'button';
  pickBtn.textContent = '画像を選択';
  pickBtn.className = 'dialog-add-row-btn';
  pickBtn.style.marginBottom = '0';
  pickBtn.addEventListener('click', async () => {
    // R2へ上げてURLだけを状態に持つ（データURLのままだと、シーンがパネルを写し取る都合で
    // シーンの数だけ画像が部屋データに積み上がる。js/image-upload.js参照）
    const picked = await pickAndUploadImage({ purpose: 'panel' });
    if (!picked) return;
    currentImage = picked.url;
    preview.src = currentImage;
    preview.style.display = 'block';

    // 画像の実サイズをマス換算してサイズ欄へ自動反映
    const dim = await loadImageDimensions(currentImage);
    if (dim) {
      colsInput.value = Math.max(1, Math.round(dim.width / gridSize));
      rowsInput.value = Math.max(1, Math.round(dim.height / gridSize));
    }
  });
  imageBtnRow.appendChild(pickBtn);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.textContent = '画像を削除';
  clearBtn.className = 'dialog-remove-row';
  clearBtn.addEventListener('click', () => {
    currentImage = null;
    preview.removeAttribute('src');
    preview.style.display = 'none';
  });
  imageBtnRow.appendChild(clearBtn);

  imageGroup.appendChild(imageBtnRow);
  form.appendChild(imageGroup);

  // --- マウスオーバーテキスト ---
  const textGroup = document.createElement('div');
  textGroup.className = 'dialog-form-group';
  const textLabel = document.createElement('label');
  textLabel.textContent = 'マウスオーバーテキスト';
  const textInput = document.createElement('textarea');
  textInput.rows = 4;
  textInput.value = initialText || '';
  textInput.placeholder = 'パネルにカーソルを合わせたときに表示するテキスト';
  textGroup.appendChild(textLabel);
  textGroup.appendChild(textInput);
  form.appendChild(textGroup);

  // --- 幅（マス） ---
  const colsGroup = document.createElement('div');
  colsGroup.className = 'dialog-form-group';
  const colsLabel = document.createElement('label');
  colsLabel.textContent = '幅（マス）';
  const colsInput = document.createElement('input');
  colsInput.type = 'number';
  colsInput.min = '1';
  colsInput.step = '1';
  colsInput.required = true;
  colsInput.value = initialCols;
  colsGroup.appendChild(colsLabel);
  colsGroup.appendChild(colsInput);
  form.appendChild(colsGroup);

  // --- 高さ（マス） ---
  const rowsGroup = document.createElement('div');
  rowsGroup.className = 'dialog-form-group';
  const rowsLabel = document.createElement('label');
  rowsLabel.textContent = '高さ（マス）';
  const rowsInput = document.createElement('input');
  rowsInput.type = 'number';
  rowsInput.min = '1';
  rowsInput.step = '1';
  rowsInput.required = true;
  rowsInput.value = initialRows;
  rowsGroup.appendChild(rowsLabel);
  rowsGroup.appendChild(rowsInput);
  form.appendChild(rowsGroup);

  // --- ボタン行 ---
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
    const cols = Math.max(1, Math.round(Number(colsInput.value) || initialCols));
    const rows = Math.max(1, Math.round(Number(rowsInput.value) || initialRows));
    dialog.close();
    onConfirm({ image: currentImage, text: textInput.value, cols, rows });
  });

  dialog.appendChild(form);
  dialog.showModal();
}
