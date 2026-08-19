---
source: js/main.js
lines: 2387
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-19
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
| 543 | applyGmOnlyControls | `applyGmOnlyControls()` | 12 |  |
| 563 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 585 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 602 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 620 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 639 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 668 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 686 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 727 | currentRoomId | `currentRoomId()` | 3 |  |
| 733 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 753 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 797 | placeDeckOnBoard | `placeDeckOnBoard(name, back, cards)` | 6 |  |
| 806 | builtInAsTemplate | `builtInAsTemplate(builtIn)` | 14 |  |
| 821 | openDeckEditor | `openDeckEditor(template = null)` | 13 |  |
| 836 | importDeckFromFile | `async importDeckFromFile()` | 27 |  |
| 864 | openDeckListDialog | `openDeckListDialog()` | 46 |  |
| 999 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 1025 | exportStateToFile | `async exportStateToFile()` | 32 |  |
| 1060 | openLogExportDialog | `openLogExportDialog()` | 19 |  |
| 1082 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1244 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 1284 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1294 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 1306 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1313 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 1335 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1449 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1562 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1579 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 23 |  |
| 1603 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1644 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 17 |  |
| 1666 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 47 |  |
| 1718 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1757 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 1799 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 1877 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 1883 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 41 |  |
| 1930 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 2007 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 2115 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 2123 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 2172 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 2176 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 2193 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2288 | splitForSpace | `splitForSpace(string)` | 3 |  |
| 2304 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null, time, editedAt = null }, { hideSystem = false, hideTime = false } = {})` | 31 |  |
| 2339 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.card-catalog]], [[js.character-panel]], [[js.character-snapshot]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.deck-editor-dialog]], [[js.deck-file]], [[js.deck-list-dialog]], [[js.dice-animation]], [[js.dice-draft-panel]], [[js.dice-notation]], [[js.file-uploader]], [[js.floating-panel]], [[js.game-store]], [[js.help.help-panel]], [[js.html-escape]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.registry]], [[js.parameters.skill.item-use]], [[js.pwa]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
