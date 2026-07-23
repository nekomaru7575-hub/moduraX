// js/file-uploader.js
// 汎用のファイル選択・読み込みユーティリティ。
// 盤面背景に限らず、今後別の用途（アイコン画像・JSONインポート等）でも使い回せるよう、
// 特定の呼び出し元の知識を持たない。

/**
 * ネイティブのファイル選択ダイアログを開き、選択されたファイルをDataURLとして読み込む。
 * キャンセルされた場合はnullを返す。
 *
 * @param {{ accept?: string }} options accept: input[type=file]のaccept属性（既定 'image/*'）
 * @returns {Promise<{ file: File, dataUrl: string } | null>}
 */
export function pickFileAsDataUrl({ accept = 'image/*' } = {}) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';

    input.addEventListener('change', () => {
      const file = input.files?.[0] ?? null;
      input.remove();

      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve({ file, dataUrl: reader.result });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    document.body.appendChild(input);
    input.click();
  });
}
