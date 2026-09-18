---
source: js/main.js
lines: 2853
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-09-18
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

## トップレベル関数（LOCAL TASKS 候補）（77）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 146 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 151 | renderChatTabs | `renderChatTabs(state)` | 61 |  |
| 217 | addChatTab | `addChatTab()` | 11 |  |
| 236 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 20 |  |
| 258 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 263 | switchChatTab | `switchChatTab(tabId)` | 9 |  |
| 291 | setChatInputLocked | `setChatInputLocked(locked, reason = '')` | 8 |  |
| 304 | syncChatInputLock | `syncChatInputLock()` | 9 |  |
| 314 | openHelp | `openHelp()` | 9 |  |
| 324 | closeHelp | `closeHelp()` | 7 |  |
| 346 | displayedLogEntry | `displayedLogEntry(entry)` | 3 |  |
| 354 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 13 |  |
| 372 | patchEditedLogEntries | `patchEditedLogEntries(container, entries)` | 12 |  |
| 385 | renderActiveTabLog | `renderActiveTabLog(state)` | 34 |  |
| 420 | renderMainChatMirror | `renderMainChatMirror(state)` | 43 |  |
| 465 | updateTabBadge | `updateTabBadge(tabId)` | 4 |  |
| 474 | updateUnreadTabs | `updateUnreadTabs(state)` | 13 |  |
| 515 | findLogEntryById | `findLogEntryById(entryId)` | 3 |  |
| 519 | openLogEntryMenu | `openLogEntryMenu(clientX, clientY, entry)` | 35 |  |
| 556 | editableEntryFromEvent | `editableEntryFromEvent(event)` | 6 |  |
| 574 | initLogEntryMenu | `initLogEntryMenu(container)` | 53 |  |
| 673 | applyGmOnlyControls | `applyGmOnlyControls()` | 13 |  |
| 694 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 716 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 733 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 747 | openRoomStampEditor | `openRoomStampEditor(stamp = null)` | 16 |  |
| 765 | openRoomStampListDialog | `openRoomStampListDialog()` | 17 |  |
| 789 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 808 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 837 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 855 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 896 | currentRoomId | `currentRoomId()` | 3 |  |
| 902 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 922 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 966 | placeDeckOnBoard | `placeDeckOnBoard(name, back, cards)` | 6 |  |
| 975 | builtInAsTemplate | `builtInAsTemplate(builtIn)` | 14 |  |
| 990 | openDeckEditor | `openDeckEditor(template = null)` | 13 |  |
| 1005 | importDeckFromFile | `async importDeckFromFile()` | 27 |  |
| 1033 | openDeckListDialog | `openDeckListDialog()` | 46 |  |
| 1213 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 1247 | exportStateToFile | `async exportStateToFile()` | 48 |  |
| 1297 | downloadStateJson | `downloadStateJson(exportedState)` | 6 |  |
| 1306 | openLogExportDialog | `openLogExportDialog()` | 21 |  |
| 1330 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1518 | currentTarget | `currentTarget()` | 3 |  |
| 1524 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 39 |  |
| 1573 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1585 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1594 | applyParameterChanges | `applyParameterChanges({ character, characterName, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 30 |  |
| 1625 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId, characterName)` | 50 |  |
| 1711 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 107 |  |
| 1830 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1847 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 22 |  |
| 1870 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1911 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 17 |  |
| 1935 | findTokenByName | `findTokenByName(name)` | 3 |  |
| 1942 | buildPluginCommandContext | `buildPluginCommandContext(character)` | 22 |  |
| 1965 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 33 |  |
| 2003 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 2042 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 72 |  |
| 2117 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 2156 | selectedChatCharacter | `selectedChatCharacter()` | 3 |  |
| 2205 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 2211 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 44 |  |
| 2261 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 2307 | describeTypingUsers | `describeTypingUsers(others)` | 5 |  |
| 2359 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 2486 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 2494 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 2543 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 2547 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 2564 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2678 | splitForSpace | `splitForSpace(string)` | 8 |  |
| 2700 | splitRepeatPrefix | `splitRepeatPrefix(string)` | 7 |  |
| 2722 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", time, editedAt = null, secret = false, revealed = false }, { hideSystem = false, hideTime = false } = {})` | 36 |  |
| 2767 | applyLogNameColor | `applyLogNameColor(item, color)` | 6 |  |
| 2777 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.EventBus]], [[js.asset-base]], [[js.asset-store]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.card-catalog]], [[js.character-panel]], [[js.character-snapshot]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.check-panel]], [[js.context-menu]], [[js.deck-editor-dialog]], [[js.deck-file]], [[js.deck-list-dialog]], [[js.dice-animation]], [[js.dice-notation]], [[js.file-uploader]], [[js.floating-panel]], [[js.game-store]], [[js.help.help-panel]], [[js.html-escape]], [[js.icons]], [[js.identity-dialog]], [[js.image-selector-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.net-transport]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameter-command]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.registry]], [[js.parameters.skill.item-use]], [[js.pwa]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-extension-dialog]], [[js.room-parameters-dialog]], [[js.room-roll]], [[js.room-stamp-dialog]], [[js.room-stamp-list-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.sound-config]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.store.images]], [[js.store.stamps]], [[js.store.targets]], [[js.theme]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
