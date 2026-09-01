---
source: js/parameters/stella-knights.js
lines: 531
exports: 1
imported_by: 1
api_sha: 3241cc3cfb34
prose_sha: 3241cc3cfb34
generated: 2026-09-01
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
| 511 | const | STELLA_KNIGHTS_PLUGIN | `STELLA_KNIGHTS_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（13）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 117 | buildStellaKnightsCharacterParameters | `buildStellaKnightsCharacterParameters()` | 3 |  |
| 141 | buildStellaKnightsRoomParameters | `buildStellaKnightsRoomParameters()` | 3 |  |
| 145 | computeStellaKnightsDerivedRoomParameters | `computeStellaKnightsDerivedRoomParameters(parameters, context = {})` | 8 |  |
| 154 | looksLikeStellaKnightsChatCommand | `looksLikeStellaKnightsChatCommand(rawInput)` | 9 |  |
| 165 | readStellaKnightsSkills | `readStellaKnightsSkills(components)` | 3 |  |
| 169 | renderStellaKnightsCharacterPanel | `renderStellaKnightsCharacterPanel({ container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents })` | 89 |  |
| 262 | resetStellaKnightsComponentsOnPhaseEnd | `resetStellaKnightsComponentsOnPhaseEnd(components, phase)` | 7 |  |
| 276 | runPetitLucky | `runPetitLucky(input, { token, dispatch })` | 54 |  |
| 341 | runBouquetSpend | `runBouquetSpend(input, { token, dispatch })` | 50 |  |
| 395 | readImplicitChargeCount | `readImplicitChargeCount(token, roomParameters, getEffectiveParameterValue)` | 10 |  |
| 409 | handleStellaKnightsChatCommand | `handleStellaKnightsChatCommand( rawInput, { token, dispatch, rollBCDice, getEffectiveParameterValue, roomParameters } )` | 26 |  |
| 463 | importStellaKnightsSkillsFromSheet | `importStellaKnightsSkillsFromSheet(json)` | 12 |  |
| 482 | importStellaKnightsCharacterJson | `importStellaKnightsCharacterJson(json)` | 28 |  |

## 依存

- import → [[js.parameters.dice-draft.dice-draft-model]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.dice-draft.dice-draft-roll]], [[js.parameters.paramFactory]], [[js.parameters.sheet-source]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
