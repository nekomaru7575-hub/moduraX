---
source: js/main.js
lines: 2544
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-27
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

## トップレベル関数（LOCAL TASKS 候補）（68）

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
| 333 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 12 |  |
| 350 | patchEditedLogEntries | `patchEditedLogEntries(container, entries)` | 10 |  |
| 361 | renderActiveTabLog | `renderActiveTabLog(state)` | 34 |  |
| 396 | renderMainChatMirror | `renderMainChatMirror(state)` | 36 |  |
| 434 | updateTabBadge | `updateTabBadge(tabId)` | 4 |  |
| 443 | updateUnreadTabs | `updateUnreadTabs(state)` | 13 |  |
| 484 | findLogEntryById | `findLogEntryById(entryId)` | 3 |  |
| 488 | openLogEntryMenu | `openLogEntryMenu(clientX, clientY, entry)` | 15 |  |
| 505 | editableEntryFromEvent | `editableEntryFromEvent(event)` | 6 |  |
| 523 | initLogEntryMenu | `initLogEntryMenu(container)` | 53 |  |
| 622 | applyGmOnlyControls | `applyGmOnlyControls()` | 13 |  |
| 643 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 665 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 682 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 700 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 719 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 748 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 766 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 807 | currentRoomId | `currentRoomId()` | 3 |  |
| 813 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 833 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 877 | placeDeckOnBoard | `placeDeckOnBoard(name, back, cards)` | 6 |  |
| 886 | builtInAsTemplate | `builtInAsTemplate(builtIn)` | 14 |  |
| 901 | openDeckEditor | `openDeckEditor(template = null)` | 13 |  |
| 916 | importDeckFromFile | `async importDeckFromFile()` | 27 |  |
| 944 | openDeckListDialog | `openDeckListDialog()` | 46 |  |
| 1096 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 1122 | exportStateToFile | `async exportStateToFile()` | 32 |  |
| 1157 | openLogExportDialog | `openLogExportDialog()` | 19 |  |
| 1179 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 1341 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 1381 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 1391 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 1403 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 1410 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 1432 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1546 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1659 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1676 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 23 |  |
| 1700 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1741 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 17 |  |
| 1765 | findTokenByName | `findTokenByName(name)` | 3 |  |
| 1769 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 51 |  |
| 1825 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1864 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 1906 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 1984 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 1990 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 44 |  |
| 2040 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 2117 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 2244 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 2252 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 2301 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 2305 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 2322 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 2429 | splitForSpace | `splitForSpace(string)` | 8 |  |
| 2450 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null, time, editedAt = null }, { hideSystem = false, hideTime = false } = {})` | 31 |  |
| 2485 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.asset-base]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.card-catalog]], [[js.character-panel]], [[js.character-snapshot]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.deck-editor-dialog]], [[js.deck-file]], [[js.deck-list-dialog]], [[js.dice-animation]], [[js.dice-draft-panel]], [[js.dice-notation]], [[js.file-uploader]], [[js.floating-panel]], [[js.game-store]], [[js.help.help-panel]], [[js.html-escape]], [[js.icons]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.registry]], [[js.parameters.skill.item-use]], [[js.pwa]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
