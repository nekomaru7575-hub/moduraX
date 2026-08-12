---
source: js/main.js
lines: 1966
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-12
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

## トップレベル関数（LOCAL TASKS 候補）（51）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 98 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 103 | renderChatTabs | `renderChatTabs(state)` | 30 |  |
| 134 | addChatTab | `addChatTab()` | 11 |  |
| 153 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 19 |  |
| 174 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 179 | switchChatTab | `switchChatTab(tabId)` | 6 |  |
| 188 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 11 |  |
| 200 | renderActiveTabLog | `renderActiveTabLog(state)` | 30 |  |
| 231 | renderMainChatMirror | `renderMainChatMirror(state)` | 29 |  |
| 310 | applyGmOnlyControls | `applyGmOnlyControls()` | 12 |  |
| 330 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 352 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 369 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 387 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 406 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 435 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 453 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 494 | currentRoomId | `currentRoomId()` | 3 |  |
| 500 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 520 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 635 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 661 | exportStateToFile | `async exportStateToFile()` | 32 |  |
| 696 | openLogExportDialog | `openLogExportDialog()` | 19 |  |
| 718 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 878 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 918 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 928 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 940 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 947 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 969 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1083 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1196 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1213 | tryHandleStampCommand | `tryHandleStampCommand(rawInput)` | 23 |  |
| 1237 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1278 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 13 |  |
| 1296 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 25 |  |
| 1326 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1365 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 39 |  |
| 1407 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 1485 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 1491 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 41 |  |
| 1538 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 1615 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 1712 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 1720 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 1769 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 1773 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 1790 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 1885 | splitForSpace | `splitForSpace(string)` | 3 |  |
| 1901 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null, time }, { hideSystem = false, hideTime = false } = {})` | 28 |  |
| 1933 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.character-panel]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.dice-animation]], [[js.dice-notation]], [[js.floating-panel]], [[js.game-store]], [[js.html-escape]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.registry]], [[js.resizable-stack]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.stamp-registry]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
