---
source: js/parameters/gcrest.js
lines: 1055
exports: 25
imported_by: 1
api_sha: da3b86b9d7c0
prose_sha: da3b86b9d7c0
generated: 2026-08-29
tags: [codemap]
---

# js/parameters/gcrest.js

<!-- prose:summary -->
グランクレスト戦記RPGのプラグイン記述子。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
このシステム固有の知識（属性・能力判定値と技能の対応・特技（魔法を種別で兼ねる）/部隊特技/アイテム/因縁/誓いの形・部隊の修正値）だけを持ち、一覧UIと使用処理は共通のスキル枠組み（[[js.parameters.skill.skill-model]] / [[js.parameters.skill.skill-box]] / [[js.parameters.skill.skill-use]]）に任せる。枠組みで書けない2つ、能力判定値の表示と部隊の1件レコードだけが専用のボックス（[[js.parameters.gcrest-ability-box]] / [[js.parameters.gcrest-unit-box]]）になっている。マスコンバット（部隊のMC）の使用制限は、runSkillUse を呼ぶ前に判定して弾く。Node からも読まれるので、トップレベルで DOM に触れない。
<!-- /prose:role -->

## export（25）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 39 | const | GCREST_CHAR_TYPES | `GCREST_CHAR_TYPES` |  |
| 69 | const | GCREST_SKILL_GROUPS | `GCREST_SKILL_GROUPS` | 能力判定値ごとの技能。 |
| 152 | const | GCREST_PARAMETERS | `GCREST_PARAMETERS` | 全パラメータをlocked:trueにしてある（＝利用者が消せず、既存のコマにも後から補完される）。 |
| 180 | fn | buildGcrestCharacterParameters | `buildGcrestCharacterParameters()` |  |
| 184 | const | GCREST_ROOM_PARAMETERS | `GCREST_ROOM_PARAMETERS` |  |
| 188 | fn | buildGcrestRoomParameters | `buildGcrestRoomParameters()` |  |
| 203 | fn | readGcrestCharType | `readGcrestCharType(parameters)` |  |
| 256 | const | GCREST_ART_SPEC | `GCREST_ART_SPEC` | 特技。 |
| 309 | fn | isGcrestSpell | `isGcrestSpell(skill)` | その1件が魔法か。 |
| 320 | const | GCREST_UNIT_ART_SPEC | `GCREST_UNIT_ART_SPEC` | 部隊特技。 |
| 341 | const | GCREST_ITEM_SPEC | `GCREST_ITEM_SPEC` | アイテム。 |
| 363 | const | GCREST_BOND_SPEC | `GCREST_BOND_SPEC` | 因縁。 |
| 377 | const | GCREST_OATH_SPEC | `GCREST_OATH_SPEC` | 誓い。 |
| 400 | const | UNIT_COMPONENT_KEY | `UNIT_COMPONENT_KEY` | ------------------------------------------------------------------ 部隊 --------------------------------------… |
| 407 | const | GCREST_UNIT_MOD_GROUPS | `GCREST_UNIT_MOD_GROUPS` | 修正値の入力欄。 |
| 435 | fn | normalizeGcrestUnit | `normalizeGcrestUnit(raw)` | 保存済みの部隊データを正規形へ揃える（欠けたキー・不正な値は既定へ落とす）。 |
| 450 | fn | readGcrestUnit | `readGcrestUnit(components)` |  |
| 459 | fn | syncGcrestUnitBuffs | `syncGcrestUnitBuffs({ unit, tokenId, dispatch, generateBuffId })` | 部隊の修正値を、自分へのバフとして貼り直す。 |
| 519 | fn | readGcrestArts | `readGcrestArts(components)` | ------------------------------------------------------------------ componentsの読み出し -------------------------… |
| 525 | fn | readGcrestUnitArts | `readGcrestUnitArts(components)` |  |
| 529 | fn | readGcrestItems | `readGcrestItems(components)` |  |
| 533 | fn | readGcrestBonds | `readGcrestBonds(components)` |  |
| 537 | fn | readGcrestOaths | `readGcrestOaths(components)` |  |
| 546 | fn | sumGcrestItemWeight | `sumGcrestItemWeight(items)` | 持ち物の重量の合計。 |
| 1034 | const | GCREST_PLUGIN | `GCREST_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（27）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 180 | buildGcrestCharacterParameters | `buildGcrestCharacterParameters()` | 3 | ✓ |
| 188 | buildGcrestRoomParameters | `buildGcrestRoomParameters()` | 3 | ✓ |
| 203 | readGcrestCharType | `readGcrestCharType(parameters)` | 4 | ✓ |
| 309 | isGcrestSpell | `isGcrestSpell(skill)` | 3 | ✓ |
| 314 | nounOf | `nounOf(skill)` | 3 |  |
| 435 | normalizeGcrestUnit | `normalizeGcrestUnit(raw)` | 14 | ✓ |
| 450 | readGcrestUnit | `readGcrestUnit(components)` | 3 | ✓ |
| 459 | syncGcrestUnitBuffs | `syncGcrestUnitBuffs({ unit, tokenId, dispatch, generateBuffId })` | 18 | ✓ |
| 479 | syncMoraleVisibility | `syncMoraleVisibility({ parameters, unit, tokenId, dispatch })` | 6 |  |
| 490 | describeMcBlock | `describeMcBlock(unit, skill)` | 9 |  |
| 508 | readLegacySpells | `readLegacySpells(components)` | 10 |  |
| 519 | readGcrestArts | `readGcrestArts(components)` | 5 | ✓ |
| 525 | readGcrestUnitArts | `readGcrestUnitArts(components)` | 3 | ✓ |
| 529 | readGcrestItems | `readGcrestItems(components)` | 3 | ✓ |
| 533 | readGcrestBonds | `readGcrestBonds(components)` | 3 | ✓ |
| 537 | readGcrestOaths | `readGcrestOaths(components)` | 3 | ✓ |
| 546 | sumGcrestItemWeight | `sumGcrestItemWeight(items)` | 7 | ✓ |
| 556 | computeGcrestDerivedParameters | `computeGcrestDerivedParameters(parameters, components = {})` | 5 |  |
| 566 | readFreeSkills | `readFreeSkills(parameters, free)` | 7 |  |
| 576 | buildAbilityGroups | `buildAbilityGroups(parameters)` | 18 |  |
| 597 | buildCombatRows | `buildCombatRows(parameters)` | 8 |  |
| 611 | buildFreeSkillParameter | `buildFreeSkillParameter(parameters, free, rawLabel)` | 20 |  |
| 640 | renameInitiativeToAction | `renameInitiativeToAction({ readParameters, dispatch, tokenId })` | 8 |  |
| 649 | renderGcrestCharacterPanel | `renderGcrestCharacterPanel({ container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents, getToken, generateBuffId, dispatch, tokenId, allowParameterEdit = false })` | **286** |  |
| 946 | looksLikeGcrestChatCommand | `looksLikeGcrestChatCommand(rawInput)` | 4 |  |
| 956 | handleGcrestChatCommand | `handleGcrestChatCommand(rawInput, { token, dispatch, getEffectiveParameterValue, generateBuffId })` | 64 |  |
| 1023 | resetGcrestComponentsOnPhaseEnd | `resetGcrestComponentsOnPhaseEnd(components, phase)` | 10 |  |

## 依存

- import → [[js.parameters.gcrest-ability-box]], [[js.parameters.gcrest-unit-box]], [[js.parameters.paramFactory]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.parameters.skill.skill-use]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
