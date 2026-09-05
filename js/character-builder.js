// js/character-builder.js
// 部屋を作らずにコマを作る「コマ作成ツール」ページ。作ったコマはこのブラウザの棚
// （js/token-library.js）に残り、部屋のキャラクター一覧から引き込める。
//
// showCharacterEditDialog（部屋のキャラクター更新ダイアログと同じもの）と
// ImmutableStore（部屋のStoreと同じ純粋なリデューサー、DOM/ネットワーク非依存）を、
// 部屋に紐づかない使い捨てのローカルインスタンスの上でそのまま動かすことで、
// 部屋の中でコマを作る/編集する時と全く同じロジック（プラグインごとの初期パラメータ、
// 派生パラメータの自動計算、値上書きのマージ規則）を再利用する。プラグイン固有の
// 設定項目（DX3ならエフェクト/コンボ編集）は renderCharacterPanel 経由でプラグインに
// 委譲されるため、このページにプラグイン固有のコードは書かない。
//
// 【画面の作り】棚（保存したコマの一覧）が主で、編集はその上に開くダイアログ。
// 以前は「始め方を選ぶ → ダイアログ → 保存後の画面」という一本道で、保存が無かったため
// リロードどころかダイアログのキャンセルだけで作りかけが消えていた。棚を主にしたことで
// 「今どこにいるか」が常に同じ場所になり、キャンセルしても帰る先がある。

import { ImmutableStore, generateBuffId, getEffectiveParameterValue } from './game-store.js';
import {
  listPlugins, pluginHasCharacterImport, importCharacterJsonForPlugin, getPluginSheetSource
} from './parameters/registry.js';
import { importCharacterJsonGeneric } from './character-json-import.js';
import { registerServiceWorker } from './pwa.js';
import { promptForCharacterSheetJson } from './character-sheet-import.js';
import { showCharacterEditDialog, applyCharacterEditResult } from './character-dialog.js';
import { pickFileAsText } from './file-uploader.js';
import { isTokenSnapshot, downloadJSON, parseJsonText } from './character-snapshot.js';
import { setIconText } from './icons.js';
import { showContextMenu } from './context-menu.js';
import {
  MAX_LIBRARY_TOKENS, buildLibraryEntry, listTokenLibrary, removeLibraryToken, saveLibraryToken
} from './token-library.js';

const DRAFT_TOKEN_ID = 'draft';

const root = document.getElementById('builderRoot');

// 部屋を経由しない使い捨てのStore。ADD_CHARACTER/IMPORT_CHARACTER_DATA/
// RESTORE_CHARACTER_SNAPSHOT等が参照するroom状態はactivePluginのみのため、
// これだけで部屋の中と同じ計算結果が得られる（ネットワーク副作用は一切ない）。
let draftStore = null;

// 今ダイアログで開いている（または直前に閉じた）1体の素性。
//   libraryId: 棚のどの行を編集しているか。nullなら新規＝保存すると1行増える
//   savedAt:   最初に保存した時刻。編集で書き換えないために持ち回る
//   pluginId:  この1体のシステム
// 「キャンセルしても作りかけを捨てない」ために、ダイアログを閉じても残す。
let draft = null;

// 棚の中身。IndexedDBは非同期なので、描画は読み終わってから。
let libraryEntries = [];
let libraryLoaded = false;

// 棚の下に出す1行（保存した・断られた・作りかけがある）。次の描画まで残す。
let notice = null;

function setNotice(kind, text) {
  notice = text ? { kind, text } : null;
}

// board-data-driven.jsのresolveCharacterImportと同じ考え方だが、部屋のstoreから
// activePluginを読む代わりに、選択されたプラグインIDを明示的に受け取る。
function resolveImport(pluginId, json) {
  return (pluginId && pluginHasCharacterImport(pluginId))
    ? importCharacterJsonForPlugin(pluginId, json)
    : importCharacterJsonGeneric(json);
}

// スナップショットの各パラメータが持つsource（'DX3'等）から、元々どのプラグインで
// 保存されたものかを推定する。プラグイン未選択のまま読み込んだ場合に選択肢へ反映する。
function detectPluginFromSnapshot(snapshot) {
  const sources = new Set(Object.values(snapshot.parameters || {}).map(p => p.source));
  const matched = listPlugins().find(plugin => sources.has(plugin.id));
  return matched ? matched.id : null;
}

function pluginLabelOf(pluginId) {
  if (!pluginId) return 'プラグインなし';
  return listPlugins().find(plugin => plugin.id === pluginId)?.label ?? pluginId;
}

function formatDate(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

// ------------------------------------------------------------------
// 画面
// ------------------------------------------------------------------

async function reloadLibrary() {
  libraryEntries = await listTokenLibrary();
  libraryLoaded = true;
  render();
}

function render() {
  root.innerHTML = '';
  root.appendChild(buildCreateCard());
  root.appendChild(buildShelf());
}

// 作る導線。プラグインの選択は「棚全体の設定」ではなく、これから作る1体の設定なので
// ここに置く（読み込み経路はスナップショットから自動判定されるので触らなくてよい）。
function buildCreateCard() {
  const card = document.createElement('div');
  card.className = 'builder-card';

  const pluginGroup = document.createElement('div');
  pluginGroup.className = 'builder-form-group';
  const pluginLabel = document.createElement('label');
  pluginLabel.textContent = 'これから作るコマのシステム';
  const pluginSelect = document.createElement('select');
  const noPluginOption = document.createElement('option');
  noPluginOption.value = '';
  noPluginOption.textContent = '（プラグインなし）';
  pluginSelect.appendChild(noPluginOption);
  listPlugins().forEach(plugin => {
    const option = document.createElement('option');
    option.value = plugin.id;
    option.textContent = plugin.label;
    pluginSelect.appendChild(option);
  });
  pluginGroup.appendChild(pluginLabel);
  pluginGroup.appendChild(pluginSelect);
  card.appendChild(pluginGroup);

  const errorEl = document.createElement('p');
  errorEl.className = 'builder-error';
  errorEl.hidden = true;

  // 始め方は3つ。何も無いところから作る道を主（青）にし、手持ちのJSONから始める
  // 2つは副（枠線）にしてある。シートを持っていない人が最初に見るのがこのページなので、
  // 3つとも同じ見た目だと、どれを押せばいいのかが色から読み取れない。
  const actionList = document.createElement('div');
  actionList.className = 'builder-action-list';

  const newBtn = document.createElement('button');
  newBtn.type = 'button';
  newBtn.className = 'builder-primary-btn';
  newBtn.textContent = '新規作成';
  newBtn.addEventListener('click', () => {
    errorEl.hidden = true;
    startNew(pluginSelect.value || null);
  });
  actionList.appendChild(newBtn);

  const loadBtn = document.createElement('button');
  loadBtn.type = 'button';
  loadBtn.className = 'builder-secondary-btn';
  loadBtn.textContent = 'JSONファイルから';
  actionList.appendChild(loadBtn);

  // シートのURLから直接取り込む道。以前は対応システム以外で display:none にしていたが、
  // 選び直すたびに下の要素が動いて押し間違いを招いた。場所は常に取り、押せない理由を
  // titleで示す。
  const urlBtn = document.createElement('button');
  urlBtn.type = 'button';
  urlBtn.className = 'builder-secondary-btn';
  actionList.appendChild(urlBtn);

  function syncUrlButton() {
    const source = getPluginSheetSource(pluginSelect.value || null);
    urlBtn.disabled = !source;
    urlBtn.textContent = source ? `${source.label}のURLから` : 'シートのURLから';
    urlBtn.title = source ? '' : 'このシステムはURLからの取り込みに対応していません。';
  }
  syncUrlButton();
  pluginSelect.addEventListener('change', syncUrlButton);

  urlBtn.addEventListener('click', async () => {
    errorEl.hidden = true;
    const pluginId = pluginSelect.value || null;
    const source = getPluginSheetSource(pluginId);
    if (!source) return;

    const json = await promptForCharacterSheetJson(pluginId, source);
    if (!json) return;

    startEditing(pluginId, json, errorEl);
  });

  loadBtn.addEventListener('click', async () => {
    errorEl.hidden = true;
    const picked = await pickFileAsText({ accept: 'application/json' });
    if (!picked) return;

    const json = parseJsonText(picked.text);
    if (!json) return;

    let pluginId = pluginSelect.value || null;

    if (isTokenSnapshot(json)) {
      const detected = detectPluginFromSnapshot(json);
      if (detected) {
        pluginId = detected;
        pluginSelect.value = detected;
        syncUrlButton();
      }
    }

    startEditing(pluginId, json, errorEl);
  });

  card.appendChild(actionList);

  // 説明しているのは下2つのボタンだけなので、ボタンの後ろに置く
  const hint = document.createElement('p');
  hint.className = 'builder-hint';
  hint.textContent = '「JSONファイルから」では、外部キャラクターシートツール（ゆとシート様等）が出力したJSON、または本ツールで書き出したコマのスナップショットJSONを読み込めます。スナップショットJSONの場合、システムは自動で判定されます。';
  card.appendChild(hint);

  card.appendChild(errorEl);
  return card;
}

// 棚。保存したコマが並ぶ、このページの主。
function buildShelf() {
  const section = document.createElement('section');
  section.className = 'builder-shelf-section';

  const head = document.createElement('div');
  head.className = 'builder-shelf-head';

  const heading = document.createElement('h2');
  heading.className = 'builder-shelf-title';
  heading.textContent = '保存したコマ';
  head.appendChild(heading);

  const count = document.createElement('span');
  count.className = 'builder-shelf-count';
  count.textContent = libraryLoaded ? `${libraryEntries.length} / ${MAX_LIBRARY_TOKENS}` : '';
  head.appendChild(count);

  section.appendChild(head);

  if (notice) {
    const noticeEl = document.createElement('p');
    noticeEl.className = notice.kind === 'error' ? 'builder-error' : 'builder-status';
    if (notice.kind === 'saved') setIconText(noticeEl, 'check-circle', notice.text);
    else noticeEl.textContent = notice.text;
    section.appendChild(noticeEl);
  }

  // 作りかけが残っているときの帰り道。キャンセルで閉じても中身は捨てていない。
  if (draft && draftStore) {
    const resume = document.createElement('button');
    resume.type = 'button';
    resume.className = 'builder-secondary-btn builder-resume-btn';
    resume.textContent = `「${draftStore.state.tokens[DRAFT_TOKEN_ID]?.name || '作りかけ'}」の編集を続ける`;
    resume.addEventListener('click', () => openEditDialog());
    section.appendChild(resume);
  }

  if (!libraryLoaded) {
    const loading = document.createElement('p');
    loading.className = 'builder-hint';
    loading.textContent = '保存したコマを読み込んでいます…';
    section.appendChild(loading);
    return section;
  }

  if (libraryEntries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'builder-empty-note';
    empty.textContent = 'まだありません。上の「新規作成」から作ると、ここに並んで次に開いたときも残ります。';
    section.appendChild(empty);
    return section;
  }

  const grid = document.createElement('div');
  grid.className = 'builder-shelf';
  libraryEntries.forEach(entry => grid.appendChild(buildShelfCard(entry)));
  section.appendChild(grid);

  return section;
}

// 1体ぶんのカード。操作はボタンを並べず右クリックメニュー（部屋のコマと同じ作法）に
// 寄せてある。編集・複製・書き出し・削除の4つをボタンで並べると、狭い画面で文字が
// 2行に折れて読みにくくなるため。
function buildShelfCard(entry) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'builder-shelf-card';
  card.title = `${entry.name}（${pluginLabelOf(entry.pluginId)}）`;

  const avatar = document.createElement('div');
  avatar.className = 'builder-shelf-avatar';
  if (entry.snapshot.image) {
    const img = document.createElement('img');
    img.alt = '';
    img.src = entry.snapshot.image;
    // 画像が読めなくても行は残す（名前と操作の導線が消えると片付けられなくなる）
    img.addEventListener('error', () => img.remove());
    avatar.appendChild(img);
  } else if (entry.snapshot.color) {
    avatar.classList.add('is-color');
    // CSPでstyle属性は効かないので、色はCSSカスタムプロパティで渡す
    avatar.style.setProperty('--shelf-avatar-color', entry.snapshot.color);
  }
  card.appendChild(avatar);

  const body = document.createElement('div');
  body.className = 'builder-shelf-body';

  const name = document.createElement('span');
  name.className = 'builder-shelf-name';
  name.textContent = entry.name;
  body.appendChild(name);

  const meta = document.createElement('span');
  meta.className = 'builder-shelf-meta';
  meta.textContent = [pluginLabelOf(entry.pluginId), formatDate(entry.updatedAt)]
    .filter(Boolean).join(' · ');
  body.appendChild(meta);

  card.appendChild(body);

  const openMenu = (x, y) => showContextMenu(x, y, buildCardMenu(entry));
  card.addEventListener('click', (event) => {
    const rect = card.getBoundingClientRect();
    openMenu(event.clientX || rect.left + 8, event.clientY || rect.bottom);
  });
  card.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    openMenu(event.clientX, event.clientY);
  });

  return card;
}

function buildCardMenu(entry) {
  return [
    { label: '編集', onSelect: () => startEditingLibraryEntry(entry) },
    { label: '複製', onSelect: () => duplicateEntry(entry) },
    { label: 'JSONを書き出す', onSelect: () => downloadJSON(`${entry.name}.json`, entry.snapshot) },
    {
      label: '削除',
      danger: true,
      onSelect: async () => {
        if (!confirm(`「${entry.name}」を棚から消しますか？\n（書き出したJSONファイルは残ります）`)) return;
        await removeLibraryToken(entry.id);
        setNotice('saved', `「${entry.name}」を棚から消しました。`);
        await reloadLibrary();
      }
    }
  ];
}

// ------------------------------------------------------------------
// 作る・編集する
// ------------------------------------------------------------------

// 何も読み込まずに1体作る道。ADD_CHARACTER が、選ばれたプラグインの初期パラメータを
// 組み立てて自動計算（applyPluginDerivedParameters）まで済ませるので（js/game-store.js）、
// ここでやることは器を用意して撃つことだけ。この先は読み込み経路と同じ道を通る。
function startNew(pluginId) {
  draftStore = new ImmutableStore({ room: { activePlugin: pluginId }, tokens: {} });
  draftStore.dispatch('ADD_CHARACTER', { id: DRAFT_TOKEN_ID, name: '新規キャラクター', x: 0, y: 0 });
  draft = { libraryId: null, savedAt: null, pluginId };
  openEditDialog();
}

function startEditing(pluginId, json, errorEl) {
  const snapshot = isTokenSnapshot(json);
  const importResult = snapshot ? null : resolveImport(pluginId, json);
  if (!snapshot && !importResult) {
    errorEl.textContent = 'このJSONを読み込めませんでした。';
    errorEl.hidden = false;
    return;
  }

  draftStore = new ImmutableStore({ room: { activePlugin: pluginId }, tokens: {} });

  const initialName = (snapshot ? json.name : importResult.name) || '新規キャラクター';
  draftStore.dispatch('ADD_CHARACTER', { id: DRAFT_TOKEN_ID, name: initialName, x: 0, y: 0 });

  if (snapshot) {
    draftStore.dispatch('RESTORE_CHARACTER_SNAPSHOT', { id: DRAFT_TOKEN_ID, snapshot: json });
  } else {
    draftStore.dispatch('IMPORT_CHARACTER_DATA', {
      id: DRAFT_TOKEN_ID,
      name: importResult.name,
      valueOverrides: importResult.valueOverrides,
      labelOverrides: importResult.labelOverrides,
      newParameters: importResult.newParameters,
      components: importResult.components
    });
  }

  draft = { libraryId: null, savedAt: null, pluginId };
  openEditDialog();
}

// 棚の1件を開く。保存すると同じ行を上書きする（libraryIdを持ち回るのがその印）。
function startEditingLibraryEntry(entry) {
  draftStore = new ImmutableStore({ room: { activePlugin: entry.pluginId }, tokens: {} });
  draftStore.dispatch('ADD_CHARACTER', { id: DRAFT_TOKEN_ID, name: entry.name, x: 0, y: 0 });
  draftStore.dispatch('RESTORE_CHARACTER_SNAPSHOT', { id: DRAFT_TOKEN_ID, snapshot: entry.snapshot });
  draft = { libraryId: entry.id, savedAt: entry.savedAt, pluginId: entry.pluginId };
  openEditDialog();
}

// 複製は棚の上で完結させる（編集画面を開かない）。名前だけ変えて即座に1行増やす。
//
// buildLibraryEntry へ渡しているのはコマではなくスナップショットだが、これでよい：
// スナップショットは buildTokenSnapshot がコマから抜いた同じ名前の欄の集まりなので、
// もう一度通しても同じ形に戻る（js/character-snapshot.js）。
async function duplicateEntry(entry) {
  const name = `${entry.name}のコピー`;
  const result = await saveLibraryToken(
    buildLibraryEntry({ ...entry.snapshot, name }, entry.pluginId)
  );
  if (!result.ok) setNotice('error', result.reason);
  else setNotice('saved', `「${name}」を棚に増やしました。`);
  await reloadLibrary();
}

function openEditDialog() {
  const isNew = draft.libraryId === null;
  showCharacterEditDialog({
    character: draftStore.state.tokens[DRAFT_TOKEN_ID],
    activePluginId: draft.pluginId,
    onComponentChange: (componentKey, value) => {
      draftStore.dispatch('SET_COMPONENT', { id: DRAFT_TOKEN_ID, componentKey, value });
    },
    // ダイアログを開いたまま複数回エフェクト/コンボを編集しても巻き戻らないよう、
    // 開いた時点のスナップショットではなく都度最新を返す（部屋側と同じ理由）。
    getComponents: () => draftStore.state.tokens[DRAFT_TOKEN_ID]?.components ?? {},
    tokenId: DRAFT_TOKEN_ID,
    dispatch: draftStore.dispatch.bind(draftStore),
    getToken: () => draftStore.state.tokens[DRAFT_TOKEN_ID],
    getEffectiveParameterValue,
    generateBuffId,
    // 能力値・技能値（editable:falseのパラメータ）の編集は、この部屋の外の作成ツールでのみ許可する。
    // 部屋側はこのオプションを渡さない＝既定のfalseのままなので、従来どおり閲覧専用。
    allowParameterEdit: true,
    // 押した結果が「棚へ保存」なので、そう書く。部屋側は渡さない＝「更新」のまま。
    dialogTitle: isNew ? 'コマを作る' : 'コマを編集',
    confirmLabel: '保存',
    // rollBCDice: コンボの発動/判定/ダメージ（チャットコマンド専用）でのみ使われ、
    // コンボ設定ボックス自体は使わないため渡さない。
    onConfirm: async (result) => {
      applyCharacterEditResult(draftStore, DRAFT_TOKEN_ID, result);
      const finalToken = draftStore.state.tokens[DRAFT_TOKEN_ID];

      const saved = await saveLibraryToken(buildLibraryEntry(finalToken, draft.pluginId, {
        id: draft.libraryId, savedAt: draft.savedAt
      }));

      if (!saved.ok) {
        // 断られたときこそ作りかけを捨てない。理由を出し、編集を続ける道を残す。
        setNotice('error', saved.reason);
        await reloadLibrary();
        return;
      }

      setNotice('saved', `「${finalToken.name}」を保存しました。`);
      draft = null;
      draftStore = null;
      await reloadLibrary();
    }
  });

  // キャンセル・Escで閉じてもonConfirmは呼ばれない。draft/draftStoreを捨てずに残し、
  // 棚に「編集を続ける」を出しておく（以前はここで作りかけが消え、戻る道も無かった）。
  // ダイアログの閉じるイベントはこの環境で発火しないので（js/original-table-dialog.js
  // 冒頭と同じ事情）、閉じたかを見張るのではなく、開くと同時に帰り道を用意しておく。
  render();
}

// ------------------------------------------------------------------

reloadLibrary();

// このページを直接開いた人にもSWを行き渡らせる（scopeは/なので、どのページから
// 登録しても同じものが働く）。「アプリとして追加」のボタンは部屋一覧だけに置く。
registerServiceWorker();
