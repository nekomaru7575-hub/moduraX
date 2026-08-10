// js/panel-dialog.js
// パネル（マップタイル状オブジェクト）の追加・編集ダイアログ。
// 画像・サイズ（幅・高さ、マス単位）・パネル同士の重なり順を指定する。画像がまだ無いパネルで画像を選ぶと、
// その実サイズをマス換算した近似値をサイズ欄に自動反映する（あとから手で変更可）。
// すでに画像があるパネルの編集では、画像を差し替えてもサイズは変えない。
// 固定・テキストの公開先はここではなくパネルの右クリックメニューから設定する。

import { pickAndUploadImage } from './image-upload.js';
import { loadImageDimensions } from './image-dimensions.js';

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
 *   title?: string,
 *   initialImage?: string | null,
 *   initialText?: string,
 *   initialCols?: number,
 *   initialRows?: number,
 *   initialStackOrder?: number,
 *   initialKeepOnSceneChange?: boolean,
 *   gridSize: number,
 *   onConfirm: (result: {
 *     image: string | null, text: string, cols: number, rows: number,
 *     stackOrder: number, keepOnSceneChange: boolean
 *   }) => void
 * }} options
 */
export function showPanelDialog({
  title = 'パネルを追加', initialImage = null, initialText = '', initialCols = 2, initialRows = 2,
  initialStackOrder = 0, initialKeepOnSceneChange = false, gridSize, onConfirm
}) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  let currentImage = initialImage || null;

  // すでに画像を持つパネルの編集では、画像を選び直してもサイズ欄へは自動反映しない
  // （＝盤面上のパネルの大きさを変えない）。サイズを変えたいときは手で入力する。
  const autoSizeFromImage = !currentImage;

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

    // 画像の実サイズをマス換算してサイズ欄へ自動反映（新規追加時のみ）
    if (!autoSizeFromImage) return;
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

  // --- 重なり順 ---
  // パネル同士の前後だけを決める値（コマは常にパネルより手前のまま）。
  // 実際の描き分けはjs/board-data-driven.jsが行う。
  const stackGroup = document.createElement('div');
  stackGroup.className = 'dialog-form-group';
  const stackLabel = document.createElement('label');
  stackLabel.textContent = '重なり順';
  stackLabel.title = '小さいほど下、大きいほど上に重なります。同じ数値なら後から追加したパネルが上になります。';
  const stackInput = document.createElement('input');
  stackInput.type = 'number';
  stackInput.min = '0';
  stackInput.step = '1';
  stackInput.required = true;
  stackInput.value = initialStackOrder;
  stackGroup.appendChild(stackLabel);
  stackGroup.appendChild(stackInput);
  form.appendChild(stackGroup);

  // --- シーンチェンジで残す ---
  // 既定はオフ（＝従来どおり、シーンへ遷移するとパネルは総入れ替えになる）。
  const keepGroup = document.createElement('div');
  keepGroup.className = 'dialog-form-group';
  const keepLabel = document.createElement('label');
  keepLabel.style.display = 'flex';
  keepLabel.style.alignItems = 'center';
  keepLabel.style.gap = '6px';
  keepLabel.style.cursor = 'pointer';
  keepLabel.title = '他のシーンへ移動してもこのパネルは盤面に残ります（シーンには保存されません）。';
  const keepInput = document.createElement('input');
  keepInput.type = 'checkbox';
  keepInput.checked = !!initialKeepOnSceneChange;
  keepLabel.appendChild(keepInput);
  keepLabel.appendChild(document.createTextNode('シーンチェンジで残す'));
  keepGroup.appendChild(keepLabel);
  form.appendChild(keepGroup);

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
    // 0は有効な値なので、空欄・非数のときだけ元の値へ戻す（|| だと0が弾かれてしまう）
    const rawStackOrder = Number(stackInput.value);
    const stackOrder = Math.max(0, Math.round(
      Number.isFinite(rawStackOrder) ? rawStackOrder : initialStackOrder
    ));
    dialog.close();
    onConfirm({
      image: currentImage, text: textInput.value, cols, rows, stackOrder,
      keepOnSceneChange: keepInput.checked
    });
  });

  dialog.appendChild(form);
  dialog.showModal();
}
