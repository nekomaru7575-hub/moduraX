// js/dialog-host.js
// モーダルダイアログの入れ物（<dialog>要素）を1つだけ用意して使い回すための小道具。
//
// このアプリのダイアログは、開くたびに要素を作らず「1画面に1つの<dialog>を作り置きして、
// 開くたびに中身（innerHTML）を入れ替える」方式で書かれている。その作り置きの手続きが
// 32ファイルに一字一句同じ形で写っていたので、ここへまとめた。違っていたのは
// className に足す1語だけ。
//
// 見た目の土台は css/character-dialog.css の .character-dialog が持つ。extraClass は
// その上に重ねる調整用のクラス（.lois-box-dialog など）で、要らなければ省いてよい。

/**
 * この画面ぶんの <dialog> を返す関数を作る。モジュールのトップレベルで1回呼び、
 * 返ってきた関数を「開くとき」に呼ぶ。
 *
 *   const ensureDialog = createDialogHost('lois-box-dialog');
 *   ...
 *   const dialog = ensureDialog();
 *   dialog.innerHTML = '';
 *   dialog.appendChild(form);
 *   dialog.showModal();
 *
 * @param {string} [extraClass] .character-dialog に重ねるクラス名
 * @returns {(() => HTMLDialogElement) & { closeIfOpen: () => void }}
 */
export function createDialogHost(extraClass = '') {
  let dialogEl = null;

  function ensureDialog() {
    if (dialogEl) return dialogEl;
    dialogEl = document.createElement('dialog');
    dialogEl.className = ['character-dialog', extraClass].filter(Boolean).join(' ');
    document.body.appendChild(dialogEl);
    return dialogEl;
  }

  // 「開いていれば閉じる」。まだ一度も開いていなければ何もしない＝要素も作らない。
  // ensureDialog().close() で代用すると、閉じるためだけに空の<dialog>が生えてしまう。
  ensureDialog.closeIfOpen = () => {
    if (dialogEl?.open) dialogEl.close();
  };

  return ensureDialog;
}
