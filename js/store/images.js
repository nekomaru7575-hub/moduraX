// js/store/images.js
// 画像URLの検分と列挙。**純関数だけ**を置く（DOMもIndexedDBも通信も知らない）。
//
// 【なぜ純関数だけを集めるのか】このリポジトリはIndexedDBもDOMもモックしない方針で、
// 理由も明文化されている（test/token-library.js側のテスト冒頭：「偽物のIndexedDBを立てても
// 確かめられるのは偽物の挙動でしかない」）。その下でも取り違えたら気づけない判定——
// 「この参照を状態に載せてよいか」「この部屋はどの画像を使っているか」——を、ここへ寄せる。
// 画像プール（js/image-pool.js）とセレクタ（js/image-selector-dialog.js）は
// 出し入れと画面だけを持ち、判定はここから借りる。
//
// 画像そのものを触る仕組みは3つに分かれている。混ぜないこと。
//   js/image-upload.js   … 上げる（R2 / P2P / データURL退避）
//   js/image-pool.js     … 使われるまでこのブラウザに溜める
//   ここ                  … 文字列としての検分と、状態からの列挙

import { isAllowedRoomStampUrl } from './stamps.js';
import { MAX_CARD_IMAGE_LENGTH } from './cards.js';

// 状態に載せてよい画像の指し先の形（データURLも含む）。長さの上限は用途ごとに違うので
// ここでは見ない——ここは「文字列かどうか」だけを見る門。
//
// 【なぜこの門が要るのか】コマとパネルのimageには検証が無い（js/store/handlers/characters.js・
// js/store/handlers/board.js）。データURLへ退避する経路を成立させるための意図的な緩さで、
// そこは壊さない。ただし緩いままだと、プールの中だけで使う参照（js/image-selector-dialog.jsの
// {kind:'pool', …}）が手違いで状態へ入り得る。オブジェクトが入ると
//   ・img.srcに'[object Object]'が入って絵が出ない
//   ・その値が全員へ配られるので、プールを持つ本人だけ絵が見える
// という気づきにくい壊れ方になる。**文字列でないものを落とす一行**でそこを塞ぐ。
/**
 * 画像の指し先として状態に載せてよい値へ均す。文字列でなければ null。
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizeImageRef(value) {
  if (typeof value !== 'string' || value === '') return null;
  return value;
}

// プールへ入れてよい画像の種類。server/index.jsのIMAGE_EXTENSIONSの写し。
//
// 【SVGを通さない理由が2つある】
// ① サーバーが意図的に排除している（server/index.js：R2の公開ドメインからそのまま
//    配信されるので、SVGを許すとそのオリジンで任意スクリプト＝保存型XSS）。ここで通すと
//    「プールには入るのに、使おうとすると必ず断られる」食い違いになる。
// ② P2P卓ではR2を通らず、実体がsw.js経由で**自オリジンから**配られる（js/asset-store.js）。
//    あちらはtypeを問わないので、ここで通すとP2P卓だけXSSの口が開く。プールは
//    その両方の入口の手前に居るので、塞ぐ場所はここが正しい。
//
// マジックバイト検査までは踏み込まない（サーバーも持っていない。範囲を揃える）。
const POOL_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

/**
 * プールへ入れてよいMIMEタイプか。'image/png; charset=x' のような形も受ける。
 * @param {unknown} type File.type / Blob.type
 * @returns {boolean}
 */
export function poolMimeAllowed(type) {
  if (typeof type !== 'string') return false;
  return POOL_MIME_TYPES.has(type.split(';')[0].trim().toLowerCase());
}

// 画像を持つ項目の名前。'image' で終わるもの（image / backgroundImage / …）を拾う。
//
// 【なぜ名前で見分けるのか】状態を形を知らずに歩くと、音源のurl（room.audioTracks）まで
// 拾ってしまい、セレクタに音源が「壊れた画像」として並ぶ。かといって場所を数え上げると、
// 画像の置き場所を足した人がここを直し忘れる（js/asset-store.jsのcollectAssetHashesが
// 避けているのがまさにそれ）。**入れ物は数え上げず、項目の名前で見分ける**——これなら
// 新しい入れ物に'image'という項目を足しただけで自動的に追随する。
//
// 拾い漏れても壊れない（再利用の一覧に出ないだけ）方に倒してある。
const IMAGE_KEY_PATTERN = /image$/i;

// 'image'で終わらないが画像を指す項目。今のところ部屋スタンプのurlだけ
// （js/store/stamps.jsのnormalizeRoomStamp）。入れ物の名前と対で持つ——ただの'url'を
// 通すと音源トラックのurlを拾ってしまう。
const IMAGE_KEYS_BY_CONTAINER = { stamps: new Set(['url']) };

// この入れ物の下では、上の対で許した項目名も画像として拾う。
// stamps → {st1: {url}} のようにid階層が1つ挟まるので、親を1段見るだけでは足りない。
// 一度その入れ物へ入ったら、そこから下は引き継ぐ。
function extraImageKeysFor(key, inherited) {
  return IMAGE_KEYS_BY_CONTAINER[key] || inherited;
}

/**
 * 状態の中で使われている画像の指し先を全部集める。
 *
 * セレクタの「この部屋で使っている画像」に並べるためのもの。集めた値は
 * 「今この部屋の状態に写っている」ことの証でもあり、上げ直しを省く判断
 * （pickReusableCommit）の材料になる。
 *
 * @param {object} state
 * @returns {Set<string>} 画像の指し先（R2の公開URL / データURL / /asset/<hash> / 外部URL）
 */
export function collectImageUrls(state) {
  const found = new Set();
  // 循環参照で止まらないように（状態は木のはずだが、そこに寄りかからない）
  const seen = new WeakSet();

  const walk = (value, key, extraKeys) => {
    if (typeof value === 'string') {
      if (value !== '' && (IMAGE_KEY_PATTERN.test(key) || extraKeys?.has(key))) found.add(value);
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (seen.has(value)) return;
    seen.add(value);

    // 配列は添字を項目名として持たないので、親の名前をそのまま子へ渡す
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, key, extraKeys));
      return;
    }
    Object.entries(value).forEach(([childKey, child]) => {
      walk(child, childKey, extraImageKeysFor(childKey, extraKeys));
    });
  };

  walk(state, '', null);
  return found;
}

/**
 * この用途にその画像を使えるか。**新しい許可リストを作らず、既存の検査を呼ぶだけ**にする。
 * ここで通ったものがreducerで落とされる（＝選べたのに保存されない）ことを避けるため、
 * 判定の出どころは常に状態側の正規化と同じにしておく。
 *
 * @param {string} url
 * @param {'background'|'token'|'panel'|'card'|'stamp'} purpose
 * @returns {{ok: true} | {ok: false, reason: string}}
 */
export function imageUsableFor(url, purpose) {
  if (normalizeImageRef(url) === null) return { ok: false, reason: '画像の指定が空です' };

  if (purpose === 'stamp') {
    // js/store/stamps.jsのisAllowedRoomStampUrl（https:// か /asset/<hash> のみ）。
    // データURLはここで落ちる＝R2が使えない環境で上げた画像はスタンプに使えない。
    return isAllowedRoomStampUrl(url)
      ? { ok: true }
      : { ok: false, reason: 'スタンプにはアップロード済みの画像しか使えません' };
  }

  if (purpose === 'card' && url.length > MAX_CARD_IMAGE_LENGTH) {
    // js/store/cards.jsのnormalizeCardImage。200枚ぶんが状態に載るので長さで切っている。
    return { ok: false, reason: 'カードにはアップロード済みの画像しか使えません' };
  }

  return { ok: true };
}

/**
 * 同じ中身の画像を、この部屋で既に上げてあるなら、その公開URLを返す。
 *
 * R2のキーは内容アドレスではなくUUIDなので（server/index.js）、同じ画像を2回選べば
 * 2つのオブジェクトができる。しかも画像は1枚も即時削除されない。だから
 * 「上げたことがある」の記憶を持って上げ直しを省く。
 *
 * 【なぜ状態と交差させるのか】記憶をそのまま信じると、部屋を削除したあと同じ番号の
 * 部屋で当たってしまい、消えたオブジェクトを指して404になる。URLの生存は確かめられない
 * ——R2の公開ドメインはCORSを返さないので、ブラウザから叩いて存否を読めない
 * （js/image-upload.jsのadoptImageIntoRoomが同じ制約に当たっている）。
 * そこで**「今この部屋の状態に写っているURLだけを生きているとみなす」**。
 * 部屋を削除すれば新しい状態に古いURLは無いので、必ず外れて上げ直しになる。
 *
 * @param {Record<string, string>|null|undefined} memory hash → 公開URL
 * @param {Set<string>} urlsInState collectImageUrls(state) の結果
 * @param {string} hash 画像の中身のSHA-256（js/asset-store.jsのhashBlob）
 * @returns {string|null} 使い回せるURL。無ければ null（＝上げ直す）
 */
export function pickReusableCommit(memory, urlsInState, hash) {
  if (!memory || typeof memory !== 'object' || typeof hash !== 'string' || hash === '') return null;
  // プロトタイプ経由の値を引かない（記憶はlocalStorage由来＝外から書ける値）
  if (!Object.prototype.hasOwnProperty.call(memory, hash)) return null;
  const url = normalizeImageRef(memory[hash]);
  if (url === null) return null;
  return urlsInState instanceof Set && urlsInState.has(url) ? url : null;
}
