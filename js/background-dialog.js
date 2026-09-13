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

import { buildImageField } from './image-field.js';
import { loadImageDimensions } from './image-dimensions.js';
import { createDialogHost, appendConfirmRow } from './dialog-host.js';

const ensureDialog = createDialogHost();

/**
 * @param {{
 *   initialImage?: string | null,
 *   initialImageKey?: string | null,
 *   initialCols?: number | null,  null＝広さが未指定の部屋（以前の「自動」）。数値欄にはfallbackを出す
 *   initialRows?: number | null,
 *   fallbackCols?: number,        広さが未指定のときに数値欄へ初期表示する、今の実サイズ
 *   fallbackRows?: number,
 *   initialShowGrid?: boolean,
 *   initialKeepOnSceneChange?: boolean,
 *   usedImages?: Set<string>, この部屋で使っている画像（セレクタの再利用一覧に並べる）
 *   gridSize: number,
 *   onConfirm: (result: {
 *     imageUrl: string | null, imageKey: string | null,
 *     boardWidth: number, boardHeight: number,
 *     showGrid: boolean, keepOnSceneChange: boolean
 *   }) => void
 * }} options
 *   boardWidth/boardHeightはマス数×gridSizeへ変換した後のピクセルサイズ。常に数値で返す。
 */
export function showBackgroundDialog({
  initialImage = null, initialImageKey = null,
  initialCols = null, initialRows = null,
  fallbackCols = 20, fallbackRows = 15,
  initialShowGrid = true, initialKeepOnSceneChange = false,
  usedImages = new Set(),
  gridSize, onConfirm
}) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';


  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = '背景設定';
  form.appendChild(heading);

  const note = document.createElement('p');
  note.className = 'audio-note';
  note.textContent = '背景画像と盤面の広さを設定します。画像を選ばずに広さだけ変えることもできます。';
  form.appendChild(note);

  // --- 画像 ---
  // 選ぶ手続きはセレクタ（js/image-selector-dialog.js）が持つ。返ってくるのは
  // 置き場へ送り終えた確定URLとキーなので、下の「適用」は従来どおり同期のまま
  // 1回のdispatchで済む。
  const imageField = buildImageField({
    label: '背景画像',
    purpose: 'background',
    initialImage,
    initialKey: initialImageKey,
    usedImages,
    selectorTitle: '背景画像を選ぶ',
    onPicked: async (picked) => {
      // 画像の実サイズをマス換算してサイズ欄へ自動反映。
      const dim = (picked.width && picked.height)
        ? { width: picked.width, height: picked.height }
        : await loadImageDimensions(picked.url);
      if (dim) {
        colsInput.value = Math.max(1, Math.round(dim.width / gridSize));
        rowsInput.value = Math.max(1, Math.round(dim.height / gridSize));
        // 縦横比の基準は、マス数へ丸める前の画像の実寸で持つ（丸めた後の値を基準にすると、
        // 幅を変えるたびに画像の比からずれていく）
        aspect = { width: dim.width, height: dim.height };
        aspectCells = { cols: Number(colsInput.value), rows: Number(rowsInput.value) };
      }
    }
  });
  form.appendChild(imageField.element);

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

  // --- 縦横比を固定する ---
  // ONの間は、幅を変えると高さが、高さを変えると幅が、基準の比に合わせて動く（端数は四捨五入）。
  // 基準の比はONにした時点の幅×高さ。画像を選び直したときはその画像の実寸に置き換える。
  // 比は変えるたびに測り直さない：丸めた値から測り直すと、動かすたびに比がずれていくため。
  // ダイアログの中だけの補助で、状態には何も残さない。
  let aspect = null; // { width, height }
  // 基準の比を決めたときの欄の値。画像を選んだあとに欄を触らずONにしたなら、
  // 丸めたマス数ではなく画像の実寸の比を使い続けるための目印。
  let aspectCells = null; // { cols, rows }
  const aspectGroup = document.createElement('div');
  aspectGroup.className = 'dialog-form-group';
  const aspectLabel = document.createElement('label');
  aspectLabel.style.display = 'flex';
  aspectLabel.style.alignItems = 'center';
  aspectLabel.style.gap = '6px';
  aspectLabel.style.cursor = 'pointer';
  aspectLabel.title = '幅と高さの一方を変えると、もう一方が今の縦横比に合わせて変わります（端数は四捨五入）。';
  const aspectInput = document.createElement('input');
  aspectInput.type = 'checkbox';
  aspectInput.checked = false;
  aspectLabel.appendChild(aspectInput);
  aspectLabel.appendChild(document.createTextNode('縦横比を固定する'));
  aspectGroup.appendChild(aspectLabel);
  form.appendChild(aspectGroup);

  const readCells = (input) => Math.round(Number(input.value));
  aspectInput.addEventListener('change', () => {
    const cols = readCells(colsInput);
    const rows = readCells(rowsInput);
    if (!aspectInput.checked) return;
    if (aspect && aspectCells?.cols === cols && aspectCells?.rows === rows) return;
    aspect = cols >= 1 && rows >= 1 ? { width: cols, height: rows } : null;
    aspectCells = aspect ? { cols, rows } : null;
  });
  // 空欄や0を打っている途中では、相手の欄を動かさない（消して打ち直すたびに1へ潰れるため）
  colsInput.addEventListener('input', () => {
    const cols = readCells(colsInput);
    if (!aspectInput.checked || !aspect || !(cols >= 1)) return;
    rowsInput.value = Math.max(1, Math.round(cols * aspect.height / aspect.width));
    aspectCells = { cols, rows: Number(rowsInput.value) };
  });
  rowsInput.addEventListener('input', () => {
    const rows = readCells(rowsInput);
    if (!aspectInput.checked || !aspect || !(rows >= 1)) return;
    colsInput.value = Math.max(1, Math.round(rows * aspect.width / aspect.height));
    aspectCells = { cols: Number(colsInput.value), rows };
  });

  // 今の背景画像があって、欄の値がその実寸どおりのマス数なら、比の基準を画像の実寸にしておく
  // （ONにしたときに丸めたマス数の比にならないように）。欄を自分で変えた盤面なら何もしない。
  if (initialImage) {
    const startCols = readCells(colsInput);
    const startRows = readCells(rowsInput);
    loadImageDimensions(initialImage).then((dim) => {
      if (!dim || aspect) return;
      if (Math.max(1, Math.round(dim.width / gridSize)) !== startCols) return;
      if (Math.max(1, Math.round(dim.height / gridSize)) !== startRows) return;
      aspect = { width: dim.width, height: dim.height };
      aspectCells = { cols: startCols, rows: startRows };
    });
  }

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
  appendConfirmRow(form, {
    confirmLabel: '適用',
    onCancel: () => dialog.close()
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const cols = Math.max(1, Math.round(Number(colsInput.value) || fallbackCols));
    const rows = Math.max(1, Math.round(Number(rowsInput.value) || fallbackRows));

    dialog.close();
    onConfirm({
      imageUrl: imageField.getImage(),
      imageKey: imageField.getKey(),
      boardWidth: cols * gridSize,
      boardHeight: rows * gridSize,
      showGrid: gridInput.checked,
      keepOnSceneChange: keepInput.checked
    });
  });

  dialog.appendChild(form);
  dialog.showModal();
}
