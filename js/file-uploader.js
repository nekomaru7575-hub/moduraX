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

/**
 * 既に手元にあるFileをDataURLへ読み込む。
 * 「まずアップロードを試し、使えなければDataURLへ退避する」ように、選択と読み込みを
 * 分けたい場面で使う（js/board-data-driven.jsの背景画像）。
 *
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * ネイティブのファイル選択ダイアログを開き、選択されたFileをそのまま返す。
 * サーバーへ生のバイナリを送る用途（音源のアップロード）向けで、DataURL化を挟まないぶん
 * base64の33%増しとメモリ上の二重持ちを避けられる。キャンセルされた場合はnullを返す。
 *
 * @param {{ accept?: string }} options
 * @returns {Promise<File | null>}
 */
export function pickFile({ accept = '*/*' } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';

    input.addEventListener('change', () => {
      const file = input.files?.[0] ?? null;
      input.remove();
      resolve(file);
    });

    document.body.appendChild(input);
    input.click();
  });
}

/**
 * ネイティブのファイル選択ダイアログを開き、選択されたファイルをテキストとして読み込む。
 * JSONインポート等、バイナリ変換が不要な用途向け。キャンセルされた場合はnullを返す。
 *
 * @param {{ accept?: string }} options accept: input[type=file]のaccept属性（既定 'application/json'）
 * @returns {Promise<{ file: File, text: string } | null>}
 */
export function pickFileAsText({ accept = 'application/json' } = {}) {
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
      reader.onload = () => resolve({ file, text: reader.result });
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });

    document.body.appendChild(input);
    input.click();
  });
}
