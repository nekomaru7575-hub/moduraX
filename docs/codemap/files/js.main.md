---
source: js/main.js
lines: 2765
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-09-14
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

## トップレベル関数（LOCAL TASKS 候補）（75）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 144 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 149 | renderChatTabs | `renderChatTabs(state)` | 61 |  |
| 215 | addChatTab | `addChatTab()` | 11 |  |
| 234 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 20 |  |
| 256 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 261 | switchChatTab | `switchChatTab(tabId)` | 9 |  |
| 289 | setChatInputLocked | `setChatInputLocked(locked, reason = '')` | 8 |  |
| 302 | syncChatInputLock | `syncChatInputLock()` | 9 |  |
| 312 | openHelp | `openHelp()` | 9 |  |
| 322 | closeHelp | `closeHelp()` | 7 |  |
| 344 | displayedLogEntry | `displayedLogEntry(entry)` | 3 |  |
| 352 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 13 |  |
| 370 | patchEditedLogEntries | `patchEditedLogEntries(container, entries)` | 12 |  |
| 383 | renderActiveTabLog | `renderActiveTabLog(state)` | 34 |  |
| 418 | renderMainChatMirror | `renderMainChatMirror(state)` | 37 |  |
| 457 | updateTabBadge | `updateTabBadge(tabId)` | 4 |  |
| 466 | updateUnreadTabs | `updateUnreadTabs(state)` | 13 |  |
| 507 | findLogEntryById | `findLogEntryById(entryId)` | 3 |  |
| 511 | openLogEntryMenu | `openLogEntryMenu(clientX, clientY, entry)` | 35 |  |
| 548 | editableEntryFromEvent | `editableEntryFromEvent(event)` | 6 |  |
| 566 | initLogEntryMenu | `initLogEntryMenu(container)` | 53 |  |
| 665 | applyGmOnlyControls | `applyGmOnlyControls()` | 13 |  |
| 686 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 708 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 725 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 739 | openRoomStampEditor | `openRoomStampEditor(stamp = null)` | 16 |  |
| 757 | openRoomStampListDialog | `openRoomStampListDialog()` | 17 |  |
| 781 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 800 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 829 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 847 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 888 | currentRoomId | `currentRoomId()` | 3 |  |
| 894 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 914 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 958 | placeDeckOnBoard | `placeDeckOnBoard(name, back, cards)` | 6 |  |
| 967 | builtInAsTemplate | `builtInAsTemplate(builtIn)` | 14 |  |
| 982 | openDeckEditor | `openDeckEditor(template = null)` | 13 |  |
| 997 | importDeckFromFile | `async importDeckFromFile()` | 27 |  |
| 1025 | openDeckListDialog | `openDeckListDialog()` | 46 |  |
| 1200 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 1234 | exportStateToFile | `async exportStateToFile()` | 48 |  |
| 1284 | downloadStateJson | `downloadStateJson(exportedState)` | 6 |  |
| 1293 | openLogExportDialog | `openLogExportDialog()` | 21 |  |
| 1317 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1504 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 1541 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1553 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1561 | applyParameterChanges | `applyParameterChanges({ character, characterName, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 26 |  |
| 1588 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId, characterName)` | 50 |  |
| 1670 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1783 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1800 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 22 |  |
| 1823 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1864 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 17 |  |
| 1888 | findTokenByName | `findTokenByName(name)` | 3 |  |
| 1892 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 51 |  |
| 1948 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1987 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 2029 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 2068 | selectedChatCharacter | `selectedChatCharacter()` | 3 |  |
| 2117 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 2123 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 44 |  |
| 2173 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 2219 | describeTypingUsers | `describeTypingUsers(others)` | 5 |  |
| 2271 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 2398 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 2406 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 2455 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 2459 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 2476 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2590 | splitForSpace | `splitForSpace(string)` | 8 |  |
| 2612 | splitRepeatPrefix | `splitRepeatPrefix(string)` | 7 |  |
| 2634 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", time, editedAt = null, secret = false, revealed = false }, { hideSystem = false, hideTime = false } = {})` | 36 |  |
| 2679 | applyLogNameColor | `applyLogNameColor(item, color)` | 6 |  |
| 2689 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.asset-base]], [[js.asset-store]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.card-catalog]], [[js.character-panel]], [[js.character-snapshot]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.check-panel]], [[js.context-menu]], [[js.deck-editor-dialog]], [[js.deck-file]], [[js.deck-list-dialog]], [[js.dice-animation]], [[js.dice-notation]], [[js.file-uploader]], [[js.floating-panel]], [[js.game-store]], [[js.help.help-panel]], [[js.html-escape]], [[js.icons]], [[js.identity-dialog]], [[js.image-selector-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.net-transport]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameter-command]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.registry]], [[js.parameters.skill.item-use]], [[js.pwa]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.room-stamp-dialog]], [[js.room-stamp-list-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.sound-config]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.store.images]], [[js.store.stamps]], [[js.theme]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
