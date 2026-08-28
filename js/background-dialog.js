// js/background-dialog.js
// 盤面の「背景設定」ダイアログ。背景画像・盤面サイズ・シーンチェンジでの扱いを
// 1枚で決める（盤外の右クリックメニューから開く。js/board-data-driven.js参照）。
//
// 以前は「背景画像を変更」を押すといきなりファイル選択が開き、選び終わってから
// サイズ確認だけが出る作りだった。そのため「画像を選ばずに盤面だけ広げる」「背景を消す」
// といった操作に入口が無く、サイズの初期値も今の盤面ではなく選んだ画像の実サイズだった。
//
// 適用は1回のdispatch（SET_BOARD_BACKGROUND）にまとめる。分けて投げると、他クライアントに
// 「新しい画像＋古いサイズ」という中間状態が見えるため（APPLY_SCENEと同じ理由）。

import { pickAndUploadImage } from './image-upload.js';
import { loadImageDimensions } from './image-dimensions.js';
import { createDialogHost } from './dialog-host.js';

const ensureDialog = createDialogHost();

/**
 * @param {{
 *   initialImage?: string | null,
 *   initialImageKey?: string | null,
 *   initialCols?: number | null,  null＝自動（ビューポートに合わせる）
 *   initialRows?: number | null,
 *   fallbackCols?: number,        自動のときに数値欄へ初期表示する、今の実サイズ
 *   fallbackRows?: number,
 *   initialShowGrid?: boolean,
 *   initialKeepOnSceneChange?: boolean,
 *   gridSize: number,
 *   onConfirm: (result: {
 *     imageUrl: string | null, imageKey: string | null,
 *     boardWidth: number | null, boardHeight: number | null,
 *     showGrid: boolean, keepOnSceneChange: boolean
 *   }) => void
 * }} options
 *   boardWidth/boardHeightはマス数×gridSizeへ変換した後のピクセルサイズ（自動ならnull）。
 */
export function showBackgroundDialog({
  initialImage = null, initialImageKey = null,
  initialCols = null, initialRows = null,
  fallbackCols = 20, fallbackRows = 15,
  initialShowGrid = true, initialKeepOnSceneChange = false,
  gridSize, onConfirm
}) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  // 画像はURLとキーの組で持ち回る。キーはR2に実体がある場合のみ（データURLへ退避した
  // 場合はnull）で、状態のbackgroundImageKeyへそのまま入る。
  let currentImage = initialImage || null;
  let currentImageKey = initialImageKey || null;

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = '背景設定';
  form.appendChild(heading);

  const note = document.createElement('p');
  note.className = 'audio-note';
  note.textContent = '背景画像と盤面の広さを設定します。画像を選ばずに広さだけ変えることもできます。';
  form.appendChild(note);

  // --- 画像 ---
  const imageGroup = document.createElement('div');
  imageGroup.className = 'dialog-form-group';
  const imageLabel = document.createElement('label');
  imageLabel.textContent = '背景画像';
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
    // R2へ上げてURLだけを状態に載せる（使えない環境ではデータURLへ退避。
    // js/image-upload.jsのpickAndUploadImage参照）
    const picked = await pickAndUploadImage({ purpose: 'background' });
    if (!picked) return;
    currentImage = picked.url;
    currentImageKey = picked.key ?? null;
    preview.src = currentImage;
    preview.style.display = 'block';

    // 画像の実サイズをマス換算してサイズ欄へ自動反映。
    // 自動のままでも盤面はこの大きさになる（js/board-data-driven.jsの
    // resolveBoardPixelSize）ので、入力欄が無効の間も実際の値として見せておく。
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
    currentImageKey = null;
    preview.removeAttribute('src');
    preview.style.display = 'none';
  });
  imageBtnRow.appendChild(clearBtn);

  imageGroup.appendChild(imageBtnRow);
  form.appendChild(imageGroup);

  // --- 盤面サイズを自動にする ---
  // ONの間はboardWidth/boardHeightをnullにして、盤面側の判断に任せる（既定の状態）。
  // 背景画像があればその実サイズ、無ければウィンドウの大きさになる
  // （js/board-data-driven.jsのresolveBoardPixelSize）。画像があるときにウィンドウ基準に
  // すると、PCとスマホで盤面の縦横比が変わって画像だけが歪むため。
  const autoGroup = document.createElement('div');
  autoGroup.className = 'dialog-form-group';
  const autoLabel = document.createElement('label');
  autoLabel.style.display = 'flex';
  autoLabel.style.alignItems = 'center';
  autoLabel.style.gap = '6px';
  autoLabel.style.cursor = 'pointer';
  autoLabel.title = '盤面の広さを画面の大きさに合わせます。オフにすると下の数値で固定します。';
  const autoInput = document.createElement('input');
  autoInput.type = 'checkbox';
  autoInput.checked = initialCols === null || initialRows === null;
  autoLabel.appendChild(autoInput);
  autoLabel.appendChild(document.createTextNode('盤面サイズを自動にする（画面に合わせる）'));
  autoGroup.appendChild(autoLabel);
  form.appendChild(autoGroup);

  // --- 幅（マス） ---
  const colsGroup = document.createElement('div');
  colsGroup.className = 'dialog-form-group';
  const colsLabel = document.createElement('label');
  colsLabel.textContent = '幅（マス）';
  const colsInput = document.createElement('input');
  colsInput.type = 'number';
  colsInput.min = '1';
  colsInput.step = '1';
  colsInput.value = initialCols ?? fallbackCols;
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
  rowsInput.value = initialRows ?? fallbackRows;
  rowsGroup.appendChild(rowsLabel);
  rowsGroup.appendChild(rowsInput);
  form.appendChild(rowsGroup);

  const syncSizeInputs = () => {
    colsInput.disabled = autoInput.checked;
    rowsInput.disabled = autoInput.checked;
  };
  autoInput.addEventListener('change', syncSizeInputs);
  syncSizeInputs();

  // --- マス目を描画する ---
  // 既定はあり。地図画像に元からマス目が描かれている場合など、二重に見えるときに外す。
  const gridGroup = document.createElement('div');
  gridGroup.className = 'dialog-form-group';
  const gridLabel = document.createElement('label');
  gridLabel.style.display = 'flex';
  gridLabel.style.alignItems = 'center';
  gridLabel.style.gap = '6px';
  gridLabel.style.cursor = 'pointer';
  gridLabel.title = '盤面に敷くマス目（グリッド線）の表示です。コマの吸着は外しても変わりません。';
  const gridInput = document.createElement('input');
  gridInput.type = 'checkbox';
  gridInput.checked = initialShowGrid !== false;
  gridLabel.appendChild(gridInput);
  gridLabel.appendChild(document.createTextNode('マス目を描画する'));
  gridGroup.appendChild(gridLabel);
  form.appendChild(gridGroup);

  // --- シーンチェンジで残す ---
  // 既定はオフ（＝従来どおり、シーンへ遷移すると背景と盤面サイズが切り替わる）。
  const keepGroup = document.createElement('div');
  keepGroup.className = 'dialog-form-group';
  const keepLabel = document.createElement('label');
  keepLabel.style.display = 'flex';
  keepLabel.style.alignItems = 'center';
  keepLabel.style.gap = '6px';
  keepLabel.style.cursor = 'pointer';
  keepLabel.title = 'シーンを移動しても背景と盤面サイズを変えません（シーンには保存されます）。';
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
    const auto = autoInput.checked;
    const cols = Math.max(1, Math.round(Number(colsInput.value) || fallbackCols));
    const rows = Math.max(1, Math.round(Number(rowsInput.value) || fallbackRows));

    dialog.close();
    onConfirm({
      imageUrl: currentImage,
      imageKey: currentImageKey,
      boardWidth: auto ? null : cols * gridSize,
      boardHeight: auto ? null : rows * gridSize,
      showGrid: gridInput.checked,
      keepOnSceneChange: keepInput.checked
    });
  });

  dialog.appendChild(form);
  dialog.showModal();
}
