---
source: js/main.js
lines: 2779
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-09-09
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

## トップレベル関数（LOCAL TASKS 候補）（76）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 141 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 146 | renderChatTabs | `renderChatTabs(state)` | 61 |  |
| 212 | addChatTab | `addChatTab()` | 11 |  |
| 231 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 20 |  |
| 253 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 258 | switchChatTab | `switchChatTab(tabId)` | 9 |  |
| 286 | setChatInputLocked | `setChatInputLocked(locked, reason = '')` | 8 |  |
| 299 | syncChatInputLock | `syncChatInputLock()` | 9 |  |
| 309 | openHelp | `openHelp()` | 9 |  |
| 319 | closeHelp | `closeHelp()` | 7 |  |
| 341 | displayedLogEntry | `displayedLogEntry(entry)` | 3 |  |
| 349 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 13 |  |
| 367 | patchEditedLogEntries | `patchEditedLogEntries(container, entries)` | 12 |  |
| 380 | renderActiveTabLog | `renderActiveTabLog(state)` | 34 |  |
| 415 | renderMainChatMirror | `renderMainChatMirror(state)` | 37 |  |
| 454 | updateTabBadge | `updateTabBadge(tabId)` | 4 |  |
| 463 | updateUnreadTabs | `updateUnreadTabs(state)` | 13 |  |
| 504 | findLogEntryById | `findLogEntryById(entryId)` | 3 |  |
| 508 | openLogEntryMenu | `openLogEntryMenu(clientX, clientY, entry)` | 35 |  |
| 545 | editableEntryFromEvent | `editableEntryFromEvent(event)` | 6 |  |
| 563 | initLogEntryMenu | `initLogEntryMenu(container)` | 53 |  |
| 662 | applyGmOnlyControls | `applyGmOnlyControls()` | 13 |  |
| 683 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 705 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 722 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 736 | openRoomStampEditor | `openRoomStampEditor(stamp = null)` | 16 |  |
| 754 | openRoomStampListDialog | `openRoomStampListDialog()` | 17 |  |
| 778 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 797 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 826 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 844 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 885 | currentRoomId | `currentRoomId()` | 3 |  |
| 891 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 911 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 955 | placeDeckOnBoard | `placeDeckOnBoard(name, back, cards)` | 6 |  |
| 964 | builtInAsTemplate | `builtInAsTemplate(builtIn)` | 14 |  |
| 979 | openDeckEditor | `openDeckEditor(template = null)` | 13 |  |
| 994 | importDeckFromFile | `async importDeckFromFile()` | 27 |  |
| 1022 | openDeckListDialog | `openDeckListDialog()` | 46 |  |
| 1190 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 1224 | exportStateToFile | `async exportStateToFile()` | 48 |  |
| 1274 | downloadStateJson | `downloadStateJson(exportedState)` | 6 |  |
| 1283 | openLogExportDialog | `openLogExportDialog()` | 21 |  |
| 1307 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1494 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 1534 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1544 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 1556 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1563 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 1585 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1699 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1812 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1829 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 22 |  |
| 1852 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1893 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 17 |  |
| 1917 | findTokenByName | `findTokenByName(name)` | 3 |  |
| 1921 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 51 |  |
| 1977 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 2016 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 2058 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 2097 | selectedChatCharacter | `selectedChatCharacter()` | 3 |  |
| 2146 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 2152 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 44 |  |
| 2202 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 2248 | describeTypingUsers | `describeTypingUsers(others)` | 5 |  |
| 2300 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 2427 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 2435 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 2484 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 2488 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 2505 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2619 | splitForSpace | `splitForSpace(string)` | 8 |  |
| 2641 | splitRepeatPrefix | `splitRepeatPrefix(string)` | 7 |  |
| 2663 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", time, editedAt = null, secret = false, revealed = false }, { hideSystem = false, hideTime = false } = {})` | 36 |  |
| 2706 | applyLogNameColor | `applyLogNameColor(item, color)` | 6 |  |
| 2716 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.asset-base]], [[js.asset-store]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.card-catalog]], [[js.character-panel]], [[js.character-snapshot]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.deck-editor-dialog]], [[js.deck-file]], [[js.deck-list-dialog]], [[js.dice-animation]], [[js.dice-draft-panel]], [[js.dice-notation]], [[js.file-uploader]], [[js.floating-panel]], [[js.game-store]], [[js.help.help-panel]], [[js.html-escape]], [[js.icons]], [[js.identity-dialog]], [[js.image-selector-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.net-transport]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.registry]], [[js.parameters.skill.item-use]], [[js.pwa]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.room-stamp-dialog]], [[js.room-stamp-list-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.sound-config]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.store.images]], [[js.store.stamps]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
