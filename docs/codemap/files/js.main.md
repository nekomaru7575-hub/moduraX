---
source: js/main.js
lines: 1734
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-07
tags: [codemap]
---

# js/main.js

<!-- prose:summary -->
ルーム画面（combined_layout.html）のエントリポイント。チャットと画面全体の配線を持つ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
チャット送信・コマンド解釈（ダイス、バフ、パラメータ変更、オリジナル表）・ヘッダーの各ボタン・ログ表示など、他のどのモジュールにも属さない配線が集まっている。export を持たず、他から import されることはない。盤面の操作は [[js.board-data-driven]]、状態は [[js.game-store]]、同期は [[js.net-sync]] に委ねる。
<!-- /prose:role -->

## export（0）

なし（エントリポイント、または副作用のみのモジュール）。

## トップレベル関数・非export（50）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 87 | visibleChatTabs | `visibleChatTabs(state)` | 4 |
| 92 | renderChatTabs | `renderChatTabs(state)` | 30 |
| 123 | addChatTab | `addChatTab()` | 11 |
| 135 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 12 |
| 149 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |
| 154 | switchChatTab | `switchChatTab(tabId)` | 6 |
| 163 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 1 |
| 175 | renderActiveTabLog | `renderActiveTabLog(state)` | 30 |
| 206 | renderMainChatMirror | `renderMainChatMirror(state)` | 29 |
| 285 | applyGmOnlyControls | `applyGmOnlyControls()` | 12 |
| 305 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |
| 327 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |
| 344 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |
| 362 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |
| 381 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |
| 410 | openSceneListDialog | `openSceneListDialog()` | 15 |
| 428 | openAudioDialog | `openAudioDialog()` | 33 |
| 469 | currentRoomId | `currentRoomId()` | 3 |
| 475 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |
| 495 | openIdentityDialog | `openIdentityDialog()` | 17 |
| 610 | downloadBlob | `downloadBlob(blob, filename)` | 10 |
| 624 | exportStateToFile | `exportStateToFile()` | 6 |
| 633 | openLogExportDialog | `openLogExportDialog()` | 19 |
| 655 | openLogClearDialog | `openLogClearDialog()` | 5 |
| 810 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |
| 850 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |
| 860 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |
| 872 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |
| 878 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, command })` | 1 |
| 899 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character)` | 72 |
| 1000 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character)` | 61 |
| 1073 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |
| 1085 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |
| 1126 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 13 |
| 1144 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 25 |
| 1174 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |
| 1213 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 1 |
| 1246 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 1 |
| 1319 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |
| 1325 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 41 |
| 1408 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |
| 1505 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |
| 1513 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |
| 1562 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |
| 1566 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |
| 1583 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |
| 1678 | splitForSpace | `splitForSpace(string)` | 3 |
| 1682 | escapeHtml | `escapeHtml(text)` | 6 |
| 1694 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null }, { hideSystem = false } = {})` | 1 |
| 1721 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.character-panel]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.dice-animation]], [[js.dice-notation]], [[js.floating-panel]], [[js.game-store]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.net-sync]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.registry]], [[js.resizable-stack]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
34 ファイルを import しており、変更の影響が読みにくい。触る前に対象の機能がどのモジュールに属するかを疑い、main.js に足す前に既存モジュール側に置けないかを検討する。
<!-- /prose:notes -->
