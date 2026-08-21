---
source: js/parameters/dracurouge.js
lines: 945
exports: 2
imported_by: 1
api_sha: d4d7df16cc4b
prose_sha: d4d7df16cc4b
generated: 2026-08-21
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
| 929 | const | DRACUROUGE_PLUGIN | `DRACUROUGE_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（27）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 190 | readDracurougeDeeds | `readDracurougeDeeds(components)` | 3 |  |
| 194 | readDracurougeEpisodes | `readDracurougeEpisodes(components)` | 3 |  |
| 200 | buildDracurougeCharacterParameters | `buildDracurougeCharacterParameters()` | 6 |  |
| 207 | readCharType | `readCharType(parameters)` | 3 |  |
| 211 | definitionsFor | `definitionsFor(charType)` | 3 |  |
| 217 | buildPathSelect | `buildPathSelect(currentValue)` | 22 |  |
| 240 | buildTypeSelect | `buildTypeSelect(charType)` | 14 |  |
| 255 | renderDracurougeCharacterPanel | `renderDracurougeCharacterPanel({ container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents, dispatch, getToken, getEffectiveParameterValue, tokenId })` | **261** |  |
| 529 | renameHpToExistence | `renameHpToExistence({ readParameters, dispatch, tokenId })` | 11 |  |
| 569 | sheetText | `sheetText(value)` | 3 |  |
| 574 | assignSheetNumber | `assignSheetNumber(target, paramId, raw)` | 5 |  |
| 582 | importDeedsOfKind | `importDeedsOfKind(rawList, kind)` | 16 |  |
| 599 | importDracurougeDeedsFromSheet | `importDracurougeDeedsFromSheet(json)` | 6 |  |
| 606 | importDracurougeEpisodesFromSheet | `importDracurougeEpisodesFromSheet(json)` | 7 |  |
| 617 | importBondSide | `importBondSide(raw, side)` | 7 |  |
| 625 | importDracurougeBondsFromSheet | `importDracurougeBondsFromSheet(json)` | 23 |  |
| 652 | importDracurougePath | `importDracurougePath(json)` | 7 |  |
| 666 | importDracurougeCharacterJson | `importDracurougeCharacterJson(json)` | 28 |  |
| 735 | readThirstModifier | `readThirstModifier(token, getEffectiveParameterValue)` | 7 |  |
| 751 | readTreatDice | `readTreatDice({ diceValues, resultText })` | 15 |  |
| 772 | looksLikeDracurougeChatCommand | `looksLikeDracurougeChatCommand(rawInput)` | 4 |  |
| 785 | splitDeedUseArgument | `splitDeedUseArgument(rawArgument)` | 7 |  |
| 801 | handleDracurougeChatCommand | `handleDracurougeChatCommand(rawInput, context)` | 51 |  |
| 856 | resetDracurougeComponentsOnPhaseEnd | `resetDracurougeComponentsOnPhaseEnd(components, phase)` | 6 |  |
| 873 | buildDracurougeRoundPhaseTemplate | `buildDracurougeRoundPhaseTemplate()` | 16 |  |
| 892 | computeDracurougeDerivedParameters | `computeDracurougeDerivedParameters(parameters = {})` | 7 |  |
| 903 | applyDracurougeRoundPhaseStart | `applyDracurougeRoundPhaseStart(phase, { tokens = {}, participants = [] } = {})` | 25 |  |

## 依存

- import → [[js.parameters.dice-draft.dice-draft-model]], [[js.parameters.dice-draft.dice-draft-roll]], [[js.parameters.dice-draft.dice-draft-use]], [[js.parameters.dracurouge-bond-box]], [[js.parameters.paramFactory]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.read-only-form]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
