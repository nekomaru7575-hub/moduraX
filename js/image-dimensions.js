// js/image-dimensions.js
// 画像の実ピクセルサイズ（naturalWidth/Height）を測る。
// 背景ダイアログ・パネルダイアログ・盤面の3箇所で同じものが要るので1つにまとめている。

/**
 * @param {string} imageSrc URLでもdata URLでもよい
 * @returns {Promise<{width: number, height: number} | null>} 読めなければnull
 */
export function loadImageDimensions(imageSrc) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}
