---
source: js/main.js
lines: 2583
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-29
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

## トップレベル関数（LOCAL TASKS 候補）（70）

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
| 333 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 13 |  |
| 351 | patchEditedLogEntries | `patchEditedLogEntries(container, entries)` | 12 |  |
| 364 | renderActiveTabLog | `renderActiveTabLog(state)` | 34 |  |
| 399 | renderMainChatMirror | `renderMainChatMirror(state)` | 37 |  |
| 438 | updateTabBadge | `updateTabBadge(tabId)` | 4 |  |
| 447 | updateUnreadTabs | `updateUnreadTabs(state)` | 13 |  |
| 488 | findLogEntryById | `findLogEntryById(entryId)` | 3 |  |
| 492 | openLogEntryMenu | `openLogEntryMenu(clientX, clientY, entry)` | 15 |  |
| 509 | editableEntryFromEvent | `editableEntryFromEvent(event)` | 6 |  |
| 527 | initLogEntryMenu | `initLogEntryMenu(container)` | 53 |  |
| 626 | applyGmOnlyControls | `applyGmOnlyControls()` | 13 |  |
| 647 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 669 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 686 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 704 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 723 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 752 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 770 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 811 | currentRoomId | `currentRoomId()` | 3 |  |
| 817 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 837 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 881 | placeDeckOnBoard | `placeDeckOnBoard(name, back, cards)` | 6 |  |
| 890 | builtInAsTemplate | `builtInAsTemplate(builtIn)` | 14 |  |
| 905 | openDeckEditor | `openDeckEditor(template = null)` | 13 |  |
| 920 | importDeckFromFile | `async importDeckFromFile()` | 27 |  |
| 948 | openDeckListDialog | `openDeckListDialog()` | 46 |  |
| 1100 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 1126 | exportStateToFile | `async exportStateToFile()` | 32 |  |
| 1161 | openLogExportDialog | `openLogExportDialog()` | 19 |  |
| 1183 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1345 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 1385 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1395 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 1407 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1414 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 1436 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1550 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1663 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1680 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 23 |  |
| 1704 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1745 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 17 |  |
| 1769 | findTokenByName | `findTokenByName(name)` | 3 |  |
| 1773 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 51 |  |
| 1829 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1868 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 1910 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 1988 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 1994 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 44 |  |
| 2044 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 2090 | describeTypingUsers | `describeTypingUsers(others)` | 5 |  |
| 2142 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 2269 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 2277 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 2326 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 2330 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 2347 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2454 | splitForSpace | `splitForSpace(string)` | 8 |  |
| 2477 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", time, editedAt = null }, { hideSystem = false, hideTime = false } = {})` | 30 |  |
| 2514 | applyLogNameColor | `applyLogNameColor(item, color)` | 6 |  |
| 2524 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.asset-base]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.card-catalog]], [[js.character-panel]], [[js.character-snapshot]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.deck-editor-dialog]], [[js.deck-file]], [[js.deck-list-dialog]], [[js.dice-animation]], [[js.dice-draft-panel]], [[js.dice-notation]], [[js.file-uploader]], [[js.floating-panel]], [[js.game-store]], [[js.help.help-panel]], [[js.html-escape]], [[js.icons]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.registry]], [[js.parameters.skill.item-use]], [[js.pwa]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
