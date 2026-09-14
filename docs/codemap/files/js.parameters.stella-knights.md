---
source: js/parameters/stella-knights.js
lines: 782
exports: 10
imported_by: 1
api_sha: 7017adbeff91
prose_sha: 7017adbeff91
generated: 2026-09-14
tags: [codemap]
---

# js/parameters/stella-knights.js

<!-- prose:summary -->
銀剣のステラナイツのプラグイン記述子（コマの種別・パラメータ・スキルとダイスドラフト・ブーケのコマンド・シートの取り込み）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
防御力・チャージダイス数・ブーケをコマに配り、HP を「耐久力」へ改称して流用する。出目の在庫はダイスドラフト（[[js.parameters.dice-draft.dice-draft-model]]）のプールが持ち、charge で振ってスキルへ置く。プチラッキー／ダイス追加／リロールはブーケを払うコマンドで、部屋のブーケ合計はスタンプの押下回数から自動計算する。シートの取り込みは [[js.parameters.sheet-source]] の宣言で URL とファイルの両方から入る。

コマの種別（ブリンガー／シース／NPC）の違いは `STELLA_KNIGHTS_TYPE_RULES` の1表に集めてあり、テスト（test/stella-knights-type.test.js）で表どうしの食い違いを止めている。シースは能力を持たず、自前のコマンドとダイスドラフト（`unavailableReason`）を断る。NPC は耐久力の公開先を持ち主だけにし、スキルの中身を持ち主以外に伏せる（[[js.visibility]] の canViewOwnerOnly、ダイスドラフトの `canViewSkillDetails`）。種別を切り替えたときの一覧表示・公開先は、更新画面の左側と食い違わないよう [[js.character-dialog]] の getCharacterOverrides で確定時に渡す（開いている間に dispatch すると確定で巻き戻るため）。
<!-- /prose:role -->

## export（10）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 132 | const | STELLA_KNIGHTS_CHAR_TYPES | `STELLA_KNIGHTS_CHAR_TYPES` |  |
| 149 | fn | buildStellaKnightsCharacterParameters | `buildStellaKnightsCharacterParameters()` |  |
| 154 | fn | readStellaKnightsCharType | `readStellaKnightsCharType(parameters)` |  |
| 173 | const | STELLA_KNIGHTS_TYPE_RULES | `STELLA_KNIGHTS_TYPE_RULES` | 種別ごとに何を持つか。 |
| 211 | fn | buildStellaKnightsTypeOverrides | `buildStellaKnightsTypeOverrides(charType, ownerId)` | 種別を切り替えたときに揃える、コマの見え方（js/character-dialog.jsのgetCharacterOverridesの形）。 |
| 225 | fn | stellaKnightsDraftUnavailableReason | `stellaKnightsDraftUnavailableReason(token)` | そのコマでダイスドラフト（とこのシステムのコマンド）を使えない理由。 |
| 230 | fn | canViewStellaKnightsSkills | `canViewStellaKnightsSkills(token, participantId)` | そのコマのスキルの中身を見てよいか（NPCは持ち主だけ。js/visibility.jsのcanViewOwnerOnly） |
| 677 | const | STELLA_KNIGHTS_SHEET_SOURCE | `STELLA_KNIGHTS_SHEET_SOURCE` | URLから取り込むときの受け付け先（受け付ける形と取得先の組み立ては js/parameters/sheet-source.js）。 |
| 730 | fn | importStellaKnightsCharacterJson | `importStellaKnightsCharacterJson(json)` | Webキャラクターシート（銀剣のステラナイツ）のJSONを取り込む。 |
| 762 | const | STELLA_KNIGHTS_PLUGIN | `STELLA_KNIGHTS_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（20）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 149 | buildStellaKnightsCharacterParameters | `buildStellaKnightsCharacterParameters()` | 3 | ✓ |
| 154 | readStellaKnightsCharType | `readStellaKnightsCharType(parameters)` | 4 | ✓ |
| 199 | rulesOf | `rulesOf(token)` | 3 |  |
| 211 | buildStellaKnightsTypeOverrides | `buildStellaKnightsTypeOverrides(charType, ownerId)` | 12 | ✓ |
| 225 | stellaKnightsDraftUnavailableReason | `stellaKnightsDraftUnavailableReason(token)` | 3 | ✓ |
| 230 | canViewStellaKnightsSkills | `canViewStellaKnightsSkills(token, participantId)` | 3 | ✓ |
| 247 | buildStellaKnightsRoomParameters | `buildStellaKnightsRoomParameters()` | 3 |  |
| 251 | computeStellaKnightsDerivedRoomParameters | `computeStellaKnightsDerivedRoomParameters(parameters, context = {})` | 8 |  |
| 260 | looksLikeStellaKnightsChatCommand | `looksLikeStellaKnightsChatCommand(rawInput)` | 9 |  |
| 271 | readStellaKnightsSkills | `readStellaKnightsSkills(components)` | 3 |  |
| 280 | renameHpToEndurance | `renameHpToEndurance({ readParameters, dispatch, tokenId })` | 10 |  |
| 291 | renderStellaKnightsCharacterPanel | `renderStellaKnightsCharacterPanel({ container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents, dispatch, getToken, tokenId, myParticipantId = null })` | 181 |  |
| 476 | resetStellaKnightsComponentsOnPhaseEnd | `resetStellaKnightsComponentsOnPhaseEnd(components, phase)` | 7 |  |
| 490 | runPetitLucky | `runPetitLucky(input, { token, dispatch })` | 54 |  |
| 555 | runBouquetSpend | `runBouquetSpend(input, { token, dispatch })` | 50 |  |
| 609 | readImplicitChargeCount | `readImplicitChargeCount(token, roomParameters, getEffectiveParameterValue)` | 10 |  |
| 623 | handleStellaKnightsChatCommand | `handleStellaKnightsChatCommand( rawInput, { token, dispatch, rollBCDice, getEffectiveParameterValue, roomParameters } )` | 36 |  |
| 690 | skillNumberForRow | `skillNumberForRow(index)` | 3 |  |
| 705 | importStellaKnightsSkillsFromSheet | `importStellaKnightsSkillsFromSheet(json)` | 18 |  |
| 730 | importStellaKnightsCharacterJson | `importStellaKnightsCharacterJson(json)` | 31 | ✓ |

## 依存

- import → [[js.parameters.dice-draft.dice-draft-model]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.dice-draft.dice-draft-roll]], [[js.parameters.paramFactory]], [[js.parameters.sheet-source]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.visibility]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
