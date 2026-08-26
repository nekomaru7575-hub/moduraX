---
source: js/main.js
lines: 2522
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-26
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
| 131 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 136 | renderChatTabs | `renderChatTabs(state)` | 61 |  |
| 202 | addChatTab | `addChatTab()` | 11 |  |
| 221 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 20 |  |
| 243 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 248 | switchChatTab | `switchChatTab(tabId)` | 9 |  |
| 276 | setChatInputLocked | `setChatInputLocked(locked, reason = '')` | 8 |  |
| 289 | syncChatInputLock | `syncChatInputLock()` | 9 |  |
| 299 | openHelp | `openHelp()` | 9 |  |
| 309 | closeHelp | `closeHelp()` | 7 |  |
| 332 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 12 |  |
| 349 | patchEditedLogEntries | `patchEditedLogEntries(container, entries)` | 10 |  |
| 360 | renderActiveTabLog | `renderActiveTabLog(state)` | 34 |  |
| 395 | renderMainChatMirror | `renderMainChatMirror(state)` | 36 |  |
| 433 | updateTabBadge | `updateTabBadge(tabId)` | 4 |  |
| 442 | updateUnreadTabs | `updateUnreadTabs(state)` | 13 |  |
| 483 | findLogEntryById | `findLogEntryById(entryId)` | 3 |  |
| 487 | openLogEntryMenu | `openLogEntryMenu(clientX, clientY, entry)` | 15 |  |
| 504 | editableEntryFromEvent | `editableEntryFromEvent(event)` | 6 |  |
| 522 | initLogEntryMenu | `initLogEntryMenu(container)` | 53 |  |
| 621 | applyGmOnlyControls | `applyGmOnlyControls()` | 13 |  |
| 642 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 664 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 681 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 699 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 718 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 747 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 765 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 806 | currentRoomId | `currentRoomId()` | 3 |  |
| 812 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 832 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 876 | placeDeckOnBoard | `placeDeckOnBoard(name, back, cards)` | 6 |  |
| 885 | builtInAsTemplate | `builtInAsTemplate(builtIn)` | 14 |  |
| 900 | openDeckEditor | `openDeckEditor(template = null)` | 13 |  |
| 915 | importDeckFromFile | `async importDeckFromFile()` | 27 |  |
| 943 | openDeckListDialog | `openDeckListDialog()` | 46 |  |
| 1095 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 1121 | exportStateToFile | `async exportStateToFile()` | 32 |  |
| 1156 | openLogExportDialog | `openLogExportDialog()` | 19 |  |
| 1178 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1340 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 1380 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1390 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 1402 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1409 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 1431 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1545 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1658 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1675 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 23 |  |
| 1699 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1740 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 17 |  |
| 1762 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 47 |  |
| 1814 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1853 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 1895 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 1973 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 1979 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 44 |  |
| 2029 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 2106 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 2233 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 2241 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 2290 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 2294 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 2311 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2418 | splitForSpace | `splitForSpace(string)` | 8 |  |
| 2439 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null, time, editedAt = null }, { hideSystem = false, hideTime = false } = {})` | 31 |  |
| 2474 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.card-catalog]], [[js.character-panel]], [[js.character-snapshot]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.deck-editor-dialog]], [[js.deck-file]], [[js.deck-list-dialog]], [[js.dice-animation]], [[js.dice-draft-panel]], [[js.dice-notation]], [[js.file-uploader]], [[js.floating-panel]], [[js.game-store]], [[js.help.help-panel]], [[js.html-escape]], [[js.icons]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.registry]], [[js.parameters.skill.item-use]], [[js.pwa]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
