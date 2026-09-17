---
source: js/parameters/dracurouge.js
lines: 918
exports: 2
imported_by: 1
api_sha: d4d7df16cc4b
prose_sha: d4d7df16cc4b
generated: 2026-09-17
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
| 903 | const | DRACUROUGE_PLUGIN | `DRACUROUGE_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（24）

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
| 565 | importDeedsOfKind | `importDeedsOfKind(rawList, kind)` | 16 |  |
| 582 | importDracurougeDeedsFromSheet | `importDracurougeDeedsFromSheet(json)` | 6 |  |
| 589 | importDracurougeEpisodesFromSheet | `importDracurougeEpisodesFromSheet(json)` | 7 |  |
| 600 | importBondSide | `importBondSide(raw, side)` | 7 |  |
| 608 | importDracurougeBondsFromSheet | `importDracurougeBondsFromSheet(json)` | 23 |  |
| 635 | importDracurougePath | `importDracurougePath(json)` | 7 |  |
| 649 | importDracurougeCharacterJson | `importDracurougeCharacterJson(json)` | 28 |  |
| 718 | readThirstModifier | `readThirstModifier(token, getEffectiveParameterValue)` | 7 |  |
| 734 | readTreatDice | `readTreatDice({ diceValues, resultText })` | 15 |  |
| 755 | looksLikeDracurougeChatCommand | `looksLikeDracurougeChatCommand(rawInput)` | 4 |  |
| 769 | splitDeedUseArgument | `splitDeedUseArgument(rawArgument)` | 7 |  |
| 785 | handleDracurougeChatCommand | `handleDracurougeChatCommand(rawInput, context)` | 51 |  |
| 847 | buildDracurougeRoundPhaseTemplate | `buildDracurougeRoundPhaseTemplate()` | 16 |  |
| 866 | computeDracurougeDerivedParameters | `computeDracurougeDerivedParameters(parameters = {})` | 7 |  |
| 877 | applyDracurougeRoundPhaseStart | `applyDracurougeRoundPhaseStart(phase, { tokens = {}, participants = [] } = {})` | 25 |  |

## 依存

- import → [[js.parameters.dice-draft.dice-draft-model]], [[js.parameters.dice-draft.dice-draft-roll]], [[js.parameters.dice-draft.dice-draft-use]], [[js.parameters.dracurouge-bond-box]], [[js.parameters.paramFactory]], [[js.parameters.sheet-source]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.read-only-form]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
