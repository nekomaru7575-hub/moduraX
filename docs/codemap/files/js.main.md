---
source: js/main.js
lines: 2380
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
| 117 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 122 | renderChatTabs | `renderChatTabs(state)` | 37 |  |
| 164 | addChatTab | `addChatTab()` | 11 |  |
| 183 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 20 |  |
| 205 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 210 | switchChatTab | `switchChatTab(tabId)` | 8 |  |
| 237 | setChatInputLocked | `setChatInputLocked(locked, reason = '')` | 8 |  |
| 250 | syncChatInputLock | `syncChatInputLock()` | 9 |  |
| 260 | openHelp | `openHelp()` | 9 |  |
| 270 | closeHelp | `closeHelp()` | 7 |  |
| 293 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 12 |  |
| 310 | patchEditedLogEntries | `patchEditedLogEntries(container, entries)` | 10 |  |
| 321 | renderActiveTabLog | `renderActiveTabLog(state)` | 34 |  |
| 356 | renderMainChatMirror | `renderMainChatMirror(state)` | 36 |  |
| 411 | findLogEntryById | `findLogEntryById(entryId)` | 3 |  |
| 415 | openLogEntryMenu | `openLogEntryMenu(clientX, clientY, entry)` | 15 |  |
| 432 | editableEntryFromEvent | `editableEntryFromEvent(event)` | 6 |  |
| 450 | initLogEntryMenu | `initLogEntryMenu(container)` | 53 |  |
| 542 | applyGmOnlyControls | `applyGmOnlyControls()` | 12 |  |
| 562 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 584 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 601 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 619 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 638 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 667 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 685 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 726 | currentRoomId | `currentRoomId()` | 3 |  |
| 732 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 752 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 796 | placeDeckOnBoard | `placeDeckOnBoard(name, back, cards)` | 6 |  |
| 805 | builtInAsTemplate | `builtInAsTemplate(builtIn)` | 14 |  |
| 820 | openDeckEditor | `openDeckEditor(template = null)` | 13 |  |
| 835 | importDeckFromFile | `async importDeckFromFile()` | 27 |  |
| 863 | openDeckListDialog | `openDeckListDialog()` | 46 |  |
| 998 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 1024 | exportStateToFile | `async exportStateToFile()` | 32 |  |
| 1059 | openLogExportDialog | `openLogExportDialog()` | 19 |  |
| 1081 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1243 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 1283 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1293 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 1305 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1312 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 1334 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1448 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1561 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1578 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 23 |  |
| 1602 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1643 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 17 |  |
| 1665 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 41 |  |
| 1711 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1750 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 1792 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 1870 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 1876 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 41 |  |
| 1923 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 2000 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 2108 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 2116 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 2165 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 2169 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 2186 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2281 | splitForSpace | `splitForSpace(string)` | 3 |  |
| 2297 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null, time, editedAt = null }, { hideSystem = false, hideTime = false } = {})` | 31 |  |
| 2332 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.card-catalog]], [[js.character-panel]], [[js.character-snapshot]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.deck-editor-dialog]], [[js.deck-file]], [[js.deck-list-dialog]], [[js.dice-animation]], [[js.dice-draft-panel]], [[js.dice-notation]], [[js.file-uploader]], [[js.floating-panel]], [[js.game-store]], [[js.help.help-panel]], [[js.html-escape]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.registry]], [[js.pwa]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
