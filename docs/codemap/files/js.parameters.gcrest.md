---
source: js/parameters/gcrest.js
lines: 1070
exports: 25
imported_by: 1
api_sha: da3b86b9d7c0
prose_sha: da3b86b9d7c0
generated: 2026-08-30
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
| 155 | const | GCREST_PARAMETERS | `GCREST_PARAMETERS` | 全パラメータをlocked:trueにしてある（＝利用者が消せず、既存のコマにも後から補完される）。 |
| 183 | fn | buildGcrestCharacterParameters | `buildGcrestCharacterParameters()` |  |
| 187 | const | GCREST_ROOM_PARAMETERS | `GCREST_ROOM_PARAMETERS` |  |
| 191 | fn | buildGcrestRoomParameters | `buildGcrestRoomParameters()` |  |
| 206 | fn | readGcrestCharType | `readGcrestCharType(parameters)` |  |
| 259 | const | GCREST_ART_SPEC | `GCREST_ART_SPEC` | 特技。 |
| 312 | fn | isGcrestSpell | `isGcrestSpell(skill)` | その1件が魔法か。 |
| 323 | const | GCREST_UNIT_ART_SPEC | `GCREST_UNIT_ART_SPEC` | 部隊特技。 |
| 344 | const | GCREST_ITEM_SPEC | `GCREST_ITEM_SPEC` | アイテム。 |
| 366 | const | GCREST_BOND_SPEC | `GCREST_BOND_SPEC` | 因縁。 |
| 380 | const | GCREST_OATH_SPEC | `GCREST_OATH_SPEC` | 誓い。 |
| 403 | const | UNIT_COMPONENT_KEY | `UNIT_COMPONENT_KEY` | ------------------------------------------------------------------ 部隊 --------------------------------------… |
| 410 | const | GCREST_UNIT_MOD_GROUPS | `GCREST_UNIT_MOD_GROUPS` | 修正値の入力欄。 |
| 445 | fn | normalizeGcrestUnit | `normalizeGcrestUnit(raw)` | 保存済みの部隊データを正規形へ揃える（欠けたキー・不正な値は既定へ落とす）。 |
| 460 | fn | readGcrestUnit | `readGcrestUnit(components)` |  |
| 469 | fn | syncGcrestUnitBuffs | `syncGcrestUnitBuffs({ unit, tokenId, dispatch, generateBuffId })` | 部隊の修正値を、自分へのバフとして貼り直す。 |
| 529 | fn | readGcrestArts | `readGcrestArts(components)` | ------------------------------------------------------------------ componentsの読み出し -------------------------… |
| 535 | fn | readGcrestUnitArts | `readGcrestUnitArts(components)` |  |
| 539 | fn | readGcrestItems | `readGcrestItems(components)` |  |
| 543 | fn | readGcrestBonds | `readGcrestBonds(components)` |  |
| 547 | fn | readGcrestOaths | `readGcrestOaths(components)` |  |
| 556 | fn | sumGcrestItemWeight | `sumGcrestItemWeight(items)` | 持ち物の重量の合計。 |
| 1049 | const | GCREST_PLUGIN | `GCREST_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（27）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 183 | buildGcrestCharacterParameters | `buildGcrestCharacterParameters()` | 3 | ✓ |
| 191 | buildGcrestRoomParameters | `buildGcrestRoomParameters()` | 3 | ✓ |
| 206 | readGcrestCharType | `readGcrestCharType(parameters)` | 4 | ✓ |
| 312 | isGcrestSpell | `isGcrestSpell(skill)` | 3 | ✓ |
| 317 | nounOf | `nounOf(skill)` | 3 |  |
| 445 | normalizeGcrestUnit | `normalizeGcrestUnit(raw)` | 14 | ✓ |
| 460 | readGcrestUnit | `readGcrestUnit(components)` | 3 | ✓ |
| 469 | syncGcrestUnitBuffs | `syncGcrestUnitBuffs({ unit, tokenId, dispatch, generateBuffId })` | 18 | ✓ |
| 489 | syncMoraleVisibility | `syncMoraleVisibility({ parameters, unit, tokenId, dispatch })` | 6 |  |
| 500 | describeMcBlock | `describeMcBlock(unit, skill)` | 9 |  |
| 518 | readLegacySpells | `readLegacySpells(components)` | 10 |  |
| 529 | readGcrestArts | `readGcrestArts(components)` | 5 | ✓ |
| 535 | readGcrestUnitArts | `readGcrestUnitArts(components)` | 3 | ✓ |
| 539 | readGcrestItems | `readGcrestItems(components)` | 3 | ✓ |
| 543 | readGcrestBonds | `readGcrestBonds(components)` | 3 | ✓ |
| 547 | readGcrestOaths | `readGcrestOaths(components)` | 3 | ✓ |
| 556 | sumGcrestItemWeight | `sumGcrestItemWeight(items)` | 7 | ✓ |
| 566 | computeGcrestDerivedParameters | `computeGcrestDerivedParameters(parameters, components = {})` | 5 |  |
| 576 | readFreeSkills | `readFreeSkills(parameters, free)` | 7 |  |
| 586 | buildAbilityGroups | `buildAbilityGroups(parameters)` | 18 |  |
| 611 | buildCombatGroups | `buildCombatGroups(parameters)` | 24 |  |
| 641 | buildFreeSkillParameter | `buildFreeSkillParameter(parameters, free, rawLabel)` | 20 |  |
| 670 | renameInitiativeToAction | `renameInitiativeToAction({ readParameters, dispatch, tokenId })` | 8 |  |
| 679 | renderGcrestCharacterPanel | `renderGcrestCharacterPanel({ container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents, getToken, generateBuffId, dispatch, tokenId, allowParameterEdit = false })` | **271** |  |
| 961 | looksLikeGcrestChatCommand | `looksLikeGcrestChatCommand(rawInput)` | 4 |  |
| 971 | handleGcrestChatCommand | `handleGcrestChatCommand(rawInput, { token, dispatch, getEffectiveParameterValue, generateBuffId })` | 64 |  |
| 1038 | resetGcrestComponentsOnPhaseEnd | `resetGcrestComponentsOnPhaseEnd(components, phase)` | 10 |  |

## 依存

- import → [[js.parameters.gcrest-ability-box]], [[js.parameters.gcrest-unit-box]], [[js.parameters.paramFactory]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.parameters.skill.skill-use]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
