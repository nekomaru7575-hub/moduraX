---
source: js/main.js
lines: 2707
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

## トップレベル関数（LOCAL TASKS 候補）（73）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 135 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 140 | renderChatTabs | `renderChatTabs(state)` | 61 |  |
| 206 | addChatTab | `addChatTab()` | 11 |  |
| 225 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 20 |  |
| 247 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 252 | switchChatTab | `switchChatTab(tabId)` | 9 |  |
| 280 | setChatInputLocked | `setChatInputLocked(locked, reason = '')` | 8 |  |
| 293 | syncChatInputLock | `syncChatInputLock()` | 9 |  |
| 303 | openHelp | `openHelp()` | 9 |  |
| 313 | closeHelp | `closeHelp()` | 7 |  |
| 335 | displayedLogEntry | `displayedLogEntry(entry)` | 3 |  |
| 343 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 13 |  |
| 361 | patchEditedLogEntries | `patchEditedLogEntries(container, entries)` | 12 |  |
| 374 | renderActiveTabLog | `renderActiveTabLog(state)` | 34 |  |
| 409 | renderMainChatMirror | `renderMainChatMirror(state)` | 37 |  |
| 448 | updateTabBadge | `updateTabBadge(tabId)` | 4 |  |
| 457 | updateUnreadTabs | `updateUnreadTabs(state)` | 13 |  |
| 498 | findLogEntryById | `findLogEntryById(entryId)` | 3 |  |
| 502 | openLogEntryMenu | `openLogEntryMenu(clientX, clientY, entry)` | 35 |  |
| 539 | editableEntryFromEvent | `editableEntryFromEvent(event)` | 6 |  |
| 557 | initLogEntryMenu | `initLogEntryMenu(container)` | 53 |  |
| 656 | applyGmOnlyControls | `applyGmOnlyControls()` | 13 |  |
| 677 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 699 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 716 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 734 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 753 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 782 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 800 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 841 | currentRoomId | `currentRoomId()` | 3 |  |
| 847 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 867 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 911 | placeDeckOnBoard | `placeDeckOnBoard(name, back, cards)` | 6 |  |
| 920 | builtInAsTemplate | `builtInAsTemplate(builtIn)` | 14 |  |
| 935 | openDeckEditor | `openDeckEditor(template = null)` | 13 |  |
| 950 | importDeckFromFile | `async importDeckFromFile()` | 27 |  |
| 978 | openDeckListDialog | `openDeckListDialog()` | 46 |  |
| 1130 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 1161 | exportStateToFile | `async exportStateToFile()` | 48 |  |
| 1211 | downloadStateJson | `downloadStateJson(exportedState)` | 6 |  |
| 1220 | openLogExportDialog | `openLogExportDialog()` | 21 |  |
| 1244 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1431 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 1471 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1481 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 1493 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1500 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 1522 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1636 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1749 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1766 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 23 |  |
| 1790 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1831 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 17 |  |
| 1855 | findTokenByName | `findTokenByName(name)` | 3 |  |
| 1859 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 51 |  |
| 1915 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1954 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 1996 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 2074 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 2080 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 44 |  |
| 2130 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 2176 | describeTypingUsers | `describeTypingUsers(others)` | 5 |  |
| 2228 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 2355 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 2363 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 2412 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 2416 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 2433 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2547 | splitForSpace | `splitForSpace(string)` | 8 |  |
| 2569 | splitRepeatPrefix | `splitRepeatPrefix(string)` | 7 |  |
| 2591 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", time, editedAt = null, secret = false, revealed = false }, { hideSystem = false, hideTime = false } = {})` | 36 |  |
| 2634 | applyLogNameColor | `applyLogNameColor(item, color)` | 6 |  |
| 2644 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.asset-base]], [[js.asset-store]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.card-catalog]], [[js.character-panel]], [[js.character-snapshot]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.deck-editor-dialog]], [[js.deck-file]], [[js.deck-list-dialog]], [[js.dice-animation]], [[js.dice-draft-panel]], [[js.dice-notation]], [[js.file-uploader]], [[js.floating-panel]], [[js.game-store]], [[js.help.help-panel]], [[js.html-escape]], [[js.icons]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.net-transport]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.registry]], [[js.parameters.skill.item-use]], [[js.pwa]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.sound-config]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
