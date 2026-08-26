// js/stamp-registry.js
// 「この部屋で使えるスタンプ」を1か所で決める。Coreの表（js/stamp-catalog.js）と、
// 適用中のプラグインが宣言した表（記述子のstamps）を束ねて引けるようにする。
//
// サーバー（server/index.js）とブラウザ（js/stamp-panel.js・js/stamp-layer.js・js/main.js）の
// 両方がここを通す。送られてきたIDが実在するかの確認も、画像URLの組み立ても、名前からの
// 逆引きも、全部この1枚に集める（判定がずれると「送れるのに映らない」事故になるため）。
// stamp-catalog.jsと同じくDOM/windowには触れないこと。
//
// 【プラグインのスタンプ】
// 記述子に stamps: [{ id, label, file }] を書くと足せる（docs/plugin-guide.md）。
// - 公開IDは "<プラグインid>:<id>"（paramIdの source:key と同じ流儀）。Coreの'ok'等を
//   プラグインが乗っ取れないようにするため、名前空間を必ず付ける。
// - 画像URLは Core が組み立てる: image/stamps/<プラグインid>/<file>
//   プラグイン側にパスやURLを書かせないのは、「URLは受け取った側が組み立てる」という
//   スタンプ全体の約束（js/stamp-catalog.js冒頭）をプラグイン経由で破らせないため。
//   フォルダ名はプラグインidをそのまま使う（大文字のまま）。以前は小文字へ直していたが、
//   Windowsは大文字小文字を区別しないので手元では正しく見え、Linux（本番）だけ404になる、
//   という見つけにくい事故を起こした。目に見えない変換は挟まない。
// - 使えるのは、その部屋に適用中のプラグインのスタンプだけ。

import { STAMPS, STAMP_IMAGE_DIR } from './stamp-catalog.js';
import { assetUrl, assetBaseVersion } from './asset-base.js';

// Coreのスタンプ（自作・リポジトリ同梱）を配るパス。プラグインの絵は外部（assetUrl）。
const LOCAL_STAMP_DIR = 'image/stamps';
import { listPluginStamps } from './parameters/registry.js';

// 画像URLの組み立てに使うので、名前に階層を混ぜさせない。ファイル名（記述子のfile）と
// フォルダ名（プラグインid）の両方に掛ける。
// （プラグインはこのリポジトリのコードなので攻撃者ではないが、URLを組み立てる側として
//   「名前しか受け取らない」ことは形で示しておく。）
function isPlainPathSegment(name) {
  const text = String(name ?? '');
  return text !== '' && !text.includes('/') && !text.includes('\\') && !text.includes('..');
}

// 表の1件を { id, label, url } に均す。idはそのまま公開IDになる。
//
// 【Coreの絵とプラグインの絵で置き場が違う】
// Coreのスタンプ（dirSegmentなし）は作者の自作でリポジトリに入っているので、
// これまでどおり image/stamps/ から配る。
// プラグインが宣言する絵（dirSegmentあり）はファンキットやフリー素材のことがあり、
// リポジトリに入れると再配布になってしまうので外部の置き場から配る（js/asset-base.js）。
//
// 【身元と見た目は別物】url が null になっても、そのスタンプを一覧から落としてはいけない。
// 「そのIDが実在するか」はプラグインが決める事実で、「絵がどこにあるか」は環境の話。
// この2つを混ぜると、サーバー（setAssetBaseUrlを呼ばない＝常にnull）が
// isKnownStampIdでプラグインのスタンプを全部knownでないと判定し、送っても黙って
// 捨てられるようになる。実際にそれを一度やってブーケが送れなくなった。
// 絵を出せるかどうかは、出す側（js/stamp-panel.js・js/stamp-layer.js）が url を見て決める。
function normalizeStamp(stamp, { idPrefix = '', dirSegment = '' } = {}) {
  if (!stamp || !stamp.id || !isPlainPathSegment(stamp.file)) return null;
  if (dirSegment && !isPlainPathSegment(dirSegment)) return null;

  const url = dirSegment
    ? assetUrl(`${STAMP_IMAGE_DIR}/${dirSegment}/${stamp.file}`)
    : `${LOCAL_STAMP_DIR}/${stamp.file}`;

  return {
    id: `${idPrefix}${stamp.id}`,
    label: String(stamp.label ?? stamp.id),
    url: url || null
  };
}

const CORE_STAMPS = STAMPS.map(stamp => normalizeStamp(stamp)).filter(Boolean);

// pluginId → 均した一覧。プラグインの表は起動中に変わらないので作り直さない。
const cache = new Map();

/**
 * その部屋で使えるスタンプの一覧（Coreの分＋適用中プラグインの分）。
 * @param {string|null} pluginId 部屋のactivePlugin。未適用ならnull
 * @returns {{id:string, label:string, url:string}[]}
 */
export function listStamps(pluginId) {
  // 置き場所の版をキーに混ぜる。設定が届く前に一度でも呼ばれていると、
  // プラグインの絵を落とした一覧を掴んだままになるため。
  const key = `${assetBaseVersion()}:${pluginId || ''}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const pluginStamps = listPluginStamps(pluginId)
    .map(stamp => normalizeStamp(stamp, {
      idPrefix: `${pluginId}:`,
      dirSegment: String(pluginId)
    }))
    .filter(Boolean);

  const list = [...CORE_STAMPS, ...pluginStamps];
  cache.set(key, list);
  return list;
}

/** IDからスタンプを引く。その部屋で使えないIDならnull。 */
export function findStamp(stampId, pluginId) {
  const id = String(stampId ?? '');
  return listStamps(pluginId).find(stamp => stamp.id === id) ?? null;
}

/** サーバーが受け取ったIDを検証するための判定。 */
export function isKnownStampId(stampId, pluginId) {
  return findStamp(stampId, pluginId) !== null;
}

/**
 * チャットコマンド「スタンプ(拍手)」の引数からスタンプを引く。
 * 表示名でもIDでも指定できるようにしておく（表示名を後から変えても、IDで書いた
 * チャットパレットが壊れないため）。プラグインのスタンプは名前空間付きのID
 * （"STELLA_KNIGHTS:seed"）でも、その後ろだけ（"seed"）でも指せる。表記ゆれは無視する。
 */
export function findStampByName(rawName, pluginId) {
  const text = String(rawName ?? '').trim().toLowerCase();
  if (!text) return null;

  return listStamps(pluginId).find(stamp => {
    if (stamp.label.toLowerCase() === text) return true;

    const id = stamp.id.toLowerCase();
    if (id === text) return true;

    // 名前空間を落とした短い書き方。Coreの表に同じ名前があればそちらが先に一致する
    // （上のfindは配列順＝Coreが先なので、Coreのスタンプが奪われることはない）。
    const separator = id.indexOf(':');
    return separator >= 0 && id.slice(separator + 1) === text;
  }) ?? null;
}

/** 「使えるスタンプ: OK／No／…」の案内文に使う。 */
export function listStampLabels(pluginId) {
  return listStamps(pluginId).map(stamp => stamp.label);
}
