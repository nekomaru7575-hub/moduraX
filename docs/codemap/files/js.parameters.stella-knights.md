---
source: js/parameters/stella-knights.js
lines: 287
exports: 1
imported_by: 1
api_sha: 3241cc3cfb34
prose_sha: 3241cc3cfb34
generated: 2026-08-14
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
| 273 | const | STELLA_KNIGHTS_PLUGIN | `STELLA_KNIGHTS_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（11）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 46 | buildStellaKnightsCharacterParameters | `buildStellaKnightsCharacterParameters()` | 3 |  |
| 63 | buildStellaKnightsRoomParameters | `buildStellaKnightsRoomParameters()` | 3 |  |
| 67 | computeStellaKnightsDerivedRoomParameters | `computeStellaKnightsDerivedRoomParameters(parameters, context = {})` | 8 |  |
| 76 | looksLikeStellaKnightsChatCommand | `looksLikeStellaKnightsChatCommand(rawInput)` | 3 |  |
| 80 | countFaces | `countFaces(diceValues)` | 9 |  |
| 90 | readFaceValue | `readFaceValue(parameters, face)` | 4 |  |
| 96 | readStellaKnightsSkills | `readStellaKnightsSkills(components)` | 3 |  |
| 100 | renderStellaKnightsCharacterPanel | `renderStellaKnightsCharacterPanel({ container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents })` | 83 |  |
| 187 | resetStellaKnightsComponentsOnPhaseEnd | `resetStellaKnightsComponentsOnPhaseEnd(components, phase)` | 7 |  |
| 195 | buildChargeLines | `buildChargeLines(token, counts, dispatch)` | 16 |  |
| 212 | handleStellaKnightsChatCommand | `handleStellaKnightsChatCommand(rawInput, { token, dispatch, rollBCDice })` | 60 |  |

## 依存

- import → [[js.dice-notation]], [[js.parameters.paramFactory]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
