---
source: js/main.js
lines: 2210
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-17
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
| 104 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 109 | renderChatTabs | `renderChatTabs(state)` | 36 |  |
| 146 | addChatTab | `addChatTab()` | 11 |  |
| 165 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 19 |  |
| 186 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 191 | switchChatTab | `switchChatTab(tabId)` | 7 |  |
| 217 | setChatInputLocked | `setChatInputLocked(locked)` | 8 |  |
| 226 | openHelp | `openHelp()` | 9 |  |
| 236 | closeHelp | `closeHelp()` | 7 |  |
| 259 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 12 |  |
| 276 | patchEditedLogEntries | `patchEditedLogEntries(container, entries)` | 10 |  |
| 287 | renderActiveTabLog | `renderActiveTabLog(state)` | 34 |  |
| 322 | renderMainChatMirror | `renderMainChatMirror(state)` | 36 |  |
| 377 | findLogEntryById | `findLogEntryById(entryId)` | 3 |  |
| 381 | openLogEntryMenu | `openLogEntryMenu(clientX, clientY, entry)` | 15 |  |
| 398 | editableEntryFromEvent | `editableEntryFromEvent(event)` | 6 |  |
| 416 | initLogEntryMenu | `initLogEntryMenu(container)` | 53 |  |
| 508 | applyGmOnlyControls | `applyGmOnlyControls()` | 12 |  |
| 528 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 550 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 567 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 585 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 604 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 633 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 651 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 692 | currentRoomId | `currentRoomId()` | 3 |  |
| 698 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 718 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 840 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 866 | exportStateToFile | `async exportStateToFile()` | 32 |  |
| 901 | openLogExportDialog | `openLogExportDialog()` | 19 |  |
| 923 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1085 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 1125 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1135 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 1147 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1154 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 1176 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1290 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1403 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1420 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 23 |  |
| 1444 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1485 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 13 |  |
| 1503 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 33 |  |
| 1541 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1580 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 1622 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 1700 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 1706 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 41 |  |
| 1753 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 1830 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 1938 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 1946 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 1995 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 1999 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 2016 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2111 | splitForSpace | `splitForSpace(string)` | 3 |  |
| 2127 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null, time, editedAt = null }, { hideSystem = false, hideTime = false } = {})` | 31 |  |
| 2162 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.character-panel]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.dice-animation]], [[js.dice-draft-panel]], [[js.dice-notation]], [[js.floating-panel]], [[js.game-store]], [[js.help.help-panel]], [[js.html-escape]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.registry]], [[js.pwa]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
