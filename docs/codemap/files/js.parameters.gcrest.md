---
source: js/parameters/gcrest.js
lines: 1503
exports: 28
imported_by: 1
api_sha: cbc927a0759b
prose_sha: cbc927a0759b
generated: 2026-09-01
tags: [codemap]
---

# js/parameters/gcrest.js

<!-- prose:summary -->
グランクレスト戦記RPGのプラグイン記述子。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
このシステム固有の知識（属性・能力判定値と技能の対応・特技（魔法を種別で兼ねる）/部隊特技/アイテム/因縁/誓いの形・部隊の修正値）だけを持ち、一覧UIと使用処理は共通のスキル枠組み（[[js.parameters.skill.skill-model]] / [[js.parameters.skill.skill-box]] / [[js.parameters.skill.skill-use]]）に任せる。枠組みで書けない2つ、能力判定値の表示と部隊の1件レコードだけが専用のボックス（[[js.parameters.gcrest-ability-box]] / [[js.parameters.gcrest-unit-box]]）になっている。マスコンバット（部隊のMC）の使用制限は、runSkillUse を呼ぶ前に判定して弾く。ゆとシート（ytsheet/gc）のJSONを読む対応表もここが持つ（importGcrestCharacterJson）。シートの綴りとこちらの綴りはどこも一致しないので（sttPerCheckTotal→SEN、armorTotalDefFire→defHeat、force1Str→mods.STR）、対応は test/gcrest-sheet.test.js で固定してある。装備（武器・防具・乗騎）は値を持つだけでパラメータを動かさない。例外は重量で、所持重量はアイテムと装備の合計から決まる。Node からも読まれるので、トップレベルで DOM に触れない。
<!-- /prose:role -->

## export（28）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 40 | const | GCREST_CHAR_TYPES | `GCREST_CHAR_TYPES` |  |
| 70 | const | GCREST_SKILL_GROUPS | `GCREST_SKILL_GROUPS` | 能力判定値ごとの技能。 |
| 155 | const | GCREST_PARAMETERS | `GCREST_PARAMETERS` | 全パラメータをlocked:trueにしてある（＝利用者が消せず、既存のコマにも後から補完される）。 |
| 183 | fn | buildGcrestCharacterParameters | `buildGcrestCharacterParameters()` |  |
| 187 | const | GCREST_ROOM_PARAMETERS | `GCREST_ROOM_PARAMETERS` |  |
| 191 | fn | buildGcrestRoomParameters | `buildGcrestRoomParameters()` |  |
| 206 | fn | readGcrestCharType | `readGcrestCharType(parameters)` |  |
| 259 | const | GCREST_ART_SPEC | `GCREST_ART_SPEC` | 特技。 |
| 313 | fn | isGcrestSpell | `isGcrestSpell(skill)` | その1件が魔法か。 |
| 324 | const | GCREST_UNIT_ART_SPEC | `GCREST_UNIT_ART_SPEC` | 部隊特技。 |
| 345 | const | GCREST_ITEM_SPEC | `GCREST_ITEM_SPEC` | アイテム。 |
| 391 | const | GCREST_EQUIPMENT_SPEC | `GCREST_EQUIPMENT_SPEC` |  |
| 462 | const | GCREST_BOND_SPEC | `GCREST_BOND_SPEC` | 因縁。 |
| 476 | const | GCREST_OATH_SPEC | `GCREST_OATH_SPEC` | 誓い。 |
| 499 | const | UNIT_COMPONENT_KEY | `UNIT_COMPONENT_KEY` | ------------------------------------------------------------------ 部隊 --------------------------------------… |
| 506 | const | GCREST_UNIT_MOD_GROUPS | `GCREST_UNIT_MOD_GROUPS` | 修正値の入力欄。 |
| 541 | fn | normalizeGcrestUnit | `normalizeGcrestUnit(raw)` | 保存済みの部隊データを正規形へ揃える（欠けたキー・不正な値は既定へ落とす）。 |
| 556 | fn | readGcrestUnit | `readGcrestUnit(components)` |  |
| 565 | fn | syncGcrestUnitBuffs | `syncGcrestUnitBuffs({ unit, tokenId, dispatch, generateBuffId })` | 部隊の修正値を、自分へのバフとして貼り直す。 |
| 625 | fn | readGcrestArts | `readGcrestArts(components)` | ------------------------------------------------------------------ componentsの読み出し -------------------------… |
| 631 | fn | readGcrestUnitArts | `readGcrestUnitArts(components)` |  |
| 635 | fn | readGcrestEquipment | `readGcrestEquipment(components)` |  |
| 641 | fn | readGcrestItems | `readGcrestItems(components)` |  |
| 645 | fn | readGcrestBonds | `readGcrestBonds(components)` |  |
| 649 | fn | readGcrestOaths | `readGcrestOaths(components)` |  |
| 658 | fn | sumGcrestItemWeight | `sumGcrestItemWeight(items)` | 持ち物の重量の合計。 |
| 1436 | fn | importGcrestCharacterJson | `importGcrestCharacterJson(json)` | ゆとシートのJSONを取り込む。 |
| 1481 | const | GCREST_PLUGIN | `GCREST_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（39）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 183 | buildGcrestCharacterParameters | `buildGcrestCharacterParameters()` | 3 | ✓ |
| 191 | buildGcrestRoomParameters | `buildGcrestRoomParameters()` | 3 | ✓ |
| 206 | readGcrestCharType | `readGcrestCharType(parameters)` | 4 | ✓ |
| 313 | isGcrestSpell | `isGcrestSpell(skill)` | 3 | ✓ |
| 318 | nounOf | `nounOf(skill)` | 3 |  |
| 541 | normalizeGcrestUnit | `normalizeGcrestUnit(raw)` | 14 | ✓ |
| 556 | readGcrestUnit | `readGcrestUnit(components)` | 3 | ✓ |
| 565 | syncGcrestUnitBuffs | `syncGcrestUnitBuffs({ unit, tokenId, dispatch, generateBuffId })` | 18 | ✓ |
| 585 | syncMoraleVisibility | `syncMoraleVisibility({ parameters, unit, tokenId, dispatch })` | 6 |  |
| 596 | describeMcBlock | `describeMcBlock(unit, skill)` | 9 |  |
| 614 | readLegacySpells | `readLegacySpells(components)` | 10 |  |
| 625 | readGcrestArts | `readGcrestArts(components)` | 5 | ✓ |
| 631 | readGcrestUnitArts | `readGcrestUnitArts(components)` | 3 | ✓ |
| 635 | readGcrestEquipment | `readGcrestEquipment(components)` | 5 | ✓ |
| 641 | readGcrestItems | `readGcrestItems(components)` | 3 | ✓ |
| 645 | readGcrestBonds | `readGcrestBonds(components)` | 3 | ✓ |
| 649 | readGcrestOaths | `readGcrestOaths(components)` | 3 | ✓ |
| 658 | sumGcrestItemWeight | `sumGcrestItemWeight(items)` | 7 | ✓ |
| 673 | computeGcrestDerivedParameters | `computeGcrestDerivedParameters(parameters, components = {})` | 7 |  |
| 685 | readFreeSkills | `readFreeSkills(parameters, free)` | 7 |  |
| 695 | buildAbilityGroups | `buildAbilityGroups(parameters)` | 18 |  |
| 720 | buildCombatGroups | `buildCombatGroups(parameters)` | 24 |  |
| 750 | buildFreeSkillParameter | `buildFreeSkillParameter(parameters, free, rawLabel)` | 20 |  |
| 779 | renameInitiativeToAction | `renameInitiativeToAction({ readParameters, dispatch, tokenId })` | 8 |  |
| 788 | renderGcrestCharacterPanel | `renderGcrestCharacterPanel({ container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents, getToken, generateBuffId, dispatch, tokenId, allowParameterEdit = false })` | **272** |  |
| 1071 | looksLikeGcrestChatCommand | `looksLikeGcrestChatCommand(rawInput)` | 4 |  |
| 1081 | handleGcrestChatCommand | `handleGcrestChatCommand(rawInput, { token, dispatch, getEffectiveParameterValue, generateBuffId })` | 64 |  |
| 1148 | resetGcrestComponentsOnPhaseEnd | `resetGcrestComponentsOnPhaseEnd(components, phase)` | 10 |  |
| 1221 | looksLikeGcrestSheet | `looksLikeGcrestSheet(json)` | 5 |  |
| 1228 | isSheetBlank | `isSheetBlank(text)` | 3 |  |
| 1237 | readSheetArtCost | `readSheetArtCost(raw)` | 9 |  |
| 1248 | readSheetMc | `readSheetMc(raw)` | 4 |  |
| 1257 | readSheetArt | `readSheetArt(json, prefix, index)` | 25 |  |
| 1283 | readSheetArts | `readSheetArts(json)` | 10 |  |
| 1294 | readSheetItems | `readSheetItems(json)` | 14 |  |
| 1310 | readSheetEquipment | `readSheetEquipment(json)` | 60 |  |
| 1376 | readSheetUnit | `readSheetUnit(json)` | 9 |  |
| 1390 | readSheetSkills | `readSheetSkills(json)` | 40 |  |
| 1436 | importGcrestCharacterJson | `importGcrestCharacterJson(json)` | 44 | ✓ |

## 依存

- import → [[js.parameters.gcrest-ability-box]], [[js.parameters.gcrest-unit-box]], [[js.parameters.paramFactory]], [[js.parameters.sheet-source]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.parameters.skill.skill-use]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
