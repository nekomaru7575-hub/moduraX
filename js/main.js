// js/main.js

import { rollBCDice } from './BCdice.js';
import { fetchGameSystems, fetchGameSystemInfo, getCommandPattern } from './bcdice-catalog.js';
import {
  store, generateTokenId, generateBuffId, listPlugins, DEFAULT_TOKEN_COLOR, getEffectiveParameterValue,
  BUFF_PHASE_LABELS
} from './board-data-driven.js';
import { AUDIO_CHANNELS, AUDIO_CHANNEL_LABELS } from './game-store.js';
import { findTrackByPhraseSuffix } from './audio-phrase.js';
import { EventBus } from './EventBus.js';
import { showContextMenu } from './context-menu.js';
import { renderChatPalette } from './chat-palette.js';
import { makeResizableStack } from './resizable-stack.js';
import { initNetSync, replaceState, requestRoomDeletion, sendIdentify } from './net-sync.js';
import {
  getNickname, normalizeRoomName, getStoredRoomName, setStoredRoomName,
  getStoredDevPassphrase, setStoredDevPassphrase,
  activateRoomIdentity, getCurrentParticipantId
} from './local-identity.js';
import { showIdentityDialog } from './identity-dialog.js';
import { showChatTabDialog } from './chat-tab-dialog.js';
import { canView, isRestricted, describeAudience } from './visibility.js';
import { handlePluginChatCommand, findPluginForChatCommand } from './parameters/registry.js';
import { showRoomParametersDialog } from './room-parameters-dialog.js';
import { showOriginalTableDialog } from './original-table-dialog.js';
import { showOriginalTableListDialog } from './original-table-list-dialog.js';
import { showSceneListDialog } from './scene-list-dialog.js';
import { showSceneDialog } from './scene-dialog.js';
import { showLogExportDialog } from './log-export-dialog.js';
import { buildLogExportHtml } from './log-export.js';
import { showAudioDialog } from './audio-dialog.js';
import { initAudioPlayer } from './audio-player.js';
import { initRoundPanel, startRoundProgression } from './round-panel.js';
import { showRoomDeleteConfirmDialog } from './room-delete-dialog.js';
import { canOperateAsGm, GM_ONLY_REASON } from './room-authority.js';

// DOM要素の取得（ダイス関連）
const sendBtn = document.getElementById('sendBtn');
const gameSystemSelect = document.getElementById('gameSystem');
const gameSystemHelpBtn = document.getElementById('gameSystemHelpBtn');
const gameSystemHelp = document.getElementById('gameSystemHelp');
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

// 自分に見えるチャットタブだけを返す（限定公開タブは宛先に入っている人にだけ見せる）。
function visibleChatTabs(state) {
  const myId = getCurrentParticipantId();
  return state.chatTabs.filter(tab => canView(tab.audience, myId));
}

function renderChatTabs(state) {
  if (!chatTabsEl) return;
  chatTabsEl.innerHTML = '';

  visibleChatTabs(state).forEach(tab => {
    const tabBtn = document.createElement('button');
    tabBtn.type = 'button';
    tabBtn.className = 'chat-tab' + (tab.id === activeTabId ? ' active' : '');
    // 限定公開のタブは、うっかり全体向けの発言を書き込まないよう鍵アイコンで区別する
    tabBtn.textContent = isRestricted(tab.audience) ? `🔒${tab.name}` : tab.name;
    tabBtn.title = describeAudience(tab.audience, state.participants);
    tabBtn.addEventListener('click', () => switchChatTab(tab.id));
    // 公開先の変更は、そのタブが見えている人だけができる（Mainタブは常に全員向け）
    if (tab.id !== MAIN_TAB_ID) {
      tabBtn.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        openChatTabAudienceDialog(tab);
      });
    }
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
  showChatTabDialog({
    participants: store.state.participants || {},
    myParticipantId: getCurrentParticipantId(),
    onConfirm: ({ name, audience }) => {
      const id = `tab-${Date.now()}`;
      store.dispatch('ADD_CHAT_TAB', { id, name, audience });
      switchChatTab(id);
    }
  });
}

function openChatTabAudienceDialog(tab) {
  showChatTabDialog({
    mode: 'edit',
    name: tab.name,
    audience: tab.audience ?? null,
    participants: store.state.participants || {},
    myParticipantId: getCurrentParticipantId(),
    onConfirm: ({ audience }) => {
      store.dispatch('SET_CHAT_TAB_AUDIENCE', { id: tab.id, audience });
    }
  });
}

// 表示名を変えた等で今見ているタブが見えなくなった場合に、Mainへ戻す。
function ensureActiveTabVisible(state) {
  if (visibleChatTabs(state).some(tab => tab.id === activeTabId)) return;
  switchChatTab(MAIN_TAB_ID);
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
    // 公開先から外された・タブが消えた場合に、見えないタブを開いたままにしない
    ensureActiveTabVisible(state);
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
const audioMenuBtn = document.getElementById('audioMenuBtn');
const roomSettingsDialog = document.getElementById('roomSettingsDialog');
const roomNameInput = document.getElementById('roomNameInput');
const roomNameLabel = document.getElementById('roomNameLabel');
const exportStateBtn = document.getElementById('exportStateBtn');
const importStateBtn = document.getElementById('importStateBtn');
const importStateInput = document.getElementById('importStateInput');
const deleteRoomBtn = document.getElementById('deleteRoomBtn');

// --- GM限定の操作（js/room-authority.js参照） ---
// 部屋そのものを左右する操作は、GMが決まっている部屋ではGMだけができるようにする。
// 項目を消してしまうと「なぜ出ないのか」が分からないので、押せない状態で残して理由を
// ツールチップで示す（コマの操作制限・context-menu.jsのdisabledと同じ考え方）。

// ルーム設定ダイアログ内の注記。無効化されている理由をツールチップだけに頼らず出す。
const gmOnlyNote = document.getElementById('roomSettingsGmNote');

function applyGmOnlyControls() {
  const allowed = canOperateAsGm();

  [gameSystemSelect, roomPluginSelect, importStateBtn, deleteRoomBtn].forEach(el => {
    if (!el) return;
    el.disabled = !allowed;
    el.title = allowed ? '' : GM_ONLY_REASON;
  });

  if (gmOnlyNote) gmOnlyNote.hidden = allowed;
}

// 誰がGMかは同期される状態（STATE_CHANGED）で変わり、自分が誰かは名乗り直し
// （IDENTITY_CHANGED。状態自体は変わらないのでSTATE_CHANGEDでは拾えない）で変わる。
EventBus.subscribe('STATE_CHANGED', applyGmOnlyControls);
EventBus.subscribe('IDENTITY_CHANGED', applyGmOnlyControls);

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

// オリジナル表の作成／編集ダイアログを開き、結果をdispatchする。tableを渡すと編集モード。
// 登録した表はチャットにタイトルを完全一致で入力すると振れる（tryHandleOriginalTableCommand参照）。
function openOriginalTableEditor(table = null) {
  showOriginalTableDialog({
    table,
    onConfirm: ({ title, dice, entries, previousTitle }) => {
      // 表のキーはタイトルなので、編集でタイトルを変えた場合は旧エントリを消さないと二重に残る
      if (previousTitle && previousTitle !== title) {
        store.dispatch('REMOVE_ORIGINAL_TABLE', { title: previousTitle });
      }
      store.dispatch('ADD_ORIGINAL_TABLE', { title, dice, entries });
      openOriginalTableListDialog();
    },
    // 一覧は自分を閉じてからこの画面を開くので、キャンセル時は一覧へ戻す
    onCancel: () => openOriginalTableListDialog()
  });
}

// オリジナル表一覧ダイアログ。追加・編集・削除の後は最新の一覧で開き直す。
function openOriginalTableListDialog() {
  showOriginalTableListDialog({
    tables: store.state.room.originalTables || {},
    onAdd: () => openOriginalTableEditor(),
    onSelect: (title) => openOriginalTableEditor(store.state.room.originalTables[title]),
    onRemove: (title) => {
      store.dispatch('REMOVE_ORIGINAL_TABLE', { title });
      openOriginalTableListDialog();
    }
  });
}

// --- シーン（GM限定。js/scene-list-dialog.js参照） ---
// 盤面の見た目（背景・盤面サイズ・パネル）を場面ごとに保存し、1クリックで切り替える。

// 今の盤面をシーンへ写し取るための値。reducer側でprevStateから読まずここで集めるのは、
// 保存の瞬間に他の人がパネルを動かしていると、各クライアントが自分のローカル状態を写して
// 端末ごとに違う内容が焼き付いてしまうため（game-store.jsのSAVE_SCENE参照）。
function currentBoardSnapshot() {
  const room = store.state.room;
  return {
    background: {
      imageUrl: room.backgroundImage,
      imageKey: room.backgroundImageKey,
      boardWidth: room.boardWidth,
      boardHeight: room.boardHeight
    },
    panels: store.state.panels || {}
  };
}

// シーンの作成／編集ダイアログ。sceneを渡すと編集モード。
function openSceneEditor(scene = null) {
  showSceneDialog({
    scene,
    // 遷移時に差し替えるのはBGM枠なので、選択肢もBGMチャンネルの音源だけにする
    tracks: Object.values(store.state.room.audioTracks || {}).filter(track => track.channel === 'bgm'),
    onConfirm: ({ name, text, bgmTrackId }) => {
      if (scene) {
        // 編集では盤面を写し直さない（本文だけ直したいことのほうが多いため）
        store.dispatch('UPDATE_SCENE_META', { id: scene.id, name, text, bgmTrackId });
      } else {
        // idの採番は呼び出し側で行う。reducerでDate.now()を呼ぶと、各クライアントが
        // 同じアクションを再実行したときに別々の値になってしまう。
        store.dispatch('SAVE_SCENE', {
          id: `scene-${Date.now()}`, name, text, bgmTrackId, ...currentBoardSnapshot()
        });
      }
      openSceneListDialog();
    },
    // 「この盤面で保存し直す」。同じidで保存＝上書き。
    onOverwriteBoard: ({ name, text, bgmTrackId }) => {
      store.dispatch('SAVE_SCENE', { id: scene.id, name, text, bgmTrackId, ...currentBoardSnapshot() });
      openSceneListDialog();
    },
    // 一覧は自分を閉じてからこの画面を開くので、キャンセル時は一覧へ戻す
    onCancel: () => openSceneListDialog()
  });
}

// シーン一覧ダイアログ。作成・削除の後は最新の一覧で開き直す。
function openSceneListDialog() {
  showSceneListDialog({
    scenes: store.state.room.scenes || {},
    onApply: (id) => {
      // playIdは再生し直しの検知に使う値なので、ここで採番して全員に同じものを配る
      store.dispatch('APPLY_SCENE', { id, playId: `${Date.now()}` });
    },
    onEdit: (id) => openSceneEditor(store.state.room.scenes[id]),
    onCreate: () => openSceneEditor(),
    onRemove: (id) => {
      store.dispatch('REMOVE_SCENE', { id });
      openSceneListDialog();
    }
  });
}

// 音楽ダイアログ（ヘッダーの「♪」）。音源の登録・再生・停止・削除はすべて即時反映のため、
// 操作のたびに最新状態で開き直す。実際の再生はaudio-player.jsが状態の変化を見て行う。
function openAudioDialog() {
  showAudioDialog({
    tracks: store.state.room.audioTracks || {},
    playback: store.state.room.audioPlayback || { bgm: null, se: null },
    // 音源の追加（アップロード・URL）だけGM限定。再生・停止・削除・音量は全員が触れる。
    canAddTrack: canOperateAsGm(),
    onAdd: ({ name, url, source, key, channel, loop, phrase }) => {
      store.dispatch('ADD_AUDIO_TRACK', { id: `audio-${Date.now()}`, name, url, source, key, channel, loop, phrase });
      openAudioDialog();
    },
    onPlay: (track) => {
      // playIdを毎回変えることで、同じ効果音を続けて鳴らし直せる（audio-player.js側の再生検知）
      store.dispatch('SET_AUDIO_PLAYBACK', {
        channel: track.channel, trackId: track.id, playId: `${Date.now()}`
      });
      openAudioDialog();
    },
    onStop: (channel) => {
      store.dispatch('SET_AUDIO_PLAYBACK', { channel, trackId: null, playId: null });
      openAudioDialog();
    },
    onRemove: (trackId) => {
      store.dispatch('REMOVE_AUDIO_TRACK', { id: trackId });
      openAudioDialog();
    },
    // フレーズの変更だけは開き直さない（入力欄の表示は既に最新で、開き直すと入力の流れが切れる）
    onPhraseChange: ({ id, phrase }) => {
      store.dispatch('SET_AUDIO_TRACK_PHRASE', { id, phrase });
    }
  });
}

if (audioMenuBtn) {
  audioMenuBtn.addEventListener('click', openAudioDialog);
}

// --- 参加者としての名乗り（表示名による識別。js/local-identity.js参照） ---
// 表示名から導出した公開IDで「この部屋でのこの人」を表す。秘匿機能（コマ/パネルの一部を
// 特定の人にだけ見せる、特定の人だけのチャットタブ）の宛先指定に使う土台。
function currentRoomId() {
  return new URLSearchParams(location.search).get('room') || '';
}

// 名乗りの種は表示名。ただし開発用の合言葉を入れているときだけはそちらを種にする
// （表示名を種にすると合言葉が参加者一覧に晒されるため。server/index.jsのisDeveloperToken参照）。
async function activateAndRegisterIdentity(name, devPassphrase) {
  const identity = await activateRoomIdentity(currentRoomId(), devPassphrase || name);

  // 名乗る人が変われば「自分に見えるもの」も変わる。状態自体は変わらないので
  // STATE_CHANGEDでは拾えず、専用のイベントで各所に描き直してもらう。
  EventBus.emit('IDENTITY_CHANGED', identity?.participantId ?? null);

  if (!identity) return; // 名前なし＝ゲスト参加。参加者一覧には載せない

  // 参加者としての登録より先に名乗る。サーバーは名乗りが通ったID本人からの
  // REGISTER_PARTICIPANTしか受け付けない（server/index.js参照）。
  sendIdentify(identity.participantId, identity.authToken);
  store.dispatch('REGISTER_PARTICIPANT', { id: identity.participantId, nickname: name });
}

function openIdentityDialog() {
  showIdentityDialog({
    participants: store.state.participants || {},
    myParticipantId: getCurrentParticipantId(),
    // この部屋でまだ名乗っていなければ、前に使った名前を初期値として見せる
    nickname: getStoredRoomName(currentRoomId()) ?? getNickname(),
    devPassphrase: getStoredDevPassphrase(currentRoomId()),
    onSubmit: ({ nickname, devPassphrase }) => {
      const name = normalizeRoomName(nickname);
      setStoredRoomName(currentRoomId(), name);
      setStoredDevPassphrase(currentRoomId(), devPassphrase);
      activateAndRegisterIdentity(name, devPassphrase);
    },
    onSetGm: (id, isGm) => store.dispatch('SET_PARTICIPANT_GM', { id, isGm }),
    onRemove: (id) => store.dispatch('REMOVE_PARTICIPANT', { id })
  });
}

// 名乗りはサーバーの最新状態を受け取ってから行う（INITより前にdispatchすると、
// その直後のhydrateで消えてしまうため）。再接続のたびに呼ばれるが、同じIDでの
// 登録は上書きなので繰り返しても問題ない。
let hasAskedIdentityThisSession = false;
EventBus.subscribe('NET_INITIALIZED', () => {
  const storedName = getStoredRoomName(currentRoomId());

  // この部屋でまだ一度も設定していない場合だけ、入室時に一度だけ聞く
  // （名前を空欄のまま決定した場合は空文字が保存され、次からは聞かない）。
  if (storedName === null) {
    if (!hasAskedIdentityThisSession) {
      hasAskedIdentityThisSession = true;
      openIdentityDialog();
    }
    return;
  }

  activateAndRegisterIdentity(storedName, getStoredDevPassphrase(currentRoomId()));
});

// ルームメニューボタン：クリックでドロップダウンを出し、選択でダイアログを開く
if (roomMenuBtn && roomSettingsDialog) {
  roomMenuBtn.addEventListener('click', () => {
    const rect = roomMenuBtn.getBoundingClientRect();
    const items = [
      {
        label: 'ルーム設定',
        onSelect: () => roomSettingsDialog.showModal()
      },
      {
        label: 'ルーム変数',
        onSelect: openRoomParametersDialog
      },
      {
        label: 'オリジナル表一覧',
        onSelect: openOriginalTableListDialog
      },
      {
        label: 'ログを保存',
        onSelect: openLogExportDialog
      }
    ];

    // シーンの作成・遷移・編集・削除はGM限定（サーバー側もserver/index.jsの
    // GM_ONLY_ACTIONSで同じ4つを弾く）。項目自体は残して理由を示す。
    {
      const allowed = canOperateAsGm();
      items.push({
        label: 'シーン一覧',
        onSelect: openSceneListDialog,
        disabled: !allowed,
        title: allowed ? undefined : GM_ONLY_REASON
      });
    }

    // ラウンド進行の常時パネルは邪魔にならないよう進行中(round.active)にだけ表示するため、
    // 開始のきっかけはこのルームメニューに置く（進行中はパネル自身の⋮メニューから終了する）。
    if (!store.state.round.active) {
      const allowed = canOperateAsGm();
      items.push({
        label: 'ラウンド進行を開始',
        onSelect: startRoundProgression,
        disabled: !allowed,
        title: allowed ? undefined : GM_ONLY_REASON
      });
    }

    items.push(
      {
        label: '参加者設定',
        onSelect: openIdentityDialog
      },
      {
        label: '部屋一覧に戻る',
        onSelect: () => { window.location.href = '/'; }
      }
    );

    showContextMenu(rect.left, rect.bottom + 4, items);
  });
}

// 生成したデータをファイルとしてダウンロードさせる（セッションデータのJSON保存と
// ログのHTML保存で共通）。
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

// セッションデータのファイル保存／読み込み。今の盤面・キャラ・チャットを丸ごとJSONに
// 書き出し、後で読み込んで復元できるようにする（サーバー側の再起動・リセット対策）。
// 部屋削除前の「部屋を保存し削除」からも使うため、関数として切り出してある。
function exportStateToFile() {
  const json = JSON.stringify(store.state, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);

  downloadBlob(new Blob([json], { type: 'application/json' }), `trpg-room-${dateStr}.json`);
}

// チャットログのHTML保存。復元用のJSONとは別に、後から読み返せる読み物として書き出す。
// 保存するタブをダイアログで選ばせ、選ばれたぶんを1つのHTMLにまとめる。
function openLogExportDialog() {
  showLogExportDialog({
    // 自分に見えないタブ（限定公開で宛先に入っていないもの）は保存対象に出さない
    tabs: visibleChatTabs(store.state),
    onConfirm: (tabIds) => {
      const html = buildLogExportHtml({
        roomName: store.state.room.name,
        tabs: store.state.chatTabs.filter(tab => tabIds.includes(tab.id)),
        chatLogs: store.state.chatLogs
      });

      // 部屋名がそのままファイル名に入るため、ファイル名に使えない文字は落とす
      const safeName = String(store.state.room.name || 'room').replace(/[\\/:*?"<>|]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);

      downloadBlob(new Blob([html], { type: 'text/html' }), `trpg-log-${safeName}-${dateStr}.html`);
    }
  });
}

if (exportStateBtn) {
  exportStateBtn.addEventListener('click', exportStateToFile);
}

if (importStateBtn && importStateInput) {
  importStateBtn.addEventListener('click', () => {
    if (!canOperateAsGm()) return;
    importStateInput.click();
  });

  importStateInput.addEventListener('change', async () => {
    const file = importStateInput.files?.[0];
    importStateInput.value = ""; // 同じファイルを連続で選び直せるようにリセット
    if (!file) return;
    // 読み込みは接続中の全員の状態を上書きするため、ここでも権限を確かめ直す
    if (!canOperateAsGm()) return;

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

// 部屋の削除。ルーム設定の一番下にある赤いボタンから。押した直後には消さず、
// 確認ダイアログ（いいえ／はい／部屋を保存し削除）を挟む。実際の削除は
// サーバー側が全員の退室を確認してから行う（net-sync.jsのrequestRoomDeletion参照）。
if (deleteRoomBtn) {
  deleteRoomBtn.addEventListener('click', () => {
    if (!canOperateAsGm()) return;
    roomSettingsDialog?.close();
    showRoomDeleteConfirmDialog({
      onDelete: () => requestRoomDeletion(),
      onSaveAndDelete: () => {
        exportStateToFile();
        requestRoomDeletion();
      }
    });
  });
}

// ダイス処理イベント
EventBus.subscribe('DICE_ROLL_REQUESTED', async ({ system, rawInput, characterName, characterId, characterColor, tabId = activeTabId }) => {
  if (!sendBtn) return;
  sendBtn.disabled = true;
  sendBtn.textContent = "送信中...";

  try {
    if (rawInput.includes('\n')) {
      applyLog({ system, character: characterName, characterId, color: characterColor, resultText: rawInput }, tabId);
      commandInput.value = "";
      return;
    }

    const spaceIndex = splitForSpace(rawInput);
    const command = spaceIndex[0];
    const comment = spaceIndex.slice(1).join(" ");
    // ダイスコマンドかどうかは、そのシステムのcommand_pattern（BCDiceが公開している
    // 「このシステムがコマンドとして受け付ける文字列」の正規表現）で判定する。
    // システム情報を取得できなかった場合のみ、従来の「使われる文字種だけで足切り」へ戻す。
    const commandPattern = await getCommandPattern(system);
    const isDiceCommand = commandPattern
      ? commandPattern.test(command)
      : /^[A-Za-z0-9+\-*/()<>=\[\]@#,:]+$/.test(command);
    // choiceは引数がスペース区切りなので、コメント分割後の先頭トークンだけでは
    // パターンに合わないシステムがある。従来どおり別枠で拾い、引数ごとBCDiceへ渡す。
    const isStartsChoice = /^choice/i.test(command);

    if (!isDiceCommand && !isStartsChoice) {
      applyLog({ system, character: characterName, characterId, color: characterColor, resultText: rawInput }, tabId);
      commandInput.value = "";
      return;
    }

    const toCommand = isStartsChoice ? `${command} ${comment}` : command;

    const { success, unsupported, resultText, diceValues } = await rollBCDice(system, toCommand);
    if (!success) {
      if (unsupported) {
        // 正規表現上はダイスコマンドに見えても、BCDice側がそのシステムの構文として
        // 認識できなかった場合（例: "aaaa"）。通信エラーではないので、アラートは
        // 出さずに入力をそのまま平文の発言としてチャットへ送る。
        applyLog({ system, character: characterName, characterId, color: characterColor, resultText: rawInput }, tabId);
        commandInput.value = "";
        return;
      }
      throw new Error(resultText);
    }

    const diceDetail = diceValues && diceValues.length > 0 ?
      diceValues.map(d => d.value).join(', ') : "";

    applyLog({ system, character: characterName, characterId, color: characterColor, comment, resultText, diceDetail }, tabId);
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
// カスタム変数の値自体に{}が含まれる場合（例: 状態=「{HP}で戦闘中」）も同様に再帰的に
// 解決する。変数同士が互いを参照する循環参照で無限ループしないよう、再帰の深さに上限を設ける。
const PARAMETER_REFERENCE_MAX_DEPTH = 10;

function substituteCharacterParameters(text, character, depth = 0) {
  if (depth > PARAMETER_REFERENCE_MAX_DEPTH) return text;

  return text.replace(/\{([^{}]+)\}/g, (match, rawName) => {
    const name = rawName.trim();

    if (character) {
      const entry = Object.entries(character.parameters || {}).find(
        ([, p]) => p.label === name || p.key === name
      );
      if (entry) {
        const [paramId] = entry;
        const value = String(getEffectiveParameterValue(character, paramId));
        return substituteCharacterParameters(value, character, depth + 1);
      }
    }

    const roomEntry = Object.entries(store.state.room.parameters || {}).find(
      ([, p]) => p.label === name || p.key === name
    );
    if (roomEntry) {
      const [, param] = roomEntry;
      return substituteCharacterParameters(String(param.value), character, depth + 1);
    }

    return match;
  });
}

// [演算子(+/-/=)][パラメータ名](,[演算子][パラメータ名])* ([数値] または [nDx形式のダイス]) で
// パラメータを直接変更するコマンド。例: +侵蝕率(10)　=HP(2D6)　+攻撃力,-防御力(1D6)
// カンマ区切りで複数パラメータを指定でき、それぞれに個別の演算子（+/-/=）を付けられる。
// カッコ内の値（数値 or ダイスロール結果）は1回だけ算出し、全パラメータへ共通で適用する。
// editable:falseのパラメータは変更不可。
const PARAMETER_COMMAND_PATTERN = /^([+\-=].+?)\(([+-]?\d+(?:\.\d+)?|\d+[Dd]\d+)\)$/;
const PARAMETER_TARGET_PATTERN = /^([+\-=])(.+)$/;
const DICE_AMOUNT_PATTERN = /^\d+[Dd]\d+$/;

// BCDiceの結果テキストは "(コマンド) ＞ 内訳 ＞ 合計" の形。最後の「＞」より後ろの
// 数値だけを読み取る（dx3-combo-box.jsのparseFinalNumberと同じ考え方）。
function parseFinalDiceNumber(resultText) {
  const parts = String(resultText).split('＞').map(s => s.trim()).filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last) return null;
  const match = last.match(/-?\d+/);
  return match ? Number(match[0]) : null;
}

// "+HP,-MP" のようなカンマ区切りの指定を { operator, name } の配列に分解する。
// いずれかのトークンが演算子から始まっていない場合はnullを返す（呼び出し側で書式エラー扱い）。
function parseParameterTargets(rawTargets) {
  const targets = rawTargets.split(',').map(token => {
    const m = token.match(PARAMETER_TARGET_PATTERN);
    return m ? { operator: m[1], name: m[2].trim() } : null;
  });
  return targets.some(t => !t) ? null : targets;
}

// 指定された全パラメータへ同じamount（数値 or ダイス結果）を、それぞれの演算子で適用し、
// 1件のログにまとめて記録する。
function applyParameterChanges({ character, targets, amount, diceResultText }) {
  const changeLines = targets.map(({ operator, paramId, param, before }) => {
    const after = operator === '=' ? amount : operator === '+' ? before + amount : before - amount;
    store.dispatch('SET_PARAMETER', { characterId: character.id, paramId, value: after });
    return `${param.label}: ${before} → ${after}`;
  });

  applyLog({
    character: character.name,
    characterId: character.id,
    color: character.textColor,
    resultText: diceResultText
      ? `${changeLines.join('\n')}\n${diceResultText}`
      : changeLines.join('\n')
  });
}

function tryHandleParameterCommand(rawInput, character) {
  const match = rawInput.match(PARAMETER_COMMAND_PATTERN);
  if (!match) return false;

  const [, rawTargets, rawAmount] = match;

  if (!character) {
    alert('パラメータを変更するキャラクターを選択してください。');
    return true;
  }

  const parsedTargets = parseParameterTargets(rawTargets);
  if (!parsedTargets) {
    alert(`パラメータ指定の書式が正しくありません: ${rawTargets}`);
    return true;
  }

  // 名前解決・妥当性チェックは先にすべて行い、1つでも無効なら何も変更しない（部分適用を防ぐ）。
  const resolvedTargets = [];
  for (const { operator, name } of parsedTargets) {
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
    // 文字列値のカスタム変数は+/-による加減算ができない（=による上書きのみ許可）。
    if (operator !== '=' && typeof before !== 'number') {
      alert(`パラメータ「${name}」は数値ではないため、+/-では変更できません。`);
      return true;
    }

    resolvedTargets.push({ operator, paramId, param, before });
  }

  if (DICE_AMOUNT_PATTERN.test(rawAmount)) {
    // ダイスロールはBCDice APIへの非同期通信を伴うため、他のプラグインコマンド
    // （combo.chk等）と同様に結果を待たずtrueを返し、完了時にパラメータ反映・ログ追記を行う。
    rollBCDice(store.state.room.bcdiceSystem, rawAmount).then(({ success, resultText }) => {
      if (!success) {
        alert(`ダイスロールに失敗しました: ${resultText}`);
        return;
      }
      const amount = parseFinalDiceNumber(resultText);
      if (amount === null) {
        alert(`ダイス結果の解釈に失敗しました: ${resultText}`);
        return;
      }
      applyParameterChanges({ character, targets: resolvedTargets, amount, diceResultText: resultText });
    }).catch(error => {
      alert(`ダイスロールでエラーが発生しました: ${error.message}`);
    });
    return true;
  }

  applyParameterChanges({ character, targets: resolvedTargets, amount: Number(rawAmount) });

  return true;
}

// バフ(名前,パラメータ,増減値,終了条件) または バフ>対象コマ名(名前,パラメータ,増減値,終了条件)
// で、コマにバフ/デバフを付与するコマンド。
// 例: バフ(集中,知覚,+10,シーン)　バフ>ゴブリンA(苦しみ,回避,-10,ラウンド)
// ">対象コマ名"を省略した場合は参照キャラクター欄で選択中のコマが対象になる（従来どおり）。
// 指定した場合はその名前のコマ（コマ名の完全一致）を、選択中のキャラクターより優先して
// 対象にする。終了条件は シーン/ラウンド/シナリオ/判定/プロセス/手動 のいずれか（「◯◯終了」表記でも可）。
// これらは入れ子（シナリオ ⊃ シーン ⊃ ラウンド ⊃ プロセス ⊃ 判定）なので、内側を指定したバフは
// 外側のフェーズが終わったときにも消える（game-store.jsのPHASE_HIERARCHY参照）。
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
    character: targetCharacter.name,
    characterId: targetCharacter.id,
    color: targetCharacter.textColor,
    resultText: `バフ/デバフ付与: ${name}　${targetLabel}${delta >= 0 ? '+' : ''}${delta}　（${expireLabel}）`
  });

  return true;
}

// 「シーン終了」「ラウンド終了」「シナリオ終了」「判定終了」「プロセス終了」とだけ入力して送信すると、該当する終了条件の
// バフ/デバフを全コマから一括で消す（EXPIRE_BUFFSはstore側で全クライアント同期・ログ追記まで
// 完結するので、ここではdispatchするだけでよい）。標準の「シーン進行」機能実装までの
// エスケープハッチ。
// フェーズは入れ子（シナリオ ⊃ シーン ⊃ ラウンド ⊃ プロセス ⊃ 判定）で、上位のコマンドは
// 内側の終了条件・使用回数もまとめて処理する（game-store.jsのPHASE_HIERARCHY参照）。
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

// 「演奏停止」で再生中の音楽（BGM・効果音）をすべて止める。フレーズ再生（下のtriggerAudioPhrase）と
// 対になる操作で、音楽ダイアログを開かずに止められるようにするためのコマンド。
const AUDIO_STOP_COMMAND = '演奏停止';

function tryHandleAudioStopCommand(rawInput) {
  if (rawInput.trim() !== AUDIO_STOP_COMMAND) return false;

  const tracks = store.state.room.audioTracks || {};
  const playback = store.state.room.audioPlayback || {};

  const stopped = AUDIO_CHANNELS
    .filter(channel => playback[channel])
    .map(channel => {
      const name = tracks[playback[channel].trackId]?.name || '不明な音源';
      store.dispatch('SET_AUDIO_PLAYBACK', { channel, trackId: null, playId: null });
      return `${AUDIO_CHANNEL_LABELS[channel] || channel}: ${name}`;
    });

  // 何も鳴っていなかった場合も無反応にはしない（コマンドが効いたことは伝える）
  applyLog({
    system: '音楽',
    resultText: stopped.length > 0
      ? `♪ 演奏を停止しました（${stopped.join('、')}）`
      : '♪ 再生中の音楽はありません'
  });
  return true;
}

// 発言の末尾が音源の再生フレーズと一致したら鳴らす。コマンドと違い入力は消費せず、
// 発言はそのまま流れる（ロールプレイの台詞に音を添えられるようにするため）。
// 判定とdispatchは送信したクライアントだけが行う。SET_AUDIO_PLAYBACKは同期されるので
// 全員に届く。受信側でも判定すると人数分のログが重複してしまう（EXPIRE_BUFFSと同じ理由）。
function triggerAudioPhrase(text) {
  const track = findTrackByPhraseSuffix(store.state.room.audioTracks || {}, text);
  if (!track) return;

  // playIdを毎回変えることで、同じ効果音を続けて鳴らし直せる（audio-player.js側の再生検知）
  store.dispatch('SET_AUDIO_PLAYBACK', {
    channel: track.channel, trackId: track.id, playId: `${Date.now()}`
  });
  applyLog({
    system: '音楽',
    resultText: `♪ ${AUDIO_CHANNEL_LABELS[track.channel] || track.channel}: ${track.name}`
  });
}

// 適用中プラグイン固有のチャットコマンド（DX3のcombo.awk/combo.chk/combo.dmg等）を試す。
// 該当コマンドでなければfalseを返し、通常のダイスロール等に委ねる。
// 実処理（判定/ダメージのロール・バフ付与）は各プラグイン側で完結させ、成否のalertや
// チャットへのログ追記もプラグイン側（DX3ならdx3-combo-box.jsのrunCombo*）が行う。
function tryHandlePluginChatCommand(rawInput, character) {
  const activePluginId = store.state.room?.activePlugin ?? null;

  if (activePluginId) {
    const handled = handlePluginChatCommand(activePluginId, rawInput, {
      token: character,
      dispatch: store.dispatch.bind(store),
      getEffectiveParameterValue,
      generateBuffId,
      rollBCDice
    });
    if (handled) return true;
  }

  // 適用中プラグインで処理できなかった場合、他プラグインのコマンド構文に見えるなら
  // 「素通りしてただの発言になる」前に理由を知らせる（Coreは構文を知らないため、
  // 判定はプラグイン側のlooksLikeOwnChatCommandに委ねる）。
  const owner = findPluginForChatCommand(rawInput);
  if (owner && owner.id !== activePluginId) {
    alert(`このコマンドは「${owner.label}」のものです。この部屋には適用されていないため実行できません。`);
    return true;
  }

  return false;
}

// オリジナル表（room.originalTables）のタイトルと入力が完全一致した場合、そのダイスを
// 振って出目に対応する結果をチャットへ返す。BCDice自体はオリジナル表の記憶機能を
// 持たないため、ダイスの解釈だけBCDice APIに任せ（rollBCDice）、出目→結果の対応表は
// このアプリのルーム状態側で持つ。
function tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId) {
  const table = store.state.room.originalTables?.[rawInput.trim()];
  if (!table) return false;

  rollBCDice(store.state.room.bcdiceSystem, table.dice).then(({ success, resultText }) => {
    if (!success) {
      alert(`ダイスロールに失敗しました: ${resultText}`);
      return;
    }

    const rolled = parseFinalDiceNumber(resultText);
    const entryText = rolled !== null ? table.entries[String(rolled)] : undefined;

    applyLog({
      character: character?.name,
      characterId: character?.id,
      color: character?.textColor,
      resultText: entryText !== undefined
        ? `${table.title}(${table.dice}) ＞ ${rolled} ＞ ${entryText}`
        : `${resultText}\n（表「${table.title}」に出目${rolled}に対応する結果がありません）`
    }, tabId);
  }).catch(error => {
    alert(`ダイスロールでエラーが発生しました: ${error.message}`);
  });

  return true;
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

  if (tryHandleAudioStopCommand(rawInput)) {
    return;
  }

  // {}参照を先に解決してからコマンド判定を行う。参照先の変数が「+HP(10)」等の
  // コマンド文字列を持っていた場合、置換結果の文頭がコマンドとして発動するようにするため。
  const substitutedInput = substituteCharacterParameters(rawInput, selectedCharacter);

  if (tryHandleBuffCommand(substitutedInput, selectedCharacter)) {
    return;
  }

  if (tryHandleParameterCommand(substitutedInput, selectedCharacter)) {
    return;
  }

  if (tryHandlePluginChatCommand(substitutedInput, selectedCharacter)) {
    return;
  }

  if (tryHandleOriginalTableCommand(substitutedInput, selectedCharacter)) {
    return;
  }

  // ここまでコマンドとして解釈されなかった＝発言（ダイスロールを含む）なので、
  // 末尾が音源の再生フレーズと一致していれば鳴らす（発言自体はそのまま流す）。
  triggerAudioPhrase(substitutedInput);

  EventBus.emit('DICE_ROLL_REQUESTED', {
    system: selectedSystem,
    rawInput: substitutedInput,
    characterName: selectedCharacter?.name,
    characterId: selectedCharacter?.id,
    characterColor: selectedCharacter?.textColor,
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

    if (tryHandleAudioStopCommand(rawInput)) {
      commandInput.value = "";
      return;
    }

    // {}参照を先に解決してからコマンド判定を行う。参照先の変数が「+HP(10)」等の
    // コマンド文字列を持っていた場合、置換結果の文頭がコマンドとして発動するようにするため。
    rawInput = substituteCharacterParameters(rawInput, selectedCharacter);

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

    if (tryHandleOriginalTableCommand(rawInput, selectedCharacter)) {
      commandInput.value = "";
      return;
    }

    // ここまでコマンドとして解釈されなかった＝発言（ダイスロールを含む）なので、
    // 末尾が音源の再生フレーズと一致していれば鳴らす（発言自体はそのまま流す）。
    triggerAudioPhrase(rawInput);

    EventBus.emit('DICE_ROLL_REQUESTED', {
      system: selectedSystem,
      rawInput: rawInput,
      characterName: selectedCharacter?.name,
      characterId: selectedCharacter?.id,
      characterColor: selectedCharacter?.textColor,
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
    // 表示が古い状態で操作された場合の保険（無効化はapplyGmOnlyControls側で行っている）
    if (!canOperateAsGm()) {
      roomPluginSelect.value = store.state.room.activePlugin || '';
      return;
    }
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
    // 表示が古い状態で操作された場合の保険（無効化はapplyGmOnlyControls側で行っている）
    if (!canOperateAsGm()) {
      syncGameSystemSelect(store.state);
      return;
    }
    store.dispatch('SET_BCDICE_SYSTEM', { system: gameSystemSelect.value });
  });
}

// システム一覧はBCDiceのAPIから取得して選択肢を作る（HTMLに手書きしない）。
// 取得が終わるまでselectは空なので、埋め終わってから現在のルーム設定を選び直す。
let gameSystemOptionsReady = false;

// 一覧に無いID（BCDice側から消えた・改名された等）が設定されている部屋でも、
// 表示が勝手に別システムへずれないよう、そのIDの選択肢を作って選べるようにする。
function ensureGameSystemOption(systemId) {
  if (gameSystemSelect.querySelector(`option[value="${CSS.escape(systemId)}"]`)) return;
  const option = document.createElement('option');
  option.value = systemId;
  option.textContent = systemId;
  gameSystemSelect.appendChild(option);
}

function syncGameSystemSelect(state) {
  if (!gameSystemSelect || !gameSystemOptionsReady) return;
  const nextValue = state?.room?.bcdiceSystem;
  if (!nextValue) return;
  ensureGameSystemOption(nextValue);
  if (gameSystemSelect.value !== nextValue) {
    gameSystemSelect.value = nextValue;
  }
}

if (gameSystemSelect) {
  fetchGameSystems()
    .then((systems) => {
      const fragment = document.createDocumentFragment();
      systems.forEach(({ id, name }) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;
        fragment.appendChild(option);
      });
      gameSystemSelect.appendChild(fragment);
    })
    .catch((error) => {
      // 一覧が取れなくても、現在のシステムでのダイスロール自体は動く。
      // 選択肢は現在のIDだけになり、その部屋のシステム変更だけができなくなる。
      console.warn('[main] BCDiceのシステム一覧を取得できませんでした:', error.message);
    })
    .finally(() => {
      gameSystemOptionsReady = true;
      syncGameSystemSelect(store.state);
    });
}

// ゲームシステム欄：他クライアントでの変更（同期）にも追従させる。
// あわせて、システムが決まった／変わったタイミングでそのシステムの情報
// （command_pattern・help_message）を取りに行き、以降の判定・ヘルプ表示に備える。
let lastSeenBcdiceSystem = null;
EventBus.subscribe('STATE_CHANGED', (state) => {
  syncGameSystemSelect(state);

  const system = state.room.bcdiceSystem;
  if (system && system !== lastSeenBcdiceSystem) {
    lastSeenBcdiceSystem = system;
    getCommandPattern(system);
    refreshGameSystemHelpIfOpen();
  }
});

// --- ルーム設定の「？」：そのシステムのhelp_messageを読めるようにする ---
function hideGameSystemHelp() {
  if (gameSystemHelp) gameSystemHelp.hidden = true;
}

async function showGameSystemHelp() {
  if (!gameSystemHelp) return;
  const system = store.state.room.bcdiceSystem;
  gameSystemHelp.hidden = false;
  gameSystemHelp.textContent = '読み込み中...';

  try {
    const { helpMessage } = await fetchGameSystemInfo(system);
    // 待っている間に閉じられた／別システムへ切り替わっていたら、古い内容で上書きしない
    if (gameSystemHelp.hidden || store.state.room.bcdiceSystem !== system) return;
    gameSystemHelp.textContent = helpMessage || 'このシステムのヘルプは提供されていません。';
  } catch (error) {
    if (gameSystemHelp.hidden) return;
    gameSystemHelp.textContent = `ヘルプを取得できませんでした（${error.message}）`;
  }
}

function refreshGameSystemHelpIfOpen() {
  if (gameSystemHelp && !gameSystemHelp.hidden) showGameSystemHelp();
}

if (gameSystemHelpBtn && gameSystemHelp) {
  const helpRow = gameSystemHelpBtn.closest('.game-system-row');
  // マウスオーバーで表示。クリック/フォーカスでも開くのは、mouseenterが来ない
  // タッチ環境とキーボード操作のため（clickで閉じないのは、focus→clickの順で
  // イベントが来るため開いた直後に閉じてしまうのを避ける）。
  gameSystemHelpBtn.addEventListener('mouseenter', showGameSystemHelp);
  gameSystemHelpBtn.addEventListener('focus', showGameSystemHelp);
  gameSystemHelpBtn.addEventListener('click', showGameSystemHelp);
  // ヘルプ本文は長くスクロールして読むので、ボタンから離れただけでは閉じず、
  // 選択欄とヘルプを含む行から出たときに閉じる。
  helpRow?.addEventListener('mouseleave', hideGameSystemHelp);
  helpRow?.addEventListener('focusout', (event) => {
    if (!helpRow.contains(event.relatedTarget)) hideGameSystemHelp();
  });
  roomSettingsDialog?.addEventListener('close', hideGameSystemHelp);
}

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
function renderCharacterList(state) {
  if (!characterList) return;

  characterList.innerHTML = "";

  const sortedTokens = Object.values(state.tokens).filter(t => !t.inBackyard && t.visible !== false).sort((a, b) => {
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
    if (tokenData.textColor) {
      nameSpan.style.color = tokenData.textColor;
    }

    avatarColumn.appendChild(avatar);
    avatarColumn.appendChild(nameSpan);
    item.appendChild(avatarColumn);

    // パラメータ一覧
    const paramList = document.createElement('div');
    paramList.className = 'character-param-list';

    Object.entries(tokenData.parameters || {})
      // visible: 一覧に出すかどうか（全員共通）。audience: 誰に見せるか（相手ごと）
      .filter(([, param]) => param.visible !== false && canView(param.audience, getCurrentParticipantId()))
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
        // 文字列値の変数にはバフ差分の概念がない（getEffectiveParameterValueが
        // 基礎値をそのまま返すため常に差分ゼロ）。数値どうしの引き算のみ行う。
        const buffTotal = typeof param.value === 'number' ? effectiveValue - param.value : 0;

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
}

EventBus.subscribe('STATE_CHANGED', renderCharacterList);

// 名乗る人が変わると、見えるパラメータ・見えるチャットタブが変わる（状態自体は
// 変わらないためSTATE_CHANGEDでは拾えない）
EventBus.subscribe('IDENTITY_CHANGED', () => {
  renderCharacterList(store.state);
  renderChatTabs(store.state);
  ensureActiveTabVisible(store.state);
});

function truncateLabel(label, maxLength = 4) {
  if (!label) return '';
  return label.length > maxLength ? `${label.slice(0, maxLength)}...` : label;
}

function splitForSpace(string) {
  return string.trim().replaceAll(" ", " ").split(" ");
}

// hideSystem: カレントチャット欄など、システム名（[Cthulhu7th]等）の表示が不要な場所ではtrueにする。
// color: 発言キャラクターの文字色設定（未設定なら既定の緑）。キャラ名にのみ適用し、
// 発言テキスト自体は常に既定色（白）のまま変えない。
function buildLogHtml({ system = "", character = "", comment = "", resultText, diceDetail = "", color = null }, { hideSystem = false } = {}) {
  const detail = diceDetail ? `<small style="color: #888;">出目内訳: [${diceDetail}]</small>` : "";
  const systemTag = (!hideSystem && system) ? `<strong style="color: #007acc;">[${system}]</strong>` : '';
  const characterTag = character ? `<span style="color: ${color || '#4caf50'};">${character}</span>` : '';
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
  initRoundPanel();
  initAudioPlayer();
  store.init();
});