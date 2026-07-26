// js/main.js

import { rollBCDice } from './BCdice.js';
import {
  store, generateTokenId, generateBuffId, listPlugins, DEFAULT_TOKEN_COLOR, getEffectiveParameterValue,
  BUFF_PHASE_LABELS
} from './board-data-driven.js';
import { EventBus } from './EventBus.js';
import { showContextMenu } from './context-menu.js';
import { renderChatPalette } from './chat-palette.js';
import { makeResizableStack } from './resizable-stack.js';
import { initNetSync, replaceState } from './net-sync.js';
import { getLocalUserId } from './local-identity.js';
import { handlePluginChatCommand } from './parameters/registry.js';
import { showRoomParametersDialog } from './room-parameters-dialog.js';

// DOM要素の取得（ダイス関連）
const sendBtn = document.getElementById('sendBtn');
const gameSystemSelect = document.getElementById('gameSystem');
const characterParamSelect = document.getElementById('characterParamSelect');
const commandInput = document.getElementById('commandInput');
const logContainer = document.getElementById('logContainer');
const currentChatLog = document.getElementById('currentChatLog');
const currentChatPortrait = document.getElementById('currentChatPortrait');
const chatPalettePanel = document.getElementById('chatPalettePanel');
const controlArea = document.getElementById('controlArea');
const chatTabsEl = document.getElementById('chatTabs');
const netStatusEl = document.getElementById('netStatus');

// ログ／チャット欄／チャットパレットの高さをユーザーがドラッグで調整できるようにする
if (controlArea) {
  makeResizableStack({ container: controlArea, storageKey: 'controlAreaSectionSizesV2' });
}

// --- チャットタブ ---
// 「Main」タブは常に存在する既定タブ。他のタブはユーザーが追加する並行チャット用。
// タブ一覧・各タブのログはstore経由でサーバーと同期される。「今どのタブを見ているか」は
// 各クライアントのローカルUI状態（人によって見ているタブが違ってよい）としてここで保持する。
// 盤面下のカレントチャット欄（currentChatLog）は、選択中のタブに関わらずMainタブの内容だけを表示する。
const MAIN_TAB_ID = 'main';
let activeTabId = MAIN_TAB_ID;

let lastRenderedChatTabsRef = null;
let lastRenderedLogTabId = null; // logContainerに最後に描画したタブID（切り替え検知用）
let lastRenderedLogCount = 0;    // logContainerへ反映済みの件数（差分追記用）
let lastRenderedMainCount = 0;   // currentChatLogへ反映済みの件数（Mainタブ固定）
let lastSpokenCharacterId = null; // カレントチャット欄に最後に流れたメッセージの参照キャラクター（立ち絵表示用）

function renderChatTabs(state) {
  if (!chatTabsEl) return;
  chatTabsEl.innerHTML = '';

  state.chatTabs.forEach(tab => {
    const tabBtn = document.createElement('button');
    tabBtn.type = 'button';
    tabBtn.className = 'chat-tab' + (tab.id === activeTabId ? ' active' : '');
    tabBtn.textContent = tab.name;
    tabBtn.addEventListener('click', () => switchChatTab(tab.id));
    chatTabsEl.appendChild(tabBtn);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'chat-tab-add';
  addBtn.title = 'チャットタブを追加';
  addBtn.textContent = '+';
  addBtn.addEventListener('click', addChatTab);
  chatTabsEl.appendChild(addBtn);
}

function addChatTab() {
  const name = prompt('新しいチャットタブの名前を入力してください');
  if (!name || !name.trim()) return;

  const id = `tab-${Date.now()}`;
  store.dispatch('ADD_CHAT_TAB', { id, name: name.trim() });
  switchChatTab(id);
}

function switchChatTab(tabId) {
  activeTabId = tabId;
  lastRenderedLogTabId = null; // 強制的にlogContainerを描き直させる
  renderChatTabs(store.state);
  renderActiveTabLog(store.state);
}

// containerの末尾に、entries[fromIndex:]だけを追記する（既存分は再描画しない＝
// メッセージが増えるたびに過去ログのfadeInアニメーションが再生される事態を防ぐ）
function appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {}) {
  for (let i = fromIndex; i < entries.length; i++) {
    const item = document.createElement('div');
    item.className = itemClassName;
    item.innerHTML = buildLogHtml(entries[i], buildOptions);
    container.appendChild(item);
  }
  if (entries.length > fromIndex) {
    container.scrollTop = container.scrollHeight;
  }
}

function renderActiveTabLog(state) {
  if (!logContainer) return;
  const entries = state.chatLogs[activeTabId] || [];

  if (lastRenderedLogTabId !== activeTabId) {
    logContainer.innerHTML = '';
    lastRenderedLogTabId = activeTabId;
    lastRenderedLogCount = 0;
  }

  if (entries.length === 0) {
    if (logContainer.children.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'log-item log-placeholder';
      placeholder.style.color = '#888';
      placeholder.textContent = 'ここにダイスログが表示されます...';
      logContainer.appendChild(placeholder);
    }
    return;
  }

  if (lastRenderedLogCount === 0 && logContainer.querySelector('.log-placeholder')) {
    logContainer.innerHTML = '';
  }

  appendLogEntries(logContainer, entries, lastRenderedLogCount, 'log-item');
  lastRenderedLogCount = entries.length;
}

function renderMainChatMirror(state) {
  if (!currentChatLog) return;
  const entries = state.chatLogs[MAIN_TAB_ID] || [];

  if (entries.length > lastRenderedMainCount) {
    const latestEntry = entries[entries.length - 1];

    // 履歴を積み上げず、最新の発言1件だけに置き換える（要素を作り直すことで
    // fadeInアニメーションも都度再生される）。
    currentChatLog.innerHTML = '';
    const item = document.createElement('div');
    item.className = 'current-chat-log-item';
    item.innerHTML = buildLogHtml(latestEntry, { hideSystem: true });
    currentChatLog.appendChild(item);

    if ('characterId' in latestEntry) {
      lastSpokenCharacterId = latestEntry.characterId || null;
    }
  }

  lastRenderedMainCount = entries.length;
}

EventBus.subscribe('STATE_CHANGED', (state) => {
  if (state.chatTabs !== lastRenderedChatTabsRef) {
    lastRenderedChatTabsRef = state.chatTabs;
    renderChatTabs(state);
  }

  renderActiveTabLog(state);
  renderMainChatMirror(state);
  updateCurrentChatPortrait();
});

// 接続状態インジケータ（ヘッダー）
EventBus.subscribe('NET_STATUS_CHANGED', (status) => {
  if (!netStatusEl) return;
  netStatusEl.className = `net-status net-status-${status}`;
  netStatusEl.textContent = status === 'connected' ? '● 接続済み'
    : status === 'connecting' ? '● 接続中...'
    : '● 切断';
});

// DOM要素の取得（キャラクター登録関連）

const characterList = document.getElementById('characterList');

// ...(既存のDOM取得の並びに追加)
const roomPluginSelect = document.getElementById('roomPluginSelect');
const roomMenuBtn = document.getElementById('roomMenuBtn');
const roomSettingsDialog = document.getElementById('roomSettingsDialog');
const roomNameInput = document.getElementById('roomNameInput');
const roomNameLabel = document.getElementById('roomNameLabel');
const exportStateBtn = document.getElementById('exportStateBtn');
const importStateBtn = document.getElementById('importStateBtn');
const importStateInput = document.getElementById('importStateInput');

// キャラクター一覧パネルの折りたたみ（他プレイヤーには影響しない、見た目だけのローカル状態）
const characterPanelArea = document.getElementById('characterPanelArea');
const characterPanelCollapseBtn = document.getElementById('characterPanelCollapseBtn');
const characterPanelExpandBtn = document.getElementById('characterPanelExpandBtn');

if (characterPanelArea && characterPanelCollapseBtn && characterPanelExpandBtn) {
  characterPanelCollapseBtn.addEventListener('click', () => {
    characterPanelArea.classList.add('collapsed');
  });
  characterPanelExpandBtn.addEventListener('click', () => {
    characterPanelArea.classList.remove('collapsed');
  });
}

// バックヤードパネルの折りたたみ（キャラ一覧パネルと同じ、見た目だけのローカル状態）
const backyardPanelArea = document.getElementById('backyardPanelArea');
const backyardPanelCollapseBtn = document.getElementById('backyardPanelCollapseBtn');
const backyardPanelExpandBtn = document.getElementById('backyardPanelExpandBtn');
const backyardList = document.getElementById('backyardList');

if (backyardPanelArea && backyardPanelCollapseBtn && backyardPanelExpandBtn) {
  backyardPanelCollapseBtn.addEventListener('click', () => {
    backyardPanelArea.classList.add('collapsed');
  });
  backyardPanelExpandBtn.addEventListener('click', () => {
    backyardPanelArea.classList.remove('collapsed');
  });
}

// ルーム変数ダイアログを開き、結果（値の変更／削除／新規追加）を差分でdispatchする。
// ルーム設定（部屋名・BCDiceシステム等）とは独立したメニュー項目から呼ぶ。
function openRoomParametersDialog() {
  showRoomParametersDialog({
    parameters: store.state.room.parameters,
    onConfirm: ({ valueUpdates, removedParamIds, newParameters }) => {
      Object.entries(valueUpdates).forEach(([paramId, value]) => {
        const current = store.state.room.parameters[paramId];
        if (current && current.value !== value) {
          store.dispatch('SET_ROOM_PARAMETER', { paramId, value });
        }
      });
      removedParamIds.forEach(paramId => {
        store.dispatch('REMOVE_ROOM_PARAMETER', { paramId });
      });
      newParameters.forEach(({ key, label, value }) => {
        store.dispatch('ADD_ROOM_PARAMETER', { key, label, value });
      });
    }
  });
}

// ルームメニューボタン：クリックでドロップダウンを出し、選択でダイアログを開く
if (roomMenuBtn && roomSettingsDialog) {
  roomMenuBtn.addEventListener('click', () => {
    const rect = roomMenuBtn.getBoundingClientRect();
    showContextMenu(rect.left, rect.bottom + 4, [
      {
        label: 'ルーム設定',
        onSelect: () => roomSettingsDialog.showModal()
      },
      {
        label: 'ルーム変数',
        onSelect: openRoomParametersDialog
      },
      {
        label: '部屋一覧に戻る',
        onSelect: () => { window.location.href = '/'; }
      }
    ]);
  });
}

// セッションデータのファイル保存／読み込み。今の盤面・キャラ・チャットを丸ごとJSONに
// 書き出し、後で読み込んで復元できるようにする（サーバー側の再起動・リセット対策）。
if (exportStateBtn) {
  exportStateBtn.addEventListener('click', () => {
    const json = JSON.stringify(store.state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trpg-room-${dateStr}.json`;
    a.click();

    URL.revokeObjectURL(url);
  });
}

if (importStateBtn && importStateInput) {
  importStateBtn.addEventListener('click', () => {
    importStateInput.click();
  });

  importStateInput.addEventListener('change', async () => {
    const file = importStateInput.files?.[0];
    importStateInput.value = ""; // 同じファイルを連続で選び直せるようにリセット
    if (!file) return;

    let state;
    try {
      state = JSON.parse(await file.text());
    } catch (error) {
      alert(`ファイルの読み込みに失敗しました: ${error.message}`);
      return;
    }

    if (!confirm('読み込んだ内容で、今のセッション（接続中の全員）を上書きします。よろしいですか？')) {
      return;
    }

    replaceState(state);
  });
}

// ダイス処理イベント
EventBus.subscribe('DICE_ROLL_REQUESTED', async ({ system, rawInput, characterName, characterId, tabId = activeTabId }) => {
  if (!sendBtn) return;
  sendBtn.disabled = true;
  sendBtn.textContent = "送信中...";

  try {
    if (rawInput.includes('\n')) {
      applyLog({ system, character: characterName, characterId, resultText: rawInput }, tabId);
      commandInput.value = "";
      return;
    }

    const spaceIndex = splitForSpace(rawInput);
    const command = spaceIndex[0];
    const comment = spaceIndex.slice(1).join(" ");
    const isDiceCommand = /^[A-Za-z0-9+\-*/()<>=\[\]:]+$/.test(command);

    if (!isDiceCommand) {
      applyLog({ system, character: characterName, characterId, resultText: rawInput }, tabId);
      commandInput.value = "";
      return;
    }

    const { success, resultText, diceValues } = await rollBCDice(system, command);
    if (!success) throw new Error(resultText);

    const diceDetail = diceValues && diceValues.length > 0 ?
      diceValues.map(d => d.value).join(', ') : "";

    applyLog({ system, character: characterName, characterId, comment, resultText, diceDetail }, tabId);
    commandInput.value = "";

  } catch (error) {
    console.error(error);
    alert(`エラーが発生しました: ${error.message}`);
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "送信";
  }
});

// {パラメータ名}を、参照キャラクターの該当パラメータの実効値（基礎値＋バフ/デバフ合計）に
// 置換する。ダイスロールに直接影響させるため、基礎値ではなく実効値を使う。
// 参照キャラクターに同名パラメータが無い場合はルーム変数を探して代わりに使う
// （キャラクターの変数がルーム変数より優先される）。どちらにも見つからない場合は
// {パラメータ名}のまま残す。
function substituteCharacterParameters(text, character) {
  return text.replace(/\{([^{}]+)\}/g, (match, rawName) => {
    const name = rawName.trim();

    if (character) {
      const entry = Object.entries(character.parameters || {}).find(
        ([, p]) => p.label === name || p.key === name
      );
      if (entry) {
        const [paramId] = entry;
        return String(getEffectiveParameterValue(character, paramId));
      }
    }

    const roomEntry = Object.entries(store.state.room.parameters || {}).find(
      ([, p]) => p.label === name || p.key === name
    );
    if (roomEntry) {
      const [, param] = roomEntry;
      return String(param.value);
    }

    return match;
  });
}

// [演算子(+/-/=)][パラメータ名]([数値]) でパラメータを直接変更するコマンド。例: +侵蝕率(10)
// editable:falseのパラメータは変更不可。
const PARAMETER_COMMAND_PATTERN = /^([+\-=])(.+?)\(([+-]?\d+(?:\.\d+)?)\)$/;

function tryHandleParameterCommand(rawInput, character) {
  const match = rawInput.match(PARAMETER_COMMAND_PATTERN);
  if (!match) return false;

  const [, operator, rawName, rawNumber] = match;
  const name = rawName.trim();
  const amount = Number(rawNumber);

  if (!character) {
    alert('パラメータを変更するキャラクターを選択してください。');
    return true;
  }

  const entry = Object.entries(character.parameters || {}).find(
    ([, p]) => p.label === name || p.key === name
  );

  if (!entry) {
    alert(`パラメータ「${name}」が見つかりません。`);
    return true;
  }

  const [paramId, param] = entry;
  if (param.editable === false) {
    alert(`パラメータ「${name}」は変更できません。`);
    return true;
  }

  const before = param.value;
  const after = operator === '=' ? amount : operator === '+' ? before + amount : before - amount;

  store.dispatch('SET_PARAMETER', { characterId: character.id, paramId, value: after });
  applyLog({
    system: character.name,
    resultText: `${param.label}: ${before} → ${after}`
  });

  return true;
}

// バフ(名前,パラメータ,増減値,終了条件) または バフ>対象コマ名(名前,パラメータ,増減値,終了条件)
// で、コマにバフ/デバフを付与するコマンド。
// 例: バフ(集中,知覚,+10,シーン)　バフ>ゴブリンA(苦しみ,回避,-10,ラウンド)
// ">対象コマ名"を省略した場合は参照キャラクター欄で選択中のコマが対象になる（従来どおり）。
// 指定した場合はその名前のコマ（コマ名の完全一致）を、選択中のキャラクターより優先して
// 対象にする。終了条件は シーン/ラウンド/シナリオ/判定/プロセス/手動 のいずれか（「◯◯終了」表記でも可）。
// 対象パラメータが見つからない場合もバフ自体は付与するが、効果を持たない
// （getEffectiveParameterValue側で無視される）。
const BUFF_COMMAND_PATTERN = /^バフ(?:>([^(]+))?\(([^,]+),([^,]+),([+-]?\d+(?:\.\d+)?),([^,)]+)\)$/;

const BUFF_PHASE_TEXT_TO_KEY = {
  'シーン': 'scene', 'シーン終了': 'scene',
  'ラウンド': 'round', 'ラウンド終了': 'round',
  'シナリオ': 'scenario', 'シナリオ終了': 'scenario',
  '判定': 'check', '判定終了': 'check',
  'プロセス': 'process', 'プロセス終了': 'process',
  '手動': null, '手動のみ': null
};

function tryHandleBuffCommand(rawInput, character) {
  const match = rawInput.match(BUFF_COMMAND_PATTERN);
  if (!match) return false;

  const [, rawTargetName, rawName, rawParamName, rawDelta, rawPhase] = match;
  const name = rawName.trim();
  const paramName = rawParamName.trim();
  const delta = Number(rawDelta);
  const phaseText = rawPhase.trim();

  let targetCharacter = character;
  if (rawTargetName !== undefined) {
    const targetName = rawTargetName.trim();
    targetCharacter = Object.values(store.state.tokens).find(t => t.name === targetName) || null;
    if (!targetCharacter) {
      alert(`コマ「${targetName}」が見つかりません。`);
      return true;
    }
  }

  if (!targetCharacter) {
    alert('バフ/デバフを付与するキャラクターを選択してください。');
    return true;
  }

  const entry = Object.entries(targetCharacter.parameters || {}).find(
    ([, p]) => p.label === paramName || p.key === paramName
  );
  // パラメータが見つからなければparamId=nullのまま付与する（＝効果を持たないバフになる）
  const paramId = entry ? entry[0] : null;
  const expirePhase = phaseText in BUFF_PHASE_TEXT_TO_KEY ? BUFF_PHASE_TEXT_TO_KEY[phaseText] : null;

  store.dispatch('ADD_BUFF', {
    tokenId: targetCharacter.id,
    id: generateBuffId(),
    name,
    paramId,
    delta,
    expirePhase
  });

  const expireLabel = expirePhase ? `${BUFF_PHASE_LABELS[expirePhase]}終了で消滅` : '手動のみ';
  const targetLabel = entry ? entry[1].label : `${paramName}（対象なし）`;
  applyLog({
    system: targetCharacter.name,
    resultText: `バフ/デバフ付与: ${name}　${targetLabel}${delta >= 0 ? '+' : ''}${delta}　（${expireLabel}）`
  });

  return true;
}

// 「シーン終了」「ラウンド終了」「シナリオ終了」「判定終了」「プロセス終了」とだけ入力して送信すると、該当する終了条件の
// バフ/デバフを全コマから一括で消す（EXPIRE_BUFFSはstore側で全クライアント同期・ログ追記まで
// 完結するので、ここではdispatchするだけでよい）。標準の「シーン進行」機能実装までの
// エスケープハッチ。
const PHASE_END_COMMANDS = {
  'シーン終了': 'scene', 'ラウンド終了': 'round', 'シナリオ終了': 'scenario',
  '判定終了': 'check', 'プロセス終了': 'process'
};

function tryHandlePhaseEndCommand(rawInput) {
  const phase = PHASE_END_COMMANDS[rawInput.trim()];
  if (!phase) return false;

  store.dispatch('EXPIRE_BUFFS', { phase });
  return true;
}

// 適用中プラグイン固有のチャットコマンド（DX3のcombo.awk/combo.jdm/combo.dmg等）を試す。
// プラグイン未適用、または該当コマンドでなければfalseを返し、通常のダイスロール等に委ねる。
// 実処理（判定/ダメージのロール・バフ付与）は各プラグイン側で完結させ、成否のalertや
// チャットへのログ追記もプラグイン側（DX3ならdx3-combo-box.jsのrunCombo*）が行う。
function tryHandlePluginChatCommand(rawInput, character) {
  const activePluginId = store.state.room?.activePlugin ?? null;
  if (!activePluginId) return false;

  return handlePluginChatCommand(activePluginId, rawInput, {
    token: character,
    dispatch: store.dispatch.bind(store),
    getEffectiveParameterValue,
    generateBuffId,
    rollBCDice
  });
}

// チャットパレットのフレーズをクリックした際、コマンド欄を経由せず即座に送信する。
// パラメータ変更コマンド/{}置換の判定は手入力の送信と同じ処理を通す。
function sendPaletteText(text) {
  const selectedSystem = store.state.room.bcdiceSystem;
  const rawInput = text.trim();
  if (rawInput === "") return;

  const selectedCharacter = characterParamSelect?.value
    ? store.state.tokens[characterParamSelect.value]
    : null;

  if (tryHandlePhaseEndCommand(rawInput)) {
    return;
  }

  if (tryHandleBuffCommand(rawInput, selectedCharacter)) {
    return;
  }

  if (tryHandleParameterCommand(rawInput, selectedCharacter)) {
    return;
  }

  if (tryHandlePluginChatCommand(rawInput, selectedCharacter)) {
    return;
  }

  const substitutedInput = substituteCharacterParameters(rawInput, selectedCharacter);

  EventBus.emit('DICE_ROLL_REQUESTED', {
    system: selectedSystem,
    rawInput: substitutedInput,
    characterName: selectedCharacter?.name,
    characterId: selectedCharacter?.id,
    tabId: activeTabId
  });
}

if (chatPalettePanel) {
  renderChatPalette({ container: chatPalettePanel, onSend: sendPaletteText });
}

if (sendBtn) {
  sendBtn.addEventListener('click', () => {
    const selectedSystem = store.state.room.bcdiceSystem;
    let rawInput = commandInput.value.trim();

    if (rawInput === "") {
      alert("コマンドを入力してください！");
      return;
    }

    const selectedCharacter = characterParamSelect?.value
      ? store.state.tokens[characterParamSelect.value]
      : null;

    if (tryHandlePhaseEndCommand(rawInput)) {
      commandInput.value = "";
      return;
    }

    if (tryHandleBuffCommand(rawInput, selectedCharacter)) {
      commandInput.value = "";
      return;
    }

    if (tryHandleParameterCommand(rawInput, selectedCharacter)) {
      commandInput.value = "";
      return;
    }

    if (tryHandlePluginChatCommand(rawInput, selectedCharacter)) {
      commandInput.value = "";
      return;
    }

    rawInput = substituteCharacterParameters(rawInput, selectedCharacter);

    EventBus.emit('DICE_ROLL_REQUESTED', {
      system: selectedSystem,
      rawInput: rawInput,
      characterName: selectedCharacter?.name,
      characterId: selectedCharacter?.id,
      tabId: activeTabId
    });
  });
}

// チャット欄編集中、Enterキーで送信できるようにする（Shift+Enterで改行、IME変換中は無視）
if (commandInput && sendBtn) {
  commandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      sendBtn.click();
    }
  });
}

// 参照キャラクターの選択肢をキャラ一覧と同じ内容で維持する（登録・削除・改名に追従）。
// バックヤードにしまわれているコマは、盤面上に存在しない扱いなので選択肢から除外する。
EventBus.subscribe('STATE_CHANGED', (state) => {
  if (!characterParamSelect) return;

  const previousValue = characterParamSelect.value;
  characterParamSelect.innerHTML = '';

  const noneOption = document.createElement('option');
  noneOption.value = '';
  noneOption.textContent = '（選択なし）';
  characterParamSelect.appendChild(noneOption);

  Object.values(state.tokens)
    .filter(tokenData => !tokenData.inBackyard)
    .forEach(tokenData => {
      const opt = document.createElement('option');
      opt.value = tokenData.id;
      opt.textContent = tokenData.name;
      characterParamSelect.appendChild(opt);
    });

  if (state.tokens[previousValue] && !state.tokens[previousValue].inBackyard) {
    characterParamSelect.value = previousValue;
  }
});

// 盤面下のカレントチャット欄：直近にカレントチャットへ流れたメッセージの参照キャラクターの
// コマ画像を立ち絵代わりに表示する。次のメッセージが流れるまで表示され続ける。
// 未アップロードの場合、または参照キャラクターなしで送られた場合は何も表示しない。
function updateCurrentChatPortrait() {
  if (!currentChatPortrait) return;
  const speakingCharacter = lastSpokenCharacterId ? store.state.tokens[lastSpokenCharacterId] : null;

  currentChatPortrait.style.backgroundImage = speakingCharacter?.image
    ? `url('${speakingCharacter.image}')`
    : '';
}

// プラグイン選択肢を生成（起動時1回）
if (roomPluginSelect) {
  const noneOption = document.createElement('option');
  noneOption.value = '';
  noneOption.textContent = '（プラグインなし）';
  roomPluginSelect.appendChild(noneOption);

  listPlugins().forEach(plugin => {
    const opt = document.createElement('option');
    opt.value = plugin.id;
    opt.textContent = plugin.label;
    roomPluginSelect.appendChild(opt);
  });

  roomPluginSelect.addEventListener('change', () => {
    store.dispatch('SET_ACTIVE_PLUGIN', { pluginId: roomPluginSelect.value || null });
  });
}

// ルームのプラグイン選択欄：他クライアントでの変更（同期）にも追従させる
EventBus.subscribe('STATE_CHANGED', (state) => {
  if (!roomPluginSelect) return;
  const nextValue = state.room.activePlugin || '';
  if (roomPluginSelect.value !== nextValue) {
    roomPluginSelect.value = nextValue;
  }
});

// BCDiceのシステムはキャラクターパラメータ用プラグイン（activePlugin）とは別軸で、
// ルーム単位・全員共通の設定にする（各クライアントがローカルに持つ値ではない）。
if (gameSystemSelect) {
  gameSystemSelect.addEventListener('change', () => {
    store.dispatch('SET_BCDICE_SYSTEM', { system: gameSystemSelect.value });
  });
}

// ゲームシステム欄：他クライアントでの変更（同期）にも追従させる
EventBus.subscribe('STATE_CHANGED', (state) => {
  if (!gameSystemSelect) return;
  const nextValue = state.room.bcdiceSystem;
  if (gameSystemSelect.value !== nextValue) {
    gameSystemSelect.value = nextValue;
  }
});

// 部屋名：複数部屋運用時にどの部屋かを判別しやすくするためのルーム単位の設定。
// 入力のたびではなく、確定時（change）にのみ同期する。
if (roomNameInput) {
  roomNameInput.addEventListener('change', () => {
    store.dispatch('SET_ROOM_NAME', { name: roomNameInput.value });
  });
}

// 部屋名：他クライアントでの変更（同期）にも追従させ、ヘッダーの表示にも反映する
EventBus.subscribe('STATE_CHANGED', (state) => {
  const nextValue = state.room.name || '';
  if (roomNameInput && document.activeElement !== roomNameInput && roomNameInput.value !== nextValue) {
    roomNameInput.value = nextValue;
  }
  if (roomNameLabel) {
    roomNameLabel.textContent = nextValue ? `— ${nextValue}` : '';
  }
});

// キャラクター一覧の描画（登録・削除の両方に反応）。
// バックヤードにしまわれているコマは「今、盤面にいない」扱いなので一覧には出さない。
EventBus.subscribe('STATE_CHANGED', (state) => {
  if (!characterList) return;

  characterList.innerHTML = "";

  const sortedTokens = Object.values(state.tokens).filter(t => !t.inBackyard).sort((a, b) => {
    const initiativeA = a.parameters?.['core:initiative'] ? getEffectiveParameterValue(a, 'core:initiative') : 0;
    const initiativeB = b.parameters?.['core:initiative'] ? getEffectiveParameterValue(b, 'core:initiative') : 0;
    return initiativeB - initiativeA;
  });

  sortedTokens.forEach(tokenData => {
    const item = document.createElement('div');
    item.className = 'character-list-item';

    // アバター（画像 or 色）＋ イニシアチブバッジ ＋ 名前
    const avatarColumn = document.createElement('div');
    avatarColumn.className = 'character-avatar-column';

    const avatar = document.createElement('div');
    avatar.className = 'character-avatar';
    if (tokenData.image) {
      avatar.style.backgroundImage = `url('${tokenData.image}')`;
    } else {
      avatar.style.backgroundColor = tokenData.color || DEFAULT_TOKEN_COLOR;
    }

    const initiativeParam = tokenData.parameters?.['core:initiative'];
    if (initiativeParam) {
      const initiativeBadge = document.createElement('span');
      initiativeBadge.className = 'character-avatar-initiative';
      initiativeBadge.textContent = getEffectiveParameterValue(tokenData, 'core:initiative');
      avatar.appendChild(initiativeBadge);
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'character-avatar-name';
    nameSpan.textContent = tokenData.name;

    avatarColumn.appendChild(avatar);
    avatarColumn.appendChild(nameSpan);
    item.appendChild(avatarColumn);

    // パラメータ一覧
    const paramList = document.createElement('div');
    paramList.className = 'character-param-list';

    Object.entries(tokenData.parameters || {})
      .filter(([, param]) => param.visible !== false)
      .forEach(([paramId, param]) => {
        const paramRow = document.createElement('div');
        paramRow.className = 'character-list-param-row';

        const labelSpan = document.createElement('span');
        labelSpan.className = 'character-param-label';
        labelSpan.textContent = truncateLabel(param.label);
        labelSpan.title = param.label;

        // バフ/デバフがかかっている場合は実効値（基礎値＋合計）を表示し、
        // 差分を括弧書きで添える（例: 68 (+10)）
        const effectiveValue = getEffectiveParameterValue(tokenData, paramId);
        const buffTotal = effectiveValue - param.value;

        const valueSpan = document.createElement('span');
        valueSpan.className = 'character-param-value';
        valueSpan.textContent = buffTotal !== 0
          ? `${effectiveValue} (${buffTotal > 0 ? '+' : ''}${buffTotal})`
          : String(effectiveValue);
        if (buffTotal !== 0) {
          valueSpan.title = `基礎値 ${param.value}${buffTotal > 0 ? '+' : ''}${buffTotal}`;
        }

        paramRow.appendChild(labelSpan);
        paramRow.appendChild(valueSpan);
        paramList.appendChild(paramRow);
      });

    item.appendChild(paramList);
    characterList.appendChild(item);
  });
});

// バックヤードの描画：自分（このブラウザ）がしまったコマだけを表示する。
// 操作権は制限しないので、これはあくまでUI上の絞り込み（他人のバックヤードは
// 単に一覧に出さないだけで、盤面へ戻す操作自体を禁止するものではない）。
EventBus.subscribe('STATE_CHANGED', (state) => {
  if (!backyardList) return;

  backyardList.innerHTML = "";
  const myUserId = getLocalUserId();

  const myBackyardTokens = Object.values(state.tokens)
    .filter(t => t.inBackyard && t.backyardOwnerId === myUserId);

  if (myBackyardTokens.length === 0) {
    const placeholder = document.createElement('p');
    placeholder.style.color = '#888';
    placeholder.style.fontSize = '0.85rem';
    placeholder.textContent = 'バックヤードは空です。';
    backyardList.appendChild(placeholder);
    return;
  }

  myBackyardTokens.forEach(tokenData => {
    const item = document.createElement('div');
    item.className = 'character-list-item';

    const avatarColumn = document.createElement('div');
    avatarColumn.className = 'character-avatar-column';

    const avatar = document.createElement('div');
    avatar.className = 'character-avatar';
    if (tokenData.image) {
      avatar.style.backgroundImage = `url('${tokenData.image}')`;
    } else {
      avatar.style.backgroundColor = tokenData.color || DEFAULT_TOKEN_COLOR;
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'character-avatar-name';
    nameSpan.textContent = tokenData.name;

    avatarColumn.appendChild(avatar);
    avatarColumn.appendChild(nameSpan);
    item.appendChild(avatarColumn);

    const restoreBtn = document.createElement('button');
    restoreBtn.type = 'button';
    restoreBtn.className = 'dialog-add-row-btn';
    restoreBtn.style.marginBottom = '0';
    restoreBtn.textContent = '盤面に戻す';
    restoreBtn.addEventListener('click', () => {
      store.dispatch('RESTORE_FROM_BACKYARD', { id: tokenData.id });
    });
    item.appendChild(restoreBtn);

    backyardList.appendChild(item);
  });
});

function truncateLabel(label, maxLength = 4) {
  if (!label) return '';
  return label.length > maxLength ? `${label.slice(0, maxLength)}...` : label;
}

function splitForSpace(string) {
  return string.trim().replaceAll(" ", " ").split(" ");
}

// hideSystem: カレントチャット欄など、システム名（[Cthulhu7th]等）の表示が不要な場所ではtrueにする。
function buildLogHtml({ system = "", character = "", comment = "", resultText, diceDetail = "" }, { hideSystem = false } = {}) {
  const detail = diceDetail ? `<small style="color: #888;">出目内訳: [${diceDetail}]</small>` : "";
  const systemTag = hideSystem ? '' : `<strong style="color: #007acc;">[${system}]</strong>`;
  const characterTag = character ? `<span style="color: #4caf50;">${character}</span>` : '';
  const commentTag = comment ? `<span style="color: #aaa;">(${comment})</span>` : '';
  const resultHtml = String(resultText).replace(/\n/g, '<br>');

  // ヘッダー（システム名・キャラ名・コメント）は存在する要素だけを半角スペースで連結する。
  // 全て空の場合（カレントチャット欄のキャラなし発言など）は行ごと省き、余計な空行を出さない。
  const headerLine = [systemTag, characterTag, commentTag].filter(Boolean).join(' ');
  const headerHtml = headerLine ? `${headerLine}<br>` : '';

  return `
    ${headerHtml}
    <span class="log-result-text" style="color: #fff;">${resultHtml}</span><br>
    ${detail}`;
}

// entryを指定タブ（省略時は現在表示中のタブ）のログへ追加する。
// storeへdispatchするだけで、DOMへの反映はSTATE_CHANGED購読側（renderActiveTabLog／
// renderMainChatMirror）が行う。他クライアントとの同期もこのdispatchを経由して行われる。
function applyLog(entry, tabId = activeTabId) {
  store.dispatch('ADD_CHAT_MESSAGE', { tabId, entry });
}

// 初期化処理
window.addEventListener('DOMContentLoaded', () => {
  initNetSync();
  store.init();
});