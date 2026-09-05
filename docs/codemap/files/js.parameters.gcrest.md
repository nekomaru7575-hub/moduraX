---
source: js/parameters/gcrest.js
lines: 1700
exports: 33
imported_by: 1
api_sha: 391c6543cc2a
prose_sha: 391c6543cc2a
generated: 2026-09-05
tags: [codemap]
---

# js/parameters/gcrest.js

<!-- prose:summary -->
グランクレスト戦記RPGのプラグイン記述子。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
このシステム固有の知識（属性ごとの持ち物・能力判定値と技能の対応・特技（魔法を種別で兼ねる）/部隊特技/アイテム/因縁/誓いの形・部隊の修正値）だけを持ち、一覧UIと使用処理は共通のスキル枠組み（[[js.parameters.skill.skill-model]] / [[js.parameters.skill.skill-box]] / [[js.parameters.skill.skill-use]]）に任せる。枠組みで書けない2つ、能力判定値の表示と部隊の1件レコードだけが専用のボックス（[[js.parameters.gcrest-ability-box]] / [[js.parameters.gcrest-unit-box]]）になっている。マスコンバット（部隊のMC）の使用制限は、runSkillUse を呼ぶ前に判定して弾く。ゆとシート（ytsheet/gc）のJSONを読む対応表もここが持つ（importGcrestCharacterJson）。シートの綴りとこちらの綴りはどこも一致しないので（sttPerCheckTotal→SEN、armorTotalDefFire→defHeat、force1Str→mods.STR）、対応は test/gcrest-sheet.test.js で固定してある。装備（武器・防具・乗騎）は値を持つだけでパラメータを動かさない。例外は重量で、所持重量はアイテムと装備の合計から決まる。属性（PC/NPC/国/モブ）ごとの差は5つの対応表（GCREST_TYPE_VISIBLE_PARAM_IDS＝キャラクター一覧へ出す値、GCREST_TYPE_INPUT_PARAM_IDS＝パネルの手入力の行、GCREST_TYPE_READONLY_GROUPS＝パネルへ直接出す editable:false の行（4つで1組の防御力は能力ボックスと同じ横一列に畳む。平らにした GCREST_TYPE_READONLY_PARAM_IDS はここから導く）、TYPE_COMBAT_PARAM_IDS＝能力ボックスの「戦闘・移動」に出す行、GCREST_TYPE_BOXES＝出すボックス）だけで表し、パネルはその表を描くだけにしてある（属性を切り替えるとその領域だけ描き直す）。表どうしの食い違い（一覧に出るのに入力口が無い等）は test/gcrest-type.test.js で止める。Node からも読まれるので、トップレベルで DOM に触れない。
<!-- /prose:role -->

## export（33）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 48 | const | GCREST_CHAR_TYPES | `GCREST_CHAR_TYPES` |  |
| 78 | const | GCREST_SKILL_GROUPS | `GCREST_SKILL_GROUPS` | 能力判定値ごとの技能。 |
| 168 | const | GCREST_PARAMETERS | `GCREST_PARAMETERS` | 全パラメータをlocked:trueにしてある（＝利用者が消せず、既存のコマにも後から補完される）。 |
| 200 | fn | buildGcrestCharacterParameters | `buildGcrestCharacterParameters()` |  |
| 204 | const | GCREST_ROOM_PARAMETERS | `GCREST_ROOM_PARAMETERS` |  |
| 208 | fn | buildGcrestRoomParameters | `buildGcrestRoomParameters()` |  |
| 216 | const | GCREST_TYPE_VISIBLE_PARAM_IDS | `GCREST_TYPE_VISIBLE_PARAM_IDS` | 属性ごとに、キャラクター一覧へ出すパラメータ。 |
| 227 | const | GCREST_TYPE_INPUT_PARAM_IDS | `GCREST_TYPE_INPUT_PARAM_IDS` | 属性ごとに、パネルへ並べる手入力の行（editable:trueの値だけ）。 |
| 242 | const | GCREST_TYPE_READONLY_GROUPS | `GCREST_TYPE_READONLY_GROUPS` | 属性ごとに、パネルへ並べる editable:false の値。 |
| 255 | const | GCREST_TYPE_READONLY_PARAM_IDS | `GCREST_TYPE_READONLY_PARAM_IDS` | 上の表を平らにしたもの（属性 → paramId[]）。 |
| 270 | const | GCREST_TYPE_BOXES | `GCREST_TYPE_BOXES` | 属性ごとに出すボックス。 |
| 283 | fn | readGcrestCharType | `readGcrestCharType(parameters)` |  |
| 336 | const | GCREST_ART_SPEC | `GCREST_ART_SPEC` | 特技。 |
| 390 | fn | isGcrestSpell | `isGcrestSpell(skill)` | その1件が魔法か。 |
| 401 | const | GCREST_UNIT_ART_SPEC | `GCREST_UNIT_ART_SPEC` | 部隊特技。 |
| 422 | const | GCREST_ITEM_SPEC | `GCREST_ITEM_SPEC` | アイテム。 |
| 468 | const | GCREST_EQUIPMENT_SPEC | `GCREST_EQUIPMENT_SPEC` |  |
| 539 | const | GCREST_BOND_SPEC | `GCREST_BOND_SPEC` | 因縁。 |
| 553 | const | GCREST_OATH_SPEC | `GCREST_OATH_SPEC` | 誓い。 |
| 576 | const | UNIT_COMPONENT_KEY | `UNIT_COMPONENT_KEY` | ------------------------------------------------------------------ 部隊 --------------------------------------… |
| 583 | const | GCREST_UNIT_MOD_GROUPS | `GCREST_UNIT_MOD_GROUPS` | 修正値の入力欄。 |
| 618 | fn | normalizeGcrestUnit | `normalizeGcrestUnit(raw)` | 保存済みの部隊データを正規形へ揃える（欠けたキー・不正な値は既定へ落とす）。 |
| 633 | fn | readGcrestUnit | `readGcrestUnit(components)` |  |
| 642 | fn | syncGcrestUnitBuffs | `syncGcrestUnitBuffs({ unit, tokenId, dispatch, generateBuffId })` | 部隊の修正値を、自分へのバフとして貼り直す。 |
| 702 | fn | readGcrestArts | `readGcrestArts(components)` | ------------------------------------------------------------------ componentsの読み出し -------------------------… |
| 708 | fn | readGcrestUnitArts | `readGcrestUnitArts(components)` |  |
| 712 | fn | readGcrestEquipment | `readGcrestEquipment(components)` |  |
| 718 | fn | readGcrestItems | `readGcrestItems(components)` |  |
| 722 | fn | readGcrestBonds | `readGcrestBonds(components)` |  |
| 726 | fn | readGcrestOaths | `readGcrestOaths(components)` |  |
| 735 | fn | sumGcrestItemWeight | `sumGcrestItemWeight(items)` | 持ち物の重量の合計。 |
| 1633 | fn | importGcrestCharacterJson | `importGcrestCharacterJson(json)` | ゆとシートのJSONを取り込む。 |
| 1678 | const | GCREST_PLUGIN | `GCREST_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（39）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 200 | buildGcrestCharacterParameters | `buildGcrestCharacterParameters()` | 3 | ✓ |
| 208 | buildGcrestRoomParameters | `buildGcrestRoomParameters()` | 3 | ✓ |
| 283 | readGcrestCharType | `readGcrestCharType(parameters)` | 4 | ✓ |
| 390 | isGcrestSpell | `isGcrestSpell(skill)` | 3 | ✓ |
| 395 | nounOf | `nounOf(skill)` | 3 |  |
| 618 | normalizeGcrestUnit | `normalizeGcrestUnit(raw)` | 14 | ✓ |
| 633 | readGcrestUnit | `readGcrestUnit(components)` | 3 | ✓ |
| 642 | syncGcrestUnitBuffs | `syncGcrestUnitBuffs({ unit, tokenId, dispatch, generateBuffId })` | 18 | ✓ |
| 662 | syncMoraleVisibility | `syncMoraleVisibility({ parameters, unit, tokenId, dispatch })` | 6 |  |
| 673 | describeMcBlock | `describeMcBlock(unit, skill)` | 9 |  |
| 691 | readLegacySpells | `readLegacySpells(components)` | 10 |  |
| 702 | readGcrestArts | `readGcrestArts(components)` | 5 | ✓ |
| 708 | readGcrestUnitArts | `readGcrestUnitArts(components)` | 3 | ✓ |
| 712 | readGcrestEquipment | `readGcrestEquipment(components)` | 5 | ✓ |
| 718 | readGcrestItems | `readGcrestItems(components)` | 3 | ✓ |
| 722 | readGcrestBonds | `readGcrestBonds(components)` | 3 | ✓ |
| 726 | readGcrestOaths | `readGcrestOaths(components)` | 3 | ✓ |
| 735 | sumGcrestItemWeight | `sumGcrestItemWeight(items)` | 7 | ✓ |
| 750 | computeGcrestDerivedParameters | `computeGcrestDerivedParameters(parameters, components = {})` | 7 |  |
| 762 | readFreeSkills | `readFreeSkills(parameters, free)` | 7 |  |
| 772 | buildAbilityGroups | `buildAbilityGroups(parameters)` | 18 |  |
| 797 | buildCombatGroups | `buildCombatGroups(parameters, charType = CHAR_TYPE_PC)` | 28 |  |
| 831 | buildFreeSkillParameter | `buildFreeSkillParameter(parameters, free, rawLabel)` | 20 |  |
| 860 | renameInitiativeToAction | `renameInitiativeToAction({ readParameters, dispatch, tokenId })` | 8 |  |
| 869 | renderGcrestCharacterPanel | `renderGcrestCharacterPanel({ container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents, getToken, generateBuffId, dispatch, tokenId, allowParameterEdit = false })` | **388** |  |
| 1268 | looksLikeGcrestChatCommand | `looksLikeGcrestChatCommand(rawInput)` | 4 |  |
| 1278 | handleGcrestChatCommand | `handleGcrestChatCommand(rawInput, { token, dispatch, getEffectiveParameterValue, generateBuffId })` | 64 |  |
| 1345 | resetGcrestComponentsOnPhaseEnd | `resetGcrestComponentsOnPhaseEnd(components, phase)` | 10 |  |
| 1418 | looksLikeGcrestSheet | `looksLikeGcrestSheet(json)` | 5 |  |
| 1425 | isSheetBlank | `isSheetBlank(text)` | 3 |  |
| 1434 | readSheetArtCost | `readSheetArtCost(raw)` | 9 |  |
| 1445 | readSheetMc | `readSheetMc(raw)` | 4 |  |
| 1454 | readSheetArt | `readSheetArt(json, prefix, index)` | 25 |  |
| 1480 | readSheetArts | `readSheetArts(json)` | 10 |  |
| 1491 | readSheetItems | `readSheetItems(json)` | 14 |  |
| 1507 | readSheetEquipment | `readSheetEquipment(json)` | 60 |  |
| 1573 | readSheetUnit | `readSheetUnit(json)` | 9 |  |
| 1587 | readSheetSkills | `readSheetSkills(json)` | 40 |  |
| 1633 | importGcrestCharacterJson | `importGcrestCharacterJson(json)` | 44 | ✓ |

## 依存

- import → [[js.parameters.gcrest-ability-box]], [[js.parameters.gcrest-unit-box]], [[js.parameters.paramFactory]], [[js.parameters.sheet-source]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.parameters.skill.skill-use]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
