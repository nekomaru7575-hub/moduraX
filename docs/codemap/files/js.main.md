---
source: js/main.js
lines: 1926
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-11
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

## トップレベル関数（LOCAL TASKS 候補）（50）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 95 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 100 | renderChatTabs | `renderChatTabs(state)` | 30 |  |
| 131 | addChatTab | `addChatTab()` | 11 |  |
| 150 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 19 |  |
| 171 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 176 | switchChatTab | `switchChatTab(tabId)` | 6 |  |
| 185 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 11 |  |
| 197 | renderActiveTabLog | `renderActiveTabLog(state)` | 30 |  |
| 228 | renderMainChatMirror | `renderMainChatMirror(state)` | 29 |  |
| 307 | applyGmOnlyControls | `applyGmOnlyControls()` | 12 |  |
| 327 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 349 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 366 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 384 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 403 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 432 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 450 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 491 | currentRoomId | `currentRoomId()` | 3 |  |
| 497 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 517 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 632 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 658 | exportStateToFile | `async exportStateToFile()` | 32 |  |
| 693 | openLogExportDialog | `openLogExportDialog()` | 19 |  |
| 715 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 875 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 915 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 925 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 937 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 944 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 966 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1080 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1193 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1205 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1246 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 13 |  |
| 1264 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 25 |  |
| 1294 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1333 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 37 |  |
| 1373 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 1451 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 1457 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 41 |  |
| 1504 | updateTypingIndicatorState | `updateTypingIndicatorState()` | 7 |  |
| 1581 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 1678 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 1686 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 1735 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 1739 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 1756 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 1851 | splitForSpace | `splitForSpace(string)` | 3 |  |
| 1867 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null, time }, { hideSystem = false, hideTime = false } = {})` | 28 |  |
| 1899 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.character-panel]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.dice-animation]], [[js.dice-notation]], [[js.floating-panel]], [[js.game-store]], [[js.html-escape]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.mobile-layout]], [[js.net-sync]], [[js.no-browser-zoom]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.registry]], [[js.resizable-stack]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.untrusted-json]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
