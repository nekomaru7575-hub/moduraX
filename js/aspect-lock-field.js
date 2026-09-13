// js/aspect-lock-field.js
// ダイアログの「幅（マス）」「高さ（マス）」欄に添える「縦横比を固定する」チェックボックス。
// 背景設定（js/background-dialog.js）とパネル（js/panel-dialog.js）で同じものを使う。
//
// ONの間は、幅を変えると高さが、高さを変えると幅が、基準の比に合わせて動く（端数は四捨五入）。
// 基準の比はONにした時点の幅×高さ。ただし画像の実寸どおりのマス数になっている間は、
// 丸める前の画像の実寸の比を使う（丸めたマス数の比だと、動かすたびに画像の比からずれていく）。
// 比は変えるたびに測り直さない：丸めた値から測り直すと、動かすたびに比がずれていくため。
// ダイアログの中だけの補助で、状態には何も残さない。

import { loadImageDimensions } from './image-dimensions.js';

const readCells = (input) => Math.round(Number(input.value));

/**
 * @param {{
 *   colsInput: HTMLInputElement,
 *   rowsInput: HTMLInputElement,
 *   gridSize: number,
 *   initialImage?: string | null  今の画像。欄の値がその実寸どおりなら、比の基準を画像の実寸にする
 * }} options
 * @returns {{
 *   element: HTMLElement,
 *   useImageAspect: (dim: {width: number, height: number}) => void
 *     画像の実寸からマス数を欄へ入れた直後に呼ぶ。比の基準をその画像の実寸にする
 * }}
 */
export function buildAspectLockField({ colsInput, rowsInput, gridSize, initialImage = null }) {
  let aspect = null; // { width, height }
  // 基準の比を決めたときの欄の値。欄を触らないままONにしたなら、今の基準を使い続けるための目印。
  let aspectCells = null; // { cols, rows }

  const group = document.createElement('div');
  group.className = 'dialog-form-group';
  const label = document.createElement('label');
  label.style.display = 'flex';
  label.style.alignItems = 'center';
  label.style.gap = '6px';
  label.style.cursor = 'pointer';
  label.title = '幅と高さの一方を変えると、もう一方が今の縦横比に合わせて変わります（端数は四捨五入）。';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = false;
  label.appendChild(checkbox);
  label.appendChild(document.createTextNode('縦横比を固定する'));
  group.appendChild(label);

  checkbox.addEventListener('change', () => {
    if (!checkbox.checked) return;
    const cols = readCells(colsInput);
    const rows = readCells(rowsInput);
    if (aspect && aspectCells?.cols === cols && aspectCells?.rows === rows) return;
    aspect = cols >= 1 && rows >= 1 ? { width: cols, height: rows } : null;
    aspectCells = aspect ? { cols, rows } : null;
  });

  // 空欄や0を打っている途中では、相手の欄を動かさない（消して打ち直すたびに1へ潰れるため）
  colsInput.addEventListener('input', () => {
    const cols = readCells(colsInput);
    if (!checkbox.checked || !aspect || !(cols >= 1)) return;
    rowsInput.value = Math.max(1, Math.round(cols * aspect.height / aspect.width));
    aspectCells = { cols, rows: Number(rowsInput.value) };
  });
  rowsInput.addEventListener('input', () => {
    const rows = readCells(rowsInput);
    if (!checkbox.checked || !aspect || !(rows >= 1)) return;
    colsInput.value = Math.max(1, Math.round(rows * aspect.width / aspect.height));
    aspectCells = { cols: Number(colsInput.value), rows };
  });

  function useImageAspect(dim) {
    if (!dim?.width || !dim?.height) return;
    aspect = { width: dim.width, height: dim.height };
    aspectCells = { cols: readCells(colsInput), rows: readCells(rowsInput) };
  }

  // 今の画像があって、欄の値がその実寸どおりのマス数なら、比の基準を画像の実寸にしておく。
  // 欄を自分で変えてある（画像と違う比にしてある）なら何もしない。
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

  return { element: group, useImageAspect };
}
