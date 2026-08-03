// js/read-only-form.js
// 「見えるが触れない」表示にするための小さなユーティリティ。
// 他人のコマを表示だけできるようにする際（js/character-dialog.jsのcanEdit）に使う。
//
// 生成のたびに if (!canEdit) を撒くのではなく、組み立て終わってから部分木へ一度だけ通す
// 方針にしてある。入力欄を1つ足したときに封じ忘れが起きないため。

/**
 * rootの下のinput/select/textarea/buttonをまとめて無効化する。
 * keepに渡した要素だけは触らない（閉じる・コピー・ボックスを開くボタン等、
 * 状態を変えないので押せたままにしたいもの）。
 *
 * clickハンドラを直接持つdiv（特技表のセル等）は対象外。そちらは各ボックスが
 * 持っている編集可否のガードに任せる。
 *
 * @param {HTMLElement} root
 * @param {{ keep?: Array<HTMLElement|null|undefined> }} [options]
 */
export function lockFormControls(root, { keep = [] } = {}) {
  const keepSet = new Set(keep.filter(Boolean));
  root.querySelectorAll('input, select, textarea, button').forEach(el => {
    if (keepSet.has(el)) return;
    el.disabled = true;
  });
}
