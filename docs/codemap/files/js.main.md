---
source: js/main.js
lines: 2767
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
| 139 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 144 | renderChatTabs | `renderChatTabs(state)` | 61 |  |
| 210 | addChatTab | `addChatTab()` | 11 |  |
| 229 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 20 |  |
| 251 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 256 | switchChatTab | `switchChatTab(tabId)` | 9 |  |
| 284 | setChatInputLocked | `setChatInputLocked(locked, reason = '')` | 8 |  |
| 297 | syncChatInputLock | `syncChatInputLock()` | 9 |  |
| 307 | openHelp | `openHelp()` | 9 |  |
| 317 | closeHelp | `closeHelp()` | 7 |  |
| 339 | displayedLogEntry | `displayedLogEntry(entry)` | 3 |  |
| 347 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 13 |  |
| 365 | patchEditedLogEntries | `patchEditedLogEntries(container, entries)` | 12 |  |
| 378 | renderActiveTabLog | `renderActiveTabLog(state)` | 34 |  |
| 413 | renderMainChatMirror | `renderMainChatMirror(state)` | 37 |  |
| 452 | updateTabBadge | `updateTabBadge(tabId)` | 4 |  |
| 461 | updateUnreadTabs | `updateUnreadTabs(state)` | 13 |  |
| 502 | findLogEntryById | `findLogEntryById(entryId)` | 3 |  |
| 506 | openLogEntryMenu | `openLogEntryMenu(clientX, clientY, entry)` | 35 |  |
| 543 | editableEntryFromEvent | `editableEntryFromEvent(event)` | 6 |  |
| 561 | initLogEntryMenu | `initLogEntryMenu(container)` | 53 |  |
| 660 | applyGmOnlyControls | `applyGmOnlyControls()` | 13 |  |
| 681 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 703 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 720 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 734 | openRoomStampEditor | `openRoomStampEditor(stamp = null)` | 16 |  |
| 752 | openRoomStampListDialog | `openRoomStampListDialog()` | 17 |  |
| 776 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 795 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 824 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 842 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 883 | currentRoomId | `currentRoomId()` | 3 |  |
| 889 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 909 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 953 | placeDeckOnBoard | `placeDeckOnBoard(name, back, cards)` | 6 |  |
| 962 | builtInAsTemplate | `builtInAsTemplate(builtIn)` | 14 |  |
| 977 | openDeckEditor | `openDeckEditor(template = null)` | 13 |  |
| 992 | importDeckFromFile | `async importDeckFromFile()` | 27 |  |
| 1020 | openDeckListDialog | `openDeckListDialog()` | 46 |  |
| 1181 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 1212 | exportStateToFile | `async exportStateToFile()` | 48 |  |
| 1262 | downloadStateJson | `downloadStateJson(exportedState)` | 6 |  |
| 1271 | openLogExportDialog | `openLogExportDialog()` | 21 |  |
| 1295 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1482 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 1522 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1532 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 1544 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1551 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 1573 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1687 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1800 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1817 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 22 |  |
| 1840 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1881 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 17 |  |
| 1905 | findTokenByName | `findTokenByName(name)` | 3 |  |
| 1909 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 51 |  |
| 1965 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 2004 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 2046 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 2085 | selectedChatCharacter | `selectedChatCharacter()` | 3 |  |
| 2134 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 2140 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 44 |  |
| 2190 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 2236 | describeTypingUsers | `describeTypingUsers(others)` | 5 |  |
| 2288 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 2415 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 2423 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 2472 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 2476 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 2493 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2607 | splitForSpace | `splitForSpace(string)` | 8 |  |
| 2629 | splitRepeatPrefix | `splitRepeatPrefix(string)` | 7 |  |
| 2651 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", time, editedAt = null, secret = false, revealed = false }, { hideSystem = false, hideTime = false } = {})` | 36 |  |
| 2694 | applyLogNameColor | `applyLogNameColor(item, color)` | 6 |  |
| 2704 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.asset-base]], [[js.asset-store]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.card-catalog]], [[js.character-panel]], [[js.character-snapshot]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.deck-editor-dialog]], [[js.deck-file]], [[js.deck-list-dialog]], [[js.dice-animation]], [[js.dice-draft-panel]], [[js.dice-notation]], [[js.file-uploader]], [[js.floating-panel]], [[js.game-store]], [[js.help.help-panel]], [[js.html-escape]], [[js.icons]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.net-transport]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.registry]], [[js.parameters.skill.item-use]], [[js.pwa]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.room-stamp-dialog]], [[js.room-stamp-list-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.sound-config]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.store.stamps]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
