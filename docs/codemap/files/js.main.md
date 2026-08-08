---
source: js/main.js
lines: 1876
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-08
tags: [codemap]
---

# js/main.js

<!-- prose:summary -->
_(未記入)_
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（0）

なし（エントリポイント、または副作用のみのモジュール）。

## トップレベル関数（LOCAL TASKS 候補）（51）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 91 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 96 | renderChatTabs | `renderChatTabs(state)` | 30 |  |
| 127 | addChatTab | `addChatTab()` | 11 |  |
| 146 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 19 |  |
| 167 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 172 | switchChatTab | `switchChatTab(tabId)` | 6 |  |
| 181 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 11 |  |
| 193 | renderActiveTabLog | `renderActiveTabLog(state)` | 30 |  |
| 224 | renderMainChatMirror | `renderMainChatMirror(state)` | 29 |  |
| 303 | applyGmOnlyControls | `applyGmOnlyControls()` | 12 |  |
| 323 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 345 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 362 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 380 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 399 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 428 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 446 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 487 | currentRoomId | `currentRoomId()` | 3 |  |
| 493 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 513 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 628 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 648 | exportStateToFile | `exportStateToFile()` | 10 |  |
| 661 | openLogExportDialog | `openLogExportDialog()` | 19 |  |
| 683 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 841 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 881 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 891 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 903 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 910 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 932 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1046 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1159 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1171 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1212 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 13 |  |
| 1230 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 25 |  |
| 1260 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1299 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 37 |  |
| 1339 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 1417 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 1423 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 41 |  |
| 1470 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 1547 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 1644 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 1652 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 1701 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 1705 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 1722 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 1817 | splitForSpace | `splitForSpace(string)` | 3 |  |
| 1821 | escapeHtml | `escapeHtml(text)` | 6 |  |
| 1833 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null, time }, { hideSystem = false, hideTime = false } = {})` | 26 |  |
| 1863 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.character-panel]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.dice-animation]], [[js.dice-notation]], [[js.floating-panel]], [[js.game-store]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.net-sync]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.registry]], [[js.resizable-stack]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
