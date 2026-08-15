---
source: js/main.js
lines: 2189
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-14
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

## トップレベル関数（LOCAL TASKS 候補）（59）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 102 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 107 | renderChatTabs | `renderChatTabs(state)` | 36 |  |
| 144 | addChatTab | `addChatTab()` | 11 |  |
| 163 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 19 |  |
| 184 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 189 | switchChatTab | `switchChatTab(tabId)` | 7 |  |
| 215 | setChatInputLocked | `setChatInputLocked(locked)` | 8 |  |
| 224 | openHelp | `openHelp()` | 9 |  |
| 234 | closeHelp | `closeHelp()` | 7 |  |
| 257 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 12 |  |
| 274 | patchEditedLogEntries | `patchEditedLogEntries(container, entries)` | 10 |  |
| 285 | renderActiveTabLog | `renderActiveTabLog(state)` | 34 |  |
| 320 | renderMainChatMirror | `renderMainChatMirror(state)` | 36 |  |
| 375 | findLogEntryById | `findLogEntryById(entryId)` | 3 |  |
| 379 | openLogEntryMenu | `openLogEntryMenu(clientX, clientY, entry)` | 15 |  |
| 396 | editableEntryFromEvent | `editableEntryFromEvent(event)` | 6 |  |
| 414 | initLogEntryMenu | `initLogEntryMenu(container)` | 53 |  |
| 506 | applyGmOnlyControls | `applyGmOnlyControls()` | 12 |  |
| 526 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 548 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 565 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 583 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 602 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 631 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 649 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 690 | currentRoomId | `currentRoomId()` | 3 |  |
| 696 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 716 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 831 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 857 | exportStateToFile | `async exportStateToFile()` | 32 |  |
| 892 | openLogExportDialog | `openLogExportDialog()` | 19 |  |
| 914 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1076 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 1116 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1126 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 1138 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1145 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 1167 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1281 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1394 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1411 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 23 |  |
| 1435 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1476 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 13 |  |
| 1494 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 25 |  |
| 1524 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1563 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 1605 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 1683 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 1689 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 41 |  |
| 1736 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 1813 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 1921 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 1929 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 1978 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 1982 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 1999 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2094 | splitForSpace | `splitForSpace(string)` | 3 |  |
| 2110 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null, time, editedAt = null }, { hideSystem = false, hideTime = false } = {})` | 31 |  |
| 2145 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.character-panel]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.dice-animation]], [[js.dice-notation]], [[js.floating-panel]], [[js.game-store]], [[js.help.help-panel]], [[js.html-escape]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.registry]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
