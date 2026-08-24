---
source: js/main.js
lines: 2503
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-24
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

## トップレベル関数（LOCAL TASKS 候補）（67）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 126 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 131 | renderChatTabs | `renderChatTabs(state)` | 57 |  |
| 193 | addChatTab | `addChatTab()` | 11 |  |
| 212 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 20 |  |
| 234 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 239 | switchChatTab | `switchChatTab(tabId)` | 9 |  |
| 267 | setChatInputLocked | `setChatInputLocked(locked, reason = '')` | 8 |  |
| 280 | syncChatInputLock | `syncChatInputLock()` | 9 |  |
| 290 | openHelp | `openHelp()` | 9 |  |
| 300 | closeHelp | `closeHelp()` | 7 |  |
| 323 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 12 |  |
| 340 | patchEditedLogEntries | `patchEditedLogEntries(container, entries)` | 10 |  |
| 351 | renderActiveTabLog | `renderActiveTabLog(state)` | 34 |  |
| 386 | renderMainChatMirror | `renderMainChatMirror(state)` | 36 |  |
| 424 | updateTabBadge | `updateTabBadge(tabId)` | 4 |  |
| 433 | updateUnreadTabs | `updateUnreadTabs(state)` | 13 |  |
| 474 | findLogEntryById | `findLogEntryById(entryId)` | 3 |  |
| 478 | openLogEntryMenu | `openLogEntryMenu(clientX, clientY, entry)` | 15 |  |
| 495 | editableEntryFromEvent | `editableEntryFromEvent(event)` | 6 |  |
| 513 | initLogEntryMenu | `initLogEntryMenu(container)` | 53 |  |
| 608 | applyGmOnlyControls | `applyGmOnlyControls()` | 13 |  |
| 629 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 651 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 668 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 686 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 705 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 734 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 752 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 793 | currentRoomId | `currentRoomId()` | 3 |  |
| 799 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 819 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 863 | placeDeckOnBoard | `placeDeckOnBoard(name, back, cards)` | 6 |  |
| 872 | builtInAsTemplate | `builtInAsTemplate(builtIn)` | 14 |  |
| 887 | openDeckEditor | `openDeckEditor(template = null)` | 13 |  |
| 902 | importDeckFromFile | `async importDeckFromFile()` | 27 |  |
| 930 | openDeckListDialog | `openDeckListDialog()` | 46 |  |
| 1082 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 1108 | exportStateToFile | `async exportStateToFile()` | 32 |  |
| 1143 | openLogExportDialog | `openLogExportDialog()` | 19 |  |
| 1165 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1327 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 1367 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1377 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 1389 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1396 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 1418 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1532 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1645 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1662 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 23 |  |
| 1686 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1727 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 17 |  |
| 1749 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 47 |  |
| 1801 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1840 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 1882 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 1960 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 1966 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 44 |  |
| 2016 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 2093 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 2220 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 2228 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 2277 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 2281 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 2298 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2399 | splitForSpace | `splitForSpace(string)` | 8 |  |
| 2420 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null, time, editedAt = null }, { hideSystem = false, hideTime = false } = {})` | 31 |  |
| 2455 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.card-catalog]], [[js.character-panel]], [[js.character-snapshot]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.deck-editor-dialog]], [[js.deck-file]], [[js.deck-list-dialog]], [[js.dice-animation]], [[js.dice-draft-panel]], [[js.dice-notation]], [[js.file-uploader]], [[js.floating-panel]], [[js.game-store]], [[js.help.help-panel]], [[js.html-escape]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.registry]], [[js.parameters.skill.item-use]], [[js.pwa]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
