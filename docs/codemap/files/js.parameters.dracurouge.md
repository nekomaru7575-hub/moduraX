---
source: js/parameters/dracurouge.js
lines: 950
exports: 2
imported_by: 1
api_sha: d4d7df16cc4b
prose_sha: d4d7df16cc4b
generated: 2026-08-18
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
| 42 | const | DRACUROUGE_BCDICE_SYSTEM | `DRACUROUGE_BCDICE_SYSTEM` | BCDice側のシステムID。 |
| 934 | const | DRACUROUGE_PLUGIN | `DRACUROUGE_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（27）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 195 | readDracurougeDeeds | `readDracurougeDeeds(components)` | 3 |  |
| 199 | readDracurougeEpisodes | `readDracurougeEpisodes(components)` | 3 |  |
| 205 | buildDracurougeCharacterParameters | `buildDracurougeCharacterParameters()` | 6 |  |
| 212 | readCharType | `readCharType(parameters)` | 3 |  |
| 216 | definitionsFor | `definitionsFor(charType)` | 3 |  |
| 222 | buildPathSelect | `buildPathSelect(currentValue)` | 22 |  |
| 245 | buildTypeSelect | `buildTypeSelect(charType)` | 14 |  |
| 260 | renderDracurougeCharacterPanel | `renderDracurougeCharacterPanel({ container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents, dispatch, getToken, getEffectiveParameterValue, tokenId })` | **261** |  |
| 534 | renameHpToExistence | `renameHpToExistence({ readParameters, dispatch, tokenId })` | 11 |  |
| 574 | sheetText | `sheetText(value)` | 3 |  |
| 579 | assignSheetNumber | `assignSheetNumber(target, paramId, raw)` | 5 |  |
| 587 | importDeedsOfKind | `importDeedsOfKind(rawList, kind)` | 16 |  |
| 604 | importDracurougeDeedsFromSheet | `importDracurougeDeedsFromSheet(json)` | 6 |  |
| 611 | importDracurougeEpisodesFromSheet | `importDracurougeEpisodesFromSheet(json)` | 7 |  |
| 622 | importBondSide | `importBondSide(raw, side)` | 7 |  |
| 630 | importDracurougeBondsFromSheet | `importDracurougeBondsFromSheet(json)` | 23 |  |
| 657 | importDracurougePath | `importDracurougePath(json)` | 7 |  |
| 671 | importDracurougeCharacterJson | `importDracurougeCharacterJson(json)` | 28 |  |
| 740 | readThirstModifier | `readThirstModifier(token, getEffectiveParameterValue)` | 7 |  |
| 756 | readTreatDice | `readTreatDice({ diceValues, resultText })` | 15 |  |
| 777 | looksLikeDracurougeChatCommand | `looksLikeDracurougeChatCommand(rawInput)` | 4 |  |
| 790 | splitDeedUseArgument | `splitDeedUseArgument(rawArgument)` | 7 |  |
| 806 | handleDracurougeChatCommand | `handleDracurougeChatCommand(rawInput, context)` | 51 |  |
| 861 | resetDracurougeComponentsOnPhaseEnd | `resetDracurougeComponentsOnPhaseEnd(components, phase)` | 6 |  |
| 878 | buildDracurougeRoundPhaseTemplate | `buildDracurougeRoundPhaseTemplate()` | 16 |  |
| 897 | computeDracurougeDerivedParameters | `computeDracurougeDerivedParameters(parameters = {})` | 7 |  |
| 908 | applyDracurougeRoundPhaseStart | `applyDracurougeRoundPhaseStart(phase, { tokens = {}, participants = [] } = {})` | 25 |  |

## 依存

- import → [[js.parameters.dice-draft.dice-draft-model]], [[js.parameters.dice-draft.dice-draft-roll]], [[js.parameters.dice-draft.dice-draft-use]], [[js.parameters.dracurouge-bond-box]], [[js.parameters.paramFactory]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.read-only-form]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
