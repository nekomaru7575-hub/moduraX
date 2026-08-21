---
source: js/main.js
lines: 2413
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-21
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

## トップレベル関数（LOCAL TASKS 候補）（65）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 118 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 123 | renderChatTabs | `renderChatTabs(state)` | 37 |  |
| 165 | addChatTab | `addChatTab()` | 11 |  |
| 184 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 20 |  |
| 206 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 211 | switchChatTab | `switchChatTab(tabId)` | 8 |  |
| 238 | setChatInputLocked | `setChatInputLocked(locked, reason = '')` | 8 |  |
| 251 | syncChatInputLock | `syncChatInputLock()` | 9 |  |
| 261 | openHelp | `openHelp()` | 9 |  |
| 271 | closeHelp | `closeHelp()` | 7 |  |
| 294 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 12 |  |
| 311 | patchEditedLogEntries | `patchEditedLogEntries(container, entries)` | 10 |  |
| 322 | renderActiveTabLog | `renderActiveTabLog(state)` | 34 |  |
| 357 | renderMainChatMirror | `renderMainChatMirror(state)` | 36 |  |
| 412 | findLogEntryById | `findLogEntryById(entryId)` | 3 |  |
| 416 | openLogEntryMenu | `openLogEntryMenu(clientX, clientY, entry)` | 15 |  |
| 433 | editableEntryFromEvent | `editableEntryFromEvent(event)` | 6 |  |
| 451 | initLogEntryMenu | `initLogEntryMenu(container)` | 53 |  |
| 544 | applyGmOnlyControls | `applyGmOnlyControls()` | 13 |  |
| 565 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 587 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 604 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 622 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 641 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 670 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 688 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 729 | currentRoomId | `currentRoomId()` | 3 |  |
| 735 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 755 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 799 | placeDeckOnBoard | `placeDeckOnBoard(name, back, cards)` | 6 |  |
| 808 | builtInAsTemplate | `builtInAsTemplate(builtIn)` | 14 |  |
| 823 | openDeckEditor | `openDeckEditor(template = null)` | 13 |  |
| 838 | importDeckFromFile | `async importDeckFromFile()` | 27 |  |
| 866 | openDeckListDialog | `openDeckListDialog()` | 46 |  |
| 1001 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 1027 | exportStateToFile | `async exportStateToFile()` | 32 |  |
| 1062 | openLogExportDialog | `openLogExportDialog()` | 19 |  |
| 1084 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1246 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 1286 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1296 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 1308 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1315 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 1337 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1451 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1564 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1581 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 23 |  |
| 1605 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1646 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 17 |  |
| 1668 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 47 |  |
| 1720 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1759 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 1801 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 1879 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 1885 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 44 |  |
| 1935 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 2012 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 2139 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 2147 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 2196 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 2200 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 2217 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2314 | splitForSpace | `splitForSpace(string)` | 3 |  |
| 2330 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null, time, editedAt = null }, { hideSystem = false, hideTime = false } = {})` | 31 |  |
| 2365 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.card-catalog]], [[js.character-panel]], [[js.character-snapshot]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.deck-editor-dialog]], [[js.deck-file]], [[js.deck-list-dialog]], [[js.dice-animation]], [[js.dice-draft-panel]], [[js.dice-notation]], [[js.file-uploader]], [[js.floating-panel]], [[js.game-store]], [[js.help.help-panel]], [[js.html-escape]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.registry]], [[js.parameters.skill.item-use]], [[js.pwa]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
