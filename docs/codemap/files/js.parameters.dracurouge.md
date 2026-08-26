---
source: js/parameters/dracurouge.js
lines: 949
exports: 2
imported_by: 1
api_sha: d4d7df16cc4b
prose_sha: d4d7df16cc4b
generated: 2026-08-26
tags: [codemap]
---

# js/parameters/dracurouge.js

<!-- prose:summary -->
ドラクルージュのプラグイン記述子。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 43 | const | DRACUROUGE_BCDICE_SYSTEM | `DRACUROUGE_BCDICE_SYSTEM` | BCDice側のシステムID。 |
| 933 | const | DRACUROUGE_PLUGIN | `DRACUROUGE_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（27）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 194 | readDracurougeDeeds | `readDracurougeDeeds(components)` | 3 |  |
| 198 | readDracurougeEpisodes | `readDracurougeEpisodes(components)` | 3 |  |
| 204 | buildDracurougeCharacterParameters | `buildDracurougeCharacterParameters()` | 6 |  |
| 211 | readCharType | `readCharType(parameters)` | 3 |  |
| 215 | definitionsFor | `definitionsFor(charType)` | 3 |  |
| 221 | buildPathSelect | `buildPathSelect(currentValue)` | 22 |  |
| 244 | buildTypeSelect | `buildTypeSelect(charType)` | 14 |  |
| 259 | renderDracurougeCharacterPanel | `renderDracurougeCharacterPanel({ container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents, dispatch, getToken, getEffectiveParameterValue, tokenId })` | **261** |  |
| 533 | renameHpToExistence | `renameHpToExistence({ readParameters, dispatch, tokenId })` | 11 |  |
| 573 | sheetText | `sheetText(value)` | 3 |  |
| 578 | assignSheetNumber | `assignSheetNumber(target, paramId, raw)` | 5 |  |
| 586 | importDeedsOfKind | `importDeedsOfKind(rawList, kind)` | 16 |  |
| 603 | importDracurougeDeedsFromSheet | `importDracurougeDeedsFromSheet(json)` | 6 |  |
| 610 | importDracurougeEpisodesFromSheet | `importDracurougeEpisodesFromSheet(json)` | 7 |  |
| 621 | importBondSide | `importBondSide(raw, side)` | 7 |  |
| 629 | importDracurougeBondsFromSheet | `importDracurougeBondsFromSheet(json)` | 23 |  |
| 656 | importDracurougePath | `importDracurougePath(json)` | 7 |  |
| 670 | importDracurougeCharacterJson | `importDracurougeCharacterJson(json)` | 28 |  |
| 739 | readThirstModifier | `readThirstModifier(token, getEffectiveParameterValue)` | 7 |  |
| 755 | readTreatDice | `readTreatDice({ diceValues, resultText })` | 15 |  |
| 776 | looksLikeDracurougeChatCommand | `looksLikeDracurougeChatCommand(rawInput)` | 4 |  |
| 789 | splitDeedUseArgument | `splitDeedUseArgument(rawArgument)` | 7 |  |
| 805 | handleDracurougeChatCommand | `handleDracurougeChatCommand(rawInput, context)` | 51 |  |
| 860 | resetDracurougeComponentsOnPhaseEnd | `resetDracurougeComponentsOnPhaseEnd(components, phase)` | 6 |  |
| 877 | buildDracurougeRoundPhaseTemplate | `buildDracurougeRoundPhaseTemplate()` | 16 |  |
| 896 | computeDracurougeDerivedParameters | `computeDracurougeDerivedParameters(parameters = {})` | 7 |  |
| 907 | applyDracurougeRoundPhaseStart | `applyDracurougeRoundPhaseStart(phase, { tokens = {}, participants = [] } = {})` | 25 |  |

## 依存

- import → [[js.parameters.dice-draft.dice-draft-model]], [[js.parameters.dice-draft.dice-draft-roll]], [[js.parameters.dice-draft.dice-draft-use]], [[js.parameters.dracurouge-bond-box]], [[js.parameters.paramFactory]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.read-only-form]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
