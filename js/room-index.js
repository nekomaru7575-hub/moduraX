// js/room-index.js
// 部屋一覧ページ（index.html）のロジック。/api/roomsで一覧を取得し、
//   ・部屋名で絞り込む／プルダウンから選んで入室する（入室ブロック）
//   ・新しい部屋を作る（作成ブロック。作成はこのページ上で完結させ、成功したらそのまま盤面へ）
// の2つを組み立てる。部屋作成前はWebSocket接続を一切受け付けないサーバー側仕様と対になっている。
//
// 部屋は固定の5枠ではなくなり、総数に上限が無い（IDもサーバーが決めるランダムな値）。
// 代わりにサーバーは「同時にアクティブな卓の数」と「ファイル置き場の残量」で断るので、
// その状況を一覧の上に出す（renderServerStatus）。断る条件はサーバー側と同じものを
// 応答（joinable / canCreate）で受け取っているだけで、ここでの判定は案内にすぎない。

import { listPlugins } from './parameters/registry.js';
import { fetchGameSystems, prefetchGameSystemInfo } from './bcdice-catalog.js';
import { setStoredEntryPassword } from './room-entry.js';
import { parseUntrustedJson } from './untrusted-json.js';
import { registerServiceWorker, mountInstallPrompt } from './pwa.js';
import { applyStaticIcons, setIconText } from './icons.js';

const serverStatusEl = document.getElementById('serverStatus');
const roomEntryEl = document.getElementById('roomEntry');
const roomCreateEl = document.getElementById('roomCreate');

// BCDiceのシステム一覧。手書きの定数を持たず、ページを開いたときにAPI（サーバー側で
// キャッシュ済み）から取得したものを、作成フォームのselectと入室ブロックの表示名で共有する。
// 取得に失敗した場合は空のままで、部屋の一覧表示・入室自体は止めない。
let bcdiceSystems = [];

// 最後に受け取った一覧。プルダウンの中身と、選択中の部屋の説明の元になる。
let rooms = [];
// サーバーが一覧を上限（ROOM_LIST_MAX）で切ったか。切られている場合だけ、絞り込みを
// 手元のフィルタではなくサーバーへの問い合わせ（?q=）に切り替える。
let truncated = false;

function buildSelectOptions(select, options, { valueKey = 'id', labelKey = 'label', noneLabel } = {}) {
  select.innerHTML = '';
  if (noneLabel) {
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = noneLabel;
    select.appendChild(noneOpt);
  }
  options.forEach((opt) => {
    const el = document.createElement('option');
    el.value = opt[valueKey];
    el.textContent = opt[labelKey];
    select.appendChild(el);
  });
}

// --- 混雑状況 ---
// GET /api/roomsが一緒に返すserverLoad（server/index.jsのserverLoadSnapshot）を、
// ページの上に1行で出す。サーバーが実際に断る根拠にしている上限をそのまま見せるので、
// 「今は大きな読み込みをやめておく」「今なら入れる」を入室前に判断できる。
//
// 自動では更新しない（更新ボタンだけ）。無料枠のPaaSは無操作でスピンダウンするので、
// 一覧を開きっぱなしのタブが定期的に叩くと、それだけで起こし続けることになる。
const LOAD_LEVELS = {
  quiet:   { className: 'quiet',   label: '空いています' },
  busy:    { className: 'busy',    label: 'やや混み合っています' },
  crowded: { className: 'crowded', label: '混み合っています' }
};

const CROWDED_NOTE = '大きなデータの読み込み・書き出しや、新しい卓の入室は断られることがあります。'
  + '少し待つと空きます。';

function formatUptime(sec) {
  if (!Number.isFinite(sec)) return '不明';
  if (sec < 60) return `${Math.floor(sec)}秒`;
  if (sec < 60 * 60) return `${Math.floor(sec / 60)}分`;
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  return minutes > 0 ? `${hours}時間${minutes}分` : `${hours}時間`;
}

function appendMetric(parent, label, value, suffix = '') {
  const el = document.createElement('span');
  el.append(`${label} `);
  const strong = document.createElement('b');
  strong.textContent = String(value);
  el.appendChild(strong);
  if (suffix) el.append(suffix);
  parent.appendChild(el);
}

// load が null のときは「取得できなかった」として、灰色の枠と更新ボタンだけを出す。
// 一覧そのものが出ていれば入室はできるので、ここで止めない。
function renderServerStatus(load) {
  const level = LOAD_LEVELS[load?.level] || { className: 'unknown', label: '混雑状況を取得できませんでした' };

  const box = document.createElement('div');
  box.className = `server-status ${level.className}`;

  const head = document.createElement('div');
  head.className = 'server-status-head';

  const dot = document.createElement('span');
  dot.className = 'server-status-dot';
  head.appendChild(dot);

  const levelText = document.createElement('span');
  levelText.className = 'server-status-level';
  levelText.textContent = level.label;
  head.appendChild(levelText);

  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.className = 'btn btn-secondary server-status-refresh';
  refreshBtn.textContent = '更新';
  refreshBtn.addEventListener('click', () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '更新中...';
    loadRooms();
  });
  head.appendChild(refreshBtn);

  box.appendChild(head);

  if (load) {
    const metrics = document.createElement('div');
    metrics.className = 'server-status-metrics';
    // 「卓」は部屋の総数ではなく、いま動いている部屋の数。ここが埋まると、新しい卓へは
    // 入れなくなる（既に動いている卓へは入れる）。
    appendMetric(metrics, 'アクティブな卓', load.activeRooms, ` / ${load.maxActiveRooms}`);
    // 「接続」で「人」ではない。入室パスワードの入力待ちや、まだどの部屋にも入っていない
    // 接続もここに数えられる（上限WS_MAX_CONNECTIONSがそれを数えて断るため）。
    appendMetric(metrics, '接続', load.connections, ` / ${load.maxConnections}`);
    appendMetric(metrics, '読み込み・書き出し', load.heavyRunning + load.heavyWaiting, ` / ${load.maxHeavy}件`);
    appendMetric(metrics, 'メモリ', load.memoryUsedMb, ` / ${load.memoryBudgetMb}MB`);
    appendMetric(metrics, '読み込める最大', load.importHeadroomMb, 'MB');
    // ファイル置き場はR2を設定していない環境（検証用の起動）ではnullで来る。
    // 「不明」と出しても仕方がないので、その場合は行ごと出さない。
    if (load.storageQuotaGb !== null && load.storageQuotaGb !== undefined) {
      appendMetric(metrics, 'ファイル置き場', load.storageUsedGb, ` / ${load.storageQuotaGb}GB`);
    }
    appendMetric(metrics, '連続稼働', formatUptime(load.uptimeSec));
    box.appendChild(metrics);

    if (load.level === 'crowded') {
      const note = document.createElement('p');
      note.className = 'server-status-note';
      note.textContent = CROWDED_NOTE;
      box.appendChild(note);
    }
  }

  serverStatusEl.replaceChildren(box);
}

// 部屋の保存期間（server/index.jsのROOM_TTL_MS）。片方だけ変えると表示と実際がずれる。
const ROOM_TTL_DAYS = 14;
// 残りがこれ以下になったら表示する
const EXPIRY_NOTICE_DAYS = 3;

// 「あと何日で自動削除されるか」の一行。まだ先なら null（何も出さない）。
// updatedAtは1時間単位に丸めた値がサーバーから来る（roomSummaryOf）。
function describeExpiry(updatedAt) {
  if (!Number.isFinite(updatedAt)) return null;

  const elapsedDays = (Date.now() - updatedAt) / (24 * 60 * 60 * 1000);
  const remaining = ROOM_TTL_DAYS - elapsedDays;
  if (remaining > EXPIRY_NOTICE_DAYS) return null;

  // 残り0.2日を「あと0日」と出すと消えたのかどうか分からないので、切り上げて
  // 最低でも「あと1日」にする。実際の削除は掃除が走ったときなので、
  // 表示より少し遅れて消えることはあっても早く消えることはない。
  const days = Math.max(1, Math.ceil(remaining));
  return `あと${days}日で自動削除されます（入室して操作すれば延びます）`;
}

// --- 入室ブロック ---
// 要素は一度だけ作り、以後は中身だけ差し替える。読み込みのたびに作り直すと、
// 検索欄に打っている最中にフォーカスと入力が飛ぶ。
let entry = null;

// サーバーへ検索を投げ直すまでの待ち（truncatedのときだけ使う）。
// 1文字ごとに投げると、絞り込むほどサーバーを叩くことになる。
const SEARCH_DEBOUNCE_MS = 300;
let searchTimer = null;

function mountEntryPanel() {
  const heading = document.createElement('h2');
  heading.textContent = '部屋に入る';

  const searchGroup = document.createElement('div');
  searchGroup.className = 'entry-search';
  const searchLabel = document.createElement('label');
  searchLabel.textContent = '部屋名で探す';
  searchLabel.htmlFor = 'roomSearch';
  const search = document.createElement('input');
  search.type = 'search';
  search.id = 'roomSearch';
  search.placeholder = '部屋名の一部を入力';
  searchGroup.appendChild(searchLabel);
  searchGroup.appendChild(search);

  const row = document.createElement('div');
  row.className = 'entry-row';

  const select = document.createElement('select');
  select.setAttribute('aria-label', '入室する部屋');
  row.appendChild(select);

  const joinBtn = document.createElement('button');
  joinBtn.type = 'button';
  joinBtn.className = 'btn';
  joinBtn.textContent = '入室';
  row.appendChild(joinBtn);

  const info = document.createElement('div');
  info.className = 'room-info';

  const blocked = document.createElement('p');
  blocked.className = 'panel-blocked';
  blocked.style.display = 'none';

  roomEntryEl.replaceChildren(heading, searchGroup, row, info, blocked);
  entry = { search, select, joinBtn, info, blocked };

  select.addEventListener('change', renderSelectedRoom);

  joinBtn.addEventListener('click', () => {
    const roomId = select.value;
    if (!roomId) return;
    window.location.href = `/combined_layout.html?room=${encodeURIComponent(roomId)}`;
  });

  search.addEventListener('input', () => {
    // 手元に全件あるなら、絞り込みは手元で済ませる（サーバーを叩かない）
    if (!truncated) {
      fillRoomSelect();
      return;
    }
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadRooms(), SEARCH_DEBOUNCE_MS);
  });
}

// いま検索欄で絞った結果。サーバー側で絞ってもらった場合（truncated）は、
// 返ってきたものが既に絞り込み済みなのでそのまま使う。
function visibleRooms() {
  const needle = entry.search.value.trim().toLowerCase();
  if (!needle || truncated) return rooms;
  return rooms.filter((room) => String(room.name || '').toLowerCase().includes(needle));
}

function fillRoomSelect() {
  const list = visibleRooms();
  // 選び直しの手間を増やさないよう、まだ一覧に残っていれば選択を保つ
  const previous = entry.select.value;

  entry.select.innerHTML = '';

  if (list.length === 0) {
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = rooms.length === 0
      ? '（部屋がまだありません）'
      : '（見つかりませんでした）';
    entry.select.appendChild(empty);
  } else {
    list.forEach((room) => {
      const option = document.createElement('option');
      option.value = room.id;
      // 鍵マークは入室パスワードのある部屋の目印。パスワード自体の照合はサーバー側
      // （server/index.jsのWebSocket接続時）。
      // ここだけ絵文字のままなのは、<option>の中に要素を置けないため（HTMLの仕様）。
      // 他の鍵はjs/icons.jsのSVGに揃えてある。
      const people = room.clients > 0 ? `${room.clients}人` : '';
      option.textContent = (room.locked ? '🔒 ' : '') + (room.name || room.id)
        + (people ? `（${people}）` : '');
      entry.select.appendChild(option);
    });
    if (list.some((room) => room.id === previous)) entry.select.value = previous;
  }

  renderSelectedRoom();
}

// 選択中の部屋の説明と、入室ボタンの可否。
function renderSelectedRoom() {
  const room = rooms.find((r) => r.id === entry.select.value) || null;

  entry.info.replaceChildren();
  entry.blocked.style.display = 'none';
  entry.joinBtn.disabled = !room;

  if (!room) return;

  const pluginLabel = room.activePlugin ? room.activePlugin : 'プラグインなし';
  const bcdiceLabel = bcdiceSystems.find((s) => s.id === room.bcdiceSystem)?.name || room.bcdiceSystem;
  // 人数は「今つないでいる接続の数」（server/index.jsのsummarizeRoom）。同じ人が
  // 2つのタブを開けば2と数える。部屋の参加者名簿ではなく、混み具合の目安として出している。
  const peopleLabel = room.clients > 0 ? `${room.clients}人が入室中` : '誰もいません';

  const meta = document.createElement('div');
  meta.textContent = `${pluginLabel} / ${bcdiceLabel} ・ ${peopleLabel}`;
  entry.info.appendChild(meta);

  if (room.locked) {
    const lockNote = document.createElement('div');
    setIconText(lockNote, 'lock', 'この部屋に入るには入室パスワードが必要です');
    entry.info.appendChild(lockNote);
  }

  // 期限が近い部屋にだけ、あと何日で自動削除されるかを出す。常に出すとうるさいだけなので、
  // 気づいて手を打てる範囲（3日以内）に絞る。保存期間そのものの説明はabout.htmlにある。
  const expiry = describeExpiry(room.updatedAt);
  if (expiry) {
    const expiryEl = document.createElement('div');
    expiryEl.className = 'room-expiry';
    expiryEl.textContent = expiry;
    expiryEl.title = '部屋は最終更新から2週間で自動的に削除されます。'
      + '入室して何か操作すれば、そこから2週間に延びます。';
    entry.info.appendChild(expiryEl);
  }

  // 動いていない卓は、アクティブな枠が埋まっていると始められない（サーバー側の判定を
  // そのまま受け取っている。実際に断るのもサーバー）。
  if (room.joinable === false) {
    entry.joinBtn.disabled = true;
    entry.blocked.textContent = 'いま動いている卓が上限に達しているため、この部屋には入れません。'
      + 'どこかの卓が終わるまで少しお待ちください。';
    entry.blocked.style.display = 'block';
  }
}

// --- 新規作成ブロック ---
let create = null;

function mountCreatePanel() {
  const heading = document.createElement('h2');
  heading.textContent = '新しい部屋を作る';

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.className = 'btn btn-secondary';
  openBtn.textContent = '初期設定を開く';
  openBtn.addEventListener('click', () => roomCreateEl.classList.toggle('open'));

  const blocked = document.createElement('p');
  blocked.className = 'panel-blocked';
  blocked.style.display = 'none';

  // --- 初期設定フォーム（名前・プラグイン・BCDiceシステム・入室パスワード・全データ読み込み） ---
  const form = document.createElement('form');
  form.className = 'create-form';

  const nameGroup = document.createElement('div');
  const nameLabel = document.createElement('label');
  nameLabel.textContent = '部屋名';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.required = true;
  nameInput.maxLength = 100;
  nameInput.placeholder = '例：日曜夜のクトゥルフ';
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  form.appendChild(nameGroup);

  const selectRow = document.createElement('div');
  selectRow.className = 'create-form-row';

  const pluginGroup = document.createElement('div');
  const pluginLabel = document.createElement('label');
  pluginLabel.textContent = 'プラグイン（システム）';
  const pluginSelect = document.createElement('select');
  buildSelectOptions(pluginSelect, listPlugins(), { noneLabel: '（プラグインなし）' });
  pluginGroup.appendChild(pluginLabel);
  pluginGroup.appendChild(pluginSelect);
  selectRow.appendChild(pluginGroup);

  const bcdiceGroup = document.createElement('div');
  const bcdiceLabel = document.createElement('label');
  bcdiceLabel.textContent = 'BCDiceのシステム';
  const bcdiceSelect = document.createElement('select');
  bcdiceGroup.appendChild(bcdiceLabel);
  bcdiceGroup.appendChild(bcdiceSelect);
  selectRow.appendChild(bcdiceGroup);

  form.appendChild(selectRow);

  // 入室パスワード（任意）。空欄なら今までどおり誰でも入れる部屋になる。
  const passwordGroup = document.createElement('div');
  const passwordLabel = document.createElement('label');
  passwordLabel.textContent = '入室パスワード（任意・空欄なら誰でも入れます）';
  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.maxLength = 64;
  passwordInput.placeholder = '参加者に伝える合言葉';
  passwordGroup.appendChild(passwordLabel);
  passwordGroup.appendChild(passwordInput);
  form.appendChild(passwordGroup);

  const fileGroup = document.createElement('div');
  const fileLabel = document.createElement('label');
  fileLabel.textContent = '部屋の全データ読み込み（任意・以前保存したファイル）';
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json';
  fileGroup.appendChild(fileLabel);
  fileGroup.appendChild(fileInput);
  form.appendChild(fileGroup);

  const errorText = document.createElement('p');
  errorText.className = 'error-text';
  errorText.style.display = 'none';
  form.appendChild(errorText);

  const btnRow = document.createElement('div');
  btnRow.className = 'create-form-buttons';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = '閉じる';
  cancelBtn.addEventListener('click', () => roomCreateEl.classList.remove('open'));
  btnRow.appendChild(cancelBtn);

  const createBtn = document.createElement('button');
  createBtn.type = 'submit';
  createBtn.className = 'btn';
  createBtn.textContent = '作成して入室';
  btnRow.appendChild(createBtn);

  form.appendChild(btnRow);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorText.style.display = 'none';

    let importedState;
    const file = fileInput.files?.[0];
    if (file) {
      try {
        importedState = parseUntrustedJson(await file.text());
      } catch (error) {
        errorText.textContent = `ファイルの読み込みに失敗しました: ${error.message}`;
        errorText.style.display = 'block';
        return;
      }
    }

    createBtn.disabled = true;
    createBtn.textContent = '作成中...';

    try {
      // 部屋IDはサーバーが決める（応答のidがそれ）。こちらからは送らない。
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.value,
          activePlugin: pluginSelect.value || null,
          bcdiceSystem: bcdiceSelect.value,
          entryPassword: passwordInput.value,
          importedState
        })
      });

      const result = await response.json();
      if (!response.ok) {
        errorText.textContent = result.error || '部屋の作成に失敗しました。';
        errorText.style.display = 'block';
        createBtn.disabled = false;
        createBtn.textContent = '作成して入室';
        return;
      }

      // 作った本人は続けて入室するので、入力したパスワードをこのブラウザに覚えさせて
      // おく（覚えさせないと、遷移した直後に自分で入力し直すことになる）。
      setStoredEntryPassword(result.id, passwordInput.value.trim());
      window.location.href = `/combined_layout.html?room=${encodeURIComponent(result.id)}`;
    } catch (error) {
      errorText.textContent = `通信エラー: ${error.message}`;
      errorText.style.display = 'block';
      createBtn.disabled = false;
      createBtn.textContent = '作成して入室';
    }
  });

  roomCreateEl.replaceChildren(heading, openBtn, blocked, form);
  create = { openBtn, blocked, bcdiceSelect, createBtn };
}

// BCDiceのシステム一覧は最初の読み込みで届く。届いてから作成フォームのselectを埋める。
function fillBcdiceSelect() {
  if (bcdiceSystems.length > 0) {
    buildSelectOptions(create.bcdiceSelect, bcdiceSystems, { labelKey: 'name' });
    // 部屋作成時にシステムが決まったタイミングで、そのシステムの情報（command_pattern /
    // help_message）を先に取りに行き、サーバー側のキャッシュを温めておく。
    create.bcdiceSelect.addEventListener('change', () => prefetchGameSystemInfo(create.bcdiceSelect.value));
  } else {
    // 一覧を取得できなかった場合。値を空で送るとサーバー側が既定システムを使う。
    buildSelectOptions(create.bcdiceSelect, [], { noneLabel: '（一覧を取得できませんでした：既定のシステムで作成します）' });
  }
}

// 作れない理由（アクティブな卓が満杯・ファイル置き場の残量不足）はサーバーが決める。
// ここは受け取った文言をそのまま出すだけで、判定は持たない。
function renderCreateAvailability(canCreate, reason) {
  create.openBtn.disabled = !canCreate;
  create.createBtn.disabled = !canCreate;

  if (canCreate) {
    create.blocked.style.display = 'none';
    return;
  }
  roomCreateEl.classList.remove('open');
  create.blocked.textContent = reason || 'いま新しい部屋を作れません。';
  create.blocked.style.display = 'block';
}

async function loadRooms() {
  // BCDiceのシステム一覧は部屋一覧と同時に取りに行く。こちらが失敗しても
  // 部屋の一覧表示と入室は成立させたいので、失敗は空配列に丸めて先へ進む。
  const systemsPromise = bcdiceSystems.length > 0
    ? Promise.resolve(bcdiceSystems)
    : fetchGameSystems().catch((error) => {
      console.warn('[room-index] BCDiceのシステム一覧を取得できませんでした:', error.message);
      return [];
    });

  // 検索欄はまだ無いことがある（初回）。その場合は絞り込みなしで取りに行く。
  const query = entry ? entry.search.value.trim() : '';
  const url = query ? `/api/rooms?q=${encodeURIComponent(query)}` : '/api/rooms';

  try {
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();
    const systems = await systemsPromise;
    const firstLoad = entry === null;
    if (bcdiceSystems.length === 0) bcdiceSystems = systems;

    rooms = Array.isArray(data.rooms) ? data.rooms : [];
    truncated = !!data.truncated;

    renderServerStatus(data.serverLoad || null);

    if (firstLoad) {
      mountEntryPanel();
      mountCreatePanel();
      fillBcdiceSelect();
    }
    fillRoomSelect();
    renderCreateAvailability(data.canCreate !== false, data.createBlockedReason);
  } catch (error) {
    // 一覧が出せなかったときも、押し直せる更新ボタンだけは残す
    renderServerStatus(null);
    if (entry === null) {
      const errorEl = document.createElement('p');
      errorEl.className = 'error-text';
      errorEl.textContent = `部屋一覧の取得に失敗しました: ${error.message}`;
      roomEntryEl.replaceChildren(errorEl);
    }
  }
}

// HTMLにdata-iconで置き場所だけ書いてあるアイコン（コマ作成ツールへのリンク）を埋める
applyStaticIcons();

loadRooms();

// 「アプリとして追加」の導線は部屋一覧にだけ置く（盤面の狭いヘッダーには置き場が無く、
// セッション中に出ても邪魔なだけなので）。
registerServiceWorker();
mountInstallPrompt(document.querySelector('.header-links'));
