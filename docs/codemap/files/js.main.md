---
source: js/main.js
lines: 2233
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-18
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

## トップレベル関数（LOCAL TASKS 候補）（60）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 105 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 110 | renderChatTabs | `renderChatTabs(state)` | 36 |  |
| 147 | addChatTab | `addChatTab()` | 11 |  |
| 166 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 19 |  |
| 187 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 192 | switchChatTab | `switchChatTab(tabId)` | 7 |  |
| 218 | setChatInputLocked | `setChatInputLocked(locked)` | 8 |  |
| 227 | openHelp | `openHelp()` | 9 |  |
| 237 | closeHelp | `closeHelp()` | 7 |  |
| 260 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 12 |  |
| 277 | patchEditedLogEntries | `patchEditedLogEntries(container, entries)` | 10 |  |
| 288 | renderActiveTabLog | `renderActiveTabLog(state)` | 34 |  |
| 323 | renderMainChatMirror | `renderMainChatMirror(state)` | 36 |  |
| 378 | findLogEntryById | `findLogEntryById(entryId)` | 3 |  |
| 382 | openLogEntryMenu | `openLogEntryMenu(clientX, clientY, entry)` | 15 |  |
| 399 | editableEntryFromEvent | `editableEntryFromEvent(event)` | 6 |  |
| 417 | initLogEntryMenu | `initLogEntryMenu(container)` | 53 |  |
| 509 | applyGmOnlyControls | `applyGmOnlyControls()` | 12 |  |
| 529 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 551 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 568 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 586 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 605 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 634 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 652 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 693 | currentRoomId | `currentRoomId()` | 3 |  |
| 699 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 719 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 760 | placeDeck | `placeDeck()` | 10 |  |
| 859 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 885 | exportStateToFile | `async exportStateToFile()` | 32 |  |
| 920 | openLogExportDialog | `openLogExportDialog()` | 19 |  |
| 942 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1104 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 1144 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1154 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 1166 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1173 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 1195 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1309 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1422 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1439 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 23 |  |
| 1463 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1504 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 13 |  |
| 1522 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 37 |  |
| 1564 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1603 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 1645 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 1723 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 1729 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 41 |  |
| 1776 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 1853 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 1961 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 1969 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 2018 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 2022 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 2039 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2134 | splitForSpace | `splitForSpace(string)` | 3 |  |
| 2150 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null, time, editedAt = null }, { hideSystem = false, hideTime = false } = {})` | 31 |  |
| 2185 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.character-panel]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.deck-dialog]], [[js.dice-animation]], [[js.dice-draft-panel]], [[js.dice-notation]], [[js.floating-panel]], [[js.game-store]], [[js.help.help-panel]], [[js.html-escape]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.registry]], [[js.pwa]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
