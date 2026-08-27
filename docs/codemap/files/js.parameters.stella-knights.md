---
source: js/parameters/stella-knights.js
lines: 553
exports: 1
imported_by: 1
api_sha: 3241cc3cfb34
prose_sha: 3241cc3cfb34
generated: 2026-08-27
tags: [codemap]
---

# js/parameters/stella-knights.js

<!-- prose:summary -->
_(未記入)_
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 533 | const | STELLA_KNIGHTS_PLUGIN | `STELLA_KNIGHTS_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（15）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 116 | buildStellaKnightsCharacterParameters | `buildStellaKnightsCharacterParameters()` | 3 |  |
| 140 | buildStellaKnightsRoomParameters | `buildStellaKnightsRoomParameters()` | 3 |  |
| 144 | computeStellaKnightsDerivedRoomParameters | `computeStellaKnightsDerivedRoomParameters(parameters, context = {})` | 8 |  |
| 153 | looksLikeStellaKnightsChatCommand | `looksLikeStellaKnightsChatCommand(rawInput)` | 9 |  |
| 164 | readStellaKnightsSkills | `readStellaKnightsSkills(components)` | 3 |  |
| 168 | renderStellaKnightsCharacterPanel | `renderStellaKnightsCharacterPanel({ container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents })` | 89 |  |
| 261 | resetStellaKnightsComponentsOnPhaseEnd | `resetStellaKnightsComponentsOnPhaseEnd(components, phase)` | 7 |  |
| 275 | runPetitLucky | `runPetitLucky(input, { token, dispatch })` | 54 |  |
| 340 | runBouquetSpend | `runBouquetSpend(input, { token, dispatch })` | 50 |  |
| 394 | readImplicitChargeCount | `readImplicitChargeCount(token, roomParameters, getEffectiveParameterValue)` | 10 |  |
| 408 | handleStellaKnightsChatCommand | `handleStellaKnightsChatCommand( rawInput, { token, dispatch, rollBCDice, getEffectiveParameterValue, roomParameters } )` | 26 |  |
| 464 | sheetText | `sheetText(value)` | 3 |  |
| 469 | assignSheetNumber | `assignSheetNumber(target, paramId, raw)` | 5 |  |
| 485 | importStellaKnightsSkillsFromSheet | `importStellaKnightsSkillsFromSheet(json)` | 12 |  |
| 504 | importStellaKnightsCharacterJson | `importStellaKnightsCharacterJson(json)` | 28 |  |

## 依存

- import → [[js.parameters.dice-draft.dice-draft-model]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.dice-draft.dice-draft-roll]], [[js.parameters.paramFactory]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
