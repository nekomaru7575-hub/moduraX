// js/store/stamps.js
// 部屋ごとに登録するスタンプ（room.stamps）の形と上限。
//
// js/store/cards.js と同じ役目：クライアントが自由に作れる payload（ADD_ROOM_STAMP・
// 取り込んだ部屋データ）が通る場所なので、長さも件数もURLの形もここで切る。
// 状態は全員へ配られ、保存先へも書き戻るため、payload は信用しない。
//
// DOMにもwindowにも触れないこと。reducerはサーバー（server/index.js）でも同じものが
// 走るので、ここが読み込めないとサーバーが起動しなくなる。
// js/stamp-registry.js を import しないこと（依存は registry → ここ の一方向）。
//
// 【なぜURLを状態に載せてよいのか】
// スタンプ全体の約束は「通信路にはIDだけを流し、URLは受け取った側が組み立てる」
// （js/stamp-catalog.js冒頭）。この約束は破っていない：SEND_STAMPが運ぶのは今もIDだけで、
// URLは受け取った側が自分の同期済みの状態から引く。ここに載るURLは、GM限定のreducerを
// 通って入った、背景画像（room.backgroundImage）とまったく同じ素性の値。

// 公開IDの名前空間。Coreの'ok'やプラグインの'STELLA_KNIGHTS:bouquet'と衝突しないよう、
// 部屋のスタンプには必ずこれを冠する。
//
// 【名前空間は受け取った側が付ける】payloadで受け取るのはローカルidだけで、'room:'を
// 足すのはこのモジュール。細工したクライアントに'ok'や'STELLA_KNIGHTS:bouquet'を
// 名乗らせないため（URLを受け取った側が組み立てるのと同じ考え方）。
// 副産物として、全キーが'room:'で始まるので'__proto__'にも到達しない。
export const ROOM_STAMP_NAMESPACE = 'room';

/** ローカルidから公開IDを作る。追加と削除で導出がズレないよう、必ずここを通す。 */
export function roomStampPublicId(localId) {
  return `${ROOM_STAMP_NAMESPACE}:${localId}`;
}

// 「集計する」を選んだスタンプの合計を入れるルーム変数の出自。
// パラメータIDは "roomStampTotal:<ローカルid>" になる（paramIdの source:key と同じ流儀）。
// スタンプの公開IDと別の名前空間にしてあるのは、状態の別々の棚に並ぶ2つを同じ文字列で
// 指すと、片方を消すもう片方を探すときに取り違えるため。
export const ROOM_STAMP_TOTAL_SOURCE = 'roomStampTotal';

/**
 * そのスタンプの合計を入れるルーム変数のID。スタンプの公開ID（"room:xxx"）から導く。
 * 作る側（js/store/room.jsのwithRoomStampTotals）と消す側が同じ導出を通すために置く。
 */
export function roomStampTotalParamId(stampPublicId) {
  const id = String(stampPublicId ?? '');
  return `${ROOM_STAMP_TOTAL_SOURCE}:${id.slice(id.indexOf(':') + 1)}`;
}

/** ルーム変数に出す名前。「（スタンプ名）合計」。 */
export function roomStampTotalLabel(label) {
  return `${label}合計`;
}

// 1部屋あたりの登録数。スタンプ送信パネルの既定幅（280px）に並べて見られる数として置いた。
// Coreが8枚、プラグインが数枚を先に使うので、合計はもう少し増える。
//
// **下げるときは注意。** hydrate側は超過分を捨てるので、既にこの数を超えている部屋を
// 開くと差分が消える（js/store/cards.jsのMAX_ROOM_DECKSと同じ性質）。上げる方向は安全。
export const MAX_ROOM_STAMPS = 24;

// ボタンの下と集計の見出しに出る名前。チャットコマンド「スタンプ(名前)」の引数にもなる。
export const MAX_ROOM_STAMP_LABEL_LENGTH = 20;

// 画像URL。R2の公開URLか /asset/<hash> しか入らないので、この長さで足りる。
// データURLを弾く歯止めとしても効く（下のisAllowedRoomStampUrlと二重にしてある）。
export const MAX_ROOM_STAMP_URL_LENGTH = 500;

// ローカルid（js/store/ids.jsのgenerateRoomStampIdが作る形）。
export const MAX_ROOM_STAMP_LOCAL_ID_LENGTH = 64;

// R2のキー（部屋を消すときの掃除に使う。room.backgroundImageKeyと同じ役割）。
const MAX_ROOM_STAMP_KEY_LENGTH = 200;

// ローカルidに使える文字。':'（名前空間の区切り）も'/'も'..'も通さない。
const LOCAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*$/;

// P2P卓の実体参照。js/asset-store.jsのASSET_REF_PATTERNとsw.jsのASSET_PATH_PATTERNの
// 3つ目の写し。sw.jsは classic worker でESモジュールをimportできないため既に写しが1つ
// あり（sw.js冒頭）、こちらもIndexedDBのモジュールをサーバーのimport網へ引き込まない
// ために手元へ置く。食い違わないことは test/asset-store.test.js で見張る。
const ASSET_REF_PATTERN = /^\/asset\/[0-9a-f]{64}$/;

/**
 * スタンプの画像URLとして受け入れてよい形か。**許可リスト方式**で、2つの形しか通さない。
 *
 *   https://…               R2の公開URL（server/r2.jsのpublicUrlFor）
 *   /asset/<64桁hex>        P2P卓の実体参照（js/asset-store.js・sw.js）
 *
 * 【データURLを拒む理由】pickAndUploadImageは、アップロードできない環境では画像を
 * データURLのまま返す（js/image-upload.js）。それを通すと数MBのblobがroomに載り、
 * 以後すべてのアクションで状態ごと保存先へ書き直される——js/image-upload.js冒頭の
 * 注意書きは、まさにそれを防ぐために在る。P2Pではさらに悪く、スナップショットは
 * /asset/<hash>の参照だけを含むという約束（js/net-host-rules.js）を破り、上限を超えた
 * スナップショットは**黙って捨てられる**＝その部屋のバックアップが止まる。
 *
 * 【相対パスを拒む理由】'image/stamps/…'のような同一オリジンの相対パスを通すと、
 * 状態に書いた任意のパスを全員のimg.srcへ向けられる。Coreのスタンプがその形を使うが、
 * あれはリポジトリ同梱の表から組み立てたもので、payload由来ではない。
 *
 * 'http:'は、このアプリのどの経路も作らないうえ混在コンテンツで弾かれるので通さない。
 */
export function isAllowedRoomStampUrl(url) {
  if (typeof url !== 'string') return false;
  if (url === '' || url.length > MAX_ROOM_STAMP_URL_LENGTH) return false;
  return url.startsWith('https://') || ASSET_REF_PATTERN.test(url);
}

/**
 * payload 1件を、状態に載せてよい形へ均す。受け付けられなければ null。
 *
 * countedは「誰が何枚押したかを数えるか」（js/store/handlers/participants.jsのCOUNT_STAMP）。
 * 既定はfalse＝Coreのスタンプと同じ相槌の扱い。trueにすると集計に載り、合計が
 * ルーム変数「（スタンプ名）合計」に出る（js/store/room.jsのwithRoomStampTotals）。
 *
 * @param {{id?:string, label?:string, url?:string, key?:string|null, counted?:boolean}} raw
 * @returns {{id:string, label:string, url:string, key:string|null, counted:boolean}|null}
 *   idは公開ID（'room:xxx'）。渡されたローカルidのままにはしない。
 */
export function normalizeRoomStamp(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const localId = String(raw.id ?? '');
  if (localId.length > MAX_ROOM_STAMP_LOCAL_ID_LENGTH) return null;
  if (!LOCAL_ID_PATTERN.test(localId)) return null;

  // 名前は切り詰めて通す（長すぎるだけで登録そのものを失敗させない）。空は通さない：
  // ボタンにもチャットコマンドにも名前が要る。
  const label = String(raw.label ?? '').trim().slice(0, MAX_ROOM_STAMP_LABEL_LENGTH);
  if (label === '') return null;

  // URLは切り詰めない。中途半端に短くしたURLは別のものを指すため、丸ごと拒む。
  const url = typeof raw.url === 'string' ? raw.url : '';
  if (!isAllowedRoomStampUrl(url)) return null;

  const key = typeof raw.key === 'string' && raw.key !== ''
    && raw.key.length <= MAX_ROOM_STAMP_KEY_LENGTH ? raw.key : null;

  // 真偽値だけを受ける。'yes'のような値で集計が勝手に始まらないように
  // （伏せた語のrevealedと同じ扱い）。
  return Object.freeze({
    id: roomStampPublicId(localId), label, url, key, counted: raw.counted === true
  });
}

/**
 * 保存済み・取り込み済みの room.stamps を均す。hydrate() から呼ぶ。
 *
 * 取り込んだ部屋データはreducerを通らずhydrate()へ直接入るので、上限もURLの許可リストも
 * ここでもう一度掛ける（js/store/cards.jsのnormalizeDeckTemplateMapと同じ立て付け）。
 */
export function normalizeRoomStampMap(stamps) {
  if (!stamps || typeof stamps !== 'object') return Object.freeze({});

  const next = {};
  let count = 0;
  for (const [publicId, raw] of Object.entries(stamps)) {
    if (count >= MAX_ROOM_STAMPS) break;

    // キーは公開ID。中身から作り直した公開IDと一致しないものは、キーと中身が食い違って
    // いる（＝細工されたか壊れた）ので捨てる。normalizeRoomStampはローカルidを取るので、
    // ここで名前空間を外してから渡す。
    const prefix = `${ROOM_STAMP_NAMESPACE}:`;
    if (typeof publicId !== 'string' || !publicId.startsWith(prefix)) continue;

    const stamp = normalizeRoomStamp({ ...raw, id: publicId.slice(prefix.length) });
    if (!stamp || stamp.id !== publicId) continue;

    next[publicId] = stamp;
    count += 1;
  }
  return Object.freeze(next);
}
