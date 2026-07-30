// js/audio-phrase.js
// 音源に設定した「再生フレーズ」と発言の照合。
// 専用のコマンドを打たずに、ロールプレイの発言をそのまま流しながら音を鳴らせるようにするため、
// 発言の末尾がフレーズと一致したときに再生する（判定・再生の指示はjs/main.jsの送信処理が行う）。
// DOM・storeに触らない純粋関数なので、Nodeでそのまま動かして確認できる。

// 全角/半角・大文字小文字の揺れを吸収する（日本語入力のまま書かれたフレーズでも一致させるため。
// NFKCは漢字・かな・全角カタカナを変えないので、フレーズの見た目は保たれる）。
function normalize(text) {
  return String(text ?? '').normalize('NFKC').trim().toLowerCase();
}

/**
 * 発言の末尾に一致する再生フレーズを持つ音源を返す。
 * フレーズが未設定/空の音源は対象外。複数一致した場合は一番長いフレーズの音源を選ぶ
 * （「キュン」と「バキュン」の両方が登録されていても、意図した方が鳴るようにするため）。
 *
 * @param {Record<string, {id:string, name:string, phrase?:string|null}>} tracks room.audioTracks
 * @param {string} text 送信された発言
 * @returns {object|null} 一致した音源（無ければnull）
 */
export function findTrackByPhraseSuffix(tracks, text) {
  const normalizedText = normalize(text);
  if (normalizedText === '') return null;

  let matched = null;
  let matchedLength = 0;

  Object.values(tracks || {}).forEach(track => {
    const phrase = normalize(track?.phrase);
    if (phrase === '') return;
    if (!normalizedText.endsWith(phrase)) return;
    if (phrase.length <= matchedLength) return;

    matched = track;
    matchedLength = phrase.length;
  });

  return matched;
}
