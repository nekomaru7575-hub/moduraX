---
source: js/parameters/gcrest.js
lines: 986
exports: 27
imported_by: 1
api_sha: 85ffe05e4427
prose_sha: 85ffe05e4427
generated: 2026-08-29
tags: [codemap]
---

# js/parameters/gcrest.js

<!-- prose:summary -->
グランクレスト戦記RPGのプラグイン記述子。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
このシステム固有の知識（属性・能力判定値と技能の対応・特技/魔法/部隊特技/アイテム/因縁/誓いの形・部隊の修正値）だけを持ち、一覧UIと使用処理は共通のスキル枠組み（[[js.parameters.skill.skill-model]] / [[js.parameters.skill.skill-box]] / [[js.parameters.skill.skill-use]]）に任せる。枠組みで書けない2つ、能力判定値の表示と部隊の1件レコードだけが専用のボックス（[[js.parameters.gcrest-ability-box]] / [[js.parameters.gcrest-unit-box]]）になっている。マスコンバット（部隊のMC）の使用制限は、runSkillUse を呼ぶ前に判定して弾く。Node からも読まれるので、トップレベルで DOM に触れない。
<!-- /prose:role -->

## export（27）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 39 | const | GCREST_CHAR_TYPES | `GCREST_CHAR_TYPES` |  |
| 69 | const | GCREST_SKILL_GROUPS | `GCREST_SKILL_GROUPS` | 能力判定値ごとの技能。 |
| 152 | const | GCREST_PARAMETERS | `GCREST_PARAMETERS` | 全パラメータをlocked:trueにしてある（＝利用者が消せず、既存のコマにも後から補完される）。 |
| 180 | fn | buildGcrestCharacterParameters | `buildGcrestCharacterParameters()` |  |
| 184 | const | GCREST_ROOM_PARAMETERS | `GCREST_ROOM_PARAMETERS` |  |
| 188 | fn | buildGcrestRoomParameters | `buildGcrestRoomParameters()` |  |
| 203 | fn | readGcrestCharType | `readGcrestCharType(parameters)` |  |
| 244 | const | GCREST_ART_SPEC | `GCREST_ART_SPEC` | 特技。 |
| 274 | const | GCREST_SPELL_SPEC | `GCREST_SPELL_SPEC` | 魔法。 |
| 296 | const | GCREST_UNIT_ART_SPEC | `GCREST_UNIT_ART_SPEC` | 部隊特技。 |
| 317 | const | GCREST_ITEM_SPEC | `GCREST_ITEM_SPEC` | アイテム。 |
| 339 | const | GCREST_BOND_SPEC | `GCREST_BOND_SPEC` | 因縁。 |
| 353 | const | GCREST_OATH_SPEC | `GCREST_OATH_SPEC` | 誓い。 |
| 376 | const | UNIT_COMPONENT_KEY | `UNIT_COMPONENT_KEY` | ------------------------------------------------------------------ 部隊 --------------------------------------… |
| 383 | const | GCREST_UNIT_MOD_GROUPS | `GCREST_UNIT_MOD_GROUPS` | 修正値の入力欄。 |
| 411 | fn | normalizeGcrestUnit | `normalizeGcrestUnit(raw)` | 保存済みの部隊データを正規形へ揃える（欠けたキー・不正な値は既定へ落とす）。 |
| 426 | fn | readGcrestUnit | `readGcrestUnit(components)` |  |
| 435 | fn | syncGcrestUnitBuffs | `syncGcrestUnitBuffs({ unit, tokenId, dispatch, generateBuffId })` | 部隊の修正値を、自分へのバフとして貼り直す。 |
| 479 | fn | readGcrestArts | `readGcrestArts(components)` | ------------------------------------------------------------------ componentsの読み出し -------------------------… |
| 483 | fn | readGcrestSpells | `readGcrestSpells(components)` |  |
| 487 | fn | readGcrestUnitArts | `readGcrestUnitArts(components)` |  |
| 491 | fn | readGcrestItems | `readGcrestItems(components)` |  |
| 495 | fn | readGcrestBonds | `readGcrestBonds(components)` |  |
| 499 | fn | readGcrestOaths | `readGcrestOaths(components)` |  |
| 506 | fn | readGcrestUi | `readGcrestUi(components)` |  |
| 515 | fn | sumGcrestItemWeight | `sumGcrestItemWeight(items)` | 持ち物の重量の合計。 |
| 965 | const | GCREST_PLUGIN | `GCREST_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（26）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 180 | buildGcrestCharacterParameters | `buildGcrestCharacterParameters()` | 3 | ✓ |
| 188 | buildGcrestRoomParameters | `buildGcrestRoomParameters()` | 3 | ✓ |
| 203 | readGcrestCharType | `readGcrestCharType(parameters)` | 4 | ✓ |
| 411 | normalizeGcrestUnit | `normalizeGcrestUnit(raw)` | 14 | ✓ |
| 426 | readGcrestUnit | `readGcrestUnit(components)` | 3 | ✓ |
| 435 | syncGcrestUnitBuffs | `syncGcrestUnitBuffs({ unit, tokenId, dispatch, generateBuffId })` | 18 | ✓ |
| 455 | syncMoraleVisibility | `syncMoraleVisibility({ parameters, unit, tokenId, dispatch })` | 6 |  |
| 466 | describeMcBlock | `describeMcBlock(unit, skill)` | 9 |  |
| 479 | readGcrestArts | `readGcrestArts(components)` | 3 | ✓ |
| 483 | readGcrestSpells | `readGcrestSpells(components)` | 3 | ✓ |
| 487 | readGcrestUnitArts | `readGcrestUnitArts(components)` | 3 | ✓ |
| 491 | readGcrestItems | `readGcrestItems(components)` | 3 | ✓ |
| 495 | readGcrestBonds | `readGcrestBonds(components)` | 3 | ✓ |
| 499 | readGcrestOaths | `readGcrestOaths(components)` | 3 | ✓ |
| 506 | readGcrestUi | `readGcrestUi(components)` | 3 | ✓ |
| 515 | sumGcrestItemWeight | `sumGcrestItemWeight(items)` | 7 | ✓ |
| 525 | computeGcrestDerivedParameters | `computeGcrestDerivedParameters(parameters, components = {})` | 5 |  |
| 535 | readFreeSkills | `readFreeSkills(parameters, free)` | 7 |  |
| 545 | buildAbilityGroups | `buildAbilityGroups(parameters)` | 18 |  |
| 566 | buildCombatRows | `buildCombatRows(parameters)` | 8 |  |
| 580 | buildFreeSkillParameter | `buildFreeSkillParameter(parameters, free, rawLabel)` | 20 |  |
| 609 | renameInitiativeToAction | `renameInitiativeToAction({ readParameters, dispatch, tokenId })` | 8 |  |
| 618 | renderGcrestCharacterPanel | `renderGcrestCharacterPanel({ container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents, getToken, generateBuffId, dispatch, tokenId, allowParameterEdit = false })` | **252** |  |
| 880 | looksLikeGcrestChatCommand | `looksLikeGcrestChatCommand(rawInput)` | 6 |  |
| 892 | handleGcrestChatCommand | `handleGcrestChatCommand(rawInput, { token, dispatch, getEffectiveParameterValue, generateBuffId })` | 59 |  |
| 954 | resetGcrestComponentsOnPhaseEnd | `resetGcrestComponentsOnPhaseEnd(components, phase)` | 10 |  |

## 依存

- import → [[js.parameters.gcrest-ability-box]], [[js.parameters.gcrest-unit-box]], [[js.parameters.paramFactory]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.parameters.skill.skill-use]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
