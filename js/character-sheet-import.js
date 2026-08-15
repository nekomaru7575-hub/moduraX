// js/character-sheet-import.js
// 「キャラクターシートのURLから取り込む」の共通部分。部屋の中（js/board-data-driven.js）と
// コマ作成ツール（js/character-builder.js）の両方から使う。
//
// どのURLを受け付けるかは、プラグインの宣言（characterSheetSource）だけが決める。
// システムによってシートを置いているサービスは違い、そもそも無いシステムもあるので、
// Coreは住所を1つも知らない（js/parameters/registry.jsのgetPluginSheetSource）。
//
// 【なぜサーバーを経由するか】シートのサービスはCORSを許していないため、ブラウザから
// 直接取りに行くと弾かれる（CSPのconnect-srcも同じ理由で許していない）。
//
// 【なぜURLではなくキーだけを送るか】サーバーへURLを渡せる作りにすると、そのAPIは
// 「このサーバーに好きな宛先を取りに行かせる口」になる。宣言にある取得先はサーバーが
// 組み立て、こちらから渡すのはシートのキーだけにしてある。ここでの検査は利用者に理由を
// 伝えるためのもので、防御の本体はサーバー側の同じ検査。

/**
 * 貼られたURLから、そのサービスのシートのキーを取り出す。
 * 受け付けられないURL（別のサービス・別システムのシート・キーが無い）ならnull。
 *
 * @param {{origin:string, pathPrefix:string, keyParam:string, keyPattern:RegExp}} source
 * @param {string} rawUrl
 * @returns {string|null}
 */
export function extractSheetKey(source, rawUrl) {
  if (!source) return null;

  let url;
  try {
    url = new URL(String(rawUrl).trim());
  } catch {
    return null; // URLとして読めない
  }

  // originの一致で見る（プロトコル・ホスト・ポートが揃って初めて同じ相手）。
  // ホスト名の後方一致で見ると、evil-character-sheets.appspot.com のようなものを通してしまう。
  if (url.origin !== source.origin) return null;
  // 同じサービスでも他システムのシートは取り込めない（読み方が違う）
  if (!url.pathname.startsWith(source.pathPrefix)) return null;

  const key = url.searchParams.get(source.keyParam) ?? '';
  return source.keyPattern.test(key) ? key : null;
}

/**
 * サーバー経由でシートのJSONを取る。
 * @returns {Promise<any>} 取れなかった場合は理由をmessageに持つErrorを投げる
 */
export async function fetchCharacterSheetJson(pluginId, key) {
  const query = `plugin=${encodeURIComponent(pluginId)}&key=${encodeURIComponent(key)}`;

  let response;
  try {
    response = await fetch(`/api/character-sheet?${query}`);
  } catch {
    throw new Error('通信に失敗しました。接続を確かめてもう一度お試しください。');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || 'シートを取得できませんでした。');
  }
  return data;
}

/**
 * URLを尋ねて、シートのJSONを取ってくるところまで。
 * 取り込んだ後どうするか（どのコマへ入れるか）は呼び出し側の仕事。
 *
 * @param {string} pluginId
 * @param {object} source getPluginSheetSource()の戻り値
 * @returns {Promise<any|null>} 中断・失敗した場合はnull（理由は利用者へ伝えたうえで）
 */
export async function promptForCharacterSheetJson(pluginId, source) {
  const rawUrl = prompt(`${source.label}のURLを貼り付けてください。\n（${source.hint ?? ''}）`);
  if (rawUrl === null || rawUrl.trim() === '') return null;

  const key = extractSheetKey(source, rawUrl);
  if (!key) {
    alert(`このURLからは取り込めません。\n${source.label}のURLを貼り付けてください。`);
    return null;
  }

  try {
    return await fetchCharacterSheetJson(pluginId, key);
  } catch (error) {
    alert(error.message);
    return null;
  }
}
