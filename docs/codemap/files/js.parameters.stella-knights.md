---
source: js/parameters/stella-knights.js
lines: 244
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
| 229 | const | STELLA_KNIGHTS_PLUGIN | `STELLA_KNIGHTS_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（9）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 67 | buildStellaKnightsCharacterParameters | `buildStellaKnightsCharacterParameters()` | 3 |  |
| 84 | buildStellaKnightsRoomParameters | `buildStellaKnightsRoomParameters()` | 3 |  |
| 88 | computeStellaKnightsDerivedRoomParameters | `computeStellaKnightsDerivedRoomParameters(parameters, context = {})` | 8 |  |
| 97 | looksLikeStellaKnightsChatCommand | `looksLikeStellaKnightsChatCommand(rawInput)` | 3 |  |
| 101 | readFaceValue | `readFaceValue(parameters, face)` | 4 |  |
| 107 | readStellaKnightsSkills | `readStellaKnightsSkills(components)` | 3 |  |
| 111 | renderStellaKnightsCharacterPanel | `renderStellaKnightsCharacterPanel({ container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents })` | 83 |  |
| 198 | resetStellaKnightsComponentsOnPhaseEnd | `resetStellaKnightsComponentsOnPhaseEnd(components, phase)` | 7 |  |
| 210 | handleStellaKnightsChatCommand | `handleStellaKnightsChatCommand(rawInput, { token, dispatch, rollBCDice })` | 18 |  |

## 依存

- import → [[js.parameters.paramFactory]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
