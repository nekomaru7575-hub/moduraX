---
source: js/main.js
lines: 2101
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-13
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

## トップレベル関数（LOCAL TASKS 候補）（56）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 101 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 106 | renderChatTabs | `renderChatTabs(state)` | 30 |  |
| 137 | addChatTab | `addChatTab()` | 11 |  |
| 156 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 19 |  |
| 177 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 182 | switchChatTab | `switchChatTab(tabId)` | 6 |  |
| 193 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 12 |  |
| 210 | patchEditedLogEntries | `patchEditedLogEntries(container, entries)` | 10 |  |
| 221 | renderActiveTabLog | `renderActiveTabLog(state)` | 34 |  |
| 256 | renderMainChatMirror | `renderMainChatMirror(state)` | 36 |  |
| 311 | findLogEntryById | `findLogEntryById(entryId)` | 3 |  |
| 315 | openLogEntryMenu | `openLogEntryMenu(clientX, clientY, entry)` | 15 |  |
| 332 | editableEntryFromEvent | `editableEntryFromEvent(event)` | 6 |  |
| 350 | initLogEntryMenu | `initLogEntryMenu(container)` | 53 |  |
| 442 | applyGmOnlyControls | `applyGmOnlyControls()` | 12 |  |
| 462 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 484 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 501 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 519 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 538 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 567 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 585 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 626 | currentRoomId | `currentRoomId()` | 3 |  |
| 632 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 652 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 767 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 793 | exportStateToFile | `async exportStateToFile()` | 32 |  |
| 828 | openLogExportDialog | `openLogExportDialog()` | 19 |  |
| 850 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1010 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 1050 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1060 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 1072 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1079 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 1101 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1215 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1328 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1345 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 23 |  |
| 1369 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1410 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 13 |  |
| 1428 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 25 |  |
| 1458 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1497 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 1539 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 1617 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 1623 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 41 |  |
| 1670 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 1747 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 1844 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 1852 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 1901 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 1905 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 1922 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2017 | splitForSpace | `splitForSpace(string)` | 3 |  |
| 2033 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null, time, editedAt = null }, { hideSystem = false, hideTime = false } = {})` | 31 |  |
| 2068 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.character-panel]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.dice-animation]], [[js.dice-notation]], [[js.floating-panel]], [[js.game-store]], [[js.html-escape]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.registry]], [[js.resizable-stack]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
