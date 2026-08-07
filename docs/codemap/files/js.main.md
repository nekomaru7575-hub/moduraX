---
source: js/main.js
lines: 1715
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
| 284 | applyGmOnlyControls | `applyGmOnlyControls()` | 12 |
| 304 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |
| 326 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |
| 343 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |
| 361 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |
| 380 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |
| 409 | openSceneListDialog | `openSceneListDialog()` | 15 |
| 427 | openAudioDialog | `openAudioDialog()` | 33 |
| 468 | currentRoomId | `currentRoomId()` | 3 |
| 474 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |
| 494 | openIdentityDialog | `openIdentityDialog()` | 17 |
| 609 | downloadBlob | `downloadBlob(blob, filename)` | 10 |
| 623 | exportStateToFile | `exportStateToFile()` | 6 |
| 632 | openLogExportDialog | `openLogExportDialog()` | 19 |
| 654 | openLogClearDialog | `openLogClearDialog()` | 5 |
| 809 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |
| 849 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |
| 859 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |
| 871 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |
| 877 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, command })` | 1 |
| 898 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character)` | 72 |
| 999 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character)` | 61 |
| 1072 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |
| 1084 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |
| 1125 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 13 |
| 1143 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 25 |
| 1173 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |
| 1212 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 1 |
| 1245 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 1 |
| 1318 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |
| 1324 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 41 |
| 1407 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |
| 1486 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |
| 1494 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |
| 1543 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |
| 1547 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |
| 1564 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |
| 1659 | splitForSpace | `splitForSpace(string)` | 3 |
| 1663 | escapeHtml | `escapeHtml(text)` | 6 |
| 1675 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null }, { hideSystem = false } = {})` | 1 |
| 1702 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.character-panel]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.dice-animation]], [[js.dice-notation]], [[js.floating-panel]], [[js.game-store]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.net-sync]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.registry]], [[js.resizable-stack]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
34 ファイルを import しており、変更の影響が読みにくい。触る前に対象の機能がどのモジュールに属するかを疑い、main.js に足す前に既存モジュール側に置けないかを検討する。
<!-- /prose:notes -->
