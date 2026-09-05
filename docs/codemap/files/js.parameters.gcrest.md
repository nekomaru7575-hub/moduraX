---
source: js/parameters/gcrest.js
lines: 1644
exports: 32
imported_by: 1
api_sha: b2756353e225
prose_sha: b2756353e225
generated: 2026-09-05
tags: [codemap]
---

# js/parameters/gcrest.js

<!-- prose:summary -->
グランクレスト戦記RPGのプラグイン記述子。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
このシステム固有の知識（属性ごとの持ち物・能力判定値と技能の対応・特技（魔法を種別で兼ねる）/部隊特技/アイテム/因縁/誓いの形・部隊の修正値）だけを持ち、一覧UIと使用処理は共通のスキル枠組み（[[js.parameters.skill.skill-model]] / [[js.parameters.skill.skill-box]] / [[js.parameters.skill.skill-use]]）に任せる。枠組みで書けない2つ、能力判定値の表示と部隊の1件レコードだけが専用のボックス（[[js.parameters.gcrest-ability-box]] / [[js.parameters.gcrest-unit-box]]）になっている。マスコンバット（部隊のMC）の使用制限は、runSkillUse を呼ぶ前に判定して弾く。ゆとシート（ytsheet/gc）のJSONを読む対応表もここが持つ（importGcrestCharacterJson）。シートの綴りとこちらの綴りはどこも一致しないので（sttPerCheckTotal→SEN、armorTotalDefFire→defHeat、force1Str→mods.STR）、対応は test/gcrest-sheet.test.js で固定してある。装備（武器・防具・乗騎）は値を持つだけでパラメータを動かさない。例外は重量で、所持重量はアイテムと装備の合計から決まる。属性（PC/NPC/国/モブ）ごとの差は5つの対応表（GCREST_TYPE_VISIBLE_PARAM_IDS＝キャラクター一覧へ出す値、GCREST_TYPE_INPUT_PARAM_IDS＝パネルの手入力の行、GCREST_TYPE_READONLY_PARAM_IDS＝パネルへ直接出す editable:false の行、TYPE_COMBAT_PARAM_IDS＝能力ボックスの「戦闘・移動」に出す行、GCREST_TYPE_BOXES＝出すボックス）だけで表し、パネルはその表を描くだけにしてある（属性を切り替えるとその領域だけ描き直す）。表どうしの食い違い（一覧に出るのに入力口が無い等）は test/gcrest-type.test.js で止める。Node からも読まれるので、トップレベルで DOM に触れない。
<!-- /prose:role -->

## export（32）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 45 | const | GCREST_CHAR_TYPES | `GCREST_CHAR_TYPES` |  |
| 75 | const | GCREST_SKILL_GROUPS | `GCREST_SKILL_GROUPS` | 能力判定値ごとの技能。 |
| 163 | const | GCREST_PARAMETERS | `GCREST_PARAMETERS` | 全パラメータをlocked:trueにしてある（＝利用者が消せず、既存のコマにも後から補完される）。 |
| 195 | fn | buildGcrestCharacterParameters | `buildGcrestCharacterParameters()` |  |
| 199 | const | GCREST_ROOM_PARAMETERS | `GCREST_ROOM_PARAMETERS` |  |
| 203 | fn | buildGcrestRoomParameters | `buildGcrestRoomParameters()` |  |
| 211 | const | GCREST_TYPE_VISIBLE_PARAM_IDS | `GCREST_TYPE_VISIBLE_PARAM_IDS` | 属性ごとに、キャラクター一覧へ出すパラメータ。 |
| 222 | const | GCREST_TYPE_INPUT_PARAM_IDS | `GCREST_TYPE_INPUT_PARAM_IDS` | 属性ごとに、パネルへ並べる手入力の行（editable:trueの値だけ）。 |
| 233 | const | GCREST_TYPE_READONLY_PARAM_IDS | `GCREST_TYPE_READONLY_PARAM_IDS` | 属性ごとに、パネルへ並べる editable:false の値。 |
| 251 | const | GCREST_TYPE_BOXES | `GCREST_TYPE_BOXES` | 属性ごとに出すボックス。 |
| 264 | fn | readGcrestCharType | `readGcrestCharType(parameters)` |  |
| 317 | const | GCREST_ART_SPEC | `GCREST_ART_SPEC` | 特技。 |
| 371 | fn | isGcrestSpell | `isGcrestSpell(skill)` | その1件が魔法か。 |
| 382 | const | GCREST_UNIT_ART_SPEC | `GCREST_UNIT_ART_SPEC` | 部隊特技。 |
| 403 | const | GCREST_ITEM_SPEC | `GCREST_ITEM_SPEC` | アイテム。 |
| 449 | const | GCREST_EQUIPMENT_SPEC | `GCREST_EQUIPMENT_SPEC` |  |
| 520 | const | GCREST_BOND_SPEC | `GCREST_BOND_SPEC` | 因縁。 |
| 534 | const | GCREST_OATH_SPEC | `GCREST_OATH_SPEC` | 誓い。 |
| 557 | const | UNIT_COMPONENT_KEY | `UNIT_COMPONENT_KEY` | ------------------------------------------------------------------ 部隊 --------------------------------------… |
| 564 | const | GCREST_UNIT_MOD_GROUPS | `GCREST_UNIT_MOD_GROUPS` | 修正値の入力欄。 |
| 599 | fn | normalizeGcrestUnit | `normalizeGcrestUnit(raw)` | 保存済みの部隊データを正規形へ揃える（欠けたキー・不正な値は既定へ落とす）。 |
| 614 | fn | readGcrestUnit | `readGcrestUnit(components)` |  |
| 623 | fn | syncGcrestUnitBuffs | `syncGcrestUnitBuffs({ unit, tokenId, dispatch, generateBuffId })` | 部隊の修正値を、自分へのバフとして貼り直す。 |
| 683 | fn | readGcrestArts | `readGcrestArts(components)` | ------------------------------------------------------------------ componentsの読み出し -------------------------… |
| 689 | fn | readGcrestUnitArts | `readGcrestUnitArts(components)` |  |
| 693 | fn | readGcrestEquipment | `readGcrestEquipment(components)` |  |
| 699 | fn | readGcrestItems | `readGcrestItems(components)` |  |
| 703 | fn | readGcrestBonds | `readGcrestBonds(components)` |  |
| 707 | fn | readGcrestOaths | `readGcrestOaths(components)` |  |
| 716 | fn | sumGcrestItemWeight | `sumGcrestItemWeight(items)` | 持ち物の重量の合計。 |
| 1577 | fn | importGcrestCharacterJson | `importGcrestCharacterJson(json)` | ゆとシートのJSONを取り込む。 |
| 1622 | const | GCREST_PLUGIN | `GCREST_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（39）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 195 | buildGcrestCharacterParameters | `buildGcrestCharacterParameters()` | 3 | ✓ |
| 203 | buildGcrestRoomParameters | `buildGcrestRoomParameters()` | 3 | ✓ |
| 264 | readGcrestCharType | `readGcrestCharType(parameters)` | 4 | ✓ |
| 371 | isGcrestSpell | `isGcrestSpell(skill)` | 3 | ✓ |
| 376 | nounOf | `nounOf(skill)` | 3 |  |
| 599 | normalizeGcrestUnit | `normalizeGcrestUnit(raw)` | 14 | ✓ |
| 614 | readGcrestUnit | `readGcrestUnit(components)` | 3 | ✓ |
| 623 | syncGcrestUnitBuffs | `syncGcrestUnitBuffs({ unit, tokenId, dispatch, generateBuffId })` | 18 | ✓ |
| 643 | syncMoraleVisibility | `syncMoraleVisibility({ parameters, unit, tokenId, dispatch })` | 6 |  |
| 654 | describeMcBlock | `describeMcBlock(unit, skill)` | 9 |  |
| 672 | readLegacySpells | `readLegacySpells(components)` | 10 |  |
| 683 | readGcrestArts | `readGcrestArts(components)` | 5 | ✓ |
| 689 | readGcrestUnitArts | `readGcrestUnitArts(components)` | 3 | ✓ |
| 693 | readGcrestEquipment | `readGcrestEquipment(components)` | 5 | ✓ |
| 699 | readGcrestItems | `readGcrestItems(components)` | 3 | ✓ |
| 703 | readGcrestBonds | `readGcrestBonds(components)` | 3 | ✓ |
| 707 | readGcrestOaths | `readGcrestOaths(components)` | 3 | ✓ |
| 716 | sumGcrestItemWeight | `sumGcrestItemWeight(items)` | 7 | ✓ |
| 731 | computeGcrestDerivedParameters | `computeGcrestDerivedParameters(parameters, components = {})` | 7 |  |
| 743 | readFreeSkills | `readFreeSkills(parameters, free)` | 7 |  |
| 753 | buildAbilityGroups | `buildAbilityGroups(parameters)` | 18 |  |
| 778 | buildCombatGroups | `buildCombatGroups(parameters, charType = CHAR_TYPE_PC)` | 28 |  |
| 812 | buildFreeSkillParameter | `buildFreeSkillParameter(parameters, free, rawLabel)` | 20 |  |
| 841 | renameInitiativeToAction | `renameInitiativeToAction({ readParameters, dispatch, tokenId })` | 8 |  |
| 850 | renderGcrestCharacterPanel | `renderGcrestCharacterPanel({ container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents, getToken, generateBuffId, dispatch, tokenId, allowParameterEdit = false })` | **351** |  |
| 1212 | looksLikeGcrestChatCommand | `looksLikeGcrestChatCommand(rawInput)` | 4 |  |
| 1222 | handleGcrestChatCommand | `handleGcrestChatCommand(rawInput, { token, dispatch, getEffectiveParameterValue, generateBuffId })` | 64 |  |
| 1289 | resetGcrestComponentsOnPhaseEnd | `resetGcrestComponentsOnPhaseEnd(components, phase)` | 10 |  |
| 1362 | looksLikeGcrestSheet | `looksLikeGcrestSheet(json)` | 5 |  |
| 1369 | isSheetBlank | `isSheetBlank(text)` | 3 |  |
| 1378 | readSheetArtCost | `readSheetArtCost(raw)` | 9 |  |
| 1389 | readSheetMc | `readSheetMc(raw)` | 4 |  |
| 1398 | readSheetArt | `readSheetArt(json, prefix, index)` | 25 |  |
| 1424 | readSheetArts | `readSheetArts(json)` | 10 |  |
| 1435 | readSheetItems | `readSheetItems(json)` | 14 |  |
| 1451 | readSheetEquipment | `readSheetEquipment(json)` | 60 |  |
| 1517 | readSheetUnit | `readSheetUnit(json)` | 9 |  |
| 1531 | readSheetSkills | `readSheetSkills(json)` | 40 |  |
| 1577 | importGcrestCharacterJson | `importGcrestCharacterJson(json)` | 44 | ✓ |

## 依存

- import → [[js.parameters.gcrest-ability-box]], [[js.parameters.gcrest-unit-box]], [[js.parameters.paramFactory]], [[js.parameters.sheet-source]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.parameters.skill.skill-use]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
