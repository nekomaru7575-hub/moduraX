---
source: js/main.js
lines: 2347
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

## トップレベル関数（LOCAL TASKS 候補）（64）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 113 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 118 | renderChatTabs | `renderChatTabs(state)` | 36 |  |
| 155 | addChatTab | `addChatTab()` | 11 |  |
| 174 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 19 |  |
| 195 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 200 | switchChatTab | `switchChatTab(tabId)` | 7 |  |
| 226 | setChatInputLocked | `setChatInputLocked(locked)` | 8 |  |
| 235 | openHelp | `openHelp()` | 9 |  |
| 245 | closeHelp | `closeHelp()` | 7 |  |
| 268 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 12 |  |
| 285 | patchEditedLogEntries | `patchEditedLogEntries(container, entries)` | 10 |  |
| 296 | renderActiveTabLog | `renderActiveTabLog(state)` | 34 |  |
| 331 | renderMainChatMirror | `renderMainChatMirror(state)` | 36 |  |
| 386 | findLogEntryById | `findLogEntryById(entryId)` | 3 |  |
| 390 | openLogEntryMenu | `openLogEntryMenu(clientX, clientY, entry)` | 15 |  |
| 407 | editableEntryFromEvent | `editableEntryFromEvent(event)` | 6 |  |
| 425 | initLogEntryMenu | `initLogEntryMenu(container)` | 53 |  |
| 517 | applyGmOnlyControls | `applyGmOnlyControls()` | 12 |  |
| 537 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 559 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 576 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 594 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 613 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 642 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 660 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 701 | currentRoomId | `currentRoomId()` | 3 |  |
| 707 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 727 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 771 | placeDeckOnBoard | `placeDeckOnBoard(name, back, cards)` | 6 |  |
| 780 | builtInAsTemplate | `builtInAsTemplate(builtIn)` | 14 |  |
| 795 | openDeckEditor | `openDeckEditor(template = null)` | 13 |  |
| 810 | importDeckFromFile | `async importDeckFromFile()` | 27 |  |
| 838 | openDeckListDialog | `openDeckListDialog()` | 46 |  |
| 973 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 999 | exportStateToFile | `async exportStateToFile()` | 32 |  |
| 1034 | openLogExportDialog | `openLogExportDialog()` | 19 |  |
| 1056 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1218 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 1258 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1268 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 1280 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1287 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 1309 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1423 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1536 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1553 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 23 |  |
| 1577 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1618 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 13 |  |
| 1636 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 37 |  |
| 1678 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1717 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 1759 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 1837 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 1843 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 41 |  |
| 1890 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 1967 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 2075 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 2083 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 2132 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 2136 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 2153 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2248 | splitForSpace | `splitForSpace(string)` | 3 |  |
| 2264 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null, time, editedAt = null }, { hideSystem = false, hideTime = false } = {})` | 31 |  |
| 2299 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.card-catalog]], [[js.character-panel]], [[js.character-snapshot]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.deck-editor-dialog]], [[js.deck-file]], [[js.deck-list-dialog]], [[js.dice-animation]], [[js.dice-draft-panel]], [[js.dice-notation]], [[js.file-uploader]], [[js.floating-panel]], [[js.game-store]], [[js.help.help-panel]], [[js.html-escape]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.registry]], [[js.pwa]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
