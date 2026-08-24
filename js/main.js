// js/main.js

import { rollBCDice } from './BCdice.js';
import { parseUntrustedJson } from './untrusted-json.js';
import { escapeHtml, safeCssColor } from './html-escape.js';
import { fetchGameSystems, fetchGameSystemInfo, getCommandPattern } from './bcdice-catalog.js';
import {
  store, generateTokenId, generateBuffId, listPlugins, getEffectiveParameterValue,
  BUFF_PHASE_LABELS, getBoardDropSpot,
  buildPanelToggleItems, buildAddCharacterMenuItem, buildAddPanelMenuItem, buildBackgroundSettingsMenuItem
} from './board-data-driven.js';
import {
  AUDIO_CHANNELS, AUDIO_CHANNEL_LABELS, listExpiringBuffNames, formatExpiredBuffsNote,
  usesInitiativeProcess, showsEntryMessages, snapsToGrid, generateDeckId, generateDeckTemplateId,
  generateCardId, CARD_COLS, CARD_ROWS, SYSTEM_CHAT_TAB_ID
} from './game-store.js';
import { showDeckListDialog } from './deck-list-dialog.js';
import { showDeckEditorDialog } from './deck-editor-dialog.js';
import {
  DECK_TEMPLATES, findDeckTemplate, expandDeckTemplate, countDeckTemplateCards, TRUMP_BACK
} from './card-catalog.js';
import { buildDeckFile, readDeckFile, deckFileName } from './deck-file.js';
import { pickFileAsText } from './file-uploader.js';
import { downloadJSON } from './character-snapshot.js';
import { findTrackByPhraseSuffix } from './audio-phrase.js';
import { EventBus } from './EventBus.js';
import { showContextMenu } from './context-menu.js';
import { renderChatPalette, loadChatPaletteState, parseChatPaletteLines, isChatPaletteHeading } from './chat-palette.js';
import { createFloatingPanel } from './floating-panel.js';
import { setChatPaletteController } from './board-data-driven.js';
import {
  initNetSync, replaceState, requestRoomDeletion, sendIdentify, requestChatSendSound,
  sendTypingStart, sendTypingStop
} from './net-sync.js';
import {
  getNickname, normalizeRoomName, getStoredRoomName, setStoredRoomName,
  getStoredDevPassphrase, setStoredDevPassphrase,
  activateRoomIdentity, getCurrentParticipantId, getCurrentAuthToken
} from './local-identity.js';
import { entryPasswordHeaders, setStoredEntryPassword } from './room-entry.js';
import { showIdentityDialog } from './identity-dialog.js';
import { showChatTabDialog } from './chat-tab-dialog.js';
import { canView, isRestricted, describeAudience, HIDDEN_VALUE_MASK } from './visibility.js';
import {
  handlePluginChatCommand, findPluginForChatCommand,
  parsePluginBuffExtra, describePluginBuffMeta, getPluginBcdiceSystem
} from './parameters/registry.js';
import { looksLikeDiceDraftPoolCommand } from './parameters/dice-draft/dice-draft-pool.js';
import { looksLikeItemCommand } from './parameters/skill/item-use.js';
import { showRoomParametersDialog } from './room-parameters-dialog.js';
import { showOriginalTableDialog } from './original-table-dialog.js';
import { showOriginalTableListDialog } from './original-table-list-dialog.js';
import { showSceneListDialog } from './scene-list-dialog.js';
import { showSceneDialog } from './scene-dialog.js';
import { showLogExportDialog } from './log-export-dialog.js';
import { showLogClearConfirmDialog } from './log-clear-dialog.js';
import { registerServiceWorker } from './pwa.js';
import { showLogEditDialog } from './log-edit-dialog.js';
import { buildLogExportHtml } from './log-export.js';
import { showAudioDialog } from './audio-dialog.js';
import { initAudioPlayer } from './audio-player.js';
import { initDiceAnimation } from './dice-animation.js';
import { MAX_ANIMATED_DICE } from './dice-notation.js';
import { initRoundPanel, startRoundProgression } from './round-panel.js';
import { initStampLayer, requestStamp } from './stamp-layer.js';
import { initStampPanel } from './stamp-panel.js';
import { initDiceDraftPanel } from './dice-draft-panel.js';
import { findStampByName, listStampLabels } from './stamp-registry.js';
import { initInfoPanel } from './info-panel.js';
import { initCharacterPanel, listMyBackyardTokens } from './character-panel.js';
import { initMobileLayout } from './mobile-layout.js';
import { initNoBrowserZoom } from './no-browser-zoom.js';
import { showRoomDeleteConfirmDialog } from './room-delete-dialog.js';
import { canOperateAsGm, canEditChatEntry, GM_ONLY_REASON } from './room-authority.js';
import { createHelpPanel } from './help/help-panel.js';
import { applyStaticIcons, setIconText } from './icons.js';

// HTMLにdata-iconで置き場所だけ書いてあるアイコン（ヘッダーのボタンなど）を埋める。
// DOM要素の取得より先に済ませておく。
applyStaticIcons();

// DOM要素の取得（ダイス関連）
const sendBtn = document.getElementById('sendBtn');
const gameSystemSelect = document.getElementById('gameSystem');
const gameSystemHelpBtn = document.getElementById('gameSystemHelpBtn');
const gameSystemHelp = document.getElementById('gameSystemHelp');
const characterParamSelect = document.getElementById('characterParamSelect');
const commandInput = document.getElementById('commandInput');
const commandInputSuggestions = document.getElementById('commandInputSuggestions');
const logContainer = document.getElementById('logContainer');
const currentChatLog = document.getElementById('currentChatLog');
const currentChatPortrait = document.getElementById('currentChatPortrait');
const chatTabsEl = document.getElementById('chatTabs');
const systemTabBtn = document.getElementById('systemTabBtn');
const helpTabBtn = document.getElementById('helpTabBtn');
const helpChatEl = document.getElementById('helpChat');
const netStatusEl = document.getElementById('netStatus');
const typingIndicatorEl = document.getElementById('typingIndicator');

// --- チャットタブ ---
// 「Main」タブは常に存在する既定タブ。他のタブはユーザーが追加する並行チャット用。
// 「システム」タブ（SYSTEM_CHAT_TAB_ID）も常に存在する固定タブで、進行の通知だけが流れる。
// 「？ヘルプ」と同じくスクロールするタブ列の外に置き、タブが何枚増えても流れないようにする
// （renderChatTabsはタブ列から除き、静的マークアップ#systemTabBtnの選択状態だけを合わせる）。
// タブ一覧・各タブのログはstore経由でサーバーと同期される。「今どのタブを見ているか」は
// 各クライアントのローカルUI状態（人によって見ているタブが違ってよい）としてここで保持する。
// 盤面下のカレントチャット欄（currentChatLog）は、選択中のタブに関わらずMainタブの内容だけを表示する。
const MAIN_TAB_ID = 'main';
let activeTabId = MAIN_TAB_ID;

// 「？ヘルプ」を開いているか。ヘルプはstoreのタブではなくこのブラウザだけのUI状態で、
// 開いている間もactiveTabIdは実在するタブのままにしておく（詳細はopenHelpの手前）。
let helpOpen = false;

let lastRenderedChatTabsRef = null;
let lastRenderedLogTabId = null; // logContainerに最後に描画したタブID（切り替え検知用）
let lastRenderedLogCount = 0;    // logContainerへ反映済みの件数（差分追記用）
let lastRenderedLogEntries = null; // logContainerへ反映済みのentries配列（発言の編集の検知用）
let lastRenderedMainCount = 0;   // currentChatLogへ反映済みの件数（Mainタブ固定）
let lastRenderedMainEntry = null; // currentChatLogに出している発言（同じく編集の検知用）
let lastSpokenCharacterId = null; // カレントチャット欄に最後に流れたメッセージの参照キャラクター（立ち絵表示用）

// Main・システム以外のタブで、見ていない間に発言が増えたタブのID集合（タブボタンの未読ドット用）。
// Mainは下のカレントチャット欄に常に最新発言が出るので対象外、システムは進行通知専用で
// 人が探しに行く場ではないため対象外（どちらもユーザー指定）。
const unreadTabIds = new Set();
const tabBadgeEls = new Map(); // tabId → 未読ドット要素（renderChatTabsのたびに作り直す）
let lastSeenTabLogRef = new Map(); // tabId → 直近のSTATE_CHANGEDで見たchatLogs[tabId]の参照（新着検知用）

// 自分に見えるチャットタブだけを返す（限定公開タブは宛先に入っている人にだけ見せる）。
function visibleChatTabs(state) {
  const myId = getCurrentParticipantId();
  return state.chatTabs.filter(tab => canView(tab.audience, myId));
}

function renderChatTabs(state) {
  if (!chatTabsEl) return;
  chatTabsEl.innerHTML = '';
  tabBadgeEls.clear();

  // 消えたタブの未読状態は引きずらない
  const liveTabIds = new Set(state.chatTabs.map(tab => tab.id));
  for (const tabId of unreadTabIds) {
    if (!liveTabIds.has(tabId)) unreadTabIds.delete(tabId);
  }
  for (const tabId of lastSeenTabLogRef.keys()) {
    if (!liveTabIds.has(tabId)) lastSeenTabLogRef.delete(tabId);
  }

  visibleChatTabs(state).filter(tab => tab.id !== SYSTEM_CHAT_TAB_ID).forEach(tab => {
    const tabBtn = document.createElement('button');
    tabBtn.type = 'button';
    // ヘルプを開いている間はログ欄が見えていないので、実タブの方は選択中に見せない
    // （どちらも光っていると「今どっちを見ているのか」が分からなくなる）
    tabBtn.className = 'chat-tab' + (tab.id === activeTabId && !helpOpen ? ' active' : '');
    // 限定公開のタブは、うっかり全体向けの発言を書き込まないよう鍵アイコンで区別する
    if (isRestricted(tab.audience)) {
      setIconText(tabBtn, 'lock', tab.name, '限定公開');
    } else {
      tabBtn.textContent = tab.name;
    }
    tabBtn.title = describeAudience(tab.audience, state.participants);
    tabBtn.addEventListener('click', () => switchChatTab(tab.id));
    // 設定ダイアログ（名前変更・公開先変更・削除）は、そのタブが見えている人なら誰でも開ける。
    // Mainタブも名前変更はできるようにするが、削除・公開先変更は従来通りできない
    // （openChatTabAudienceDialog側でMainタブを特別扱いする）。
    tabBtn.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      openChatTabAudienceDialog(tab);
    });

    // 未読ドット。Mainは常時カレントチャット欄に最新発言が出るので対象外（ユーザー指定）。
    if (tab.id !== MAIN_TAB_ID) {
      const badge = document.createElement('span');
      badge.className = 'chat-tab-badge';
      badge.hidden = !unreadTabIds.has(tab.id);
      tabBtn.appendChild(badge);
      tabBadgeEls.set(tab.id, badge);
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

  // 「システム」「？ヘルプ」のボタンは静的マークアップ（#systemTabBtn／#helpTabBtn）なので
  // ここでは作り直さない。選択中の見た目だけ合わせる。
  systemTabBtn?.classList.toggle('active', activeTabId === SYSTEM_CHAT_TAB_ID && !helpOpen);
  helpTabBtn?.classList.toggle('active', helpOpen);
}

if (systemTabBtn) {
  systemTabBtn.addEventListener('click', () => switchChatTab(SYSTEM_CHAT_TAB_ID));
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

// Mainタブ（先頭タブ）は常に存在する既定タブなので削除できないし、公開先も常に全員向けの
// ままにする（withSystemLog等がMainタブへ無条件に流し込む設計を壊さないため）。
// 名前変更だけはMainタブでも行える：canDelete: falseで削除の導線を出さず、
// audienceEditable: falseで公開先の選択欄自体を出さない（js/chat-tab-dialog.js側が
// 固定表示に切り替える）ことで、「選べるのに反映されない」状態を避ける。
// SET_CHAT_TAB_AUDIENCEのdispatchをMainタブでは行わない既存の判断はそのまま残す
// （保険。UI側で選択できなくなった後も、この分岐だけで安全側に倒れる）。
function openChatTabAudienceDialog(tab) {
  const isMainTab = tab.id === MAIN_TAB_ID;
  if (tab.id === SYSTEM_CHAT_TAB_ID) return; // 名前も公開先も固定（呼ばれない想定の保険）
  showChatTabDialog({
    mode: 'edit',
    name: tab.name,
    audience: tab.audience ?? null,
    participants: store.state.participants || {},
    myParticipantId: getCurrentParticipantId(),
    canDelete: !isMainTab,
    audienceEditable: !isMainTab,
    onConfirm: ({ name, audience }) => {
      if (name !== tab.name) store.dispatch('RENAME_CHAT_TAB', { id: tab.id, name });
      if (!isMainTab) store.dispatch('SET_CHAT_TAB_AUDIENCE', { id: tab.id, audience });
    },
    onDelete: () => {
      store.dispatch('REMOVE_CHAT_TAB', { id: tab.id });
    }
  });
}

// 表示名を変えた等で今見ているタブが見えなくなった場合に、Mainへ戻す。
function ensureActiveTabVisible(state) {
  if (visibleChatTabs(state).some(tab => tab.id === activeTabId)) return;
  switchChatTab(MAIN_TAB_ID);
}

function switchChatTab(tabId) {
  if (helpOpen) closeHelp();
  activeTabId = tabId;
  unreadTabIds.delete(tabId); // 今から見るタブなので未読ドットは消す
  lastRenderedLogTabId = null; // 強制的にlogContainerを描き直させる
  syncChatInputLock();
  renderChatTabs(store.state);
  renderActiveTabLog(store.state);
}

// --- 「？ヘルプ」タブ ---
// ヘルプはstoreのタブではなく、このブラウザだけのUI状態。activeTabIdは実在するタブの
// ままにしておく：この画面ではtabId = activeTabIdを既定にして発言・パラメータ操作・
// バフ・発言の編集を流す箇所が多く、架空のIDを入れると存在しないタブへ書き込みかねない。
// 開いているかどうかはhelpOpen（宣言はactiveTabIdの隣）だけで表す。

const helpPanel = helpChatEl
  ? createHelpPanel({
    container: helpChatEl,
    getActivePlugin: () => store.state.room?.activePlugin ?? null
  })
  : null;

// ヘルプ表示中はチャット欄を触れなくする（選択肢を押して読むだけの場所なので、
// 見えていない先のタブへうっかり発言してしまう事故を防ぐ）。
// js/read-only-form.jsのlockFormControlsは「封じたら戻さない」前提の道具なので使わない。
const COMMAND_INPUT_PLACEHOLDER = commandInput?.placeholder ?? '';

function setChatInputLocked(locked, reason = '') {
  if (commandInput) {
    commandInput.disabled = locked;
    commandInput.placeholder = locked ? reason : COMMAND_INPUT_PLACEHOLDER;
  }
  if (sendBtn) sendBtn.disabled = locked;
  if (characterParamSelect) characterParamSelect.disabled = locked;
}

// 入力欄を触れる状態にするかどうかを、今の表示（ヘルプ／システムタブ）から決め直す。
// システムタブは進行の通知だけを溜める読み専用の置き場なので、発言も判定も受け付けない
// （applyLogの既定の宛先は表示中タブなので、封じておかないと通知の列に手打ちの発言や
// ロール結果が混ざってしまう）。
function syncChatInputLock() {
  if (helpOpen) {
    setChatInputLocked(true, 'ヘルプ表示中は入力できません');
  } else if (activeTabId === SYSTEM_CHAT_TAB_ID) {
    setChatInputLocked(true, 'システムタブは読むだけの場所です（発言は他のタブへ）');
  } else {
    setChatInputLocked(false);
  }
}

function openHelp() {
  if (!helpPanel || !helpChatEl || !logContainer) return;
  helpOpen = true;
  logContainer.hidden = true;
  helpChatEl.hidden = false;
  syncChatInputLock();
  helpPanel.open(); // 開くたびにあいさつを引き直して最初の層から
  renderChatTabs(store.state);
}

function closeHelp() {
  if (!helpChatEl || !logContainer) return;
  helpOpen = false;
  helpChatEl.hidden = true;
  logContainer.hidden = false;
  syncChatInputLock();
}

if (helpTabBtn) {
  // 押すたびに開閉する（もう一度押せば見ていたタブへ戻れる）
  helpTabBtn.addEventListener('click', () => {
    if (helpOpen) {
      switchChatTab(activeTabId); // closeHelp + ログの描き直し
    } else {
      openHelp();
    }
  });
}

// containerの末尾に、entries[fromIndex:]だけを追記する（既存分は再描画しない＝
// メッセージが増えるたびに過去ログのfadeInアニメーションが再生される事態を防ぐ）。
// data-entry-idは、右クリック／長押しで「どの発言を編集するか」を引くための印
// （idを持たない発言＝過去ログ・システム発言では付かず、そのまま編集の対象外になる）。
function appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {}) {
  for (let i = fromIndex; i < entries.length; i++) {
    const item = document.createElement('div');
    item.className = itemClassName;
    if (entries[i].id) item.dataset.entryId = entries[i].id;
    item.innerHTML = buildLogHtml(entries[i], buildOptions);
    container.appendChild(item);
  }
  if (entries.length > fromIndex) {
    container.scrollTop = container.scrollHeight;
  }
}

// 既に描いてある行のうち、中身が入れ替わったもの（＝編集された発言）だけを描き直す。
// 全部を消して描き直すと過去ログ全部のfadeInが再生されるので、触るのはその行だけにする。
// entryは編集のたびに凍らせて作り直されるため（game-store.jsのEDIT_CHAT_MESSAGE）、
// 参照が変わったかどうかだけで編集された行を見分けられる。
function patchEditedLogEntries(container, entries) {
  if (!lastRenderedLogEntries || lastRenderedLogEntries === entries) return;

  const rendered = Math.min(lastRenderedLogCount, lastRenderedLogEntries.length, entries.length);
  for (let i = 0; i < rendered; i++) {
    if (lastRenderedLogEntries[i] === entries[i]) continue;
    const item = container.children[i];
    if (item) item.innerHTML = buildLogHtml(entries[i]);
  }
}

function renderActiveTabLog(state) {
  if (!logContainer) return;
  const entries = state.chatLogs[activeTabId] || [];

  // 件数が減るのはログの消去（CLEAR_ALL_CHAT_LOGS）だけ。差分追記では追いつけないので
  // 描き直す（この分岐が無いと、消してもタブを切り替えるまで古いログが残る）。
  if (lastRenderedLogTabId !== activeTabId || entries.length < lastRenderedLogCount) {
    logContainer.innerHTML = '';
    lastRenderedLogTabId = activeTabId;
    lastRenderedLogCount = 0;
    lastRenderedLogEntries = null;
  }

  if (entries.length === 0) {
    if (logContainer.children.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'log-item log-placeholder';
      placeholder.style.color = '#888';
      placeholder.textContent = 'ここにダイスログが表示されます...';
      logContainer.appendChild(placeholder);
    }
    lastRenderedLogEntries = entries;
    return;
  }

  if (lastRenderedLogCount === 0 && logContainer.querySelector('.log-placeholder')) {
    logContainer.innerHTML = '';
  }

  patchEditedLogEntries(logContainer, entries);
  appendLogEntries(logContainer, entries, lastRenderedLogCount, 'log-item');
  lastRenderedLogCount = entries.length;
  lastRenderedLogEntries = entries;
}

function renderMainChatMirror(state) {
  if (!currentChatLog) return;
  const entries = state.chatLogs[MAIN_TAB_ID] || [];

  // ログの消去（CLEAR_ALL_CHAT_LOGS）で件数が減った場合は、最後の発言もろとも空にする
  // （立ち絵の元になる参照キャラクターも忘れる）。
  if (entries.length < lastRenderedMainCount) {
    currentChatLog.innerHTML = '';
    lastSpokenCharacterId = null;
    lastRenderedMainEntry = null;
  }

  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  // 件数が増えたとき（新しい発言）に加えて、今出している発言そのものが差し替わったとき
  // （＝出しているものが編集されたとき）も描き直す。件数が同じ場合だけを編集とみなすので、
  // ログの消去で件数が減った直後の1件（「ログを消去しました。」）は流さない。
  const isNewEntry = entries.length > lastRenderedMainCount;
  const isEditedEntry = entries.length === lastRenderedMainCount && latestEntry !== lastRenderedMainEntry;

  if (latestEntry && (isNewEntry || isEditedEntry)) {
    // 履歴を積み上げず、最新の発言1件だけに置き換える（要素を作り直すことで
    // fadeInアニメーションも都度再生される）。
    currentChatLog.innerHTML = '';
    const item = document.createElement('div');
    item.className = 'current-chat-log-item';
    item.innerHTML = buildLogHtml(latestEntry, { hideSystem: true, hideTime: true });
    currentChatLog.appendChild(item);

    if ('characterId' in latestEntry) {
      lastSpokenCharacterId = latestEntry.characterId || null;
    }
    lastRenderedMainEntry = latestEntry;
  }

  lastRenderedMainCount = entries.length;
}

// タブボタン1個分だけ未読ドットの表示を直す（renderChatTabs丸ごとの作り直しを避ける軽い経路）。
function updateTabBadge(tabId) {
  const badge = tabBadgeEls.get(tabId);
  if (badge) badge.hidden = !unreadTabIds.has(tabId);
}

// Main・システム以外のタブで、今見ていない間に発言が増えていないか調べ、未読ドットを立てる。
// chatLogs[tabId]は発言のたびに新しい配列に置き換わる（js/game-store.jsのwithChatEntry）ので、
// 参照が変わったかどうかで新着を判定できる。件数が増えていない場合（発言の編集・ログ消去）は
// 対象にしない。
function updateUnreadTabs(state) {
  for (const [tabId, entries] of Object.entries(state.chatLogs)) {
    if (tabId === MAIN_TAB_ID || tabId === SYSTEM_CHAT_TAB_ID) continue;
    const prevEntries = lastSeenTabLogRef.get(tabId);
    lastSeenTabLogRef.set(tabId, entries);

    if (prevEntries === undefined || entries === prevEntries || entries.length <= prevEntries.length) continue;
    if (tabId === activeTabId && !helpOpen) continue; // 今まさに見ている本人には不要

    unreadTabIds.add(tabId);
    updateTabBadge(tabId);
  }
}

// 再接続で全ログが丸ごと再送されると新着扱いになってしまうので、mobile版
// （js/mobile-layout.js）同様に基準を引き直す。
EventBus.subscribe('NET_INITIALIZED', (state) => {
  lastSeenTabLogRef = new Map(Object.entries(state.chatLogs));
  unreadTabIds.clear();
  renderChatTabs(state);
});

EventBus.subscribe('STATE_CHANGED', (state) => {
  if (state.chatTabs !== lastRenderedChatTabsRef) {
    lastRenderedChatTabsRef = state.chatTabs;
    renderChatTabs(state);
    // 公開先から外された・タブが消えた場合に、見えないタブを開いたままにしない
    ensureActiveTabVisible(state);
  }

  updateUnreadTabs(state);
  renderActiveTabLog(state);
  renderMainChatMirror(state);
  updateCurrentChatPortrait();
});

// --- 発言の編集（ログ欄の右クリック／長押し） ---
// 編集してよいのは発言者本人とGMだけ（js/room-authority.jsのcanEditChatEntry）。

// 表示中のタブから、idで発言1件を引く。行の位置ではなくidで引くのは、描画してから
// メニューを開くまでの間に新しい発言が入っても、指し先がずれないようにするため。
function findLogEntryById(entryId) {
  return (store.state.chatLogs[activeTabId] || []).find(entry => entry.id === entryId) || null;
}

function openLogEntryMenu(clientX, clientY, entry) {
  showContextMenu(clientX, clientY, [
    {
      label: '発言を編集',
      onSelect: () => showLogEditDialog({
        resultText: entry.resultText || '',
        // ダイアログを開いている間に消える（ログの消去）こともあるので、
        // 反映は指し先のidだけを渡し、実体の差し替えはstore側に任せる。
        onConfirm: (resultText) => store.dispatch('EDIT_CHAT_MESSAGE', {
          tabId: activeTabId, entryId: entry.id, resultText
        })
      })
    }
  ]);
}

// 右クリックされた行が編集できるものなら、その発言を返す。
function editableEntryFromEvent(event) {
  const item = event.target?.closest?.('.log-item');
  if (!item?.dataset.entryId) return null;
  const entry = findLogEntryById(item.dataset.entryId);
  return (entry && canEditChatEntry(entry)) ? entry : null;
}

// タッチ・ペンでの長押し。盤面と同じjs/drag-gesture.jsは使わない：あちらはpointerdownで
// preventDefault()するため、ログ欄では指でのスクロールと文字の選択（コピー）ができなくなる。
// ここでは何も止めず、押している時間と指の動きだけを見る。
const LOG_LONG_PRESS_MS = 500;
const LOG_LONG_PRESS_TOLERANCE_PX = 10;

// 長押しでメニューを出した直後、Androidのブラウザはさらにcontextmenuを上げてくる。
// 同じメニューが開き直されるのを防ぐため、この時刻まではcontextmenuを無視する
// （js/drag-gesture.jsのsuppressNextContextMenuと同じ事情）。
let suppressLogContextMenuUntil = 0;

function initLogEntryMenu(container) {
  container.addEventListener('contextmenu', (event) => {
    const entry = editableEntryFromEvent(event);
    // 編集できない行では何もしない＝ブラウザ標準のメニュー（コピー等）をそのまま残す。
    // 押せない項目として出すこともできるが、ログは行数が多く、どの行でもメニューが
    // 割り込んでくると文字のコピーの邪魔になる。
    if (!entry) return;

    event.preventDefault();
    if (Date.now() < suppressLogContextMenuUntil) return;
    openLogEntryMenu(event.clientX, event.clientY, entry);
  });

  let longPressTimer = null;
  let startX = 0;
  let startY = 0;

  const cancelLongPress = () => {
    if (longPressTimer === null) return;
    clearTimeout(longPressTimer);
    longPressTimer = null;
  };

  container.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return; // マウスには右クリックがある
    const entry = editableEntryFromEvent(event);
    if (!entry) return;

    startX = event.clientX;
    startY = event.clientY;
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      // 押している間に消えた・編集できなくなった場合に備えて引き直す
      const current = findLogEntryById(entry.id);
      if (!current || !canEditChatEntry(current)) return;

      suppressLogContextMenuUntil = Date.now() + 800;
      openLogEntryMenu(startX, startY, current);
    }, LOG_LONG_PRESS_MS);
  });

  // 指が動いたらスクロールとみなして取り消す（長押しの判定はその場で押し続けたときだけ）
  container.addEventListener('pointermove', (event) => {
    if (longPressTimer === null) return;
    if (Math.abs(event.clientX - startX) > LOG_LONG_PRESS_TOLERANCE_PX
      || Math.abs(event.clientY - startY) > LOG_LONG_PRESS_TOLERANCE_PX) {
      cancelLongPress();
    }
  });
  container.addEventListener('pointerup', cancelLongPress);
  container.addEventListener('pointercancel', cancelLongPress);
  container.addEventListener('scroll', cancelLongPress);
}

if (logContainer) initLogEntryMenu(logContainer);

// 接続状態インジケータ（ヘッダー）
EventBus.subscribe('NET_STATUS_CHANGED', (status) => {
  if (!netStatusEl) return;
  netStatusEl.className = `net-status net-status-${status}`;
  netStatusEl.textContent = status === 'connected' ? '● 接続済み'
    : status === 'connecting' ? '● 接続中...'
    : '● 切断';
});

// DOM要素の取得（キャラクター登録関連）

// ...(既存のDOM取得の並びに追加)
const roomPluginSelect = document.getElementById('roomPluginSelect');
const roomMenuBtn = document.getElementById('roomMenuBtn');
const audioMenuBtn = document.getElementById('audioMenuBtn');
const panelVisibilityBtn = document.getElementById('panelVisibilityBtn');
const addMenuBtn = document.getElementById('addMenuBtn');
const roomSettingsDialog = document.getElementById('roomSettingsDialog');
const roomNameInput = document.getElementById('roomNameInput');
const roomTitle = document.getElementById('roomTitle');
// 見出しの中のロゴ。部屋名が入ると見出しは部屋名だけになってロゴがDOMから外れるので、
// 名前が消えたときに戻せるよう最初に控えておく。ここで<img>を組み立て直さないのは、
// 画像のパスと見た目の指定をHTML側の1箇所だけに残すため。
const roomTitleLogo = roomTitle ? roomTitle.querySelector('.app-logo') : null;
const exportStateBtn = document.getElementById('exportStateBtn');
const importStateBtn = document.getElementById('importStateBtn');
const importStateInput = document.getElementById('importStateInput');
const deleteRoomBtn = document.getElementById('deleteRoomBtn');
const entryPasswordInput = document.getElementById('entryPasswordInput');
const entryPasswordBtn = document.getElementById('entryPasswordBtn');
const entryPasswordNote = document.getElementById('entryPasswordNote');
const roundInitiativeProcessCheck = document.getElementById('roundInitiativeProcessCheck');
const showEntryMessagesCheck = document.getElementById('showEntryMessagesCheck');
const gridSnapCheck = document.getElementById('gridSnapCheck');

// --- GM限定の操作（js/room-authority.js参照） ---
// 部屋そのものを左右する操作は、GMが決まっている部屋ではGMだけができるようにする。
// 項目を消してしまうと「なぜ出ないのか」が分からないので、押せない状態で残して理由を
// ツールチップで示す（コマの操作制限・context-menu.jsのdisabledと同じ考え方）。

// ルーム設定ダイアログ内の注記。無効化されている理由をツールチップだけに頼らず出す。
const gmOnlyNote = document.getElementById('roomSettingsGmNote');

function applyGmOnlyControls() {
  const allowed = canOperateAsGm();

  [gameSystemSelect, roomPluginSelect, importStateBtn, deleteRoomBtn,
    entryPasswordInput, entryPasswordBtn, roundInitiativeProcessCheck, showEntryMessagesCheck,
    gridSnapCheck].forEach(el => {
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
      boardHeight: room.boardHeight,
      showGrid: room.showGrid
    },
    // 「シーンチェンジで残す」パネルはどのシーンにも属さないので写し取らない。
    // 焼き付けてしまうと、そのパネルを消したあとに古いシーンへ行ったとき復活してしまう。
    panels: Object.fromEntries(
      Object.entries(store.state.panels || {}).filter(([, panel]) => !panel.keepOnSceneChange)
    )
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
    // 音源の追加（アップロード・URL）・削除・停止はGM限定。再生・音量・ミュートは全員が触れる
    // （みんなで聴いている音を他人が止められないようにするため。聴きたくない人はミュート）。
    canAddTrack: canOperateAsGm(),
    canStop: canOperateAsGm(),
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
      store.dispatch('STOP_AUDIO_PLAYBACK', { channel });
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

  // 名前なし＝ゲスト参加。参加者一覧には載せない。net-syncが覚えている名乗りも消して、
  // 繋ぎ直したときに前の名前で名乗り直さないようにする。
  if (!identity) {
    sendIdentify(null, null);
    return;
  }

  // 参加者としての登録より先に名乗る。サーバーは名乗りが通ったID本人からの
  // REGISTER_PARTICIPANTしか受け付けない（server/index.js参照）。
  sendIdentify(identity.participantId, identity.authToken, name);
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

// --- デッキ（js/deck-list-dialog.js・js/deck-editor-dialog.js） ---
// 作ったデッキの定義はroom.deckTemplatesに入り、部屋の全員で共有する（オリジナル表と同じ）。
// 盤面に置くときに1枚ずつの札へ展開するので、置いたあとの山札は定義とは切り離される。

// デッキを盤面に置く。盤面のどこかを指している操作ではないので、今見えている範囲の
// 真ん中へ置く（引いた札はデッキの右へ並ぶ。js/game-store.jsのDRAW_CARDS）。
function placeDeckOnBoard(name, back, cards) {
  const spot = getBoardDropSpot({ cols: CARD_COLS, rows: CARD_ROWS });
  store.dispatch('ADD_DECK', {
    id: generateDeckId(), name, back, cards, x: spot.x, y: spot.y
  });
}

// 組み込みのデッキ（簡易トランプ）を、部屋のデッキの形（1行＝1種類＋枚数）へ写す。
// 「複製して編集」のためのもので、トランプは同じ札が2枚と無いので全行が枚数1になる。
function builtInAsTemplate(builtIn) {
  return {
    id: null,
    name: builtIn.defaultName,
    back: builtIn.back,
    cards: builtIn.build({ jokers: 0 }).map((card, index) => ({
      id: `row-${index}`,
      name: card.face.text,
      count: 1,
      text: '',
      image: card.face.image
    }))
  };
}

function openDeckEditor(template = null) {
  showDeckEditorDialog({
    template,
    onConfirm: ({ id, name, back, cards }) => {
      store.dispatch('SAVE_DECK_TEMPLATE', {
        id: id || generateDeckTemplateId(), name, back, cards
      });
      openDeckListDialog();
    },
    // 一覧は自分を閉じてからこの画面を開くので、キャンセル時は一覧へ戻す
    onCancel: () => openDeckListDialog()
  });
}

// 書き出したデッキのJSONを読み込む。画像はこの部屋へ引き取り直される（js/deck-file.js）。
async function importDeckFromFile() {
  const picked = await pickFileAsText({ accept: 'application/json' });
  if (!picked) {
    openDeckListDialog();
    return;
  }

  let deck = null;
  try {
    deck = await readDeckFile(picked.text, (index) => `row-${index}`);
  } catch (error) {
    alert(`JSONの解析に失敗しました: ${error.message}`);
    openDeckListDialog();
    return;
  }

  if (!deck) {
    alert('このファイルはデッキのJSONではありません。');
    openDeckListDialog();
    return;
  }

  store.dispatch('SAVE_DECK_TEMPLATE', {
    id: generateDeckTemplateId(), name: deck.name || '読み込んだデッキ', back: deck.back, cards: deck.cards
  });
  openDeckListDialog();
}

function openDeckListDialog() {
  const templates = store.state.room.deckTemplates || {};

  showDeckListDialog({
    builtIns: DECK_TEMPLATES.map(builtIn => ({
      id: builtIn.id,
      label: builtIn.label,
      count: builtIn.build({ jokers: 0 }).length
    })),
    templates: Object.values(templates).map(template => ({
      id: template.id,
      name: template.name,
      count: countDeckTemplateCards(template)
    })),

    onPlaceBuiltIn: (id) => {
      const builtIn = findDeckTemplate(id);
      if (!builtIn) return;
      const cards = builtIn.build({ jokers: 0 }).map(card => ({ id: generateCardId(), face: card.face }));
      placeDeckOnBoard(builtIn.defaultName, builtIn.back || TRUMP_BACK, cards);
    },
    onCopyBuiltIn: (id) => {
      const builtIn = findDeckTemplate(id);
      if (!builtIn) return;
      openDeckEditor(builtInAsTemplate(builtIn));
    },

    onPlace: (id) => {
      const template = store.state.room.deckTemplates?.[id];
      if (!template) return;
      placeDeckOnBoard(template.name, template.back, expandDeckTemplate(template, generateCardId));
    },
    onEdit: (id) => openDeckEditor(store.state.room.deckTemplates?.[id] || null),
    onExport: (id) => {
      const template = store.state.room.deckTemplates?.[id];
      if (!template) return;
      downloadJSON(deckFileName(template.name), buildDeckFile(template));
    },
    onRemove: (id) => {
      store.dispatch('REMOVE_DECK_TEMPLATE', { id });
      openDeckListDialog();
    },
    onCreate: () => openDeckEditor(),
    onImport: () => importDeckFromFile()
  });
}

// 「パネル表示」ボタン：5つの浮動パネルの表示/非表示を切り替える。項目自体は盤外右クリック
// メニュー（js/board-data-driven.jsのopenBoardMenu）と共有（buildPanelToggleItems）。
// こちらはキャラクター一覧を先頭にする（右クリックメニューの並びはそのまま変えない）。
if (panelVisibilityBtn) {
  panelVisibilityBtn.addEventListener('click', () => {
    const rect = panelVisibilityBtn.getBoundingClientRect();
    const t = buildPanelToggleItems();
    showContextMenu(rect.left, rect.bottom + 4, [
      ...t.characterList, ...t.chatPalette, ...t.info, ...t.stamp, ...t.diceDraft
    ]);
  });
}

// 「+」ボタン：キャラクター/パネルの追加・背景設定は盤外右クリックメニューと、
// シーン一覧・ラウンド進行開始・デッキ一覧は元は「⋯」ルームメニューにあったものと同じ
// 関数を共有する（buildAddCharacterMenuItem等・openSceneListDialog・startRoundProgression・
// openDeckListDialog）。GM限定の判定・ラウンド進行開始の表示条件も元のまま踏襲する。
if (addMenuBtn) {
  addMenuBtn.addEventListener('click', () => {
    const rect = addMenuBtn.getBoundingClientRect();
    const allowed = canOperateAsGm();
    const items = [
      buildAddCharacterMenuItem(),
      buildAddPanelMenuItem(),
      buildBackgroundSettingsMenuItem(),
      {
        label: 'シーン一覧',
        onSelect: openSceneListDialog,
        disabled: !allowed,
        title: allowed ? undefined : GM_ONLY_REASON
      }
    ];
    if (!store.state.round.active) {
      items.push({
        label: 'ラウンド進行を開始',
        onSelect: startRoundProgression,
        disabled: !allowed,
        title: allowed ? undefined : GM_ONLY_REASON
      });
    }
    items.push({ label: 'デッキ一覧', onSelect: openDeckListDialog });
    showContextMenu(rect.left, rect.bottom + 4, items);
  });
}

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

    // 全タブのログの消去はGM限定（サーバー側もserver/index.jsのGM_ONLY_ACTIONSで
    // CLEAR_ALL_CHAT_LOGSを弾く）。項目自体は残して理由を示す。
    {
      const allowed = canOperateAsGm();
      items.push({
        label: 'ログを消去',
        onSelect: openLogClearDialog,
        danger: true,
        disabled: !allowed,
        title: allowed ? undefined : GM_ONLY_REASON
      });
    }

    items.push(
      {
        label: '参加者設定',
        onSelect: openIdentityDialog
      },
      // ホーム画面／デスクトップにインストールして開くとアドレスバーが無く、更新ボタンも
      // 引っ張って更新も使えない（後者はhtmlのoverscroll-behaviorでこちらが止めている）。
      // 読み込み直す手段がここしか無くなるので、常に置いておく。
      {
        label: '再読み込み',
        onSelect: () => { window.location.reload(); }
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
//
// state.tokensには盤面・バックヤードのコマが両方入っているが、バックヤードのコマは
// ownerId（またはbackyardOwnerId）が今この部屋限りの値なので、別の部屋・別のタイミングで
// 読み込むと誰の棚とも一致しなくなり、事実上誰にも見えなくなる。保存した本人のぶんだけは
// myBackyardTokenIdsとしてIDを別に記録しておき、読み込み側（state-import.js）で
// 読み込んだ利用者の棚へ付け替える。
// 画像はサーバーに頼んでデータURLとして埋め込んでもらう（サーバー側のhandleExportRoom）。
// ブラウザからR2の画像を読むことはできないため（公開ドメインがCORSヘッダを返さない）、
// ここで埋め込みを自前でやることはできない。
// 埋め込めればファイルだけで画像を復元できるので、「部屋を保存し削除」で書き出したデータからも
// 画像が戻る。サーバーに繋がらない・R2が無い場合は、今までどおり手元の状態から書き出す
// （書き出せなくなるくらいなら、画像がURL参照のままでも書き出せた方がよい）。
async function exportStateToFile() {
  const myBackyardTokenIds = listMyBackyardTokens(store.state).map(token => token.id);
  const roomId = new URLSearchParams(location.search).get('room') || '';

  let exportedState = { ...store.state, myBackyardTokenIds };
  if (roomId) {
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...entryPasswordHeaders() },
        body: JSON.stringify({ myBackyardTokenIds })
      });
      if (response.ok) {
        const result = await response.json();
        exportedState = result.state;
        if (result.skipped > 0) {
          alert(`画像${result.skipped}件はファイルに埋め込めませんでした（実体が見つからないか、合計サイズの上限を超えています）。`
            + '\nこのぶんは、部屋を削除すると復元できなくなります。');
        }
      } else {
        console.warn('[export] 画像を埋め込めませんでした。手元の状態から書き出します:', response.status);
      }
    } catch (error) {
      console.warn('[export] 画像の埋め込みに失敗しました。手元の状態から書き出します:', error.message);
    }
  }

  const json = JSON.stringify(exportedState, null, 2);
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

// 全タブのログの消去。取り消せない操作なので、必ず確認ダイアログを挟む。
// 見えないタブのぶんも含めて全部消えるため、消去自体はGM限定にしてある。
function openLogClearDialog() {
  showLogClearConfirmDialog({
    onConfirm: () => store.dispatch('CLEAR_ALL_CHAT_LOGS')
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
      state = parseUntrustedJson(await file.text());
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
// 確認ダイアログ（いいえ／はい／部屋を保存し削除）を挟む。実際の削除は、要求を受けた
// サーバーが全員を退室させながらその場で行う（net-sync.jsのrequestRoomDeletion参照）。
if (deleteRoomBtn) {
  deleteRoomBtn.addEventListener('click', () => {
    if (!canOperateAsGm()) return;
    roomSettingsDialog?.close();
    showRoomDeleteConfirmDialog({
      onDelete: () => requestRoomDeletion(),
      onSaveAndDelete: async () => {
        // 書き出しが終わるまで削除を待つこと。削除はR2上のファイルをフォルダごと消すので、
        // 待たずに走らせると、画像を埋め込んでいる最中に実体が消えて中身の無いデータになる。
        await exportStateToFile();
        requestRoomDeletion();
      }
    });
  });
}

// ダイス処理イベント
// onSentは送信が成立したときに呼ぶ（入力欄のクリア）。どの入力欄から送られたかは
// 呼び出し元しか知らないため、ここで特定の欄を直接触らない
// （以前はメイン欄を直接クリアしており、パレットから送るとメイン欄まで消えていた）。
EventBus.subscribe('DICE_ROLL_REQUESTED', async ({ system, rawInput, characterName, characterId, characterColor, tabId = activeTabId, onSent, onPlainChat }) => {
  if (!sendBtn) return;
  sendBtn.disabled = true;
  sendBtn.textContent = "送信中...";

  try {
    if (rawInput.includes('\n')) {
      applyLog({ system, character: characterName, characterId, color: characterColor, resultText: rawInput }, tabId);
      onPlainChat?.();
      onSent?.();
      return;
    }

    const [command, comment = ""] = splitForSpace(rawInput);
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
      onPlainChat?.();
      onSent?.();
      return;
    }

    // choiceは選択肢を空白で区切って渡す書き方（choice 赤 青 緑）があり、BCDiceは
    // 半角スペースしか区切りと見なさない。ここへ渡す分だけ全角スペースを半角へそろえる。
    const toCommand = isStartsChoice ? `${command} ${comment.replaceAll("\u3000", " ")}` : command;

    const { success, unsupported, resultText, diceValues } = await rollBCDice(system, toCommand);
    if (!success) {
      if (unsupported) {
        // 正規表現上はダイスコマンドに見えても、BCDice側がそのシステムの構文として
        // 認識できなかった場合（例: "aaaa"）。通信エラーではないので、アラートは
        // 出さずに入力をそのまま平文の発言としてチャットへ送る。
        applyLog({ system, character: characterName, characterId, color: characterColor, resultText: rawInput }, tabId);
        onPlainChat?.();
        onSent?.();
        return;
      }
      throw new Error(resultText);
    }

    const diceDetail = diceValues && diceValues.length > 0 ?
      diceValues.map(d => d.value).join(', ') : "";

    // 3Dダイスを転がす合図。状態を変えないアクションなので、部屋の全員へ届くだけで
    // ログにも部屋のJSONにも残らない（js/game-store.jsのROLL_DICE_ANIMATION）。
    // Mainタブ以外を演出しない判定は受け取り側（js/dice-animation.js）が行う。
    if (diceValues?.length) {
      store.dispatch('ROLL_DICE_ANIMATION', { tabId, dice: diceValues.slice(0, MAX_ANIMATED_DICE) });
    }

    // 判定を1回行ったとみなして、このコマの「判定終了で消滅」バフを剥がす。
    // ロールに乗ってから消えるよう、rollBCDiceの後に置いている（{パラメータ名}の実効値置換は
    // このイベントが発火する前に済んでいるので、ここで消しても値には影響しない）。
    // ダイスコマンドでない発言・BCDiceが構文を認識できなかった入力は、上のreturnで
    // ここへ来ないため対象にならない。
    // 消滅の通知は独立したシステム発言にせず、このロールのログ本文へ併記する
    // （別行にするとロールのたびにログが2行進み、結果がすぐ流れてしまうため）。
    let expiredNote = '';
    if (characterId) {
      const expiring = listExpiringBuffNames(store.state.tokens[characterId], 'check');
      expiredNote = formatExpiredBuffsNote(expiring, 'check');
      store.dispatch('EXPIRE_BUFFS', { phase: 'check', tokenId: characterId });
    }

    applyLog({
      system, character: characterName, characterId, color: characterColor, comment,
      resultText: `${resultText}${expiredNote}`, diceDetail
    }, tabId);
    onSent?.();

  } catch (error) {
    console.error(error);
    alert(`エラーが発生しました: ${error.message}`);
  } finally {
    // 振っている間にヘルプを開かれていたら、封じたままにする
    // （素直にfalseへ戻すと、ヘルプ表示中なのに送信できてしまう）
    sendBtn.disabled = helpOpen;
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

// この値をログに実数で残してよいか。
// visible:false（キャラクター一覧に出していない）と、公開先を絞ったパラメータが対象。
// ログは1本の文字列を全員へ配る作りなので、相手ごとの出し分けはできない。伏せると決めたら
// 公開先の人にも伏せた形で届く（キャラクター一覧や更新画面では従来どおり見える）。
function shouldMaskParameterValue(param) {
  return param.visible === false || isRestricted(param.audience);
}

// 指定された全パラメータへ同じamount（数値 or ダイス結果）を、それぞれの演算子で適用し、
// 1件のログにまとめて記録する。diceDetailは通常のチャットロールと同じ形の出目内訳文字列
// （js/main.js:777付近のDICE_ROLL_REQUESTEDハンドラと同じ作り方）で、ダイスでない場合は空。
function applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId }) {
  const changeLines = targets.map(({ operator, paramId, param, before }) => {
    const after = operator === '=' ? amount : operator === '+' ? before + amount : before - amount;
    store.dispatch('SET_PARAMETER', { characterId: character.id, paramId, value: after });
    // 「何が動いたか」は伝えたいのでラベルは出し、前後の値だけを伏せる。
    return shouldMaskParameterValue(param)
      ? `${param.label}: ${HIDDEN_VALUE_MASK} → ${HIDDEN_VALUE_MASK}`
      : `${param.label}: ${before} → ${after}`;
  });

  applyLog({
    character: character.name,
    characterId: character.id,
    color: character.textColor,
    command,
    diceDetail,
    resultText: diceResultText
      ? `${changeLines.join('\n')}\n${diceResultText}`
      : changeLines.join('\n')
  }, tabId);
}

function tryHandleParameterCommand(rawInput, character, tabId = activeTabId) {
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
    rollBCDice(store.state.room.bcdiceSystem, rawAmount).then(({ success, resultText, diceValues }) => {
      if (!success) {
        alert(`ダイスロールに失敗しました: ${resultText}`);
        return;
      }
      const amount = parseFinalDiceNumber(resultText);
      if (amount === null) {
        alert(`ダイス結果の解釈に失敗しました: ${resultText}`);
        return;
      }

      // 通常のチャットロール（js/main.js:783付近）と同じ形で3Dダイス演出を出す。
      // tabIdはBCDice呼び出し前（await前）に確定させた値を使う。応答待ちの間に
      // ユーザーが別タブへ切り替えても、演出とログはコマンド送信時点のタブに出す。
      if (diceValues?.length) {
        store.dispatch('ROLL_DICE_ANIMATION', { tabId, dice: diceValues.slice(0, MAX_ANIMATED_DICE) });
      }
      const diceDetail = diceValues && diceValues.length > 0 ?
        diceValues.map(d => d.value).join(', ') : "";

      applyParameterChanges({
        character, targets: resolvedTargets, amount, diceResultText: resultText, diceDetail, command: rawInput, tabId
      });
    }).catch(error => {
      alert(`ダイスロールでエラーが発生しました: ${error.message}`);
    });
    return true;
  }

  applyParameterChanges({
    character, targets: resolvedTargets, amount: Number(rawAmount), command: rawInput, tabId
  });

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
//
// 5番目の引数は、適用中プラグイン固有の追加指定（省略可）。Coreは意味を解釈せず、
// プラグインへ渡してbuff.metaへ変換させる（parsePluginBuffExtra）。
// 例: DX3で バフ(コンセントレイト,AcB,-1,シーン,7) と書くとクリティカル値の下限7が付く。
// パラメータ名はラベルに（）を含むもの（「クリティカル修正(AcB)」等）があるため、
// この位置ではキー名（AcB）で指定する。
const BUFF_COMMAND_PATTERN =
  /^バフ(?:>([^(]+))?\(([^,]+),([^,]+),([+-]?\d+(?:\.\d+)?|[+-]?\d+[Dd]\d+),([^,)]+)(?:,([^,)]+))?\)$/;

// 増減値がダイス式（符号つきも可。符号はBCDiceへ渡さず、結果に後から適用する）かどうかの判定。
const BUFF_DELTA_DICE_PATTERN = /^([+-]?)(\d+[Dd]\d+)$/;

const BUFF_PHASE_TEXT_TO_KEY = {
  'シーン': 'scene', 'シーン終了': 'scene',
  'ラウンド': 'round', 'ラウンド終了': 'round',
  'シナリオ': 'scenario', 'シナリオ終了': 'scenario',
  '判定': 'check', '判定終了': 'check',
  'プロセス': 'process', 'プロセス終了': 'process',
  '手動': null, '手動のみ': null
};

function tryHandleBuffCommand(rawInput, character, tabId = activeTabId) {
  const match = rawInput.match(BUFF_COMMAND_PATTERN);
  if (!match) return false;

  const [, rawTargetName, rawName, rawParamName, rawDelta, rawPhase, rawExtra] = match;
  const name = rawName.trim();
  const paramName = rawParamName.trim();
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

  // 追加指定はプラグインの知識でmetaへ変換する（未適用・解釈できない値ならnull＝無視）
  const activePluginId = store.state.room?.activePlugin ?? null;
  const meta = rawExtra !== undefined
    ? parsePluginBuffExtra(activePluginId, paramId, rawExtra.trim())
    : null;

  // ADD_BUFFのdispatchとログ追記は、素の数値・ダイスのどちらの経路でも同じ形で行う。
  // diceResultText/diceDetailはダイス経路のときだけ渡される（省略時は従来どおりの本文）。
  const finishBuffCommand = (delta, diceResultText = '', diceDetail = '') => {
    store.dispatch('ADD_BUFF', {
      tokenId: targetCharacter.id,
      id: generateBuffId(),
      name,
      paramId,
      delta,
      expirePhase,
      meta
    });

    const expireLabel = expirePhase ? `${BUFF_PHASE_LABELS[expirePhase]}終了で消滅` : '手動のみ';
    const targetLabel = entry ? entry[1].label : `${paramName}（対象なし）`;
    const metaText = describePluginBuffMeta(activePluginId, { meta });
    const summary = `バフ/デバフ付与: ${name}　${targetLabel}${delta >= 0 ? '+' : ''}${delta}　（${expireLabel}）${metaText}`;
    applyLog({
      character: targetCharacter.name,
      characterId: targetCharacter.id,
      color: targetCharacter.textColor,
      command: rawInput,
      diceDetail,
      resultText: diceResultText ? `${summary}\n${diceResultText}` : summary
    }, tabId);
  };

  const diceMatch = rawDelta.match(BUFF_DELTA_DICE_PATTERN);
  if (diceMatch) {
    const [, sign, diceExpr] = diceMatch;
    // ステータス変更コマンド（tryHandleParameterCommand）と同様、BCDiceへは符号なしの
    // ダイス式だけを渡し、符号（増減の向き）はこちら側でロール結果に適用する。
    // ダイスロールはBCDice APIへの非同期通信を伴うため、他のプラグインコマンドと同様に
    // 結果を待たずtrueを返し、完了時にバフ付与・ログ追記を行う。
    rollBCDice(store.state.room.bcdiceSystem, diceExpr).then(({ success, resultText, diceValues }) => {
      if (!success) {
        alert(`ダイスロールに失敗しました: ${resultText}`);
        return;
      }
      const rolled = parseFinalDiceNumber(resultText);
      if (rolled === null) {
        alert(`ダイス結果の解釈に失敗しました: ${resultText}`);
        return;
      }
      const delta = sign === '-' ? -rolled : rolled;

      // 通常のチャットロール（js/main.js:783付近）と同じ形で3Dダイス演出を出す。
      // tabIdはBCDice呼び出し前（await前）に確定させた値を使う（ステータス変更コマンドと同様）。
      if (diceValues?.length) {
        store.dispatch('ROLL_DICE_ANIMATION', { tabId, dice: diceValues.slice(0, MAX_ANIMATED_DICE) });
      }
      const diceDetail = diceValues && diceValues.length > 0 ?
        diceValues.map(d => d.value).join(', ') : "";

      finishBuffCommand(delta, resultText, diceDetail);
    }).catch(error => {
      alert(`ダイスロールでエラーが発生しました: ${error.message}`);
    });
    return true;
  }

  finishBuffCommand(Number(rawDelta));
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

// スタンプ(拍手) のように打つ。盤面の右上に一定時間だけ出して消える合図で、
// チャットログにも状態にも残さない（js/stamp-layer.js）。
// このコマンドだけはapplyLogを通さないのが肝で、通すとログに残ってしまい仕様と食い違う。
const STAMP_COMMAND_PATTERN = /^スタンプ\((.+)\)$/;

function tryHandleStampCommand(rawInput) {
  const match = rawInput.trim().match(STAMP_COMMAND_PATTERN);
  if (!match) return false;

  // 書式が合った時点で必ずtrueを返す。falseで抜けるとBCDiceへの判定として流れてしまう。
  // 使えるスタンプは適用中のプラグインで変わる（js/stamp-registry.js）。
  const activePluginId = store.state.room?.activePlugin ?? null;
  const stamp = findStampByName(match[1], activePluginId);
  if (!stamp) {
    alert(`スタンプ「${match[1].trim()}」は登録されていません。\n\n使えるスタンプ: ${listStampLabels(activePluginId).join('／')}`);
    return true;
  }

  // スタンプには送り主の名前が出るので、名乗っていない人は送れない（サーバー側も弾く）。
  // 黙って消えると「打ったのに何も起きない」になるため、ここで理由を出す。
  if (!getCurrentParticipantId()) {
    alert('スタンプを送るには、先に参加者設定で名前を決めてください。');
    return true;
  }

  requestStamp(stamp.id);
  return true;
}

function tryHandleAudioStopCommand(rawInput) {
  if (rawInput.trim() !== AUDIO_STOP_COMMAND) return false;

  // 停止はボタンと同じくGM限定（サーバー側もSTOP_AUDIO_PLAYBACKを弾く）。ここで止めないと、
  // 画面上は止まったように見えて他の参加者には鳴り続ける、という食い違いになる。
  if (!canOperateAsGm()) {
    applyLog({
      system: '音楽',
      command: AUDIO_STOP_COMMAND,
      resultText: '♪ 再生中の音楽を止められるのはGMだけです'
        + '（自分にだけ聞こえないようにするには、音楽ダイアログの「ミュート」をお使いください）'
    });
    return true;
  }

  const tracks = store.state.room.audioTracks || {};
  const playback = store.state.room.audioPlayback || {};

  const stopped = AUDIO_CHANNELS
    .filter(channel => playback[channel])
    .map(channel => {
      const name = tracks[playback[channel].trackId]?.name || '不明な音源';
      store.dispatch('STOP_AUDIO_PLAYBACK', { channel });
      return `${AUDIO_CHANNEL_LABELS[channel] || channel}: ${name}`;
    });

  // 何も鳴っていなかった場合も無反応にはしない（コマンドが効いたことは伝える）
  applyLog({
    system: '音楽',
    command: AUDIO_STOP_COMMAND,
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
  // BGMの曲名はストア側がシステムタブへ残す（game-store.jsのwithBgmLog）ので、ここでは書かない。
  // 効果音は台詞に添えて鳴らすものなので、従来どおり発言と同じタブへその場で出す。
  if (track.channel === 'bgm') return;

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
      rollBCDice,
      // 部屋が持つ値（Coreの「現在のラウンド」、プラグインのブーケ合計）。コマ1体では
      // 決まらない値をコマンドの中で読めるようにするために渡す（ステラナイツの
      // 個数を書かないcharge）。Coreは中身を解釈せず、そのまま渡すだけ。
      roomParameters: store.state.room?.parameters ?? {},
      // コマンドを打った人の参加者ID（表示名未設定ならnull）。公開先(audience)を持つ
      // データをコマンドから扱うプラグイン（シノビガミの奥義）が、
      // 「その人に見えているか」を判断するために使う。
      myParticipantId: getCurrentParticipantId()
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

  // dice.* はどれか1つのプラグインのものではない（ダイスドラフトを使うシステム共通の操作）ので、
  // findPluginForChatCommandには載せられない。ここまで来たということは、この部屋のシステムが
  // ドラフトを使っていない＝実行のしようが無い。素通りしてただの発言になる前に理由を伝える。
  if (looksLikeDiceDraftPoolCommand(rawInput)) {
    alert('dice.change / dice.add は、ダイスドラフトを使うシステムの部屋でだけ使えます。');
    return true;
  }

  // item.* も同じ（アイテムを持つシステム共通の操作）。
  if (looksLikeItemCommand(rawInput)) {
    alert('item.use / item.gain は、アイテムを使うシステムの部屋でだけ使えます。');
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
      command: rawInput,
      resultText: entryText !== undefined
        ? `${table.title}(${table.dice}) ＞ ${rolled} ＞ ${entryText}`
        : `${resultText}\n（表「${table.title}」に出目${rolled}に対応する結果がありません）`
    }, tabId);
  }).catch(error => {
    alert(`ダイスロールでエラーが発生しました: ${error.message}`);
  });

  return true;
}

// チャット送信の共通処理。メインのチャット入力欄・チャットパレットの行クリック・
// パレットのチャット入力欄の3経路がすべてここを通る（経路ごとに書くと、コマンドの
// 解釈順序がズレて「片方でしか効かないコマンド」が生まれるため）。
//
// characterはコマ（token）で、{パラメータ名}置換とバフ/パラメータ/プラグインコマンドの
// 対象になる。characterNameはログに出す発言者名で、characterが無くても名前だけで
// 発言できる（チャットパレットのタブ名がどのコマ名とも一致しない場合、その名前の
// NPC・ナレーションとして発言するため）。
// onSentは送信が成立したときに呼ばれる。入力欄のクリアは経路ごとに違うので、
// ここでは行わず呼び出し元に委ねる。
function submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent }) {
  const text = String(rawInput).trim();
  if (text === '') return;

  if (tryHandlePhaseEndCommand(text)) { onSent?.(); return; }
  if (tryHandleAudioStopCommand(text)) { onSent?.(); return; }
  // スタンプは{}参照の解決もダイスへのフォールバックも要らないので、置換より手前で捌く
  if (tryHandleStampCommand(text)) { onSent?.(); return; }

  // {}参照を先に解決してからコマンド判定を行う。参照先の変数が「+HP(10)」等の
  // コマンド文字列を持っていた場合、置換結果の文頭がコマンドとして発動するようにするため。
  const substituted = substituteCharacterParameters(text, character);

  if (tryHandleBuffCommand(substituted, character, tabId)) { onSent?.(); return; }
  if (tryHandleParameterCommand(substituted, character, tabId)) { onSent?.(); return; }
  if (tryHandlePluginChatCommand(substituted, character)) { onSent?.(); return; }
  if (tryHandleOriginalTableCommand(substituted, character, tabId)) { onSent?.(); return; }

  // ここまでコマンドとして解釈されなかった＝発言（ダイスロールを含む）なので、
  // 末尾が音源の再生フレーズと一致していれば鳴らす（発言自体はそのまま流す）。
  triggerAudioPhrase(substituted);

  EventBus.emit('DICE_ROLL_REQUESTED', {
    system: store.state.room.bcdiceSystem,
    rawInput: substituted,
    characterName: characterName ?? character?.name,
    characterId: character?.id,
    characterColor: character?.textColor,
    tabId,
    onSent,
    // ここまでのtryHandle*のどれにも該当しなかった時点ではまだ「素の発言」と決まらない。
    // BCDiceへ実際に判定として送られた場合（成功・失敗を問わず）は発言ではなく判定なので
    // 送信音を鳴らさない。その区別はBCDiceのcommand_patternの取得を要する非同期処理で、
    // ここでは決定できないため、DICE_ROLL_REQUESTEDハンドラ側でBCDiceへ送らずそのまま
    // 発言になったと分かった箇所（複数行入力／ダイスコマンドに見えない入力）でだけ
    // このコールバックを呼んでもらう。
    onPlainChat: requestChatSendSound
  });
}

// チャットパレットの行・パレット内チャット欄からの送信。発言者はパレットのタブ名で決まる
// （コマ名と完全一致すればそのコマとして、しなければその名前の発言として送る）。
function submitFromPalette({ text, name, onSent }) {
  const trimmedName = (name || '').trim();
  // 同名のコマが複数あることは想定していないが、あった場合は先頭を採る
  const character = trimmedName
    ? Object.values(store.state.tokens).find(t => t.name === trimmedName) ?? null
    : null;

  submitChatText({
    rawInput: text,
    character,
    characterName: trimmedName || undefined,
    onSent
  });
}

// チャットパレットは移動・拡縮できる浮動パネルとして出す。表示/非表示は
// パネルの×と、盤外の右クリックメニュー（js/board-data-driven.js）から切り替える。
const chatPalettePanel = createFloatingPanel({
  title: 'チャットパレット',
  storageKey: 'chatPalettePanelRect',
  defaultRect: { x: 24, y: 120, w: 320, h: 440 }
});

const chatPalette = renderChatPalette({
  container: chatPalettePanel.body,
  findTokenByName: (name) => Object.values(store.state.tokens).find(t => t.name === name) ?? null,
  onSend: ({ text, name, onSent }) => submitFromPalette({ text, name, onSent })
});

// コマの追加・改名・削除で「名前がコマと一致しているか」の表示が変わるため、
// 状態が変わるたびに判定し直す（パレット自体は部屋の状態を持たないので再描画は不要）。
EventBus.subscribe('STATE_CHANGED', () => chatPalette.refreshNameStatus());

// 盤外の右クリックメニューから表示/非表示を切り替えられるようにする
setChatPaletteController(chatPalettePanel);

if (sendBtn) {
  sendBtn.addEventListener('click', () => {
    const rawInput = commandInput.value.trim();

    if (rawInput === "") {
      alert("コマンドを入力してください！");
      return;
    }

    // メイン欄の発言者は参照キャラクター欄の選択で決まる（パレットのタブ名とは独立）
    const selectedCharacter = characterParamSelect?.value
      ? store.state.tokens[characterParamSelect.value]
      : null;

    submitChatText({
      rawInput,
      character: selectedCharacter,
      onSent: () => {
        commandInput.value = "";
        hideCommandInputSuggestions();
        // value代入は'input'イベントを発火しないため、記入中の解除はここで明示的に行う
        updateTypingIndicatorState();
      }
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

// チャット欄の予測変換：入力中の文字列を含むフレーズを、選択中の参照キャラクターと
// 同名のチャットパレットタブから拾って候補表示する（送信はしない。クリックで全置換のみ）。
// パレット側のnameInput→findTokenByNameと同じ規則（保存されたタブ名をtrimして比べる）に揃える。
const MAX_COMMAND_INPUT_SUGGESTIONS = 8;

function hideCommandInputSuggestions() {
  if (!commandInputSuggestions) return;
  commandInputSuggestions.innerHTML = '';
  commandInputSuggestions.style.display = 'none';
}

function updateCommandInputSuggestions() {
  if (!commandInputSuggestions || !commandInput) return;

  const inputValue = commandInput.value;
  const tokenId = characterParamSelect?.value;
  const tokenName = tokenId ? store.state.tokens[tokenId]?.name : null;

  if (!tokenName || inputValue === '') {
    hideCommandInputSuggestions();
    return;
  }

  const needle = inputValue.toLowerCase();
  const phrases = [];
  loadChatPaletteState().tabs
    .filter(tab => tab.name.trim() === tokenName)
    .forEach(tab => {
      parseChatPaletteLines(tab.text).forEach(line => {
        // 見出し（「//」始まり）はフレーズではないので候補にしない。
        // パレット側で押せなくしているのと同じ規則をここでも通す。
        if (isChatPaletteHeading(line)) return;
        if (line.toLowerCase().includes(needle)) phrases.push(line);
      });
    });

  if (phrases.length === 0) {
    hideCommandInputSuggestions();
    return;
  }

  commandInputSuggestions.innerHTML = '';
  phrases.slice(0, MAX_COMMAND_INPUT_SUGGESTIONS).forEach(phrase => {
    const row = document.createElement('div');
    row.className = 'chat-palette-line';
    row.textContent = phrase; // フレーズはユーザー入力なのでtextContentで描画する（innerHTML禁止）
    row.addEventListener('click', () => {
      commandInput.value = phrase; // 全置換（追記はしない）
      hideCommandInputSuggestions();
      commandInput.focus();
    });
    commandInputSuggestions.appendChild(row);
  });
  commandInputSuggestions.style.display = '';
}

// メイン入力欄の記入中通知（T-013）。空⇔非空に変わった瞬間だけサーバーへ送る（打鍵毎ではない）。
// チャットパレット付随の入力欄（js/chat-palette.jsが動的に作る.chat-palette-send-input）は
// このcommandInputの'input'イベントを通らないため、ここでは対象にならない（受入条件どおり）。
let commandInputHasText = false;

function updateTypingIndicatorState() {
  if (!commandInput) return;
  const hasText = commandInput.value.trim() !== '';
  if (hasText === commandInputHasText) return;
  commandInputHasText = hasText;
  if (hasText) sendTypingStart(); else sendTypingStop();
}

// 記入中はサーバー側の揮発情報（接続ごと）なので、再接続すると失われる。書きかけのまま
// 繋がり直した場合は、繋がり直した直後に自分の記入中を送り直す。
EventBus.subscribe('NET_INITIALIZED', () => {
  if (commandInputHasText) sendTypingStart();
});

// 他の参加者の記入中一覧（チャット欄右下、T-013）。一覧そのものはサーバーが権威を持って
// 配ってくる（T-011の教訓どおり、クライアントごとに計算し直さない）。自分自身を除く処理だけ
// ここで行う（「他ユーザの」記入中表示なので）。
EventBus.subscribe('TYPING_USERS_CHANGED', (users) => {
  if (!typingIndicatorEl) return;
  const myId = getCurrentParticipantId();
  const others = (users || []).filter((u) => u.id !== myId);

  if (others.length === 0) {
    typingIndicatorEl.hidden = true;
    typingIndicatorEl.textContent = '';
    return;
  }
  typingIndicatorEl.hidden = false;
  typingIndicatorEl.textContent = `${others.map((u) => u.name).join('、')} が入力中...`;
});

if (commandInput) {
  // 予測変換候補の更新（既存）と記入中通知（T-013）は、どちらもcommandInputの同じ'input'
  // イベントに相乗りさせる（新しいイベントの仕組みを増やさない）。
  commandInput.addEventListener('input', () => {
    updateCommandInputSuggestions();
    updateTypingIndicatorState();
  });
  commandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideCommandInputSuggestions();
  });
}

if (characterParamSelect) {
  characterParamSelect.addEventListener('change', updateCommandInputSuggestions);
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
    const pluginId = roomPluginSelect.value || null;
    store.dispatch('SET_ACTIVE_PLUGIN', { pluginId });

    // そのシステムがBCDice側のシステムを宣言していれば、ダイスコマンドの解釈規則も
    // 合わせて切り替える（「システムを選んだのにダイスが別システムのまま」を避ける）。
    // 宣言していないプラグイン・プラグインなしの場合は今の設定のままにする。
    // SET_BCDICE_SYSTEMもGM限定アクションだが、既に上のcanOperateAsGm()の内側なので
    // 追加の権限判定は要らない。
    const bcdiceSystem = getPluginBcdiceSystem(pluginId);
    if (bcdiceSystem && bcdiceSystem !== store.state.room.bcdiceSystem) {
      store.dispatch('SET_BCDICE_SYSTEM', { system: bcdiceSystem });
    }
  });
}

// ラウンド進行の設定（イニシアチブプロセスを挟むか）。ルーム単位・全員共通なので
// プラグイン選択と同じく、操作はdispatch・表示は状態への追従で揃える。
if (roundInitiativeProcessCheck) {
  roundInitiativeProcessCheck.addEventListener('change', () => {
    // 表示が古い状態で操作された場合の保険（無効化はapplyGmOnlyControls側で行っている）
    if (!canOperateAsGm()) {
      roundInitiativeProcessCheck.checked = usesInitiativeProcess(store.state);
      return;
    }
    store.dispatch('SET_ROUND_SETTINGS', { useInitiativeProcess: roundInitiativeProcessCheck.checked });
  });

  EventBus.subscribe('STATE_CHANGED', (state) => {
    const next = usesInitiativeProcess(state);
    if (roundInitiativeProcessCheck.checked !== next) roundInitiativeProcessCheck.checked = next;
  });
}

// 入室メッセージの表示設定。ルーム単位・全員共通なので、上のイニシアチブ設定と
// 同じく操作はdispatch・表示は状態への追従で揃える。
if (showEntryMessagesCheck) {
  showEntryMessagesCheck.addEventListener('change', () => {
    // 表示が古い状態で操作された場合の保険（無効化はapplyGmOnlyControls側で行っている）
    if (!canOperateAsGm()) {
      showEntryMessagesCheck.checked = showsEntryMessages(store.state);
      return;
    }
    store.dispatch('SET_SHOW_ENTRY_MESSAGES', { enabled: showEntryMessagesCheck.checked });
  });

  EventBus.subscribe('STATE_CHANGED', (state) => {
    const next = showsEntryMessages(state);
    if (showEntryMessagesCheck.checked !== next) showEntryMessagesCheck.checked = next;
  });
}

// マス目への吸着。オフにすると盤面のオブジェクトを離した位置に置けるようになり、
// マス目の線も描かれなくなる（js/board-data-driven.jsが状態を読んで両方を決める）。
// 上の2つと同じく、操作はdispatch・表示は状態への追従で揃える。
if (gridSnapCheck) {
  gridSnapCheck.addEventListener('change', () => {
    // 表示が古い状態で操作された場合の保険（無効化はapplyGmOnlyControls側で行っている）
    if (!canOperateAsGm()) {
      gridSnapCheck.checked = snapsToGrid(store.state);
      return;
    }
    store.dispatch('SET_GRID_SNAP', { enabled: gridSnapCheck.checked });
  });

  EventBus.subscribe('STATE_CHANGED', (state) => {
    const next = snapsToGrid(state);
    if (gridSnapCheck.checked !== next) gridSnapCheck.checked = next;
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

// 入室パスワードの変更・解除（GM限定）。パスワードは同期される状態には載らないので、
// アクションではなくHTTPでサーバーへ直接頼む（server/index.jsのhandleSetEntryPassword）。
// 現在の値は平文で残っていないため表示できず、常に「新しい値で上書き」の形になる。
if (entryPasswordBtn && entryPasswordInput) {
  entryPasswordBtn.addEventListener('click', async () => {
    const password = entryPasswordInput.value.trim();
    const roomId = currentRoomId();

    entryPasswordBtn.disabled = true;
    if (entryPasswordNote) entryPasswordNote.textContent = '変更中…';

    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/entry-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...entryPasswordHeaders(roomId),
          ...(getCurrentParticipantId() && getCurrentAuthToken()
            ? { 'X-Participant-Id': getCurrentParticipantId(), 'X-Auth-Token': getCurrentAuthToken() }
            : {})
        },
        body: JSON.stringify({ password })
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (entryPasswordNote) entryPasswordNote.textContent = body.error || '変更できませんでした。';
        return;
      }

      // 自分は入室したままなので、このブラウザが覚えている値も更新しておく
      // （更新しないと、次に繋ぎ直したときに自分だけ入れなくなる）。
      setStoredEntryPassword(roomId, password);
      entryPasswordInput.value = '';
      if (entryPasswordNote) {
        entryPasswordNote.textContent = body.locked
          ? '入室パスワードを変更しました。次に入る人から新しいパスワードが必要です。'
          : '入室パスワードを解除しました。誰でも入れる部屋になります。';
      }
    } catch (error) {
      if (entryPasswordNote) entryPasswordNote.textContent = `通信エラー: ${error.message}`;
    } finally {
      entryPasswordBtn.disabled = false;
      applyGmOnlyControls();
    }
  });
}

// 部屋名：他クライアントでの変更（同期）にも追従させ、ヘッダーの表示にも反映する
EventBus.subscribe('STATE_CHANGED', (state) => {
  const nextValue = state.room.name || '';
  if (roomNameInput && document.activeElement !== roomNameInput && roomNameInput.value !== nextValue) {
    roomNameInput.value = nextValue;
  }
  // ヘッダーの見出しそのものが部屋名。
  // 名前がまだ空の部屋で見出しが消えてしまわないよう、そのときだけアプリ名（＋ロゴ）に戻す
  if (roomTitle) {
    if (nextValue) {
      roomTitle.textContent = nextValue;
    } else if (roomTitleLogo) {
      roomTitle.replaceChildren(roomTitleLogo, document.createTextNode('もじゅらX'));
    } else {
      roomTitle.textContent = 'もじゅらX';
    }
  }
});

// 名乗る人が変わると、見えるチャットタブが変わる（状態自体は変わらないため
// STATE_CHANGEDでは拾えない）
EventBus.subscribe('IDENTITY_CHANGED', () => {
  renderChatTabs(store.state);
  ensureActiveTabVisible(store.state);
});

// ダイスコマンドとコメントの切り分け。「1D10 命中判定」の空白から後ろがコメント。
// 日本語入力のまま打つと全角スペースになりやすいので、全角スペースでも区切れるようにする。
// 区切るのは最初の空白1つだけで、コメント側はそのまま残す（コメントの中の空白は
// 打った人が書いたとおりに表示したい）。
function splitForSpace(string) {
  const trimmed = string.trim();
  // \u3000は全角スペース。半角と見分けが付かないので、文字そのままではなくエスケープで書く。
  const separatorIndex = trimmed.search(/[ \u3000]/);
  if (separatorIndex < 0) return [trimmed];

  return [trimmed.slice(0, separatorIndex), trimmed.slice(separatorIndex + 1).trim()];
}

// hideSystem: カレントチャット欄など、システム名（[Cthulhu7th]等）の表示が不要な場所ではtrueにする。
// color: 発言キャラクターの文字色設定（未設定なら既定の緑）。キャラ名にのみ適用し、
// 発言テキスト自体は常に既定色（白）のまま変えない。
// command: 実行されたコマンドそのもの。結果だけでは何を打った結果なのか分からないため、
// 本文の1行目に小さく添える（ダイスロールはBCDiceの結果自体がコマンドを含むので指定しない）。
//
// ここへ来る値は、発言本文もキャラ名もコメントも色も、すべて部屋にいる誰かが決めたもの。
// 組み立てたHTMLはinnerHTMLで挿入され、しかもチャットログは部屋データとして保存されて
// 後から入った人の画面でも再生されるため、素のまま埋めると一度の書き込みでその部屋を
// 開いた全員にマークアップを流し込めてしまう。全部エスケープしてから埋める
// （書き出し側のjs/log-export.jsは元からそうしていた。表示側もこれで揃う）。
// 色はエスケープでは守れない文脈（style属性の中）なので、形そのもので絞る。
function buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null, time, editedAt = null }, { hideSystem = false, hideTime = false } = {}) {
  const detail = diceDetail ? `<small style="color: #888;">出目内訳: [${escapeHtml(diceDetail)}]</small>` : "";
  const systemTag = (!hideSystem && system) ? `<strong style="color: #007acc;">[${escapeHtml(system)}]</strong>` : '';
  const nameColor = safeCssColor(color, '#4caf50');
  const characterTag = character ? `<span style="color: ${nameColor};">${escapeHtml(character)}</span>` : '';
  const commentTag = comment ? `<span style="color: #aaa;">(${escapeHtml(comment)})</span>` : '';
  // 改行だけは<br>として通す（発言の見た目に必要）。それ以外はマークアップにしない。
  const resultHtml = escapeHtml(resultText).replace(/\n/g, '<br>');
  // コマンドは利用者の入力そのままなので、記号がマークアップとして解釈されないようにする
  // （+HP(1)<2 のような入力で以降の行が消えてしまうため）。
  const commandHtml = command
    ? `<small class="log-command-text" style="color: #888;">（${escapeHtml(command)}）</small><br>`
    : '';

  // ヘッダー（システム名・キャラ名・コメント）は存在する要素だけを半角スペースで連結する。
  // 全て空の場合（カレントチャット欄のキャラなし発言など）は行ごと省き、余計な空行を出さない。
  // タイムスタンプはヘッダー行の末尾（システム名・キャラ名・コメントの後）に置く。
  // hideTime: カレントチャット欄など、時刻の表示が不要な場所ではtrueにする（hideSystemと同じ流儀）。
  const timestamp = (!hideTime && typeof time === 'number' && isFinite(time)) ? `<span class="log-time" style="color: #888;">${new Date(time).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>` : '';
  // 後から本文が書き換えられたことは隠さない（js/game-store.jsのEDIT_CHAT_MESSAGE）。
  // 時刻とは別の情報なので、時刻を出さないカレントチャット欄でもこの印だけは出す。
  const editedMark = editedAt ? '<small class="log-edited" style="color: #888;">(編集済み)</small>' : '';
  const headerLine = [systemTag, characterTag, commentTag, timestamp, editedMark].filter(Boolean).join(' ');
  const headerHtml = headerLine ? `${headerLine}<br>` : '';

  return `
    ${headerHtml}
    ${commandHtml}
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
  // 盤面が自前でズームを持っているので、ブラウザのページズームとは競合させない
  initNoBrowserZoom();

  initNetSync();
  initRoundPanel();
  initStampLayer();
  const infoPanel = initInfoPanel();
  const characterPanel = initCharacterPanel();
  const stampPanel = initStampPanel();
  const diceDraftPanel = initDiceDraftPanel();

  // ダイスドラフトはチャット欄の参照キャラクターのコマを扱う。選ぶ場所を2つに増やすと、
  // 「charge()を撃ったコマ」と「パネルに出ているコマ」が食い違うので、こちらを追従させる。
  if (characterParamSelect) {
    diceDraftPanel.setCharacter(characterParamSelect.value || null);
    characterParamSelect.addEventListener('change', () => {
      diceDraftPanel.setCharacter(characterParamSelect.value || null);
    });
  }

  // 狭幅（スマホ）では浮かせる場所が無いので、盤面と浮動パネル5枚を
  // 中央スペースのタブに切り替える。PC幅では何も起きない。
  // キャラ・情報・スタンプ・ダイスは1枚のタブに束ねる（groupが同じもの同士）。タブは375px幅で
  // 1枚70px弱しか取れず、6枚並べると文字が読めなくなるため。打鍵中に行き来する
  // パレットだけは、束ねずに1タップで開けるところへ残す。
  initMobileLayout({
    panels: [
      { id: 'palette', label: 'パレット', panel: chatPalettePanel },
      { id: 'characters', label: 'キャラ', group: 'panels', panel: characterPanel },
      { id: 'info', label: '情報', group: 'panels', panel: infoPanel },
      { id: 'stamps', label: 'スタンプ', group: 'panels', panel: stampPanel },
      { id: 'diceDraft', label: 'ダイス', group: 'panels', panel: diceDraftPanel }
    ]
  });

  initAudioPlayer();
  initDiceAnimation();
  store.init();
});

// 盤面のURLを直接開いた人・共有されたURLから来た人にもSWを行き渡らせる。
// 「アプリとして追加」のボタンを出すのは部屋一覧だけ（js/room-index.js）。
registerServiceWorker();