---
source: js/main.js
lines: 1746
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-07
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

## トップレベル関数・非export（50）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 89 | visibleChatTabs | `visibleChatTabs(state)` | 4 |
| 94 | renderChatTabs | `renderChatTabs(state)` | 30 |
| 125 | addChatTab | `addChatTab()` | 11 |
| 137 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 12 |
| 151 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |
| 156 | switchChatTab | `switchChatTab(tabId)` | 6 |
| 165 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 1 |
| 177 | renderActiveTabLog | `renderActiveTabLog(state)` | 30 |
| 208 | renderMainChatMirror | `renderMainChatMirror(state)` | 29 |
| 287 | applyGmOnlyControls | `applyGmOnlyControls()` | 12 |
| 307 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |
| 329 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |
| 346 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |
| 364 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |
| 383 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |
| 412 | openSceneListDialog | `openSceneListDialog()` | 15 |
| 430 | openAudioDialog | `openAudioDialog()` | 33 |
| 471 | currentRoomId | `currentRoomId()` | 3 |
| 477 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |
| 497 | openIdentityDialog | `openIdentityDialog()` | 17 |
| 612 | downloadBlob | `downloadBlob(blob, filename)` | 10 |
| 626 | exportStateToFile | `exportStateToFile()` | 6 |
| 635 | openLogExportDialog | `openLogExportDialog()` | 19 |
| 657 | openLogClearDialog | `openLogClearDialog()` | 5 |
| 815 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |
| 855 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |
| 865 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |
| 877 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |
| 883 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, command })` | 1 |
| 904 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character)` | 72 |
| 1005 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character)` | 61 |
| 1078 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |
| 1090 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |
| 1131 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 13 |
| 1149 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 25 |
| 1179 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |
| 1218 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 1 |
| 1258 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 1 |
| 1331 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |
| 1337 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 41 |
| 1420 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |
| 1517 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |
| 1525 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |
| 1574 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |
| 1578 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |
| 1595 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |
| 1690 | splitForSpace | `splitForSpace(string)` | 3 |
| 1694 | escapeHtml | `escapeHtml(text)` | 6 |
| 1706 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null }, { hideSystem = false } = {})` | 1 |
| 1733 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.character-panel]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.dice-animation]], [[js.dice-notation]], [[js.floating-panel]], [[js.game-store]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.net-sync]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.registry]], [[js.resizable-stack]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
