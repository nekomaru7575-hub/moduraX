---
source: js/main.js
lines: 2676
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-09-01
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
| 133 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 138 | renderChatTabs | `renderChatTabs(state)` | 61 |  |
| 204 | addChatTab | `addChatTab()` | 11 |  |
| 223 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 20 |  |
| 245 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 250 | switchChatTab | `switchChatTab(tabId)` | 9 |  |
| 278 | setChatInputLocked | `setChatInputLocked(locked, reason = '')` | 8 |  |
| 291 | syncChatInputLock | `syncChatInputLock()` | 9 |  |
| 301 | openHelp | `openHelp()` | 9 |  |
| 311 | closeHelp | `closeHelp()` | 7 |  |
| 333 | displayedLogEntry | `displayedLogEntry(entry)` | 3 |  |
| 341 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 13 |  |
| 359 | patchEditedLogEntries | `patchEditedLogEntries(container, entries)` | 12 |  |
| 372 | renderActiveTabLog | `renderActiveTabLog(state)` | 34 |  |
| 407 | renderMainChatMirror | `renderMainChatMirror(state)` | 37 |  |
| 446 | updateTabBadge | `updateTabBadge(tabId)` | 4 |  |
| 455 | updateUnreadTabs | `updateUnreadTabs(state)` | 13 |  |
| 496 | findLogEntryById | `findLogEntryById(entryId)` | 3 |  |
| 500 | openLogEntryMenu | `openLogEntryMenu(clientX, clientY, entry)` | 35 |  |
| 537 | editableEntryFromEvent | `editableEntryFromEvent(event)` | 6 |  |
| 555 | initLogEntryMenu | `initLogEntryMenu(container)` | 53 |  |
| 654 | applyGmOnlyControls | `applyGmOnlyControls()` | 13 |  |
| 675 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 697 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 714 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 732 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 751 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 780 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 798 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 839 | currentRoomId | `currentRoomId()` | 3 |  |
| 845 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 865 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 909 | placeDeckOnBoard | `placeDeckOnBoard(name, back, cards)` | 6 |  |
| 918 | builtInAsTemplate | `builtInAsTemplate(builtIn)` | 14 |  |
| 933 | openDeckEditor | `openDeckEditor(template = null)` | 13 |  |
| 948 | importDeckFromFile | `async importDeckFromFile()` | 27 |  |
| 976 | openDeckListDialog | `openDeckListDialog()` | 46 |  |
| 1128 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 1154 | exportStateToFile | `async exportStateToFile()` | 32 |  |
| 1189 | openLogExportDialog | `openLogExportDialog()` | 21 |  |
| 1213 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1400 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 1440 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1450 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 1462 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1469 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 1491 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1605 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1718 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1735 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 23 |  |
| 1759 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1800 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 17 |  |
| 1824 | findTokenByName | `findTokenByName(name)` | 3 |  |
| 1828 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 51 |  |
| 1884 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1923 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 1965 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 2043 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 2049 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 44 |  |
| 2099 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 2145 | describeTypingUsers | `describeTypingUsers(others)` | 5 |  |
| 2197 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 2324 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 2332 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 2381 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 2385 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 2402 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2516 | splitForSpace | `splitForSpace(string)` | 8 |  |
| 2538 | splitRepeatPrefix | `splitRepeatPrefix(string)` | 7 |  |
| 2560 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", time, editedAt = null, secret = false, revealed = false }, { hideSystem = false, hideTime = false } = {})` | 36 |  |
| 2603 | applyLogNameColor | `applyLogNameColor(item, color)` | 6 |  |
| 2613 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.asset-base]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.card-catalog]], [[js.character-panel]], [[js.character-snapshot]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.deck-editor-dialog]], [[js.deck-file]], [[js.deck-list-dialog]], [[js.dice-animation]], [[js.dice-draft-panel]], [[js.dice-notation]], [[js.file-uploader]], [[js.floating-panel]], [[js.game-store]], [[js.help.help-panel]], [[js.html-escape]], [[js.icons]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.registry]], [[js.parameters.skill.item-use]], [[js.pwa]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
