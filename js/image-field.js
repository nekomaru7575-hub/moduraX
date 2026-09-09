// js/image-field.js
// ダイアログに貼る「ラベル＋プレビュー＋選択/削除ボタン」の1組。
//
// 背景（js/background-dialog.js）とパネル（js/panel-dialog.js）に一字一句同じものが
// 写っていて、違いはラベルの文字列・用途・キーを持つかどうか・サイズ自動反映の条件の
// 4点だけだった。スタンプとデッキ編集にも同じ型がある（そちらはまだ写しのまま）。
//
// 画像を選ぶ手続き自体は持たない。押されたらセレクタ（js/image-selector-dialog.js）を
// 開き、返ってきた確定URLを受け取るだけ——「溜める・上げる」はあちらの持ち場で、
// ここは見た目と、選ばれた値の預かりだけを引き受ける。
//
// 【コマのトリミング付き（js/character-dialog.jsのbuildImagePicker）はここに含めない】
// あちらは「選ぶ」ではなく「選んだ画像をどう切るか」で、applyImageCropStyleを盤面と
// 共有して見たままを担保している。cropをここへ持ち込むと、cropの無い4か所にも
// cropの分岐が入る。

import { showImageSelectorDialog } from './image-selector-dialog.js';

/**
 * @param {{
 *   label: string,
 *   purpose: 'background'|'token'|'panel'|'card'|'stamp',
 *   initialImage?: string | null,
 *   initialKey?: string | null,
 *   usedImages?: Set<string>,  この部屋で使っている画像（セレクタの再利用一覧に並べる）
 *   selectorTitle?: string,
 *   clearLabel?: string,
 *   onClear?: (() => {url: string|null, key: string|null}) | null,
 *     押されたときに戻す値。省略すると「画像なし」に戻す（デッキの裏面だけは
 *     既定の絵へ戻すので、そのときにこれを使う）
 *   onPicked?: ((picked: {
 *     url: string, key: string|null, width: number, height: number
 *   }) => void) | null
 *     選ばれた直後に呼ぶ。サイズ欄への反映など、画面ごとの都合はここで書く。
 *     width/heightは0のことがある（溜めずに使い回した画像など、寸法が分からない場合）
 * }} options
 * @returns {{ element: HTMLElement, getImage: () => string|null, getKey: () => string|null }}
 *   戻り値の形は js/character-dialog.js の buildImagePicker に揃えてある
 */
export function buildImageField({
  label, purpose, initialImage = null, initialKey = null,
  usedImages = new Set(), selectorTitle = '画像を選ぶ',
  clearLabel = '画像を削除', onClear = null, onPicked = null
}) {
  // 画像のURLとキーは組で持ち回る。キーはR2に実体がある場合のみ（データURLへ退避した
  // 場合やP2P卓ではnull）で、状態の backgroundImageKey へそのまま入る。
  let currentImage = initialImage || null;
  let currentKey = initialKey || null;

  const group = document.createElement('div');
  group.className = 'dialog-form-group';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  group.appendChild(labelEl);

  const preview = document.createElement('img');
  preview.className = 'dialog-image-preview';
  preview.style.display = currentImage ? 'block' : 'none';
  if (currentImage) preview.src = currentImage;
  group.appendChild(preview);

  const row = document.createElement('div');
  row.className = 'dialog-custom-row';

  const pickBtn = document.createElement('button');
  pickBtn.type = 'button';
  pickBtn.textContent = '画像を選択';
  pickBtn.className = 'dialog-add-row-btn';
  pickBtn.style.marginBottom = '0';
  pickBtn.addEventListener('click', async () => {
    const picked = await showImageSelectorDialog({
      purpose, usedImages, title: selectorTitle
    });
    if (!picked) return;
    currentImage = picked.url;
    currentKey = picked.key ?? null;
    preview.src = currentImage;
    preview.style.display = 'block';
    if (onPicked) onPicked(picked);
  });
  row.appendChild(pickBtn);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.textContent = clearLabel;
  clearBtn.className = 'dialog-remove-row';
  clearBtn.addEventListener('click', () => {
    const next = onClear ? onClear() : { url: null, key: null };
    currentImage = next?.url || null;
    currentKey = next?.key || null;
    if (currentImage) {
      preview.src = currentImage;
      preview.style.display = 'block';
    } else {
      preview.removeAttribute('src');
      preview.style.display = 'none';
    }
  });
  row.appendChild(clearBtn);

  group.appendChild(row);

  return {
    element: group,
    getImage: () => currentImage,
    getKey: () => currentKey
  };
}
