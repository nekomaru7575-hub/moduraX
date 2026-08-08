---
source: js/main.js
lines: 1826
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-08
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
| 89 | visibleChatTabs | `visibleChatTabs(state)` | 4 |  |
| 94 | renderChatTabs | `renderChatTabs(state)` | 30 |  |
| 125 | addChatTab | `addChatTab()` | 11 |  |
| 144 | openChatTabAudienceDialog | `openChatTabAudienceDialog(tab)` | 19 |  |
| 165 | ensureActiveTabVisible | `ensureActiveTabVisible(state)` | 4 |  |
| 170 | switchChatTab | `switchChatTab(tabId)` | 6 |  |
| 179 | appendLogEntries | `appendLogEntries(container, entries, fromIndex, itemClassName, buildOptions = {})` | 11 |  |
| 191 | renderActiveTabLog | `renderActiveTabLog(state)` | 30 |  |
| 222 | renderMainChatMirror | `renderMainChatMirror(state)` | 29 |  |
| 301 | applyGmOnlyControls | `applyGmOnlyControls()` | 12 |  |
| 321 | openRoomParametersDialog | `openRoomParametersDialog()` | 19 |  |
| 343 | openOriginalTableEditor | `openOriginalTableEditor(table = null)` | 15 |  |
| 360 | openOriginalTableListDialog | `openOriginalTableListDialog()` | 11 |  |
| 378 | currentBoardSnapshot | `currentBoardSnapshot()` | 17 |  |
| 397 | openSceneEditor | `openSceneEditor(scene = null)` | 27 |  |
| 426 | openSceneListDialog | `openSceneListDialog()` | 15 |  |
| 444 | openAudioDialog | `openAudioDialog()` | 33 |  |
| 485 | currentRoomId | `currentRoomId()` | 3 |  |
| 491 | activateAndRegisterIdentity | `async activateAndRegisterIdentity(name, devPassphrase)` | 19 |  |
| 511 | openIdentityDialog | `openIdentityDialog()` | 17 |  |
| 626 | downloadBlob | `downloadBlob(blob, filename)` | 10 |  |
| 646 | exportStateToFile | `exportStateToFile()` | 10 |  |
| 659 | openLogExportDialog | `openLogExportDialog()` | 19 |  |
| 681 | openLogClearDialog | `openLogClearDialog()` | 5 |  |
| 839 | substituteCharacterParameters | `substituteCharacterParameters(text, character, depth = 0)` | 28 |  |
| 879 | parseFinalDiceNumber | `parseFinalDiceNumber(resultText)` | 7 |  |
| 889 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 |  |
| 901 | shouldMaskParameterValue | `shouldMaskParameterValue(param)` | 3 |  |
| 908 | applyParameterChanges | `applyParameterChanges({ character, targets, amount, diceResultText, diceDetail = "", command, tabId = activeTabId })` | 21 |  |
| 930 | tryHandleParameterCommand | `tryHandleParameterCommand(rawInput, character, tabId = activeTabId)` | 82 |  |
| 1044 | tryHandleBuffCommand | `tryHandleBuffCommand(rawInput, character, tabId = activeTabId)` | 101 |  |
| 1157 | tryHandlePhaseEndCommand | `tryHandlePhaseEndCommand(rawInput)` | 7 |  |
| 1169 | tryHandleAudioStopCommand | `tryHandleAudioStopCommand(rawInput)` | 36 |  |
| 1210 | triggerAudioPhrase | `triggerAudioPhrase(text)` | 13 |  |
| 1228 | tryHandlePluginChatCommand | `tryHandlePluginChatCommand(rawInput, character)` | 25 |  |
| 1258 | tryHandleOriginalTableCommand | `tryHandleOriginalTableCommand(rawInput, character, tabId = activeTabId)` | 28 |  |
| 1297 | submitChatText | `submitChatText({ rawInput, character = null, characterName, tabId = activeTabId, onSent })` | 37 |  |
| 1337 | submitFromPalette | `submitFromPalette({ text, name, onSent })` | 14 |  |
| 1410 | hideCommandInputSuggestions | `hideCommandInputSuggestions()` | 5 |  |
| 1416 | updateCommandInputSuggestions | `updateCommandInputSuggestions()` | 41 |  |
| 1499 | updateCurrentChatPortrait | `updateCurrentChatPortrait()` | 8 |  |
| 1596 | ensureGameSystemOption | `ensureGameSystemOption(systemId)` | 7 |  |
| 1604 | syncGameSystemSelect | `syncGameSystemSelect(state)` | 9 |  |
| 1653 | hideGameSystemHelp | `hideGameSystemHelp()` | 3 |  |
| 1657 | showGameSystemHelp | `async showGameSystemHelp()` | 16 |  |
| 1674 | refreshGameSystemHelpIfOpen | `refreshGameSystemHelpIfOpen()` | 3 |  |
| 1769 | splitForSpace | `splitForSpace(string)` | 3 |  |
| 1773 | escapeHtml | `escapeHtml(text)` | 6 |  |
| 1785 | buildLogHtml | `buildLogHtml({ system = "", character = "", comment = "", command = "", resultText, diceDetail = "", color = null, time }, { hideSystem = false } = {})` | 24 |  |
| 1813 | applyLog | `applyLog(entry, tabId = activeTabId)` | 3 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audio-dialog]], [[js.audio-phrase]], [[js.audio-player]], [[js.bcdice-catalog]], [[js.board-data-driven]], [[js.character-panel]], [[js.chat-palette]], [[js.chat-tab-dialog]], [[js.context-menu]], [[js.dice-animation]], [[js.dice-notation]], [[js.floating-panel]], [[js.game-store]], [[js.identity-dialog]], [[js.info-panel]], [[js.local-identity]], [[js.log-clear-dialog]], [[js.log-export-dialog]], [[js.log-export]], [[js.net-sync]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.parameters.registry]], [[js.resizable-stack]], [[js.room-authority]], [[js.room-delete-dialog]], [[js.room-entry]], [[js.room-parameters-dialog]], [[js.round-panel]], [[js.scene-dialog]], [[js.scene-list-dialog]], [[js.visibility]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
