// js/room-import.js
// 部屋データの取り込み（room-import.html）。ココフォリアの部屋書き出し
// （__data.json ＋ 画像）を、もじゅらXの部屋データへ写す。
//
// 【全部ブラウザの中で終わる】ZIPを開くのも画像を焼き直すのもここで、サーバーへは
// 何も送らない。出来上がったJSONは利用者が保存し、部屋一覧の「部屋を作る」で
// 自分で読み込む。取り込みの経路をこのページに持たせないのは、外部ファイルの展開という
// 攻撃面をサーバーの手前に増やさないため。
//
// 【なぜ既存の取り込み口にそのまま乗るか】
// もじゅらXには既に「JSONから部屋を作る」経路があり、その途中の adoptStateMedia
// （server/index.js）が、状態に埋まったデータURLの画像をR2へ複製し直してくれる。
// 背景・panels・tokens・scenes[].panels・scenes[].backgroundImage をすべて歩くので、
// こちらは「データURL入りの状態」を作れば済む。
//
// 【このファイルはモジュール】インラインの <script> はCSP（script-src 'self'）で
// 動かないので、HTMLから切り離してある。トップレベルの束縛はモジュールに閉じる。
// =====================================================================

const GRID = 25;                              // 1マス = 25px（js/store/room.js の BOARD_GRID_SIZE）
const IMPORT_LIMIT_BYTES = 93 * 1024 * 1024;  // server/index.js の MAX_IMPORT_BYTES 相当
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;      // server/index.js の MAX_IMAGE_BYTES

const $ = (id) => document.getElementById(id);
const logEl = $('log');
let result = null;

function log(msg, cls) {
  const line = document.createElement('div');
  if (cls) line.className = cls;
  line.textContent = msg;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}
function progress(done, total) {
  $('bar').style.width = total ? `${Math.round(done / total * 100)}%` : '0';
}
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)}MB`;
// 画面を描き直させる（重い処理の途中で進捗を見せるため）
const breathe = () => new Promise((r) => setTimeout(r, 0));

// ---------------------------------------------------------------------
// ZIPを読む
//
// 末尾から End of Central Directory を探し、Central Directory を辿って各エントリの
// 位置と圧縮方式を得る。実体は Local File Header の先。stored(0) はそのまま、
// deflate(8) は DecompressionStream('deflate-raw') で展開する
// （js/host-persistence.js が CompressionStream を使っているのと同じ手口。外部ライブラリを
// 足さないための選択）。
// ---------------------------------------------------------------------
const u16 = (b, p) => b[p] | (b[p + 1] << 8);
const u32 = (b, p) => (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0;
const fourcc = (b, p) => String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]);

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function findEocd(b) {
  // コメント欄は最大65535バイト。EOCD自体が22バイトなので、そこまで遡れば必ず見つかる
  const limit = Math.max(0, b.length - 22 - 65535);
  for (let p = b.length - 22; p >= limit; p--) {
    if (u32(b, p) === 0x06054b50) return p;
  }
  throw new Error('ZIPの終端（End of Central Directory）が見つかりません。ZIPファイルではないか、壊れています。');
}

function listZipEntries(b) {
  const eocd = findEocd(b);
  const count = u16(b, eocd + 10);
  let p = u32(b, eocd + 16);
  if (p === 0xffffffff) throw new Error('ZIP64形式には対応していません。');

  const entries = [];
  const decoder = new TextDecoder('utf-8');
  for (let i = 0; i < count; i++) {
    if (u32(b, p) !== 0x02014b50) throw new Error('ZIPの中央ディレクトリが壊れています。');
    const method = u16(b, p + 10);
    const compressedSize = u32(b, p + 20);
    const nameLen = u16(b, p + 28);
    const extraLen = u16(b, p + 30);
    const commentLen = u16(b, p + 32);
    const localOffset = u32(b, p + 42);
    const name = decoder.decode(b.subarray(p + 46, p + 46 + nameLen));
    entries.push({ name, method, compressedSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readZipEntry(b, entry) {
  const p = entry.localOffset;
  if (u32(b, p) !== 0x04034b50) throw new Error(`${entry.name}: ローカルヘッダが壊れています。`);
  const start = p + 30 + u16(b, p + 26) + u16(b, p + 28);
  const raw = b.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return raw;
  if (entry.method === 8) return inflateRaw(raw);
  throw new Error(`${entry.name}: 未対応の圧縮方式です (method=${entry.method})。`);
}

// ---------------------------------------------------------------------
// 画像
// ---------------------------------------------------------------------

// アニメーションWebPか。RIFFのチャンクを頭から辿り、ANIM/ANMFがあれば動く画像。
// 焼き直すと1コマに潰れて演出が死ぬので、これに当たったものは無加工で通す。
function isAnimatedWebp(b) {
  if (b.length < 16 || fourcc(b, 0) !== 'RIFF' || fourcc(b, 8) !== 'WEBP') return false;
  let p = 12;
  while (p + 8 <= b.length) {
    const tag = fourcc(b, p);
    if (tag === 'ANIM' || tag === 'ANMF') return true;
    const size = u32(b, p + 4);
    if (size <= 0) break;
    p += 8 + size + (size & 1);   // チャンクは偶数バイト境界に揃う
  }
  return false;
}

const MIME_BY_EXT = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp'
};
const mimeOf = (name) => MIME_BY_EXT[name.split('.').pop().toLowerCase()] || null;

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// 表示サイズに合わせて縮小し、WebPで焼き直す。元より大きくはしない。
// 拡大率は「盤面での表示px」に対する余裕（既定2倍）で、盤面をズームしても粗くならない程度。
// 縦横比は保つ：もじゅらXのパネルは background-size: cover で切り抜くため、比が変わると
// 見える範囲がずれる（css/board.css の .panel-object）。
//
// アニメーションWebPをこれに通すと1コマ目だけの静止画になる。普段は避けるが、
// 出来上がりが取り込みの上限を超えるときは、重い順にこれで潰して収める（fitToBudget）。
async function shrinkToWebp(bytes, mime, targetW, targetH, quality) {
  const bitmap = await createImageBitmap(new Blob([bytes], { type: mime }));
  const scale = Math.min(1, Math.max(targetW / bitmap.width, targetH / bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', quality));
  if (!blob) throw new Error('WebPへの変換に失敗しました。');
  return { blob, w, h };
}

// ---------------------------------------------------------------------
// ココフォリア → もじゅらX の写像
// ---------------------------------------------------------------------
const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

/**
 * 重なり順を作り直す。
 *
 * 【落とし穴】もじゅらXの normalizeStackOrder（js/store/patch.js）は
 * Math.max(0, Math.round(...)) で**負の値を0へ潰す**。ココフォリアのzは
 * アイテムが-10〜5、マーカーが-27〜102と負を普通に使うので、素通しすると重なりが全部崩れる。
 * そこで、部屋じゅうのzを集めて昇順に並べ、0からの連番へ写し替える。
 *
 * アイテム（全シーン共通）とマーカー（シーン別）は同じ盤面で前後を争うので、
 * 物差しは部屋に1本だけ作る。
 */
function buildStackRanks(data) {
  const zs = new Set();
  const collect = (holder) => Object.values(holder || {}).forEach((o) => zs.add(num(o?.z)));
  collect(data.entities.items);
  collect(data.entities.room?.markers);
  Object.values(data.entities.scenes || {}).forEach((scene) => collect(scene?.markers));

  const ranks = new Map();
  [...zs].sort((a, b) => a - b).forEach((z, i) => ranks.set(z, i));
  const rankOf = (z) => ranks.get(num(z)) ?? 0;
  // 前景は、ココフォリアでもアイテム・マーカーより上に描かれる。いちばん上の段を空けておく
  rankOf.top = ranks.size;
  return rankOf;
}

/**
 * ココフォリアの1オブジェクト（アイテム／マーカー）を、もじゅらXのパネルへ。
 * 画像はこの時点ではZIP内のファイル名のまま置く（データURLは最後にはめ込む）。
 *
 * 座標系がまるごと違う：
 *   ココフォリア … 単位はマス、原点は盤面の中央
 *   もじゅらX   … 位置はpxで原点は盤面の左上、大きさだけがマス数（js/store/room.js）
 */
function toPanel(id, src, field, stackOrder, keepOnSceneChange, clickAction = null) {
  return {
    id,
    imageName: src.imageUrl || null,
    text: typeof src.memo === 'string' ? src.memo : '',
    x: Math.round((num(src.x) + field.w / 2) * GRID),
    y: Math.round((num(src.y) + field.h / 2) * GRID),
    cols: Math.max(1, Math.round(num(src.width, 2))),
    rows: Math.max(1, Math.round(num(src.height, 2))),
    locked: src.locked === true,
    textAudience: null,
    keepOnSceneChange,
    stackOrder,
    clickAction,
    isStocker: false,
    stockerOwnerId: null,
    stockerOwnerLocalId: null
  };
}

// ココフォリアの「押すとこの文字列をチャットへ送る」。type は message しか見たことがない
const CCFOLIA_SCENE_COMMAND = /^\/scene\s+(.+)$/;

/**
 * ココフォリアのclickActionを、もじゅらXのクリックオプションへ写す
 * （js/store/panels.js の normalizeClickAction が受け取る形）。
 *
 * ココフォリアは「押すとこの文字列をチャットへ送る」の1種類しか持たず、シーンの切り替えも
 * `/scene <名前>` というチャットコマンドとして表す。もじゅらXは種類で分かれているので、
 * 文字列を見て振り分ける。
 *
 * 【写さないもの】`/scene` 以外のコマンドは写さない。もじゅらXが解釈できない文字列を
 * 「発言する」として持ち込むと、押した人が意味の無い一行を卓に流すことになる。
 * 指し先のシーンが見つからないときも同じで、黙って別のシーンへ繋がない。
 *
 * @param {object} src ココフォリアのアイテム／マーカー
 * @param {Map<string, string>} sceneIdByName シーン名 → もじゅらX側のシーンid
 * @param {{missing: Set<string>, skipped: Set<string>}} report 写せなかったものの控え
 */
function toClickAction(src, sceneIdByName, report) {
  const action = src?.clickAction;
  if (!action || action.type !== 'message') return null;

  const text = typeof action.text === 'string' ? action.text.trim() : '';
  if (text === '') return null;

  const scene = CCFOLIA_SCENE_COMMAND.exec(text);
  if (scene) {
    const name = scene[1].trim();
    const sceneId = sceneIdByName.get(name);
    if (!sceneId) {
      report.missing.add(name);
      return null;
    }
    return { type: 'scene', sceneId };
  }

  if (text.startsWith('/')) {
    report.skipped.add(text);
    return null;
  }

  return { type: 'chat', text };
}

/**
 * 「どのシーンでもほぼ同じ見た目のマーカー」を選ぶ。
 *
 * 【なぜ要るか】もじゅらXのシーンはパネルの**完全なスナップショット**を持ち、画像はURLで
 * 指す。部屋の中ではURLの共有が効くので、同じ絵が44シーンに出ても実体は1つで済む。ところが
 * 部屋の外から持ち込む経路はデータURLの埋め込みしかなく、そこだけは参照の共有を表現できない。
 * 素直に写すと、41枚33MBの画像が245か所へ展開されて380MBのJSONになり、取り込みの上限
 * （MAX_IMPORT_BYTES＝約93MB）に当たって読み込めない。
 *
 * そこで、ほとんどのシーンで同じ絵・同じ位置に出ているマーカーは「部屋の調度品」とみなし、
 * keepOnSceneChange を立てた盤面のパネル1つへまとめる。もじゅらXの APPLY_SCENE
 * （js/store/handlers/scenes.js）は、この印が付いたパネルをシーン遷移で持ち越すので、
 * 見た目は変わらないまま参照が1つに減る。
 *
 * 【引き換えに失うもの】持ち越したパネルはシーン側から上書きできない
 * （APPLY_SCENE が {...scene.panels, ...keptPanels} と、持ち越し側を勝たせるため）。
 * 少数派の見た目だったシーンでは、多数派の絵が出る。閾値を高めに取っているのは、
 * この「例外が潰れる」影響を、常時出ている装飾だけに留めるため。
 */
const HOIST_RATIO = 0.8;

function findHoistableMarkers(scenes) {
  const stats = new Map();   // マーカーキー → { total, looks: Map<署名, {count, src}> }
  scenes.forEach((scene) => {
    Object.entries(scene?.markers || {}).forEach(([key, src]) => {
      const entry = stats.get(key) || { total: 0, looks: new Map() };
      entry.total++;
      const sig = JSON.stringify([src?.imageUrl || '', src?.x, src?.y, src?.width, src?.height, src?.z]);
      const look = entry.looks.get(sig) || { count: 0, src };
      look.count++;
      entry.looks.set(sig, look);
      stats.set(key, entry);
    });
  });

  const hoisted = new Map();   // マーカーキー → 代表のsrc
  stats.forEach((entry, key) => {
    const top = [...entry.looks.values()].sort((a, b) => b.count - a.count)[0];
    // 絵の無い見た目が多数派なら持ち越さない（何も描かないものを固定しても意味がない）
    if (!top?.src?.imageUrl) return;
    if (top.count / entry.total < HOIST_RATIO) return;
    hoisted.set(key, { src: top.src, covers: top.count, total: entry.total, scenes: scenes.length });
  });
  return hoisted;
}

/**
 * 出来上がりを取り込みの上限に収める。
 *
 * 画像1枚の重さは「データURLの長さ × 参照された回数」で効く。重い順に、アニメーションを
 * 1コマ目の静止画へ潰していく（静止画にすると数十分の一になる）。動きを捨てるのは惜しいが、
 * 上限を超えたJSONはそもそも読み込めないので、収まらないよりはよい。
 *
 * 静止画をさらに縮めないのは、そちらは既に表示解像度まで落としてあり、削っても効きが薄い割に
 * 全体の画質が下がるため。潰したものは名前を返して画面に出す（あとで手で差し替えられるように）。
 */
async function fitToBudget(encoded, refCounts, budgetBytes, options, log) {
  const weightOf = (name) => (encoded.get(name).dataUrl.length) * (refCounts.get(name) || 0);
  const total = () => [...encoded.keys()].reduce((n, name) => n + weightOf(name), 0);

  const flattened = [];
  while (total() > budgetBytes) {
    const victim = [...encoded.entries()]
      .filter(([, e]) => e.animated)
      .sort((a, b) => weightOf(b[0]) - weightOf(a[0]))[0];
    if (!victim) break;   // もう潰せるアニメが無い

    const [name, entry] = victim;
    const out = await shrinkToWebp(
      entry.bytes, entry.mime,
      entry.target.w * options.scale, entry.target.h * options.scale, options.quality
    );
    encoded.set(name, {
      ...entry, animated: false, dataUrl: await blobToDataUrl(out.blob), size: out.blob.size
    });
    flattened.push(name);
    log(`  ${name.slice(0, 10)} は${refCounts.get(name)}か所で使われていて重いため、`
      + 'アニメーションをやめて1コマ目の静止画にしました。', 'warn');
  }
  return { flattened, totalBytes: total() };
}

// ---------------------------------------------------------------------
// 本体
// ---------------------------------------------------------------------
async function convert(zipBytes, options) {
  logEl.textContent = '';
  progress(0, 1);

  // --- ZIPを開く ---
  const entries = listZipEntries(zipBytes);
  log(`ZIPの中身: ${entries.length}件`);

  const dataEntry = entries.find((e) => e.name === '__data.json');
  if (!dataEntry) throw new Error('__data.json が見つかりません。ココフォリアの部屋書き出しZIPを選んでください。');

  const data = JSON.parse(new TextDecoder('utf-8').decode(await readZipEntry(zipBytes, dataEntry)));
  if (!data?.entities?.room) throw new Error('__data.json の形が想定と違います（entities.room がありません）。');
  log(`部屋データを読みました（ココフォリア形式 v${data.meta?.version || '不明'}）`);

  // .token はココフォリア側の資格情報。名前で弾いて、読みも書きもしない
  const imageEntries = new Map();
  entries.forEach((e) => {
    if (e.name === '.token' || e.name === '__data.json') return;
    if (mimeOf(e.name)) imageEntries.set(e.name, e);
  });

  const field = {
    w: Math.max(1, Math.round(num(data.entities.room.fieldWidth, 40))),
    h: Math.max(1, Math.round(num(data.entities.room.fieldHeight, 30)))
  };
  const boardWidth = field.w * GRID;
  const boardHeight = field.h * GRID;

  const scenesSrc = Object.entries(data.entities.scenes || {})
    .sort((a, b) => num(a[1]?.order) - num(b[1]?.order));
  const itemCount = Object.keys(data.entities.items || {}).length;
  log(`盤面 ${field.w}×${field.h}マス（${boardWidth}×${boardHeight}px）`
    + ` / シーン${scenesSrc.length}個 / アイテム${itemCount}個 / 画像${imageEntries.size}枚`);

  // --- 骨組みを先に組む（画像はファイル名のまま） ---
  const rankOf = buildStackRanks(data);
  const base = Date.now();
  let seq = 0;
  const nextPanelId = () => `panel-user-${base}-${++seq}`;

  // シーンのidは並び順だけで決まる（下のscenesSrc.forEachと同じ式）ので、シーンを組む前に
  // 対応表を作れる。ココフォリアの「/scene <名前>」を写すのに、パネルを組む時点で要る。
  // 同じ名前のシーンが複数あれば先に出てきた方を採る（後勝ちにすると、押したときに
  // どちらへ飛ぶかが並び順で変わってしまう）。
  const sceneIdByName = new Map();
  scenesSrc.forEach(([, src], i) => {
    const name = String(src?.name || '').trim();
    if (name && !sceneIdByName.has(name)) sceneIdByName.set(name, `scene-${base + i}`);
  });
  // 写せなかったクリック動作の控え。同じマーカーが44シーンに出ると同じ警告が44回積まれるので、
  // Setで種類ごとにまとめる
  const clickReport = { missing: new Set(), skipped: new Set() };

  // マーカーのIDはシーンをまたいで同じものを指す（同じ枠の絵がシーンごとに差し替わる）。
  // もじゅらX側でも同じパネルIDに揃えておくと、シーン遷移が「差し替え」として素直に効く。
  const markerIds = new Map();
  const panelIdForMarker = (key) => {
    if (!markerIds.has(key)) markerIds.set(key, nextPanelId());
    return markerIds.get(key);
  };

  // 画像もメモも無いものは写さない。ココフォリアの部屋には場所取りだけの空マーカーが
  // 各シーンに8〜10個あり、そのまま持ち込んでもJSONが太るだけで画面には何も出ない。
  // 重なり順は値で決めているので、抜いても前後関係は狂わない。
  const toPanelMap = (source, keep, idFor, skipKeys) => {
    const panels = {};
    Object.entries(source || {}).forEach(([key, src]) => {
      if (skipKeys?.has(key)) return;
      const hasImage = !!(src?.imageUrl && imageEntries.has(src.imageUrl));
      const hasText = typeof src?.memo === 'string' && src.memo.trim() !== '';
      if (!hasImage && !hasText) return;
      const id = idFor(key);
      panels[id] = toPanel(
        id, src, field, rankOf(src.z), keep, toClickAction(src, sceneIdByName, clickReport)
      );
    });
    return panels;
  };

  // どのシーンでもほぼ同じ見た目のマーカーは、盤面へ固定して参照を1つに減らす
  const hoisted = findHoistableMarkers(scenesSrc.map(([, s]) => s));
  const hoistedPanels = {};
  hoisted.forEach((info, key) => {
    const id = panelIdForMarker(key);
    hoistedPanels[id] = toPanel(
      id, info.src, field, rankOf(info.src.z), true,
      toClickAction(info.src, sceneIdByName, clickReport)
    );
  });
  if (hoisted.size) {
    log(`シーンをまたいで同じ見た目のマーカー${hoisted.size}個を、盤面へ固定しました`
      + '（シーンチェンジで残す扱い）:');
    hoisted.forEach((info, key) => {
      const exceptions = info.total - info.covers;
      log(`  ${key} … ${info.covers}/${info.total}シーンで同じ`
        + (exceptions ? ` ／ 見た目の違う${exceptions}シーンでも、この絵が出ます` : ''));
    });
  }

  // アイテムは部屋ぜんぶで共通なので keepOnSceneChange を立てる
  const itemPanels = toPanelMap(data.entities.items, true, nextPanelId);
  // 入室した直後に見える盤面は、room直下のマーカー（＝ココフォリアで最後に開いていたシーン）
  const roomPanels = toPanelMap(data.entities.room.markers, false, panelIdForMarker, hoisted);
  const boardPanels = { ...itemPanels, ...hoistedPanels, ...roomPanels };

  /**
   * ココフォリアの「前景」を、いちばん上に敷くパネルにする。
   *
   * 【なぜ背景にしないか】ココフォリアの重なりは
   *   背景 → アイテム・マーカー（z順） → 前景 → キャラクター
   * で、前景はアイテムより**上**に描かれる。もじゅらXの盤面背景はいちばん下なので、
   * 前景をそこへ入れると、額縁のようなアイテムに覆われて見えなくなる
   * （実際、タイトルの絵が羊皮紙の額縁の下に隠れた）。パネルの最上段へ置けば、
   * 「アイテムより上・コマより下」というココフォリアと同じ位置に収まる。
   *
   * idを固定にするのは、シーンを移ったときに絵が差し替わるようにするため
   * （別idにすると前のシーンの前景が残る）。
   */
  const foregroundId = `panel-user-${base}-fg`;
  const toForegroundPanel = (name) => (imageEntries.has(name) ? {
    id: foregroundId,
    imageName: name,
    text: '',
    x: 0,
    y: 0,
    cols: field.w,
    rows: field.h,
    locked: true,
    textAudience: null,
    keepOnSceneChange: false,
    stackOrder: rankOf.top,
    clickAction: null,
    isStocker: false,
    stockerOwnerId: null,
    stockerOwnerLocalId: null
  } : null);

  const scenes = {};
  scenesSrc.forEach(([, src], i) => {
    const id = `scene-${base + i}`;
    const panels = toPanelMap(src?.markers, false, panelIdForMarker, hoisted);
    const foreground = toForegroundPanel(src?.foregroundUrl);
    if (foreground) panels[foregroundId] = foreground;
    scenes[id] = {
      id,
      name: String(src?.name || `シーン${i + 1}`),
      // ココフォリアの scene.text は「@戦闘開始」のような演出を起動する合図で、
      // もじゅらXの scene.text は卓に流れる描写本文。そのまま入れると意味不明な
      // 文字列が発言として出るので空にする。
      text: '',
      bgmTrackId: null,
      backgroundName: null,   // 背景は部屋で1枚に固定する（下記 sharedBackground）
      backgroundImageKey: null,
      boardWidth,
      boardHeight,
      showGrid: false,
      panels
    };
  });

  const roomForeground = toForegroundPanel(data.entities.room.foregroundUrl);
  if (roomForeground) boardPanels[foregroundId] = roomForeground;

  /**
   * 背景。
   *
   * どのシーンも同じ背景なら、部屋に1枚だけ置いて keepBackgroundOnSceneChange を立てる。
   * シーンごとに同じ絵を持たせると、同一のデータURLが44か所へ展開されて重くなるだけで、
   * 見た目は1つも変わらないため（この項目が立っている間、APPLY_SCENE は背景に触らない。
   * js/store/handlers/scenes.js）。背景がシーンごとに違う部屋では、従来どおり各シーンへ持たせる。
   */
  const sceneBackgrounds = scenesSrc.map(([, s]) => s?.backgroundUrl || null);
  const sharedBackground = sceneBackgrounds.every((b) => b === sceneBackgrounds[0])
    ? sceneBackgrounds[0] : null;
  if (!sharedBackground) {
    scenesSrc.forEach(([, src], i) => {
      const id = `scene-${base + i}`;
      scenes[id].backgroundName = imageEntries.has(src?.backgroundUrl) ? src.backgroundUrl : null;
    });
  }
  const roomBackgroundName = imageEntries.has(sharedBackground || data.entities.room.backgroundUrl)
    ? (sharedBackground || data.entities.room.backgroundUrl) : null;
  if (sharedBackground) log('背景はどのシーンも同じなので、部屋に1枚だけ置きます（シーンチェンジで残す扱い）');

  // --- どの画像が何か所で、最大どれだけの大きさで出るか ---
  const refCounts = new Map();
  const wanted = new Map();
  const noteUse = (name, w, h) => {
    if (!name) return;
    refCounts.set(name, (refCounts.get(name) || 0) + 1);
    const prev = wanted.get(name) || { w: 0, h: 0 };
    wanted.set(name, { w: Math.max(prev.w, w), h: Math.max(prev.h, h) });
  };
  const notePanels = (panels) => Object.values(panels).forEach(
    (p) => noteUse(p.imageName, p.cols * GRID, p.rows * GRID)
  );
  noteUse(roomBackgroundName, boardWidth, boardHeight);
  notePanels(boardPanels);
  Object.values(scenes).forEach((s) => {
    noteUse(s.backgroundName, boardWidth, boardHeight);
    notePanels(s.panels);
  });

  const used = [...refCounts.keys()];
  const unused = imageEntries.size - used.length;
  if (unused > 0) log(`どこからも使われていない画像 ${unused}枚は取り込みません`);

  // --- 画像を1枚ずつ焼く ---
  const encoded = new Map();
  const stats = { failed: 0, before: 0 };

  for (let i = 0; i < used.length; i++) {
    const name = used[i];
    const target = wanted.get(name);
    const short = name.slice(0, 10);
    progress(i, used.length);
    await breathe();

    try {
      const bytes = await readZipEntry(zipBytes, imageEntries.get(name));
      const mime = mimeOf(name);
      stats.before += bytes.length;

      // 動く画像は無加工で通す。canvasで開き直すと1コマに潰れる
      const animated = (mime === 'image/webp' && isAnimatedWebp(bytes)) || mime === 'image/gif';
      let blob;
      let note;
      if (animated) {
        blob = new Blob([bytes], { type: mime });
        note = 'アニメ → 無加工';
      } else {
        const out = await shrinkToWebp(
          bytes, mime, target.w * options.scale, target.h * options.scale, options.quality
        );
        blob = out.blob;
        note = `→ ${out.w}×${out.h} WebP`;
      }

      if (blob.size > MAX_IMAGE_BYTES) {
        log(`  ${short} は${mb(blob.size)}あり、もじゅらXの1枚あたりの上限8MBを超えます。取り込みません。`, 'warn');
        stats.failed++;
        continue;
      }

      encoded.set(name, {
        bytes, mime, target, animated, size: blob.size, dataUrl: await blobToDataUrl(blob)
      });
      log(`  ${short} ${mb(bytes.length)} ${note} ${mb(blob.size)} ×${refCounts.get(name)}か所`);
    } catch (error) {
      log(`  ${short} の変換に失敗しました: ${error.message}`, 'warn');
      stats.failed++;
    }
  }
  progress(1, 1);

  // --- 上限に収める ---
  const budget = await fitToBudget(encoded, refCounts, options.budgetBytes, options, log);

  // --- データURLをはめ込んで状態にする ---
  const urlOf = (name) => encoded.get(name)?.dataUrl || null;
  const finishPanels = (panels) => Object.fromEntries(
    Object.entries(panels)
      .map(([id, { imageName, ...rest }]) => [id, { ...rest, image: urlOf(imageName) }])
      // 画像を落としたうえにメモも無いパネルは、置いても何も描かれない
      .filter(([, p]) => p.image || p.text.trim() !== '')
  );

  const finalScenes = {};
  Object.entries(scenes).forEach(([id, { backgroundName, ...rest }]) => {
    finalScenes[id] = { ...rest, backgroundImage: urlOf(backgroundName), panels: finishPanels(rest.panels) };
  });

  // 出力は部分的な状態でよい。欠けているキー（tokens・cards・chatTabs・participants・round…）は
  // もじゅらX側の hydrate（js/game-store.js）が既定値で補う。
  const state = {
    room: {
      backgroundImage: urlOf(roomBackgroundName),
      backgroundImageKey: null,
      // どのシーンも同じ背景なら、シーン遷移で背景を触らせない（上の sharedBackground 参照）
      keepBackgroundOnSceneChange: !!sharedBackground,
      boardWidth,
      boardHeight,
      // 元の部屋が displayGrid:false / alignWithGrid:false なら、線も吸着も切る
      showGrid: data.entities.room.displayGrid === true,
      snapToGrid: data.entities.room.alignWithGrid === true,
      scenes: finalScenes
    },
    panels: finishPanels(boardPanels)
  };

  // --- クリックで動くボタンの報告 ---
  // 数えるのは出来上がった状態から。同じマーカーが何十シーンにも出るので、
  // 写した回数ではなくパネルidの種類で数える。
  const clickableIds = new Set();
  const countClickable = (panels) => Object.values(panels)
    .forEach((p) => { if (p.clickAction) clickableIds.add(p.id); });
  countClickable(state.panels);
  Object.values(finalScenes).forEach((s) => countClickable(s.panels));

  if (clickableIds.size) {
    log(`クリックで動くボタン: ${clickableIds.size}個`);
  }
  clickReport.missing.forEach((name) => {
    log(`  シーン「${name}」が見つからないので、そこへ飛ぶボタンは写しませんでした`, 'warn');
  });
  clickReport.skipped.forEach((text) => {
    log(`  もじゅらXで解釈できないコマンドなので写しませんでした: ${text}`, 'warn');
  });

  const json = JSON.stringify(state);
  return {
    json,
    stats: {
      ...stats,
      clickable: clickableIds.size,
      after: [...encoded.values()].reduce((n, e) => n + e.size, 0),
      images: encoded.size,
      passthrough: [...encoded.values()].filter((e) => e.animated).length,
      shrunk: [...encoded.values()].filter((e) => !e.animated).length,
      flattened: budget.flattened.length,
      hoisted: hoisted.size,
      refs: [...refCounts.values()].reduce((n, c) => n + c, 0),
      panelCount: Object.keys(state.panels).length,
      scenePanelCount: Object.values(finalScenes).reduce((n, s) => n + Object.keys(s.panels).length, 0),
      sceneCount: Object.keys(finalScenes).length,
      jsonBytes: new Blob([json]).size
    }
  };
}

// ---------------------------------------------------------------------
// 画面
// ---------------------------------------------------------------------
$('scale').addEventListener('input', (e) => {
  $('scaleVal').textContent = `${Number(e.target.value).toFixed(1)}倍`;
});
$('quality').addEventListener('input', (e) => {
  $('qualityVal').textContent = Number(e.target.value).toFixed(2);
});
$('budget').addEventListener('input', (e) => {
  $('budgetVal').textContent = `${e.target.value}MB`;
});

let zipBytes = null;
$('zipInput').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  $('run').disabled = true;
  $('save').disabled = true;
  result = null;
  $('summary').textContent = '';
  if (!file) return;
  $('zipInfo').textContent = `${file.name}（${mb(file.size)}）を読み込みました。`;
  zipBytes = new Uint8Array(await file.arrayBuffer());
  $('run').disabled = false;
});

$('run').addEventListener('click', async () => {
  if (!zipBytes) return;
  $('run').disabled = true;
  $('save').disabled = true;
  $('summary').textContent = '変換中…';
  try {
    result = await convert(zipBytes, {
      scale: Number($('scale').value),
      quality: Number($('quality').value),
      budgetBytes: Number($('budget').value) * 1024 * 1024
    });
    const s = result.stats;
    const over = s.jsonBytes > IMPORT_LIMIT_BYTES;
    $('summary').innerHTML = `
      <table>
        <tr><th>シーン</th><td>${s.sceneCount}個</td></tr>
        <tr><th>パネル</th><td>盤面に${s.panelCount}個 ／ シーンの中に延べ${s.scenePanelCount}個
          ${s.hoisted ? ` ／ うち${s.hoisted}個は全シーン共通として盤面へ固定` : ''}</td></tr>
        <tr><th>クリックで動くボタン</th><td>${s.clickable
          ? `${s.clickable}個 ／ シーンを切り替えるボタンを押せるのはGMだけです`
          : 'なし'}</td></tr>
        <tr><th>画像</th><td>${s.images}枚を${s.refs}か所で使用（アニメのまま${s.passthrough}枚 ／
          静止画${s.shrunk}枚${s.flattened ? ` ／ <span class="warn">重くて静止画にしたアニメ${s.flattened}枚</span>` : ''}${
          s.failed ? ` ／ <span class="warn">取り込めず${s.failed}枚</span>` : ''}）</td></tr>
        <tr><th>画像の容量</th><td>${mb(s.before)} → ${mb(s.after)}（重複を除いた実体）</td></tr>
        <tr><th>JSONの大きさ</th><td class="${over ? 'bad' : 'ok'}">${mb(s.jsonBytes)}${over
          ? ' ／ 取り込みの限界（約93MB）を超えています。上限を下げてやり直してください。'
          : ' ／ 取り込めます。'}</td></tr>
      </table>`;
    log(`変換できました。JSON ${mb(s.jsonBytes)}`, over ? 'bad' : 'ok');
    $('save').disabled = false;
  } catch (error) {
    $('summary').innerHTML = '<span class="bad">変換に失敗しました。</span>';
    log(`失敗: ${error.message}`, 'bad');
    console.error(error);
  } finally {
    $('run').disabled = false;
  }
});

$('save').addEventListener('click', () => {
  if (!result) return;
  const url = URL.createObjectURL(new Blob([result.json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `trpg-room-ccfolia-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
});
