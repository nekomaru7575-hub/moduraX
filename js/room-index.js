// js/room-index.js
// 部屋一覧ページ（index.html）のロジック。/api/roomsで一覧を取得し、
// 使用中の部屋は「入室」リンク、空き部屋は名前・プラグイン・BCDiceシステム・
// （任意で）全データ読み込みの簡易フォームを表示する。部屋の作成自体は
// このページ上で完結させ（POST /api/rooms）、成功したらそのまま盤面へ遷移する。
// 部屋作成前はWebSocket接続を一切受け付けないサーバー側仕様と対になっている。
// 一覧の上には、同じ応答に載ってくるサーバーの混雑状況を出す（renderServerStatus）。

import { listPlugins } from './parameters/registry.js';
import { fetchGameSystems, prefetchGameSystemInfo } from './bcdice-catalog.js';
import { setStoredEntryPassword } from './room-entry.js';
import { parseUntrustedJson } from './untrusted-json.js';
import { registerServiceWorker, mountInstallPrompt } from './pwa.js';

const roomListEl = document.getElementById('roomList');
const serverStatusEl = document.getElementById('serverStatus');

// BCDiceのシステム一覧。手書きの定数を持たず、ページを開いたときにAPI（サーバー側で
// キャッシュ済み）から取得したものを、全カードのselectと使用中カードの表示名で共有する。
// 取得に失敗した場合は空のままで、部屋一覧の表示・入室自体は止めない。
let bcdiceSystems = [];

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
// 部屋一覧の上に1行で出す。サーバーが実際に断る根拠にしている上限をそのまま見せるので、
// 「今は大きな読み込みをやめておく」「今なら入れる」を入室前に判断できる。
//
// 自動では更新しない（更新ボタンだけ）。無料枠のPaaSは無操作でスピンダウンするので、
// 一覧を開きっぱなしのタブが定期的に叩くと、それだけで起こし続けることになる。
const LOAD_LEVELS = {
  quiet:   { className: 'quiet',   label: '空いています' },
  busy:    { className: 'busy',    label: 'やや混み合っています' },
  crowded: { className: 'crowded', label: '混み合っています' }
};

const CROWDED_NOTE = '大きなデータの読み込み・書き出しや、新しい入室は断られることがあります。'
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
    // 「接続」で「人」ではない。入室パスワードの入力待ちや、まだどの部屋にも入っていない
    // 接続もここに数えられる（上限WS_MAX_CONNECTIONSがそれを数えて断るため）。
    // 部屋ごとの人数は各カードのほうに出している。
    appendMetric(metrics, '接続', load.connections, ` / ${load.maxConnections}`);
    appendMetric(metrics, '読み込み・書き出し', load.heavyRunning + load.heavyWaiting, ` / ${load.maxHeavy}件`);
    appendMetric(metrics, 'メモリ', load.memoryUsedMb, ` / ${load.memoryBudgetMb}MB`);
    appendMetric(metrics, '読み込める最大', load.importHeadroomMb, 'MB');
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
// 残りがこれ以下になったら一覧に出す
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

function buildOccupiedCard(room) {
  const card = document.createElement('div');
  card.className = 'room-card';

  const header = document.createElement('div');
  header.className = 'room-card-header';

  const titleBlock = document.createElement('div');

  // 入室パスワードのある部屋には鍵マークを付ける（部屋名やシステムは今までどおり見せる）。
  // パスワード自体の照合はサーバー側（server/index.jsのWebSocket接続時）。
  const title = document.createElement('div');
  title.className = 'room-card-title';
  title.textContent = (room.locked ? '🔒 ' : '') + (room.name || room.id);
  if (room.locked) title.title = 'この部屋に入るには入室パスワードが必要です';
  titleBlock.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'room-card-meta';
  const pluginLabel = room.activePlugin ? room.activePlugin : 'プラグインなし';
  const bcdiceLabel = bcdiceSystems.find((s) => s.id === room.bcdiceSystem)?.name || room.bcdiceSystem;
  // 人数は「今つないでいる接続の数」（server/index.jsのsummarizeRoomSlot）。同じ人が
  // 2つのタブを開けば2と数える。部屋の参加者名簿ではなく、混み具合の目安として出している。
  const peopleLabel = room.clients > 0 ? `${room.clients}人が入室中` : '誰もいません';
  meta.textContent = `${pluginLabel} / ${bcdiceLabel} ・ ${peopleLabel}`;
  titleBlock.appendChild(meta);

  // 期限が近い部屋にだけ、あと何日で自動削除されるかを出す。常に出すと普段の一覧が
  // うるさくなるだけなので、気づいて手を打てる範囲（3日以内）に絞る。
  // 保存期間そのものの説明はabout.htmlに書いてあるので、ここは一行だけ。
  const expiry = describeExpiry(room.updatedAt);
  if (expiry) {
    const expiryEl = document.createElement('div');
    expiryEl.className = 'room-card-expiry';
    expiryEl.textContent = expiry;
    expiryEl.title = '部屋は最終更新から2週間で自動的に削除されます。'
      + '入室して何か操作すれば、そこから2週間に延びます。';
    titleBlock.appendChild(expiryEl);
  }

  header.appendChild(titleBlock);

  const joinLink = document.createElement('a');
  joinLink.className = 'btn';
  joinLink.textContent = '入室';
  joinLink.href = `/combined_layout.html?room=${encodeURIComponent(room.id)}`;
  header.appendChild(joinLink);

  card.appendChild(header);
  return card;
}

function buildVacantCard(room) {
  const card = document.createElement('div');
  card.className = 'room-card vacant';

  const header = document.createElement('div');
  header.className = 'room-card-header';

  const titleBlock = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'room-card-title';
  title.textContent = `${room.id}（空き部屋）`;
  titleBlock.appendChild(title);
  header.appendChild(titleBlock);

  const setupBtn = document.createElement('button');
  setupBtn.type = 'button';
  setupBtn.className = 'btn btn-secondary';
  setupBtn.textContent = '初期設定';
  setupBtn.addEventListener('click', () => {
    card.classList.toggle('open');
  });
  header.appendChild(setupBtn);

  card.appendChild(header);

  // --- 初期設定フォーム（名前・プラグイン・BCDiceシステム・全データ読み込み） ---
  const form = document.createElement('form');
  form.className = 'vacant-form';

  const nameGroup = document.createElement('div');
  const nameLabel = document.createElement('label');
  nameLabel.textContent = '部屋名';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.required = true;
  nameInput.placeholder = room.id;
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  form.appendChild(nameGroup);

  const selectRow = document.createElement('div');
  selectRow.className = 'vacant-form-row';

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
  if (bcdiceSystems.length > 0) {
    buildSelectOptions(bcdiceSelect, bcdiceSystems, { labelKey: 'name' });
    // 部屋作成時にシステムが決まったタイミングで、そのシステムの情報（command_pattern /
    // help_message）を先に取りに行き、サーバー側のキャッシュを温めておく。
    bcdiceSelect.addEventListener('change', () => prefetchGameSystemInfo(bcdiceSelect.value));
  } else {
    // 一覧を取得できなかった場合。値を空で送るとサーバー側が既定システムを使う。
    buildSelectOptions(bcdiceSelect, [], { noneLabel: '（一覧を取得できませんでした：既定のシステムで作成します）' });
  }
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
  btnRow.className = 'vacant-form-buttons';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', () => card.classList.remove('open'));
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
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: room.id,
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
      setStoredEntryPassword(room.id, passwordInput.value.trim());
      window.location.href = `/combined_layout.html?room=${encodeURIComponent(room.id)}`;
    } catch (error) {
      errorText.textContent = `通信エラー: ${error.message}`;
      errorText.style.display = 'block';
      createBtn.disabled = false;
      createBtn.textContent = '作成して入室';
    }
  });

  card.appendChild(form);
  return card;
}

async function loadRooms() {
  // BCDiceのシステム一覧は部屋一覧と同時に取りに行く。こちらが失敗しても
  // 部屋の一覧表示と入室は成立させたいので、失敗は空配列に丸めて先へ進む。
  const systemsPromise = fetchGameSystems().catch((error) => {
    console.warn('[room-index] BCDiceのシステム一覧を取得できませんでした:', error.message);
    return [];
  });

  try {
    const response = await fetch('/api/rooms', { cache: 'no-store' });
    const data = await response.json();
    bcdiceSystems = await systemsPromise;

    renderServerStatus(data.serverLoad || null);

    roomListEl.innerHTML = '';
    data.rooms.forEach((room) => {
      const card = room.occupied ? buildOccupiedCard(room) : buildVacantCard(room);
      roomListEl.appendChild(card);
    });
  } catch (error) {
    // 一覧が出せなかったときも、押し直せる更新ボタンだけは残す
    renderServerStatus(null);
    roomListEl.innerHTML = '';
    const errorEl = document.createElement('p');
    errorEl.style.color = '#f28b82';
    errorEl.textContent = `部屋一覧の取得に失敗しました: ${error.message}`;
    roomListEl.appendChild(errorEl);
  }
}

loadRooms();

// 「アプリとして追加」の導線は部屋一覧にだけ置く（盤面の狭いヘッダーには置き場が無く、
// セッション中に出ても邪魔なだけなので）。
registerServiceWorker();
mountInstallPrompt(document.querySelector('.header-links'));
