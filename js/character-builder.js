// js/character-builder.js
// 部屋を作らずに、外部キャラクターシートツール（ゆとシート等）のJSON、または
// 本アプリのコマ丸ごとスナップショットJSONを読み込んで編集し、スナップショット
// JSONとして書き出す「コマ作成ツール」ページのロジック。
//
// showCharacterEditDialog（部屋のキャラクター更新ダイアログと同じもの）と
// ImmutableStore（部屋のStoreと同じ純粋なリデューサー、DOM/ネットワーク非依存）を、
// 部屋に紐づかない使い捨てのローカルインスタンスの上でそのまま動かすことで、
// 部屋の中でコマを作る/編集する時と全く同じロジック（プラグインごとの初期パラメータ、
// 派生パラメータの自動計算、値上書きのマージ規則）を再利用する。プラグイン固有の
// 設定項目（DX3ならエフェクト/コンボ編集）は renderCharacterPanel 経由でプラグインに
// 委譲されるため、このページにプラグイン固有のコードは書かない。

import { ImmutableStore, generateBuffId, getEffectiveParameterValue } from './game-store.js';
import {
  listPlugins, pluginHasCharacterImport, importCharacterJsonForPlugin, getPluginSheetSource
} from './parameters/registry.js';
import { importCharacterJsonGeneric } from './character-json-import.js';
import { registerServiceWorker } from './pwa.js';
import { promptForCharacterSheetJson } from './character-sheet-import.js';
import { showCharacterEditDialog, applyCharacterEditResult } from './character-dialog.js';
import { pickFileAsText } from './file-uploader.js';
import { isTokenSnapshot, buildTokenSnapshot, downloadJSON, parseJsonText } from './character-snapshot.js';
import { applyStaticIcons, setIconText } from './icons.js';

const DRAFT_TOKEN_ID = 'draft';

const root = document.getElementById('builderRoot');

// 部屋を経由しない使い捨てのStore。ADD_CHARACTER/IMPORT_CHARACTER_DATA/
// RESTORE_CHARACTER_SNAPSHOT等が参照するroom状態はactivePluginのみのため、
// これだけで部屋の中と同じ計算結果が得られる（ネットワーク副作用は一切ない）。
let draftStore = null;

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

function renderLandingForm() {
  root.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'builder-card';

  const pluginGroup = document.createElement('div');
  pluginGroup.className = 'builder-form-group';
  const pluginLabel = document.createElement('label');
  pluginLabel.textContent = 'プラグイン（システム）';
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

  const hint = document.createElement('p');
  hint.className = 'builder-hint';
  hint.textContent = '外部キャラクターシートツール（ゆとシート等）が出力したJSON、または本ツールで書き出したコマのスナップショットJSONを読み込みます。スナップショットJSONの場合、プラグインは自動で判定されます。';
  card.appendChild(hint);

  const loadBtn = document.createElement('button');
  loadBtn.type = 'button';
  loadBtn.className = 'builder-primary-btn';
  loadBtn.textContent = 'JSONファイルを読み込んで編集';
  card.appendChild(loadBtn);

  // シートのURLから直接取り込む道。受け付け先を宣言しているシステムを選んだときだけ出す
  // （宣言が無いシステムでは、貼れるURLが1つも無いのでボタンごと隠す）。
  const urlBtn = document.createElement('button');
  urlBtn.type = 'button';
  urlBtn.className = 'builder-primary-btn';
  urlBtn.style.marginTop = '8px';
  card.appendChild(urlBtn);

  const errorEl = document.createElement('p');
  errorEl.className = 'builder-error';
  errorEl.style.display = 'none';
  card.appendChild(errorEl);

  function syncUrlButton() {
    const source = getPluginSheetSource(pluginSelect.value || null);
    urlBtn.style.display = source ? '' : 'none';
    urlBtn.textContent = source ? `${source.label}のURLから読み込んで編集` : '';
  }
  syncUrlButton();
  pluginSelect.addEventListener('change', syncUrlButton);

  urlBtn.addEventListener('click', async () => {
    errorEl.style.display = 'none';
    const pluginId = pluginSelect.value || null;
    const source = getPluginSheetSource(pluginId);
    if (!source) return;

    const json = await promptForCharacterSheetJson(pluginId, source);
    if (!json) return;

    startEditing(pluginId, json, errorEl);
  });

  loadBtn.addEventListener('click', async () => {
    errorEl.style.display = 'none';
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
      }
    }

    startEditing(pluginId, json, errorEl);
  });

  root.appendChild(card);
}

function startEditing(pluginId, json, errorEl) {
  const snapshot = isTokenSnapshot(json);
  const importResult = snapshot ? null : resolveImport(pluginId, json);
  if (!snapshot && !importResult) {
    errorEl.textContent = 'このJSONを読み込めませんでした。';
    errorEl.style.display = '';
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

  openEditDialog(pluginId);
}

function openEditDialog(pluginId) {
  showCharacterEditDialog({
    character: draftStore.state.tokens[DRAFT_TOKEN_ID],
    activePluginId: pluginId,
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
    // rollBCDice: コンボの発動/判定/ダメージ（チャットコマンド専用）でのみ使われ、
    // コンボ設定ボックス自体は使わないため渡さない。
    onConfirm: (result) => {
      applyCharacterEditResult(draftStore, DRAFT_TOKEN_ID, result);
      const finalToken = draftStore.state.tokens[DRAFT_TOKEN_ID];
      downloadJSON(`${finalToken.name || 'character'}.json`, buildTokenSnapshot(finalToken));
      renderPostSaveActions(pluginId, finalToken.name);
    }
  });
}

function renderPostSaveActions(pluginId, name) {
  root.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'builder-card';

  const status = document.createElement('p');
  status.className = 'builder-status';
  setIconText(status, 'check-circle', `「${name}」のJSONを保存しました。`);
  card.appendChild(status);

  const actionRow = document.createElement('div');
  actionRow.className = 'builder-action-row';

  const editAgainBtn = document.createElement('button');
  editAgainBtn.type = 'button';
  editAgainBtn.className = 'builder-primary-btn';
  editAgainBtn.textContent = '再編集してもう一度保存';
  editAgainBtn.addEventListener('click', () => openEditDialog(pluginId));
  actionRow.appendChild(editAgainBtn);

  const restartBtn = document.createElement('button');
  restartBtn.type = 'button';
  restartBtn.className = 'builder-secondary-btn';
  restartBtn.textContent = '別のファイルを読み込む';
  restartBtn.addEventListener('click', () => {
    draftStore = null;
    renderLandingForm();
  });
  actionRow.appendChild(restartBtn);

  card.appendChild(actionRow);
  root.appendChild(card);
}

// HTMLにdata-iconで置き場所だけ書いてあるアイコン（見出しのダイスなど）を埋める
applyStaticIcons();

renderLandingForm();

// このページを直接開いた人にもSWを行き渡らせる（scopeは/なので、どのページから
// 登録しても同じものが働く）。「アプリとして追加」のボタンは部屋一覧だけに置く。
registerServiceWorker();
