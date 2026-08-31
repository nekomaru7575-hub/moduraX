---
source: js/main.js
lines: 2671
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-31
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

## トップレベル関数（LOCAL TASKS 候補）（72）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 132 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 137 | renderChatTabs | `renderChatTabs(state)` | 61 |  |
| 203 | addChatTab | `addChatTab()` | 11 |  |
| 222 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 20 |  |
| 244 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 249 | switchChatTab | `switchChatTab(tabId)` | 9 |  |
| 277 | setChatInputLocked | `setChatInputLocked(locked, reason = '')` | 8 |  |
| 290 | syncChatInputLock | `syncChatInputLock()` | 9 |  |
| 300 | openHelp | `openHelp()` | 9 |  |
| 310 | closeHelp | `closeHelp()` | 7 |  |
| 332 | displayedLogEntry | `displayedLogEntry(entry)` | 3 |  |
| 340 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 13 |  |
| 358 | patchEditedLogEntries | `patchEditedLogEntries(container, entries)` | 12 |  |
| 371 | renderActiveTabLog | `renderActiveTabLog(state)` | 34 |  |
| 406 | renderMainChatMirror | `renderMainChatMirror(state)` | 37 |  |
| 445 | updateTabBadge | `updateTabBadge(tabId)` | 4 |  |
| 454 | updateUnreadTabs | `updateUnreadTabs(state)` | 13 |  |
| 495 | findLogEntryById | `findLogEntryById(entryId)` | 3 |  |
| 499 | openLogEntryMenu | `openLogEntryMenu(clientX, clientY, entry)` | 35 |  |
| 536 | editableEntryFromEvent | `editableEntryFromEvent(event)` | 6 |  |
| 554 | initLogEntryMenu | `initLogEntryMenu(container)` | 53 |  |
| 653 | applyGmOnlyControls | `applyGmOnlyControls()` | 13 |  |
| 674 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 696 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 713 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 731 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 750 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 779 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 797 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 838 | currentRoomId | `currentRoomId()` | 3 |  |
| 844 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 864 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 908 | placeDeckOnBoard | `placeDeckOnBoard(name, back, cards)` | 6 |  |
| 917 | builtInAsTemplate | `builtInAsTemplate(builtIn)` | 14 |  |
| 932 | openDeckEditor | `openDeckEditor(template = null)` | 13 |  |
| 947 | importDeckFromFile | `async importDeckFromFile()` | 27 |  |
| 975 | openDeckListDialog | `openDeckListDialog()` | 46 |  |
| 1127 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 1153 | exportStateToFile | `async exportStateToFile()` | 32 |  |
| 1188 | openLogExportDialog | `openLogExportDialog()` | 21 |  |
| 1212 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1399 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 1439 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1449 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 1461 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1468 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 1490 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1604 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1717 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1734 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 23 |  |
| 1758 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1799 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 17 |  |
| 1823 | findTokenByName | `findTokenByName(name)` | 3 |  |
| 1827 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 51 |  |
| 1883 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1922 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 1964 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 2042 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 2048 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 44 |  |
| 2098 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 2144 | describeTypingUsers | `describeTypingUsers(others)` | 5 |  |
| 2196 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 2323 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 2331 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 2380 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 2384 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 2401 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2515 | splitForSpace | `splitForSpace(string)` | 8 |  |
| 2537 | splitRepeatPrefix | `splitRepeatPrefix(string)` | 7 |  |
| 2559 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", time, editedAt = null, secret = false, revealed = false }, { hideSystem = false, hideTime = false } = {})` | 36 |  |
| 2602 | applyLogNameColor | `applyLogNameColor(item, color)` | 6 |  |
| 2612 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.asset-base]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.card-catalog]], [[js.character-panel]], [[js.character-snapshot]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.deck-editor-dialog]], [[js.deck-file]], [[js.deck-list-dialog]], [[js.dice-animation]], [[js.dice-draft-panel]], [[js.dice-notation]], [[js.file-uploader]], [[js.floating-panel]], [[js.game-store]], [[js.help.help-panel]], [[js.html-escape]], [[js.icons]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.registry]], [[js.parameters.skill.item-use]], [[js.pwa]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
